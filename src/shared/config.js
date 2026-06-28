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

    return {
        botEnv,
        token,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
    };
}

module.exports = { loadEnv };
