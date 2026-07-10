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
const { normalizeCarForDb } = require('../src/models/car');
const logger = require('../src/shared/logger');
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

async function importDrop(carRepo, configChangeRepo, actorId, drop, filename) {
    const cars = drop.cars ?? [];

    if (!Array.isArray(cars) || cars.length === 0) {
        throw new Error(`Drop ${filename} has no cars array`);
    }

    const rows = [];

    for (const entry of cars) {
        const normalized = normalizeCarForDb(entry);
        normalized.id = await assignCarId(carRepo, entry.id ?? null);
        rows.push(normalized);
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
    };
}

async function main() {
    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
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
        });
    }

    manifest.pending = manifest.pending.filter((name) => !pending.includes(name));
    manifest.lastUpdated = new Date().toISOString();
    writeManifest(manifestPath, manifest);

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
