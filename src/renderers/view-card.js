const { EmbedBuilder } = require('discord.js');
const { getRarityEmbedColor } = require('../shared/theme');
const { formatPackRevealTitle } = require('./card-display');

/**
 * Phase 2 interim catalog view: title + optional image only (no composed card yet).
 */
function buildViewCardEmbed(car) {
    const embed = new EmbedBuilder()
        .setTitle(formatPackRevealTitle(car))
        .setColor(getRarityEmbedColor(car.rarity));

    if (car.image_url) {
        embed.setImage(car.image_url);
    }

    return embed;
}

module.exports = {
    buildViewCardEmbed,
};
