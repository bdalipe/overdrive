const { randomInt } = require('crypto');
const { loadEnv } = require('../src/shared/config');
const { createSupabaseClient } = require('../src/shared/supabase');
const { createRepositories } = require('../src/repositories');
const { generateSerialId } = require('../src/shared/generate-serial-id');
const { createStubCar } = require('../src/models/car');
const logger = require('../src/shared/logger');

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
    const { cars: carRepo } = createRepositories(supabase);

    const stubs = [];

    for (let i = 0; i < count; i += 1) {
        const id = await generateSerialId({
            exists: async (candidate) => {
                if (stubs.some((stub) => stub.id === candidate)) {
                    return true;
                }

                return carRepo.exists(candidate);
            },
        });

        const rarity = randomInt(1, 7);
        stubs.push(createStubCar({ id, rarity }));
    }

    await carRepo.upsertMany(stubs);

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
