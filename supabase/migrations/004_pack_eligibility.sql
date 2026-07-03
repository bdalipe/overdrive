-- Phase 1: base eligibility rules and persistent pack mutations (guarantees / bonus chances).

CREATE TABLE pack_eligibility (
    pack_id integer PRIMARY KEY REFERENCES pack_definitions (id) ON DELETE CASCADE,
    rule_type text NOT NULL CHECK (rule_type IN ('all_cars', 'filter', 'explicit_ids')),
    filter_json jsonb,
    explicit_car_ids integer[]
);

COMMENT ON TABLE pack_eligibility IS 'Base pool: which cars can drop in each pack.';

CREATE TABLE pack_mutations (
    id serial PRIMARY KEY,
    pack_id integer NOT NULL REFERENCES pack_definitions (id) ON DELETE CASCADE,
    mutation_type text NOT NULL CHECK (mutation_type IN ('car', 'filter')),
    target_car_id integer REFERENCES cars (id) ON DELETE CASCADE,
    filter_json jsonb,
    chance_percent numeric NOT NULL CHECK (chance_percent > 0 AND chance_percent <= 100),
    rarity_gate smallint CHECK (rarity_gate IS NULL OR rarity_gate BETWEEN 1 AND 6),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pack_mutations_target_check CHECK (
        (mutation_type = 'car' AND target_car_id IS NOT NULL AND filter_json IS NULL)
        OR (mutation_type = 'filter' AND filter_json IS NOT NULL AND target_car_id IS NULL)
    )
);

CREATE INDEX idx_pack_mutations_pack_id ON pack_mutations (pack_id);

COMMENT ON TABLE pack_mutations IS 'Persistent admin mutations until removed. chance_percent=100 guarantees; <100 is bonus chance after rarity_gate slot resolves.';

INSERT INTO pack_eligibility (pack_id, rule_type, filter_json, explicit_car_ids)
VALUES (100000, 'all_cars', NULL, NULL);
