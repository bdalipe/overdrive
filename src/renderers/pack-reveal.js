const { EmbedBuilder } = require('discord.js');
const { getRarityEmbedColor, EMBED_COLOR_PACK } = require('../shared/theme');
const { buildCardDisplay, formatPackRevealTitle } = require('./card-display');

/** Sentinel page slot for pack summary (not a car row). */
const PACK_SUMMARY_PAGE = Symbol('pack-summary');
/** Discord embed description max length. */
const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;

function sortCardsByRarityDesc(cars) {
    return [...cars].sort((a, b) => b.rarity - a.rarity);
}

/**
 * Phase 1–2 interim reveal: title + optional image only (no embed fields).
 * Embed accent uses rarity color until Phase 2 composed cards replace it with star-row art.
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
 * Truncates if description would exceed Discord's 4096-character limit.
 */
function buildPackSummaryEmbed(cards, { packSlug }) {
    const sorted = sortCardsByRarityDesc(cards);
    const lines = sorted.map((car) => formatPackRevealTitle(car));
    let description = lines.join('\n');

    if (description.length > DISCORD_EMBED_DESCRIPTION_LIMIT) {
        description = `${description.slice(0, DISCORD_EMBED_DESCRIPTION_LIMIT - 1)}…`;
    }

    return new EmbedBuilder()
        .setTitle('Pack summary')
        .setDescription(description)
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
