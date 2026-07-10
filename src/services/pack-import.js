const { generateSerialId } = require('../shared/generate-serial-id');
const {
    collectDropRatePatch,
    normalizeEligibilityInput,
    normalizeMutationInput,
    normalizePackDefinitionInput,
} = require('../models/pack');
const {
    buildPackCatalogImportEvent,
    logConfigChange,
} = require('./config-change-events');

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

async function applyPackEntry({
    packRepository,
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

    if (isCreate) {
        const definition = normalizePackDefinitionInput(entry);
        const packId = await assignPackId(packRepository, definition.id ?? null);
        pack = await packRepository.createDefinition({
            id: packId,
            slug: definition.slug,
            name: definition.name,
            is_default: definition.is_default,
            pack_size: definition.pack_size,
            is_active: definition.is_active,
            description: definition.description,
        });

        const ratePatch = collectDropRatePatch(entry.drop_rates);

        if (!ratePatch) {
            throw new Error(`create requires drop_rates for pack "${definition.slug}"`);
        }

        const weights = await dropRateService.buildWeightsForCreate(ratePatch);
        await packRepository.setDropRates(pack.id, weights);

        const eligibility = entry.eligibility
            ? normalizeEligibilityInput(entry.eligibility)
            : { rule_type: 'all_cars', filter_json: null, explicit_car_ids: null };

        await packRepository.setEligibility(pack.id, eligibility);
        await applyMutations(packRepository, pack.id, entry.mutations);
    } else {
        pack = existing;

        const updates = {};

        if (entry.name != null) {
            updates.name = String(entry.name);
        }

        if (entry.pack_size != null) {
            const packSize = Number(entry.pack_size);
            if (!Number.isInteger(packSize) || packSize < 1) {
                throw new Error(`Invalid pack_size: ${entry.pack_size}`);
            }
            updates.pack_size = packSize;
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
            const eligibility = normalizeEligibilityInput(entry.eligibility);
            await packRepository.setEligibility(pack.id, eligibility);
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

    for (const entry of packs) {
        const result = await applyPackEntry({
            packRepository,
            dropRateService,
            configChangeRepository,
            actorId,
            dropId: drop.dropId ?? filename,
            filename,
            entry,
        });
        results.push(result);
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
};
