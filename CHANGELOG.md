# Changelog

All notable changes to Overdrive are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

> **Maintainers:** Update the `[Unreleased]` section as work lands on `develop`. On each automated version bump (merge to `develop`), move `[Unreleased]` items into a new `## [X.Y.Z] - YYYY-MM-DD` section and sync the version line in [README.md](README.md).

## [Unreleased]

### Planned
- Phase 1: Supabase schema, Unavailable/N/A display, default-pack simulator, multi-pack DB architecture
- Phase 2: Themed pack admin + user pack picker (15–20 pack UX)
- Phase 3: Modular card image composer (per-component toggles; performance block off by default)
- Phase 4: Tracksets, draft performance calculator, bulk recalc, `/calc-performance`
- Phase 5: Garage, wishlist, profile, Wispbyte prod deploy

### Documentation
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

[Unreleased]: https://github.com/bdalipe/overdrive/compare/v0.1.0...develop
[0.1.0]: https://github.com/bdalipe/overdrive/releases/tag/v0.1.0
