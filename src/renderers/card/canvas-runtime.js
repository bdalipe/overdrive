const logger = require('../../shared/logger');

/**
 * Load Skia canvas and prove a 1×1 surface works. Failures are logged; the bot stays up.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function initCanvas() {
    try {
        const { createCanvas } = require('@napi-rs/canvas');
        const canvas = createCanvas(1, 1);
        canvas.getContext('2d');
        logger.info('canvas_ready');
        return { ok: true };
    } catch (error) {
        logger.warn('canvas_unavailable', {
            error: error.message,
        });
        return { ok: false, error: error.message };
    }
}

module.exports = {
    initCanvas,
};
