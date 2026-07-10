const fs = require('fs');
const path = require('path');

function createDropManifestLib(catalogRoot) {
    const dropsDir = path.join(catalogRoot, 'drops');

    function resolveManifestPath(botEnv) {
        const envSpecific = path.join(catalogRoot, `manifest.${botEnv}.json`);
        if (botEnv && fs.existsSync(envSpecific)) {
            return envSpecific;
        }

        return path.join(catalogRoot, 'manifest.json');
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
        if (!fs.existsSync(dropsDir)) {
            return [];
        }

        return fs.readdirSync(dropsDir)
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
        const dropPath = path.join(dropsDir, filename);
        const raw = fs.readFileSync(dropPath, 'utf8');
        return JSON.parse(raw);
    }

    return {
        catalogRoot,
        dropsDir,
        resolveManifestPath,
        readManifest,
        writeManifest,
        listDropFiles,
        resolvePendingDrops,
        readDropFile,
    };
}

module.exports = { createDropManifestLib };
