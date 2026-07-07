# Changelog

All notable changes to Overdrive are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

> **Maintainers:** Before every `feature/*` → `develop` PR, add a dated `## [X.Y.Z]` section for the **target** version (after CI bump), set `package.json` to the pre-bump base, and sync [README.md](README.md) (version line, status, setup). The [Version Bump workflow](.github/workflows/version-bump.yml) updates **`package.json` only** (and creates a version tag); it does **not** edit this file or the README.

## [Unreleased]

### Planned
- Phase 1 admin: pack mutations UX with drop-rate validation (`feature/p1-admin-default-pack`); call `invalidatePackConfig` after edits
- Phase 1 latency polish (`feature/p1-latency-polish`): image URL reachability cache; trusted Supabase Storage host skip; parallel stats insert + image validation on open; shorter probe timeout (~1.5–2s); short-TTL `listAll` / eligible car pool cache
- Phase 2: `car-repository.findEligible`, themed pack admin + user pack picker (15–20 pack UX)
- Phase 3: Modular card image composer (per-component toggles; performance block off by default)
- Phase 4: Tracksets, draft performance calculator, bulk recalc, `/calc-performance`
- Phase 5: Garage, wishlist, profile, Wispbyte prod deploy

### Deferred
- Metrics start/complete for modals/autocomplete when those interaction types are added
- Car delete API / `clear-stubs` maintainer script
- Imperial/metric display toggle
- Optional automated tests for formatters and import normalization
- Optional: automate CHANGELOG/README edits in the version-bump workflow (currently author-owned on feature PRs)
- Phase 3/4 placeholders remain intentional: `assets/card/`, `docs/performance-formulas-draft.md`

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
- Implementation plans: stat display semantics, multi-pack model, phased card composition and performance engine

[Unreleased]: https://github.com/bdalipe/overdrive/compare/v0.1.5...develop
[0.1.5]: https://github.com/bdalipe/overdrive/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/bdalipe/overdrive/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/bdalipe/overdrive/compare/v0.1.0...v0.1.3
[0.1.0]: https://github.com/bdalipe/overdrive/releases/tag/v0.1.0
