const { SlashCommandBuilder } = require('discord.js');
const hello = require('./hello');

const commandDefinitions = [
    new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Say hello to Overdrive!'),
];

const commandHandlers = new Map([[hello.name, hello]]);

function getCommandHandlers() {
    return commandHandlers;
}

function getCommandDefinitions() {
    return commandDefinitions.map((command) => command.toJSON());
}

module.exports = {
    getCommandHandlers,
    getCommandDefinitions,
};
