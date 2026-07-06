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

    return {
        findById,
        exists,
        upsert,
        upsertMany,
        findByRarity,
        listAll,
    };
}

module.exports = { createCarRepository };
