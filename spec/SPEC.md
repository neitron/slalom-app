# Slalom Tricks Tracker — iPhone App Spec

A personal freestyle-slalom training tracker, ported from the Claude Cowork live artifact to a
mobile web app installable on iPhone. Single user (Kyrylo), dark theme, optimized for phone use
at the skatepark.

---

## 1. Platform decision

| Layer | Choice | Why |
|---|---|---|
| Framework | **Vue 3 + Vite + Pinia + vue-router** (TS) | requested; small app, fast dev |
| Styling | **Tailwind CSS v4** with design tokens in `tailwind.config.js` | matches dev's existing prod stack; replaces the hand-written CSS in the reference artifact |
| Distribution | **PWA** (vite-plugin-pwa), installed via Safari "Add to Home Screen" | no App Store, no Xcode, instant updates from hosting |
| Native wrapper (optional, later) | Capacitor iOS shell pointing at the same dist | only if PWA limits ever bite (they shouldn't for this app) |
| Hosting | **GitHub Pages** (free, gh-pages action) | static SPA, tiny bundle; Netlify/Vercel free tiers are equivalent alternatives |
| Storage | **Supabase free tier** (Postgres + REST) as source of truth, **IndexedDB (Dexie) offline cache** | see §2 |
| IDE | **RubyMine + Claude Code** (dev's existing setup, JS/TS + Vue plugins already installed) | no reason to switch |

A PWA on iOS runs fullscreen from the home screen, keeps IndexedDB storage, supports touch
gestures — sufficient for everything in this spec. "WebView app" requirement is satisfied by
the PWA; Capacitor is a drop-in later if desired.

## 2. Storage

### Recommended: Supabase (free tier) + offline-first cache

Why not alternatives:
- *GitHub as storage* (commits/gists via PAT): no queries, PAT embedded in a public client, rate
  limits, merge conflicts — poor fit.
- *Local-only (IndexedDB)*: zero setup but data dies with the phone/site-data wipe; no desktop access.
- *Firebase*: fine too; Supabase chosen for plain SQL + simpler JS API. Either works.

Supabase free tier (500 MB DB) is orders of magnitude more than needed (~150 rows + logs).

**Auth:** single user. Use Supabase email magic-link auth (one account), RLS `user_id = auth.uid()`
on all tables. Do NOT ship the service key; ship only the anon key (safe by design with RLS).

**Offline-first:** all reads render from Dexie immediately; a sync layer pulls/pushes Supabase.
- On app start: render from cache → fetch fresh → reconcile (server wins except for queued local ops).
- Mutations: write to Dexie + append to an `outbox` queue → flush queue when online.
- Conflicts are practically impossible (one user), last-write-wins is fine.

### Fallback mode (phase 0)
The app must run with `STORAGE=local` (Dexie only, seeded from `seed-data.json`, JSON
export/import buttons in settings). This lets you ship the UI before touching Supabase.

## 3. Data model

See `reference/schema.sql` for DDL and `seed-data.json` for current data (exported 2026-06-11
from the Miro tables; 152 tricks, 5 transitions).

### trick
| field | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text unique | display name |
| tier | int 1..6 | Basics, Beginner, Intermediate, Advanced, Challenging, Master |
| category | text | forward, backward, cross, eagle, one-foot, sitting, spin, seven, wheeling |
| entry / exit | text | stance: `2/f`, `1/b`, `toe/f`, `heel/f`, `wheel/b` (feet/direction) |
| lr | bool | track Left/Right leading foot separately |
| rate | numeric null | single-mode rating 1..5 (EWMA) |
| rate_l / rate_r | numeric null | L/R-mode ratings |
| last_practiced | date null | |
| status | text | `Not Started` / `In Progress` / `Complete` (derived, but stored) |
| aliases | text[] | "also known as", searchable |
| video | text null | pinned tutorial URL (YouTube) |
| icon | text null | emoji |
| tags | text[] | free-form: toe, heel, all-wheels, jump, direction-change, … |
| fav | bool | favorite star |

### transition (graph edge)
| field | type | notes |
|---|---|---|
| id | uuid pk | |
| from_trick / to_trick | uuid fk | |
| from_side / to_side | text null | `L`/`R`/null (null = leg not specified) |
| bidi | bool | two-way transition |
| rate | numeric null, last_practiced date null | own EWMA rating |
| unique | (from_trick,to_trick,from_side,to_side) | parallel edges with different legs allowed; self-loops allowed (leg switch within one trick) |

### sequence
| field | type |
|---|---|
| id uuid pk, name text, created date, rate numeric null, last_practiced date null |
| steps jsonb — `[{ "trickId": uuid, "side": "L"|"R"|null }, …]` |

### practice_log (new — the artifact lacked history; cheap to add now)
`id, entity_type ('trick'|'transition'|'sequence'), entity_id, side (L/R/null), score int 1..5, at timestamptz`
Every report appends here; ratings stay EWMA-derived but history enables future charts.

## 4. Domain rules (port exactly; reference impl in `reference/domain.js`)

- **Rating (EWMA):** `ALPHA = 0.4`. First report sets the rate to the score; afterwards
  `new = round((0.6*old + 0.4*score)*100)/100`. Applies per side when `lr`.
- **Effective rate:** `lr ? avg(non-null of rateL, rateR) : rate`; null if nothing reported.
- **Status:** never reported → Not Started; effRate ≥ 4.5 → Complete; else In Progress.
- **Reset progress:** clears all rates + last; keeps lr flag, tags, aliases, etc.
- **lr toggle:** turning on copies `rate` into both sides; turning off collapses to the average.
- **Rate colors:** ≥4 green `#3fbf75`; ≥2.5 amber `#e0a93e`; else red `#d95757`; unrated grey `#565764`.
- **Portal leg colors (used EVERYWHERE an L/R appears — labels, buttons, chips):**
  L = light orange `#ffb36b`, R = light blue `#7cc5ff`, unspecified = light lily `#cbb3e6`.
- **Edge side matching:** `sideOk(edgeSide, side) = edgeSide==null || side==null || edgeSide==side`.
  A bidi edge also matches reversed (swap from/to and sides).
- **Video link:** pinned `video` → direct; else KNOWN_VIDEOS map (in domain.js); else YouTube search
  URL `https://www.youtube.com/results?search_query=freestyle+slalom+skating+<name>+tutorial`.

### Sequence generators (3 modes, shared filters)
Shared filters: max tier (difficulty "up to"), exclude categories[], exclude tags[].
1. **Graph walk** — random walk over transitions among nodes passing filters; leg-aware:
   candidate edges must `sideOk(edge.fromSide, currentSide)`; stepping through an edge sets the
   next step's side to `edge.toSide`; bidi edges usable both ways; prefer unvisited tricks; stop
   early if stuck (sequence valid if ≥ 2). N: 2..12.
2. **Known shuffle** — random sample of practiced tricks (effRate ≠ null), edges ignored. N: 2..12.
3. **Totally random** — sample from ALL tricks passing filters. **Hard cap N ≤ 8.** Optional
   toggle "match exit → entry stance": next trick must satisfy `next.entry === prev.exit`,
   falling back to any unused trick when no match exists.

Sequence steps carry `side`; chains render a colored L/R letter per step and a ⚠ between steps
that have no matching learned transition (leg-aware, bidi-aware).

## 5. UI spec

### Styling approach (Tailwind)
Use **Tailwind utility classes** everywhere — do NOT port the artifact's hand-written CSS variables.
The full design-token palette is in `reference/tailwind.config.js` (copy it to the project root).
Reference it via semantic names, e.g. `bg-bg`, `bg-card`, `border-border`, `text-fg`, `text-accent`,
`text-side-l`, `bg-side-r`, `text-rate-good`. Rate/leg colors are also exposed as CSS variables
(`--rate-good`, `--side-l`, …) for the SVG graph, which can't use Tailwind classes on `stroke`/`fill`.

Token cheat-sheet (see config for the rest):
- surfaces: `bg` #14151a · `card` #1c1d24 · `border` #2a2b33 · `fg` #e6e6ec · `muted` #8b8b98 · `accent` #6f8cff
- rate: `rate-good` #3fbf75 · `rate-mid` #e0a93e · `rate-bad` #d95757 · `rate-none` #565764
- portal legs: `side-l` #ffb36b (left/orange) · `side-r` #7cc5ff (right/blue) · `side-none` #cbb3e6 (lily)
- fav star: `fav` #ffd166

Component patterns (replicate the artifact's look with Tailwind):
- card: `bg-card border border-border rounded-xl p-3`
- chip/tab active: `bg-accent text-bg font-semibold`; inactive: `border border-border text-muted`
- rate dot: `w-[5px] h-[5px] rounded-full` filled with the rate color (inline style or class)
- L/R report buttons: base `rbtn` look + leg tint — text/border in `side-l`/`side-r`, hover fills solid
  (`hover:bg-side-l hover:text-bg`). Define two small `@layer components` classes `.btn-l` / `.btn-r`
  if utilities get verbose.
- bottom sheets / modals: fixed, `bg-black/60` backdrop, panel `bg-card`.

**The Cowork artifact `reference/cowork-artifact.html` is the authoritative visual + interaction
reference — replicate its layout and behavior, but express all styling as Tailwind classes/tokens.**

Bottom tab bar (mobile pattern) replacing the desktop segmented control:
**All Tricks · Learning · Graph · Sequences** (+ a small Settings screen).

### All Tricks
Difficulty tabs (Basics…Master, horizontally scrollable) → category chip filter (all + 9) →
search (name + aliases) → sort select (A–Z / Best / Worst; unrated counts as 0).
Trick cards: ★ if fav, emoji, name, meta (category · aka · #tags), rate dots (5 dots, 1 row, or
2 labeled L/R rows when lr), video icon top-right (blue = concrete link, grey = search; opens externally).

### Trick details (bottom sheet on mobile, not centered modal)
Header: ★ toggle · emoji · name · ✎ pencil → reveals emoji editor (keyboard input only + clear).
Rows: category, entry, exit, status, last practiced, leading-foot toggle ("track L / R separately",
letters tinted). Sections: aliases editor; tags editor; pinned video editor + watch/search link;
dots; report buttons 1–5 with hints bad/rough/ok/good/excellent — one row, or two rows (L tinted
orange, R tinted blue) when lr; Reset progress (two-tap confirm).

### Learning
Same card grid, only practiced tricks, across tiers (tier shown in meta), default sort worst-first.

### Graph (full remaining screen height)
Port the SVG graph 1:1 from the artifact, with touch support:
- Nodes: bg circle + ring (single color by effRate, or split halves: left = L rate color,
  right = R rate color), emoji inside, portal-colored L/R letters at the sides, name below.
- Edges: metro-map parallels (straight lines, 7px gaps, offset at both endpoints), leg-colored
  (orange/blue/lily) with linearGradient when ends differ, small arrowheads (both ends when bidi),
  self-loops drawn as loops above the node (stacked sizes).
- Pan: one-finger drag on background. Zoom: **pinch** (replaces wheel; keep +/−/⌂ buttons).
  Node drag: press-drag a node (4px threshold distinguishes tap). View + positions persisted.
- Tap node → bubble: name, meta, dots, [Details] [➕ from L][➕ from R] (or single ➕ Transition).
  Linking mode: hint bar; tap target; if target is lr → "to L / to R" chooser (portal-tinted
  buttons); same-node tap on lr trick allowed (self-loop). Esc/✕/background cancels.
- Tap edge → bubble: title `A (L) ⇄ B (R)` with tinted sides, dots, 1–5 report, two-way toggle,
  remove (two-tap confirm). Selection highlight: white halo (node) / white glow underlay (edge).
- ⛓ sequence mode: tap tricks in order, hint shows chain + Save/Undo/Cancel; Save asks name.

### Sequences
Toolbar: 🎲 Generate (opens generator sheet: mode select, N, difficulty, exclude category chips,
exclude tag chips, stance toggle for random mode, preview chain, Regenerate/Save) ·
sort (Newest/Best/Worst). Cards: name, created/practiced dates, chain (chips + colored sides + ⚠),
dots + Today 1–5 buttons, Delete (two-tap confirm).

### Settings
Storage mode indicator, Supabase sign-in (magic link), export/import JSON, re-seed from bundle.

## 6. Project structure

```
slalom-app/
  src/
    main.ts, App.vue, router.ts
    style.css          # @import "tailwindcss"; + @layer components (.btn-l/.btn-r, .rate-dot)
    stores/            # Pinia: tricks.ts, transitions.ts, sequences.ts, ui.ts
    domain/            # PURE logic, no Vue — port reference/domain.js, unit-test this
    storage/           # dexie.ts, supabase.ts, sync.ts, seed.ts (loads seed-data.json)
    components/
      TrickCard.vue  TrickSheet.vue  RateDots.vue  RateButtons.vue
      GraphView.vue  GraphBubble.vue
      SequenceCard.vue  GeneratorSheet.vue
      TabBar.vue  ChipFilter.vue  SearchSort.vue
    pages/  AllTricks.vue  Learning.vue  Graph.vue  Sequences.vue  Settings.vue
  public/seed-data.json
  tailwind.config.js   # design tokens (copy from reference/)
  vite.config.ts       # base: '/<repo>/', @tailwindcss/vite, vite-plugin-pwa (standalone, dark theme)
  .github/workflows/deploy.yml   # build + deploy to gh-pages on push to main
```

Tailwind v4 setup: install `tailwindcss @tailwindcss/vite`, add the plugin in `vite.config.ts`,
`@import "tailwindcss";` in `src/style.css`, and put tokens in `tailwind.config.js` (config still
works in v4; or use the `@theme` directive in CSS if preferred). See `reference/tailwind.config.js`.

## 7. Deploy & install

1. Repo on GitHub → Actions workflow: `npm ci && npm run build` → publish `dist/` to Pages.
2. iPhone: open the Pages URL in Safari → Share → **Add to Home Screen** → fullscreen app.
3. PWA manifest: `display: standalone`, `background_color/theme_color: #14151a`, icons 180/192/512.

## 8. Milestones

1. **M0** — Vite+Vue scaffold, Dexie local storage seeded from seed-data.json, All Tricks +
   Learning + details sheet + reporting (single & L/R). *Usable on the phone already.*
2. **M1** — Graph page with touch pan/pinch, bubbles, linking, leg chooser, two-way, self-loops.
3. **M2** — Sequences + 3 generators with filters.
4. **M3** — Supabase sync (schema.sql, magic link auth, outbox sync), Settings.
5. **M4 (optional)** — practice-log charts; Capacitor shell.

## 9. Reference files in this folder

- `seed-data.json` — full current dataset (152 tricks, 5 transitions, parsed fields).
- `reference/domain.js` — pure domain logic ported from the artifact (ratings, L/R, edges,
  generators, step serialization, colors, video links). Use as the basis of `src/domain/`.
- `reference/storage.js` — Dexie + Supabase + outbox sync skeleton.
- `reference/schema.sql` — Supabase DDL with RLS.
- `reference/tailwind.config.js` — design tokens (surfaces, rate colors, portal leg colors).
  Copy to the project root; the color hexes here are the single source of truth.
- `reference/cowork-artifact.html` — the complete working Cowork artifact (single file, vanilla
  JS). The Graph SVG code, generator popup, and modal markup are directly portable (re-style with Tailwind).
