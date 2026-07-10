const { EmbedBuilder } = require('discord.js');
const { EMBED_COLOR_PRIMARY } = require('../shared/theme');

/**
 * Lightweight Discord embed builders for simple or admin/diagnostic commands
 * (`/hello`, `/admin debug-latency` ping/timing probes, etc.).
 * Pack reveal uses `pack-reveal.js`; composed cards use `renderers/card/` (Phase 3+).
 */

function formatMs(value) {
    if (value == null || !Number.isFinite(value) || value < 0) {
        return '—';
    }

    return `${Math.round(value)} ms`;
}

function formatDurationLabel(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
        return '—';
    }

    if (ms >= 60_000) {
        return `${Math.round(ms / 60_000)} min`;
    }

    return formatMs(ms);
}

function buildHelloEmbed(botEnv) {
    return new EmbedBuilder()
        .setTitle('Overdrive!')
        .setDescription('Welcome — the bot is online and ready.')
        .setColor(EMBED_COLOR_PRIMARY)
        .addFields({
            name: 'Environment',
            value: botEnv,
            inline: true,
        });
}

function buildLatencyDebugEmbed({
    botEnv,
    wsPing,
    interactionAgeMs,
    ackMs,
    dbRoundTripMs,
    dbError,
    handlerMs,
    latencyWarnMs,
    imageProbeTimeoutMs,
    imageProbeCacheTtlMs,
    imageProbeForced,
}) {
    const dbValue = dbError
        ? `Failed after ${formatMs(dbRoundTripMs)}: ${dbError}`
        : formatMs(dbRoundTripMs);

    const probeParts = [
        `${formatMs(imageProbeTimeoutMs)} timeout`,
        `${formatDurationLabel(imageProbeCacheTtlMs)} cache`,
    ];

    if (imageProbeForced) {
        probeParts.push('forced probe');
    }

    return new EmbedBuilder()
        .setTitle('Latency diagnostics')
        .setDescription('Bot ping, interaction timings, and a Supabase read probe.')
        .setColor(EMBED_COLOR_PRIMARY)
        .addFields(
            { name: 'Environment', value: botEnv, inline: true },
            { name: 'WebSocket ping', value: formatMs(wsPing), inline: true },
            { name: 'Interaction age', value: formatMs(interactionAgeMs), inline: true },
            { name: 'Ack (defer)', value: formatMs(ackMs), inline: true },
            { name: 'DB round-trip', value: dbValue, inline: true },
            { name: 'Handler total', value: formatMs(handlerMs), inline: true },
            { name: 'Warn threshold', value: formatMs(latencyWarnMs), inline: true },
            {
                name: 'Image probe',
                value: probeParts.join(' · '),
                inline: false,
            },
        )
        .setTimestamp();
}

function buildLatencyReferenceEmbed() {
    return new EmbedBuilder()
        .setTitle('Latency diagnostics — reference')
        .setDescription('How to read page 1 metrics and related console logs.')
        .setColor(EMBED_COLOR_PRIMARY)
        .addFields(
            {
                name: 'WebSocket ping vs interaction',
                value:
                    '**WS ping** — ongoing gateway heartbeat RTT; a connection-health snapshot, not tied to this command.\n'
                    + '**Interaction timings** — per-command: age, ack, DB, and handler total.',
                inline: false,
            },
            {
                name: 'Interaction age vs Ack (defer)',
                value:
                    '**Age** — Discord created the interaction → your handler started (gateway delivery, event-loop queue).\n'
                    + '**Ack** — handler started → `deferReply()` finished (includes the defer API round-trip). Age ends where ack begins.',
                inline: false,
            },
            {
                name: 'Console `durationMs` vs Handler total',
                value:
                    'The `response_sent` log measures router entry → `execute()` return, so it includes defer, DB, embed build, **and** `editReply`.\n'
                    + '**Handler total** stops before `editReply`, so console duration is usually higher.',
                inline: false,
            },
            {
                name: 'High WS ping + high Ack',
                value: 'Discord connection is sluggish; defer and other API calls are likely slow too.',
                inline: false,
            },
            {
                name: 'Normal WS ping + high interaction age',
                value: 'The event reached your handler late — busy event loop, CPU spike, or blocking work elsewhere.',
                inline: false,
            },
            {
                name: 'Normal WS ping + high Ack, low age',
                value: 'Handler picked up the interaction quickly, but the defer API call itself was slow.',
                inline: false,
            },
            {
                name: 'Low ping / age / ack, high DB',
                value: 'Connection and Discord path look fine; Supabase is the bottleneck.',
                inline: false,
            },
        );
}

module.exports = {
    buildHelloEmbed,
    buildLatencyDebugEmbed,
    buildLatencyReferenceEmbed,
};
