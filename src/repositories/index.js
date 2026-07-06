const { createCarRepository } = require('./car-repository');
const { createPackRepository } = require('./pack-repository');
const { createStatsRepository } = require('./stats-repository');

function createRepositories(supabase) {
    return {
        cars: createCarRepository(supabase),
        packs: createPackRepository(supabase),
        stats: createStatsRepository(supabase),
    };
}

module.exports = { createRepositories };
