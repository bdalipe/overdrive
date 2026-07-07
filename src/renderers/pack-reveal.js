const { EmbedBuilder } = require('discord.js');
const { getRarityEmbedColor, EMBED_COLOR_PACK } = require('../shared/theme');
const { buildCardDisplay, formatPackRevealTitle } = require('./card-display');

/** Sentinel page slot for pack summary (not a car row). */
const PACK_SUMMARY_PAGE = Symbol('pack-summary');

function sortCardsByRarityDesc(cars) {
    return [...cars].sort((a, b) => b.rarity - a.rarity);
}

/**
 * Phase 1–2 interim reveal: title + optional image only (no embed fields).
 */
function buildPackCardEmbed(car, { currentPage, totalCards, packSlug }) {
    const display = buildCardDisplay(car);

    const embed = new EmbedBuilder()
        .setTitle(formatPackRevealTitle(car))
        .setColor(getRarityEmbedColor(car.rarity))
        .setFooter({ text: `Card ${currentPage} of ${totalCards} · ${packSlug}` });

    if (display.hasImage) {
        embed.setImage(display.imageUrl);
    }

    return embed;
}

/**
 * Final reveal page: all pulls as title lines, highest rarity first.
 */
function buildPackSummaryEmbed(cards, { packSlug }) {
    const sorted = sortCardsByRarityDesc(cards);
    const lines = sorted.map((car) => formatPackRevealTitle(car));

    return new EmbedBuilder()
        .setTitle('Pack summary')
        .setDescription(lines.join('\n'))
        .setColor(EMBED_COLOR_PACK)
        .setFooter({ text: `Summary · ${packSlug}` });
}

function isPackSummaryPage(pageData) {
    return pageData === PACK_SUMMARY_PAGE;
}

function buildRevealPages(cards) {
    return [...cards, PACK_SUMMARY_PAGE];
}

module.exports = {
    PACK_SUMMARY_PAGE,
    buildPackCardEmbed,
    buildPackSummaryEmbed,
    buildRevealPages,
    isPackSummaryPage,
    sortCardsByRarityDesc,
};
