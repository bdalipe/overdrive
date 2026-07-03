-- Phase 1: pack definitions (default + future themed packs in Phase 2).
-- IDs: 6-digit serials (100000–999999). Reserved id 100000 = default pack.

CREATE TABLE pack_definitions (
    id integer PRIMARY KEY CHECK (id >= 100000 AND id <= 999999),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    pack_size smallint NOT NULL DEFAULT 5 CHECK (pack_size > 0),
    is_active boolean NOT NULL DEFAULT true,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pack_definitions_single_default
    ON pack_definitions (is_default)
    WHERE is_default = true;

COMMENT ON TABLE pack_definitions IS 'Pack metadata; id 100000 reserved for default pack; new packs get random 6-digit ids.';

INSERT INTO pack_definitions (id, slug, name, is_default, pack_size, is_active, description)
VALUES (
    100000,
    'default',
    'Standard Pack',
    true,
    5,
    true,
    'Default pack opened by /open-pack in Phase 1.'
);
