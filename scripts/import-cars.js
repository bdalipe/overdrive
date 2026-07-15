const path = require('path');
const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { createServices } = require('../src/services');
const {
    buildCarCatalogImportEvent,
    logConfigChange,
    resolveMaintainerActorId,
} = require('../src/services/config-change-events');
const { generateSerialId } = require('../src/shared/generate-serial-id');
const { normalizeCarForDb, mergeCarForDb } = require('../src/models/car');
const logger = require('../src/shared/logger');
const { logBotCacheRefreshHint } = require('./lib/bot-cache-hint');
const {
    readManifest,
    writeManifest,
    resolvePendingDrops,
    readDropFile,
} = require('./lib/catalog');

async function assignCarId(carRepo, explicitId) {
    if (explicitId != null) {
        return explicitId;
    }

    return generateSerialId({
        exists: (id) => carRepo.exists(id),
    });
}

/**
 * @param {object} entry
 * @param {Map<number, object>} existingById
 * @param {object} carRepo
 */
async function buildCarRow(entry, existingById, carRepo) {
    const replace = entry.replace === true;
    const explicitId = entry.id ?? null;
    const existing = explicitId != null ? existingById.get(explicitId) ?? null : null;

    if (existing && !replace) {
        return { row: mergeCarForDb(existing, entry), action: 'patch' };
    }

    const normalized = normalizeCarForDb(entry);
    normalized.id = await assignCarId(carRepo, explicitId);

    return {
        row: normalized,
        action: existing && replace ? 'replace' : 'create',
    };
}

async function importDrop(carRepo, configChangeRepo, actorId, drop, filename) {
    const cars = drop.cars ?? [];

    if (!Array.isArray(cars) || cars.length === 0) {
        throw new Error(`Drop ${filename} has no cars array`);
    }

    const explicitIds = cars
        .map((entry) => entry.id)
        .filter((id) => id != null)
        .map((id) => Number(id));
    const existingById = await carRepo.findByIds(explicitIds);

    const rows = [];
    const actions = { create: 0, patch: 0, replace: 0 };

    for (const entry of cars) {
        const { row, action } = await buildCarRow(entry, existingById, carRepo);
        rows.push(row);
        actions[action] += 1;
    }

    await carRepo.upsertMany(rows);

    const carIds = rows.map((row) => row.id);

    await logConfigChange(
        configChangeRepo,
        buildCarCatalogImportEvent({
            actorId,
            dropId: drop.dropId ?? filename,
            filename,
            carIds,
        }),
    );

    return {
        dropId: drop.dropId ?? filename,
        count: rows.length,
        ids: carIds,
        actions,
    };
}

async function main() {
    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const actorId = resolveMaintainerActorId(config);

    const { manifest, manifestPath } = readManifest(config.botEnv);
    const pending = resolvePendingDrops(manifest);

    if (pending.length === 0) {
        logger.info('import_cars_noop', { message: 'No pending catalog drops' });
        return;
    }

    const appliedNow = [];

    for (const filename of pending) {
        const drop = readDropFile(filename);
        const result = await importDrop(
            repositories.cars,
            repositories.configChanges,
            actorId,
            drop,
            filename,
        );

        manifest.applied.push(filename);
        appliedNow.push({ filename, ...result });

        logger.info('import_cars_drop_applied', {
            filename,
            dropId: result.dropId,
            count: result.count,
            actions: result.actions,
        });
    }

    manifest.pending = manifest.pending.filter((name) => !pending.includes(name));
    manifest.lastUpdated = new Date().toISOString();
    writeManifest(manifestPath, manifest);

    services.packs.invalidateCarPool();
    logBotCacheRefreshHint(logger, { scope: 'import-cars', affected: 'car-pool' });

    logger.info('import_cars_complete', {
        botEnv: config.botEnv,
        applied: appliedNow.length,
        manifestPath: path.relative(process.cwd(), manifestPath),
    });
}

main().catch((error) => {
    logger.error('import_cars_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
