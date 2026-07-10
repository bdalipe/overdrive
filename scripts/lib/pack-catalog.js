const path = require('path');
const { createDropManifestLib } = require('./drop-manifest');

const PACK_CATALOG_ROOT = path.resolve(process.cwd(), 'data', 'packs');
const packCatalogLib = createDropManifestLib(PACK_CATALOG_ROOT);

module.exports = {
    PACK_CATALOG_ROOT,
    DROPS_DIR: packCatalogLib.dropsDir,
    ...packCatalogLib,
};
