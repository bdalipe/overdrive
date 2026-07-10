-- Maintainer audit log for catalog and pack configuration writes (import scripts).

CREATE TABLE config_change_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id text NOT NULL,
    source text NOT NULL,
    entity_type text NOT NULL,
    action text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_config_change_events_entity_created_at
    ON config_change_events (entity_type, created_at DESC);

CREATE INDEX idx_config_change_events_source_created_at
    ON config_change_events (source, created_at DESC);

COMMENT ON TABLE config_change_events IS 'Append-only maintainer audit: car/pack catalog imports and future delete APIs. actor_id is Discord snowflake or system:maintainer.';
