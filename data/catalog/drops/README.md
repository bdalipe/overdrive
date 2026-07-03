# Catalog content drops

JSON files in this folder are **content drops** — new cars or patches applied individually via `scripts/import-cars.js` (planned; not committed yet).

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
      "handling": 88,
      "handling_status": "available",
      "zero_to_sixty_status": "unavailable"
    }
  ]
}
```

- Omit `id` on new cars to let the import script assign a random 6-digit id in `100000`–`999999` (collision retry; excludes reserved default pack id `100000`).
- Include `id` in patch drops to upsert existing rows.
- Set value + `*_status` together (`handling` + `handling_status: "available"`).

## Manifest

`data/catalog/manifest.json` tracks which drops have been applied. When implemented, the import script will move filenames from `pending` to `applied` and set `lastUpdated` after a successful run.

Do not commit proprietary catalog drops to a public repo unless intended.
