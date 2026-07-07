const DEFAULT_TIMEOUT_MS = 5_000;

function isImageContentType(contentType) {
    if (!contentType) {
        return true;
    }

    return contentType.split(';')[0].trim().toLowerCase().startsWith('image/');
}

/**
 * Probe a public image URL (HEAD, then minimal GET if HEAD is unsupported).
 * Returns false on network errors, non-2xx, or non-image content-type.
 */
async function isImageUrlReachable(imageUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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

        if (!response.ok) {
            return false;
        }

        return isImageContentType(response.headers.get('content-type'));
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
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

module.exports = {
    DEFAULT_TIMEOUT_MS,
    isImageUrlReachable,
    applyReachableImageUrls,
};
