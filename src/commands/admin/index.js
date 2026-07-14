const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const debugLatency = require('./debug-latency');
const clearCache = require('./clear-cache');

const ADMIN_DENIED_MESSAGE = 'Admins only! Keep out...';

function buildDefinition() {
    return new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Access administrator commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName('debug-latency')
                .setDescription('Test bot latency, timings, and database round-trip'),
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('clear-cache')
                .setDescription('Clear this bot process pack/car/image caches (after catalog imports)'),
        );
}

async function execute(interaction, config) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: ADMIN_DENIED_MESSAGE,
            ephemeral: true,
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'debug-latency') {
        await debugLatency.execute(interaction, config);
        return;
    }

    if (subcommand === 'clear-cache') {
        await clearCache.execute(interaction, config);
        return;
    }

    await interaction.reply({
        content: 'Unknown admin subcommand.',
        ephemeral: true,
    });
}

module.exports = {
    name: 'admin',
    description: 'Access administrator commands',
    buildDefinition,
    execute,
};
