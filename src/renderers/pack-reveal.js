const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR_PACK } = require('../shared/theme');
const { buildCardDisplay, formatPackRevealTitle } = require('./card-display');

/**
 * Phase 1–2 interim reveal: title + optional image only (no embed fields).
 * Full stat grid moves to composed card image in Phase 3.
 */
function buildPackCardEmbed(car, { currentPage, totalPages, packSlug }) {
    const display = buildCardDisplay(car);

    const embed = new EmbedBuilder()
        .setTitle(formatPackRevealTitle(car))
        .setColor(EMBED_COLOR_PACK)
        .setFooter({ text: `Card ${currentPage} of ${totalPages} · ${packSlug}` });

    if (display.hasImage) {
        embed.setImage(display.imageUrl);
    }

    return embed;
}

module.exports = {
    buildPackCardEmbed,
};
