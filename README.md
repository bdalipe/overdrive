# Overdrive!

Discord bot for collecting cars through pack openings, garages, and community features — inspired by Top Drives-style card collection.

**Version:** `0.1.4` (pack simulator complete; target `0.1.5` on merge to `develop` with `version:patch`)

See [CHANGELOG.md](CHANGELOG.md) for release history. Update **both** this file and the changelog on each version bump.

---

## Development status

> **Maintainers:** Update this section and [CHANGELOG.md](CHANGELOG.md) whenever a phase milestone or major feature lands. Keep command lists, setup notes, and checklists in sync with the codebase.

| Phase | Milestone | Status |
|-------|-----------|--------|
| **0** — Foundation | M0: bot skeleton, `/hello`, `/open-pack` pagination shell, dev/prod config | **Complete** |
| **1** — Pack simulator | M1: default-pack simulator, Unavailable/N/A display, multi-pack **schema** | **Complete** (admin UX: `feature/p1-admin-default-pack`) |
| **2** — Pack definitions | M2: themed packs (admin create/configure), user pack picker (15–20 packs) | Not started |
| **3** — Card composition | M3: modular card image composer, per-component toggles, pack reveal images | Not started |
| **4** — Performance engine | M4: tracksets, performance calculator, bulk recalc, `/calc-performance` | Not started |
| **5** — Collection & profile | M5: garage, wishlist, profile, view-card, **Wispbyte prod deploy** | Not started |

### Phase 0 checklist

| Item | Status |
|------|--------|
| Modular project structure (`commands/`, `interactions/`, `renderers/`, `shared/`; expanded in Phase 1 with `models/`, `repositories/`, `scripts/`) | Done |
| Slash commands (message-based handler removed) | Done |
| Environment-aware config (`BOT_ENV`, dev/prod-ready) | Done |
| `/hello` command | Done |
| Dev watch scripts (`npm run dev`, `dev:register`) | Done |
| Error boundary + latency logging | Done |
| Initial git commit + GitHub (`main` / `develop`) | Done |
| SemVer automation (GitHub Actions + PR labels) | Done |
| `/open-pack` pagination shell (Phase 0; replaced by real reveal in Phase 1) | Done |
| Prod-ready runtime config (`BOT_ENV`, `.env.prod` pattern) | Done |
| Local dev workflow for testing (`npm run dev`, dev bot + test guild) | Done |

### Phase 1 data-layer checklist

| Item | Status |
|------|--------|
| Supabase migrations + default pack seed | Done |
| `models/car.js` + `renderers/card-display.js` (Unavailable / N/A) | Done |
| `repositories/` + Supabase wired at bot boot | Done |
| `generate-serial-id.js`, `import-cars`, `seed-stubs` | Done |

### Phase 1 pack-simulator checklist

| Item | Status |
|------|--------|
| `drop-rate-service`, `pack-service`, `pack-config-cache`, `createServices` | Done |
| `/open-pack` → `generatePack`, interim reveal (`pack-reveal.js`) | Done |
| Rarity accent colors on reveal embeds (`shared/theme.js`) | Done |
| Skip-to-summary page + green Skip button; summary high→low rarity | Done |
| Prebuilt pagination payloads (faster Prev/Next/Skip) | Done |
| In-memory pack config cache (60s TTL: pack row, rates, eligibility, mutations) | Done |
| `pack-stats-events` (`pack_open` + per-card `pull`) | Done |
| Image URL fetch validation (omit dead links) | Done |
| Default-pack admin commands | Pending (`feature/p1-admin-default-pack`) |

