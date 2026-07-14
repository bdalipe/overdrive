-- Pack integrity: upper-bound pack_size; block deleting the default pack at the DB layer.
-- App mirrors MAX_PACK_SIZE = 50 in src/models/pack.js.
-- Future: multi-embed / multi-message pack opens may allow raising this beyond 50.

-- ---------------------------------------------------------------------------
-- #13: pack_size CHECK (1..50)
-- ---------------------------------------------------------------------------

ALTER TABLE pack_definitions
    DROP CONSTRAINT IF EXISTS pack_definitions_pack_size_check;

ALTER TABLE pack_definitions
    ADD CONSTRAINT pack_definitions_pack_size_check
    CHECK (pack_size > 0 AND pack_size <= 50);

COMMENT ON COLUMN pack_definitions.pack_size IS
    'Cards per open; must be 1–50 for now (single-message reveal). Raise when multi-embed opens ship.';

-- ---------------------------------------------------------------------------
-- #11: BEFORE DELETE trigger for is_default packs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_default_pack_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_default IS TRUE THEN
        RAISE EXCEPTION 'Cannot delete the default pack (id %, slug %)', OLD.id, OLD.slug
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_default_pack_delete ON pack_definitions;

CREATE TRIGGER trg_prevent_default_pack_delete
    BEFORE DELETE ON pack_definitions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_default_pack_delete();

COMMENT ON FUNCTION prevent_default_pack_delete() IS
    'Blocks DELETE of the row where is_default = true (app-layer deleteById is not enough).';
