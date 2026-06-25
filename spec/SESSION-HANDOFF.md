# Session handoff — 2026-06-25

Picking up next session: paste this into a fresh `claude` invocation at
`/Users/kzubenko/Projects/slalom-app`. Or `claude --resume` and choose
the recent slalom-app session.

---

## State right now

- **Branch**: `main`, **78 commits ahead of `origin/main`**, **NOT pushed**.
- 131/131 tests pass, build clean.
- Glasswork redesign: **Phases 1, 2, 3a, 3b, 4a, 4c shipped locally**. Phases 4b/d/e/f/g/h/i + 5 + 6 + 7 still open.
- Old handoff state (M3.5 social layer) is still in commit `ebf7fec`. This document supersedes it.

## How to push (when ready)

```
git push origin main
```

GH Pages deploys via `.github/workflows/`. The redesign is dev-functional but
**bespoke iconography (Phase 6) is the explicit SHIP GATE** for declaring the
redesign "done." Pushing now ships everything except iconography +
motion + screen-by-screen IA polish.

---

## What's shipped (Glasswork)

### Phase 1 — IA + tokens
- IA decisions doc: `spec/2026-06-24-glasswork-ia-decisions.md`
- Token system: `src/design/tokens.ts`, `src/design/glasswork.css`, `src/design/color.ts`
- Contrast + ΔE invariants enforced in tests (`src/design/tokens.test.ts`, `src/design/color.test.ts`)
- `/spec/tokens` dev preview route

### Phase 2 — Nav/shell
- New 4-tab IA: Home / Tricks / Graph / Sequences (`src/router.ts`)
- App.vue rebuilt as a minimal shell (no global header)
- TabBar: floating bottom glass island, asymmetric corner radius for first/last tabs
- Home stub (`src/pages/Home.vue`) + Diagnostics placeholder (`src/pages/Diagnostics.vue`)
- All 5 sheets re-skinned in glass (TrickSheet, TransitionSheet, SequenceSheet, GeneratorSheet, Graph save-sheet)
- `useIosKeyboardReset` composable **deleted** (postponed-bug workaround removed)
- HeaderProfileMenu re-skinned, eventually rewritten without `<Teleport>` and without `gw-glass-strong` due to iOS tap-handling issues

### Phase 3a — Core components (focused subset)
- TrickCard: glass tile, new typography
- RateDots: multi-variant LED (Q dots default / S slashes / T bars), user-selectable in Settings → Display
- New preferences store with localStorage (`src/stores/preferences.ts`)
- RateButtons: pill bar (Bad / Mid / Good + Reset), unified glass treatment
- ChipFilter: glass chips, white-pill active
- SearchSort: glass input + select
- `.gw-glass` / `.gw-glass-strong` utilities upgraded to gradient pseudo-element borders (135° top-left highlight, bottom-right secondary glint)

### Phase 3b — Component sweep + iterative polish
- Component re-skins: TransitionCard, SequenceCard, AvatarBadge, FriendButton, ProfileSearchResult, LegChooser, EdgeBubble, GraphBubble, SyncStatusDot, ToastStack, RateFeedback
- TrickSheet: pencil ✎ toggles global edit mode (aliases/tags/video/emoji); rate section is a sticky inner glass island
- TrickSheet metadata: 2-col pair grid with separators
- L/R toggle in TrickSheet became a segmented mode switch, co-located with rate
- TrickCard reverted to non-chevron layout (chevron was rejected; edit lives in the sheet)
- Home avatar dropdown fix (Teleport removal later in 4c iterations)
- ForeignLearningList sticky banner: rebased on `env(safe-area-inset-top)` (was reading removed `--header-h`)

