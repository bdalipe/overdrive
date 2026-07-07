const { SlashCommandBuilder } = require('discord.js');
const admin = require('./admin');
const hello = require('./hello');
const openPack = require('./open-pack');

/**
 * Command modules export `name`, `description`, and `execute(interaction, config)`.
 * Modules with nested subcommands export `buildDefinition()` instead of a flat builder.
 * Paginated commands also export `paginationPrefix` and `handleButton(interaction, config)`.
 */
const commandModules = [hello, openPack, admin];

const commandHandlers = new Map(commandModules.map((command) => [command.name, command]));

function buildCommandDefinition(command) {
    if (typeof command.buildDefinition === 'function') {
        return command.buildDefinition();
    }

    return new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description);
}

const commandDefinitions = commandModules.map((command) => buildCommandDefinition(command));

const buttonHandlers = [
    {
        prefix: openPack.paginationPrefix,
        handle: openPack.handleButton,
    },
];

function getCommandDefinitions() {
    return commandDefinitions.map((command) => command.toJSON());
}

module.exports = {
    commandHandlers,
    buttonHandlers,
    getCommandDefinitions,
};
