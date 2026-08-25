/**
 * Card overlay slots for a 1652×1029 baked base (catalog `image_url`).
 * Origin is top-left; y is downward. Numbers are a first pass from mock regions —
 * retune against a real PNG before pack reveal.
 *
 * Baked (no slots): photo, logo, flag, stat-column chrome and labels.
 */
const CARD_LAYOUT_WIDTH = 1652;
const CARD_LAYOUT_HEIGHT = 1029;
const CARD_LAYOUT_TEMPLATE_VERSION = 'v1-1652x1029';

function textSlot(x, y, align = 'left') {
    return Object.freeze({ x, y, align });
}

const CARD_LAYOUT = Object.freeze({
    templateVersion: CARD_LAYOUT_TEMPLATE_VERSION,
    width: CARD_LAYOUT_WIDTH,
    height: CARD_LAYOUT_HEIGHT,
    /** Year / make / model in the top header (left of logo/flag). */
    name: textSlot(44, 62, 'left'),
    stats: Object.freeze({
        /** Right-aligned into the four chrome boxes. */
        topSpeed: textSlot(1608, 210, 'right'),
        zeroToSixty: textSlot(1608, 400, 'right'),
        handling: textSlot(1608, 590, 'right'),
        weight: textSlot(1608, 780, 'right'),
    }),
    /** Drive type + tires (e.g. FWD / STREET), lower area left of the weight box. */
    drivetrainTires: textSlot(980, 990, 'left'),
    /** RP + shadow; overlay off until Phase 3. */
    performance: textSlot(44, 900, 'left'),
    /** Top-left of the six-star row PNG. */
    rarity: Object.freeze({ x: 44, y: 948 }),
});

function getCardLayout() {
    return CARD_LAYOUT;
}

module.exports = {
    CARD_LAYOUT_WIDTH,
    CARD_LAYOUT_HEIGHT,
    CARD_LAYOUT_TEMPLATE_VERSION,
    CARD_LAYOUT,
    getCardLayout,
};
