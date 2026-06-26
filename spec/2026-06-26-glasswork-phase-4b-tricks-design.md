# Glasswork Phase 4b — Tricks search-first design

Date: 2026-06-26
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
IA decisions: `spec/2026-06-24-glasswork-ia-decisions.md`

## Purpose

Rebuild `/tricks` around a sticky search bar + a bottom-sheet filter UI. Drop tier tabs. Fold the Phase 4a `?status=in-progress` chip into the new sheet. The page's first instinct is "find by typing," not "browse by tier."

This document is the spec. The implementation plan lives at `docs/superpowers/plans/2026-06-26-glasswork-phase-4b-tricks.md` (written after this is approved).

## Top-level structure

Order from top to bottom inside the existing `page-shell` aurora frame (the small subtle aurora layer landed in Phase 4a-polish):

1. **Sticky header bar** — search input, inline sort pill, filter button. Hides on scroll-down, reveals on scroll-up. Z-index above content.
2. **Active-filter strip** — only when `?status=…` is present in the URL. One dismissible chip; tap × clears the URL param. Other filters never appear here — they live in the sheet.
3. **Result list** — existing `TrickCard` grid (1-col mobile, 2-col tablet). No visual changes to the card.
4. **Empty / loading states** — Loading… while the store is mid-load; `No matches — try clearing filters.` when filtered to zero.

## Sticky header

A `gw-glass` container with three slots side-by-side:

- **Search input** (left, flex-grow): wide. Placeholder `Search tricks…`. Updates `useUiStore.tricksSearch` on input. Magnifier glyph inside the input.
- **Sort pill** (middle-right): small inline button labelled `Name` / `Best` / `Worst`. Tap cycles `Name → Best → Worst → Name`. Reads/writes `useUiStore.tricksSort`.
- **Filter button** (right): icon button (sliders/funnel glyph). When any filter is active, shows count: `Filters · N`. Tap opens the bottom sheet.

**Scroll behavior**: a new `useScrollDirection(threshold = 8)` composable returns a single `hidden: Ref<boolean>` that flips when scroll direction changes by more than `threshold` pixels. The sticky header binds `transform: translateY(...)` to that ref.

## Active-filter strip (URL-driven only)

Behaviour identical to Phase 4a: when `?status=in-progress` (or `complete` / `not-started`) is set on the route, a single dismissible chip appears below the sticky header. Tapping × clears the URL param.

When the user changes the status array inside the sheet:
- Single status selected → URL becomes `?status=<slug>`
- Multiple or zero selected → URL has no `status` param

Other in-memory filters (tier / category / fav) do NOT appear in this strip and never affect the URL.

## Filter sheet — `TricksFilterSheet.vue`

A new bottom sheet that mirrors `TrickSheet`'s skeleton (Vue `<Teleport to="body">`, backdrop dim, drag-handle, pull-down-to-dismiss via `useSheetViewport`).

Header row:
- `Filters` title (left)
- `Reset all` text button (right) — clears all four filter dimensions
- `×` close button

Body (scrollable):

1. **Tier** — 6 chips (1, 2, 3, 4, 5, 6) using `ChipFilter` in `multi` mode. Bound to `useUiStore.tricksTiers`.
2. **Category** — 9 chips (forward, backward, cross, eagle, one-foot, sitting, spin, seven, wheeling). Bound to `useUiStore.tricksCategories`.
3. **Status** — 3 chips (In Progress, Complete, Not Started). Bound to `useUiStore.tricksStatuses`. Changes here also rewrite the URL `?status=` param per the contract above.
4. **Favorites** — single labeled toggle. Bound to `useUiStore.tricksFavOnly`.

Footer:
- `{N} results` — live result count, updates as the user toggles.

**No Apply button.** Changes are live. The sheet just gives the user a calm place to make them.

Props: none. The sheet reads/writes `useUiStore` directly. The "is open" state lives locally in `AllTricks.vue` (`filterSheetOpen = ref(false)`), toggled by the sticky header's filter button and the sheet's close affordances.

## Sort pill

