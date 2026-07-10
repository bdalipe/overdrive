const { wrapRepositoryError } = require('./errors');

const TABLE = 'config_change_events';

function createConfigChangeRepository(supabase) {
    async function insert({
        actorId,
        source,
        entityType,
        action,
        payload,
    }) {
        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                actor_id: actorId,
                source,
                entity_type: entityType,
                action,
                payload: payload ?? {},
            })
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('configChanges.insert', error);
        }

        return data;
    }

    return {
        insert,
    };
}

module.exports = { createConfigChangeRepository };
