const { getCommandHandlers, getButtonHandlers } = require('../commands');
const { matchesPaginationPrefix } = require('./pagination');
const { USER_ERROR_MESSAGE } = require('../shared/errors');
const logger = require('../shared/logger');
const metrics = require('../shared/metrics');

async function sendInteractionError(interaction, error, label) {
    logger.error('interaction_failed', {
        label,
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

async function handleInteraction(interaction, config) {
    const startedAt = metrics.startTimer();
    metrics.logInteractionStart(interaction);

    if (interaction.isChatInputCommand()) {
        const command = getCommandHandlers().get(interaction.commandName);

        if (!command) {
            logger.warn('unknown_command', { command: interaction.commandName });
            return;
        }

        try {
            await command.execute(interaction, config);
            metrics.logResponseSent(interaction, startedAt);
        } catch (error) {
            await sendInteractionError(interaction, error, interaction.commandName);
        }

        return;
    }

    if (interaction.isButton()) {
        const handler = getButtonHandlers().find(({ prefix }) =>
            matchesPaginationPrefix(interaction.customId, prefix),
        );

        if (!handler) {
            logger.warn('unknown_button', { customId: interaction.customId });
            return;
        }

        try {
            await handler.handle(interaction, config);
            metrics.logResponseSent(interaction, startedAt);
        } catch (error) {
            await sendInteractionError(interaction, error, interaction.customId);
        }
    }
}

module.exports = { handleInteraction };
