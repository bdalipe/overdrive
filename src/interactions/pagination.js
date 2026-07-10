const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const {
    PACK_OWNERSHIP_DENIED_MESSAGE,
    USER_ERROR_MESSAGE,
} = require('../shared/errors');
const logger = require('../shared/logger');

const CUSTOM_ID_PATTERN = /^(?<prefix>[^:]+):(?<action>prev|next|skip):(?<page>\d+)$/;

function buildPaginationButtons(customIdPrefix, currentPage, totalPages, { enableSkip = false } = {}) {
    const components = [
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
    ];

    if (enableSkip) {
        const onSummaryPage = currentPage >= totalPages;
        components.push(
            new ButtonBuilder()
                .setCustomId(`${customIdPrefix}:skip:${currentPage}`)
                .setLabel('Skip')
                .setStyle(ButtonStyle.Success)
                .setDisabled(onSummaryPage),
        );
    }

    return new ActionRowBuilder().addComponents(components);
}

function buildPaginatedPayload({
    pages,
    currentPage,
    customIdPrefix,
    buildPageEmbed,
    enableSkip = false,
}) {
    const totalPages = pages.length;
    const safePage = Math.max(1, Math.min(currentPage, totalPages));
    const embed = buildPageEmbed(pages[safePage - 1], safePage, totalPages);

    return {
        embeds: [embed],
        components: [buildPaginationButtons(customIdPrefix, safePage, totalPages, { enableSkip })],
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

    if (action === 'skip') {
        return totalPages;
    }

    return currentPage;
}

async function handlePaginationInteraction(interaction, {
    pages,
    customIdPrefix,
    buildPageEmbed,
    enableSkip = false,
    getPayload,
}) {
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
    const payload = getPayload
        ? getPayload(newPage)
        : buildPaginatedPayload({
            pages,
            currentPage: newPage,
            customIdPrefix,
            buildPageEmbed,
            enableSkip,
        });

    await interaction.update(payload);
}

module.exports = {
    buildPaginatedPayload,
    buildPaginationButtons,
    handlePaginationInteraction,
    matchesPaginationPrefix,
    resolvePageFromButton,
};
