const { buildOpenPackEmbed } = require('../renderers/embeds');

async function execute(interaction) {
    const embed = buildOpenPackEmbed({ slot: 1, totalSlots: 1 });
    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    name: 'open-pack',
    execute,
};
