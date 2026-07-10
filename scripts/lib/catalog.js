const path = require('path');
const { createDropManifestLib } = require('./drop-manifest');

const CATALOG_ROOT = path.resolve(process.cwd(), 'data', 'catalog');
const catalogLib = createDropManifestLib(CATALOG_ROOT);

module.exports = {
    CATALOG_ROOT,
    DROPS_DIR: catalogLib.dropsDir,
    ...catalogLib,
};
