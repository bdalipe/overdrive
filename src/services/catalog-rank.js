const { formatPackRevealTitle } = require('../renderers/card-display');

/** Discord autocomplete allows at most 25 choices. */
const MAX_RESULTS = 25;

function normalizeQuery(query) {
    return (query ?? '').trim().toLowerCase();
}

/**
 * Rank catalog cars for autocomplete. Scoring tiers are added incrementally;
 * today this applies a baseline substring filter on id/title after normalization.
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

    return cars
        .filter((car) => {
            const id = String(car.id);
            const title = formatPackRevealTitle(car).toLowerCase();
            return id.includes(normalized) || title.includes(normalized);
        })
        .slice(0, MAX_RESULTS);
}

module.exports = {
    MAX_RESULTS,
    normalizeQuery,
    rankCars,
};