### Phase 4a — Home
- IA decisions for Home v1 honoured: Quick-jumps row → 14-day intensity heatmap → top-5 Working-on list → 7-day granular activity feed.
- Spec: `spec/2026-06-26-glasswork-phase-4a-home-design.md`
- Plan: `docs/superpowers/plans/2026-06-26-glasswork-phase-4a-home.md`
- New code:
  - `src/utils/dates.ts` — local-day primitives (`todayLocalIso`, `daysAgoLocalIso`, `groupByLocalDay`, `streakDays`).
  - `src/composables/homeDataCompute.ts` — pure helpers: `selectWorkingOn`, `countWorkingOn`, `buildHeatmap14`, `joinActivityRows`, `pickCurrentSequence`, `nextCycleScore`, `sessionsInWindow`, `streakFromLogs`.
  - `src/composables/useHomeData.ts` — reactive wrapper over the helpers + Dexie `liveQuery` subscription (28-day window covers current + delta-previous periods).
  - `src/components/{QuickJumps,Heatmap14,WorkingOnList,ActivityFeed,HomeEmpty}.vue`.
  - `src/pages/Home.vue` — full rewrite composing the above; reads `useUiStore` for sheet wiring (`openSheet`, `openSequence`).
- Cycle semantics (Home Working-on rows): tap dots cycles via discrete pill scores 1→3→5→1, mapped from current effective rate. LR tricks cycle the L-side rate only; per-side cycle deferred to Phase 4b.
- Bridge to `/tricks`: `?status=in-progress` query param applies a Status filter on AllTricks + renders a dismissible glass chip above tier tabs. Phase 4b will fold Status into a broader filter sheet.
- Heatmap intensity buckets: 0 / 1-2 / 3-5 / ≥6 → levels 0..3. Tuning against real data deferred.
- Streak math: today counts as `+1` even if 0 sessions yet ("don't break yesterday's streak before you've started today").
- Tests added: `dates.test.ts` (9), `homeDataCompute.test.ts` (18), `tricks.test.ts` (4). Components verified manually.

### Phase 4c — Graph
- **W6 nodes**: glass circle (radius 28, gradient stroke) + hairline semicircle rate bars (L peach left, R teal right, both fills bottom-up; `u` for non-lr fills middle-out) + LED glow halo (color-dodge filter) + glyph (emoji or **ALL UPPERCASE letters from name** — "Backward Half-Lemon" → BHL — at scaled font size, dim color, `dominant-baseline="central"`) + name below circle
- **Fibonacci anchor-dot grid** as single SVG path (160 dots + origin dot, GRID_SCALE=26, 0.10 fill opacity)
- **Fibonacci node-spawn anchors** (separate sparser spiral, SPAWN_SCALE=72): new tricks placed at next-free anchor with collision check
- **Initial camera centers on world origin** when no saved view; `⌂` reset button always recenters
- **Edges**: hairline 1px crisp + 3px gentle glow halo + leg-based linearGradient stroke (from-side color → to-side color) + rate-encoded opacity (0.30 unrated → 0.85 rate-5) + open chevron arrowheads for direction + no markers on bidi (bare gradient line)
- **Edge endpoints reach the node circle exactly** (offset = NODE_R)
- **Glow filter region**: `userSpaceOnUse` 4000×4000 (no clamping on axis-aligned edges)
- **S3 selection** on both nodes and edges (unified language):
  - Selected node: outer brand glow ring at `NODE_R+2` (sits just outside lilac border) + thin brand border on glass circle + body scale 1.06
  - Link-source: dashed brand glow ring
  - Selected edge: brand crisp 1.5px + 4.5px brand glow halo
- **S4 numbered badges** on sequence-member nodes (1, 2, 3...) at top-right, unscaled
- **Sequence-mode bottom bar**: centered floating glass island, max-width 420px
- **Linking banner**: full-width glass card, multiline text, safe-area-aware top offset
- **Zoom controls** moved above floating TabBar; glass + chip radius
- Minimal `/transitions` link in Graph header (placeholder until real placement)

---

## What's NOT done

### Phase 4b — Tricks
Catalog still uses tier tabs. Per IA, drop tier tabs in favor of search-first + filter sheet. UX is the main work.

### Phase 4d — Sequences
List uses re-skinned cards but SequenceSheet is not yet a "rehearsal script" (big readable steps, big side glyphs, rate-after-run sheet).

### Phase 4e — Transitions
Only a placeholder `↔ Transitions` link in Graph header. Real placement (list view inside Graph? separate route?) undecided.

