const logger = require('../shared/logger');

const MAINTAINER_SYSTEM_ACTOR = 'system:maintainer';

function resolveMaintainerActorId(config = {}) {
    return config.maintainerDiscordUserId
        ?? process.env.MAINTAINER_DISCORD_USER_ID
        ?? MAINTAINER_SYSTEM_ACTOR;
}

function buildCarCatalogImportEvent({
    actorId,
    dropId,
    filename,
    carIds,
}) {
    return {
        actorId,
        source: 'import-cars',
        entityType: 'car',
        action: 'upsert_drop',
        payload: {
            dropId,
            filename,
            carIds,
            count: carIds.length,
        },
    };
}

function buildPackCatalogImportEvent({
    actorId,
    dropId,
    filename,
    packId,
    packSlug,
    action,
    before,
    after,
}) {
    const payload = {
        dropId,
        filename,
        packId,
        packSlug,
    };

    if (before != null) {
        payload.before = before;
    }

    if (after != null) {
        payload.after = after;
    }

    return {
        actorId,
        source: 'import-packs',
        entityType: 'pack',
        action,
        payload,
    };
}

async function logConfigChange(configChangeRepository, event) {
    try {
        await configChangeRepository.insert(event);
    } catch (error) {
        logger.error('config_change_insert_failed', {
            source: event.source,
            entityType: event.entityType,
            action: event.action,
            error: error.message,
        });
    }
}

module.exports = {
    MAINTAINER_SYSTEM_ACTOR,
    resolveMaintainerActorId,
    buildCarCatalogImportEvent,
    buildPackCatalogImportEvent,
    logConfigChange,
};
