# Glasswork Phase 4a — Home design

Date: 2026-06-26
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
IA decisions: `spec/2026-06-24-glasswork-ia-decisions.md`

## Purpose

Replace the stub at `/` with the real Home surface. Home answers one question: **"What should I do right now?"** It does not become a dashboard, a profile, a settings hub, or a feed for other people. It surfaces three things: the practice in motion, the recent rhythm, and the two next places worth jumping into.

This document is the spec. The implementation plan lives in `docs/superpowers/plans/2026-06-26-glasswork-phase-4a-home.md` (written after this is approved).

## Vertical structure

Order from top to bottom inside `gw-aurora-bg-lg`:

1. **Header** — app wordmark "Slalom" + `HeaderProfileMenu` (no changes to either).
2. **Quick-jumps row** — two equal-width buttons.
3. **Activity heatmap** — 14-day intensity grid with two KPIs above.
4. **Working on** — top 5 list + "See all ›" link.
5. **Recent activity** — granular event feed, 7-day window, inner-scrollable.
6. **TabBar** — existing floating-island (provided by App.vue shell).

Section spacing follows the existing `gw-aurora-bg-lg` page conventions on Tricks and Graph.

## Section: Quick-jumps

Two buttons side by side, equal width, glass treatment, `radius-g-chip`.

| Slot | When | Label | Tap |
|---|---|---|---|
| 1 (primary, lilac fill) | Always | "Open Graph" | navigate `/graph` |
| 2 (secondary, glass) | A sequence has `last >= today − 14d` | "Current Sequence" + sub-label = sequence name | open `SequenceSheet` for that sequence directly |
| 2 (secondary, glass) | No sequence qualifies | "New sequence" | open `GeneratorSheet` |

"Current Sequence" resolution: among sequences with `last >= today − 14d`, pick the one with the most recent `last`.

## Section: Activity heatmap (14 days)

A `gw-glass` panel containing:

- **KPI row** (above grid):
  - `sessionsTotal14` — count of practice_log rows with `at >= today − 14d`. Label: "Sessions". Delta vs. previous 14d period (`↗ +N` or `↘ −N`) shown inline, omitted on first-ever data.
  - `streakDays` — consecutive days ending today (inclusive of today, even if today has 0 sessions yet) with ≥1 session. Label: "Day streak".
- **Grid**: 14 cells, oldest leftmost in row 1, today bottom-right. Two rows × 7 columns. Each cell shows day-of-month number.
- **Today cell**: thin brand border outline.
- **Intensity bucketing**:

  | Sessions on day | Cell level |
  |---|---|
  | 0 | 0 (faint, `rgba(255,255,255,0.03)`) |
  | 1–2 | 1 (`rgba(181, 168, 255, 0.18)`) |
  | 3–5 | 2 (`rgba(181, 168, 255, 0.40)`) |
  | ≥6 | 3 (`rgba(181, 168, 255, 0.75)`) |

  Final values get tuned against real data; they live in `tokens.ts`.

- **Legend** (bottom-right of panel): `less ▢ ▢ ▢ ▢ more` swatch row.
- **Cell tap**: no behavior in v1. Display only.
- **Empty (all-zero)**: renders normally — all cells level-0, streak shows `0`, no special copy.

## Section: Working on

Source: tricks where `status === 'In Progress' OR last !== null AND last >= today − 7d`. Sorted by `last DESC, name ASC`. Capped at top 5.

Each row is a compact glass tile (visually lighter than the standard `TrickCard` to fit more vertically) showing:

- Trick icon (emoji or uppercase abbreviation, matching graph-node convention)
- Trick name (truncated with ellipsis on overflow)
- `RateDots` for the trick (current variant per user preference — Q/S/T)

**Tap zones**:
- The row body opens `TrickSheet` for that trick.
- The `RateDots` zone consumes the tap to cycle (stops propagation). Cycle behavior matches the inline tap-to-cycle on `/tricks`.

**Section header**: "Working on · N" (N = the true matched count, e.g. 12 even when only 5 rows render) + "See all ›" link on the right. The "See all" link only renders when N > 5.

**"See all" navigation**: pushes `/tricks?status=in-progress`. See the bridge contract below.

**Empty**: a single hatched line "Nothing in progress — rate something to start." Inline within the section. No CTA button here — the page-level Empty handles the new-user case.

## Section: Recent activity

Source: `practice_log` where `at >= today − 7d`, sorted by `at DESC`. Granular: one row per event, no aggregation. No cap on row count. Section uses an **inner-scrollable** container so the rest of the page chrome stays stable.

Each row shows:
- Icon (from joined entity)
- Entity name (trick / sequence / transition), truncated
- Score badge — for trick events with a `side`, prefix with `L` (peach) or `R` (teal); for `side: null` events, score only
- Time delta (`2h`, `Yest.`, `3d`)

