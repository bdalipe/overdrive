const { SlashCommandBuilder } = require('discord.js');
const hello = require('./hello');
const openPack = require('./open-pack');

/**
 * Command modules export `name`, `description`, and `execute(interaction, config)`.
 * Paginated commands also export `paginationPrefix` and `handleButton(interaction, config)`.
 */
const commandModules = [hello, openPack];

const commandHandlers = new Map(commandModules.map((command) => [command.name, command]));

const commandDefinitions = commandModules.map((command) =>
    new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description),
);

const buttonHandlers = [
    {
        prefix: openPack.paginationPrefix,
        handle: openPack.handleButton,
    },
];

function getCommandHandlers() {
    return commandHandlers;
}

function getButtonHandlers() {
    return buttonHandlers;
}

function getCommandDefinitions() {
    return commandDefinitions.map((command) => command.toJSON());
}

module.exports = {
    getCommandHandlers,
    getButtonHandlers,
    getCommandDefinitions,
};
