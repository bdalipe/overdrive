const { Client, Events, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions/router');
const { loadEnv } = require('./shared/config');
const logger = require('./shared/logger');

const config = loadEnv();

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
    logger.info('bot_online', {
        username: readyClient.user.tag,
        botEnv: config.botEnv,
    });
});

client.on(Events.InteractionCreate, (interaction) => {
    handleInteraction(interaction, config).catch((error) => {
        logger.error('interaction_handler_unhandled', {
            error: error.message,
            stack: error.stack,
        });
    });
});

client.login(config.token);
