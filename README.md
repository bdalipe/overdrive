# Overdrive!

Discord bot for collecting cars through pack openings, garages, and community features — inspired by Top Drives-style card collection.

**Version:** `0.1.0` (M0 complete — Phase 1 next)

See [CHANGELOG.md](CHANGELOG.md) for release history. Update **both** this file and the changelog on each version bump.

---

## Development status

> **Maintainers:** Update this section and [CHANGELOG.md](CHANGELOG.md) whenever a phase milestone or major feature lands. Keep command lists, setup notes, and checklists in sync with the codebase.

| Phase | Milestone | Status |
|-------|-----------|--------|
| **0** — Foundation | M0: bot skeleton, `/hello`, `/open-pack` placeholder, dev/prod config | **Complete** |
| **1** — Pack simulator | M1: default-pack simulator, Unavailable/N/A display, multi-pack **schema** | Not started |
| **2** — Pack definitions | M2: themed packs (admin create/configure), user pack picker (15–20 packs) | Not started |
| **3** — Card composition | M3: modular card image composer, per-component toggles, pack reveal images | Not started |
| **4** — Performance engine | M4: tracksets, performance calculator, bulk recalc, `/calc-performance` | Not started |
| **5** — Collection & profile | M5: garage, wishlist, profile, view-card, **Wispbyte prod deploy** | Not started |

### Phase 0 checklist

| Item | Status |
|------|--------|
| Modular project structure (`commands/`, `interactions/`, `renderers/`, `shared/`) | Done |
| Slash commands (message-based handler removed) | Done |
| Environment-aware config (`BOT_ENV`, dev/prod-ready) | Done |
| `/hello` command | Done |
| Dev watch scripts (`npm run dev`, `dev:register`) | Done |
| Error boundary + latency logging | Done |
| Initial git commit + GitHub (`main` / `develop`) | Done |
| SemVer automation (GitHub Actions + PR labels) | Done |
| `/open-pack` placeholder pagination (5 slots, Prev/Next) | Done |
| Prod-ready runtime config (`BOT_ENV`, `.env.prod` pattern) | Done |
| Local dev workflow for testing (`npm run dev`, dev bot + test guild) | Done |

