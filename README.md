# Overdrive!

Discord bot for collecting cars through pack openings, garages, and community features — inspired by Top Drives-style card collection.

**Version:** `0.0.1` (pre-release)

---

## Development status

> **Maintainers:** Update this section whenever a phase milestone or major feature lands. Keep command lists, setup notes, and checklists in sync with the codebase.

| Phase | Milestone | Status |
|-------|-----------|--------|
| **0** — Foundation | M0: bot skeleton, `/hello`, `/open-pack` placeholder, VM hosting | In progress |
| **1** — Pack simulator | M1: weighted packs, admin tuning, stats events | Not started |
| **2** — Collection & profile | M2: garage, wishlist, profile, card templates | Not started |

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
| `/open-pack` placeholder pagination | Pending |
| Oracle Always Free VM + PM2 deployment | Pending |
| Prod bot runtime profile | Pending |

### Commands available today

| Command | Description |
|---------|-------------|
| `/hello` | Greeting embed with current environment (`dev` / `prod`) |

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
| `npm start` | Run bot once (used on VM / PM2) |
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
├── interactions/         # Router (dispatch, errors, metrics)
├── renderers/            # Embeds and future card UI
└── shared/               # Config, logger, metrics, errors
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

Prod bot and VM hosting are planned for later in Phase 0. Local development uses the dev bot only for now.

---

## Branching

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready releases |
| `develop` | Integration and testing |
| `feature/*` | Short-lived work merged into `develop` |

PRs into `develop` should include a **version label** (see [Versioning](#versioning)).

Promotion flow: `develop` → validate on dev bot → PR to `main` → prod deploy.

---

## Versioning

Overdrive uses [Semantic Versioning](https://semver.org/) in `package.json` (`0.x.y` during Phases 0–2).

### Automated bumps (merge to `develop`)

When a PR into **`develop`** is merged, the [Version Bump workflow](.github/workflows/version-bump.yml) runs:

1. Reads PR labels to choose bump type.
2. Runs `npm version patch|minor|major`.
3. Pushes the commit and `v*` tag to `develop`.

**Do not** run `npm version` on feature branches — let CI handle it at merge time.

| Label | When to use |
|-------|-------------|
| `version:patch` | Fixes, small changes, docs |
| `version:minor` | New command or feature slice |
| `version:major` | Breaking changes (rare in `0.x`) |

Default if no label: **patch**.

### Creating labels on GitHub

Labels are **not** under **Settings** in the sidebar. Use either:

- **Direct URL:** [github.com/bdalipe/overdrive/labels](https://github.com/bdalipe/overdrive/labels)
- **Issues tab** → **Labels** (if Issues are enabled for the repo)

Create three labels: `version:patch`, `version:minor`, `version:major`.

### Promotion to `main`

- Merge `develop` → `main` when ready for prod.
- Deploy from `main` and match prod to the latest `v*` tag on that branch.

---

## Roadmap (Phases 0–2)

### Phase 0 — Foundation
- [x] Modular architecture, `/hello`, dev tooling
- [x] Initial commit + GitHub (`main` / `develop`)
- [x] SemVer automation (GitHub Actions)
- [ ] `/open-pack` placeholder pagination
- [ ] Always-on VM hosting (PM2)
- [ ] Prod bot runtime profile

### Phase 1 — Pack simulator
- [ ] Nullable car schema (Supabase)
- [ ] Weighted pack generation (configurable size)
- [ ] Paginated pack reveal (low → high rarity)
- [ ] Admin drop-rate / debug commands
- [ ] Stats event tracking

### Phase 2 — Collection & profile
- [ ] Garage persistence (duplicate stacks)
- [ ] Card template rendering
- [ ] Garage sort / filter / reset
- [ ] `/view-card`, wishlist, settings, profile

Phases 3+ (economy, upgrades, events, campaign) are outlined in the design document but out of scope for the current README cycle.

---

## Design principles

- **Sub-1s** interaction latency target for common commands
- **Modular** layers — avoid monolithic command files
- **No dev-generated car content** — car metadata is supplied by maintainers later
- **Future web portability** — domain logic separated from Discord-specific wiring

---

## License

ISC
