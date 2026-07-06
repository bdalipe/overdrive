const fs = require('fs');
const path = require('path');

const CATALOG_ROOT = path.resolve(process.cwd(), 'data', 'catalog');
const DROPS_DIR = path.join(CATALOG_ROOT, 'drops');

function resolveManifestPath(botEnv) {
    const envSpecific = path.join(CATALOG_ROOT, `manifest.${botEnv}.json`);
    if (botEnv && fs.existsSync(envSpecific)) {
        return envSpecific;
    }

    return path.join(CATALOG_ROOT, 'manifest.json');
}

function readManifest(botEnv) {
    const manifestPath = resolveManifestPath(botEnv);
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);

    manifest.applied = manifest.applied ?? [];
    manifest.pending = manifest.pending ?? [];

    return { manifest, manifestPath };
}

function writeManifest(manifestPath, manifest) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function listDropFiles() {
    if (!fs.existsSync(DROPS_DIR)) {
        return [];
    }

    return fs.readdirSync(DROPS_DIR)
        .filter((name) => name.endsWith('.json'))
        .sort();
}

function resolvePendingDrops(manifest) {
    if (manifest.pending.length > 0) {
        return [...manifest.pending];
    }

    const applied = new Set(manifest.applied);
    return listDropFiles().filter((filename) => !applied.has(filename));
}

function readDropFile(filename) {
    const dropPath = path.join(DROPS_DIR, filename);
    const raw = fs.readFileSync(dropPath, 'utf8');
    return JSON.parse(raw);
}

module.exports = {
    CATALOG_ROOT,
    DROPS_DIR,
    resolveManifestPath,
    readManifest,
    writeManifest,
    listDropFiles,
    resolvePendingDrops,
    readDropFile,
};
