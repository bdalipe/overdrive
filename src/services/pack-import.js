const { generateSerialId } = require('../shared/generate-serial-id');
const {
    assertValidPackSize,
    collectDropRatePatch,
    normalizeEligibilityInput,
    normalizeMutationInput,
    normalizePackDefinitionInput,
} = require('../models/pack');
const {
    buildPackCatalogImportEvent,
    logConfigChange,
} = require('./config-change-events');
const { mutationResolvableInPool } = require('./pack-service');
const logger = require('../shared/logger');

async function snapshotPack(packRepository, packId) {
    const [pack, dropRates, eligibility, mutations] = await Promise.all([
        packRepository.findById(packId),
        packRepository.getDropRates(packId),
        packRepository.getEligibility(packId),
        packRepository.getMutations(packId),
    ]);

    return {
        pack,
        drop_rates: dropRates,
        eligibility,
        mutations,
    };
}

async function assignPackId(packRepository, explicitId) {
    if (explicitId != null) {
        const existing = await packRepository.findById(explicitId);
        if (existing) {
            throw new Error(`Pack id already in use: ${explicitId}`);
        }

        return explicitId;
    }

    return generateSerialId({
        exists: async (id) => {
            const pack = await packRepository.findById(id);
            return pack != null;
        },
    });
}

function defaultEligibility() {
    return { rule_type: 'all_cars', filter_json: null, explicit_car_ids: null };
}

/**
 * Bonus (&lt;100%) mutations must resolve inside pack eligibility.
 * Guarantees (100%) may bypass eligibility and are not checked here.
 */
async function assertBonusMutationsWithinEligibility(
    carRepository,
    eligibility,
    mutations,
    packSlug,
) {
    const bonuses = (mutations ?? []).filter((mutation) => {
        const chance = Number(mutation.chance_percent);
        return chance > 0 && chance < 100;
    });

    if (bonuses.length === 0) {
        return;
    }

    const eligibleCars = await carRepository.findEligible(eligibility);

    for (const mutation of bonuses) {
        if (mutationResolvableInPool(mutation, eligibleCars)) {
            continue;
        }

        const target =
            mutation.mutation_type === 'car'
                ? ` target_car_id=${mutation.target_car_id}`
                : ' (filter mutation)';

        throw new Error(
            `Bonus mutation outside pack eligibility for "${packSlug}":` +
                ` mutation_type=${mutation.mutation_type}${target}` +
                ` chance_percent=${mutation.chance_percent}.` +
                ' Use chance_percent 100 to bypass eligibility, or adjust eligibility/mutation.',
        );
    }
}

/** Guarantees (100%) must not exceed configured pack_size. */
function assertGuaranteeCountWithinPackSize(mutations, packSize, packSlug) {
    const guaranteeCount = (mutations ?? []).filter(
        (mutation) => Number(mutation.chance_percent) === 100,
    ).length;

    if (guaranteeCount > packSize) {
        throw new Error(
            `Too many guarantee mutations for "${packSlug}":` +
                ` ${guaranteeCount} guarantees (chance_percent 100) exceed pack_size ${packSize}.` +
                ' Reduce guarantees or increase pack_size.',
        );
    }
}

function resolveEffectivePackSize(entry, existing, isCreate) {
    if (entry.pack_size != null) {
        return assertValidPackSize(entry.pack_size);
    }

    if (isCreate) {
        return 5;
    }

    return assertValidPackSize(existing.pack_size);
}

async function planMutationsAfterDrop(packRepository, packId, mutationsInput, { isCreate }) {
    if (!mutationsInput) {
        if (isCreate) {
            return [];
        }

        return packRepository.getMutations(packId);
    }

    let current = [];

    if (!isCreate) {
        current = await packRepository.getMutations(packId);
        const replace = Boolean(mutationsInput.replace);
        const removeIds = mutationsInput.remove_ids ?? [];

        if (replace) {
            current = [];
        } else if (removeIds.length > 0) {
            const removeSet = new Set(removeIds.map((id) => Number(id)));
            current = current.filter((mutation) => !removeSet.has(Number(mutation.id)));
        }
    }

    const toAdd = mutationsInput.add ?? mutationsInput.set ?? [];
    const normalizedAdds = toAdd.map((entry) => normalizeMutationInput(entry));

    return [...current, ...normalizedAdds];
}

async function applyMutations(packRepository, packId, mutationsInput) {
    if (!mutationsInput) {
        return;
    }

    const replace = Boolean(mutationsInput.replace);
    const removeIds = mutationsInput.remove_ids ?? [];
    const toAdd = mutationsInput.add ?? mutationsInput.set ?? [];

    if (replace) {
        await packRepository.deleteAllMutations(packId);
    } else if (removeIds.length > 0) {
        await packRepository.deleteMutations(packId, removeIds);
    }

    for (const entry of toAdd) {
        const mutation = normalizeMutationInput(entry);
        await packRepository.addMutation(packId, mutation);
    }
}

/**
 * Remove a pack row created mid-import after a later create step failed (CASCADE children).
 */
async function rollbackCreatedPack(packRepository, packId, context = {}) {
    try {
        await packRepository.deletePackForRollback(packId);
        logger.warn('pack_create_rolled_back', {
            packId,
            ...context,
        });
    } catch (rollbackError) {
        logger.error('pack_create_rollback_failed', {
            packId,
            ...context,
            error: rollbackError.message,
        });
    }
}

