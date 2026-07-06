const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR_PRIMARY } = require('../shared/theme');

/**
 * Lightweight Discord embed builders for simple or admin/diagnostic commands
 * (`/hello`, `/admin debug-latency` ping/timing probes, etc.).
 * Pack reveal uses `pack-reveal.js`; composed cards use `renderers/card/` (Phase 3+).
 */

function buildHelloEmbed(botEnv) {
    return new EmbedBuilder()
        .setTitle('Overdrive!')
        .setDescription('Welcome — the bot is online and ready.')
        .setColor(EMBED_COLOR_PRIMARY)
        .addFields({
            name: 'Environment',
            value: botEnv,
            inline: true,
        });
}

module.exports = {
    buildHelloEmbed,
};
