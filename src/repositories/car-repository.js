const { wrapRepositoryError } = require('./errors');

const TABLE = 'cars';

function createCarRepository(supabase) {
    async function findById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('cars.findById', error);
        }

        return data;
    }

    async function exists(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('cars.exists', error);
        }

        return data != null;
    }

    async function upsert(car) {
        const { data, error } = await supabase
            .from(TABLE)
            .upsert(car, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('cars.upsert', error);
        }

        return data;
    }

    async function upsertMany(cars) {
        if (cars.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from(TABLE)
            .upsert(cars, { onConflict: 'id' })
            .select();

        if (error) {
            throw wrapRepositoryError('cars.upsertMany', error);
        }

        return data ?? [];
    }

    async function findByRarity(rarity) {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('rarity', rarity);

        if (error) {
            throw wrapRepositoryError('cars.findByRarity', error);
        }

        return data ?? [];
    }

    async function listAll() {
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            throw wrapRepositoryError('cars.listAll', error);
        }

        return data ?? [];
    }

    /**
     * Resolve cars for a pack_eligibility row without loading the full catalog when possible.
     * Filter semantics match pack-service `matchesFilter` (null year bypasses year bounds).
     */
    async function findEligible(eligibility) {
        if (!eligibility || eligibility.rule_type === 'all_cars') {
            return listAll();
        }

        if (eligibility.rule_type === 'explicit_ids') {
            const ids = eligibility.explicit_car_ids ?? [];

            if (ids.length === 0) {
                return [];
            }

            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .in('id', ids)
                .order('id', { ascending: true });

            if (error) {
                throw wrapRepositoryError('cars.findEligible', error);
            }

            return data ?? [];
        }

        if (eligibility.rule_type !== 'filter') {
            return listAll();
        }

        const filter = eligibility.filter_json ?? {};
        let query = supabase.from(TABLE).select('*');

        if (Array.isArray(filter.rarities) && filter.rarities.length > 0) {
            query = query.in('rarity', filter.rarities);
        }

        if (Array.isArray(filter.countries) && filter.countries.length > 0) {
            query = query.in('country', filter.countries);
        }

        if (Array.isArray(filter.bodyStyles) && filter.bodyStyles.length > 0) {
            query = query.in('body_style', filter.bodyStyles);
        }

        if (Array.isArray(filter.tags) && filter.tags.length > 0) {
            query = query.in('tag', filter.tags);
        }

        // Match in-memory matchesFilter: null model_year is not excluded by year bounds.
        if (filter.yearMin != null && filter.yearMax != null) {
            query = query.or(
                `model_year.is.null,and(model_year.gte.${Number(filter.yearMin)},model_year.lte.${Number(filter.yearMax)})`,
            );
        } else if (filter.yearMin != null) {
            query = query.or(`model_year.is.null,model_year.gte.${Number(filter.yearMin)}`);
        } else if (filter.yearMax != null) {
            query = query.or(`model_year.is.null,model_year.lte.${Number(filter.yearMax)}`);
        }

        const { data, error } = await query.order('id', { ascending: true });

        if (error) {
            throw wrapRepositoryError('cars.findEligible', error);
        }

        return data ?? [];
    }

    async function deleteById(id) {
        const { data, error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            throw wrapRepositoryError('cars.deleteById', error);
        }

        return data;
    }

    async function deleteByIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from(TABLE)
            .delete()
            .in('id', ids)
            .select('id');

        if (error) {
            throw wrapRepositoryError('cars.deleteByIds', error);
        }

        return data ?? [];
    }

    /** Sparse stubs from seed-stubs: both make and model null. */
    async function deleteStubs() {
        const { data, error } = await supabase
            .from(TABLE)
            .delete()
            .is('make', null)
            .is('model', null)
            .select('id');

        if (error) {
            throw wrapRepositoryError('cars.deleteStubs', error);
        }

        return data ?? [];
    }

    return {
        findById,
        exists,
        upsert,
        upsertMany,
        findByRarity,
        listAll,
        findEligible,
        deleteById,
        deleteByIds,
        deleteStubs,
    };
}

module.exports = { createCarRepository };
