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
const DROP_RATE_SUM_TARGET = 100;

class DropRateValidationError extends Error {
    constructor(sum) {
        super(formatDropRateValidationError(sum));
        this.name = 'DropRateValidationError';
        this.sum = sum;
    }
}

function formatDropRateValidationError(sum) {
    return `Drop rates must total ${DROP_RATE_SUM_TARGET}%. Current total: ${sum}.`;
}

function emptyWeightMap() {
    const weights = {};

    for (let rarity = MIN_RARITY; rarity <= MAX_RARITY; rarity += 1) {
        weights[rarity] = 0;
    }

    return weights;
}

function applyWeightSource(weights, source) {
    if (!source) {
        return weights;
    }

    if (Array.isArray(source)) {
        for (const row of source) {
            const rarity = Number(row.rarity);
            const weight = Number(row.weight);

            if (rarity >= MIN_RARITY && rarity <= MAX_RARITY && Number.isFinite(weight) && weight >= 0) {
                weights[rarity] = weight;
            }
        }

        return weights;
    }

    for (let rarity = MIN_RARITY; rarity <= MAX_RARITY; rarity += 1) {
        if (source[rarity] != null || source[String(rarity)] != null) {
            const weight = Number(source[rarity] ?? source[String(rarity)]);

            if (Number.isFinite(weight) && weight >= 0) {
                weights[rarity] = weight;
            }
        }
    }

    return weights;
}

/**
 * Normalize DB rows or a plain map into rarity -> weight (1–6).
 * Read path: missing tiers fall back to DEFAULT_RARITY_WEIGHTS baseline.
 */
function normalizeRarityWeights(source) {
    const weights = { ...DEFAULT_RARITY_WEIGHTS };
    return applyWeightSource(weights, source);
}

/**
 * Admin create: omitted tiers default to weight 0 (no read fallback).
 */
function normalizeRarityWeightsForCreate(source) {
    return applyWeightSource(emptyWeightMap(), source);
}

/**
 * Build weights from DB rows only (missing tiers = 0).
 */
function weightsFromDbRows(rows) {
    return applyWeightSource(emptyWeightMap(), rows);
}

/**
 * Admin edit: tiers not listed in `patch` retain existing DB weights.
 */
function mergeDropRatesForEdit(existingRows, patch) {
    const merged = weightsFromDbRows(existingRows);
    return applyWeightSource(merged, patch);
}

function sumDropRateWeights(weights) {
    let total = 0;

    for (let rarity = MIN_RARITY; rarity <= MAX_RARITY; rarity += 1) {
        total += Number(weights[rarity] ?? 0);
    }

    return total;
}

/**
 * @returns {{ valid: true, sum: number, weights: Record<number, number> } | { valid: false, sum: number, message: string }}
 */
function validateDropRates(weights) {
    const normalized = emptyWeightMap();

    for (let rarity = MIN_RARITY; rarity <= MAX_RARITY; rarity += 1) {
        const weight = Number(weights[rarity] ?? weights[String(rarity)] ?? 0);

        if (!Number.isFinite(weight) || weight < 0) {
            return {
                valid: false,
                sum: sumDropRateWeights(weights),
                message: `Invalid weight for rarity ${rarity}.`,
            };
        }

        normalized[rarity] = weight;
    }

    const sum = sumDropRateWeights(normalized);

    if (sum !== DROP_RATE_SUM_TARGET) {
        return {
            valid: false,
            sum,
            message: formatDropRateValidationError(sum),
        };
    }

    return {
        valid: true,
        sum,
        weights: normalized,
    };
}

function assertValidDropRates(weights) {
    const result = validateDropRates(weights);

    if (!result.valid) {
        throw new DropRateValidationError(result.sum);
    }

    return result.weights;
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

    async function buildWeightsForCreate(source) {
        return assertValidDropRates(normalizeRarityWeightsForCreate(source));
    }

    async function buildWeightsForEdit(packId, patch) {
        const existing = await packRepository.getDropRates(packId);
        return assertValidDropRates(mergeDropRatesForEdit(existing, patch));
    }

    return {
        getWeightsForPack,
        rollRarityForPack,
        rollRarity,
        normalizeRarityWeights,
        normalizeRarityWeightsForCreate,
        mergeDropRatesForEdit,
        validateDropRates,
        assertValidDropRates,
        buildWeightsForCreate,
        buildWeightsForEdit,
    };
}

module.exports = {
    DEFAULT_RARITY_WEIGHTS,
    DROP_RATE_SUM_TARGET,
    MIN_RARITY,
    MAX_RARITY,
    DropRateValidationError,
    formatDropRateValidationError,
    normalizeRarityWeights,
    normalizeRarityWeightsForCreate,
    weightsFromDbRows,
    mergeDropRatesForEdit,
    sumDropRateWeights,
    validateDropRates,
    assertValidDropRates,
    rollRarity,
    createDropRateService,
};