### Phase 4f — Learning
Subsumed into Home per IA — depends on 4a.

### Phase 4g — People + ForeignProfile
Components re-skinned, pages not redesigned.

### Phase 4h — Settings split
`/diagnostics` placeholder exists. Real split: move build-sha / storage / sync info from Settings into Diagnostics. Settings keeps profile / visibility / language / install.

### Phase 4i — Install + onboarding
Visual sweep not done.

### Phase 5 — Motion language
- Spring physics presets
- View Transitions API integration
- Sheet choreography
- Generator stagger
- Fibonacci grid breathing animation (deferred from Phase 4c)
- Tap-to-cycle pulse on RateDots
- All with `prefers-reduced-motion: reduce` paths

### Phase 6 — Bespoke iconography (SHIP GATE)
Replace ALL Lucide-style icons + emoji fallback in TabBar, Graph, sheets, etc. with a bespoke set built around Slalom semantics (cone, chain, spiral, leg-L/R/both/none, rate, sync). The redesign is **not "done"** until this ships.

### Phase 7 — PWA polish
- New app icon at all sizes
- iOS PWA splash images
- `index.html` meta refinements (theme-color, viewport)
- Install funnel polish on `/install`
- Final iOS Safari perf budget pass (LCP, scroll fps, INP)

---

## Open bugs / things to verify next session

1. **Home avatar menu interactability** — Just rewritten (commit `65f1c5a`) without `<Teleport>` and without `gw-glass-strong`. User reported it still wasn't opening in the prior version. **Smoke-test on real iPhone before any other Home work.** If still broken, deeper investigation needed (event listener attached? open ref actually toggling? Vue dev tools to inspect).

2. **iOS keyboard drift on TabBar** — Originally postponed M3.5 bug (mechanisms T1–T6 tried, none stuck). The new floating-island TabBar with explicit `bottom` positioning may behave differently. Test by opening a sheet with a text input + dismissing keyboard. If drift survived the shell rewrite, this is the moment to escalate (new mechanism, OR accept the behavior).

3. **Saved graph views don't recenter on origin** — `tryInit()` only centers when no saved view exists. Users with a saved view from before the centering fix will still see misalignment until they hit `⌂` (reset view). Decide: nuke stale saved views proactively, or trust the reset button.

4. **Build-sha/diagnostics still mixed into Settings page** — Phase 4h owns the split; until then, Settings page has both user-facing + engineering content.

---

## Key files & dev-only preview routes

### Documents (read first)
- `spec/2026-06-24-redesign-glasswork-design.md` — direction spec (still current)
- `spec/2026-06-24-redesign-glasswork-roadmap.md` — phase map + status table
- `spec/2026-06-24-glasswork-ia-decisions.md` — IA decisions (route map, tab map, Home v1)
- `docs/superpowers/plans/2026-06-24-glasswork-phase-1-ia-and-tokens.md`
- `docs/superpowers/plans/2026-06-24-glasswork-phase-2-nav-shell.md`
- `docs/superpowers/plans/2026-06-25-glasswork-phase-3a-core-components.md`
- (No detailed plan for 3b and 4c — they were dispatched task-by-task. Commit log is the record.)

### Key source paths
- `src/design/tokens.ts` — single source of truth for hex values
- `src/design/glasswork.css` — CSS layer mirroring tokens.ts + glass/aurora/pattern utilities
- `src/design/color.ts` — color math (contrast, ΔE2000, Lab conversion)
- `src/router.ts` — route map (Home / Tricks / Graph / Sequences + dev `/spec/*` routes)
- `src/App.vue` — minimal shell
- `src/components/TabBar.vue` — floating island, 4 tabs
- `src/components/HeaderProfileMenu.vue` — avatar dropdown (inline-rendered, no Teleport)
- `src/components/RateDots.vue` — multi-variant LED, reads `preferences.rateDotStyle`
- `src/components/RateButtons.vue` — pill bar
- `src/components/TrickCard.vue` — glass tile
- `src/components/TrickSheet.vue` — pencil edit-mode + sticky rate island + 2-col detail grid
- `src/components/GraphView.vue` — W6 nodes, fibonacci grid, S3 selection, badges, all in pure SVG (NO foreignObject — caused iOS pan/zoom break)
- `src/pages/Graph.vue` — page chrome, sequence-mode island, linking banner
- `src/pages/Home.vue` — stub
- `src/pages/Diagnostics.vue` — placeholder
- `src/stores/preferences.ts` — localStorage-backed preferences (rateDotStyle only for now)

