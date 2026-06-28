const logger = require('./logger');

const LATENCY_WARN_MS = 800;

function startTimer() {
    return Date.now();
}

function getInteractionLabel(interaction) {
    if (interaction.isChatInputCommand()) {
        return interaction.commandName;
    }

    if (interaction.isButton()) {
        return interaction.customId;
    }

    return 'unknown';
}

function logInteractionStart(interaction) {
    logger.info('interaction_start', {
        type: interaction.isChatInputCommand() ? 'command' : interaction.isButton() ? 'button' : 'other',
        label: getInteractionLabel(interaction),
        userId: interaction.user.id,
        guildId: interaction.guildId,
    });
}

function logResponseSent(interaction, startedAt) {
    const durationMs = Date.now() - startedAt;
    const label = getInteractionLabel(interaction);

    logger.info('response_sent', {
        label,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        durationMs,
    });

    if (durationMs > LATENCY_WARN_MS) {
        logger.warn('latency_threshold_exceeded', {
            label,
            durationMs,
            thresholdMs: LATENCY_WARN_MS,
        });
    }
}

module.exports = {
    startTimer,
    logInteractionStart,
    logResponseSent,
};
