-- Phase 1: per-pack rarity weights (not global).

CREATE TABLE pack_drop_rates (
    pack_id integer NOT NULL REFERENCES pack_definitions (id) ON DELETE CASCADE,
    rarity smallint NOT NULL CHECK (rarity BETWEEN 1 AND 6),
    weight numeric NOT NULL CHECK (weight >= 0),
    PRIMARY KEY (pack_id, rarity)
);

COMMENT ON TABLE pack_drop_rates IS 'Weighted rarity distribution per pack.';

INSERT INTO pack_drop_rates (pack_id, rarity, weight) VALUES
    (100000, 1, 45),
    (100000, 2, 27),
    (100000, 3, 15),
    (100000, 4, 8),
    (100000, 5, 4),
    (100000, 6, 1);
