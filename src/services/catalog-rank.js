const { formatDisplayName } = require('../models/car');

/** Discord autocomplete allows at most 25 choices. */
const MAX_RESULTS = 25;

const SIX_DIGIT_ID = /^\d{6}$/;

function normalizeQuery(query) {
    return (query ?? '').trim().toLowerCase();
}

function tokenizeQuery(query) {
    return normalizeQuery(query).split(/\s+/).filter(Boolean);
}

function allTokensIn(text, tokens) {
    return tokens.every((token) => text.includes(token));
}

function compareCarsAlphabetically(a, b) {
    const makeCmp = (a.make ?? '').toLowerCase().localeCompare((b.make ?? '').toLowerCase());
    if (makeCmp !== 0) {
        return makeCmp;
    }

    const modelCmp = (a.model ?? '').toLowerCase().localeCompare((b.model ?? '').toLowerCase());
    if (modelCmp !== 0) {
        return modelCmp;
    }

    return a.id - b.id;
}

function buildSearchHaystack(car) {
    const parts = [
        String(car.id),
        car.make,
        car.model,
        car.model_year != null ? String(car.model_year) : '',
        formatDisplayName(car),
    ].filter((part) => part != null && part !== '');

    return parts.join(' ').toLowerCase();
}

/**
 * Higher score = more relevant. Zero means no match.
 *
 * @param {object} car
 * @param {string} query - raw autocomplete focused value
 * @returns {number}
 */
function scoreCar(car, query) {
    const q = normalizeQuery(query);
    if (!q) {
        return 0;
    }

    const idStr = String(car.id);
    const year = car.model_year != null ? String(car.model_year) : '';

    if (SIX_DIGIT_ID.test(q) && idStr === q) {
        return 1000;
    }

    if (/^\d+$/.test(q)) {
        if (year === q) {
            return 920;
        }

        if (idStr.startsWith(q)) {
            return 900;
        }

        return 0;
    }

    const displayName = formatDisplayName(car).toLowerCase();
    const make = (car.make ?? '').toLowerCase();
    const model = (car.model ?? '').toLowerCase();
    const fullLabel = `${year} ${make} ${model}`.trim();
    const tokens = tokenizeQuery(query);

    if (displayName === q || fullLabel === q) {
        return 800;
    }

    if (tokens.length >= 2 && allTokensIn(fullLabel, tokens)) {
        return 800;
    }

    if (displayName.startsWith(q)) {
        return 700;
    }

    if (make === q || model === q) {
        return 650;
    }

    if (make.startsWith(q) || model.startsWith(q)) {
        return 600;
    }

    const haystack = buildSearchHaystack(car);
    if (haystack.includes(q)) {
        return 500 - (haystack.length - q.length);
    }

    return 0;
}

/**
 * Rank catalog cars for autocomplete by relevance score (best first).
 *
 * @param {object[]} cars
 * @param {string} query - raw focused autocomplete value
 * @returns {object[]}
 */
function rankCars(cars, query) {
    const normalized = normalizeQuery(query);

    if (normalized.length < 2) {
        return [];
    }

    const scored = [];

    for (const car of cars) {
        const score = scoreCar(car, query);
        if (score > 0) {
            scored.push({ car, score });
        }
    }

    scored.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        return compareCarsAlphabetically(a.car, b.car);
    });

    return scored.map((entry) => entry.car).slice(0, MAX_RESULTS);
}

module.exports = {
    MAX_RESULTS,
    normalizeQuery,
    tokenizeQuery,
    buildSearchHaystack,
    scoreCar,
    rankCars,
};