Inline cycle button. Labels: `Name` / `Best` / `Worst`. Tap advances the cycle one step. Reads/writes `useUiStore.tricksSort`. Default is `Name`. Persists for the session only (in-memory).

This mirrors the rate-cycle pattern landed on Home Working-on rows: deterministic, no menu, no select.

## FilterOpts schema migration

In `src/stores/tricks.ts`, extend `FilterOpts` with multi-select fields plus `favOnly`. Keep singular forms as deprecated aliases for one phase so the chain `Home → ?status=` still type-checks during the rewrite.

```ts
export interface FilterOpts {
  // Multi-select (new)
  tiers?:      Tier[]         | null;
  categories?: Category[]     | null;
  statuses?:   TrickStatus[]  | null;
  favOnly?:    boolean;

  // Existing — kept
  search?: string;
  sort?:   SortKey;

  // Deprecated singular forms — removed in Phase 4b-coda.
  tier?:          Tier | null;
  category?:      Category | 'all';
  status?:        TrickStatus | null;
  practicedOnly?: boolean;
}
```

`filteredAndSorted` semantics:
- Empty array OR `null` for a multi field → no constraint on that dimension (match all).
- Non-empty array → OR within the dimension, AND across dimensions.
- The singular forms still work — equivalent to a 1-element array. If both forms are passed, plural wins.
- `favOnly: true` → filter to `t.fav === true`.

## UI store changes

Replace the existing single-value tier/category/search fields with the multi-select equivalents. This is a single change set committed alongside the AllTricks rewrite — there are no orphan consumers because the old fields' only consumer was AllTricks.

```ts
// src/stores/ui.ts (additions)
state: () => ({
  // ...existing
  tricksTiers:      [] as Tier[],
  tricksCategories: [] as Category[],
  tricksStatuses:   [] as TrickStatus[],
  tricksFavOnly:    false,
  tricksSearch:     '',
  tricksSort:       'name' as SortKey,
}),
actions: {
  setTricksTiers(v: Tier[]) { ... },
  setTricksCategories(v: Category[]) { ... },
  setTricksStatuses(v: TrickStatus[]) { ... },
  setTricksFavOnly(v: boolean) { ... },
  setTricksSearch(v: string) { ... },
  setTricksSort(v: SortKey) { ... },
  resetTricksFilters() {
    this.tricksTiers = []
    this.tricksCategories = []
    this.tricksStatuses = []
    this.tricksFavOnly = false
    // search + sort intentionally NOT reset by this action
  },
},
```

Legacy fields and actions removed: `tier`, `category`, `search`, `setTier`, `setCategory`, `setSearch`. All in one commit with the AllTricks rewrite — no consumers left.

## Active-filter count

For the `Filters · N` badge on the sticky filter button:

```ts
const filterCount = computed(() =>
  ui.tricksTiers.length      +
  ui.tricksCategories.length +
  ui.tricksStatuses.length   +
  (ui.tricksFavOnly ? 1 : 0)
)
```

Search and sort do NOT count toward the badge. They are separate affordances visible in the sticky header itself.

## URL contract for status

- On mount and on every route change, AllTricks normalizes `route.query.status` into the array: if the slug is valid (`in-progress` / `complete` / `not-started`), set `ui.tricksStatuses = [decoded]`. If invalid or missing, leave as is (preserving prior in-memory selection across navigations to/from `/tricks`).
- On status array change inside the sheet: if length === 1, push `?status=<slug>`. If length === 0 OR length > 1, remove `status` from the URL.
- The dismissible chip in the active-filter strip clears the URL param AND empties `ui.tricksStatuses`.

The contract preserves the Phase 4a Home → /tricks `See all` link.

## Components inventory

| File | Action |
|---|---|
| `src/pages/AllTricks.vue` | Rewrite |
| `src/components/TricksFilterSheet.vue` | New |
| `src/composables/useScrollDirection.ts` | New |
| `src/components/TierTabs.vue` | Delete |
| `src/components/SearchSort.vue` | Delete |
| `src/components/ChipFilter.vue` | Keep — used in sheet sections (verify `multi` mode emits `string[]`) |
| `src/components/TrickCard.vue` | No change |
| `src/stores/ui.ts` | Migrate fields + actions |
| `src/stores/tricks.ts` | Extend `FilterOpts` + filteredAndSorted |

