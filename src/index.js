const { Client, Events, GatewayIntentBits } = require('discord.js');
const { handleInteraction } = require('./interactions/router');
const { loadEnv } = require('./shared/config');
const { createSupabaseClient } = require('./shared/supabase');
const { createRepositories } = require('./repositories');
const logger = require('./shared/logger');

const config = loadEnv();
const supabase = createSupabaseClient(config);
const repositories = createRepositories(supabase);

const runtimeConfig = {
    ...config,
    supabase,
    repositories,
};

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
    logger.info('bot_online', {
        username: readyClient.user.tag,
        botEnv: config.botEnv,
        supabaseConfigured: true,
        repositoriesReady: true,
    });
});

client.on(Events.InteractionCreate, (interaction) => {
    handleInteraction(interaction, runtimeConfig).catch((error) => {
        logger.error('interaction_handler_unhandled', {
            error: error.message,
            stack: error.stack,
        });
    });
});

client.login(config.token);
