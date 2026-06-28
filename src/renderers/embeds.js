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

module.exports = {
    buildHelloEmbed,
};
