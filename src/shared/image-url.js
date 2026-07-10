const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

const SUPABASE_PUBLIC_STORAGE_PATH = '/storage/v1/object/public/';

/** @type {Map<string, { reachable: boolean, expiresAt: number }>} */
const reachabilityCache = new Map();

function isImageProbeForced() {
    const value = process.env.IMAGE_PROBE_FORCE;
    return value === '1' || value === 'true';
}

function resolveTimeoutMs(override) {
    if (override != null) {
        return override;
    }

    const fromEnv = Number.parseInt(process.env.IMAGE_PROBE_TIMEOUT_MS ?? '', 10);
    if (Number.isFinite(fromEnv) && fromEnv > 0) {
        return fromEnv;
    }

    return DEFAULT_TIMEOUT_MS;
}

function resolveCacheTtlMs(override) {
    if (override != null) {
        return override;
    }

    const fromEnv = Number.parseInt(process.env.IMAGE_PROBE_CACHE_TTL_MS ?? '', 10);
    if (Number.isFinite(fromEnv) && fromEnv > 0) {
        return fromEnv;
    }

    return DEFAULT_CACHE_TTL_MS;
}

function isImageContentType(contentType) {
    if (!contentType) {
        return true;
    }

    return contentType.split(';')[0].trim().toLowerCase().startsWith('image/');
}

function isTrustedSupabaseStorageUrl(imageUrl) {
    try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== 'https:') {
            return false;
        }

        if (!parsed.pathname.includes(SUPABASE_PUBLIC_STORAGE_PATH)) {
            return false;
        }

        return parsed.hostname.endsWith('.supabase.co');
    } catch {
        return false;
    }
}

function getCachedReachability(imageUrl) {
    const entry = reachabilityCache.get(imageUrl);
    if (!entry) {
        return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
        reachabilityCache.delete(imageUrl);
        return undefined;
    }

    return entry.reachable;
}

function setCachedReachability(imageUrl, reachable, cacheTtlMs) {
    reachabilityCache.set(imageUrl, {
        reachable,
        expiresAt: Date.now() + cacheTtlMs,
    });
}

function clearImageUrlCache() {
    reachabilityCache.clear();
}

/**
 * Probe a public image URL (HEAD, then minimal GET if HEAD is unsupported).
 * Returns false on network errors, non-2xx, or non-image content-type.
 * Trusted Supabase Storage public URLs skip the network unless IMAGE_PROBE_FORCE is set.
 */
async function isImageUrlReachable(imageUrl, options = {}) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return false;
    }

    const {
        timeoutMs,
        cacheTtlMs,
        trustSupabaseStorage = true,
        forceProbe = isImageProbeForced(),
        useCache = true,
    } = options;

    const resolvedTimeoutMs = resolveTimeoutMs(timeoutMs);
    const resolvedCacheTtlMs = resolveCacheTtlMs(cacheTtlMs);

    if (useCache) {
        const cached = getCachedReachability(imageUrl);
        if (cached !== undefined) {
            return cached;
        }
    }

    if (trustSupabaseStorage && !forceProbe && isTrustedSupabaseStorageUrl(imageUrl)) {
        if (useCache) {
            setCachedReachability(imageUrl, true, resolvedCacheTtlMs);
        }

        return true;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolvedTimeoutMs);

    let reachable = false;

    try {
        let response = await fetch(imageUrl, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
        });

        if (response.status === 405 || response.status === 501) {
            response = await fetch(imageUrl, {
                method: 'GET',
                signal: controller.signal,
                redirect: 'follow',
                headers: { Range: 'bytes=0-0' },
            });
        }

        if (response.ok) {
            reachable = isImageContentType(response.headers.get('content-type'));
        }
    } catch {
        reachable = false;
    } finally {
        clearTimeout(timeout);
    }

    if (useCache) {
        setCachedReachability(imageUrl, reachable, resolvedCacheTtlMs);
    }

    return reachable;
}

/**
 * Returns car rows with `image_url` cleared when the URL is missing or unreachable.
 */
async function applyReachableImageUrls(cars, options) {
    const results = await Promise.all(
        cars.map(async (car) => {
            if (!car.image_url) {
                return car;
            }

            const reachable = await isImageUrlReachable(car.image_url, options);
            if (reachable) {
                return car;
            }

            return { ...car, image_url: null };
        }),
    );

    return results;
}

function getProbeTimeoutMs() {
    return resolveTimeoutMs();
}

function getProbeCacheTtlMs() {
    return resolveCacheTtlMs();
}

module.exports = {
    DEFAULT_TIMEOUT_MS,
    DEFAULT_CACHE_TTL_MS,
    SUPABASE_PUBLIC_STORAGE_PATH,
    clearImageUrlCache,
    getProbeCacheTtlMs,
    getProbeTimeoutMs,
    isImageProbeForced,
    isTrustedSupabaseStorageUrl,
    isImageUrlReachable,
    applyReachableImageUrls,
};