async function applyPackEntry({
    packRepository,
    carRepository,
    dropRateService,
    configChangeRepository,
    actorId,
    dropId,
    filename,
    entry,
}) {
    if (!entry.slug) {
        throw new Error('Pack drop entry requires slug');
    }

    const existing = await packRepository.findBySlug(entry.slug);
    const isCreate = entry.create === true || (entry.create !== false && !existing);

    if (isCreate && existing) {
        throw new Error(`Pack slug already exists: ${entry.slug}`);
    }

    if (!isCreate && !existing) {
        throw new Error(`Pack not found for patch: ${entry.slug}`);
    }

    const before = existing ? await snapshotPack(packRepository, existing.id) : null;
    let pack;

    const effectiveEligibility = entry.eligibility
        ? normalizeEligibilityInput(entry.eligibility)
        : isCreate
          ? defaultEligibility()
          : null;

    const needsMutationPlan =
        isCreate || entry.eligibility != null || entry.mutations != null || entry.pack_size != null;

    if (needsMutationPlan) {
        const plannedMutations = await planMutationsAfterDrop(
            packRepository,
            existing?.id,
            entry.mutations,
            { isCreate },
        );

        const packSize = resolveEffectivePackSize(entry, existing, isCreate);
        assertGuaranteeCountWithinPackSize(plannedMutations, packSize, entry.slug);

        if (entry.eligibility || entry.mutations || isCreate) {
            const eligibilityForCheck =
                effectiveEligibility ?? (await packRepository.getEligibility(existing.id));

            await assertBonusMutationsWithinEligibility(
                carRepository,
                eligibilityForCheck,
                plannedMutations,
                entry.slug,
            );
        }
    }

    if (isCreate) {
        const definition = normalizePackDefinitionInput(entry);
        const ratePatch = collectDropRatePatch(entry.drop_rates);

        if (!ratePatch) {
            throw new Error(`create requires drop_rates for pack "${definition.slug}"`);
        }

        const weights = await dropRateService.buildWeightsForCreate(ratePatch);
        const packId = await assignPackId(packRepository, definition.id ?? null);
        let createdPackId = null;

        try {
            pack = await packRepository.createDefinition({
                id: packId,
                slug: definition.slug,
                name: definition.name,
                is_default: definition.is_default,
                pack_size: definition.pack_size,
                is_active: definition.is_active,
                description: definition.description,
            });
            createdPackId = pack.id;

            await packRepository.setDropRates(pack.id, weights);

            const eligibility = effectiveEligibility ?? defaultEligibility();
            await packRepository.setEligibility(pack.id, eligibility);
            await applyMutations(packRepository, pack.id, entry.mutations);
        } catch (error) {
            if (createdPackId != null) {
                await rollbackCreatedPack(packRepository, createdPackId, {
                    packSlug: definition.slug,
                    filename,
                    reason: error.message,
                });
            }

            throw error;
        }
    } else {
        pack = existing;

        const updates = {};

        if (entry.name != null) {
            updates.name = String(entry.name);
        }

        if (entry.pack_size != null) {
            updates.pack_size = assertValidPackSize(entry.pack_size);
        }

        if (entry.is_active != null) {
            updates.is_active = Boolean(entry.is_active);
        }

        if (Object.prototype.hasOwnProperty.call(entry, 'description')) {
            updates.description = entry.description ?? null;
        }

        if (Object.keys(updates).length > 0) {
            pack = await packRepository.updateDefinition(pack.id, updates);
        }

        const ratePatch = collectDropRatePatch(entry.drop_rates);

        if (ratePatch) {
            const weights = await dropRateService.buildWeightsForEdit(pack.id, ratePatch);
            await packRepository.setDropRates(pack.id, weights);
        }

        if (entry.eligibility) {
            await packRepository.setEligibility(pack.id, effectiveEligibility);
        }

        await applyMutations(packRepository, pack.id, entry.mutations);
    }

    const after = await snapshotPack(packRepository, pack.id);

    await logConfigChange(
        configChangeRepository,
        buildPackCatalogImportEvent({
            actorId,
            dropId,
            filename,
            packId: pack.id,
            packSlug: pack.slug,
            action: isCreate ? 'create' : 'patch',
            before,
            after,
        }),
    );

    return {
        packId: pack.id,
        packSlug: pack.slug,
        action: isCreate ? 'create' : 'patch',
    };
}

async function applyPackDrop({
    packRepository,
    carRepository,
    dropRateService,
    configChangeRepository,
    actorId,
    drop,
    filename,
}) {
    const packs = drop.packs ?? [];

    if (!Array.isArray(packs) || packs.length === 0) {
        throw new Error(`Drop ${filename} has no packs array`);
    }

    const results = [];
    const createdPackIds = [];

    try {
        for (const entry of packs) {
            const result = await applyPackEntry({
                packRepository,
                carRepository,
                dropRateService,
                configChangeRepository,
                actorId,
                dropId: drop.dropId ?? filename,
                filename,
                entry,
            });
            results.push(result);

            if (result.action === 'create') {
                createdPackIds.push(result.packId);
            }
        }
    } catch (error) {
        for (const packId of [...createdPackIds].reverse()) {
            await rollbackCreatedPack(packRepository, packId, {
                filename,
                reason: 'drop_aborted_after_prior_create',
                cause: error.message,
            });
        }

        throw error;
    }

    return {
        dropId: drop.dropId ?? filename,
        packs: results,
    };
}

module.exports = {
    applyPackDrop,
    applyPackEntry,
    snapshotPack,
    assertBonusMutationsWithinEligibility,
    assertGuaranteeCountWithinPackSize,
    rollbackCreatedPack,
};
