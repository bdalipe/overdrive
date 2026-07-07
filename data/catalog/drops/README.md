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
      "make": "Porsche",
      "model": "911",
      "year": 2024,
      "image_url": "https://<project-ref>.supabase.co/storage/v1/object/public/car-images/482917.jpg",
      "handling": 88,
      "handling_status": "available",
      "zero_to_sixty_status": "unavailable"
    }
  ]
}
```

- **`rarity` is required** on every car (1–6).
- Omit `id` on new cars to let the import script assign a random 6-digit id in `100000`–`999999` (collision retry; excludes reserved default pack id `100000`).
- Include `id` in patch drops to upsert existing rows.
- Set value + `*_status` together (`handling` + `handling_status: "available"`).
- **`image_url`** — optional public HTTPS URL for pack reveal embeds. Prefer Supabase Storage (public bucket); crop to 16:9 and keep under ~800 KB before upload. Unreachable URLs are omitted at open time (see `src/shared/image-url.js`). See README **Car images (Supabase Storage)**.

### Full-row upsert warning

`import-cars` upserts the **entire car row** from each JSON object. Omitted fields are written as `null` / defaults and can **wipe** existing DB values. Patch drops must include every field you intend to keep, not only the fields you are changing.

## Manifest

`data/catalog/manifest.json` tracks which drops have been applied. `import-cars` moves filenames from `pending` to `applied` and sets `lastUpdated` after a successful run. Use `manifest.{BOT_ENV}.json` when dev and prod catalogs diverge.

Do not commit proprietary catalog drops to a public repo unless intended.
