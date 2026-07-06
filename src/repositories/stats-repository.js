const { wrapRepositoryError } = require('./errors');

const TABLE = 'stats_events';

function createStatsRepository(supabase) {
    async function insertEvent({ userId, eventType, payload }) {
        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                user_id: userId,
                event_type: eventType,
                payload: payload ?? {},
            })
            .select()
            .single();

        if (error) {
            throw wrapRepositoryError('stats.insertEvent', error);
        }

        return data;
    }

    async function insertEvents(events) {
        if (events.length === 0) {
            return [];
        }

        const rows = events.map(({ userId, eventType, payload }) => ({
            user_id: userId,
            event_type: eventType,
            payload: payload ?? {},
        }));

        const { data, error } = await supabase.from(TABLE).insert(rows).select();

        if (error) {
            throw wrapRepositoryError('stats.insertEvents', error);
        }

        return data ?? [];
    }

    return {
        insertEvent,
        insertEvents,
    };
}

module.exports = { createStatsRepository };
