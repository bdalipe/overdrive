# Catalog content drops

JSON files in this folder are **content drops** — new cars or patches applied via `npm run import-cars` (or `node scripts/import-cars.js`).

## Drop file format

Each file is a JSON object:

```json
{
  "dropId": "001-initial",
  "description": "Optional label for maintainers",
  "cars": [
    {
      "id": 482917,
      "rarity": 3,
      "performance": null,
      "performance_class": null,
      "make": "Porsche",
      "model": "911",
      "zero_to_sixty": 3.2,
      "zero_to_sixty_status": "available",
      "top_speed": 191,
      "top_speed_status": "available",
      "handling": 88,
      "handling_status": "available",
      "weight": 3350,
      "weight_status": "available",
      "drive_type": "AWD",
      "tyre_type": "Performance",
      "body_style": "Coupe",
      "country": "Germany",
      "model_year": 2024,
      "tag": "supercar",
      "description": "Optional flavor text for maintainers",
      "image_url": "https://<project-ref>.supabase.co/storage/v1/object/public/car-images/482917.jpg"
    }
  ]
}
```

### `cars` table — all fields

| Field | Required | Notes |
|-------|----------|-------|
| `id` | No | 6-digit `100000`–`999999`. Omit on new cars for auto-assign (`100000` reserved for default pack) |
| `rarity` | **Yes** | `1`–`6` |
| `performance` | No | Nullable until Phase 4 calculator |
| `performance_class` | No | Nullable until Phase 4 |
| `make` | No | |
| `model` | No | |
| `zero_to_sixty` | No | Seconds; pair with `zero_to_sixty_status` |
| `zero_to_sixty_status` | No | `available` \| `unavailable` \| `not_applicable` (default `unavailable`) |
| `top_speed` | No | mph; pair with `top_speed_status` |
| `top_speed_status` | No | `available` \| `unavailable` \| `not_applicable` |
| `handling` | No | Pair with `handling_status` |
| `handling_status` | No | `available` \| `unavailable` \| `not_applicable` |
| `weight` | No | lbs (imperial default); pair with `weight_status` |
| `weight_status` | No | `available` \| `unavailable` \| `not_applicable` |
| `drive_type` | No | e.g. `AWD`, `RWD` |
| `tyre_type` | No | |
| `body_style` | No | e.g. `Coupe`, `SUV` |
| `country` | No | |
| `model_year` | No | |
| `tag` | No | Freeform maintainer tag |
| `description` | No | |
| `image_url` | No | Public HTTPS URL; prefer Supabase Storage |
| `created_at` | — | DB-managed; do not set in drops |

- Set numeric stat + `*_status` together (`handling` + `handling_status: "available"`).
- Use `normalizeCarForDb` rules: omitted numeric stats default to unavailable.

### Full-row upsert warning

`import-cars` upserts the **entire car row** from each JSON object. Omitted fields are written as `null` / defaults and can **wipe** existing DB values. Patch drops must include every field you intend to keep, not only the fields you are changing.

## Manifest

`data/catalog/manifest.json` tracks which drops have been applied. `import-cars` moves filenames from `pending` to `applied` and sets `lastUpdated` after a successful run. Use `manifest.{BOT_ENV}.json` when dev and prod catalogs diverge.

## Audit log

Every successful import appends a row to `config_change_events` (`source: import-cars`, `entity_type: car`). If the audit insert fails, `import-cars` exits with an error (catalog upsert may already have applied). Set `MAINTAINER_DISCORD_USER_ID` in `.env` to attribute imports to your Discord user.

**Deletes:** `npm run delete-cars -- --ids … [--force]` or `npm run clear-stubs` (rows with null make and model).

`delete-cars` **refuses** when any id is referenced by `pack_mutations.target_car_id` or `pack_eligibility.explicit_car_ids`. Re-run with `--force` after reviewing the listed packs (mutations **CASCADE** away; explicit ids keep dead entries until a pack patch).

Delete scripts fail closed if the audit insert fails. If that happens **after** rows were deleted, the script logs `deleted_but_unaudited` and exits non-zero: data is already gone, fix `config_change_events` write access, and **do not re-delete** the same ids — the trail is incomplete.

**Pack references:** prefer patching packs (or accepting `--force`) before mass deletes.

Do not commit proprietary catalog drops to a public repo unless intended.
