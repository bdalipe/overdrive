# Changelog

All notable changes to Overdrive are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

> **Maintainers:** Before every `feature/*` → `develop` PR, add a dated `## [X.Y.Z]` section for the **target** version (after CI bump), set `package.json` to the pre-bump base, and sync [README.md](README.md) (version line, status, setup). The [Version Bump workflow](.github/workflows/version-bump.yml) updates **`package.json` only** (and creates a version tag); it does **not** edit this file or the README.

## [Unreleased]

### Changed (post-M1 harden-hygiene → target `0.2.3`)
- Pack-config / car-pool `getOrLoad` coalesces concurrent cache misses (one in-flight loader per key)
- Cache `filter` / `explicit_ids` eligibility pools (TTL + hash key); cleared with car-pool invalidate / `/admin clear-cache`
- Pack config invalidate clears `pack:default` only when the target pack is the default
- `register-commands` fails when there are no active packs (no fake `/open-pack` `default` choice)
- Shared pack eligibility/mutation `VALID_*` allowlists via `models/pack.js` (repository imports them)
- Roadmap renumber: Discord pack-admin phase collapsed into Phase 1; card composition → Phase 2 (`0.3.0`), performance → Phase 3 (`0.4.0`), collection + Wispbyte → Phase 4 (`0.5.0`); Gauntlet noted under future live-race phase

### Planned (Phase 2+)
- Modular card image composer (per-component toggles; performance block off by default)
- Multi-embed / multi-message pack openings (raise `pack_size` past single-message limits safely)
- Probe or re-check trusted Supabase Storage public URLs so missing objects do not embed as broken images
- Bound concurrent image reachability probes when validating non-trusted URLs
- Keep pack eligibility filter logic aligned between in-memory and SQL paths
- Phase 3: Tracksets, draft performance calculator, bulk recalc, `/calc-performance`
- Phase 4: Garage, wishlist, profile, Wispbyte prod deploy; RLS deny-by-default before non–service-role clients
- Phase 5+: Economy; upgrades; live races & **Gauntlet** (high-risk currency run: N cars / N rounds, one use each, fog-of-war later rounds, cash-out vs push, loss → nothing); campaign

### Deferred
- Metrics start/complete for modals/autocomplete when those interaction types are added
- Imperial/metric display toggle
- Optional automated tests for formatters, import normalization, and pack stats event builders
- Optional: automate CHANGELOG/README edits in the version-bump workflow (currently author-owned on feature PRs)
- Phase 2/3 placeholders remain intentional: `assets/card/`, `docs/performance-formulas-draft.md`
- Car catalog true partial-patch imports (full-row upsert replaces omitted fields today)
- Faster batch serial-id allocation for large `import-cars` / `seed-stubs` drops

---

## [0.2.2] - 2026-07-13

Post-M1 pack/cache integrity follow-up. `package.json` is set to `0.2.1` on this branch so the automated patch bump on merge to `develop` lands at `0.2.2`. Apply migration `007_pack_integrity_guards.sql` (`supabase db push`) and re-run `npm run register-commands` for `/admin clear-cache`.

### Added
- `/admin clear-cache` — clears this bot process pack config, car pool, and image probe caches
- Migration `007_pack_integrity_guards.sql` — `pack_size` CHECK (1–50) and `BEFORE DELETE` trigger blocking default-pack deletion
- `scripts/lib/bot-cache-hint.js` — warns after catalog scripts that in-process invalidate does not reach the live bot

### Changed
- Catalog scripts log `bot_cache_refresh_hint` after invalidate (use `/admin clear-cache`, restart, or ~60s TTL)
- `import-cars` / `seed-stubs` invalidate the car pool after writes; `import-packs` no longer clears the car pool
- Cap `pack_size` at **1–50** (`MAX_PACK_SIZE`) in app and DB; pack summary embed truncates at Discord’s 4096-character description limit
- `/open-pack` reveal sessions keyed by **message id** (concurrent opens no longer clobber each other’s buttons)
- Failed pack **creates** roll back the new pack row (CASCADE children); earlier creates in the same drop also roll back if a later entry fails (drop stays pending)

### Documentation
- README: admin clear-cache, restart/TTL table, `pack_size` / default-delete / session and import rollback notes; setup mentions migration `007`
- Pack drops README: `pack_size` 1–50 and create-rollback / manifest behavior

---

## [0.2.1] - 2026-07-10

Post-M1 correctness follow-up (catalog pagination and pack open/import guards).

### Fixed
- Paginate `cars.listAll` / `findEligible` past PostgREST row caps
- `100%` pack mutations bypass eligibility; unresolved guarantees log; bonuses outside eligibility rejected at `import-packs`
- Import rejects when guarantee count exceeds `pack_size`
- Weighted rarity miss falls back to uniform pick among pool rarities; opens fail if card count ≠ `pack_size` (stats `packSize` matches configured size)
- Warn when active packs exceed Discord’s 25 `/open-pack` choices (`import-packs` + `register-commands`)

---

## [0.2.0] - 2026-07-10

