const path = require('path');
const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { createServices } = require('../src/services');
const { resolveMaintainerActorId } = require('../src/services/config-change-events');
const { applyPackDrop } = require('../src/services/pack-import');
const openPack = require('../src/commands/open-pack');
const logger = require('../src/shared/logger');
const { logBotCacheRefreshHint } = require('./lib/bot-cache-hint');
const {
    readManifest,
    writeManifest,
    resolvePendingDrops,
    readDropFile,
} = require('./lib/pack-catalog');

async function main() {
    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const actorId = resolveMaintainerActorId(config);

    const { manifest, manifestPath } = readManifest(config.botEnv);
    const pending = resolvePendingDrops(manifest);

    if (pending.length === 0) {
        logger.info('import_packs_noop', { message: 'No pending pack drops' });
        return;
    }

    const appliedNow = [];

    for (const filename of pending) {
        const drop = readDropFile(filename);
        const result = await applyPackDrop({
            packRepository: repositories.packs,
            carRepository: repositories.cars,
            dropRateService: services.dropRates,
            configChangeRepository: repositories.configChanges,
            actorId,
            drop,
            filename,
        });

        for (const packResult of result.packs) {
            services.packs.invalidatePackConfig(packResult.packId);
        }

        manifest.applied.push(filename);
        appliedNow.push({ filename, ...result });

        logger.info('import_packs_drop_applied', {
            filename,
            dropId: result.dropId,
            packCount: result.packs.length,
        });
    }

    manifest.pending = manifest.pending.filter((name) => !pending.includes(name));
    manifest.lastUpdated = new Date().toISOString();
    writeManifest(manifestPath, manifest);

    const activePacks = await repositories.packs.listActive();
    openPack.warnIfActivePacksExceedChoiceLimit(activePacks, 'import-packs');
    logBotCacheRefreshHint(logger, { scope: 'import-packs', affected: 'pack-config' });

    logger.info('import_packs_complete', {
        botEnv: config.botEnv,
        applied: appliedNow.length,
        activePacks: activePacks.length,
        maxPackChoices: openPack.MAX_PACK_CHOICES,
        manifestPath: path.relative(process.cwd(), manifestPath),
    });
}

main().catch((error) => {
    logger.error('import_packs_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
