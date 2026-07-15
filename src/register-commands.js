const { REST, Routes } = require('discord.js');
const { getCommandDefinitions } = require('./commands');
const openPack = require('./commands/open-pack');
const { loadEnv } = require('./shared/config');
const { createSupabaseClient } = require('./shared/supabase');
const { createRepositories } = require('./repositories');
const logger = require('./shared/logger');

/**
 * Pushes slash command definitions from `commands/index.js`.
 * Loads active packs from Supabase so `/open-pack` gets a fixed choice list per pack.
 * Re-run after adding/removing packs (`import-packs`) or changing command structure.
 */
async function registerCommands() {
    const config = loadEnv();

    if (!config.clientId) {
        throw new Error('Missing DISCORD_CLIENT_ID. Required for command registration.');
    }

    const supabase = createSupabaseClient(config);
    const repositories = createRepositories(supabase);
    const activePacks = await repositories.packs.listActive();

    if (!Array.isArray(activePacks) || activePacks.length === 0) {
        throw new Error(
            'No active packs found. Seed/import at least one active pack before registering commands.',
        );
    }

    openPack.warnIfActivePacksExceedChoiceLimit(activePacks, 'register-commands');
    const openPackChoices = openPack.buildPackChoices(activePacks);

    const rest = new REST({ version: '10' }).setToken(config.token);
    const body = getCommandDefinitions({ activePacks });

    const logMeta = {
        botEnv: config.botEnv,
        count: body.length,
        activePacks: activePacks.length,
        openPackChoices: openPackChoices.length,
        maxPackChoices: openPack.MAX_PACK_CHOICES,
    };

    if (config.guildId) {
        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body },
        );
        logger.info('commands_registered', {
            ...logMeta,
            scope: 'guild',
            guildId: config.guildId,
        });
        return;
    }

    await rest.put(Routes.applicationCommands(config.clientId), { body });
    logger.info('commands_registered', {
        ...logMeta,
        scope: 'global',
    });
}

registerCommands().catch((error) => {
    logger.error('register_commands_failed', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});
