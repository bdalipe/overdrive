const EMBED_COLOR_PRIMARY = 0x5865f2;
const EMBED_COLOR_PACK = 0xf1c40f;

/** Pack reveal embed accent by rarity (1–6★). Phase 1 placeholder — stop using on card reveals once composed star rows ship (M2). Hexes remain the 1–5★ star-fill reference. */
const RARITY_EMBED_COLORS = Object.freeze({
    1: 0xcecdce,
    2: 0x6fe16e,
    3: 0x5da8f4,
    4: 0xf22c49,
    5: 0xf4d028,
    6: 0xb52af9,
});

function getRarityEmbedColor(rarity, fallback = EMBED_COLOR_PACK) {
    const n = Number(rarity);
    return RARITY_EMBED_COLORS[n] ?? fallback;
}

module.exports = {
    EMBED_COLOR_PRIMARY,
    EMBED_COLOR_PACK,
    RARITY_EMBED_COLORS,
    getRarityEmbedColor,
};
