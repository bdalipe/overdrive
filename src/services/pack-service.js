const { randomInt } = require('crypto');
const { createDropRateService, rollRarity } = require('./drop-rate-service');
const { createPackConfigCache } = require('./pack-config-cache');
const { RESERVED_DEFAULT_PACK_ID } = require('../shared/generate-serial-id');
const logger = require('../shared/logger');

const CAR_POOL_CACHE_KEY = 'cars:listAll';

function randomPick(array) {
    if (!array.length) {
        return null;
    }

    return array[randomInt(0, array.length)];
}

function matchesFilter(car, filter) {
    if (!filter || typeof filter !== 'object') {
        return true;
    }

    if (Array.isArray(filter.rarities) && filter.rarities.length > 0) {
        if (!filter.rarities.includes(car.rarity)) {
            return false;
        }
    }

    if (Array.isArray(filter.countries) && filter.countries.length > 0) {
        if (!car.country || !filter.countries.includes(car.country)) {
            return false;
        }
    }

    if (Array.isArray(filter.bodyStyles) && filter.bodyStyles.length > 0) {
        if (!car.body_style || !filter.bodyStyles.includes(car.body_style)) {
            return false;
        }
    }

    if (Array.isArray(filter.tags) && filter.tags.length > 0) {
        if (!car.tag || !filter.tags.includes(car.tag)) {
            return false;
        }
    }

    if (filter.yearMin != null && car.model_year != null && car.model_year < filter.yearMin) {
        return false;
    }

    if (filter.yearMax != null && car.model_year != null && car.model_year > filter.yearMax) {
        return false;
    }

    return true;
}

function resolveEligibleCars(allCars, eligibility) {
    if (!eligibility || eligibility.rule_type === 'all_cars') {
        return allCars;
    }

    if (eligibility.rule_type === 'explicit_ids') {
        const ids = new Set(eligibility.explicit_car_ids ?? []);
        return allCars.filter((car) => ids.has(car.id));
    }

    if (eligibility.rule_type === 'filter') {
        return allCars.filter((car) => matchesFilter(car, eligibility.filter_json));
    }

    return allCars;
}

function groupCarsByRarity(cars) {
    const byRarity = new Map();

    for (const car of cars) {
        if (!byRarity.has(car.rarity)) {
            byRarity.set(car.rarity, []);
        }

        byRarity.get(car.rarity).push(car);
    }

    return byRarity;
}

function pickCarAtRarity(byRarity, rarity) {
    const pool = byRarity.get(rarity) ?? [];
    return randomPick(pool);
}

/** Weighted roll; if rates miss the pool, pick uniformly among rarities that have cars. */
function rollRarityWithUniformFallback(weights, availableRarities, logContext) {
    const rarity = rollRarity(weights, availableRarities);
    if (rarity != null) {
        return rarity;
    }

    if (availableRarities.length === 0) {
        return null;
    }

    logger.warn('pack_draw_rarity_uniform_fallback', {
        ...logContext,
        availableRarities,
    });

    return availableRarities[randomInt(0, availableRarities.length)];
}

function mutationResolvableInPool(mutation, pool) {
    if (mutation.mutation_type === 'car') {
        return pool.some((car) => car.id === mutation.target_car_id);
    }

    if (mutation.mutation_type === 'filter') {
        return pool.some((car) => matchesFilter(car, mutation.filter_json));
    }

    return false;
}

function pickFromMutation(mutation, pool) {
    if (mutation.mutation_type === 'car') {
        return pool.find((car) => car.id === mutation.target_car_id) ?? null;
    }

    if (mutation.mutation_type === 'filter') {
        const matches = pool.filter((car) => matchesFilter(car, mutation.filter_json));
        return randomPick(matches);
    }

    return null;
}

/**
 * 100% mutations resolve from the full catalog (bypass pack eligibility).
 * Missing targets / empty filter matches are logged, not silently dropped.
 */
async function resolveGuaranteeCar(mutation, cars) {
    if (mutation.mutation_type === 'car') {
        if (mutation.target_car_id == null) {
            return null;
        }

        return cars.findById(mutation.target_car_id);
    }

    if (mutation.mutation_type === 'filter') {
        const matches = await cars.findEligible({
            rule_type: 'filter',
            filter_json: mutation.filter_json ?? {},
        });
        return randomPick(matches);
    }

    return null;
}

async function applyGuaranteeMutations(mutations, cars, logContext) {
    const cards = [];

    for (const mutation of mutations) {
        if (Number(mutation.chance_percent) !== 100) {
            continue;
        }

        const car = await resolveGuaranteeCar(mutation, cars);
        if (car) {
            cards.push(car);
            continue;
        }

        logger.warn('pack_guarantee_unresolved', {
            ...logContext,
            mutationId: mutation.id,
            mutationType: mutation.mutation_type,
            targetCarId: mutation.target_car_id ?? null,
        });
    }

    return cards;
}

