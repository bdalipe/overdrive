const {
    buildPaginatedPayload,
    handlePaginationInteraction,
} = require('../interactions/pagination');
const { buildOpenPackEmbed } = require('../renderers/embeds');

const PAGINATION_PREFIX = 'openpack';
const TOTAL_SLOTS = 5;

const PLACEHOLDER_PAGES = Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
    slot: index + 1,
}));

function buildPageEmbed(_page, currentPage, totalPages) {
    return buildOpenPackEmbed({ slot: currentPage, totalSlots: totalPages });
}

function buildOpenPackPayload(currentPage) {
    return buildPaginatedPayload({
        pages: PLACEHOLDER_PAGES,
        currentPage,
        customIdPrefix: PAGINATION_PREFIX,
        buildPageEmbed,
    });
}

async function execute(interaction) {
    await interaction.reply(buildOpenPackPayload(1));
}

async function handleButton(interaction) {
    await handlePaginationInteraction(interaction, {
        pages: PLACEHOLDER_PAGES,
        customIdPrefix: PAGINATION_PREFIX,
        buildPageEmbed,
    });
}

module.exports = {
    name: 'open-pack',
    paginationPrefix: PAGINATION_PREFIX,
    execute,
    handleButton,
};