**Hosting:** Production deployment on [Wispbyte](https://wispbyte.com/store/discord) is planned at **end of Phase 5** (after M5). Phases 0–4 use the **dev bot on your PC**.

### Commands available today

| Command | Description |
|---------|-------------|
| `/hello` | Greeting embed with current environment (`dev` / `prod`) |
| `/open-pack` | 5-page placeholder pack reveal with Previous/Next buttons |

---

## Requirements

- [Node.js](https://nodejs.org/) 18+ (for `node --watch` in dev scripts)
- A Discord application with a bot token ([Developer Portal](https://discord.com/developers/applications))
- Bot invited to a test server with `applications.commands` scope

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `BOT_ENV` | No (defaults to `dev`) | Runtime profile: `dev` or `prod` |
| `DISCORD_BOT_TOKEN` or `TOKEN` | Yes | Bot token from Developer Portal |
| `DISCORD_CLIENT_ID` | For registration | Application ID (General Information) |
| `DISCORD_GUILD_ID` | Recommended in dev | Test server ID — guild commands update instantly |

Optional: use `.env.dev` / `.env.prod` for separate files per environment. `loadEnv()` reads `.env.{BOT_ENV}` first, then `.env`.

**Never commit `.env` or real tokens.**

### 3. Register slash commands

Guild-scoped (recommended for development):

```powershell
# PowerShell
$env:BOT_ENV="dev"; npm run register-commands
```

```bash
# bash
BOT_ENV=dev npm run register-commands
```

Re-run registration when you **add, rename, or change options** on a slash command. Handler-only changes do not require re-registration.

### 4. Run the bot

**Local development (auto-restart on save):**

```bash
npm run dev
```

**First-time setup (register + dev):**

```bash
npm run dev:register
```

**Production-style (no watch):**

```bash
npm start
```

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run bot once (used on Wispbyte / production-style runs) |
| `npm run dev` | Run bot with `node --watch` — restarts on file save |
| `npm run register-commands` | Push slash command definitions to Discord (uses `BOT_ENV`) |
| `npm run dev:register` | Register commands, then start dev watch mode |

### When to re-register vs restart

| Change | Re-register? | Restart bot? |
|--------|--------------|--------------|
| Command handler logic (replies, embeds) | No | Yes (or auto via `dev`) |
| New / renamed slash command | **Yes** | Yes after register |
| `.env` token or guild ID | No | Yes |

---

## Project structure

```
src/
├── index.js              # Client bootstrap, event wiring
├── register-commands.js  # One-off slash command registration (REST)
├── commands/             # Slash command handlers + registry
├── interactions/         # Router, pagination, pack picker (Phase 2+)
├── renderers/            # Embeds; card/ components (Phase 3+)
└── shared/               # Config, logger, metrics, errors
assets/card/              # Reference sketch + future card art
docs/                     # Draft specs (e.g. performance formulas)
```

- **Registration** (`register-commands.js`) tells Discord which commands exist (HTTP REST).
- **Runtime** (`index.js`) handles interactions when users run commands (WebSocket Gateway).

---

## Dev / prod model

One codebase, two bot runtimes (separate Discord applications):

| | Dev | Prod |
|---|-----|------|
| Branch | `develop` | `main` |
| Credentials | Dev token, dev guild | Prod token, live guild |
| Registration | `BOT_ENV=dev npm run register-commands` | `BOT_ENV=prod npm run register-commands` |
| Hosting (Phases 0–4) | Local PC (`npm run dev`) | Not deployed yet |
| Hosting (end of Phase 5) | Local PC (dev bot) | Wispbyte Tier 1+ (24/7 prod bot) |

During Phases 0–4, run the **dev bot locally**. Deploy the **prod bot to Wispbyte** once Phase 5 (M5) is complete.

---

## Hosting (Wispbyte — end of Phase 5)

Production hosting uses **Wispbyte** Discord bot hosting (Tier 1 or higher recommended; consider more RAM once card composition is live).

| Concern | Approach |
|---------|----------|
| **When** | After M5 acceptance |
| **What deploys** | **Prod bot only** (`BOT_ENV=prod`, `main` branch) |
| **Dev bot** | Stays on your PC (`npm run dev`) |
| **Start command** | `npm start` |
| **Secrets** | Wispbyte panel — never commit |

**Pre-deploy checklist (M5):** merge to `main`, register prod commands, smoke-test packs (with composed cards), garage, `/calc-performance`, profile, wishlist; verify panel auto-restart.

---

## Branching

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready releases |
| `develop` | Integration and testing |
| `feature/*` | Short-lived work merged into `develop` |

PRs into `develop` should include a **version label** and update **[CHANGELOG.md](CHANGELOG.md)**.

---

## Versioning

Overdrive uses [Semantic Versioning](https://semver.org/) in `package.json` (`0.x.y` during Phases 0–5).

### Changelog discipline

- Add entries under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) as features merge to `develop`.
- The [Version Bump workflow](.github/workflows/version-bump.yml) updates **`package.json` only** (and creates a version tag). It does **not** edit CHANGELOG or this README.
- After CI bumps the version, maintainers manually move `[Unreleased]` into a dated `## [X.Y.Z]` section in CHANGELOG and update the **Version** line at the top of this README (or automate that in a follow-up workflow).

### Automated bumps (merge to `develop`)

See [Version Bump workflow](.github/workflows/version-bump.yml). Default label if none: **patch**.

| Label | When to use |
|-------|-------------|
| `version:patch` | Fixes, small changes, docs |
| `version:minor` | New command or feature slice |
| `version:major` | Breaking changes (rare in `0.x`) |

---

## Roadmap (Phases 0–5)

### Phase 0 — Foundation ✅
- [x] Modular architecture, `/hello`, dev tooling, SemVer CI
- [x] `/open-pack` placeholder pagination
- [x] Dev/prod config + local dev workflow

### Phase 1 — Pack simulator
- [ ] Nullable car schema + **Unavailable** / **N/A** display
- [ ] Multi-pack DB schema + default pack
- [ ] Weighted default-pack opens + stats events
- [ ] Text embed pack reveal (composed cards in Phase 3)

### Phase 2 — Pack definitions
- [ ] Admin themed-pack create/configure/disable
- [ ] User pack picker (15–20 packs, search/filter)

### Phase 3 — Modular card composition
- [ ] Per-component renderers (name, rarity, stats, optional performance block)
- [ ] Compose-all-then-display pipeline for embed images
- [ ] Component toggles (performance **off** until Phase 4)
- [ ] Reference layout: `assets/card/example_template.png` (non-final)

### Phase 4 — Performance engine
- [ ] Tracksets + per-stat weights + surface modifiers (draft rules)
- [ ] Weight derivation from trackset; calculator → rating 0–1000+ and class **P/S/A/B/C/D/E/F** (draft bands in [docs/performance-formulas-draft.md](docs/performance-formulas-draft.md))
- [ ] `/calc-performance` + bulk recalc on formula/weight changes
- [ ] Workshop: [docs/performance-formulas-draft.md](docs/performance-formulas-draft.md)

### Phase 5 — Collection & profile
- [ ] Garage, wishlist, settings, profile
- [ ] `/view-card` using card composer
- [ ] **Wispbyte prod deployment**

Phases 6+ (economy, upgrades, live races, campaign) — see parent implementation plan.

---

## Design principles

- **Sub-1s** interaction latency for common commands
- **Modular** layers — commands, services, repositories, renderers
- **No dev-generated car content**
- **Stat display** — unknown → **Unavailable**; not applicable → **N/A**
- **Card composition** — car photo base + separate overlay components; each toggleable
- **Performance in schema** nullable until Phase 4 calculator fills ratings
- **Multi-pack** — default + themed packs (schema Phase 1; UX Phase 2)
- **Future web portability** — domain logic isolated from Discord wiring

---

## License

ISC
