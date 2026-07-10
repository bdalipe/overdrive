const DEFAULT_TTL_MS = 60_000;

function createPackConfigCache({ ttlMs = DEFAULT_TTL_MS } = {}) {
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    const entries = new Map();

    function get(key) {
        const entry = entries.get(key);
        if (!entry) {
            return undefined;
        }

        if (Date.now() >= entry.expiresAt) {
            entries.delete(key);
            return undefined;
        }

        return entry.value;
    }

    function set(key, value) {
        entries.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }

    async function getOrLoad(key, loader) {
        const cached = get(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await loader();
        set(key, value);
        return value;
    }

    function invalidate(key) {
        entries.delete(key);
    }

    function invalidatePack(packId) {
        invalidate(`pack:${packId}`);
        invalidate(`pack:default`);
        invalidate(`config:${packId}`);
    }

    function clear() {
        entries.clear();
    }

    return {
        get,
        set,
        getOrLoad,
        invalidate,
        invalidatePack,
        clear,
        ttlMs,
    };
}

module.exports = {
    DEFAULT_TTL_MS,
    createPackConfigCache,
};
