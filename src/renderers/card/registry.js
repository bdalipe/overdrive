/**
 * Overlay contract: `{ id, render(ctx, car, layout) }`.
 * `id` is an OVERLAY_IDS key. Stubs no-op; enabled + no-op is success under strict.
 */
const { OVERLAY_IDS } = require('./compose-config');
const baseImage = require('./components/base-image');
const name = require('./components/name');
const statsColumn = require('./components/stats-column');
const drivetrainTires = require('./components/drivetrain-tires');
const performanceBlock = require('./components/performance-block');
const rarity = require('./components/rarity');

/** Paint order: photo first, then type, then bottom-left RP and star row. */
const overlays = Object.freeze([
    baseImage,
    name,
    statsColumn,
    drivetrainTires,
    performanceBlock,
    rarity,
]);

function getOverlays() {
    return overlays;
}

function assertOverlayRegistry() {
    const ids = overlays.map((overlay) => overlay.id);
    for (const overlay of overlays) {
        if (typeof overlay.render !== 'function') {
            throw new Error(`Overlay ${overlay.id} is missing render()`);
        }
        if (!OVERLAY_IDS.includes(overlay.id)) {
            throw new Error(`Unknown overlay id: ${overlay.id}`);
        }
    }
    if (ids.length !== OVERLAY_IDS.length) {
        throw new Error('Overlay registry length does not match OVERLAY_IDS');
    }
}

assertOverlayRegistry();

module.exports = {
    getOverlays,
};
