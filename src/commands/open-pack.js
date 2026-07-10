const { SlashCommandBuilder } = require('discord.js');
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
const { buildPackOpenStatsEvents } = require('../services/pack-stats-events');

// Button custom IDs omit hyphens; slash command name is `open-pack`.
const PAGINATION_PREFIX = 'openpack';
const SESSION_TTL_MS = 15 * 60 * 1000;
/** Discord allows at most 25 choices on a string option. */
const MAX_PACK_CHOICES = 25;

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

async function insertPackOpenStats(statsRepository, statsEvents, logContext) {
    try {
        await statsRepository.insertEvents(statsEvents);
    } catch (error) {
        logger.error('pack_stats_insert_failed', {
            ...logContext,
            error: error.message,
        });
    }
}

function sortActivePacks(packs) {
    return [...packs].sort((a, b) => {
        if (a.is_default !== b.is_default) {
            return a.is_default ? -1 : 1;
        }

        return String(a.name).localeCompare(String(b.name));
    });
}

function buildPackChoices(activePacks) {
    const packs = sortActivePacks(activePacks).slice(0, MAX_PACK_CHOICES);

    if (packs.length === 0) {
        return [{ name: 'Standard Pack', value: 'default' }];
    }

    const usedValues = new Set();
    const choices = [];

    for (const pack of packs) {
        const value = String(pack.slug).slice(0, 100);

        if (usedValues.has(value)) {
            continue;
        }

        usedValues.add(value);

        const name = pack.is_default
            ? `${pack.name} (default)`
            : String(pack.name);

        choices.push({
            name: name.slice(0, 100),
            value,
        });
    }

    return choices;
}

/**
 * Builds `/open-pack` with a required `pack` choice list (same picker UX as
 * picking an `/admin` subcommand — Discord shows a fixed dropdown of options).
 * Choices are loaded from active packs at `register-commands` time.
 */
function buildDefinition({ activePacks = [] } = {}) {
    const choices = buildPackChoices(activePacks);

    return new SlashCommandBuilder()
        .setName('open-pack')
        .setDescription('Open a pack and reveal your cards')
        .addStringOption((option) =>
            option
                .setName('pack')
                .setDescription('Which pack to open')
                .setRequired(true)
                .addChoices(...choices),
        );
}

async function execute(interaction, config) {
    const slug = interaction.options.getString('pack', true);

    await interaction.deferReply();

    const pack = await config.repositories.packs.findBySlug(slug);

    if (!pack || !pack.is_active) {
        await interaction.editReply({
            content:
                `Unknown or inactive pack: \`${slug}\`. `
                + 'If you recently added packs, run `npm run register-commands` again.',
        });
        return;
    }

    const result = await config.services.packs.generatePack({
        userId: interaction.user.id,
        packId: pack.id,
    });

    const statsContext = {
        userId: interaction.user.id,
        packId: result.packId,
        packSlug: result.packSlug,
    };

    const [, cards] = await Promise.all([
        insertPackOpenStats(
            config.repositories.stats,
            buildPackOpenStatsEvents({
                userId: interaction.user.id,
                packId: result.packId,
                packSlug: result.packSlug,
                packSize: result.packSize,
                cards: result.cards,
            }),
            statsContext,
        ),
        applyReachableImageUrls(result.cards),
    ]);

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
    buildDefinition,
    execute,
    handleButton,
};
