const { createDropRateService } = require('./drop-rate-service');
const { createPackConfigCache } = require('./pack-config-cache');
const { createCatalogPool } = require('./catalog-pool');
const { createPackService } = require('./pack-service');

function createServices(repositories, { configCacheTtlMs } = {}) {
    const configCache = createPackConfigCache(
        configCacheTtlMs != null ? { ttlMs: configCacheTtlMs } : {},
    );
    const dropRates = createDropRateService(repositories.packs);
    const catalogPool = createCatalogPool({
        cars: repositories.cars,
        cache: configCache,
    });

    return {
        dropRates,
        packConfigCache: configCache,
        catalogPool,
        packs: createPackService({
            packs: repositories.packs,
            cars: repositories.cars,
            dropRateService: dropRates,
            configCache,
            catalogPool,
        }),
    };
}

module.exports = { createServices };