**Hosting:** Production deployment on [Wispbyte](https://wispbyte.com/store/discord) is planned at **end of Phase 5** (after M5). Phases 0–4 use the **dev bot on your PC**.

### Commands available today

| Command | Description |
|---------|-------------|
| `/hello` | Greeting embed with current environment (`dev` / `prod`) |
| `/open-pack` | Open default pack: weighted pulls, paginated reveal (`Year Make Model (★★★)` + optional image), **Skip** to summary, rarity-colored embed accent; stats recorded to `stats_events` |

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
| `SUPABASE_URL` | Yes (bot boot) | Project URL from Supabase → Project Settings → API (`https://<ref>.supabase.co`) |
| `SUPABASE_SECRET_KEY` | Yes (bot boot) | Secret / service-role key (server-side only; never commit). Legacy alias: `SUPABASE_SERVICE_ROLE_KEY` |

Optional: use `.env.dev` / `.env.prod` for separate files per environment. `loadEnv()` reads `.env.{BOT_ENV}` first, then `.env`. See [`.env.example`](.env.example) for the full template.

**Never commit `.env` or real tokens / Supabase secret keys.**

Bot boot **requires** Supabase credentials (`SUPABASE_URL` + `SUPABASE_SECRET_KEY`). `createSupabaseClient` and `createServices` run at startup; handlers receive `repositories` and `services` on runtime config. `register-commands.js` stays DB-free. Seed or import a catalog before `/open-pack` (`npm run seed-stubs` or `npm run import-cars`).

### 3. Supabase (Phase 1+)

Apply schema migrations to your linked project (dev is enough until prod goes live):

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase login`.
2. From the repo root: `supabase link --project-ref <your-project-ref>`.
3. Apply migrations: `supabase db push`.
4. Copy **Project URL** and **secret** (or legacy **service_role**) key from Project Settings → API into `.env` / `.env.dev` as `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

Migrations live under `supabase/migrations/`. After `db push`, seed a dev catalog:

```bash
npm run seed-stubs              # sparse stubs (optional: -- --count 50)
npm run import-cars             # apply pending drops from data/catalog/drops/
```

See `data/catalog/drops/README.md` for drop JSON format and manifest workflow.

#### Car images (Supabase Storage)

Discord embeds need **public HTTPS** `image_url` values. External hosts work but are often slow; prefer hosting catalog photos in Supabase Storage:

1. **Dashboard:** Storage → create a **public** bucket (e.g. `car-images`; use separate buckets/prefixes for dev vs prod).
2. **Prepare assets:** crop/letterbox to **16:9** if desired; export JPEG/WebP, target **&lt; 800 KB** (smaller is better for paging latency).
3. **Upload** as `{car_id}.jpg` (or similar) under the bucket.
4. **Set `image_url`** in catalog drops or the `cars` table:
   `https://<project-ref>.supabase.co/storage/v1/object/public/car-images/<car_id>.jpg`
5. **Verify** the URL in a browser, then run `/open-pack`.

Ensure the `service_role` / secret key can write to Storage when using upload scripts; Discord only needs the public read URL. If `permission denied for table cars` appears on `seed-stubs` / `import-cars`, grant `service_role` access to `public` tables (see Supabase SQL Editor / project Data API settings).

### 4. Register slash commands

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

### 5. Run the bot

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
| `npm run import-cars` | Apply catalog JSON drops to Supabase; update manifest |
| `npm run seed-stubs` | Insert sparse stub cars for dev (`--count` optional) |

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
├── index.js              # Client bootstrap, Supabase + repositories + services on runtime config
├── register-commands.js  # One-off slash command registration (REST; no DB)
├── commands/             # Slash command handlers + registry
├── interactions/         # Router, pagination (Prev/Next/Skip), pack picker (Phase 2+)
├── models/               # Domain models (car stat display + import normalization)
├── repositories/         # Supabase persistence (cars, packs, stats)
├── services/             # drop-rate, pack-service, pack-config-cache, pack-stats-events, createServices
├── renderers/            # embeds.js (lightweight/admin), pack-reveal.js, card-display.js; card/ (Phase 3+)
└── shared/               # config, logger, metrics, theme, image-url, supabase, generate-serial-id
data/catalog/             # manifest.json + drops/ (JSON content drops)
scripts/                  # import-cars.js, seed-stubs.js, lib/catalog.js
supabase/migrations/      # Schema migrations (supabase db push)
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

PRs into `develop` must include a **version label** and a **synced README + CHANGELOG** (see below).

---

## Versioning

Overdrive uses [Semantic Versioning](https://semver.org/) in `package.json` (`0.x.y` during Phases 0–5).

### README & CHANGELOG discipline (mandatory)

The [Version Bump workflow](.github/workflows/version-bump.yml) updates **`package.json` only** (and creates a version tag). It does **not** edit CHANGELOG or this README. Authors sync docs on the **feature branch before** the PR.

**During feature work:** update README whenever setup, env vars, commands, structure, or roadmap change. Prefer keeping `[Unreleased]` notes current on long branches.

**Before every `feature/*` → `develop` PR:**

1. Choose the **target version** CI will produce (e.g. patch from `0.1.4` → `0.1.5`).
2. Set `package.json` to the **pre-bump** base so the labeled bump lands on the target.
3. Add a dated `## [X.Y.Z]` section in [CHANGELOG.md](CHANGELOG.md) for that **target** version (move items out of `[Unreleased]`). Document skipped versions if CI previously failed.
4. Sync this README: **Version** line, development status, roadmap checkboxes, and any setup/structure/command changes.
5. Apply one PR label: `version:patch` | `version:minor` | `version:major`.

Example (pack-simulator branch): `package.json` = `0.1.4`, CHANGELOG `## [0.1.5]`, label `version:patch`.

After merge, if the README **Version** line still shows the pre-bump value, update it on `develop` to match the new tag.

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
- [x] `/open-pack` pagination shell (superseded by Phase 1 simulator)
- [x] Dev/prod config + local dev workflow

### Phase 1 — Pack simulator ✅
- [x] Multi-pack DB schema + default pack (`100000`)
- [x] **6-digit serial IDs** (100000–999999) for cars and packs (app assigns with collision retry)
- [x] Persistent **pack mutations** schema (guarantee / bonus % with optional rarity gate)
- [x] Catalog layout: `data/catalog/manifest.json` + drops README
- [x] Supabase client helper (`shared/supabase.js`) + `loadEnv` Supabase fields
- [x] Repositories (`cars`, `packs`, `stats`) + Supabase wired at bot boot
- [x] Domain car model + **Unavailable** / **N/A** formatters (`models/car.js`, `renderers/card-display.js`)
- [x] 6-digit serial ID helper (`shared/generate-serial-id.js`)
- [x] Catalog import scripts (`scripts/import-cars.js`, `seed-stubs.js`)
- [x] `drop-rate-service` + `pack-service` + `pack-config-cache` + `pack-stats-events` (`src/services/`)
- [x] `/open-pack` wired: weighted opens, interim reveal, Skip + summary, preloaded pages, pack config cache
- [x] Stats events on pack open (`pack_open` + per-card `pull` → `stats_events`)
- [x] Image URL reachability check (`shared/image-url.js`; omit dead links on reveal)
- [x] Interim pack reveal: title + image + rarity accent (`pack-reveal.js`, `theme.js`); card count excludes summary page
- [ ] Admin pack edit / mutations list & remove (`feature/p1-admin-default-pack`)

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

- **Sub-1s** interaction latency for common commands. **Pack opens:** pack definition + rates + eligibility + mutations cached in memory (**60s TTL** via `pack-config-cache.js`); repeat opens within TTL skip those DB reads. **Paging:** reveal embeds + button rows are **prebuilt at open** and reused on Prev/Next/Skip. **Images:** unreachable `image_url` values are probed at open (`image-url.js`) and omitted from embeds. Remaining latency is mostly Discord API + image fetch — prefer Supabase Storage URLs and &lt; 800 KB assets.
- **Modular** layers — commands, services, repositories, renderers
- **No dev-generated car content**
- **6-digit IDs** — cars and packs use random serials `100000`–`999999` (default pack reserved `100000`); regenerate on collision
- **Stat display** — unknown → **Unavailable**; not applicable → **N/A**; value + `*_status` set together via domain helpers / import. **Pack reveal (Phases 1–2):** embed shows only title `Year Make Model (★★★)` + optional `image_url`; other fields stay on the car row for Phase 3 compose and future commands.
- **Display units** — imperial defaults today (e.g. weight in **lbs**, speed in **mph**). A user or guild **imperial / metric** toggle is planned for a future settings slice (see cleanup audit CLN-018); until then, formatters in `models/car.js` use imperial suffixes.
- **Pack mutations** — admin guarantee/bonus rules persist until changed or removed; `100%` = guarantee; bonus % applies after `rarity_gate` slot (e.g. true P = P(6★)×P(bonus|6★))
- **Drop rates** — seeded default pack (`100000`) uses 45/27/15/8/4/1 in migration `003`. **Admin create:** omitted rarity tiers default to weight **0**. **Admin edit:** tiers not in the update payload **retain** their existing DB weight. **Guardrail:** tier weights for a pack must sum to **100** before save (user-facing error otherwise). Phase 1 **runtime read** may fall back to the seeded baseline when rows are missing (transitional). Phase 2 adds `car-repository.findEligible` so filtered packs do not load the full catalog via `listAll`.
- **Catalog import** — versioned JSON drops in `data/catalog/drops/`; `manifest.json` tracks applied vs pending per import run
- **Card composition** — car photo base + separate overlay components; each toggleable
- **Renderers** — `embeds.js` for small/quick embeds (`/hello`, admin ping/latency tests); `pack-reveal.js` for `/open-pack` pages (title, optional image, summary); `card-display.js` for stat formatting; Phase 3 `renderers/card/` for composed images
- **Pack reveal UX (Phases 1–2)** — one card per page (low→high rarity), optional **Skip** to a summary page (high→low); footer `Card N of M` counts cards only; embed accent color by rarity (1★ `#cecdce` … 6★ `#b52af9`)
- **Stats events** — each `/open-pack` appends `pack_open` plus one `pull` per card to `stats_events` (`pack-stats-events.js`); insert failures are logged and do not block the reveal
- **Performance in schema** nullable until Phase 4 calculator fills ratings
- **Multi-pack** — default + themed packs (schema Phase 1; UX Phase 2)
- **Future web portability** — domain logic isolated from Discord wiring

### Catalog import (maintainers)

Layout and drop format are documented in `data/catalog/drops/README.md`.

1. Add a drop file under `data/catalog/drops/`.
2. List new filenames in `manifest.json` → `pending` (or let `import-cars` discover unapplied drops).
3. Run `npm run import-cars` — upserts cars, updates manifest `applied` / `pending` / `lastUpdated`.
4. Use `manifest.{BOT_ENV}.json` if dev and prod catalogs diverge.

**Removing cars:** There is no `delete` API on `car-repository` yet. To clear stubs or bad rows today, use the Supabase Table Editor or SQL (e.g. `DELETE FROM cars WHERE …`). A maintainer script (`clear-stubs` / repository `deleteById`) is a **planned** follow-up (cleanup audit CLN-016).

---

## License

ISC
