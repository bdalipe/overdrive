# Overdrive!

Discord bot for collecting cars through pack openings, garages, and community features — inspired by Top Drives-style card collection.

**Version:** `0.2.2` (on `develop`; this branch targets `0.2.3` on merge with `version:patch`)

See [CHANGELOG.md](CHANGELOG.md) for release history. Update **both** this file and the changelog on each version bump.

---

## Development status

> **Maintainers:** Update this section and [CHANGELOG.md](CHANGELOG.md) whenever a phase milestone or major feature lands. Keep command lists, setup notes, and checklists in sync with the codebase.

| Phase | Milestone | Status |
|-------|-----------|--------|
| **0** — Foundation | M0: bot skeleton, `/hello`, `/open-pack` pagination shell, dev/prod config | **Complete** |
| **1** — Pack simulator | M1: catalog drops, multi-pack opens, eligibility, deletes (themed packs via `import-packs`; no Discord pack-admin UX); post-M1 harden through hygiene (target `0.2.3`) | **Complete** (`0.2.0`+; this branch → `0.2.3` on merge with `version:patch`) |
| **2** — Card composition | M2: modular card image composer, per-component toggles, pack reveal images | Not started |
| **3** — Performance engine | M3: tracksets, performance calculator, bulk recalc, `/calc-performance` | Not started |
| **4** — Collection & profile | M4: garage, wishlist, profile, view-card, **Wispbyte prod deploy** | Not started |

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
| In-memory pack config cache (60s TTL: pack row, rates, eligibility, mutations; in-flight coalesce) | Done |
| `pack-stats-events` (`pack_open` + per-card `pull`) | Done |
| Image URL fetch validation (omit dead links; probe cache + trusted Supabase hosts) | Done |
| Open-path latency polish (parallel stats + image validation) | Done |
| Pack catalog import (`import-packs`, `data/packs/drops/`) | Done |
| Config change audit log (`config_change_events`, car + pack imports) | Done |
| `/admin debug-latency` (diagnostics only) | Done |
| `/admin clear-cache` (live bot pack/car/eligibility/image cache) | Done |
| `pack_size` max 50 (app + DB CHECK) + default-pack delete trigger (`007`) | Done |
| `/open-pack` reveal sessions keyed by message id | Done |
| Pack create mid-failure / create+audit rollback (`import-packs`) | Done |
| `/open-pack` pack picker (choice list of active packs) | Done |
| `register-commands` fails closed with zero active packs | Done |
| Car/pack delete APIs + maintainer scripts | Done |
| `cars.findEligible` for filtered / explicit_ids packs | Done |

