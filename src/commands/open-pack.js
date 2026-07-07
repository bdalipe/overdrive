const {
    buildPaginatedPayload,
    handlePaginationInteraction,
} = require('../interactions/pagination');
const {
    buildPackCardEmbed,
    buildPackSummaryEmbed,
    buildRevealPages,
    isPackSummaryPage,
} = require('../renderers/pack-reveal');
const logger = require('../shared/logger');
const { applyReachableImageUrls } = require('../shared/image-url');

// Button custom IDs omit hyphens; slash command name is `open-pack`.
const PAGINATION_PREFIX = 'openpack';
const SESSION_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { pages: object[], payloads: object[], expiresAt: number }>} */
const sessions = new Map();

function setSession(userId, session) {
    sessions.set(userId, {
        ...session,
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

function createBuildPageEmbed(packSlug, cards) {
    const totalCards = cards.length;

    return (pageData, currentPage) => {
        if (isPackSummaryPage(pageData)) {
            return buildPackSummaryEmbed(cards, { packSlug });
        }

        return buildPackCardEmbed(pageData, { currentPage, totalCards, packSlug });
    };
}

function buildRevealPayloads(cards, packSlug) {
    const pages = buildRevealPages(cards);
    const buildPageEmbed = createBuildPageEmbed(packSlug, cards);
    const totalPages = pages.length;
    const payloads = [];

    for (let page = 1; page <= totalPages; page += 1) {
        payloads.push(
            buildPaginatedPayload({
                pages,
                currentPage: page,
                customIdPrefix: PAGINATION_PREFIX,
                buildPageEmbed,
                enableSkip: true,
            }),
        );
    }

    return { pages, payloads };
}

async function execute(interaction, config) {
    await interaction.deferReply();

    const result = await config.services.packs.generatePack({
        userId: interaction.user.id,
    });

    const cards = await applyReachableImageUrls(result.cards);
    const droppedImages = result.cards.filter(
        (car, index) => car.image_url && !cards[index].image_url,
    );

    if (droppedImages.length > 0) {
        logger.warn('pack_reveal_image_unreachable', {
            userId: interaction.user.id,
            packSlug: result.packSlug,
            carIds: droppedImages.map((car) => car.id),
        });
    }

    const { pages, payloads } = buildRevealPayloads(cards, result.packSlug);

    setSession(interaction.user.id, {
        pages,
        payloads,
        packSlug: result.packSlug,
    });

    logger.info('pack_opened', {
        userId: interaction.user.id,
        packId: result.packId,
        packSlug: result.packSlug,
        packSize: result.packSize,
    });

    await interaction.editReply(payloads[0]);
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
        pages: session.pages,
        customIdPrefix: PAGINATION_PREFIX,
        enableSkip: true,
        getPayload: (page) => session.payloads[page - 1],
    });
}

module.exports = {
    name: 'open-pack',
    description: 'Open a pack and reveal your cards',
    paginationPrefix: PAGINATION_PREFIX,
    execute,
    handleButton,
};
