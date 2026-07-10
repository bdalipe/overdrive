const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const debugLatency = require('./debug-latency');

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

    await debugLatency.execute(interaction, config);
}

module.exports = {
    name: 'admin',
    description: 'Access administrator commands',
    buildDefinition,
    execute,
};
