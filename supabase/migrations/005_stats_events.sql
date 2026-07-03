-- Phase 1: append-only event log for pack opens and pulls (profile stats in Phase 5).

CREATE TABLE stats_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stats_events_user_id ON stats_events (user_id);
CREATE INDEX idx_stats_events_type_created_at ON stats_events (event_type, created_at DESC);

COMMENT ON TABLE stats_events IS 'Append-only analytics; payload uses 6-digit packId/carId; user_id is Discord snowflake.';
