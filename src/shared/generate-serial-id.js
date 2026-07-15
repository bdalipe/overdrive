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
 * Does not check the database; use generateSerialId / generateSerialIds when collisions must be avoided.
 */
function randomSerialId() {
    return randomInt(ASSIGNABLE_MIN, SERIAL_MAX + 1);
}

/**
 * Pick a free serial, add it to `taken`, and return it.
 * Prefer generateSerialIds for batches; this is the shared claim step.
 *
 * @param {Set<number>} taken
 * @param {{ maxAttempts?: number }} [options]
 * @returns {number}
 */
function claimSerialId(taken, { maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
    if (!(taken instanceof Set)) {
        throw new Error('claimSerialId requires a Set of taken ids');
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const id = randomSerialId();

        if (!taken.has(id)) {
            taken.add(id);
            return id;
        }
    }

    throw new Error(`Failed to allocate a free serial id after ${maxAttempts} attempts`);
}

/**
 * Allocate `count` unique serials against an in-memory taken set (mutated).
 * Load DB ids into `taken` once before calling to avoid per-id round-trips.
 *
 * @param {number} count
 * @param {object} options
 * @param {Set<number>} options.taken
 * @param {number} [options.maxAttempts=20]
 * @returns {number[]}
 */
function generateSerialIds(count, { taken, maxAttempts = DEFAULT_MAX_ATTEMPTS } = {}) {
    if (!Number.isInteger(count) || count < 0) {
        throw new Error('generateSerialIds requires a non-negative integer count');
    }

    if (!(taken instanceof Set)) {
        throw new Error('generateSerialIds requires taken: Set');
    }

    const ids = [];

    for (let i = 0; i < count; i += 1) {
        ids.push(claimSerialId(taken, { maxAttempts }));
    }

    return ids;
}

/**
 * Allocate a free serial id.
 * Prefer `{ taken: Set }` when the caller already loaded existing ids (batch-safe).
 * Pass `{ exists }` for one-off DB checks (e.g. single pack create).
 *
 * @param {object} options
 * @param {Set<number>} [options.taken] - mutated; claimed id is added
 * @param {(id: number) => boolean | Promise<boolean>} [options.exists]
 *   Return true if the id is already taken (or otherwise unusable).
 * @param {number} [options.maxAttempts=20]
 * @returns {Promise<number>}
 */
async function generateSerialId({
    exists,
    taken,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
} = {}) {
    if (taken instanceof Set) {
        return claimSerialId(taken, { maxAttempts });
    }

    if (typeof exists !== 'function') {
        throw new Error(
            'generateSerialId requires exists(id) or taken: Set for collision checks',
        );
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const id = randomSerialId();
        const isTaken = await exists(id);

        if (!isTaken) {
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
    claimSerialId,
    generateSerialIds,
    generateSerialId,
};
