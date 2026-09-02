const { formatDisplayName } = require('../models/car');

/** Discord autocomplete allows at most 25 choices. */
const MAX_RESULTS = 25;

const SIX_DIGIT_ID = /^\d{6}$/;

function normalizeQuery(query) {
    return (query ?? '').trim().toLowerCase();
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

    if (SIX_DIGIT_ID.test(q) && idStr === q) {
        return 1000;
    }

    if (/^\d+$/.test(q) && idStr.startsWith(q)) {
        return 900;
    }

    const displayName = formatDisplayName(car).toLowerCase();
    const year = car.model_year != null ? String(car.model_year) : '';
    const make = (car.make ?? '').toLowerCase();
    const model = (car.model ?? '').toLowerCase();
    const fullLabel = `${year} ${make} ${model}`.trim();

    if (displayName === q || fullLabel === q) {
        return 800;
    }

    if (displayName.startsWith(q) || fullLabel.startsWith(q)) {
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

    if (!normalized) {
        return cars.slice(0, MAX_RESULTS);
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

        return a.car.id - b.car.id;
    });

    return scored.map((entry) => entry.car).slice(0, MAX_RESULTS);
}

module.exports = {
    MAX_RESULTS,
    normalizeQuery,
    buildSearchHaystack,
    scoreCar,
    rankCars,
};
