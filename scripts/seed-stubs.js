const { randomInt } = require('crypto');
const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { createServices } = require('../src/services');
const { generateSerialIds } = require('../src/shared/generate-serial-id');
const { createStubCar } = require('../src/models/car');
const logger = require('../src/shared/logger');
const { logBotCacheRefreshHint } = require('./lib/bot-cache-hint');

const DEFAULT_COUNT = 30;

function parseCount(argv) {
    const flagIndex = argv.indexOf('--count');

    if (flagIndex === -1) {
        return DEFAULT_COUNT;
    }

    const value = Number(argv[flagIndex + 1]);

    if (!Number.isInteger(value) || value < 1) {
        throw new Error('Usage: node scripts/seed-stubs.js [--count <positive integer>]');
    }

    return value;
}

async function main() {
    const count = parseCount(process.argv.slice(2));
    const config = loadEnv();
    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const services = createServices(repositories);
    const { cars: carRepo } = repositories;

    const taken = new Set(await carRepo.listIds());
    const ids = generateSerialIds(count, { taken });
    const stubs = ids.map((id) => createStubCar({ id, rarity: randomInt(1, 7) }));

    await carRepo.upsertMany(stubs);

    services.packs.invalidateCarPool();
    logBotCacheRefreshHint(logger, { scope: 'seed-stubs', affected: 'car-pool' });

    logger.info('seed_stubs_complete', {
        botEnv: config.botEnv,
        count: stubs.length,
    });
}

main().catch((error) => {
    logger.error('seed_stubs_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
