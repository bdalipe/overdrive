const { DEFAULT_TTL_MS } = require('../../src/services/pack-config-cache');

/**
 * Scripts create their own services Map — invalidate* does not reach the live bot.
 * Call after catalog mutations that would affect a running bot's in-memory cache.
 */
function logBotCacheRefreshHint(logger, { scope, affected } = {}) {
    logger.warn('bot_cache_refresh_hint', {
        scope,
        affected: affected ?? 'pack-config-and-or-car-pool',
        packConfigCacheTtlMs: DEFAULT_TTL_MS,
        message:
            'In-process invalidate does not clear the running bot. Restart the bot, run /admin clear-cache, or wait for pack-config cache TTL so opens load fresh data.',
    });
}

module.exports = {
    logBotCacheRefreshHint,
};