### Dev-only preview routes
| Route | Purpose |
|---|---|
| `/#/spec/tokens` | Color/type/material swatches |
| `/#/spec/rate-options` | RateDots variant comparison (Q chosen, S/T selectable) |
| `/#/spec/node-options` | Node visual variants (W6 chosen) |
| `/#/spec/edge-options` | Transition leg-indication variants |
| `/#/spec/selection-options` | Selection state language variants (S3 chosen) |

These pages are gated on `import.meta.env.DEV` — won't ship to prod.

---

## Decisions log (don't relitigate without reason)

- DECIDED: 4 bottom tabs (Home / Tricks / Graph / Sequences).
- DECIDED: People + Learning + Transitions are not tabs.
- DECIDED: Settings split into `/settings` + `/diagnostics`; Diagnostics page is a placeholder until 4h implements the move.
- DECIDED: Glasswork = lilac-on-frost, gradient borders, near-black warm-cool base.
- DECIDED: Leg system = categorical hues (peach/teal/cream/none); rate = off-hue density.
- DECIDED: RateDots default is Q (LED dots); S and T selectable in Settings → Display.
- DECIDED: TrickSheet pencil = global edit-mode toggle (not just emoji).
- DECIDED: TabBar is a floating glass island, not full-width.
- DECIDED: Graph nodes = W6 (glass circle + hairline rate semicircles + LED glow + uppercase abbreviation when no emoji).
- DECIDED: Graph edges = hairline + leg gradient + glow + rate-encoded opacity. Open chevrons for direction, no markers on bidi.
- DECIDED: Selection language = S3 (glow + scale + thin brand border on node circle).
- DECIDED: Sequence-member nodes get S4 numbered badges in addition to brand-tint fill.
- DECIDED: HeaderProfileMenu renders inline (no Teleport, no gw-glass-strong) — iOS tap-handling issues with backdrop-filter + ::before.
- DECIDED: NO `foreignObject` in graph SVG — breaks iOS pan/zoom.
- DECIDED: Fibonacci anchor grid: 160 dots single-path render, denser at origin, world origin = home.
- DECIDED: New nodes spawn at next-free fibonacci anchor (sparser spiral, no overlap).
- DEFERRED: Custom typeface — still using system stack. Pick in Phase 5 or 6.
- DEFERRED: Bespoke iconography to Phase 6 (ship gate).
- DEFERRED: iOS keyboard drift on TabBar — postponed since M3.5, re-evaluate in next session.

---

## Recommended next moves

In order of leverage:

1. **Smoke-test the Home avatar menu fix on iPhone.** If broken, debug deeply before anything else.
2. **Phase 4a (real Home)** — biggest user-visible gap. The in-session "what should I do right now" surface.
3. **Phase 4h (Settings split)** — small, clean, frees up `/settings` from engineering content.
4. **Phase 6 (iconography)** — ship-gate work; can run in parallel with screen redesigns since it's mostly design.
5. **Phase 4b (Tricks search-first)** — IA shift but contained.
6. **Phase 5 (motion)** — high impact polish, can happen at any time.
7. **Phase 4d (Sequences rehearsal-script)** — central to "build & rehearse sequences" job.

---

## Pinned reference

- Supabase project ref: `tdpetpsexwfblrhwunup`
- GH Pages base path in prod: `/slalom-app/`
- Hash router. SPA fallback via copying `index.html` → `404.html` in CI.
- Auth storage key: `slalom.sb.auth`
- Dexie name: `slalom`, current version 4
- Preferences localStorage key: `slalom.prefs.v1`
