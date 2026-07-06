const { randomInt } = require('crypto');

/** Default-pack baseline weights (percent-scale; sum = 100). */
const DEFAULT_RARITY_WEIGHTS = Object.freeze({
    1: 45,
    2: 27,
    3: 15,
    4: 8,
    5: 4,
    6: 1,
});

const MIN_RARITY = 1;
const MAX_RARITY = 6;

/**
 * Normalize DB rows or a plain map into rarity -> weight (1–6).
 */
function normalizeRarityWeights(source) {
    const weights = { ...DEFAULT_RARITY_WEIGHTS };

    if (!source) {
        return weights;
    }

    if (Array.isArray(source)) {
        for (const row of source) {
            const rarity = Number(row.rarity);
            const weight = Number(row.weight);
            if (rarity >= MIN_RARITY && rarity <= MAX_RARITY && weight >= 0) {
                weights[rarity] = weight;
            }
        }
        return weights;
    }

    for (let rarity = MIN_RARITY; rarity <= MAX_RARITY; rarity += 1) {
        if (source[rarity] != null) {
            weights[rarity] = Number(source[rarity]);
        }
    }

    return weights;
}

/**
 * Weighted rarity roll. Optionally restrict to `allowedRarities` (e.g. tiers with cars in pool).
 */
function rollRarity(weights, allowedRarities = null) {
    const allowed = allowedRarities
        ? new Set(allowedRarities)
        : null;

    const entries = [];
    let total = 0;

    for (let rarity = MIN_RARITY; rarity <= MAX_RARITY; rarity += 1) {
        if (allowed && !allowed.has(rarity)) {
            continue;
        }

        const weight = Number(weights[rarity] ?? 0);
        if (weight <= 0) {
            continue;
        }

        entries.push({ rarity, weight });
        total += weight;
    }

    if (entries.length === 0 || total <= 0) {
        return null;
    }

    let roll = randomInt(0, total);

    for (const entry of entries) {
        roll -= entry.weight;
        if (roll < 0) {
            return entry.rarity;
        }
    }

    return entries[entries.length - 1].rarity;
}

function createDropRateService(packRepository) {
    async function getWeightsForPack(packId) {
        const rows = await packRepository.getDropRates(packId);
        return normalizeRarityWeights(rows);
    }

    async function rollRarityForPack(packId, { allowedRarities } = {}) {
        const weights = await getWeightsForPack(packId);
        return rollRarity(weights, allowedRarities);
    }

    return {
        getWeightsForPack,
        rollRarityForPack,
        rollRarity,
        normalizeRarityWeights,
    };
}

module.exports = {
    DEFAULT_RARITY_WEIGHTS,
    MIN_RARITY,
    MAX_RARITY,
    normalizeRarityWeights,
    rollRarity,
    createDropRateService,
};
