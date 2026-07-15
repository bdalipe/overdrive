const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { createServices } = require('../src/services');
const {
    buildCarCatalogDeleteEvent,
    resolveMaintainerActorId,
} = require('../src/services/config-change-events');
const logger = require('../src/shared/logger');
const { logBotCacheRefreshHint } = require('./lib/bot-cache-hint');
const { logConfigChangeAfterDelete } = require('./lib/audit-after-delete');

function parseArgs(argv) {
    const flagIndex = argv.indexOf('--ids');
    const force = argv.includes('--force');

    if (flagIndex === -1) {
        return null;
    }

    const raw = argv[flagIndex + 1];

    if (!raw || raw.startsWith('--')) {
        throw new Error('Usage: npm run delete-cars -- --ids 123456,234567 [--force]');
    }

    const ids = raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
            const id = Number.parseInt(part, 10);

            if (!Number.isInteger(id) || id < 100000 || id > 999999) {
                throw new Error(`Invalid car id "${part}". Use 6-digit ids.`);
            }

            return id;
        });

    if (ids.length === 0) {
        throw new Error('Provide at least one car id with --ids');
    }

    return { ids, force };
}

function formatPackReferenceBlock(refs) {
    const lines = [];

    if (refs.mutations.length > 0) {
        lines.push('pack_mutations (CASCADE deletes these rows):');
        for (const row of refs.mutations) {
            lines.push(
                `  - car ${row.targetCarId} → pack ${row.packSlug} (mutation ${row.mutationId},` +
                    ` chance ${row.chancePercent}%)`,
            );
        }
    }

    if (refs.explicitEligibility.length > 0) {
        lines.push('pack_eligibility.explicit_car_ids (no FK; dead ids remain unless pack is patched):');
        for (const row of refs.explicitEligibility) {
            lines.push(
                `  - cars [${row.matchedCarIds.join(', ')}] → pack ${row.packSlug}`,
            );
        }
    }

    return lines.join('\n');
}

function assertNoPackReferencesOrForced(refs, { force }) {
    const hasRefs = refs.mutations.length > 0 || refs.explicitEligibility.length > 0;

    if (!hasRefs) {
        return;
    }

    const detail = formatPackReferenceBlock(refs);

    if (!force) {
        throw new Error(
            'Refusing delete-cars: cars are referenced by pack config.\n' +
                `${detail}\n` +
                'Patch packs first, or re-run with --force to delete anyway ' +
                '(mutations CASCADE; explicit_car_ids keep dead ids until pack patch).',
        );
    }

    logger.warn('delete_cars_force_pack_refs', {
        mutationCount: refs.mutations.length,
        explicitPackCount: refs.explicitEligibility.length,
        detail,
    });
}

async function main() {
    const parsed = parseArgs(process.argv.slice(2));

    if (!parsed) {
        throw new Error('Usage: npm run delete-cars -- --ids 123456,234567 [--force]');
    }

    const { ids, force } = parsed;
    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const actorId = resolveMaintainerActorId(config);

    const refs = await repositories.packs.findCarPackReferences(ids);
    assertNoPackReferencesOrForced(refs, { force });

    const deleted = await repositories.cars.deleteByIds(ids);
    const deletedIds = deleted.map((row) => row.id);

    services.packs.invalidateCarPool();
    logBotCacheRefreshHint(logger, { scope: 'delete-cars', affected: 'car-pool' });

    await logConfigChangeAfterDelete(
        repositories.configChanges,
        buildCarCatalogDeleteEvent({
            actorId,
            source: 'delete-cars',
            carIds: deletedIds,
            reason: force ? 'delete-by-ids-force' : 'delete-by-ids',
        }),
        {
            summary: `cars ${deletedIds.join(',') || '(none)'}`,
            entityType: 'car',
            deletedIds,
            force,
        },
    );

    logger.info('delete_cars_complete', {
        botEnv: config.botEnv,
        requested: ids.length,
        deleted: deletedIds.length,
        deletedIds,
        force,
    });
}

main().catch((error) => {
    logger.error('delete_cars_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
