const logger = require('./logger');

const LATENCY_WARN_MS = 800;

function startTimer() {
    return Date.now();
}

function logCommandStart(interaction) {
    logger.info('command_start', {
        command: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guildId,
    });
}

function logResponseSent(interaction, startedAt) {
    const durationMs = Date.now() - startedAt;

    logger.info('response_sent', {
        command: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        durationMs,
    });

    if (durationMs > LATENCY_WARN_MS) {
        logger.warn('latency_threshold_exceeded', {
            command: interaction.commandName,
            durationMs,
            thresholdMs: LATENCY_WARN_MS,
        });
    }
}

module.exports = {
    startTimer,
    logCommandStart,
    logResponseSent,
};
