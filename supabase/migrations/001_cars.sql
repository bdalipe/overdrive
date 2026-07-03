-- Phase 1: nullable car catalog with per-stat display status columns.
-- IDs: random 6-digit serials (100000–999999), assigned by application layer with collision retry.
-- See overdrive_phase_1_pack_simulator plan — Unavailable / N/A semantics in application layer.

CREATE TABLE cars (
    id integer PRIMARY KEY CHECK (id >= 100000 AND id <= 999999),
    rarity smallint NOT NULL CHECK (rarity BETWEEN 1 AND 6),
    performance smallint,
    performance_class text,
    make text,
    model text,
    zero_to_sixty numeric,
    zero_to_sixty_status text NOT NULL DEFAULT 'unavailable'
        CHECK (zero_to_sixty_status IN ('available', 'unavailable', 'not_applicable')),
    top_speed numeric,
    top_speed_status text NOT NULL DEFAULT 'unavailable'
        CHECK (top_speed_status IN ('available', 'unavailable', 'not_applicable')),
    handling numeric,
    handling_status text NOT NULL DEFAULT 'unavailable'
        CHECK (handling_status IN ('available', 'unavailable', 'not_applicable')),
    weight numeric,
    weight_status text NOT NULL DEFAULT 'unavailable'
        CHECK (weight_status IN ('available', 'unavailable', 'not_applicable')),
    drive_type text,
    tyre_type text,
    body_style text,
    country text,
    model_year smallint,
    tag text,
    description text,
    image_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cars_rarity ON cars (rarity);

COMMENT ON TABLE cars IS 'Car catalog; 6-digit id (100000–999999); metadata nullable until maintainer import.';