Phase 1 M1 complete: pack catalog drops, multi-pack opens, eligibility query, delete APIs, audit log. `package.json` is set to `0.1.6` on this branch so the automated minor bump on merge to `develop` lands at `0.2.0`.

### Added
- `data/packs/` — manifest + drops README; `npm run import-packs` for create/patch pack definitions, rates, eligibility, mutations
- `scripts/lib/drop-manifest.js` — shared manifest helper for car and pack catalogs
- `src/models/pack.js`, `src/services/pack-import.js` — pack drop normalization and import apply path
- `config_change_events` migration (`006`) + `config-change-repository` — mandatory audit log for catalog imports and deletes
- `src/services/config-change-events.js` — car/pack import + delete event builders; `MAINTAINER_DISCORD_USER_ID` attribution
- `/admin` — `debug-latency` only (pack slash admin removed in favor of drops)
- `/open-pack` — required `pack` option with a fixed Discord **choice list** of active packs (display name → slug); registered from DB at `register-commands` time
- `cars.findEligible` — DB-side eligibility for filter / explicit_ids packs; `all_cars` still uses cached `listAll`
- Car/pack delete APIs: `deleteById` / `deleteByIds` / `deleteStubs` (cars); `deleteById` / `deleteBySlug` (packs, blocks default)
- Maintainer scripts: `npm run delete-cars`, `delete-packs`, `clear-stubs` (audit to `config_change_events`)

### Changed
- Pack create/edit/mutations Discord admin commands **removed** — replaced by `import-packs` drops (same pattern as cars)
- `import-cars` logs each applied drop to `config_change_events`
- Car and pack drops README templates list **every** DB column with examples
- `register-commands` loads active packs from Supabase so `/open-pack` pack choices stay in sync (no longer DB-free)
- `pack-service.generatePack` uses `loadEligibleCars` / `findEligible` for non-`all_cars` packs
- Phase 2 themed-pack admin UX absorbed into Phase 1 catalog drops

### Documentation
- README: Phase 1 M1 complete; pack/car import + delete scripts; open-pack choice picker; structure and roadmap synced

---

## [0.1.6] - 2026-07-07

Phase 1 open-path latency polish. `package.json` is set to `0.1.5` on this branch so the automated patch bump on merge to `develop` lands at `0.1.6`.

### Added
- `image-url.js` — reachability cache (10 min default TTL); trusted skip for Supabase Storage public object URLs; `clearImageUrlCache()`, `isTrustedSupabaseStorageUrl()`
- `pack-service.js` — `loadAllCars()` / `invalidateCarPool()` for 60s `listAll` pool cache (shared with pack-config cache)
- `open-pack.js` — `insertPackOpenStats`; parallel `stats.insertEvents` + `applyReachableImageUrls` after `generatePack`

### Changed
- Image probe default timeout **5000 → 2000** ms (`IMAGE_PROBE_TIMEOUT_MS`, `IMAGE_PROBE_CACHE_TTL_MS`, `IMAGE_PROBE_FORCE` in `.env.example`)

### Documentation
- README: latency checklist merged into Phase 1; optional image-probe env vars; design principles updated

---

## [0.1.5] - 2026-07-06

Phase 1 pack simulator (M1): weighted pack generation, interim reveal UX, pagination performance, pack config caching, stats events, and image URL fallback. `package.json` is set to `0.1.4` on this branch so the automated patch bump on merge to `develop` lands at `0.1.5`.

### Added
- `src/services/drop-rate-service.js` — weighted rarity rolls with DB rates + `DEFAULT_RARITY_WEIGHTS` fallback
- `src/services/pack-service.js` — `generatePack`, eligibility pool (`listAll`), mutation guarantees/bonuses, `loadPackConfig` / `invalidatePackConfig`
- `src/services/pack-config-cache.js` — in-memory cache (60s TTL) for pack row, drop rates, eligibility, mutations
- `src/services/pack-stats-events.js` — `buildPackOpenStatsEvents` (`pack_open` + per-card `pull` payloads)
- `src/services/index.js` — `createServices(repositories)` factory
- `src/shared/image-url.js` — `isImageUrlReachable`, `applyReachableImageUrls` (HEAD + GET fallback)
- `src/renderers/pack-reveal.js` — card pages (low→high rarity), summary page (high→low), `formatPackRevealTitle`
- `src/repositories/car-repository.js` — `listAll()` for default-pack pool
- `src/shared/theme.js` — `RARITY_EMBED_COLORS` (1★–6★) and `getRarityEmbedColor()`
- Bot boot wires `createServices` on runtime config; `servicesReady: true` in `bot_online` log
- `/open-pack` — `deferReply` → `generatePack` → stats insert → paginated reveal with **Skip** (green) to summary
- Prebuilt Discord payloads per page at open time (Prev/Next/Skip reuse cached embeds + button rows)
- 15-minute in-memory reveal sessions keyed by opener user id
- Stats: `stats_events` rows on each open (`pack_open` + `pull` per card); failures logged without blocking reveal

