const {
    buildPaginatedPayload,
    handlePaginationInteraction,
} = require('../../interactions/pagination');
const {
    buildLatencyDebugEmbed,
    buildLatencyReferenceEmbed,
} = require('../../renderers/embeds');
const {
    getProbeCacheTtlMs,
    getProbeTimeoutMs,
    isImageProbeForced,
} = require('../../shared/image-url');
const { LATENCY_WARN_MS } = require('../../shared/metrics');

const PAGINATION_PREFIX = 'debuglatency';
const SESSION_TTL_MS = 15 * 60 * 1000;
const TOTAL_PAGES = 2;

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

async function probeDatabase(repositories) {
    const startedAt = Date.now();

    try {
        await repositories.packs.findDefault();
        return {
            dbRoundTripMs: Date.now() - startedAt,
            dbError: null,
        };
    } catch (error) {
        return {
            dbRoundTripMs: Date.now() - startedAt,
            dbError: error.message,
        };
    }
}

function buildLatencyPages(metrics) {
    return [
        { type: 'metrics', metrics },
        { type: 'reference' },
    ];
}

function createBuildPageEmbed() {
    return (pageData, currentPage, totalPages) => {
        const footer = { text: `Page ${currentPage} of ${totalPages}` };

        if (pageData.type === 'metrics') {
            return buildLatencyDebugEmbed(pageData.metrics).setFooter(footer);
        }

        return buildLatencyReferenceEmbed().setFooter(footer);
    };
}

function buildLatencyPayloads(metrics) {
    const pages = buildLatencyPages(metrics);
    const buildPageEmbed = createBuildPageEmbed();
    const payloads = [];

    for (let page = 1; page <= TOTAL_PAGES; page += 1) {
        payloads.push(
            buildPaginatedPayload({
                pages,
                currentPage: page,
                customIdPrefix: PAGINATION_PREFIX,
                buildPageEmbed,
            }),
        );
    }

    return { pages, payloads };
}

async function execute(interaction, config) {
    const startedAt = Date.now();
    const interactionAgeMs = startedAt - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    await interaction.deferReply({ ephemeral: true });
    const ackMs = Date.now() - startedAt;

    const { dbRoundTripMs, dbError } = await probeDatabase(config.repositories);
    const handlerMs = Date.now() - startedAt;

    const metrics = {
        botEnv: config.botEnv,
        wsPing,
        interactionAgeMs,
        ackMs,
        dbRoundTripMs,
        dbError,
        handlerMs,
        latencyWarnMs: LATENCY_WARN_MS,
        imageProbeTimeoutMs: getProbeTimeoutMs(),
        imageProbeCacheTtlMs: getProbeCacheTtlMs(),
        imageProbeForced: isImageProbeForced(),
    };

    const { pages, payloads } = buildLatencyPayloads(metrics);

    setSession(interaction.user.id, { pages, payloads });

    await interaction.editReply(payloads[0]);
}

async function handleButton(interaction, _config) {
    const openerId = interaction.message?.interaction?.user?.id ?? interaction.user.id;
    const session = getSession(openerId);

    if (!session) {
        await interaction.reply({
            content: 'This latency report has expired. Run `/admin debug-latency` again.',
            ephemeral: true,
        });
        return;
    }

    await handlePaginationInteraction(interaction, {
        pages: session.pages,
        customIdPrefix: PAGINATION_PREFIX,
        getPayload: (page) => session.payloads[page - 1],
    });
}

module.exports = {
    paginationPrefix: PAGINATION_PREFIX,
    execute,
    handleButton,
};
