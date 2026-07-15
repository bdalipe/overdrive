# Pack content drops

JSON files in this folder are **pack configuration drops** — create or patch `pack_definitions`, `pack_drop_rates`, `pack_eligibility`, and `pack_mutations` via `npm run import-packs`.

Pack slash-command admin (`/admin pack edit`, mutations list/remove) is **removed**; maintainers use drops + import instead (same pattern as cars).

## Drop file format

Each file is a JSON object:

```json
{
  "dropId": "001-default-rates-tweak",
  "description": "Optional label for maintainers",
  "packs": [
    {
      "create": false,
      "id": 100000,
      "slug": "default",
      "name": "Standard Pack",
      "is_default": true,
      "pack_size": 5,
      "is_active": true,
      "description": "Default pack opened by /open-pack",
      "drop_rates": {
        "1": 40,
        "2": 32,
        "3": 15,
        "4": 8,
        "5": 4,
        "6": 1
      },
      "eligibility": {
        "rule_type": "all_cars",
        "filter_json": null,
        "explicit_car_ids": null
      },
      "mutations": {
        "replace": false,
        "remove_ids": [],
        "add": [
          {
            "mutation_type": "car",
            "target_car_id": 482917,
            "filter_json": null,
            "chance_percent": 100,
            "rarity_gate": null
          },
          {
            "mutation_type": "filter",
            "target_car_id": null,
            "filter_json": {
              "rarities": [6],
              "countries": ["Japan"],
              "bodyStyles": ["Coupe"],
              "tags": ["jdm"],
              "yearMin": 1990,
              "yearMax": 2005
            },
            "chance_percent": 25,
            "rarity_gate": 6
          }
        ]
      }
    }
  ]
}
```

### `pack_definitions` fields

| Field | Required | Notes |
|-------|----------|-------|
| `create` | No | `true` = create new pack; `false` = patch by `slug`. Omitted: create when slug missing, else patch |
| `id` | Create only | 6-digit serial `100001`–`999999`. Omit to auto-assign. Reserved `100000` = default pack (seeded) |
| `slug` | **Yes** | Unique key (e.g. `default`, `classic-jdm`) |
| `name` | **Yes** | Display name |
| `is_default` | No | Default `false`. Only one default pack allowed |
| `pack_size` | No | Cards per open; default `5`; **1–50** for now (DB CHECK + `import-packs` / open). Cap may rise when multi-embed pack opens land. Must be ≥ number of `chance_percent: 100` mutations after the drop |
| `is_active` | No | Default `true`. Active packs appear on `/open-pack` (Discord max **25** choices; `import-packs` / `register-commands` warn if more are active) |
| `description` | No | Optional text. **Patch:** set `"description": null` to clear |
| `created_at` | — | DB-managed; do not set in drops |

### `pack_drop_rates` (`drop_rates` object)

Keys `"1"`–`"6"` map to rarity tier weight (percent). **Create:** omitted tiers → `0`; sum must be **100**. **Patch:** omitted tiers keep existing DB weights; merged sum must be **100**.

### `pack_eligibility` (`eligibility` object)

| Field | Notes |
|-------|-------|
| `rule_type` | `all_cars` \| `filter` \| `explicit_ids` |
| `filter_json` | Required for `filter` — see filter keys below |
| `explicit_car_ids` | Required for `explicit_ids` — array of 6-digit car ids |

**Filter keys** (AND logic): `rarities`, `countries`, `bodyStyles`, `tags`, `yearMin`, `yearMax`.

When `yearMin` and/or `yearMax` is set, cars with a null `model_year` are **excluded** (same rule in SQL `findEligible` and in-memory `matchesFilter`).

**Patch:** omit `eligibility` to leave unchanged. **Create:** omit → `all_cars`.

### `pack_mutations` (`mutations` object)

| Field | Notes |
|-------|-------|
| `replace` | `true` = delete all mutations for the pack, then apply `add` |
| `remove_ids` | Array of mutation `id` values to delete (patch only, when `replace` is false) |
| `add` | Array of mutation objects to insert |

Each mutation entry:

| Field | Notes |
|-------|-------|
| `mutation_type` | `car` \| `filter` |
| `target_car_id` | Required for `car` |
| `filter_json` | Required for `filter` |
| `chance_percent` | `1`–`100`; `100` = guarantee slot (**bypasses** pack eligibility; resolves from the full catalog). Count of guarantees must be ≤ `pack_size` (`import-packs` throws otherwise). Bonuses (`&lt;100`) must resolve **within** eligibility — `import-packs` **throws** before writing if a bonus cannot (also when eligibility is narrowed over existing bonuses). On each normal draw, **every** eligible bonus rolls independently; if more than one succeeds, one winner is chosen at random for that slot |
| `rarity_gate` | Optional `1`–`6`; bonus only when that rarity is drawn |
| `id` | DB serial; omit on add (use `remove_ids` to delete) |
| `created_at` | DB-managed; do not set |

**Patch:** omit `mutations` to leave unchanged.

## Create example (themed pack)

```json
{
  "dropId": "002-classic-jdm",
  "packs": [
    {
      "create": true,
      "slug": "classic-jdm",
      "name": "Classic JDM",
      "pack_size": 5,
      "is_active": true,
      "drop_rates": { "1": 0, "2": 20, "3": 30, "4": 25, "5": 15, "6": 10 },
      "eligibility": {
        "rule_type": "filter",
        "filter_json": { "countries": ["Japan"], "yearMax": 1999 }
      }
    }
  ]
}
```

## Manifest

`data/packs/manifest.json` tracks applied vs pending drops (same workflow as `data/catalog/manifest.json`). A drop is marked applied only after **every** pack entry in the file succeeds. Mid-create failures delete the new pack (`deletePackForRollback`, CASCADE on rates/eligibility/mutations) so a re-run is not blocked by a half-created slug. If a later entry in the same file fails, earlier **creates** from that drop are also rolled back. **Patches** that fail mid-write are not auto-reverted (re-run or fix manually).

**Known follow-up:** if a **create** finishes packing writes but the required audit insert then fails, the pack row can remain and block the slug on retry — delete the orphan pack (or wait for create+audit rollback) before re-running.

## Audit log

Every successful import appends rows to `config_change_events` (`source: import-packs`, `entity_type: pack`). If the audit insert fails, `import-packs` exits with an error (pack writes for that entry may already have applied). Set `MAINTAINER_DISCORD_USER_ID` in `.env` to attribute imports to your Discord user.

**Deletes:** `npm run delete-packs -- --slugs test-pack` (cannot delete the default pack). Delete also fails closed if audit insert fails — the pack may already be gone with no audit row; fix audit write access and note the gap, then re-run `npm run register-commands` afterward.

Do not commit proprietary pack configs to a public repo unless intended.
