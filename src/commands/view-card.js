const { SlashCommandBuilder } = require('discord.js');
const { buildViewCardEmbed } = require('../renderers/view-card');
const { formatPackRevealTitle } = require('../renderers/card-display');
const { applyReachableImageUrls } = require('../shared/image-url');
const logger = require('../shared/logger');

const SIX_DIGIT_ID = /^\d{6}$/;
const AUTOCOMPLETE_MAX_CHOICES = 25;

const INVALID_ID_MESSAGE =
    'Oops! Please choose from the list of cards or enter the ID directly.';

const NOT_FOUND_MESSAGE = 'Oops! We couldn\'t find a card with that ID.';

function buildDefinition() {
    return new SlashCommandBuilder()
        .setName('view-card')
        .setDescription('Look up a car card from the catalog')
        .addStringOption((option) =>
            option
                .setName('card')
                .setDescription('6-digit card ID')
                .setRequired(true)
                .setAutocomplete(true),
        );
}

function truncateChoiceName(text, maxLength = 100) {
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 1)}…`;
}

function isSixDigitCardId(value) {
    return SIX_DIGIT_ID.test((value ?? '').trim());
}

/**
 * Baseline autocomplete for discovery testing: substring match on id/title, catalog id order, max 25.
 * No relevance ranking yet — informs how much discovery logic to add later.
 */
async function handleAutocomplete(interaction, config) {
    const focused = interaction.options.getFocused().trim().toLowerCase();
    const cars = await config.services.catalogPool.getAllCars();

    const filtered = focused
        ? cars.filter((car) => {
            const id = String(car.id);
            const title = formatPackRevealTitle(car).toLowerCase();
            return id.includes(focused) || title.includes(focused);
        })
        : cars;

    const choices = filtered.slice(0, AUTOCOMPLETE_MAX_CHOICES).map((car) => ({
        name: truncateChoiceName(formatPackRevealTitle(car)),
        value: String(car.id),
    }));

    await interaction.respond(choices);
}

async function prepareCarForDisplay(car) {
    const [prepared] = await applyReachableImageUrls([car]);

    if (car.image_url && !prepared.image_url) {
        logger.warn('view_card_image_unreachable', { carId: car.id });
    }

    return prepared;
}

async function execute(interaction, config) {
    const query = interaction.options.getString('query', true).trim();

    if (!isSixDigitCardId(query)) {
        await interaction.reply({
            content: INVALID_ID_MESSAGE,
            ephemeral: true,
        });
        return;
    }

    const car = await config.repositories.cars.findById(Number(query));

    if (!car) {
        await interaction.reply({
            content: NOT_FOUND_MESSAGE,
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply();

    const prepared = await prepareCarForDisplay(car);
    const embed = buildViewCardEmbed(prepared);

    await interaction.editReply({ embeds: [embed] });

    logger.info('view_card_shown', {
        userId: interaction.user.id,
        carId: car.id,
        query,
    });
}

module.exports = {
    name: 'view-card',
    description: 'Look up a car card from the catalog',
    buildDefinition,
    execute,
    handleAutocomplete,
};