Entity join logic (in the composable):
- `entityType: 'trick'` → `tricksStore.byId(entityId)`
- `entityType: 'sequence'` → `sequencesStore.byId(entityId)`
- `entityType: 'transition'` → loaded on first need via a one-shot `getAllTransitions()` cached in the composable

If the joined entity is missing (deleted, not yet synced), the row falls back to a generic icon and the `entityType` label.

**Row tap**: no behavior in v1. The granular log is read-only here.

**Empty**: hatched line "No sessions in the last 7 days."

## Page-level empty state

When `tricks.length === 0 AND practice_log empty AND sequences.length === 0` (effectively a first-run user):

- Header + Quick-jumps render as normal.
  - Quick-jumps: "Open Graph" + "New sequence" (the no-current-sequence fallback already covers this case).
- Heatmap + Working-on + Activity collapse into a single `HomeEmpty.vue` panel: short copy "Rate a trick to get started" + a button → `/tricks`.

Why the page-level empty state collapses three sections instead of stacking three separate empty placeholders: the new-user case is the most common reason all three are empty simultaneously, and three hatched placeholders would read as broken UI. The narrower partial-empty paths (Working-on empty but Activity has rows, etc.) are handled by per-section inline copy.

## Components

| File | Purpose | Approx LOC |
|---|---|---|
| `src/pages/Home.vue` | Page composition; mounts `useHomeData()`; renders sections in order | ~110 |
| `src/components/QuickJumps.vue` | Two-button row + sequence fallback selection | ~70 |
| `src/components/Heatmap14.vue` | KPI row + 14-cell grid + legend | ~120 |
| `src/components/WorkingOnList.vue` | Top-5 list + section header + see-all link + per-row tap routing | ~100 |
| `src/components/ActivityFeed.vue` | Inner-scrollable feed + row rendering + entity-name join consumption | ~100 |
| `src/components/HomeEmpty.vue` | First-run collapse panel | ~50 |
| `src/composables/useHomeData.ts` | All data plumbing (see below) | ~150 |
| `src/utils/dates.ts` | `todayLocalIso()`, `daysAgoLocalIso(n)`, `groupByLocalDay()`. Created if missing, extended if present. | ~40 |

Why the component split: Home will keep growing (Phase 4f folds Learning in; Phase 5 adds motion). Co-locating each section in its own file keeps each ~100 lines, easy to evolve and test independently.

## Data flow — `useHomeData()`

Single composable, returns reactive refs. Signature:

```ts
export function useHomeData(): {
  workingOn:       Ref<Trick[]>;          // top 5
  activityRows:    Ref<ActivityRow[]>;    // joined; 7d window; DESC by `at`
  heatmap14:       Ref<Heatmap14Cell[]>;  // 14 cells, oldest first; today last
  sessionsTotal14: Ref<number>;
  sessionsDelta14: Ref<number | null>;    // null on first 14d of data
  streakDays:      Ref<number>;
  currentSequence: Ref<Sequence | null>;
  isLoading:       Ref<boolean>;
};

type ActivityRow = {
  id: string;                              // practice_log row id
  entityType: 'trick' | 'sequence' | 'transition';
  entityId: string;
  displayName: string;
  icon: string | null;
  side: 'L' | 'R' | null;
  score: number;
  at: string;                              // ISO timestamp
};

type Heatmap14Cell = {
  dateLocal: string;                       // YYYY-MM-DD local
  dayOfMonth: number;
  count: number;
  level: 0 | 1 | 2 | 3;
  isToday: boolean;
};
```

**Wiring**:

- `workingOn` and `currentSequence` are `computed` over `tricksStore.tricks` and `sequencesStore.sequences` (already Pinia-reactive).
- `activityRows`, `heatmap14`, `sessionsTotal14`, `sessionsDelta14`, `streakDays` all derive from one Dexie `liveQuery`:

  ```ts
  const recent = liveQuery(() =>
    db.practice_log
      .where('at')
      .above(daysAgoIso(28))             // covers 14d-current AND 14d-prior for delta
      .reverse()
      .sortBy('at')
  );
  ```

  Subscribed via Dexie's own `.subscribe()` returning an `unsubscribe` to call in `onScopeDispose`.

- The composable maintains a Vue `ref<PracticeLog[]>` updated by the subscription; everything else is `computed`.

- Transition rows in the activity feed need entity names. Lazy-load: first time the composable observes a `'transition'` row, call `getAllTransitions()` once and cache the result inside the composable. Transitions are a small set (≤ a few hundred) so cost is negligible.

- `isLoading`: `true` until the first liveQuery emission AND `tricksStore.loaded === true` AND `sequencesStore.loaded === true`.

**Local-date semantics**: `dates.ts` uses local time, not UTC. The user's "today" is their local calendar day. Streak math walks days in local time.

