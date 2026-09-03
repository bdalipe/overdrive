const { commandHandlers, buttonHandlers } = require('../commands');
const { matchesPaginationPrefix } = require('./pagination');
const {
    USER_ERROR_MESSAGE,
    UNKNOWN_INTERACTION_MESSAGE,
} = require('../shared/errors');
const logger = require('../shared/logger');
const metrics = require('../shared/metrics');

async function replyEphemeral(interaction, content) {
    const payload = { content, ephemeral: true };

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function sendInteractionError(interaction, error, label) {
    logger.error('interaction_failed', {
        label,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        error: error.message,
        stack: error.stack,
    });

    await replyEphemeral(interaction, USER_ERROR_MESSAGE);
}

async function handleInteraction(interaction, config) {
    if (
        !interaction.isChatInputCommand()
        && !interaction.isAutocomplete()
        && !interaction.isButton()
    ) {
        return;
    }

    const startedAt = metrics.startTimer();
    metrics.logInteractionStart(interaction);

    if (interaction.isAutocomplete()) {
        const command = commandHandlers.get(interaction.commandName);

        if (!command || typeof command.handleAutocomplete !== 'function') {
            logger.warn('unknown_autocomplete', { command: interaction.commandName });
            await interaction.respond([]);
            return;
        }

        try {
            await command.handleAutocomplete(interaction, config);
            metrics.logResponseSent(interaction, startedAt);
        } catch (error) {
            logger.error('interaction_failed', {
                label: interaction.commandName,
                userId: interaction.user.id,
                guildId: interaction.guildId,
                error: error.message,
                stack: error.stack,
            });

            if (!interaction.responded) {
                await interaction.respond([]);
            }
        }

        return;
    }

    if (interaction.isChatInputCommand()) {
        const command = commandHandlers.get(interaction.commandName);

        if (!command) {
            logger.warn('unknown_command', { command: interaction.commandName });
            await replyEphemeral(interaction, UNKNOWN_INTERACTION_MESSAGE);
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
        const handler = buttonHandlers.find(({ prefix }) =>
            matchesPaginationPrefix(interaction.customId, prefix),
        );

        if (!handler) {
            logger.warn('unknown_button', { customId: interaction.customId });
            await replyEphemeral(interaction, UNKNOWN_INTERACTION_MESSAGE);
            return;
        }

        try {
            await handler.handle(interaction, config);
            metrics.logResponseSent(interaction, startedAt);
        } catch (error) {
            await sendInteractionError(interaction, error, interaction.customId);
        }

        return;
    }
}

module.exports = { handleInteraction };