function tryBonusMutation(mutations, drawnRarity, eligibleCars) {
    for (const mutation of mutations) {
        const chance = Number(mutation.chance_percent);
        if (chance >= 100 || chance <= 0) {
            continue;
        }

        if (mutation.rarity_gate != null && mutation.rarity_gate !== drawnRarity) {
            continue;
        }

        if (randomInt(0, 100) < chance) {
            const car = pickFromMutation(mutation, eligibleCars);
            if (car) {
                return car;
            }
        }
    }

    return null;
}

function sortCardsByRarity(cards) {
    return [...cards].sort((a, b) => a.rarity - b.rarity);
}

function createPackService({ packs, cars, dropRateService, configCache }) {
    const dropRates = dropRateService ?? createDropRateService(packs);
    const cache = configCache ?? createPackConfigCache();

    async function resolvePack(packId) {
        if (packId != null) {
            return cache.getOrLoad(`pack:${packId}`, async () => {
                const pack = await packs.findById(packId);
                if (!pack) {
                    throw new Error(`Pack not found: ${packId}`);
                }

                if (!pack.is_active) {
                    throw new Error(`Pack is not active: ${packId}`);
                }

                return pack;
            });
        }

        return cache.getOrLoad('pack:default', async () => {
            const defaultPack = await packs.findDefault();
            if (!defaultPack) {
                throw new Error('No default pack is configured');
            }

            return defaultPack;
        });
    }

    async function loadPackConfig(packId) {
        return cache.getOrLoad(`config:${packId}`, async () => {
            const [eligibility, mutations, weights] = await Promise.all([
                packs.getEligibility(packId),
                packs.getMutations(packId),
                dropRates.getWeightsForPack(packId),
            ]);

            return { eligibility, mutations, weights };
        });
    }

    async function loadAllCars() {
        return cache.getOrLoad(CAR_POOL_CACHE_KEY, () => cars.listAll());
    }

    async function loadEligibleCars(eligibility) {
        if (!eligibility || eligibility.rule_type === 'all_cars') {
            return loadAllCars();
        }

        return cars.findEligible(eligibility);
    }

    async function generatePack({ userId, packId = null, packSize: packSizeOverride = null }) {
        const pack = await resolvePack(packId);
        const size = packSizeOverride ?? pack.pack_size;

        if (!Number.isInteger(size) || size < 1) {
            throw new Error(`Invalid pack size for pack ${pack.id}: ${size}`);
        }

        const { eligibility, mutations, weights } = await loadPackConfig(pack.id);
        const eligibleCars = await loadEligibleCars(eligibility);

        if (eligibleCars.length === 0) {
            throw new Error(
                `No eligible cars in catalog for pack "${pack.slug}". Run npm run seed-stubs or import-cars.`,
            );
        }

        const byRarity = groupCarsByRarity(eligibleCars);
        const availableRarities = [...byRarity.keys()];
        const logContext = { packId: pack.id, packSlug: pack.slug };

        const guaranteeCards = await applyGuaranteeMutations(mutations, cars, logContext);
        const cards = [...guaranteeCards];

        const slotsToFill = Math.max(0, size - cards.length);

        for (let slot = 0; slot < slotsToFill; slot += 1) {
            const rarity = rollRarityWithUniformFallback(weights, availableRarities, {
                ...logContext,
                slot,
            });

            if (rarity == null) {
                logger.warn('pack_draw_no_rarity', {
                    ...logContext,
                    slot,
                });
                continue;
            }

            const bonusCar = tryBonusMutation(mutations, rarity, eligibleCars);
            if (bonusCar) {
                cards.push(bonusCar);
                continue;
            }

            const car = pickCarAtRarity(byRarity, rarity);
            if (!car) {
                logger.warn('pack_draw_empty_rarity_tier', {
                    ...logContext,
                    rarity,
                    slot,
                });
                continue;
            }

            cards.push(car);
        }

        if (cards.length !== size) {
            throw new Error(
                `Pack "${pack.slug}" generated ${cards.length} cards but pack_size is ${size}`,
            );
        }

        const sortedCards = sortCardsByRarity(cards);

        return {
            userId,
            packId: pack.id,
            packSlug: pack.slug,
            packSize: size,
            cards: sortedCards,
        };
    }

    return {
        generatePack,
        resolvePack,
        loadPackConfig,
        loadAllCars,
        loadEligibleCars,
        invalidatePackConfig: (id) => cache.invalidatePack(id),
        invalidateCarPool: () => cache.invalidate(CAR_POOL_CACHE_KEY),
        clearPackConfigCache: () => cache.clear(),
        RESERVED_DEFAULT_PACK_ID,
    };
}

module.exports = {
    createPackService,
    CAR_POOL_CACHE_KEY,
    matchesFilter,
    mutationResolvableInPool,
    resolveEligibleCars,
    sortCardsByRarity,
    RESERVED_DEFAULT_PACK_ID,
};
