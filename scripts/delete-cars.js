const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { createServices } = require('../src/services');
const {
    buildCarCatalogDeleteEvent,
    logConfigChange,
    resolveMaintainerActorId,
} = require('../src/services/config-change-events');
const logger = require('../src/shared/logger');
const { logBotCacheRefreshHint } = require('./lib/bot-cache-hint');

function parseIds(argv) {
    const flagIndex = argv.indexOf('--ids');

    if (flagIndex === -1) {
        return null;
    }

    const raw = argv[flagIndex + 1];

    if (!raw) {
        throw new Error('Usage: npm run delete-cars -- --ids 123456,234567');
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

    return ids;
}

async function main() {
    const ids = parseIds(process.argv.slice(2));

    if (!ids) {
        throw new Error('Usage: npm run delete-cars -- --ids 123456,234567');
    }

    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const actorId = resolveMaintainerActorId(config);

    const deleted = await repositories.cars.deleteByIds(ids);
    const deletedIds = deleted.map((row) => row.id);

    services.packs.invalidateCarPool();
    logBotCacheRefreshHint(logger, { scope: 'delete-cars', affected: 'car-pool' });

    await logConfigChange(
        repositories.configChanges,
        buildCarCatalogDeleteEvent({
            actorId,
            source: 'delete-cars',
            carIds: deletedIds,
            reason: 'delete-by-ids',
        }),
    );

    logger.info('delete_cars_complete', {
        botEnv: config.botEnv,
        requested: ids.length,
        deleted: deletedIds.length,
        deletedIds,
    });
}

main().catch((error) => {
    logger.error('delete_cars_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
