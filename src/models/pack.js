const VALID_ELIGIBILITY_RULE_TYPES = new Set(['all_cars', 'filter', 'explicit_ids']);
const VALID_MUTATION_TYPES = new Set(['car', 'filter']);

function normalizeEligibilityInput(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('eligibility must be an object');
    }

    const ruleType = input.rule_type;

    if (!VALID_ELIGIBILITY_RULE_TYPES.has(ruleType)) {
        throw new Error(`Invalid eligibility rule_type: ${ruleType}`);
    }

    if (ruleType === 'all_cars') {
        return {
            rule_type: 'all_cars',
            filter_json: null,
            explicit_car_ids: null,
        };
    }

    if (ruleType === 'filter') {
        if (!input.filter_json || typeof input.filter_json !== 'object' || Array.isArray(input.filter_json)) {
            throw new Error('filter eligibility requires filter_json object');
        }

        return {
            rule_type: 'filter',
            filter_json: input.filter_json,
            explicit_car_ids: null,
        };
    }

    const explicitCarIds = input.explicit_car_ids;

    if (!Array.isArray(explicitCarIds) || explicitCarIds.length === 0) {
        throw new Error('explicit_ids eligibility requires explicit_car_ids array');
    }

    return {
        rule_type: 'explicit_ids',
        filter_json: null,
        explicit_car_ids: explicitCarIds.map((id) => Number(id)),
    };
}

function normalizeMutationInput(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('mutation entry must be an object');
    }

    const mutationType = input.mutation_type;

    if (!VALID_MUTATION_TYPES.has(mutationType)) {
        throw new Error(`Invalid mutation_type: ${mutationType}`);
    }

    const chancePercent = Number(input.chance_percent);

    if (!Number.isFinite(chancePercent) || chancePercent <= 0 || chancePercent > 100) {
        throw new Error(`Invalid chance_percent: ${input.chance_percent}`);
    }

    const rarityGate = input.rarity_gate == null ? null : Number(input.rarity_gate);

    if (rarityGate != null && (!Number.isInteger(rarityGate) || rarityGate < 1 || rarityGate > 6)) {
        throw new Error(`Invalid rarity_gate: ${input.rarity_gate}`);
    }

    if (mutationType === 'car') {
        const targetCarId = Number(input.target_car_id);

        if (!Number.isInteger(targetCarId)) {
            throw new Error('car mutation requires target_car_id');
        }

        return {
            mutation_type: 'car',
            target_car_id: targetCarId,
            filter_json: null,
            chance_percent: chancePercent,
            rarity_gate: rarityGate,
        };
    }

    if (!input.filter_json || typeof input.filter_json !== 'object' || Array.isArray(input.filter_json)) {
        throw new Error('filter mutation requires filter_json object');
    }

    return {
        mutation_type: 'filter',
        target_car_id: null,
        filter_json: input.filter_json,
        chance_percent: chancePercent,
        rarity_gate: rarityGate,
    };
}

/**
 * Normalize pack definition fields from a catalog drop entry.
 */
function normalizePackDefinitionInput(input) {
    if (!input.slug || !input.name) {
        throw new Error('Pack drop requires slug and name');
    }

    const packSize = input.pack_size ?? 5;

    if (!Number.isInteger(packSize) || packSize < 1) {
        throw new Error(`Invalid pack_size: ${input.pack_size}`);
    }

    return {
        id: input.id ?? undefined,
        slug: String(input.slug),
        name: String(input.name),
        is_default: Boolean(input.is_default),
        pack_size: packSize,
        is_active: input.is_active ?? true,
        description: input.description ?? null,
    };
}

function collectDropRatePatch(dropRates) {
    if (!dropRates || typeof dropRates !== 'object') {
        return null;
    }

    const patch = {};

    for (let rarity = 1; rarity <= 6; rarity += 1) {
        if (dropRates[rarity] != null || dropRates[String(rarity)] != null) {
            patch[rarity] = Number(dropRates[rarity] ?? dropRates[String(rarity)]);
        }
    }

    return Object.keys(patch).length > 0 ? patch : null;
}

module.exports = {
    VALID_ELIGIBILITY_RULE_TYPES,
    VALID_MUTATION_TYPES,
    normalizeEligibilityInput,
    normalizeMutationInput,
    normalizePackDefinitionInput,
    collectDropRatePatch,
};