## Loading / empty states

| Condition | What renders |
|---|---|
| `!tricksStore.loaded` | `Loading…` muted text, center-aligned, same as today |
| Loaded, `list.length === 0` AND no filters active | `No tricks yet.` — first-run case (very rare; tricks come from seed) |
| Loaded, `list.length === 0` AND filters active | `No matches — try clearing filters.` with a secondary tap target opening the sheet |
| Otherwise | Result grid |

## Testing strategy

Project convention: data layer only.

| Test file | Coverage |
|---|---|
| `src/stores/__tests__/tricks.test.ts` (extend) | `filteredAndSorted({ tiers: [2,3] })` returns only tier 2+3; `categories: ['forward','backward']` only those; empty arrays unconstrained; `statuses: ['In Progress','Complete']` returns both; `favOnly: true` returns only `fav === true`; multi-dim AND-across, OR-within; deprecated singular forms still work; plural wins when both passed |
| `src/composables/__tests__/useScrollDirection.test.ts` (new) | Up-down toggles `hidden`; threshold of 8px respected; rapid scrolls don't thrash |

Manual verification (no component test files per existing convention):
- Sticky header hides on scroll down, reveals on scroll up
- Filter sheet opens / drag-to-dismisses
- Sort pill cycles correctly + persists for the session
- `Filters · N` badge accurate
- Empty-state copy shown when result is zero AND any filter is active
- `/tricks?status=in-progress` from Home preselects the Status filter; clearing inside the sheet clears the URL; toggling to multi-status removes the URL param

Manual iOS Safari smoke check:
- Sticky header doesn't jank during fast scrolls
- Bottom sheet drag matches existing sheets
- Multi-select chip taps don't lag
- Sheet doesn't conflict with the floating TabBar

## Phase 4b-coda (separate commit after main rewrite)

- Rename `src/pages/AllTricks.vue` → `src/pages/Tricks.vue`; update `router.ts` import; route name `tricks` already matches.
- Remove deprecated singular `tier?` / `category?` / `status?` / `practicedOnly?` from `FilterOpts` (no consumers left after AllTricks rewrite).

## Out of scope

- URL-encoding for multi-filters (tier / category / fav). Status-only URL contract is preserved.
- Recently-searched / saved-search drawer.
- Filter presets ("Working tier 3", etc.).
- Sort persistence to localStorage. In-memory only.
- Replacing `TrickCard` visuals or the grid layout.
- Filter dimension for `practicedOnly` as a separate axis (approximated by Status In Progress + Complete).

## Decisions log

- DECIDED: Search-first interaction model. Sticky search bar at top, always present.
- DECIDED: Sticky header hides on scroll-down, reveals on scroll-up.
- DECIDED: Sort is an inline cycle pill (Name / Best / Worst), not in the sheet.
- DECIDED: Filter sheet dimensions: Tier, Category, Status, Favorites toggle.
- DECIDED: Filter sheet is a bottom sheet, drag-to-dismiss, matching TrickSheet's skeleton.
- DECIDED: Result list keeps the existing `TrickCard` 1/2-col grid — no visual changes.
- DECIDED: Active filter indication is a count badge on the filter button (`Filters · 3`), not a chip row.
- DECIDED: URL state — `?status=` only. Tier / Category / Favorites stay in-memory.
- DECIDED: All multi-select fields are OR within a dimension, AND across dimensions; empty array = unconstrained.
- DECIDED: Tier tabs are deleted from the codebase (`TierTabs.vue`).
- DECIDED: `SearchSort.vue` is deleted (sort moves inline).
- DECIDED: `FilterOpts` migration is additive (new plural fields, singular preserved as deprecated for one phase).
- DECIDED: Page rename `AllTricks.vue` → `Tricks.vue` happens in Phase 4b-coda after the main rewrite, in its own commit.
