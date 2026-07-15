const STAT_STATUS = {
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
    NOT_APPLICABLE: 'not_applicable',
};

const DISPLAY_UNAVAILABLE = 'Unavailable';
const DISPLAY_NOT_APPLICABLE = 'N/A';

const NUMERIC_STATS = {
    zero_to_sixty: {
        statusKey: 'zero_to_sixty_status',
        formatValue: (value) => `${formatNumber(value)}s`,
    },
    top_speed: {
        statusKey: 'top_speed_status',
        formatValue: (value) => `${formatNumber(value)} mph`,
    },
    handling: {
        statusKey: 'handling_status',
        formatValue: (value) => formatNumber(value),
    },
    weight: {
        statusKey: 'weight_status',
        // Imperial default (lbs). Future: respect imperial/metric user/guild setting (Phase 4 settings).
        formatValue: (value) => `${formatNumber(value)} lbs`,
    },
};

const TEXT_FIELDS = new Set([
    'make',
    'model',
    'drive_type',
    'tyre_type',
    'body_style',
    'country',
    'model_year',
    'tag',
    'description',
    'performance',
    'performance_class',
]);

function formatNumber(value) {
    const n = Number(value);
    if (Number.isNaN(n)) {
        return DISPLAY_UNAVAILABLE;
    }
    if (Number.isInteger(n)) {
        return String(n);
    }
    return String(n);
}

function isBlank(value) {
    return value == null || value === '';
}

/**
 * Set a numeric stat and its status column together (write path).
 * Mutates and returns `car`.
 *
 * @param {object} car
 * @param {keyof typeof NUMERIC_STATS} field
 * @param {number|null|undefined} value
 * @param {string} [status] - defaults to available when value is set, unavailable when null
 */
function setNumericStat(car, field, value, status) {
    const meta = NUMERIC_STATS[field];
    if (!meta) {
        throw new Error(`Unknown numeric stat field: ${field}`);
    }

    if (status === STAT_STATUS.NOT_APPLICABLE) {
        car[field] = null;
        car[meta.statusKey] = STAT_STATUS.NOT_APPLICABLE;
        return car;
    }

    if (isBlank(value)) {
        car[field] = null;
        car[meta.statusKey] = STAT_STATUS.UNAVAILABLE;
        return car;
    }

    car[field] = value;
    car[meta.statusKey] = status ?? STAT_STATUS.AVAILABLE;
    return car;
}

/**
 * Format a car field for user-facing display.
 * Reads `*_status` first for numeric stats; never returns raw null.
 *
 * @param {object} car
 * @param {string} field
 * @returns {string}
 */
function formatStat(car, field) {
    const numeric = NUMERIC_STATS[field];
    if (numeric) {
        const status = car[numeric.statusKey] ?? STAT_STATUS.UNAVAILABLE;
        if (status === STAT_STATUS.NOT_APPLICABLE) {
            return DISPLAY_NOT_APPLICABLE;
        }
        if (status === STAT_STATUS.UNAVAILABLE || isBlank(car[field])) {
            return DISPLAY_UNAVAILABLE;
        }
        return numeric.formatValue(car[field]);
    }

    if (!TEXT_FIELDS.has(field)) {
        throw new Error(`Unknown stat field: ${field}`);
    }

    if (isBlank(car[field])) {
        return DISPLAY_UNAVAILABLE;
    }

    return String(car[field]);
}

/**
 * Display name: "Make Model", either part alone, or `Unknown Car #{id}` when both missing.
 */
function formatDisplayName(car) {
    const makeMissing = isBlank(car.make);
    const modelMissing = isBlank(car.model);

    if (makeMissing && modelMissing) {
        return `Unknown Car #${car.id}`;
    }
    if (makeMissing) {
        return String(car.model);
    }
    if (modelMissing) {
        return String(car.make);
    }
    return `${car.make} ${car.model}`;
}

/**
 * Sparse stub row for seed scripts: id + rarity (+ optional performance); metadata unavailable.
 */
function createStubCar({ id, rarity, performance = null } = {}) {
    if (id == null || rarity == null) {
        throw new Error('createStubCar requires id and rarity');
    }

    const car = {
        id,
        rarity,
        performance: performance ?? null,
        performance_class: null,
        make: null,
        model: null,
        drive_type: null,
        tyre_type: null,
        body_style: null,
        country: null,
        model_year: null,
        tag: null,
        description: null,
        image_url: null,
    };

    for (const field of Object.keys(NUMERIC_STATS)) {
        setNumericStat(car, field, null);
    }

    return car;
}

