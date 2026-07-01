const { buildHelloEmbed } = require('../renderers/embeds');

async function execute(interaction, config) {
    const embed = buildHelloEmbed(config.botEnv);
    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    name: 'hello',
    description: 'Say hello to Overdrive!',
    execute,
};
