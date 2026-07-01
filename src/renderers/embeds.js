const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR_PACK, EMBED_COLOR_PRIMARY } = require('../shared/theme');

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

function buildOpenPackEmbed({ slot, totalSlots }) {
    return new EmbedBuilder()
        .setTitle('Open Pack')
        .setDescription(`Card slot ${slot} — coming soon`)
        .setColor(EMBED_COLOR_PACK)
        .setFooter({ text: `Slot ${slot} of ${totalSlots}` });
}

module.exports = {
    buildHelloEmbed,
    buildOpenPackEmbed,
};
