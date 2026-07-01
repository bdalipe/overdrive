const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    PACK_OWNERSHIP_DENIED_MESSAGE,
    USER_ERROR_MESSAGE,
} = require('../shared/errors');
const logger = require('../shared/logger');

const CUSTOM_ID_PATTERN = /^(?<prefix>[^:]+):(?<action>prev|next):(?<page>\d+)$/;

function buildPaginationButtons(customIdPrefix, currentPage, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}:prev:${currentPage}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage <= 1),
        new ButtonBuilder()
            .setCustomId(`${customIdPrefix}:next:${currentPage}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage >= totalPages),
    );
}

function buildPaginatedPayload({ pages, currentPage, customIdPrefix, buildPageEmbed }) {
    const totalPages = pages.length;
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const embed = buildPageEmbed(pages[safePage - 1], safePage, totalPages);

    return {
        embeds: [embed],
        components: [buildPaginationButtons(customIdPrefix, safePage, totalPages)],
    };
}

function parsePaginationCustomId(customId) {
    const match = customId.match(CUSTOM_ID_PATTERN);
    if (!match?.groups) {
        return null;
    }

    return {
        prefix: match.groups.prefix,
        action: match.groups.action,
        page: Number.parseInt(match.groups.page, 10),
    };
}

function matchesPaginationPrefix(customId, prefix) {
    return customId.startsWith(`${prefix}:`);
}

function resolvePageFromButton(action, currentPage, totalPages) {
    if (action === 'prev') {
        return Math.max(1, currentPage - 1);
    }

    if (action === 'next') {
        return Math.min(totalPages, currentPage + 1);
    }

    return currentPage;
}

async function handlePaginationInteraction(interaction, { pages, customIdPrefix, buildPageEmbed }) {
    const parsed = parsePaginationCustomId(interaction.customId);
    if (!parsed || parsed.prefix !== customIdPrefix) {
        logger.warn('pagination_parse_failed', {
            customId: interaction.customId,
            customIdPrefix,
        });
        await interaction.reply({
            content: USER_ERROR_MESSAGE,
            ephemeral: true,
        });
        return;
    }

    const openerId = interaction.message?.interaction?.user?.id;
    if (openerId && openerId !== interaction.user.id) {
        await interaction.reply({
            content: PACK_OWNERSHIP_DENIED_MESSAGE,
            ephemeral: true,
        });
        return;
    }

    const totalPages = pages.length;
    const newPage = resolvePageFromButton(parsed.action, parsed.page, totalPages);
    const payload = buildPaginatedPayload({
        pages,
        currentPage: newPage,
        customIdPrefix,
        buildPageEmbed,
    });

    await interaction.update(payload);
}

module.exports = {
    buildPaginatedPayload,
    handlePaginationInteraction,
    matchesPaginationPrefix,
};