/**
 * Normalize a catalog drop object for a full-row DB upsert (create or replace).
 * Omitted scalar fields become null; omitted numeric stats become unavailable.
 * Syncs numeric value + *_status via setNumericStat; preserves explicit status-only fields.
 */
function normalizeCarForDb(input) {
    if (input.rarity == null) {
        throw new Error('normalizeCarForDb requires rarity');
    }

    const car = {
        id: input.id ?? undefined,
        rarity: input.rarity,
        performance: input.performance ?? null,
        performance_class: input.performance_class ?? null,
        make: input.make ?? null,
        model: input.model ?? null,
        drive_type: input.drive_type ?? null,
        tyre_type: input.tyre_type ?? null,
        body_style: input.body_style ?? null,
        country: input.country ?? null,
        model_year: input.model_year ?? null,
        tag: input.tag ?? null,
        description: input.description ?? null,
        image_url: input.image_url ?? null,
    };

    for (const field of Object.keys(NUMERIC_STATS)) {
        applyNumericStatFromInput(car, input, field, { defaultIfOmitted: true });
    }

    return car;
}

const MERGEABLE_SCALAR_FIELDS = [
    'rarity',
    'performance',
    'performance_class',
    'make',
    'model',
    'drive_type',
    'tyre_type',
    'body_style',
    'country',
    'model_year',
    'tag',
    'description',
    'image_url',
];

function applyNumericStatFromInput(car, input, field, { defaultIfOmitted }) {
    const statusKey = NUMERIC_STATS[field].statusKey;
    const hasField = Object.prototype.hasOwnProperty.call(input, field);
    const hasStatus = Object.prototype.hasOwnProperty.call(input, statusKey);

    if (!hasField && !hasStatus) {
        if (defaultIfOmitted) {
            setNumericStat(car, field, null);
        }
        return;
    }

    const explicitStatus = hasStatus ? input[statusKey] : undefined;

    if (explicitStatus === STAT_STATUS.NOT_APPLICABLE) {
        setNumericStat(car, field, null, STAT_STATUS.NOT_APPLICABLE);
        return;
    }

    setNumericStat(car, field, hasField ? input[field] ?? null : car[field], explicitStatus);
}

/**
 * Merge a catalog patch onto an existing car row. Only keys present on `patch` change.
 * Omitted fields keep existing DB values. Does not copy `created_at` onto the result.
 *
 * @param {object} existing - current DB row
 * @param {object} patch - drop entry (may include `replace`, ignored here)
 * @returns {object} full row suitable for upsert (without created_at)
 */
function mergeCarForDb(existing, patch) {
    if (existing == null || existing.id == null) {
        throw new Error('mergeCarForDb requires an existing car row with id');
    }

    const car = {
        id: existing.id,
        rarity: existing.rarity,
        performance: existing.performance ?? null,
        performance_class: existing.performance_class ?? null,
        make: existing.make ?? null,
        model: existing.model ?? null,
        drive_type: existing.drive_type ?? null,
        tyre_type: existing.tyre_type ?? null,
        body_style: existing.body_style ?? null,
        country: existing.country ?? null,
        model_year: existing.model_year ?? null,
        tag: existing.tag ?? null,
        description: existing.description ?? null,
        image_url: existing.image_url ?? null,
    };

    for (const field of Object.keys(NUMERIC_STATS)) {
        const statusKey = NUMERIC_STATS[field].statusKey;
        car[field] = existing[field] ?? null;
        car[statusKey] = existing[statusKey] ?? STAT_STATUS.UNAVAILABLE;
    }

    for (const field of MERGEABLE_SCALAR_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(patch, field)) {
            continue;
        }

        if (field === 'rarity') {
            if (patch.rarity == null) {
                throw new Error('mergeCarForDb: rarity cannot be null');
            }
            car.rarity = patch.rarity;
            continue;
        }

        car[field] = patch[field] ?? null;
    }

    for (const field of Object.keys(NUMERIC_STATS)) {
        applyNumericStatFromInput(car, patch, field, { defaultIfOmitted: false });
    }

    return car;
}

module.exports = {
    STAT_STATUS,
    DISPLAY_UNAVAILABLE,
    DISPLAY_NOT_APPLICABLE,
    NUMERIC_STATS,
    setNumericStat,
    formatStat,
    formatDisplayName,
    createStubCar,
    normalizeCarForDb,
    mergeCarForDb,
};
