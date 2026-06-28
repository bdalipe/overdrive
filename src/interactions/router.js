const { getCommandHandlers } = require('../commands');
const { USER_ERROR_MESSAGE } = require('../shared/errors');
const logger = require('../shared/logger');
const metrics = require('../shared/metrics');

async function handleInteraction(interaction, config) {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const startedAt = metrics.startTimer();
    metrics.logCommandStart(interaction);

    const command = getCommandHandlers().get(interaction.commandName);

    if (!command) {
        logger.warn('unknown_command', { command: interaction.commandName });
        return;
    }

    try {
        await command.execute(interaction, config);
        metrics.logResponseSent(interaction, startedAt);
    } catch (error) {
        logger.error('command_failed', {
            command: interaction.commandName,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            error: error.message,
            stack: error.stack,
        });

        const payload = {
            content: USER_ERROR_MESSAGE,
            ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload);
        } else {
            await interaction.reply(payload);
        }
    }
}

module.exports = { handleInteraction };
