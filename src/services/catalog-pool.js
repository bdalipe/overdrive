/** Shared in-memory cache key for the full car catalog (`cars.listAll`). */
const CATALOG_POOL_CACHE_KEY = 'cars:listAll';

/**
 * Cached full-catalog loader shared by pack draws and `/view-card` autocomplete.
 *
 * @param {{ cars: { listAll: Function }, cache: { getOrLoad: Function, invalidate: Function } }} deps
 */
function createCatalogPool({ cars, cache }) {
    async function getAllCars() {
        return cache.getOrLoad(CATALOG_POOL_CACHE_KEY, () => cars.listAll());
    }

    function invalidate() {
        cache.invalidate(CATALOG_POOL_CACHE_KEY);
    }

    return {
        getAllCars,
        invalidate,
    };
}

module.exports = {
    CATALOG_POOL_CACHE_KEY,
    createCatalogPool,
};
