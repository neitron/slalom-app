# Glasswork Phase 6 — Iconography design

Date: 2026-06-27
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
Direction: `spec/2026-06-24-redesign-glasswork-design.md` §7

## Purpose

Clear the **SHIP GATE**. The redesign is not "done" until every Lucide-style inline SVG and every unicode-glyph-as-UI-affordance is replaced with a coherent icon set. After this phase, no `✕ ★ ⌂ ✥ ↔ ⇄ → ← ↗ 🎲 ▾ ▸ ⋯ ⋮ ✓ ➕` is used as a tap target, button glyph, or status indicator anywhere in the app.

This document is the spec. The implementation plan lives in `docs/superpowers/plans/2026-06-27-glasswork-phase-6-iconography.md` (written after this is approved).

## Decisions captured during brainstorm

Two prior decisions in §7 are amended here based on the in-session quality pass:

- **§7.1 stance softens.** "Bespoke. No Lucide / Feather defaults" becomes "no library that reads as the default template — Tabler Icons is acceptable because (a) Tabler's house style matches the existing TabBar custom SVGs 1:1, (b) Tabler is visually distinct enough from Lucide that users will not pattern-match to a default template, and (c) the slalom-flavored entity marks in TabBar are retained." The audit's templated-tell concern resolves through Tabler's distinct style + retained custom marks, not through wholesale hand-drawing.
- **§7.3 stroke language locked.** 1.75 stroke / round cap / round join / 24 grid — exactly matching the existing TabBar SVGs. Tabler ships in this style natively. No two-tone, no fills in v1 (except where a Tabler icon's filled state is semantically required, e.g. `IconStarFilled` for active favorite).

Decided sourcing path: I (Claude) author the wiring and inventory; Tabler ships the visual paths. Reason for not hand-drawing fully bespoke: in-session quality bar for novel marks (cone, chain, spiral) did not clear on first pass and would have consumed disproportionate session time without certainty of a better outcome than Tabler.

## Library choice

**Tabler Icons** via the official npm package `@tabler/icons-vue`.

- License: MIT.
- Coverage: 4900+ icons. Every UI affordance in the inventory below resolves to a Tabler component.
- Versioning: pin a major version in `package.json`; review upstream changes manually when bumping.
- Tree-shaking: per-component imports are tree-shakeable; the bundle only carries icons that are imported.

## Module structure

`src/icons/` exists already (empty). Phase 6 populates it as a **semantic re-export layer**, not a pass-through.

```
src/icons/
├── index.ts            # named re-exports + size token
├── README.md           # icon naming + add-an-icon checklist
├── leg/
│   ├── LegL.vue        # bespoke typography glyph
│   ├── LegR.vue
│   ├── LegBoth.vue
│   └── LegNone.vue
└── (Tabler icons are re-exported by name from index.ts — no per-icon wrapper file)
```

`src/icons/index.ts` pattern:

```ts
export {
  IconX as IconClose,
  IconSearch,
  IconStar as IconFavOff,
  IconStarFilled as IconFavOn,
  IconLink as IconTransition,
  IconArrowsRightLeft as IconBidi,
  IconArrowLeft as IconBack,
  IconArrowRight,
  IconArrowUpRight as IconTrendUp,
  IconChevronDown,
  IconChevronRight,
  IconDots as IconMenuH,
  IconDotsVertical as IconMenuV,
  IconCheck,
  IconPlus,
  IconDice5 as IconGenerate,
  IconFocusCentered as IconResetView,
  IconArrowsMove as IconMoveMode,
  IconUsers as IconPeople,
  IconUser as IconProfile,
  IconSettings,
  IconCloudUp as IconSyncUp,
  IconCloudDown as IconSyncDown,
  IconCalendar,
  IconShare2 as IconShare,
  IconAdjustmentsHorizontal as IconFilter,
} from '@tabler/icons-vue'

export { default as LegL } from './leg/LegL.vue'
export { default as LegR } from './leg/LegR.vue'
export { default as LegBoth } from './leg/LegBoth.vue'
export { default as LegNone } from './leg/LegNone.vue'

export type IconSize = 16 | 20 | 24
```

**Naming rule.** Semantic names (`IconClose`, not `IconX`; `IconTransition`, not `IconLink`). Reason: if we ever swap a specific icon (Tabler → bespoke, or Tabler vN → Tabler vN+1 with renamed component), only `index.ts` changes — call sites stay stable.

**Size prop convention.** All Tabler icons accept `:size` as a prop. Consumers pass `:size="16"` / `"20"` / `"24"` explicitly. No "default size" magic — let the call site set it for the context. The CSS `currentColor` propagation already handles color.

**Stroke prop convention.** All Tabler icons default to `stroke-width="2"`. Override to `1.75` in consumers where matching the existing TabBar is critical (i.e., everywhere). Confirm via spot check; if `1.75` ends up universal, add `:stroke="1.75"` as the project-wide convention in `index.ts` via a thin wrapper file — but only after measuring (avoid speculative abstraction).

## Inventory — complete mapping

### Kept as-is (no change)

| Site | Icon | Reason |
|---|---|---|
| TabBar — Home | hand-drawn house outline | already custom, fits style |
| TabBar — Tricks | concentric circles + center dot | already custom, slalom-specific (top-down cone abstraction) |
| TabBar — Graph | 3-node triangle | already custom, slalom-specific |
| TabBar — Sequences | interlocking chain | already custom, slalom-specific |

These four also serve as the §7.2 entity marks for Trick / Graph / Sequence wherever an entity glyph appears inline.

### Unicode → Tabler

| Glyph | Sites | Replacement |
|---|---|---|
| `✕` | TrickSheet, TransitionSheet, SequenceSheet, GeneratorSheet, TricksFilterSheet, GraphBubble, RateFeedback, Graph cancel | `IconClose` |
| `★` (filled) | TrickSheet, TrickCard, ForeignLearningList, TricksFilterSheet, Tricks "★ Favorites" filter chip | `IconFavOn` |
| `☆` (outline) | TrickSheet aliases | `IconFavOff` |
| `⌂` | GraphView reset-view button | `IconResetView` |
| `✥` | Graph header "Move" toggle | `IconMoveMode` |
| `↔` | Graph header Transitions link | `IconTransition` |
| `⇄` | TransitionSheet bidi arrow display | `IconBidi` |
| `→` | TransitionSheet (non-bidi), Heatmap14 ("→ 0" zero-delta), SequenceChain inline, body text "tap the X button" prose | `IconArrowRight` (when standalone affordance); body-prose `→` may be kept as Unicode arrow content (not a UI affordance) |
| `←` | Diagnostics header back, Settings → Diagnostics link, ForeignProfile header back | `IconBack` |
| `↗` | Heatmap14 positive sessions-delta indicator | `IconTrendUp` |
| `🎲` | Sequences "Generate" button, GeneratorSheet "Regenerate" button | `IconGenerate` |
| `🎲` (body text) | Sequences empty state copy "tap 🎲 Generate to build one" | Rewrite copy to "tap **Generate**" (no glyph) |
| `▾` / `▸` | People (show-blocked toggle) | `IconChevronDown` / `IconChevronRight` |
| `⋯` / `⋮` | Install platform-specific instructions (body content describing OS UI) | **Keep** — these describe other-app UIs (browser menus), not our affordances |
| `✓` | Install copy-confirm | `IconCheck` |
| `➕` | GraphBubble (3 buttons: "➕ from L", "➕ from R", "➕ Transition") | `IconPlus` |

### Inline SVG → Tabler

Verified against `src/` at spec time. Each row is a confirmed site.

| Component:line | Current | Replacement |
|---|---|---|
| `Tricks.vue:182` | hand-drawn magnifier (sticky search input) | `IconSearch` |
| `TrickCard.vue:75` | hand-drawn video/external-link glyph (tutorial button) | `IconVideo` (or `IconBrandYoutube` if YouTube-specific reads better — pick during implementation) |
| `ForeignLearningList.vue:56` | hand-drawn eye (read-only badge) | `IconEye` |
| `ForeignLearningList.vue:105` | hand-drawn video glyph (per-row tutorial button) | same as TrickCard — share the choice |
| `Install.vue:159` | hand-drawn iOS-share (Share button) | `IconShare` |
| `ForeignProfile.vue:116` | hand-drawn chevron-left (Back button) | `IconChevronLeft` (semantically a back affordance — but the visual is chevron; `IconBack` arrow would change the visual character — pick during implementation) |
| `RateFeedback.vue:170` | hand-drawn animated countdown ring + `✕` text overlay | **Ring stays** (animated indicator, not an icon). The `✕` text becomes `IconClose` positioned over the ring. |
| `Settings.vue:240` | Google brand logo, 48px viewBox | **Keep** — brand mark, not a UI affordance |

`GraphView.vue:732` contains a large inline `<svg>` for graph rendering — that is the canvas, not an icon. Out of scope. `Heatmap14.vue` has no inline `<svg>` (verified at spec time).

### Bespoke — `src/icons/leg/`

The leg glyphs are typography-based, not visual. No library has a "left skater stance" icon. Four 24×24 SVGs, monochrome, currentColor:

| File | Glyph rendering |
|---|---|
| `LegL.vue` | Bold uppercase "L" centered in viewBox, ui-rounded weight, sized to fill the icon optical box |
| `LegR.vue` | Bold uppercase "R", same treatment |
| `LegBoth.vue` | "L·R" or "L|R" — pick one in implementation, test against 16px legibility |
| `LegNone.vue` | An em-dash "—" or a circle-slash, picked for legibility — implementation decides after rendering both |

Visual exploration during implementation, not pre-decided here. Acceptance: at 16px these read as L, R, both, none without ambiguity.

### Rate-dot

Existing `RateDots.vue` component is unchanged. Not an icon; it's a state-display component that happens to render small dots. Out of Phase 6 scope.

## Migration scope and order

Single PR, organized by file. No phased rollout — the whole inventory is one coherent change.

Order within the PR (low-risk → high-visibility):

1. **Add the package and module.** `pnpm add @tabler/icons-vue`. Create `src/icons/index.ts` with the re-exports above. Create the four `LegL/R/Both/None.vue` files. Add the dev-only `/spec/icons` preview route (see below).
2. **Sweep close buttons (`✕` → `IconClose`).** 6 sheets + GraphBubble + RateFeedback. Lowest risk — all stylistically identical replacements.
3. **Sweep favorites (`★/☆` → `IconFavOn/Off`).** 5 sites.
4. **Sweep chevrons / arrows / check / plus.** Heatmap14, People, Install, Diagnostics, Settings, ForeignProfile, GraphBubble, SequenceChain, TransitionSheet.
5. **Sweep button-icon emoji.** `🎲 Generate` (2 sites), `⌂` reset, `✥` move, `↔` transitions link, `⇄` bidi.
6. **Sweep inline SVGs.** Tricks search, ForeignLearningList, Install share, ForeignProfile, RateFeedback.
7. **Verify on iOS PWA + Safari tab.** Spot-check every touched surface — TabBar cohesion, sheet headers, GraphBubble buttons, Generator chip alignment, leg glyphs at 16px.

The PR is meant to land in one commit when complete. If a partial-progress intermediate must be committed, document explicitly which surfaces are pending — never claim Phase 6 complete with stragglers.

## Dev-only preview route

Add `/#/spec/icons` to the existing dev-only spec routes (alongside `/spec/tokens`, `/spec/rate-options`, etc.). Gated on `import.meta.env.DEV`.

Contents:

- Every icon in `src/icons/index.ts` rendered at all three sizes (16, 20, 24).
- Default-color row and tinted-color row (using `color: var(--color-g-rate-good)`, etc.) to confirm `currentColor` propagation.
- A grid that places each icon next to the TabBar mark in the same row size, so cohesion can be eyeballed.
- The four `Leg*` glyphs at 16/20/24 each, default plus accent-color.

Purpose: visual regression checkpoint when bumping Tabler versions, and a reference for "which icon to use" during future feature work.

## Acceptance criteria

1. **Zero unicode glyphs used as UI affordances** anywhere in `src/` (excluding `src/pages/spec/`, `src/utils/graphemes.ts` where they are content, RateFeedback emoji content like 💪/🔥, body-prose references describing other apps' UI, brand marks like the Google logo). Verified by grep: the list of replaced glyphs (`✕ ★ ⌂ ✥ ↔ ⇄ → ↗ 🎲 ▾ ▸ ✓ ➕`) returns zero hits in component template positions for tap targets, button glyphs, and status indicators.
2. **Zero hand-drawn inline `<svg>` icons** outside of `src/icons/leg/` and `GraphView.vue` (canvas render).
3. **Tabler imports use semantic names** from `src/icons/index.ts` — call sites never import directly from `@tabler/icons-vue`.
4. **The `/spec/icons` preview route renders** all icons at all three sizes without console errors and shows visual cohesion with the TabBar mark row.
5. **iOS Safari + PWA spot check.** TabBar 4 + GraphBubble buttons + 6 sheet close buttons + Generator regenerate button + Graph reset/move buttons render at retina without misalignment, oversize, or stroke-weight mismatch with the TabBar.
6. **144/144 existing tests still pass.** No new test obligations from this phase (icons are visual; covered by manual spot check + `/spec/icons` route).
7. **Bundle delta acceptable.** Tabler per-icon imports are tree-shaken; a build-size diff before/after should show ≤8 KB gz growth. Document the actual delta in the PR.

## Out of scope

- The TabBar entity marks themselves — they stay.
- Marketing illustrations, app icons, splash images — these are Phase 7.
- The `GraphView.vue` graph render — not an icon.
- The `RateDots.vue` component — not an icon.
- Body-prose unicode in copy that describes other apps' UIs (Install instructions referencing `⋯` browser menus).
- Content emoji (RateFeedback 💪/🔥, trick icons set by the user).
- Visual redesign of the four bespoke `Leg*` glyphs beyond legibility — these are typographic placeholders, not bespoke iconography work.

## Risks

- **Tabler version pinning.** Tabler ships new icons regularly. Pin a major; review when bumping. A version bump that renames a component (it has happened) breaks the build at `src/icons/index.ts` only — call sites are insulated by the re-export layer.
- **Stroke-weight mismatch.** Tabler defaults to `stroke-width="2"`; existing TabBar is `1.75`. Each consumer must pass `:stroke="1.75"` for cohesion. If we observe a universal pattern, promote to a thin wrapper file — but **only after measuring**, not preemptively.
- **iOS Safari rendering edge cases.** Some Tabler icons have subpixel coordinates that can render fuzzy at non-integer scale (1.5× zoom, e.g.). Spot-check at iOS Safari + standalone PWA + zoomed.
- **Leg glyph legibility at 16px.** "L·R" or "L|R" may not read cleanly at 16px on retina. Implementation must test and pick the legible form, possibly with a custom letter-spacing override.
- **Future bespoke regret.** If at some later point we want to revisit hand-drawn bespoke marks (cone, spiral) per the original §7.3 stance, the semantic re-export layer makes that swap a 1-line change in `index.ts` per icon. The door isn't closed.

## Open after spec

These are intentionally not pre-decided — they belong in the implementation plan or get resolved during the touch pass:

- Exact size pattern for each call site (does the GraphBubble close button use 16 or 20? does the GeneratorSheet regenerate button use 20 or 24?). Each existing site is touched; pick the size that matches the current visual footprint.
- Whether the tutorial-button icon is `IconVideo` (generic) or `IconBrandYoutube` (specific). `TrickCard.vue` already has a `hasVideoLink ? 'Watch tutorial' : 'Search tutorial on YouTube'` title — so the YouTube context exists. Pick during implementation.
- Whether `ForeignProfile.vue` back arrow is `IconChevronLeft` (preserves current visual) or `IconBack` (arrow, matches Diagnostics back button's `← Settings` text-arrow). Cohesion-wise, picking one project-wide is better than per-site — decide during the sweep.
- Whether `LegBoth` reads better as "L·R" or "L|R" at 16px.
- Whether the `Sequences.vue` empty-state copy rewrite ("tap 🎲 Generate to build one" → "tap **Generate** to build one") is the right phrasing or if a different call-out reads better. Copy-level call.

## References

- `spec/2026-06-24-redesign-glasswork-design.md` §7 — original iconography direction.
- `spec/2026-06-24-redesign-glasswork-roadmap.md` Phase 6 — SHIP GATE definition.
- `spec/SESSION-HANDOFF.md` — current branch state.
- Tabler Icons: https://tabler.io/icons · https://github.com/tabler/tabler-icons
- Brainstorm session previews: `.superpowers/brainstorm/75847-1782516473/content/` (gitignored).