### Changed
- `/open-pack` no longer uses placeholder embeds; uses `pack-reveal.js` (title + optional `image_url` only until Phase 3)
- Card footer `Card N of M` counts cards only (summary page excluded from M); summary footer is `Summary · {packSlug}`
- `src/interactions/pagination.js` — Skip button (`skip` custom ID); optional `getPayload` for prebuilt pages
- `src/renderers/embeds.js` — module comment: lightweight/admin embeds only (`/hello`, debug latency)

### Documentation
- README: pack-simulator complete, checklists, Supabase Storage workflow, latency notes, project structure
- Catalog drops README: `image_url`, full-row upsert warning, Supabase public URLs

---

## [0.1.4] - 2026-07-06

Phase 1 data layer: domain model, repositories, Supabase boot wiring, and catalog maintainer scripts. `package.json` is set to `0.1.3` on this branch so the automated patch bump on merge to `develop` lands at `0.1.4`.

### Added
- `src/models/car.js` — `formatStat`, `setNumericStat`, `normalizeCarForDb`, `createStubCar` (Unavailable / N/A semantics)
- `src/renderers/card-display.js` — `buildCardDisplay`, `buildCardEmbedFields`, `formatRarityStars`
- `src/shared/generate-serial-id.js` — random 6-digit IDs with collision retry (reserves pack `100000`)
- `src/repositories/` — car, pack, and stats repositories; `createRepositories(supabase)`
- Bot boot wires `createSupabaseClient` and `repositories` on runtime config
- `scripts/import-cars.js`, `scripts/seed-stubs.js`, `scripts/lib/catalog.js`
- `npm run import-cars`, `npm run seed-stubs`

### Changed
- Bot startup now requires `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (fail fast before Discord login)
- `register-commands.js` remains DB-free

### Documentation
- README: data-layer status, project structure, Supabase required at boot, catalog scripts, Phase 1 roadmap checkboxes

---

## [0.1.3] - 2026-07-03

Phase 1 schema scaffolding and Supabase client prep. `package.json` is set to `0.1.2` on this branch so the automated patch bump on merge to `develop` lands at `0.1.3`. Versions `0.1.1` and `0.1.2` were not published (version-bump CI did not run for those increments).

### Added
- Phase 1 Supabase migrations (`001`–`005`): `cars`, `pack_definitions`, `pack_drop_rates`, `pack_eligibility`, `pack_mutations`, `stats_events`
- 6-digit serial IDs (`100000`–`999999`) for cars and packs; default pack reserved as `100000`
- Persistent `pack_mutations` (guarantee at `100%`; bonus % with optional `rarity_gate`)
- Catalog layout: `data/catalog/manifest.json` and `data/catalog/drops/` (import scripts planned)
- `@supabase/supabase-js` dependency
- `src/shared/supabase.js` — `createSupabaseClient` (validates credentials on use; not required at bot boot yet)
- `loadEnv()` exposes `supabaseUrl` and `supabaseSecretKey` (`SUPABASE_SECRET_KEY`, with legacy `SUPABASE_SERVICE_ROLE_KEY` alias)

### Fixed
- Unknown slash commands and unmatched buttons reply with an ephemeral message instead of timing out silently

### Documentation
- README: Supabase env vars, Phase 1 setup (`supabase link` / `db push`), Phase 1 status in progress, planned `scripts/` paths
- Schema/design: random 6-digit IDs with collision retry; pack mutations persist until admin remove
- Catalog import: JSON content drops + manifest (`applied` / `pending` tracking)
- Expanded roadmap to Phases 0–5: card composition (Phase 3) and performance engine (Phase 4) before collection
- Added `assets/card/example_template.png` (non-final layout reference)
- Added `docs/performance-formulas-draft.md` for Phase 4 formula workshopping
- Draft performance class bands: P (1000+), S (900–999), A (800–899), B (700–799), C (600–699), D (500–599), E (400–499), F (≤399)

---

## [0.1.0] - 2026-07-01

### Added
- Modular bot architecture (`commands/`, `interactions/`, `renderers/`, `shared/`)
- Slash commands: `/hello`, `/open-pack` (5-page placeholder pagination)
- Dev/prod runtime config via `BOT_ENV` and `.env.{dev|prod}` pattern
- Global interaction error boundary with user-safe failure message
- Latency instrumentation (`interaction_start`, `response_sent`, 800ms warn threshold)
- `npm run dev`, `dev:register`, `register-commands` scripts
- GitHub Actions version-bump workflow on merge to `develop` (PR labels)
- GitHub repo with `main` / `develop` branching

### Changed
- Migrated from message-based handler to slash commands + component buttons

### Documentation
- README development status, setup, versioning, and phased roadmap

[Unreleased]: https://github.com/bdalipe/overdrive/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/bdalipe/overdrive/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/bdalipe/overdrive/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/bdalipe/overdrive/compare/v0.1.6...v0.2.0
[0.1.6]: https://github.com/bdalipe/overdrive/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/bdalipe/overdrive/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/bdalipe/overdrive/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/bdalipe/overdrive/compare/v0.1.0...v0.1.3
[0.1.0]: https://github.com/bdalipe/overdrive/releases/tag/v0.1.0
