const DEFAULT_TTL_MS = 60_000;

function createPackConfigCache({ ttlMs = DEFAULT_TTL_MS } = {}) {
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    const entries = new Map();
    /** @type {Map<string, Promise<unknown>>} */
    const inflight = new Map();

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

    /**
     * Return cached value, join an in-flight load for `key`, or start `loader`.
     * Concurrent misses share one Promise (coalesce) to avoid a thundering herd.
     */
    async function getOrLoad(key, loader) {
        const cached = get(key);
        if (cached !== undefined) {
            return cached;
        }

        const existing = inflight.get(key);
        if (existing) {
            return existing;
        }

        const promise = Promise.resolve()
            .then(() => loader())
            .then((value) => {
                // Skip set if invalidate/clear dropped this promise mid-flight.
                if (inflight.get(key) === promise) {
                    set(key, value);
                    inflight.delete(key);
                }

                return value;
            })
            .catch((error) => {
                if (inflight.get(key) === promise) {
                    inflight.delete(key);
                }

                throw error;
            });

        inflight.set(key, promise);
        return promise;
    }

    function invalidate(key) {
        entries.delete(key);
        inflight.delete(key);
    }

    function invalidatePrefix(prefix) {
        for (const key of [...entries.keys()]) {
            if (key.startsWith(prefix)) {
                entries.delete(key);
            }
        }

        for (const key of [...inflight.keys()]) {
            if (key.startsWith(prefix)) {
                inflight.delete(key);
            }
        }
    }

    function invalidatePack(packId) {
        invalidate(`pack:${packId}`);
        invalidate(`pack:default`);
        invalidate(`config:${packId}`);
    }

    function clear() {
        entries.clear();
        inflight.clear();
    }

    return {
        get,
        set,
        getOrLoad,
        invalidate,
        invalidatePrefix,
        invalidatePack,
        clear,
        ttlMs,
    };
}

module.exports = {
    DEFAULT_TTL_MS,
    createPackConfigCache,
};
