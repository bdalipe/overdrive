const { EmbedBuilder } = require('discord.js');

function buildHelloEmbed(botEnv) {
    return new EmbedBuilder()
        .setTitle('Overdrive!')
        .setDescription('Welcome — the bot is online and ready.')
        .setColor(0x5865f2)
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
        .setColor(0xf1c40f)
        .setFooter({ text: `Slot ${slot} of ${totalSlots}` });
}

module.exports = {
    buildHelloEmbed,
    buildOpenPackEmbed,
};
