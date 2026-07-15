const logger = require('../../src/shared/logger');
const { logConfigChange } = require('../../src/services/config-change-events');

/**
 * Audit after a successful delete. On failure, log deleted_but_unaudited and throw
 * a recovery-oriented error (data already gone; do not re-delete).
 *
 * @param {object} configChangeRepository
 * @param {object} event
 * @param {{ summary: string, entityType: string, [key: string]: unknown }} deletedContext
 */
async function logConfigChangeAfterDelete(configChangeRepository, event, deletedContext) {
    try {
        await logConfigChange(configChangeRepository, event);
    } catch (error) {
        logger.error('deleted_but_unaudited', {
            ...deletedContext,
            source: event.source,
            entityType: event.entityType,
            action: event.action,
            error: error.message,
        });

        throw new Error(
            `Deleted but unaudited (${deletedContext.summary}): ${error.message}. ` +
                'Data is already gone; fix config_change_events write access. ' +
                'Do not re-run delete for the same ids/slugs — the audit trail is incomplete.',
        );
    }
}

module.exports = {
    logConfigChangeAfterDelete,
};
