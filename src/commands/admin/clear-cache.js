const { clearImageUrlCache } = require('../../shared/image-url');
const logger = require('../../shared/logger');

async function execute(interaction, config) {
    const packs = config.services?.packs;

    if (!packs?.clearPackConfigCache || !packs?.invalidateCarPool) {
        await interaction.reply({
            content: 'Pack cache services are not available.',
            ephemeral: true,
        });
        return;
    }

    // clearPackConfigCache wipes the shared Map (pack rows, config, cars:listAll).
    packs.clearPackConfigCache();
    packs.invalidateCarPool();
    clearImageUrlCache();

    logger.info('admin_clear_cache', {
        userId: interaction.user.id,
        guildId: interaction.guildId,
    });

    await interaction.reply({
        content:
            'Cleared this bot process cache (pack config, car pool, image probe results). Next opens will reload from the database.',
        ephemeral: true,
    });
}

module.exports = {
    execute,
};
