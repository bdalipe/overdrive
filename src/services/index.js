const { createDropRateService } = require('./drop-rate-service');
const { createPackService } = require('./pack-service');

function createServices(repositories) {
    const dropRates = createDropRateService(repositories.packs);

    return {
        dropRates,
        packs: createPackService({
            packs: repositories.packs,
            cars: repositories.cars,
            dropRateService: dropRates,
        }),
    };
}

module.exports = { createServices };
