const { randomInt } = require('crypto');

/** Inclusive bounds for all car and pack serial ids. */
const SERIAL_MIN = 100000;
const SERIAL_MAX = 999999;

/** Reserved pack id for the default pack (seeded in migrations). Never assigned by this module. */
const RESERVED_DEFAULT_PACK_ID = 100000;

const ASSIGNABLE_MIN = RESERVED_DEFAULT_PACK_ID + 1;
const DEFAULT_MAX_ATTEMPTS = 20;

/**
 * Return a random 6-digit serial in 100001–999999 (excludes reserved default pack id).
 * Does not check the database; use generateSerialId when collisions must be avoided.
 */
function randomSerialId() {
    return randomInt(ASSIGNABLE_MIN, SERIAL_MAX + 1);
}

/**
 * Allocate a free serial id, retrying when `exists` reports a collision.
 *
 * @param {object} options
 * @param {(id: number) => boolean | Promise<boolean>} options.exists
 *   Return true if the id is already taken (or otherwise unusable).
 * @param {number} [options.maxAttempts=20]
 * @returns {Promise<number>}
 */
async function generateSerialId({ exists, maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
    if (typeof exists !== 'function') {
        throw new Error('generateSerialId requires an exists(id) function for collision checks');
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const id = randomSerialId();
        const taken = await exists(id);
        if (!taken) {
            return id;
        }
    }

    throw new Error(`Failed to allocate a free serial id after ${maxAttempts} attempts`);
}

module.exports = {
    SERIAL_MIN,
    SERIAL_MAX,
    RESERVED_DEFAULT_PACK_ID,
    randomSerialId,
    generateSerialId,
};
