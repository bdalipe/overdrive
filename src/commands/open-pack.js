const {
    buildPaginatedPayload,
    handlePaginationInteraction,
} = require('../interactions/pagination');
const { buildPackCardEmbed } = require('../renderers/pack-reveal');
const logger = require('../shared/logger');

// Button custom IDs omit hyphens; slash command name is `open-pack`.
const PAGINATION_PREFIX = 'openpack';
const SESSION_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { cards: object[], packSlug: string, expiresAt: number }>} */
const sessions = new Map();

function setSession(userId, { cards, packSlug }) {
    sessions.set(userId, {
        cards,
        packSlug,
        expiresAt: Date.now() + SESSION_TTL_MS,
    });
}

function getSession(userId) {
    const session = sessions.get(userId);
    if (!session) {
        return null;
    }

    if (Date.now() > session.expiresAt) {
        sessions.delete(userId);
        return null;
    }

    return session;
}

function createBuildPageEmbed(packSlug) {
    return (car, currentPage, totalPages) =>
        buildPackCardEmbed(car, { currentPage, totalPages, packSlug });
}

function buildOpenPackPayload(cards, packSlug, currentPage) {
    return buildPaginatedPayload({
        pages: cards,
        currentPage,
        customIdPrefix: PAGINATION_PREFIX,
        buildPageEmbed: createBuildPageEmbed(packSlug),
    });
}

async function execute(interaction, config) {
    await interaction.deferReply();

    const result = await config.services.packs.generatePack({
        userId: interaction.user.id,
    });

    setSession(interaction.user.id, {
        cards: result.cards,
        packSlug: result.packSlug,
    });

    logger.info('pack_opened', {
        userId: interaction.user.id,
        packId: result.packId,
        packSlug: result.packSlug,
        packSize: result.packSize,
    });

    await interaction.editReply(buildOpenPackPayload(result.cards, result.packSlug, 1));
}

async function handleButton(interaction, _config) {
    const openerId = interaction.message?.interaction?.user?.id ?? interaction.user.id;
    const session = getSession(openerId);

    if (!session) {
        await interaction.reply({
            content: 'This pack reveal has expired. Run `/open-pack` again.',
            ephemeral: true,
        });
        return;
    }

    await handlePaginationInteraction(interaction, {
        pages: session.cards,
        customIdPrefix: PAGINATION_PREFIX,
        buildPageEmbed: createBuildPageEmbed(session.packSlug),
    });
}

module.exports = {
    name: 'open-pack',
    description: 'Open a pack and reveal your cards',
    paginationPrefix: PAGINATION_PREFIX,
    execute,
    handleButton,
};