**Hosting:** Production deployment on [Wispbyte](https://wispbyte.com/store/discord) is planned at **end of Phase 4** (after M4). Phases 0–3 use the **dev bot on your PC**.

### Commands available today

| Command | Description |
|---------|-------------|
| `/hello` | Greeting embed with current environment (`dev` / `prod`) |
| `/open-pack` | Required **pack** dropdown of active packs (e.g. Standard Pack, Test Pack); weighted pulls, paginated reveal, **Skip** to summary; stats to `stats_events` |
| `/admin debug-latency` | Administrator diagnostics: ping, interaction timings, DB round-trip (paginated reference) |
| `/admin clear-cache` | Administrator: clear this bot process pack config, car pool, and image probe caches (after catalog imports) |

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
| `IMAGE_PROBE_FORCE` | No | Set `true` to probe Supabase Storage URLs instead of trusting public object paths |
| `IMAGE_PROBE_TIMEOUT_MS` | No | Image reachability probe timeout (default `2000`) |
| `IMAGE_PROBE_CACHE_TTL_MS` | No | Probe result cache TTL (default `600000` / 10 min) |
| `MAINTAINER_DISCORD_USER_ID` | No | Discord snowflake attributed on `config_change_events` for `import-cars` / `import-packs` (exposed as `loadEnv().maintainerDiscordUserId`) |

Optional: use `.env.dev` / `.env.prod` for separate files per environment. `loadEnv()` reads `.env.{BOT_ENV}` first, then `.env`. See [`.env.example`](.env.example) for the full template.

**Never commit `.env` or real tokens / Supabase secret keys.**

Bot boot **requires** Supabase credentials (`SUPABASE_URL` + `SUPABASE_SECRET_KEY`). `createSupabaseClient` and `createServices` run at startup; handlers receive `repositories` and `services` on runtime config. `register-commands.js` also needs Supabase so it can register the `/open-pack` pack choice list from active packs. Seed or import a catalog before `/open-pack` (`npm run seed-stubs` or `npm run import-cars`). After `import-packs`, re-run `npm run register-commands` so new packs appear in the dropdown.

### 3. Supabase (Phase 1+)

Apply schema migrations to your linked project (dev is enough until prod goes live):

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run `supabase login`.
2. From the repo root: `supabase link --project-ref <your-project-ref>`.
3. Apply migrations: `supabase db push` (includes `007_pack_integrity_guards.sql` for `pack_size` bounds and default-pack delete protection).
4. Copy **Project URL** and **secret** (or legacy **service_role**) key from Project Settings → API into `.env` / `.env.dev` as `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

Migrations live under `supabase/migrations/`. After `db push`, seed a dev catalog:

```bash
npm run seed-stubs              # sparse stubs (optional: -- --count 50)
npm run import-cars             # apply pending car drops from data/catalog/drops/
npm run import-packs            # apply pending pack drops from data/packs/drops/
```

Prefer the npm scripts above for catalog data. `supabase/config.toml` has `[db.seed]` **disabled** so `db reset` does not require a `seed.sql`; default pack rows come from migrations. Re-enable seed only when you add intentional SQL seed files.

See `data/catalog/drops/README.md` and `data/packs/drops/README.md` for drop JSON format and manifest workflow.

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
| `npm run import-cars` | Apply car catalog JSON drops to Supabase; update manifest; log `config_change_events`; invalidate car pool + refresh hint |
| `npm run import-packs` | Create or patch packs (rates, size, eligibility, mutations); failed creates roll back; update manifest only on full drop success; pack-config invalidate + refresh hint |
| `npm run delete-cars` | Delete cars by id (`-- --ids 123456,234567`); log audit; invalidate car pool (script process) + refresh hint |
| `npm run delete-packs` | Delete non-default packs by slug (`-- --slugs test-pack`); log audit; pack-config refresh hint |
| `npm run clear-stubs` | Delete sparse stub cars (`make`/`model` null); log audit; car-pool refresh hint |
| `npm run seed-stubs` | Insert sparse stub cars for dev (`--count` optional); invalidate car pool + refresh hint |

### When to re-register vs restart

| Change | Re-register? | Restart bot? |
|--------|--------------|--------------|
| Command handler logic (replies, embeds) | No | Yes (or auto via `dev`) |
| New / renamed slash command | **Yes** | Yes after register |
| New / removed / renamed **active packs** (`import-packs`) | **Yes** (`/open-pack` pack choices) | Prefer `/admin clear-cache` (or restart); re-register for choices |
| Car catalog import / delete / clear-stubs / seed-stubs | No | Prefer `/admin clear-cache` (or restart / wait ~60s TTL). Script `invalidate*` does not clear the live bot |
| `.env` token or guild ID | No | Yes |

---

## Project structure

```
src/
├── index.js              # Client bootstrap, Supabase + repositories + services on runtime config
├── register-commands.js  # Slash command registration (REST; loads active packs from Supabase for /open-pack choices)
├── commands/             # Slash command handlers + registry (/open-pack pack choices built at register time)
├── interactions/         # Router, pagination (Prev/Next/Skip)
├── models/               # Domain models (car + pack import normalization)
├── repositories/         # Supabase persistence (cars, packs, stats, config_change_events)
├── services/             # drop-rate, pack-service, pack-import, config-change-events, createServices
├── renderers/            # embeds.js (lightweight/admin), pack-reveal.js, card-display.js; card/ (Phase 2+)
└── shared/               # config, logger, metrics, theme, image-url, supabase, generate-serial-id
data/catalog/             # manifest.json + drops/ (car JSON content drops)
data/packs/               # manifest.json + drops/ (pack config drops)
scripts/                  # import-cars, import-packs, delete-cars, delete-packs, clear-stubs, seed-stubs, lib/
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
| Hosting (Phases 0–3) | Local PC (`npm run dev`) | Not deployed yet |
| Hosting (end of Phase 4) | Local PC (dev bot) | Wispbyte Tier 1+ (24/7 prod bot) |

During Phases 0–3, run the **dev bot locally**. Deploy the **prod bot to Wispbyte** once Phase 4 (M4) is complete.

---

## Hosting (Wispbyte — end of Phase 4)

Production hosting uses **Wispbyte** Discord bot hosting (Tier 1 or higher recommended; consider more RAM once card composition is live).

| Concern | Approach |
|---------|----------|
| **When** | After M4 acceptance |
| **What deploys** | **Prod bot only** (`BOT_ENV=prod`, `main` branch) |
| **Dev bot** | Stays on your PC (`npm run dev`) |
| **Start command** | `npm start` |
| **Secrets** | Wispbyte panel — never commit |

**Pre-deploy checklist (M4):** merge to `main`, register prod commands, smoke-test packs (with composed cards), garage, `/calc-performance`, profile, wishlist; verify panel auto-restart.

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

Overdrive uses [Semantic Versioning](https://semver.org/) in `package.json` (`0.x.y` during Phases 0–4).

### README & CHANGELOG discipline (mandatory)

The [Version Bump workflow](.github/workflows/version-bump.yml) updates **`package.json` only** (and creates a version tag). It does **not** edit CHANGELOG or this README. Authors sync docs on the **feature branch before** the PR.

**During feature work:** update README whenever setup, env vars, commands, structure, or roadmap change. Prefer keeping `[Unreleased]` notes current on long branches.

**Before every `feature/*` → `develop` PR:**

1. Choose the **target version** CI will produce (e.g. patch from `0.1.5` → `0.1.6`).
2. Set `package.json` to the **pre-bump** base so the labeled bump lands on the target.
3. Add a dated `## [X.Y.Z]` section in [CHANGELOG.md](CHANGELOG.md) for that **target** version (move items out of `[Unreleased]`). Document skipped versions if CI previously failed.
4. Sync this README: **Version** line, development status, roadmap checkboxes, and any setup/structure/command changes.
5. Apply one PR label: `version:patch` | `version:minor` | `version:major`.

Example (this branch): `package.json` = `0.2.2`, CHANGELOG target `0.2.3`, label `version:patch`.

After merge, if the README **Version** line still shows the pre-bump value, update it on `develop` to match the new tag.

### Automated bumps (merge to `develop`)

See [Version Bump workflow](.github/workflows/version-bump.yml). Default label if none: **patch**.

| Label | When to use |
|-------|-------------|
| `version:patch` | Fixes, small changes, docs |
| `version:minor` | New command or feature slice |
| `version:major` | Breaking changes (rare in `0.x`) |

---

## Roadmap (Phases 0–4)

> Former standalone “pack definitions / Discord pack-admin” phase was **collapsed into Phase 1**. Later phases shifted down by one (card composition is Phase 2, … Wispbyte at Phase 4 / M4).

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
- [x] Image URL reachability (`shared/image-url.js`): probe cache, trusted Supabase Storage skip, 2s timeout; omit dead links on reveal
- [x] Open-path latency: parallel stats + image validation; `loadAllCars()` pool cache for `all_cars` packs (60s TTL, `invalidateCarPool`; in-process only)
- [x] Interim pack reveal: title + image + rarity accent (`pack-reveal.js`, `theme.js`); card count excludes summary page
- [x] Pack catalog import (`import-packs`, `data/packs/drops/`) — create/patch themed + default packs (**not** Discord `/admin pack` wizards)
- [x] Config change audit (`config_change_events`) for car and pack imports
- [x] `/admin debug-latency` (pack slash admin removed)
- [x] `/admin clear-cache` + catalog script refresh hints (live bot cache is separate from script invalidate)
- [x] `pack_size` 1–50 + default-pack DB delete guard (`007_pack_integrity_guards.sql`)
- [x] `/open-pack` reveal sessions keyed by message id (15 min TTL)
- [x] Pack create mid-failure / create+audit rollback (CASCADE); multi-pack drop rolls back prior creates if a later entry fails; rollback delete failures thrown
- [x] `/open-pack` pack picker (required choice dropdown of active packs; re-register after `import-packs`)
- [x] `register-commands` fails when there are no active packs (no fake `default` choice)
- [x] `findEligible` query path for filtered / explicit_ids packs
- [x] Car/pack delete APIs + `delete-cars` / `delete-packs` / `clear-stubs`

### Catalog & pack-import follow-ups (post–Phase 1)
- [x] True partial-patch car imports (merge on existing id; `replace: true` for full-row wipe)
- [x] Faster batch serial-id allocation for large catalog / stub drops (`generateSerialIds` + `cars.listIds`)
- [x] Pack create rolls back if required audit insert fails; rollback errors surfacing clearly
- [x] Pack patch can clear `description` to null when the key is present
- [x] Car-delete preflight for packs that reference mutations / explicit ids (refuse unless `--force`)
- [x] Clearer delete + unaudited recovery messaging (`deleted_but_unaudited`)
- [x] Batch pack-mutation inserts for large `mutations.add` arrays
- [x] Local `[db.seed]` disabled (no `seed.sql` required; use npm catalog scripts)

### Phase 2 — Modular card composition
- [ ] Per-component renderers (name, rarity, stats, optional performance block)
- [ ] Compose-all-then-display pipeline for embed images
- [ ] Component toggles (performance **off** until Phase 3)
- [ ] Reference layout: `assets/card/example_template.png` (non-final)
- [ ] *(Goal)* Multi-embed / multi-message pack opens so large `pack_size` values stay under Discord limits (today’s cap is 50)
- [ ] *(Goal)* Revisit reachability checks for trusted Storage image URLs
- [ ] *(Goal)* Bound concurrent image URL probes for non-trusted hosts
- [ ] *(Goal)* Shared pack eligibility filters (SQL + in-memory + import); normalize eligibility cache keys
- [ ] *(Goal)* Reveal ownership via session opener id (no fail-open when message metadata is missing)
- [ ] *(Goal)* Split concentrated pack modules when that work lands (shared filters; thinner import / service / repository); prune unused pack-service exports

### Phase 3 — Performance engine
- [ ] Tracksets + per-stat weights + surface modifiers (draft rules)
- [ ] Weight derivation from trackset; calculator → rating 0–1000+ and class **P/S/A/B/C/D/E/F** (draft bands in [docs/performance-formulas-draft.md](docs/performance-formulas-draft.md))
- [ ] `/calc-performance` + bulk recalc on formula/weight changes
- [ ] Workshop: [docs/performance-formulas-draft.md](docs/performance-formulas-draft.md)
- [ ] *(Goal)* Open-path: batch guarantee car lookups; reuse eligibility cache for filter guarantees

### Phase 4 — Collection & profile
- [ ] Garage, wishlist, settings, profile
- [ ] `/view-card` using card composer
- [ ] **Wispbyte prod deployment**
- [ ] RLS deny-by-default for anon/authenticated before any non–service-role client

### Phases 5+ (future, beyond M4)
- **5 — Economy:** currency ledger, sources/sinks, anti-abuse
- **6 — Upgrades:** card progression sinks
- **7 — Live races & Gauntlet:** race framework on Phase 3 tracks; **Gauntlet** = high-risk/high-reward run (N cars / N rounds, each car once; fog-of-war later rounds; cash-out vs push; loss → nothing). Details after currency + races exist.
- **8 — Campaign:** story chapters on the event framework

---

## Design principles

- **Sub-1s** interaction latency for common commands. **Pack opens:** pack row + rates + eligibility + mutations cached (**60s TTL**, `pack-config-cache.js`). Concurrent cold misses for the same key share one in-flight load. **`all_cars` pools** cached via `loadAllCars()` (**60s TTL**). **`filter` / `explicit_ids` pools** cached via `findEligible` keyed by eligibility hash (**60s TTL**); both car-pool styles clear on `invalidateCarPool` / `/admin clear-cache`. Cache Maps live in the bot process — maintainer scripts that call `invalidate*` only clear their own process; use **`/admin clear-cache`**, restart the bot, or wait for TTL after catalog changes. **Paging:** prebuilt embeds + button rows reused on Prev/Next/Skip. **Images:** Supabase Storage public URLs trusted by default; other hosts probed with **2s** timeout and **10 min** result cache (`image-url.js`); stats insert and image validation run in parallel on open. Prefer Supabase Storage and &lt; 800 KB assets.
- **Modular** layers — commands, services, repositories, renderers. Pack open / import / repository modules are already the longest files; when shared eligibility filters or the next pack-import hardening lands, prefer extracting a shared filter helper and splitting create/patch/mutate (and repository facets) rather than growing those files further
- **No dev-generated car content**
- **6-digit IDs** — cars and packs use random serials `100000`–`999999` (default pack reserved `100000`); collision checks via DB `exists` (packs) or an in-memory taken set after `cars.listIds` for catalog batch allocate (`generateSerialIds`)
- **Stat display** — unknown → **Unavailable**; not applicable → **N/A**; value + `*_status` set together via domain helpers / import. **Pack reveal (Phase 1 interim):** embed shows only title `Year Make Model (★★★)` + optional `image_url`; other fields stay on the car row for Phase 2 compose and future commands.
- **Display units** — imperial defaults today (e.g. weight in **lbs**, speed in **mph**). A user or guild **imperial / metric** toggle is planned for a future settings slice; until then, formatters in `models/car.js` use imperial suffixes.
- **Pack mutations** — guarantee/bonus rules in pack drops; persist until removed via `mutations.remove_ids` or `replace`; `100%` = guarantee (bypasses pack eligibility; count must be ≤ `pack_size`); bonuses (`&lt;100`) must resolve within eligibility (`import-packs` rejects otherwise). On each normal draw slot, every eligible bonus rolls independently; if several succeed, one is chosen at random for that slot
- **`pack_size`** — **1–50** for now (`MAX_PACK_SIZE`); enforced at import, repository writes, open (`generatePack`), and DB CHECK (`007`). Summary embed description truncates at Discord’s 4096-character limit. Larger packs need future multi-embed / multi-message reveal work before raising the cap
- **Default pack delete** — blocked in `deleteById` and by `BEFORE DELETE` trigger (`007`)
- **Pack import creates** — mid-create failure deletes the new pack (CASCADE children) so re-runs are not blocked by half-created slugs; create+audit failure also rolls back the new pack; rollback delete failures are thrown. Earlier creates in the same drop file roll back if a later entry fails. Manifest updates only after the full drop succeeds. **Patches** that fail mid-write or on audit are not auto-reverted
- **Drop rates** — seeded default pack (`100000`) uses 45/27/15/8/4/1 in migration `003`. **Import create:** omitted tiers → **0**; sum must be **100**. **Import patch:** omitted tiers **retain** DB weights; merged sum must be **100**. Runtime read may fall back to baseline when rows are missing. If weighted roll finds no overlap with the eligible pool, open picks uniformly among rarities that have cars; opens fail if final card count ≠ `pack_size`.
- **Catalog import** — versioned JSON drops: `data/catalog/drops/` (cars), `data/packs/drops/` (packs); manifests track applied vs pending; writes logged to `config_change_events`. Car drops: **merge** when `id` exists (omitted fields kept); **`replace: true`** for full-row wipe; new ids use full-row create. Local `supabase db reset` does not run SQL seeds (`[db.seed]` disabled); use npm catalog scripts after migrations
- **Card composition** — car photo base + separate overlay components; each toggleable
- **Renderers** — `embeds.js` for small/quick embeds (`/hello`, `/admin debug-latency`); `pack-reveal.js` for `/open-pack` pages (title, optional image, summary); `card-display.js` for stat formatting; Phase 2 `renderers/card/` for composed images
- **Pack reveal UX (Phase 1 interim)** — one card per page (low→high rarity), optional **Skip** to a summary page (high→low); footer `Card N of M` counts cards only; embed accent color by rarity (1★ `#cecdce` … 6★ `#b52af9`); in-memory sessions keyed by **message id** (15 min TTL) so concurrent opens stay independent. **Follow-up:** enforce opener via session user id (avoid fail-open if Discord message interaction metadata is missing)
- **Stats events** — each successful `/open-pack` appends `pack_open` plus one `pull` per card to `stats_events` (`pack-stats-events.js`); `packSize` matches configured `pack_size` (opens that cannot fill that many cards fail before stats). Insert failures are logged and do not block the reveal
- **Performance in schema** nullable until Phase 3 calculator fills ratings
- **Multi-pack** — default + themed packs via `import-packs`; `/open-pack` required `pack` choice list from active packs (**Discord max 25**; extras are omitted — `import-packs` / `register-commands` log `open_pack_choices_truncated`; re-run `register-commands` after pack imports). **`register-commands` fails** if there are no active packs (does not invent a fake `default` choice).
- **Future web portability** — domain logic isolated from Discord wiring

### Catalog import (maintainers)

**Cars:** `data/catalog/drops/README.md`  
**Packs:** `data/packs/drops/README.md`

1. Add a drop file under the appropriate `drops/` folder.
2. List new filenames in `manifest.json` → `pending` (or let import discover unapplied drops).
3. Run `npm run import-cars` or `npm run import-packs`.
4. Apply migration `007_pack_integrity_guards.sql` (and prior migrations through `006`) before first import on a fresh DB.

Car and pack imports/deletes append audit rows to `config_change_events` (**required** — if the audit insert fails, the script exits non-zero after logging). **Pack creates** that fail audit are rolled back (slug freed). Car upserts and pack **patches** that already succeeded are not auto-reverted. **Deletes** that succeed then fail audit log `deleted_but_unaudited` — data is already gone; fix audit access and do not re-delete the same ids/slugs.

Use `manifest.{BOT_ENV}.json` if dev and prod catalogs diverge.

**Removing cars/packs:**

```bash
npm run delete-cars -- --ids 123456,234567
npm run delete-cars -- --ids 123456 --force   # if pack mutations / explicit_ids reference the car
npm run clear-stubs                 # make/model both null (seed-stubs rows)
npm run delete-packs -- --slugs test-pack
```

Default pack cannot be deleted (app + DB trigger). After deleting packs, re-run `npm run register-commands` so `/open-pack` choices update. `delete-cars` refuses pack-referenced cars unless `--force` (mutations CASCADE; explicit ids may keep dead entries). Deletes require a successful `config_change_events` insert; if audit fails after delete, see `deleted_but_unaudited` in logs / catalog READMEs — do not re-delete.

---

## License

ISC
