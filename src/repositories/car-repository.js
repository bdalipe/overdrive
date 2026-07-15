const { wrapRepositoryError } = require('./errors');

const TABLE = 'cars';
/** Must be ≤ PostgREST `max_rows` (see supabase/config.toml). */
const PAGE_SIZE = 1000;

/**
 * Fetch every matching row by paging with `.range()`.
 * A single unpaged `.select()` silently truncates at `max_rows`.
 */
async function fetchAllRows(buildQuery, operation) {
    const rows = [];
    let from = 0;

    for (;;) {
        const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);

        if (error) {
            throw wrapRepositoryError(operation, error);
        }

        const page = data ?? [];
        rows.push(...page);

        if (page.length < PAGE_SIZE) {
            break;
        }

        from += PAGE_SIZE;
    }

    return rows;
}

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

    /**
     * @param {number[]} ids
     * @returns {Promise<Map<number, object>>}
     */
    async function findByIds(ids) {
        const unique = [...new Set((ids ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id)))];
        const byId = new Map();

        if (unique.length === 0) {
            return byId;
        }

        const rows = await fetchAllRows(
            () => supabase.from(TABLE).select('*').in('id', unique).order('id', { ascending: true }),
            'cars.findByIds',
        );

        for (const row of rows) {
            byId.set(row.id, row);
        }

        return byId;
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

    async function listAll() {
        return fetchAllRows(
            () => supabase.from(TABLE).select('*').order('id', { ascending: true }),
            'cars.listAll',
        );
    }

    /**
     * Resolve cars for a pack_eligibility row without loading the full catalog when possible.
     * Filter semantics match pack-service `matchesFilter`.
     * When `yearMin` / `yearMax` is set, cars with null `model_year` are excluded.
     * Results are paged so pools are not silently truncated at PostgREST `max_rows`.
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

            return fetchAllRows(
                () =>
                    supabase
                        .from(TABLE)
                        .select('*')
                        .in('id', ids)
                        .order('id', { ascending: true }),
                'cars.findEligible',
            );
        }

        if (eligibility.rule_type !== 'filter') {
            return listAll();
        }

        const filter = eligibility.filter_json ?? {};

        return fetchAllRows(() => {
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

            // Match matchesFilter: null model_year excluded when year bounds are set.
            if (filter.yearMin != null) {
                query = query.gte('model_year', Number(filter.yearMin));
            }

            if (filter.yearMax != null) {
                query = query.lte('model_year', Number(filter.yearMax));
            }

            return query.order('id', { ascending: true });
        }, 'cars.findEligible');
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
        findByIds,
        exists,
        upsertMany,
        listAll,
        findEligible,
        deleteByIds,
        deleteStubs,
    };
}

module.exports = { createCarRepository };
