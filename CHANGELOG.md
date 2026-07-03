# Changelog

All notable changes to Overdrive are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

> **Maintainers:** Before every `feature/*` → `develop` PR, add a dated `## [X.Y.Z]` section for the **target** version (after CI bump), set `package.json` to the pre-bump base, and sync [README.md](README.md) (version line, status, setup). The [Version Bump workflow](.github/workflows/version-bump.yml) updates **`package.json` only** (and creates a version tag); it does **not** edit this file or the README.

## [Unreleased]

### Planned
- Phase 1 (remaining): Unavailable/N/A display, default-pack simulator, catalog import scripts, admin pack mutations UX
- Phase 2: Themed pack admin + user pack picker (15–20 pack UX)
- Phase 3: Modular card image composer (per-component toggles; performance block off by default)
- Phase 4: Tracksets, draft performance calculator, bulk recalc, `/calc-performance`
- Phase 5: Garage, wishlist, profile, Wispbyte prod deploy

### Deferred (cleanup audit follow-ups)
- Wire `createSupabaseClient` at bot boot and fail fast when DB-backed commands ship (CLN-002, CLN-003)
- Add `scripts/import-cars.js` and `scripts/seed-stubs.js` with catalog import (CLN-005 code path)
- Metrics start/complete for modals/autocomplete when those interaction types are added (CLN-011)
- Optional: automate CHANGELOG/README edits in the version-bump workflow (currently author-owned on feature PRs)
- Phase 3/4 placeholders remain intentional: `assets/card/`, `docs/performance-formulas-draft.md`

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

[Unreleased]: https://github.com/bdalipe/overdrive/compare/v0.1.3...develop
[0.1.3]: https://github.com/bdalipe/overdrive/compare/v0.1.0...v0.1.3
[0.1.0]: https://github.com/bdalipe/overdrive/releases/tag/v0.1.0