## Bridge to `/tricks?status=in-progress`

This is the Working-on "See all" target and the first concrete bridge between Home and the future Tricks redesign.

Contract:
- `FilterOpts` (`src/stores/tricks.ts`) gains an optional field `status?: TrickStatus | null`. The `filteredAndSorted` getter applies it after tier/category/search filters.
- `src/pages/AllTricks.vue` (the catalog page; renaming to `Tricks.vue` is Phase 4b's job) reads `route.query.status` on mount and on route change. When present and valid (`'In Progress' | 'Complete' | 'Not Started'`), passes it into the `filteredAndSorted` call.
- A small dismissible chip renders above the existing tier tabs: `In Progress ×`. Tapping × pushes a new route without the `status` query param.

This is a Phase 4a deliverable, not Phase 4b's. Phase 4b will fold Status into a broader filter sheet and remove this standalone chip. Until then, the chip is the only `/tricks` surface change.

## Testing strategy

The existing project convention is unit-test the data layer (domain, stores, utils). Vue components are validated manually + in real-device smoke-tests, not via component test files. Phase 4a follows the same convention.

| Test file | Coverage |
|---|---|
| `src/composables/__tests__/useHomeData.test.ts` (new) | Working-on filter math (`In Progress OR last >= today-7d`), top-5 sort + cap; activity row join including missing-entity fallback; heatmap 14-cell shape; intensity bucketing thresholds; streak walk including today-counts-even-if-zero edge; delta math (null on insufficient history); current-sequence detection (14d window, most-recent wins). Tests pass synthetic data into the pure helpers and don't subscribe to liveQuery directly — the composable is split into a thin reactive wrapper + pure compute functions so the compute functions are unit-testable. |
| `src/utils/__tests__/dates.test.ts` (new) | `todayLocalIso()` semantics; `daysAgoLocalIso(n)`; `groupByLocalDay()` |
| `src/stores/__tests__/tricks.test.ts` (new) | `filteredAndSorted({ status: 'In Progress' })` returns only In Progress; combined with search/sort still works |

Manual verification (no test files):
- `Home.vue` page composition + section order
- `QuickJumps.vue` rendering across both fallback states
- `Heatmap14.vue` cell levels, today border, KPI delta sign
- `WorkingOnList.vue` row body vs RateDots tap targets
- `ActivityFeed.vue` inner-scroll on a seeded heavy day
- `HomeEmpty.vue` triggered correctly on a freshly-installed PWA
- `/tricks?status=in-progress` chip dismiss

## Manual perf check (iOS Safari)

Per roadmap policy. Run on real iPhone before declaring Phase 4a shipped:
- Activity feed inner-scroll holds 60fps on a densest week (40+ events; can seed via dev tools).
- Heatmap renders without blur stutter on the `gw-glass` panel.
- Tap-to-cycle on a Working-on row triggers feed + heatmap reactivity without dropping frames.
- No layout shift between initial render and the first liveQuery emission.

## Out of scope (deferred)

- Pull-to-refresh on Home.
- Heatmap cell tap behavior (filtering activity feed, scrolling to day, etc.).
- Activity feed beyond 7d (no pagination, no "load more").
- Animated streak counter on streak change.
- Renaming the `In Progress` status to "Working" in copy or schema — Phase 4b territory.
- Session timer / explicit "practice session" entity — M4 territory.
- Leg-balance KPI (e.g., L/R session split) — declined in favor of heatmap streak framing.
- People / friends activity on Home — Home is solo-focus by IA decision.

## Decisions log

- DECIDED: Page order is Quick-jumps → Heatmap → Working-on → Activity (per layout pick `A · Actions first` plus an explicit chart slot below quick-jumps).
- DECIDED: Working-on = `status === 'In Progress' OR last >= today-7d`, sorted by `last DESC`, capped at top 5.
- DECIDED: Working-on row tap = open `TrickSheet`; rate dots cycle inline (existing component behavior, propagation stopped at dots).
- DECIDED: Activity feed = granular per-event, 7d window, no cap, inner-scrollable.
- DECIDED: Heatmap = 14-day intensity grid, KPIs `Sessions` + `Day streak`, display-only cells.
- DECIDED: Current Sequence quick-jump = open `SequenceSheet` directly when present; replace with "New sequence" → `GeneratorSheet` when absent.
- DECIDED: Empty state (full) = single `HomeEmpty.vue` panel, CTA → `/tricks`; partial-empty paths use inline per-section copy.
- DECIDED: `/tricks` accepts `?status=in-progress` with a dismissible chip; Phase 4b will fold into the filter sheet.
- DECIDED: Local-date semantics for date math, not UTC.
- DECIDED: Practice log data feed uses Dexie `liveQuery` for reactivity. No new Vue adapter.
