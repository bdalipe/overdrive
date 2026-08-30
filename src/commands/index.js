const { SlashCommandBuilder } = require('discord.js');
const admin = require('./admin');
const debugLatency = require('./admin/debug-latency');
const hello = require('./hello');
const openPack = require('./open-pack');
const viewCard = require('./view-card');

/**
 * Command modules export `name`, `description`, and `execute(interaction, config)`.
 * Modules with nested options export `buildDefinition(context)` instead of a flat builder.
 * Paginated commands also export `paginationPrefix` and `handleButton(interaction, config)`.
 * Commands with autocomplete export `handleAutocomplete(interaction, config)`.
 */
const commandModules = [hello, openPack, viewCard, admin];

const commandHandlers = new Map(commandModules.map((command) => [command.name, command]));

function buildCommandDefinition(command, context = {}) {
    if (typeof command.buildDefinition === 'function') {
        return command.buildDefinition(context);
    }

    return new SlashCommandBuilder()
        .setName(command.name)
        .setDescription(command.description);
}

const buttonHandlers = [
    {
        prefix: openPack.paginationPrefix,
        handle: openPack.handleButton,
    },
    {
        prefix: debugLatency.paginationPrefix,
        handle: debugLatency.handleButton,
    },
];

/**
 * @param {{ activePacks?: object[] }} [context]
 * `activePacks` feeds `/open-pack` pack choices (loaded from DB at register time).
 */
function getCommandDefinitions(context = {}) {
    return commandModules
        .map((command) => buildCommandDefinition(command, context))
        .map((command) => command.toJSON());
}

module.exports = {
    commandHandlers,
    buttonHandlers,
    getCommandDefinitions,
};
