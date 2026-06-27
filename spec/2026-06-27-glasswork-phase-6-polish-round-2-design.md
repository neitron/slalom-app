# Glasswork Phase 6 polish round 2 — design (D–H + 4d + 4e)

Date: 2026-06-27
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
Direction: `spec/2026-06-24-redesign-glasswork-design.md`
IA: `spec/2026-06-24-glasswork-ia-decisions.md`
Predecessors: Phase 6 (`spec/2026-06-27-glasswork-phase-6-iconography-design.md`), Phase 4b (`spec/2026-06-26-glasswork-phase-4b-tricks-design.md`)

## Purpose

After Phase 6 shipped (icons + polish round 1) the device pass surfaced five open design questions (**D–H**) about top-bar inconsistency, Graph page chrome, the Generate-vs-Build duality, and the Sequence-mode bubble's broken empty state. This spec resolves all five **and** folds in the previously-open Phase 4e (Transitions placement) and previously-deferred Phase 4d (Sequences page) — the three are too entangled to ship piecewise.

After this spec ships, the four primary tabs (Home, Tricks, Graph, Sequences) share a coherent top-bar pattern, sequence-related actions live behind two clearly-located FABs, the Graph viewport is decluttered, and the SequenceSheet finishes its Glasswork migration.

This document is the spec. The implementation plan lives in `docs/superpowers/plans/2026-06-27-glasswork-phase-6-polish-round-2.md` (written after this is approved).

## Scope summary

**In scope:**
- Information architecture: Sequences becomes umbrella with Sequences | Transitions sub-tabs.
- Unified top-bar pattern across Tricks and Sequences (and its sub-tabs).
- Position model migration: `position: fixed` → `position: sticky` for top bars (iOS PWA keyboard-drift mitigation).
- Graph top bar + viewport layout redesign.
- FAB-based primary actions on Sequences page and Graph page.
- Sequence-mode bubble empty-state fix.
- SequenceSheet Glasswork-chrome cleanup (Phase 6 leftovers + pre-Glasswork styling).
- Two icon additions to `src/icons/index.ts` (IconRoute, IconEdit).

