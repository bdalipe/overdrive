const { SlashCommandBuilder } = require('discord.js');
const hello = require('./hello');
const openPack = require('./open-pack');

const commandDefinitions = [
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Say hello to Overdrive!'),
    new SlashCommandBuilder()
        .setName('open-pack')
        .setDescription('Open a pack and reveal your cards'),
];

const commandHandlers = new Map([
    [hello.name, hello],
    [openPack.name, openPack],
]);

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
