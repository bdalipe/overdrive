const { wrapRepositoryError } = require('./errors');
const {
    assertValidPackSize,
    VALID_ELIGIBILITY_RULE_TYPES,
    VALID_MUTATION_TYPES,
} = require('../models/pack');

function createPackRepository(supabase) {
    async function findById(packId) {
        const { data, error } = await supabase
            .from('pack_definitions')
            .select('*')
            .eq('id', packId)
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('packs.findById', error);
        }

        return data;
    }

    async function findBySlug(slug) {
        const { data, error } = await supabase
            .from('pack_definitions')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('packs.findBySlug', error);
        }

        return data;
    }

    async function findDefault() {
        const { data, error } = await supabase
            .from('pack_definitions')
            .select('*')
            .eq('is_default', true)
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('packs.findDefault', error);
        }

        return data;
    }

    async function getDropRates(packId) {
        const { data, error } = await supabase
            .from('pack_drop_rates')
            .select('rarity, weight')
            .eq('pack_id', packId)
            .order('rarity', { ascending: true });

        if (error) {
            throw wrapRepositoryError('packs.getDropRates', error);
        }

        return data ?? [];
    }

    async function getEligibility(packId) {
        const { data, error } = await supabase
            .from('pack_eligibility')
            .select('*')
            .eq('pack_id', packId)
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('packs.getEligibility', error);
        }

        return data;
    }

    async function getMutations(packId) {
        const { data, error } = await supabase
            .from('pack_mutations')
            .select('*')
            .eq('pack_id', packId)
            .order('id', { ascending: true });

        if (error) {
            throw wrapRepositoryError('packs.getMutations', error);
        }

        return data ?? [];
    }

    async function setDropRates(packId, weights) {
        const rows = [];

        for (let rarity = 1; rarity <= 6; rarity += 1) {
            rows.push({
                pack_id: packId,
                rarity,
                weight: Number(weights[rarity] ?? weights[String(rarity)] ?? 0),
            });
        }

        const { data, error } = await supabase
            .from('pack_drop_rates')
            .upsert(rows, { onConflict: 'pack_id,rarity' })
            .select('rarity, weight')
            .order('rarity', { ascending: true });

        if (error) {
            throw wrapRepositoryError('packs.setDropRates', error);
        }

        return data ?? [];
    }

    async function setEligibility(packId, { rule_type, filter_json = null, explicit_car_ids = null }) {
        if (!VALID_ELIGIBILITY_RULE_TYPES.has(rule_type)) {
            throw new Error(`Invalid eligibility rule_type: ${rule_type}`);
        }

        const { data, error } = await supabase
            .from('pack_eligibility')
            .upsert(
                {
                    pack_id: packId,
                    rule_type,
                    filter_json,
                    explicit_car_ids,
                },
                { onConflict: 'pack_id' },
            )
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('packs.setEligibility', error);
        }

        return data;
    }

    async function addMutation(
        packId,
        { mutation_type, target_car_id = null, filter_json = null, chance_percent, rarity_gate = null },
    ) {
        if (!VALID_MUTATION_TYPES.has(mutation_type)) {
            throw new Error(`Invalid mutation_type: ${mutation_type}`);
        }

        const chance = Number(chance_percent);
        if (!Number.isFinite(chance) || chance <= 0 || chance > 100) {
            throw new Error(`Invalid chance_percent: ${chance_percent}`);
        }

        const { data, error } = await supabase
            .from('pack_mutations')
            .insert({
                pack_id: packId,
                mutation_type,
                target_car_id,
                filter_json,
                chance_percent: chance,
                rarity_gate,
            })
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('packs.addMutation', error);
        }

        return data;
    }

    async function deleteMutations(packId, mutationIds) {
        if (!Array.isArray(mutationIds) || mutationIds.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from('pack_mutations')
            .delete()
            .eq('pack_id', packId)
            .in('id', mutationIds)
            .select('id');

        if (error) {
            throw wrapRepositoryError('packs.deleteMutations', error);
        }

        return data ?? [];
    }

    async function deleteAllMutations(packId) {
        const { data, error } = await supabase
            .from('pack_mutations')
            .delete()
            .eq('pack_id', packId)
            .select('id');

        if (error) {
            throw wrapRepositoryError('packs.deleteAllMutations', error);
        }

        return data ?? [];
    }

    async function createDefinition({
        id,
        slug,
        name,
        is_default = false,
        pack_size = 5,
        is_active = true,
        description = null,
    }) {
        const validatedPackSize = assertValidPackSize(pack_size);

        if (is_default) {
            const currentDefault = await findDefault();
            if (currentDefault) {
                throw new Error('A default pack already exists; patch the existing default instead of creating another.');
            }
        }

        const { data, error } = await supabase
            .from('pack_definitions')
            .insert({
                id,
                slug,
                name,
                is_default,
                pack_size: validatedPackSize,
                is_active,
                description,
            })
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('packs.createDefinition', error);
        }

        return data;
    }

    async function updateDefinition(packId, fields) {
        const allowed = {};

        if (fields.name != null) {
            allowed.name = fields.name;
        }

        if (fields.pack_size != null) {
            allowed.pack_size = assertValidPackSize(fields.pack_size);
        }

        if (fields.is_active != null) {
            allowed.is_active = fields.is_active;
        }

        if (Object.prototype.hasOwnProperty.call(fields, 'description')) {
            allowed.description = fields.description ?? null;
        }

        if (Object.keys(allowed).length === 0) {
            return findById(packId);
        }

        const { data, error } = await supabase
            .from('pack_definitions')
            .update(allowed)
            .eq('id', packId)
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('packs.updateDefinition', error);
        }

        return data;
    }

    async function listActive() {
        const { data, error } = await supabase
            .from('pack_definitions')
            .select('*')
            .eq('is_active', true)
            .order('slug', { ascending: true });

        if (error) {
            throw wrapRepositoryError('packs.listActive', error);
        }

        return data ?? [];
    }

    async function deleteById(packId) {
        const existing = await findById(packId);

        if (!existing) {
            return null;
        }

        if (existing.is_default) {
            throw new Error('Cannot delete the default pack');
        }

        const { data, error } = await supabase
            .from('pack_definitions')
            .delete()
            .eq('id', packId)
            .select()
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('packs.deleteById', error);
        }

        return data;
    }

    /**
     * Delete a pack created during a failed import create (CASCADE children).
     * Clears is_default first when needed so the DB delete trigger allows removal.
     * Do not use for normal maintainer deletes of the seeded default pack.
     */
    async function deletePackForRollback(packId) {
        const existing = await findById(packId);

        if (!existing) {
            return null;
        }

        if (existing.is_default) {
            const { error: clearError } = await supabase
                .from('pack_definitions')
                .update({ is_default: false })
                .eq('id', packId);

            if (clearError) {
                throw wrapRepositoryError('packs.deletePackForRollback.clearDefault', clearError);
            }
        }

        const { data, error } = await supabase
            .from('pack_definitions')
            .delete()
            .eq('id', packId)
            .select()
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('packs.deletePackForRollback', error);
        }

        return data;
    }

    async function deleteBySlug(slug) {
        const existing = await findBySlug(slug);

        if (!existing) {
            return null;
        }

        return deleteById(existing.id);
    }

    async function findCarPackReferences(carIds) {
        const ids = [...new Set((carIds ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id)))];

        if (ids.length === 0) {
            return { mutations: [], explicitEligibility: [] };
        }

        const { data: mutations, error: mutError } = await supabase
            .from('pack_mutations')
            .select('id, pack_id, target_car_id, chance_percent, mutation_type')
            .in('target_car_id', ids);

        if (mutError) {
            throw wrapRepositoryError('packs.findCarPackReferences.mutations', mutError);
        }

        const { data: eligibility, error: eligError } = await supabase
            .from('pack_eligibility')
            .select('pack_id, explicit_car_ids')
            .eq('rule_type', 'explicit_ids')
            .overlaps('explicit_car_ids', ids);

        if (eligError) {
            throw wrapRepositoryError('packs.findCarPackReferences.eligibility', eligError);
        }

        const packIdSet = new Set([
            ...(mutations ?? []).map((row) => row.pack_id),
            ...(eligibility ?? []).map((row) => row.pack_id),
        ]);
        const packIds = [...packIdSet];
        const slugById = new Map();

        if (packIds.length > 0) {
            const { data: packs, error: packError } = await supabase
                .from('pack_definitions')
                .select('id, slug')
                .in('id', packIds);

            if (packError) {
                throw wrapRepositoryError('packs.findCarPackReferences.packs', packError);
            }

            for (const pack of packs ?? []) {
                slugById.set(pack.id, pack.slug);
            }
        }

        const idSet = new Set(ids);

        return {
            mutations: (mutations ?? []).map((row) => ({
                mutationId: row.id,
                packId: row.pack_id,
                packSlug: slugById.get(row.pack_id) ?? String(row.pack_id),
                targetCarId: row.target_car_id,
                chancePercent: row.chance_percent,
                mutationType: row.mutation_type,
            })),
            explicitEligibility: (eligibility ?? []).map((row) => ({
                packId: row.pack_id,
                packSlug: slugById.get(row.pack_id) ?? String(row.pack_id),
                matchedCarIds: (row.explicit_car_ids ?? []).filter((carId) => idSet.has(carId)),
            })),
        };
    }

    return {
        findById,
        findBySlug,
        findDefault,
        getDropRates,
        getEligibility,
        getMutations,
        findCarPackReferences,
        setDropRates,
        setEligibility,
        addMutation,
        deleteMutations,
        deleteAllMutations,
        createDefinition,
        updateDefinition,
        listActive,
        deleteById,
        deletePackForRollback,
        deleteBySlug,
    };
}

module.exports = { createPackRepository };
