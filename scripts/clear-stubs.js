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

/**
 * Deletes sparse stub cars (make IS NULL AND model IS NULL) from seed-stubs.
 */
async function main() {
    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const actorId = resolveMaintainerActorId(config);

    const deleted = await repositories.cars.deleteStubs();
    const deletedIds = deleted.map((row) => row.id);

    services.packs.invalidateCarPool();
    logBotCacheRefreshHint(logger, { scope: 'clear-stubs', affected: 'car-pool' });

    await logConfigChange(
        repositories.configChanges,
        buildCarCatalogDeleteEvent({
            actorId,
            source: 'clear-stubs',
            carIds: deletedIds,
            reason: 'clear-stubs',
        }),
    );

    logger.info('clear_stubs_complete', {
        botEnv: config.botEnv,
        deleted: deletedIds.length,
        deletedIds,
    });
}

main().catch((error) => {
    logger.error('clear_stubs_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
