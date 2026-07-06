const { createDropRateService } = require('./drop-rate-service');
const { createPackConfigCache } = require('./pack-config-cache');
const { createPackService } = require('./pack-service');

function createServices(repositories, { configCacheTtlMs } = {}) {
    const configCache = createPackConfigCache(
        configCacheTtlMs != null ? { ttlMs: configCacheTtlMs } : {},
    );
    const dropRates = createDropRateService(repositories.packs);

    return {
        dropRates,
        packConfigCache: configCache,
        packs: createPackService({
            packs: repositories.packs,
            cars: repositories.cars,
            dropRateService: dropRates,
            configCache,
        }),
    };
}

module.exports = { createServices };
