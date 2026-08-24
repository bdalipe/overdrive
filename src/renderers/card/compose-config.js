const { createHash } = require('crypto');

/** Overlay ids callers and a future admin command may toggle. */
const OVERLAY_IDS = Object.freeze([
    'baseImage',
    'name',
    'rarity',
    'stats',
    'drivetrainTires',
    'performance',
]);

/**
 * Code defaults. `strict` is always true: skipped (`false`) overlays are not failures;
 * enabled overlays that fail to render abort the whole compose.
 *
 * Runtime/DB overrides may change overlay flags only (future admin + Supabase row).
 */
const DEFAULT_COMPOSE_CONFIG = Object.freeze({
    baseImage: true,
    name: true,
    rarity: true,
    stats: true,
    drivetrainTires: true,
    performance: false,
    strict: true,
});

/** In-memory overlay overrides. Survives until process exit; persist via future Supabase row. */
let overlayOverrides = {};

function isOverlayId(name) {
    return OVERLAY_IDS.includes(name);
}

function sanitizeOverlayOverrides(partial) {
    if (partial == null || typeof partial !== 'object') {
        return {};
    }

    const next = {};
    for (const id of OVERLAY_IDS) {
        if (!Object.prototype.hasOwnProperty.call(partial, id)) {
            continue;
        }
        if (typeof partial[id] !== 'boolean') {
            continue;
        }
        next[id] = partial[id];
    }
    return next;
}

/**
 * Replace in-memory overlay overrides (does not write Supabase).
 * Unknown keys and `strict` are ignored.
 */
function setComposeConfigOverrides(partial) {
    overlayOverrides = sanitizeOverlayOverrides(partial);
    return getComposeConfig();
}

function getComposeConfigOverrides() {
    return { ...overlayOverrides };
}

function clearComposeConfigOverrides() {
    overlayOverrides = {};
    return getComposeConfig();
}

function getComposeConfig() {
    return {
        ...DEFAULT_COMPOSE_CONFIG,
        ...overlayOverrides,
        strict: true,
    };
}

function isOverlayEnabled(name) {
    if (!isOverlayId(name)) {
        return false;
    }
    return getComposeConfig()[name] === true;
}

/**
 * Stable digest of overlay flags + strict for a future compose cache key
 * `(car_id, composeConfigHash, templateVersion)`.
 */
function getComposeConfigHash() {
    const config = getComposeConfig();
    const payload = OVERLAY_IDS.map((id) => `${id}:${config[id] ? '1' : '0'}`).join(',');
    return createHash('sha256')
        .update(`${payload}|strict:${config.strict ? '1' : '0'}`)
        .digest('hex');
}

module.exports = {
    OVERLAY_IDS,
    DEFAULT_COMPOSE_CONFIG,
    getComposeConfig,
    getComposeConfigHash,
    getComposeConfigOverrides,
    isOverlayEnabled,
    setComposeConfigOverrides,
    clearComposeConfigOverrides,
    isOverlayId,
};
