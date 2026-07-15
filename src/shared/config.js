const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
    const botEnv = process.env.BOT_ENV || 'dev';
    const envFile = path.resolve(process.cwd(), `.env.${botEnv}`);

    dotenv.config({ path: envFile });
    dotenv.config();

    const token = process.env.DISCORD_BOT_TOKEN || process.env.TOKEN;

    if (!token) {
        throw new Error(
            'Missing bot token. Set DISCORD_BOT_TOKEN or TOKEN in .env or .env.{BOT_ENV}.',
        );
    }

    const supabaseSecretKey =
        process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    const maintainerDiscordUserId =
        process.env.MAINTAINER_DISCORD_USER_ID?.trim() || undefined;

    return {
        botEnv,
        token,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseSecretKey,
        maintainerDiscordUserId,
    };
}

module.exports = { loadEnv };