**Out of scope (named so they aren't conflated):**
- Phase 5 motion language (spring physics, View Transitions, choreography) — separate phase.
- Phase 4f (Learning fold-in to Home), 4g (People + ForeignProfile), 4i (Install + onboarding) — separate phases.
- Phase 7 (PWA polish: app icon, splash, perf budget).
- Adding new sort modes; removing zoom +/− buttons in favor of pinch-only; surfacing People in the TabBar — all named here for explicitness, all deferred.

## Decisions

### Information architecture

- **Sequences = umbrella tab** (already a TabBar slot). It holds two sub-tabs: **Sequences | Transitions**.
- `/sequences` defaults to the **Sequences** sub-tab. `/sequences/transitions` activates the **Transitions** sub-tab. The legacy `/transitions` route redirects to `/sequences/transitions` (preserves any external link or memorized URL).
- The Graph header's `↔ Transitions` link is removed — Transitions has a home in the TabBar tree now.
- People stays where it is (HeaderProfileMenu); not affected by this spec.

Rationale: the previous IA orphaned Transitions (only reachable from Graph) and gave Sequences a thin top-level surface. Co-locating them under one umbrella matches their real relationship: a sequence is a chain of transitions; you typically explore one to build the other.

### D — Unified top-bar pattern

One sticky wrapper, two stacked rows. Used by Tricks (row 1 only) and Sequences (both rows).

```
┌─────────────────────────────────────────────┐
│ [Search……………………………] [Sort] [⚙ Filter]    │  row 1 — collapsible
├─────────────────────────────────────────────┤
│ [● Sequences] [○ Transitions]               │  row 2 — pinned (only when sub-tabs exist)
└─────────────────────────────────────────────┘
                  ↓ scroll content ↓
```

- **Position model:** `position: sticky; top: 0;` inside the page scroll container (`.page-scroll`). Replaces the current `position: fixed; top: env(safe-area-inset-top);` used in Tricks. Sticky elements ride normal scroll and do **not** anchor to `visualViewport`, which is what causes the iOS PWA keyboard drift documented as "ACCEPTED LIMITATION" in the handoff. The drift is not fully cured (still affects the focused input itself), but the top bar's positioning behavior matches user expectations during normal scroll.
- **Row 1 — collapsible:**
  - Search input (placeholder "Search…", IconSearch left-aligned).
  - Sort cycle button — text label cycling through that page's sort modes. Tricks: Name / Best / Worst. Sequences sub-tab: Newest / Best / Worst. Transitions sub-tab: Name / Best / Worst / Recent.
  - Filter icon button (IconFilter) with corner badge showing active filter count. Tapping opens that page's filter sheet (Tricks has TricksFilterSheet; Sequences and Transitions get analogous sheets — see "Per-sub-tab state" below for what filters apply).
  - Existing `useScrollDirection` composable drives a `max-height` + `opacity` transition: on scroll-down, row 1 collapses; on scroll-up, row 1 reveals. Transition: 200ms ease.
- **Row 2 — pinned:**
  - Pill chips, active = solid `var(--color-g-fg)` background with `var(--color-g-base)` text (matches TabBar active style), inactive = `rgba(255,255,255,0.04)` with muted text.
  - Padding: `8px 0`. Gap: `4px`. Flex-wrap allowed but should not be needed (we only have 2 sub-tabs).
  - Pinned regardless of scroll direction. Never collapses.
- **Wrapper chrome:** `gw-glass` background, `border-radius: var(--radius-g-panel)` on the wrapper. Same horizontal margin pattern as the current Tricks sticky bar (`left: 0.75rem; right: 0.75rem`).

#### Per-sub-tab state

Each sub-tab keeps its own search / sort / filter state in `useUiStore` (parallel to the existing `tricksSearch / tricksSort / tricksTiers / tricksCategories / tricksStatuses / tricksFavOnly` block). New state for Sequences and Transitions:

- `sequencesSearch: string`, `sequencesSort: 'newest' | 'best' | 'worst'`, (no filter sheet in v1 — Sequences list is short).
- `transitionsSearch: string`, `transitionsSort: 'name' | 'best' | 'worst' | 'recent'`, `transitionsCategory: Category | 'all'` (filter sheet replaces the current ChipFilter; matches the unified pattern).
- `sequencesSubTab: 'sequences' | 'transitions'` mirrored to URL.

State is independent across sub-tabs: switching from Sequences to Transitions preserves each sub-tab's search/sort/filter on return.

### E — Graph top bar + viewport layout

Top bar collapses to one centered control. Viewport bottom corners get a clean split.

```
┌─────────────────────────────────────────────┐
│              [ View | Move ]                │  segmented switcher, centered
├─────────────────────────────────────────────┤
│                                             │
│              graph viewport                 │
│                                             │
│  [+]                                        │
│  [−]                                        │
│  [⌂]                              ┌───┐     │
│                                   │ + │FAB  │
└───────────────────────────────────└───┘─────┘
                  TabBar
```

- **Removed from top bar:** the `Graph` h1 (TabBar communicates the section), the `↔ Transitions` link (now sub-tab), the `⛓ Sequence` button (now a FAB — see F).
- **Top bar = View | Move segmented switcher.** Centered. Tapping cycles the existing `moveMode` ref (boolean today; the switcher exposes it as a 2-way choice). The semantics already match: "View" = pan + tap; "Move" = drag to reposition + tap.
- **Sequence-mode behavior:** when sequence-mode is active (FAB-initiated), the View/Move switcher hides (or visually recedes) — the only relevant interaction is "tap nodes to build."
- **Zoom cluster (+/−/⌂):** moves from current bottom-right to **bottom-left** of the graph viewport. Same vertical stack, same chrome. Position: `left: 0.75rem; bottom: calc(var(--tabbar-h) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem)`.
- **Build sequence FAB:** new affordance, bottom-right of graph viewport. Spec'd in F below.

### F — Two FABs, location-defined verbs

The Generate / Build duality resolves by giving each location its own primary FAB, with distinct verbs:

- **Sequences page, Sequences sub-tab active:** FAB = `IconGenerate` (Dice5, already in `src/icons/index.ts`). Label: "Generate". Tap opens the existing `GeneratorSheet` with its current 3-mode picker (Graph walk / Known shuffle / Totally random).
- **Sequences page, Transitions sub-tab active:** FAB **hidden**. Transitions are created only from Graph; no list-add UI exists today.
- **Graph page:** FAB = `IconRoute` (new; Tabler `IconRoute`). Label: "Build sequence". Tap enters sequence-mode (the current `⛓ Sequence` toggle behavior in `Graph.vue`).

FAB visual spec (shared):

- 56×56 circle. Position: `right: 1rem; bottom: calc(var(--tabbar-h) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem)`.
- Background: `var(--color-g-brand)`. Glyph color: `var(--color-g-base)`. Icon size 22, `stroke="1.75"`.
- Shadow: `0 6px 20px rgba(110, 231, 183, 0.45), 0 0 0 1px rgba(110, 231, 183, 0.3)` (uses `--color-g-brand` rgba — keep in style as literal until/unless we tokenize).
- Active state: `transform: scale(0.95)`. No hover state needed (mobile-first).
- Sub-tab-aware visibility (Sequences page) handled via `v-if` on the sub-tab.

### G — Sequence-mode bubble empty state

The bubble keeps its current center-bottom position and current chrome. The bug is layout-only: `width: max-content` collapses the bubble around the short "Tap tricks…" placeholder.

Fix:

- `min-width: 280px`. `max-width: min(calc(100vw - 1.5rem), 420px)` (unchanged).
- Empty state (`sequenceSteps.length === 0`):
  - Where the chain renders, show centered hint text: "Tap tricks on the graph to build a sequence" at `var(--text-g-micro)`, `color: var(--color-g-fg-muted)`.
  - **Undo** disabled (greyed via existing `disabled:opacity-40`).
  - **Cancel** active.
  - **Save** disabled.
- Step-1 state (`sequenceSteps.length === 1`):
  - Chain renders with the single step.
  - **Undo** active (un-pops the step).
  - **Cancel** active.
  - **Save** disabled (current threshold is `≥ 2` steps).
- Step-2+ state: same as today.

The bubble is otherwise unchanged: same Cancel/Undo/Save layout, same enter/leave transition.

### H — SequenceSheet cleanup

Scope: Phase 6 leftovers + pre-Glasswork chrome. No structural changes to sections or order.

**Phase 6 leftovers — replace unicode glyphs with icons:**

- Sheet header: `🔗` (line 304) → `<IconRoute :size="20" stroke="1.75" />`. New icon (see "Icon additions" below).
- Rename pencil: `✎` button (line 315) → `<IconEdit :size="14" stroke="1.75" />`. New icon.

**Pre-Glasswork chrome — migrate to Glasswork tokens:**

- Name input (editing mode, line 320): swap `bg-card-2 border border-border-2` for `gw-glass` background with `var(--radius-g-chip)` corner radius. Match the search-input chrome from the unified top bar (D).
- Inline Save button (line 329): align to the brand-CTA pattern used in TrickSheet reset confirm (`background: var(--color-g-brand); color: var(--color-g-base); border-radius: var(--radius-g-chip)`).
- Inline Cancel button (line 334): `gw-glass-strong`, `var(--radius-g-chip)`, `color: var(--color-g-fg-muted)`.
- Step list rows (line 377): swap `bg-card-2 border border-border-2` for `gw-glass`, `border-radius: var(--radius-g-chip)`. Whole row tappable (replaces the inline Open button).
  - Step row interaction: `<button>` element (full row), `@click="openTrick(step.trickId)"`. Active state: `active:opacity-80`.
  - Drop the explicit `<button>Open</button>` (line 388).
  - L/R side indicator (line 385): replace the raw `step.side` text with `<LegL>` / `<LegR>` / `<LegNone>` from `src/icons/leg/`, sized 14, color via `sideColor(step.side)` as today.
- Delete button (line 416): align to the danger CTA pattern used elsewhere in the app. Two-tap arm behavior unchanged.

**Untouched:**

- Section structure (Created/Practiced/Steps stats, Chain, Steps, RateDots, RateButtons, Delete).
- "Learn N transitions" button (Chain section header, line 358) — already on the Glasswork brand-CTA pattern.
- The 🔗 leading emoji in the header *paired with* the name was already serving as a section-type marker; replacing with IconRoute preserves the intent and finishes Phase 6.

### Icon additions to `src/icons/index.ts`

Add two named re-exports from `@tabler/icons-vue` to the existing block (alphabetized within the existing list per current ordering):

```ts
IconRoute,                // sequence/build glyph — used by Build FAB and SequenceSheet header
IconPencil as IconEdit,   // rename affordance — used by SequenceSheet rename button
```

Both consumers pass `stroke="1.75"` per the Phase 6 cohesion rule.

## Components touched

- `src/pages/Sequences.vue` — major rewrite. Add umbrella shell with sub-tab routing, unified sticky top bar, Sequences sub-tab content (current card list), Generate FAB.
- `src/pages/Transitions.vue` — content extracted into a `<TransitionsList>`-style child rendered inside Sequences sub-tab. The standalone page becomes a redirect.
- `src/pages/Tricks.vue` — sticky bar migrates `position: fixed` → `position: sticky`; visual unchanged otherwise.
- `src/pages/Graph.vue` — top bar reduced to View/Move segmented switcher; Sequence button removed; Transitions link removed; Build FAB added; sequence-mode bubble updated.
- `src/components/GraphView.vue` — zoom cluster repositioned from right to left.
- `src/components/SequenceSheet.vue` — header icon swaps, rename icon swap, step row tappable, chrome migration.
- `src/components/TabBar.vue` — no changes (Sequences already a slot).
- `src/router.ts` — `/transitions` route changes to a redirect to `/sequences/transitions`. New `/sequences/transitions` route (or `/sequences?tab=transitions` — pick one in the plan; recommend the path form for cleaner deep-links).
- `src/stores/ui.ts` — add sub-tab state + per-sub-tab search/sort/filter fields with setters (parallel to existing `tricksSearch`/`tricksSort`/etc.).
- `src/icons/index.ts` — add `IconRoute` and `IconPencil as IconEdit` to the re-export block.
- (New) `src/components/SequencesFilterSheet.vue` — optional, if Sequences gets a filter sheet (current decision: no filters in v1, so probably skip).
- (New) `src/components/TransitionsFilterSheet.vue` — replaces the inline ChipFilter currently in Transitions.vue; matches the TricksFilterSheet pattern.

## Risks and open questions

- **Sticky vs fixed in iOS PWA:** sticky should resolve the keyboard-drift symptom for the top bar's normal-state position, but won't change behavior of focused inputs themselves. We should validate on device that scrolling under the sticky bar doesn't expose other rendering issues (no compositing tearing, no jank). If sticky misbehaves, fallback is to keep `position: fixed` on the wrapper but split the sub-tabs row into its own non-fixed strip below.
- **Sub-tab URL form:** path (`/sequences/transitions`) vs query (`/sequences?tab=transitions`). Spec recommends path; plan finalizes.
- **Existing `useScrollDirection` interaction with sticky:** the composable watches window scroll; the new top bar's scroll container is `.page-scroll`. Need to verify the composable still observes the right scroll source after the refactor.
- **GraphBubble's `IconPlus stroke="2"` exception (Decisions log 2026-06-27):** unaffected by this spec; remains as-is.
- **TransitionSheet:** currently renders alongside SequenceSheet. Not in this spec's scope, but the same Phase 6 leftover audit should be applied to it as a follow-up (greppable: `bg-card-2`, `border-border-2`, unicode glyphs).

## Acceptance criteria

- Sequences page renders the unified top bar (search + sort cycle + filter + sub-tabs row).
- Sub-tab switch persists in URL; deep-linking to `/sequences/transitions` loads Transitions sub-tab content.
- Legacy `/transitions` redirects to `/sequences/transitions`.
- Tricks page top bar visually identical to today, but uses `position: sticky`.
- Graph page top bar shows a single centered View/Move segmented switcher; no h1, no Transitions link, no Sequence button.
- Graph viewport: zoom cluster bottom-left; Build FAB bottom-right.
- Generate FAB visible on Sequences page when Sequences sub-tab active; hidden when Transitions sub-tab active.
- Sequence-mode bubble at `min-width: 280px` regardless of step count; empty state shows hint text + disabled Undo/Save + active Cancel.
- SequenceSheet header renders `IconRoute` (not 🔗); rename button renders `IconEdit` (not ✎); step rows use Glasswork chrome and are fully tappable.
- `grep -r '🔗\|✎' src/` returns no matches in `src/components/SequenceSheet.vue`.
- All 144 existing tests pass; new state shape in `useUiStore` has tests.
- Build clean. Type checks pass.
