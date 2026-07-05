const { wrapRepositoryError } = require('./errors');

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

    return {
        findById,
        findBySlug,
        findDefault,
        getDropRates,
        getEligibility,
        getMutations,
    };
}

module.exports = { createPackRepository };
