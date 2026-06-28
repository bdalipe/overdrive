const { REST, Routes } = require('discord.js');
const { getCommandDefinitions } = require('./commands');
const { loadEnv } = require('./shared/config');
const logger = require('./shared/logger');

async function registerCommands() {
    const config = loadEnv();

    if (!config.clientId) {
        throw new Error('Missing DISCORD_CLIENT_ID. Required for command registration.');
    }

    const rest = new REST({ version: '10' }).setToken(config.token);
    const body = getCommandDefinitions();

    if (config.guildId) {
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body },
        );
        logger.info('commands_registered', {
            scope: 'guild',
            guildId: config.guildId,
            botEnv: config.botEnv,
            count: body.length,
        });
        return;
    }

    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info('commands_registered', {
        scope: 'global',
        botEnv: config.botEnv,
        count: body.length,
    });
}

registerCommands().catch((error) => {
    logger.error('register_commands_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
