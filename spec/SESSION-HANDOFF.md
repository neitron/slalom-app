# Session handoff — 2026-06-28 (autopilot animation pass + device-review round)

Picking up next session: paste the **"Prompt for new session"** at the bottom
of this file into a fresh `claude` invocation at
`/Users/kzubenko/Projects/slalom-app`. Or `claude --resume` and choose the
recent slalom-app session.

---

## State right now

- **Branch**: `main` at `06b56f7`, **in sync with `origin/main`** (all pushed).
- **Post-autopilot device-review round** (commits `feab260`, `d9fbf57`,
  `f6ec978`, `06b56f7`): fixed three issues the user caught on iOS PWA —
  live PWA elastic scroll, tiny TabBar ripple, badge crop. See the
  "Post-autopilot device fixes" section below.
- **Autopilot animation pass shipped** (commits `1334441` through `40b9c52`):
  filter badge masking fixed, glass-frost compositing pre-warm, TabBar
  selection-morph + iOS touch ripple (slide-VT retired), sub-tab indicator
  morph extracted as `SubTabSwitcher`, RateDots pulse, FAB spring
  tap-active, SequenceChain stagger reveal, Graph fibonacci breathing.
  Most of the previously-deferred Phase 5 motion follow-ups are now in.
- **Trick Library** shipped (canonical+overlay data split; `My Tricks |
  Library` sub-tabs; per-user customization isolation; community
  adoption flow). Supabase migration applied. Two hotfixes after live
  testing (camelCase outbox mapping + RLS-safe null-creator skip).
- Add-new-trick + Phase 5.1 (TabBar VT, **later replaced by AP3 morph**) +
  Phase 5 (motion foundation) all shipped earlier in this session.
- **Node positions now save on drag** (commit `dfb5c99`) — pre-existing
  bug where `saveCurrentView` read stale positions from `loadView()`
  instead of GraphView's live state. GraphView now self-saves on drag-end.
- 176/176 tests pass, build clean.
- **OAuth bug on dev still open** — Supabase auth provider redirect URIs
  are configured for prod only. Dev sign-in fails after the Google
  side-flow completes. Library sub-tab requires sign-in to load (only
  seeded canonical visible otherwise). Testing on live (prod) works
  fine. Separate small spec needed to fix Supabase Authentication →
  URL Configuration → add localhost dev origins to redirect URIs.
- Glasswork redesign: **Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h, 6 shipped
  + Phase 6 polish rounds 1 & 2 shipped.** Phase 6 polish round 2 also
  subsumed previously-open Phase 4e (Transitions placement) and
  previously-deferred Phase 4d (Sequences page) — both resolved.
  Phases 4f/4g/4i + 5 + 7 still open.
- Server-side: `transitions.rate`, `sequences.rate`, and
  `user_trick_progress.{rate, rate_l, rate_r}` columns migrated from
  `smallint` to `numeric(4, 2)` so the client's blended rates (e.g. `3.4`)
  push cleanly.

## Recent commits worth scanning (most recent first)

```
06b56f7 Filter badge: keep overhang, give .search-row headroom inside its clip
f6ec978 Filter badge: shift inside button bounds to escape search-row clip [SUPERSEDED by 06b56f7]
d9fbf57 TabBar ripple: grid-level + scales across the full bar (iOS-native feel)
feab260 Live PWA fluidity fix: restore iOS rubber-band scroll
0b70e13 SESSION-HANDOFF: autopilot animation pass + drag-save fix shipped
40b9c52 Autopilot AP9: Graph — ambient fibonacci breathing on nodes
0cb13e8 Autopilot AP8: SequenceChain — stagger reveal on chip mount
863e39a Autopilot AP7: FAB tap-active uses spring overshoot easing
d65a858 Autopilot AP6: RateDots — pulse animation when rate changes
256c009 Autopilot AP5: sub-tab indicator morph (Sequences + Tricks umbrellas)
6acb68d Autopilot AP3+AP4: TabBar — indicator morph + touch ripple, drop slide-VT
1334441 Autopilot AP1+AP2: filter badge unmasked + glass-frost compositing pre-warm
dfb5c99 Graph: persist node positions on drag end (was silently dropped)
abb07bb Trick Library hotfix #2: outbox tricks push — use camelCase→snake_case mapper
b7cdc51 Trick Library hotfix: outbox skips canonical-trick pushes with null created_by
db112c1 SESSION-HANDOFF: Trick Library shipped + Supabase migration applied
5d9a314 Trick Library T14: sync.ts — new mapping fns + canonical/overlay-aware push/pull
42453e5 Trick Library T12: TrickSheet — Share-with-library toggle
8e455f3 Trick Library T11: Tricks.vue umbrella + sub-tabs
4ffeed4 Trick Library T10: LibraryFilterSheet
6285342 Trick Library T8+T9: LibraryTrickCard + LibraryList
5f4244a Trick Library T6+T7: ui store sub-tab state + /tricks/library route
83e0343 Trick Library T5: tricksStore rewrite — overlay actions + publish/adopt
0bf0ce7 Trick Library T4: storage layer split + library page query
11c09fe Trick Library T3: Dexie v5 + seed loader migration
adad880 Trick Library T1: domain types + mergeTrick utility
8833461 Trick Library T0: install vue-virtual-scroller
d2e374c Trick Library implementation plan
3f28d57 Trick Library design spec
856d66f SESSION-HANDOFF: Add-new-trick shipped
dabd5a7 Add-new-trick: Tricks page FAB + creation-sheet wiring
0fae60d Add-new-trick: TrickCreationSheet component
dd08a54 Add-new-trick: tricksStore.create action + tests
0dc561a Add-new-trick implementation plan
a8f1df7 Add-new-trick design spec
c98e9f1 SESSION-HANDOFF: Phase 5.1 (TabBar View Transition) shipped
9ceb609 Phase 5.1: TabBar — intercept tab clicks for directional View Transition
bdffcc0 Phase 5.1: view-transition CSS — directional slide via --vt-direction
c96cad6 Phase 5.1: useViewTransition composable
59ef4e0 Phase 5.1 — TabBar View Transition implementation plan
2544011 Phase 5.1 — TabBar View Transition design spec
0b17988 SESSION-HANDOFF: Phase 5 (Motion language, foundation pass) shipped
6a4915e Phase 5 audit sweep: TabBar + ToastStack + RateFeedback to motion tokens
5619759 Phase 5: Tricks + Sequences + Graph — token uptake on sticky bars, FABs, mode switcher
79458c9 Phase 5: GraphBubble + EdgeBubble — motion tokens + reduced-motion fallback
95bbdcc Phase 5: GeneratorSheet — unified two-layer enter/leave + motion tokens
80933a0 Phase 5: SequenceSheet — unified two-layer enter/leave + motion tokens
fe6daaa Phase 5: TransitionSheet — unified two-layer enter/leave + motion tokens
005914c Phase 5: TrickSheet — unified two-layer enter/leave + motion tokens
75545ae Phase 5: TransitionsFilterSheet — two-layer panel + motion tokens
c4918a7 Phase 5: TricksFilterSheet — two-layer panel + motion tokens
26864c4 Phase 5: add motion tokens + reduced-motion override to glasswork.css
6ed7510 Phase 5 (Motion language, foundation pass) implementation plan
082e74c Phase 5 spec: clarify sheet enter requires outer+inner wrapper layers
3209ef8 Phase 5 (Motion language, foundation pass) design spec
030b228 SESSION-HANDOFF: mark pushed; capture R2-follow-up decisions
cb73637 Phase 6 polish R2: FAB → glass pill with label, Graph switcher → floating top-right
d73e0a5 Phase 6 polish R2 dev: /spec/fab-options + /spec/graph-mode-options preview pages
66c466b Phase 6 polish R2 fix: sticky-bar top: 0 → top: env(safe-area-inset-top)
97808f4 SESSION-HANDOFF: refresh HEAD ref after final inset fix
9a03fa8 Phase 6 polish R2: Sequences sticky-bar — match Tricks horizontal inset
a3be8bf SESSION-HANDOFF: Phase 6 polish round 2 shipped
a83799a Phase 6 polish R2: SequenceSheet — name-edit + Delete Glasswork chrome
d0bb80a Phase 6 polish R2: SequenceSheet — step rows tappable + Glasswork chrome
184ec24 Phase 6 polish R2: SequenceSheet — 🔗 → IconRoute, ✎ → IconEdit
a387539 Phase 6 polish R2: GraphView — zoom cluster right → left
e115c68 Phase 6 polish R2: sequence-mode bubble — min-width 280px + centered hint
2a38c00 Phase 6 polish R2: Graph — Build sequence FAB
6c47b6b Phase 6 polish R2: Graph top bar = centered View/Move switcher
4250324 Phase 6 polish R2: retire standalone Transitions.vue
beb6d2b Phase 6 polish R2: Sequences top bar — collapse gap with search row + clarify preload
b3128c1 Phase 6 polish R2: Sequences page — umbrella + sub-tabs + FAB
693a1d5 Phase 6 polish R2: TransitionsFilterSheet — sheet enter/leave + touch-pan-y + z-40
f49616d Phase 6 polish R2: TransitionsFilterSheet component
e6f2c24 Phase 6 polish R2: extract TransitionsList component
0a8b4a7 Phase 6 polish R2: Tricks sticky-bar — fix double safe-area-inset-top on notched iOS
a4ec2ec Phase 6 polish R2: Tricks — sticky-bar position fixed → sticky
2e341ad Phase 6 polish R2: router — /sequences/transitions sub-route + /transitions redirect
8e91fe3 Phase 6 polish R2: useUiStore — add missing semicolons on new type aliases
4d007b1 Phase 6 polish R2: useUiStore — sub-tab + per-sub-tab search/sort/filter state
d5b6c3a Phase 6 polish R2: add IconRoute + IconEdit to icons module
46b13a1 Phase 6 polish round 2 implementation plan
6c25f9b Phase 6 polish round 2 (D–H + 4d + 4e) design spec
d15d945 Phase 6 polish: ChipFilter wraps instead of horizontal-scrolls
ab6b1a0 Phase 6 polish: 4 missed × close affordances → IconClose
24c6ac5 Phase 6 polish: fix icon+text button alignment + TricksFilterSheet x
6506741 Phase 6 (Iconography) shipped — SHIP GATE cleared
```

`git push origin main` — when ready to ship.

---

## What's shipped since the 2026-06-26 handoff (additive)

### Post-autopilot device-review fixes (shipped 2026-06-28)
Three iOS PWA issues the user caught after the autopilot push.

- **Live PWA fluidity / no elastic scroll** (`feab260`): the `@media (display-mode: standalone)` block in `src/style.css` was setting `html, body { overscroll-behavior-y: none }`. That rule **kills iOS PWA rubber-band scroll**, which made the live PWA feel stiff and dead and made every animation feel less dynamic. Dev PWA escaped the bug because `vite-plugin-pwa` doesn't run in dev — no manifest is served, so iOS never enters real standalone mode and the media query never fires. Only the GH-Pages-installed PWA hit it. Removed the rule. The `translateZ(0)` on `.tabbar-fixed` (still present) is what actually keeps the TabBar pinned during overscroll — `overscroll-behavior` was never needed for that and was a regression.
- **TabBar ripple too small** (`d9fbf57`): the per-tab ripple was clipped to button bounds (`.tab-button { overflow: hidden }` for the indicator pill) and scaled only 14px → 140px — barely a quarter of the bar's width. Rewrote as a single grid-level `<span>` whose position is calculated from `touch.clientX/Y` relative to `.tab-grid` and that scales 20px → 800px (40×) over 600ms with cubic-bezier ease-out. Added `mix-blend-mode: plus-lighter` for a warm additive glow that washes across the bar from the touch point like iOS native tab-press feedback. `.tab-grid` got `overflow: hidden` + `border-radius: inherit` so the ripple respects the bar's rounded shape.
- **Filter badge clipped** (`06b56f7`, supersedes `f6ec978`): the AP1 fix (wrap button in a `relative` div with the badge as a *sibling outside* the button) didn't actually fix the crop — `backdrop-filter` on `.gw-glass-strong` was a red herring. The **real** clipping context is `.search-row { overflow: hidden }`, which the row needs for its collapse-on-scroll animation. First attempt (`f6ec978`, **superseded**) shifted the badge inside the button bounds to escape the clip — user didn't like the look. Final fix (`06b56f7`) keeps the original overhanging `-top-1 -right-1` badge and gives `.search-row` matching `padding: 5px 5px 0 0` so the row's `overflow:hidden` clip box extends 5px above and right of its content — overhang sits inside the clip region. Max-height bumped 80→88; padding zeros out in `.collapsed` so the animation still goes flat. Applied to Tricks.vue and Sequences.vue.

### Autopilot animation polish + bugfix pass (shipped 2026-06-28)
- User left the session for several hours with carte blanche to ship fixes ("do your own chooses"). Nine commits, no spec doc (each commit message is the spec).
- **AP1 — Filter badge masking** (`1334441`): badge corner was clipped on Tricks/Sequences pages. Root cause: `backdrop-filter` on `.gw-glass-strong` implicitly clips children at border-box on iOS Safari, even with `overflow: visible`. Fix: wrap the filter button in `<div class="relative shrink-0">` and render the badge as a *sibling* of the button (not a child), positioned absolutely. Sibling sits outside the backdrop-filter clip stack.
- **AP2 — Glass-frost compositing pre-warm** (`1334441`): sheets and TabBar showed 1-2 frames of transparency before `backdrop-filter` engaged on iOS Safari. Fix: added `transform: translateZ(0); will-change: transform, backdrop-filter;` to `.sheet-panel` and `.tabbar-fixed` in `src/style.css` — promotes elements to a GPU layer eagerly so the compositor has the backdrop primed before paint.
- **AP3 — TabBar selection morph** (`6acb68d`, replaces Phase 5.1): the View Transitions API page-slide jittered on iOS PWA. Replaced with an absolute-positioned indicator pill that morphs between tab slots via CSS `left` + `transform`. `left: calc(0.25rem + var(--active-idx, 0) * (((100% - 1.25rem) / 4) + 0.25rem))`. Apple's tab-switch curve `cubic-bezier(0.32, 0.72, 0, 1)` over `--motion-g-base`. `--active-idx` updates on route change. `useViewTransition` composable is now unused (kept in tree for future use, but `useViewTransition.ts` is no longer imported). The slide-VT CSS in `src/style.css` is dormant — `@supports (view-transition-name: root)` block still present but nothing triggers it. Can be deleted in a future cleanup.
- **AP4 — TabBar touch ripple** (`6acb68d`): on tap, a radial-gradient pseudo-element expands from the touch position (`pointerdown.clientX/Y` translated to button-local coords via `getBoundingClientRect`) over `--motion-g-base` then fades. Stored in `--ripple-x` / `--ripple-y` / `--ripple-seq` CSS vars; the seq counter is in the pseudo-element's `animation-name` so consecutive taps replay the animation.
- **AP5 — Sub-tab indicator morph** (`256c009`): extracted reusable `SubTabSwitcher.vue` component. API: `{ tabs: [{ label, value }], value, @update:value }`. Same indicator-morph pattern as TabBar, parameterized via `--active-idx` + `--tab-count`. Adopted by `Sequences.vue` (Sequences | Transitions) and `Tricks.vue` (My Tricks | Library) umbrellas. The two pages previously had inline ad-hoc sub-tab markup.
- **AP6 — RateDots pulse** (`d65a858`): when a rate changes, the lit dots scale-pulse (1.45 → 0.95 → 1.0) via `rd-pulse` keyframe over `--motion-g-base`. Mechanism: `pulseSeq` ref bumps on every `watch(props.rate)` (skipping the first fire to avoid mount-time triggers); seq is embedded in the lit-dot `:key` so Vue remounts the element and the animation replays. Lives in `<RateRow>`'s render-fn children, so the `<style>` block must be **non-scoped** (deep-descendant problem). Reduced-motion disables the animation.
- **AP7 — FAB spring tap-active** (`863e39a`): `<button>:active` on Sequences/Graph/Tricks FABs uses `var(--ease-g-spring)` (1.2-amplitude overshoot) on the transform transition. Tap → quick scale-down 0.94 → release → spring-back through 1.04 → 1.0. Tactile without being theatrical.
- **AP8 — SequenceChain stagger reveal** (`0cb13e8`): chips mount with a 50ms-per-index `animation-delay` cascade. Chip animation: `chain-reveal` keyframe `translateX(-8px) scale(0.92) → 0/1` over `--motion-g-base`. Arrows fade in 25ms after the chip on each side. `animation-fill-mode: backwards` so initial state pre-renders during the delay. Applied on every chain mount (sequence preview, SequenceSheet, etc.) — feels like the chain assembles itself when opened.
- **AP9 — Graph ambient breathing** (`40b9c52`): every graph node fades opacity (1 ↔ 0.92) over an 8s cycle. Per-node `animation-delay` is `calc(var(--i, 0) * -1.618s)` (golden-ratio offset, negative so each node starts mid-cycle without waiting). Phases distribute pseudo-randomly across the canvas — no visible wave, no sync, just gentle liveness. `--i` is set inline per-node via the v-for index. Respects `prefers-reduced-motion`.
- **Node-positions-not-saving bug fix** (`dfb5c99`, pre-autopilot): `Graph.vue:saveCurrentView` was reading positions from `loadView()` (which returns the stale persisted snapshot) instead of GraphView's live in-memory state. After a drag, the persisted positions never updated. Fix: GraphView's drag-end handler now calls `saveView({ positions, tx, ty, scale })` itself before emitting `nodeDragEnd` (it already owns the live positions). Eliminates one layer of indirection.
- **Phase 5 motion-follow-up status update**: AP3 (TabBar VT replacement), AP6 (RateDots pulse), AP7 (spring tap-bounce), AP8 (generator-adjacent stagger via SequenceChain), AP9 (fibonacci breathing) all SHIPPED. Still deferred: spring-physics library (none added — vanilla CSS sufficed), real generator-output stagger (separate from SequenceChain — the generator results list itself).

### Trick Library — canonical+overlay split + community sub-tab (shipped 2026-06-28)
- Spec: `spec/2026-06-28-trick-library-design.md` (commit `3f28d57`). Plan: `docs/superpowers/plans/2026-06-28-trick-library.md` (commit `d2e374c`). 13 implementation commits + cutover handoff (`8833461` through `5d9a314`).
- **Major data model change** — split trick storage into two layers:
  - **Canonical (`tricks` table)**: creator-supplied schema (name, tier, category, entry, exit, lr) + `createdBy`/`visibility` + creator-suggested defaults (`defaultAliases`, `defaultTags`, `defaultIcon`, `defaultVideo`). Shared across all adopters; only creator can mutate.
  - **Per-user overlay (`user_trick_progress` extended)**: each user's `aliases`, `tags`, `mainAlias`, `iconOverride`, `videoOverride`, `nodeX`, `nodeY`, `fav` (plus existing rate/status/last). Isolated per user.
  - **View merge rule** (`src/domain/mergeTrick.ts`): `Trick` consumed by Vue components is computed from canonical + (optional) overlay. Overlay overrides defaults when non-empty / non-null; canonical fields are always authoritative.
- **Adoption model = reference (not copy)**. Adoption = existence of an overlay row. First interaction (rate, favorite, customize, explicit "Add" tap from Library) creates the row. Creator's canonical edits propagate to all adopters; per-user overlay isolates personal customizations.
- **Privacy default**: private on create. `tricksStore.publish(id)` / `unpublish(id)` flips `visibility` for own tricks. Seeded canonical (`createdBy: null`) is always public.
- **IA — Tricks page sub-tabs**: `/tricks` (My Tricks default) + `/tricks/library` (community browse). Mirrors Sequences umbrella pattern. FAB visible only on My Tricks. Filter button + sort cycle swap per sub-tab.
- **Library sub-tab UX**: virtual list (`vue-virtual-scroller` v2-beta) + server-side pagination (50/page via Supabase cursor + ilike search) + debounced search (300ms) + tier/category filter sheet. Lazy-load on tab activation. Adopted-state guard hides adopted tricks from the browse.
- **Dexie v5 migration**: rewrites every canonical row to the new shape; for the signed-in user (best-effort from localStorage), migrates per-user fields into `user_trick_progress` overlay rows. Anonymous users lose customizations during migration (no overlay destination).
- **Supabase migration applied** to project `tdpetpsexwfblrhwunup`: tricks table has the new canonical columns + dropped per-user; `user_trick_progress` has the new overlay columns; RLS rules enforce `created_by IS NULL OR created_by = auth.uid() OR visibility = 'public'` on SELECT; index for library performance.
- **New dep**: `vue-virtual-scroller@2.0.0-beta.8` (~10KB gzip, MIT).
- **`tricksStore` rewrite**: state shape changes to hold canonicals + overlays separately; `tricks` is a computed getter via mergeTrick. All patch actions (toggleFav, updateAliases, updateTags, setMainAlias, updateVideo, updateEmoji, resetProgress, resetTrickSide) now write to overlay. New actions: `publish`, `unpublish`, `adopt`, `unadopt`, `loadLibraryPage`. ~12 new tests; suite 156 → 176.
- **Out of scope (deferred)**: search-by-creator-profile, popularity sort, moderation/reporting, forking (clone-as-mine), single-user "claim" of pre-auth-created local tricks on first sign-in.

### Add new trick — critical feature (shipped 2026-06-27)
- Spec: `spec/2026-06-27-add-new-trick-design.md` (commit `a8f1df7`). Plan: `docs/superpowers/plans/2026-06-27-add-new-trick.md` (commit `0dc561a`). Three implementation commits: `dd08a54` (store + tests), `0fae60d` (sheet component), `dabd5a7` (page wiring).
- **Closes a critical UX gap**: Tricks page previously had no add-trick affordance — the only source of tricks was the database seed. Now a "New trick" FAB lives bottom-right on `/tricks`.
- **`tricksStore.create(input)` action** — builds a complete `Trick` with progress defaults (`rate/rateL/rateR/last` null, `status: 'Not Started'`, empty `aliases`/`tags`, no `fav`/`video`/`icon`, `entry`/`exit` defaulted to `'2/f'`). Wraps existing `upsertTrick` which auto-generates the id. Throws on empty/whitespace name. Six new tests cover defaults + trimming + optional fields + list append.
- **`TrickCreationSheet.vue`** — new component using the Phase 5 unified two-layer sheet pattern. Minimal form: name (required, autofocus), tier (6-segment selector, default T2), category (ChipFilter, default forward), LR toggle (custom switch with brand-color fill), optional icon (text input, MAX_TRICK_EMOJIS-friendly), optional first alias. Save button disabled until name non-empty.
- **Post-save handoff to TrickSheet**: on `'created'` emit, the create sheet closes and `ui.openSheet(id)` immediately opens the existing `TrickSheet` for the new trick so the user can fill extended fields (entry/exit/video/multi-aliases/tags) without an extra navigation step. **By design, the create form is minimal**.
- **FAB matches Sequences/Graph pattern** — Apple-glass pill with `IconPlus` glyph + "New trick" label, bottom-right, safe-area-aware, motion-token transition.
- **Tests**: 156/156 (was 150 + 6 new).

### Phase 5.1 — TabBar View Transition (shipped 2026-06-27)
- Spec: `spec/2026-06-27-glasswork-phase-5-1-tabbar-view-transition-design.md` (commit `2544011`). Plan: `docs/superpowers/plans/2026-06-27-glasswork-phase-5-1-tabbar-view-transition.md` (commit `59ef4e0`). Three implementation commits: `c96cad6` composable, `bdffcc0` CSS, `9ceb609` TabBar wiring.
- **`useViewTransition` composable** (`src/composables/useViewTransition.ts`) — wraps `document.startViewTransition` with feature-detect + reduced-motion check. Falls through to plain callback if unsupported.
- **Directional slide CSS** in `src/style.css` under `@supports (view-transition-name: root)`. `--vt-direction` (-1/0/+1) scales a 24px horizontal slide on `::view-transition-old(root)` and `::view-transition-new(root)`. Direction 0 = pure opacity fade.
- **TabBar click interception** via `RouterLink custom v-slot` — anchor href / right-click semantics preserved; click intercepted with `@click.prevent` to set `--vt-direction` based on TAB_ORDER index diff, then run navigation through the composable. `--vt-direction` resets to 0 in `finally` so subsequent programmatic navigations get the plain cross-fade default.
- **Browser support**: iOS Safari 18+ / Chrome 111+. Older browsers degrade to instant nav (no transition). Reduced-motion preference skips the transition entirely.
- **Out of scope (still deferred from Phase 5)**: sub-tab VT in Sequences (Sequences ↔ Transitions), RateDots tap-to-cycle pulse, spring tap-bounce (vanilla or @vueuse/motion), generator stagger reveal, fibonacci grid breathing.

### Phase 5 — Motion language, foundation pass (shipped 2026-06-27)
- Spec: `spec/2026-06-27-glasswork-phase-5-motion-design.md` (commits `3209ef8` + `082e74c` correction). Plan: `docs/superpowers/plans/2026-06-27-glasswork-phase-5-motion.md` (commit `6ed7510`). 12 implementation tasks landed across 11 commits (`26864c4` through `6a4915e`; T9-T11 combined).
- **Motion vocabulary** (`src/design/glasswork.css`): four durations (`--motion-g-fast` 150ms, `--motion-g-base` 240ms, `--motion-g-slow` 320ms, `--motion-g-deliberate` 480ms) + four easings (`--ease-g-out` / `--ease-g-in` / `--ease-g-inout` / `--ease-g-spring`). Apple-style decel curve as the default `out`; a 1.2-amplitude spring for entries that warrant subtle overshoot.
- **`prefers-reduced-motion` compliance**: 28 animation sites previously had ZERO. Now all auto-respect via a token-level `@media` override that collapses durations. Components that use transform-based motion also declare a local `@media (prefers-reduced-motion: reduce)` block that removes the transform, leaving fade-only. The closed accessibility gap.
- **Sheet choreography unified across all 6 sheets** (`TrickSheet`, `TransitionSheet`, `SequenceSheet`, `GeneratorSheet`, `TricksFilterSheet`, `TransitionsFilterSheet`): each has a `<Transition name="sheet">` wrapper + a bare outer `.sheet-panel-anim w-full` wrapper so the class-based slide-up + fade enter/leave can coexist with the inline drag-to-close transform on the inner `.sheet-panel`. Previously: 4 sheets popped in/out instantly (no transition); the 2 filter sheets had dead slide CSS that never fired because the inline drag transform on the panel won specificity. All six now slide up + fade in via `--motion-g-slow` + `--ease-g-spring`, slide down + fade out on close, and fade-only on reduced-motion.
- **Micro-popovers** (`GraphBubble`, `EdgeBubble`): hard-coded `180ms cubic-bezier(...)` swapped to tokens + reduced-motion fallback that disables the `translateY/scale` transform.
- **Other sites tokenized**: Tricks sticky-bar transition, Sequences search-row collapse + FAB tap-active, Graph FAB + mode-switcher seg color/bg, TabBar slide-hide on keyboard-open, ToastStack toast enter/leave, RateFeedback enter/leave. All four FABs (Sequences + Graph) animate via `--motion-g-fast` + `--ease-g-out`.
- **Out of scope (deferred)**: spring physics library, View Transitions API for sub-tab/route changes, generator stagger, fibonacci grid breathing, RateDots tap-to-cycle pulse. Foundation pass intentionally excluded these; each can be picked up individually as a small follow-up phase now that tokens + a11y discipline are in place.
- **Audit clean**: `grep -rnE '(transition|animation)[^:]*: [^;]*[0-9]+(\.[0-9]+)?(ms|s)\b' src/ --include='*.vue' --include='*.css' | grep -v glasswork.css` returns ONLY `src/pages/spec/GraphModeOptions.vue:163` (dev-only design-preview mock CSS, exempt). `grep -rn 'cubic-bezier' src/` outside `glasswork.css` returns nothing.

### Phase 6 polish round 2 — D–H + Phase 4d + Phase 4e (shipped 2026-06-27)
- Spec: `spec/2026-06-27-glasswork-phase-6-polish-round-2-design.md` (commit `6c25f9b`). Plan: `docs/superpowers/plans/2026-06-27-glasswork-phase-6-polish-round-2.md` (commit `46b13a1`). 18 implementation commits (`d5b6c3a` through `a83799a`).
- **IA**: Sequences is now the umbrella for two sub-tabs (**Sequences | Transitions**). `/sequences` defaults to Sequences sub-tab; `/sequences/transitions` activates Transitions. Legacy `/transitions` redirects. Standalone `Transitions.vue` page retired (commit `4250324`).
- **Unified top-bar pattern** (D): one sticky wrapper, two stacked rows. Row 1 (search + sort cycle + filter, collapsible on scroll-down). Row 2 (sub-tab pill chips, pinned, only when sub-tabs exist). Applied to Sequences. Tricks adopts the same `position: sticky` foundation. Per-sub-tab UI state lives in `useUiStore` (`sequencesSearch`/`sequencesSort`/`sequencesSubTab`, `transitionsSearch`/`transitionsSort`/`transitionsCategory`).
- **`position: fixed` → `position: sticky`** on Tricks sticky-bar. Reduces iOS PWA `visualViewport` keyboard-drift surface for top-bar positioning. **Critical iOS-notch correction**: App.vue's outer wrapper already pads with `env(safe-area-inset-top)`. With sticky inside, `top: env(safe-area-inset-top)` would double-offset on notched devices. Use `top: 0` (commits `a4ec2ec` + `0a8b4a7`). Same fix applied to Sequences from the start.
- **Graph top bar** (E): h1 removed, Transitions link removed (now sub-tab), Sequence button removed (now FAB). Top bar = centered View/Move segmented switcher (role=tablist + aria-selected). Hidden during sequence-mode.
- **Two FABs, location-defined verbs** (F): Sequences page (Sequences sub-tab active) FAB = `IconGenerate` → opens GeneratorSheet. Sequences page (Transitions sub-tab) FAB **hidden**. Graph page FAB = `IconRoute` → enters sequence-mode (the previous `⛓ Sequence` toggle's behavior). 56×56 brand-color circle, glow shadow, safe-area-aware bottom calc.
- **GraphView zoom cluster** (E continued): `+/−/⌂` cluster moved from bottom-right to bottom-left of the graph viewport to free bottom-right for the FAB.
- **Sequence-mode bubble empty state** (G): added `minWidth: 'min(280px, calc(100vw - 1.5rem))'` to the bubble's style. Empty-state hint centered. Bubble has presence regardless of step count; Undo/Save remain disabled until ≥1 / ≥2 steps; Cancel always works.
- **SequenceSheet cleanup** (H): finished Phase 6 migration. `🔗` (header) → `IconRoute`; `✎` (rename) → `IconEdit`. Step rows are now whole-row tappable (drops explicit Open button) with `gw-glass-strong` chrome + `LegL`/`LegR`/`LegNone` side glyphs (removed `sideColor()` helper). Name-edit input + Save/Cancel + Delete button all migrated from `bg-card-2`/`border-border-2`/`bg-accent` to Glasswork tokens.
- **New components**: `src/components/TransitionsList.vue` (extracted from old Transitions.vue, store-bound state), `src/components/TransitionsFilterSheet.vue` (mirrors TricksFilterSheet pattern, Category-only).
- **New icons**: `IconRoute` and `IconPencil as IconEdit` added to `src/icons/index.ts`.

### Phase 6 — Iconography (shipped 2026-06-27) — SHIP GATE cleared
- Library-first via `@tabler/icons-vue` (v3.x) re-exported under semantic names from `src/icons/index.ts`. TabBar 4 entity marks kept as-is (already custom and slalom-flavored). Bespoke `Leg*.vue` components in `src/icons/leg/` for L / R / both / none stance glyphs (no library carries these). Zero unicode glyphs used as UI affordances anywhere in `src/`.
- Spec: `spec/2026-06-27-glasswork-phase-6-iconography-design.md`. Plan: `docs/superpowers/plans/2026-06-27-glasswork-phase-6-iconography.md`.
- Notable spec amendments: §7.1 "no library defaults" → "Tabler is acceptable, sits cohesively with TabBar". §7.3 stroke language locked at 1.75 / round / round / 24 grid (matches existing TabBar SVGs 1:1).
- Dev-only preview at `/#/spec/icons` (added to the existing spec-route block).
- Cohesion convention: every consumer passes static `stroke="1.75"` attribute (NOT v-bind — Vue strict typing rejected the number-bind form). Documented in `src/icons/index.ts` and `src/icons/README.md`.
- Addressed the brainstorm-time bug where `➕` on GraphBubble's leg buttons was barely visible on colored backgrounds — replaced with `IconPlus` at `stroke="2"` (heavier weight) for legibility.
- Implementer also caught two omissions from the inventory during sweep 5: Tricks page had a filter SVG (now `IconFilter`) and a `⌕` unicode search glyph (now `IconSearch`).

### Phase 6 polish round 1 (shipped 2026-06-27, after device review)
- Commits: `24c6ac5` (alignment + missed TricksFilterSheet `×`), `ab6b1a0` (4 missed `×` U+00D7 close glyphs in TrickSheet alias chips ×2, ToastStack toast dismiss, Tricks active-filter chip dismiss), `d15d945` (ChipFilter wraps instead of horizontal-scrolls).
- Root-caused the icon+text alignment issue: inner `<span class="inline-flex items-center">` inside a block-level `<button>` made the SVG's bottom-baseline align to the button's text baseline, shoving icon up and text off-center on iOS. Fix: dropped the inner span, applied `flex items-center justify-center gap-X` directly to the button/RouterLink. Applied to 12 buttons across 8 files.
- Original Phase 6 grep checklist had a blind spot: searched for `✕` (U+2715 heavy multiplication X) only and missed `×` (U+00D7 multiplication sign) used as a close glyph in 5 sites. The polish round caught and fixed all of them. **Future grep checklists should include BOTH characters.**
- ChipFilter (Tier / Category / Status sections in TricksFilterSheet, plus Learning/Transitions page filters): switched from `overflow-x-auto` to `flex-wrap`. Larger lists (Category: forward/backward/cross/eagle/one-foot/sitting/spin/seven/wheeling) now wrap to 2-3 rows. Sidesteps the sheet drag-vs-touch event conflict that ate horizontal swipe attempts.

### Phase 4a — Home (shipped 2026-06-26)
- IA decisions for Home v1 honoured: Quick-jumps row → 14-day intensity heatmap → top-5 Working-on list → 7-day granular activity feed.
- Spec: `spec/2026-06-26-glasswork-phase-4a-home-design.md`. Plan:
  `docs/superpowers/plans/2026-06-26-glasswork-phase-4a-home.md`.
- New code: `src/utils/dates.ts`, `src/composables/{homeDataCompute,useHomeData}.ts`, `src/components/{QuickJumps,Heatmap14,WorkingOnList,ActivityFeed,HomeEmpty}.vue`, Home.vue full rewrite.
- Bridge to `/tricks?status=in-progress` — single-status URL round-trip preserved across phases.

### Phase 4b — Tricks (search-first) (shipped 2026-06-26)
- Spec / plan: `spec/2026-06-26-glasswork-phase-4b-tricks-design.md` / `docs/superpowers/plans/2026-06-26-glasswork-phase-4b-tricks.md`.
- `Tricks.vue` (renamed from `AllTricks.vue` in 4b-coda) is driven by a sticky search header (hide-on-scroll-down, reveal-on-scroll-up).
- Sticky header: search input + inline sort cycle (`Name → Best → Worst`) + filter button with `Filters · N` badge.
- `TricksFilterSheet.vue` — bottom sheet with drag-to-dismiss, four sections: **Tier**, **Category**, **Status**, **Favorites**. Footer shows live result count. No Apply button — changes are live.
- Plural `FilterOpts` (`tiers[]`, `categories[]`, `statuses[]`, `favOnly`); deprecated singulars removed in 4b-coda. `useUiStore` switched to plural fields + setters + `resetTricksFilters`.
- New composable `useScrollDirection`. New helpers + tests.
- Phase 4b polish (committed `0208a43`): icon-only sliders filter button with corner badge, dismissible chip per active filter, GeneratorSheet mode picker → 3-segment switcher, slider drag fix.

### Sheet UX hardening (during 4b)
- `src/composables/useBodyScrollLock.ts` — dual-mode body scroll lock. Standalone PWA: `html`+`body` overflow + overscroll lock + non-passive document-level `touchmove` blocker (whitelists form controls and scrollable descendants). Safari tab: classic `position: fixed; top: -scrollY`. Refcounted.
- Applied to TrickSheet, SequenceSheet, TransitionSheet, GeneratorSheet, TricksFilterSheet (replaced previous `body.style.overflow` calls).
- All 5 sheets: backdrop `touch-action: none`; drag-to-close skipped when touch starts on a form control; GeneratorSheet gains drag-to-close.
- TabBar gets `transform: translateZ(0)` in standalone so iOS keeps it pinned during rubber-band overscroll.

### Phase 4h — Settings split (shipped 2026-06-26)
- `/settings` keeps user-facing: Profile, Cloud sign-in, App, Display. Bottom links to Diagnostics.
- `/diagnostics` owns engineering: Sync, Storage, Data (Export JSON), Danger zone (Push to cloud, Reset graph layout, Re-seed, Import), Build (SHA + commit + built-at). Header has a "← Settings" back button.
- Sign-out stays in /settings — auth UX, not engineering.

### Multi-emoji per trick + rate UX overhaul (committed `dfb8da7`)
- `src/utils/graphemes.ts` — `Intl.Segmenter`-backed `countGraphemes / splitGraphemes / takeGraphemes` + three sizing helpers:
  - `autosizeIcon(base)` — gentle inline shrink (1→base, 2→0.9×, 3→0.82×). Used by TrickCard inline emoji + sheet headers.
  - `autosizeIconTight(base)` — aggressive shrink (0.75× / 0.6×). Used by Graph node circle (must fit inside).
  - `autosizeIconSlot(slot, font)` — grow-slot variant: slot widens 1× / 1.43× / 1.93×, font 1× / 0.89× / 0.78×, with proportional letter-spacing. Used by WorkingOnList rows and ActivityFeed rows.
- `MAX_TRICK_EMOJIS = 3`. TrickSheet emoji input maxlength 32, clamped to 3 graphemes on save.
- WorkingOnList acronym fallback now extracts uppercase letters only (matches GraphView's `glyphFor`): "Alternating Cross (Advanced)" → ACA.
- TrickCard: rate dots moved into the meta row (right-edge, `shrink-0`) — saves a row of vertical space (option C).
- TrickSheet rate island redesign (option A):
  - "Progress" header (`text-xs uppercase tracking-wide text-muted`, matches existing TrickSheet label pattern) + leg switch in the right slot.
  - Per-leg view: tinted leg name + "— how was it today?" + `<RateDots side="L|R">` on the right; Bad/Mid/Good/Reset pills below.
  - Both-legs view: "How was it today?" + RateDots; same pill row.
  - **`RateDots` gained a `side?: 'L' | 'R' | null` prop** — when set in `lr=true` mode, renders only that side's row.
- Reset rewrite:
  - Removed the bottom "Reset progress" button.
  - Each pill row has its own Reset pill with two-tap arm (1st tap → red `bg-danger` + "Confirm?"; 2nd tap → `tricksStore.resetTrickSide(id, side)` which nulls only that side's rate, then recomputes status). Auto-disarm after 3s. Three independent armed states (L/R/none).
- WorkingOnList tap-to-cycle on dots: for LR tricks now opens the sheet (was silently logging only L — confusing). Non-LR tricks still cycle in place.
- RateDots iOS Safari residual-glow fix: distinct `key` props for lit vs off so Vue fully unmounts the lit element (releases GPU compositing layer). Off-state background switched from leg tint to `gw.fg` (neutral near-white) so reset doesn't leave faint leg-colored ghosts.

### SequenceSheet "Learn N transitions" button (committed `b0a251d`)
- Sits in the **Chain** section header, right-aligned. Hidden when there are no missing transitions.
- For each missing pair: if a non-bidi inverse edge (B→A with sides swapped) exists, promote it to `bidi: true` via `transitionsStore.update`; otherwise create a fresh directional edge.

### Generator fixes (committed `b0a251d`)
- `graphWalk` resolves edges via a `byKey` map keyed by trick **id and** name. Production storage uses trick ids (seed converts at load; the graph UI stores ids on creation); the prior implementation only matched by name and returned `null` in production. Tests keep working because they fabricate edges using names.
- All three generators (`graphWalk`, `knownShuffle`, `totallyRandom`) now assign a random L/R side to LR tricks via a `pickSide` helper. Non-LR tricks stay null. New tests cover both.

### Graph fixes (committed `b0a251d` + `b3c6480`)
- **Orphan-node persistence** — `graphTricks` filter also keeps tricks with explicit `node_x/y` OR an entry in the in-memory `positions` map (drag, persisted view, fibonacci spawn). Removing the last edge no longer hides the node.
- **Move mode** — new `✥ Move` toggle in the Graph header. Default mode: node taps still work but drag never moves the node; pan starts from anywhere including a node (canvas pans from a node-originated drag). Move on: drag-to-reposition + tap (existing behavior).
- **Tap vs pan disambiguation** — in default mode the node interaction is no longer attached via d3-drag; pan goes straight to d3-zoom on the SVG. A native `click` handler on each node fires only when pointerup lands within a few pixels of pointerdown (browser-defined), so drag-then-release outside the circle no longer opens a spurious bubble.
- **GraphBubble + EdgeBubble** — `touch-action: none` on the root + `@touchstart.stop @touchmove.stop @touchend.stop` so dragging over an open bubble no longer pans the graph behind it.

### Postgres rate column migration (applied 2026-06-27 via Supabase MCP)
- `public.transitions.rate`, `public.sequences.rate`, `public.user_trick_progress.{rate, rate_l, rate_r}` all changed from `smallint` to `numeric(4, 2)`.
- Fixes "Push transitions: invalid input syntax for type smallint: 3.4" on the Diagnostics → Push local to cloud button.

### ToastStack notch fix (committed `7527850`)
- Toasts now sit at `top: calc(env(safe-area-inset-top) + 0.5rem)` instead of `top: 0.5rem`. PWA notch was hiding errors.

---

## What's NOT done

### Phase 4f — Learning
Subsumed into Home per IA — depends on 4a (now shipped, so this can pick up).

### Phase 4g — People + ForeignProfile
Components re-skinned, pages not redesigned.

### Phase 4i — Install + onboarding
Visual sweep not done.

### Phase 5 — Motion language (mostly done after autopilot pass)
Foundation (tokens + reduced-motion + sheet choreography) shipped earlier.
Autopilot pass shipped: TabBar selection morph + iOS touch ripple,
sub-tab indicator morph (SubTabSwitcher), RateDots pulse, FAB spring
tap-active, SequenceChain stagger, Graph fibonacci breathing.
**Still deferred**: generator results-list stagger reveal (the chips inside
the generator output list itself, distinct from SequenceChain); any
spring-physics library (vanilla CSS has covered every site so far);
deletion or repurposing of the now-dormant `useViewTransition`
composable + `--vt-direction` CSS block.

### Phase 7 — PWA polish
App icons at all sizes, iOS PWA splash images, theme-color + viewport
refinements, install funnel polish, final iOS Safari perf budget pass.

---

## Open bugs / things to verify next session

1. **iOS keyboard drift — ACCEPTED LIMITATION (2026-06-26)**. Unsolvable on iOS Safari after exhausting the visualViewport-fallback playbook. Reference: Bram.us *"Prevent items from being hidden underneath the virtual keyboard…"* article — the article's `interactive-widget=resizes-content` viewport meta (already in `index.html`) and `env(keyboard-inset-height)` are Chromium-only. Code lives in `src/composables/useIosKeyboardReset.ts` and `src/composables/useBodyScrollLock.ts`. **Do not re-attempt without a fundamentally new mechanism** (VirtualKeyboard API landing in WebKit, or a native wrapper).

2. **Saved graph views don't recenter on origin** — `tryInit()` only centers when no saved view exists. Users with a saved view from before the centering fix will still see misalignment until they hit `⌂` (reset view). Decide: nuke stale saved views proactively, or trust the reset button.

3. **iOS PWA tested touchpoints from the most recent device pass** that should keep getting eyes:
   - Working-on row tap-to-cycle (LR tricks open the sheet; non-LR cycles inline)
   - Rate island per-side Reset pills two-tap arm
   - Graph: tap a node from default mode → bubble; drag from a node → pan; toggle Move on → drag repositions
   - Generator: Graph mode actually produces sequences with LR tricks getting L/R sides
   - SequenceSheet: "Learn N transitions" button creates or promotes-to-bidi correctly

---

## Key files (most-touched recently)

- `src/icons/index.ts` — semantic re-export module for Tabler icons + bespoke Leg glyphs. Consumers import from here, never from `@tabler/icons-vue` directly.
- `src/icons/leg/{LegL,LegR,LegBoth,LegNone}.vue` — bespoke typography-based stance glyphs.
- `src/pages/spec/IconsPreview.vue` — dev-only preview at `/spec/icons`.
- `src/components/RateDots.vue` — gained `side?: 'L' | 'R' | null` prop; key-per-state to fix iOS compositing leak; neutral fg-tinted off state.
- `src/components/TrickSheet.vue` — rewritten rate island (Progress header + per-leg rows + per-side reset pills + RateDots integration).
- `src/components/TrickCard.vue` — rate dots in meta row; gentler emoji autosize.
- `src/components/WorkingOnList.vue` — `autosizeIconSlot` grow-slot; tap-to-cycle now opens sheet for LR; acronym fallback uppercase-only.
- `src/components/ActivityFeed.vue` — `autosizeIconSlot` grow-slot.
- `src/components/GraphView.vue` — orphan persistence in `graphTricks`; `moveMode` prop; default-mode native click vs move-mode d3-drag; d3-zoom filter respects moveMode.
- `src/pages/Graph.vue` — `✥ Move` toggle button in header; `moveMode` ref passed to GraphView.
- `src/components/GraphBubble.vue` + `src/components/EdgeBubble.vue` — `touch-action: none` + touch-event propagation stop.
- `src/components/SequenceSheet.vue` — "Learn N transitions" button + inverse-edge bidi promotion.
- `src/components/ToastStack.vue` — safe-area-aware top.
- `src/domain/generators.ts` — `pickSide` for LR; `buildTrickKeyMap` for id-or-name edge resolution.
- `src/stores/tricks.ts` — `resetTrickSide(id, side)` action + tests for plural filter still hold.
- `src/storage/fieldMap.ts` — `mapTransitionToServer` unchanged; the schema fix is server-side only.
- `src/utils/graphemes.ts` — three autosize variants + `MAX_TRICK_EMOJIS = 3`.

---

## Dev-only preview routes (gated on `import.meta.env.DEV`)

| Route | Purpose |
|---|---|
| `/#/spec/icons` | Phase 6 icon set at 16/18/20/24, default + accent, plus TabBar cohesion check |
| `/#/spec/tokens` | Color/type/material swatches |
| `/#/spec/rate-options` | RateDots variant comparison |
| `/#/spec/node-options` | Node visual variants |
| `/#/spec/edge-options` | Transition leg-indication variants |
| `/#/spec/selection-options` | Selection state language variants |

---

## Decisions log additions (don't relitigate)

- DECIDED 2026-06-26: Trick icons hold **up to 3 emojis** (`MAX_TRICK_EMOJIS`). Three autosize variants (`autosizeIcon` / `autosizeIconTight` / `autosizeIconSlot`) cover the three display contexts.
- DECIDED 2026-06-26: WorkingOnList tap-to-cycle for LR tricks opens the sheet (per-side cycling is ambiguous and was confusing in practice).
- DECIDED 2026-06-26: Rate island uses Progress header + per-leg rows + per-side Reset pills (two-tap arm). Single "Reset progress" button removed.
- DECIDED 2026-06-26: Off-state RateDots use neutral `gw.fg` background (not leg tint) so reset truly looks reset.
- DECIDED 2026-06-26: SequenceSheet shows "Learn N transitions" CTA when the chain has unlearned step pairs; promotes existing inverse to bidi when applicable.
- DECIDED 2026-06-26: Graph adds `✥ Move` mode. Default mode: pan from anywhere; native `click` for tap. Move on: d3-drag for reposition.
- DECIDED 2026-06-27: Postgres rate columns are `numeric(4, 2)`. Client computes blended floats and the server must store them.
- DEFERRED 2026-06-27: Phase 4d rehearsal-script. Doesn't fit the user's training procedure as proposed (carousel + persistent current-step). Revisit if a new direction emerges.
- DECIDED 2026-06-27: Phase 6 ships library-first via Tabler Icons re-exported under semantic names from `src/icons/index.ts`. The §7.3 "bespoke" stance softens: Tabler's house style matches the existing TabBar 1:1 (1.75 stroke / round / round / 24 grid) and is distinct enough from Lucide that the templated-tell concern does not recur. The semantic re-export layer leaves the door open for future bespoke swaps without touching consumers.
- DECIDED 2026-06-27: Leg-L / Leg-R / Leg-both / Leg-none are bespoke SVG `<text>` components in `src/icons/leg/`. No library carries these typography-based stance glyphs.
- DECIDED 2026-06-27: Tutorial buttons in TrickCard and ForeignLearningList use `IconBrandYoutube` (button title explicitly mentions YouTube). ForeignProfile back button uses `IconChevronLeft` (matches the visual character of the prior hand-drawn chevron, vs `IconBack` which is a full arrow).
- DECIDED 2026-06-27: GraphBubble plus buttons use `IconPlus` at `stroke="2"` (heavier than the project-wide 1.75) for legibility on the colored leg-tint backgrounds.
- DECIDED 2026-06-27: Icon consumers pass `stroke` as a static attribute, NEVER as a v-bind to number. Vue strict typing on Tabler's SVG attributes rejects `:stroke="1.75"`. Use `stroke="1.75"` instead.
- DECIDED 2026-06-27 (polish): Icon+text buttons use `flex items-center justify-center gap-X` directly on the button element. NOT an inner `<span class="inline-flex items-center">` wrapper — that pattern caused SVG-baseline-vs-text-baseline misalignment in block-level buttons on iOS. Pattern applies anywhere a `<button>` or `<RouterLink>` contains an icon + text.
- DECIDED 2026-06-27 (polish): ChipFilter uses `flex-wrap`, not horizontal scroll. Wrap mode shows all options without swipe discovery, sidesteps sheet-drag-vs-touch event conflicts, and the few extra vertical rows are acceptable inside a vertically-scrolling sheet.
- DECIDED 2026-06-27 (polish): Future grep checklists for "no unicode UI affordances" must include BOTH `✕` (U+2715 heavy multiplication X) AND `×` (U+00D7 multiplication sign). Round-1 only had ✕ and missed 5 sites using × — TrickSheet alias chips ×2, ToastStack toast dismiss, Tricks active-filter chip dismiss, TricksFilterSheet header close.
- DECIDED 2026-06-27 (R2 IA): Sequences page is the umbrella for two sub-tabs (`Sequences | Transitions`). `/sequences` defaults to Sequences sub-tab; `/sequences/transitions` activates Transitions. Legacy `/transitions` redirects. The standalone `Transitions.vue` is retired (gone). This subsumes Phase 4e (Transitions placement) and the deferred Phase 4d (Sequences page).
- DECIDED 2026-06-27 (R2 sticky): Top bars use `position: sticky; top: 0;` inside `.page-scroll`, NOT `position: fixed; top: env(safe-area-inset-top)`. Reason: App.vue's outer wrapper already applies `paddingTop: env(safe-area-inset-top)`. With `position: fixed`, the bar anchors to the visualViewport (which drifts on iOS PWA keyboard open). With `position: sticky` inside the padded wrapper, the bar rides normal scroll AND respects the notch via the wrapper's padding — `top: env(...)` on the sticky bar would double-offset. Add `will-change: transform` for compositing parity with TabBar. Pattern applies to Tricks.vue and Sequences.vue (and any future sticky bars).
- DECIDED 2026-06-27 (R2 FABs): Two FABs by location, distinct verbs. Sequences page (Sequences sub-tab active) FAB = `IconGenerate` → opens GeneratorSheet picker. Sequences page (Transitions sub-tab active) FAB **hidden** (no list-add UI for transitions). Graph page FAB = `IconRoute` → enters sequence-mode. Standard FAB spec: 56×56, `var(--color-g-brand)` bg, `var(--color-g-base)` glyph, `box-shadow: 0 6px 20px rgba(110,231,183,0.45), 0 0 0 1px rgba(110,231,183,0.3)`, `bottom: calc(var(--tabbar-h) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem)`, `right: 1rem`, z-30.
- DECIDED 2026-06-27 (R2 Graph): Graph top bar = centered `View | Move` 2-segment switcher (role=tablist, aria-selected). Drops h1, Transitions link, Sequence button. Switcher hides during sequence-mode. Zoom cluster (`+/−/⌂`) moves from bottom-right to bottom-left of the graph viewport to free bottom-right for the Build FAB.
- DECIDED 2026-06-27 (R2 bubble): Sequence-mode bubble has `min-width: min(280px, calc(100vw - 1.5rem))` so the empty state has presence. Hint text centered. Undo + Save remain disabled until ≥1 / ≥2 steps; Cancel always works. Same `gw-glass-strong` chrome as before.
- DECIDED 2026-06-27 (R2 SequenceSheet): Step rows are whole-row tappable (`<button>` wrapping content); explicit Open button removed. Chrome migrated to `gw-glass-strong` + chip radius from `bg-card-2`/`border-border-2`. L/R/null side indicator uses `LegL`/`LegR`/`LegNone` components (removed `sideColor()` helper). Name-edit input + Save/Cancel buttons + Delete button all on Glasswork tokens.
- DECIDED 2026-06-27 (R2 follow-up — sticky safe-area): Sticky bars use `top: env(safe-area-inset-top)`, NOT `top: 0`. The earlier "double offset" reasoning (commits `0a8b4a7` etc.) was wrong: `position: sticky` tracks the viewport when stuck (body is the scrolling ancestor; no inner overflow), so `top: 0` lands under the notch. App.vue's outer-wrapper `paddingTop` only positions the INITIAL flow, not the stuck state. Fix shipped in `66c466b`. Pattern: any sticky bar that needs to sit below the notch when stuck must include `env(safe-area-inset-top)` in its `top`.
- DECIDED 2026-06-27 (R2 follow-up — FAB style): FABs are Apple-glass pills with text label, NOT solid brand-color circles with green glow. Recipe: `background: rgba(255,255,255,0.10)`, `backdrop-filter: blur(24px) saturate(180%)`, `inset 0 0 0 0.5px rgba(255,255,255,0.18)` hairline border, `0 4px 16px rgba(0,0,0,0.30)` drop shadow, 44px tall, `padding: 0 16px 0 14px`, `border-radius: 999px`, icon 18px + label 13px white. Sequences FAB = "Generate", Graph FAB = "Build". Same chrome on both. Replaces commit `2a38c00` / `b3128c1` styling. Live preview at `/spec/fab-options` (dev only).
- DECIDED 2026-06-27 (R2 follow-up — Graph mode switcher): View/Move switcher is a floating glass pill in the top-right corner of the graph viewport, NOT a layout-row top bar. Recipe: `background: rgba(20,25,32,0.55)`, `backdrop-filter: blur(20px) saturate(180%)`, `inset 0 0 0 0.5px rgba(255,255,255,0.10)` hairline border, `border-radius: 999px`. Active segment is solid white pill with dark text. `position: absolute; top: 12px; right: 12px;` inside the graph area; safe-area is already handled by App.vue's wrapper padding. Hides during sequence-mode. Frees ~36px of vertical graph canvas vs the old top-bar approach. Live preview at `/spec/graph-mode-options` (dev only).
- DECIDED 2026-06-27 (Phase 5 — motion vocabulary): Four durations (`--motion-g-fast` 150ms / `--motion-g-base` 240ms / `--motion-g-slow` 320ms / `--motion-g-deliberate` 480ms) + four easings (`--ease-g-out` / `--ease-g-in` / `--ease-g-inout` / `--ease-g-spring`). Defined in `src/design/glasswork.css` alongside the rest of the Glasswork tokens. **Consumers MUST use tokens** — no hard-coded `Xms` / `cubic-bezier(...)` literals in `src/` except `glasswork.css` token definitions and the dev-only `/spec/*` preview pages.
- DECIDED 2026-06-27 (Phase 5 — reduced-motion strategy): A single `@media (prefers-reduced-motion: reduce)` block in `glasswork.css` collapses all duration tokens to ~100ms (fast → 0.01ms). Consumers get a11y for free by referencing tokens. Components that also use transform-based motion (sheets, bubbles, toasts) declare an additional local `@media (prefers-reduced-motion: reduce)` block that removes the transform via `transform: none !important;` — net effect = fade-only, no slide, no jarring snap.
- DECIDED 2026-06-27 (Phase 5 — sheet enter architecture): All 6 sheets use a **two-layer panel structure**. The outer `.sheet-panel-anim w-full` div carries the class-based enter/leave slide-up via `<Transition name="sheet">` CSS. The inner `.sheet-panel` keeps all existing chrome (`gw-glass-strong`, `max-h-Xdvh`, drag-to-close via inline `transform: translateY(${dragY}px)`, touch handlers, scroll lock). The two layers exist because the inline drag transform on the inner panel would otherwise overwrite the class-based enter transform via CSS specificity (inline > class). Separating concerns makes the slide actually fire. Pattern is the same for every sheet — copy/paste discipline.
- DECIDED 2026-06-27 (Phase 5.1 — TabBar View Transition): TabBar uses View Transitions API (iOS Safari 18+ / Chrome 111+) with a directional slide based on TAB_ORDER index diff (Home/Tricks/Graph/Sequences = 0/1/2/3). `--vt-direction` CSS variable carries -1/0/+1. Deep links keep VT default (cross-fade) when supported. Reduced-motion + unsupported browsers degrade to instant nav. Wiring: `useViewTransition` composable + TabBar `RouterLink custom` slot click intercept + CSS `@supports (view-transition-name: root)` block. `--vt-direction` resets to 0 in a `finally` block after every TabBar nav so programmatic nav stays neutral.
- DECIDED 2026-06-27 (Add-new-trick): Tricks page gets a "New trick" FAB matching the Sequences/Graph Apple-glass pill pattern. Tap opens `TrickCreationSheet` (new component using the Phase 5 two-layer sheet pattern). Minimal form: name + tier + category + LR + optional icon + optional first alias. Extended fields (entry/exit/video/multi-aliases/tags) are intentionally deferred to the existing TrickSheet edit flow — the post-save handler closes the create sheet and immediately calls `ui.openSheet(newId)` so the user can fill them in without an extra navigation step. `tricksStore.create()` action throws on empty name and defaults entry/exit to `'2/f'`, status to `'Not Started'`, and all progress fields to null. The post-save → TrickSheet handoff IS the success confirmation (no toast).
- DECIDED 2026-06-28 (Trick Library — data model): Tricks stored as canonical (catalog row, creator-owned, shared across adopters) + per-user overlay (in `user_trick_progress` extended). Canonical = `id, createdBy, visibility, name, tier, category, entry, exit, lr, defaultAliases, defaultTags, defaultIcon, defaultVideo`. Overlay = `userId, trickId, rate, rateL, rateR, last, status, aliases, tags, mainAlias, iconOverride, videoOverride, nodeX, nodeY, fav`. View merge rule: canonical fields always; overlay arrays override defaults when non-empty; overlay nullables override defaults when non-null; per-user-only fields (mainAlias, fav, nodeX/Y, progress) are overlay-only with no canonical fallback.
- DECIDED 2026-06-28 (Trick Library — adoption + privacy): Adoption = overlay-row-existence (no separate adoptions table). Creator's canonical edits propagate to all adopters; per-user overlay isolates personalizations. Privacy default = `private` on create; explicit publish toggle in TrickSheet's Library section (visible only when `createdBy === me`). Seeded canonical (`createdBy: null`) is always public. Anonymous users cannot publish or adopt.
- DECIDED 2026-06-28 (Trick Library — IA): Tricks page is now an umbrella with `My Tricks | Library` sub-tabs (mirrors Sequences pattern). `/tricks` = My Tricks default. `/tricks/library` = Library browse. FAB visible only on My Tricks. Filter button + sort cycle swap per sub-tab. Library sub-tab is lazy-loaded on tab activation (not page mount).
- DECIDED 2026-06-28 (Trick Library — scale): Library uses server-side cursor pagination (50/page) + debounced ilike name search (300ms) + virtual list via `vue-virtual-scroller` v2-beta (~10KB gzip, MIT). New dep added. Filter chips (tier, category) applied server-side via `.in()` clauses. Postgres GIN index on `to_tsvector('english', name)` provisioned for future full-text upgrade if `ilike` becomes slow.

---

## Recommended next moves

Phase 5 motion language is *largely* shipped after the autopilot pass. Only small follow-ups remain (generator results-list stagger, optional dead-code cleanup of `useViewTransition` + `--vt-direction` CSS).

1. **Phase 4f (Learning fold-in to Home).** Smallest open screen-level item; depends on 4a, which is shipped.
3. **Phase 4g (People + ForeignProfile pages).** Visual coherence sweep.
4. **Phase 4i (Install + onboarding).** Visual sweep.
5. **Phase 7 (PWA polish).** App icon, splash, perf budget pass. Best done last.
6. **OAuth-on-dev fix.** Add localhost origins to Supabase Authentication → URL Configuration. Small standalone item; unblocks dev-side Library testing.
7. **Dead-code cleanup**: delete `src/composables/useViewTransition.ts` and the `@supports (view-transition-name: root)` block in `src/style.css` if no future plan needs them. Currently dormant after AP3 replaced them with the indicator-morph approach.

## Device smoke-test queue (verify after pushing R2)

After `git push origin main` (deploys to GH Pages), eyeball these on the iOS PWA:
- /sequences: search row collapses on scroll-down, sub-tab strip stays pinned, FAB visible on Sequences sub-tab and hidden on Transitions.
- /sequences/transitions: filter button opens TransitionsFilterSheet with sheet enter/leave animation; category filter applies live.
- Legacy /transitions URL redirects to /sequences/transitions.
- /tricks: sticky bar uses `position: sticky` (no notch-drift on the bar itself).
- /graph: centered View/Move switcher at top, zoom cluster bottom-left, Build FAB bottom-right (hidden during sequence-mode).
- Sequence-mode bubble at min 280px width on empty state — no more "tiny broken" look.
- SequenceSheet: header IconRoute, rename IconEdit, step rows tappable opens trick sheet, Leg* glyphs render, name-edit + Save/Cancel + Delete all use Glasswork chrome.

---

## Pinned reference

- Supabase project ref: `tdpetpsexwfblrhwunup`
- GH Pages base path in prod: `/slalom-app/`
- Hash router. SPA fallback via copying `index.html` → `404.html` in CI.
- Auth storage key: `slalom.sb.auth`
- Dexie name: `slalom`, current version 4
- Preferences localStorage key: `slalom.prefs.v1`
- Postgres: `transitions.rate`, `sequences.rate`, `user_trick_progress.{rate, rate_l, rate_r}` are all `numeric(4, 2)` as of 2026-06-27.

---

## Prompt for new session

Paste this into a fresh `claude` invocation:

```
Continue the Glasswork redesign. Branch is main at 06b56f7, in sync
with origin. 176/176 tests pass, build clean.

Autopilot animation pass shipped (commits 1334441 → 40b9c52, no spec
doc; the SESSION-HANDOFF "Autopilot animation polish" section is the
spec): badge unmask, glass-frost pre-warm, TabBar indicator morph +
touch ripple (replaces slide-VT), SubTabSwitcher, RateDots pulse, FAB
spring tap-active, SequenceChain stagger, Graph fibonacci breathing.

Trick Library shipped earlier this session (canonical+overlay split,
My Tricks | Library sub-tabs, adoption flow). Supabase migration
applied. Two hotfixes after live testing (camelCase outbox mapping +
RLS-safe null-creator skip). After push: verify on live (dev OAuth
still broken; library requires sign-in to test beyond canonical seed).
Document any device issues for follow-up.

Node positions now save on drag (was a pre-existing silent bug —
saveCurrentView read stale persisted state instead of GraphView's
live in-memory positions).

READ FIRST (in this order):
- spec/SESSION-HANDOFF.md  ← single source of truth for current state
- spec/2026-06-24-redesign-glasswork-design.md  ← direction
- spec/2026-06-24-redesign-glasswork-roadmap.md  ← phase map
- spec/2026-06-24-glasswork-ia-decisions.md  ← IA
- spec/2026-06-27-glasswork-phase-6-iconography-design.md  ← Phase 6 spec
- spec/2026-06-27-glasswork-phase-6-polish-round-2-design.md  ← Phase 6 R2 spec

Shipped: Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h, 6 + Phase 6 polish rounds 1 & 2.
Phase 6 polish R2 subsumed previously-open Phase 4e (Transitions placement)
and previously-deferred Phase 4d (Sequences page) — both resolved.
Open: 4f, 4g, 4i, 5, 7.

Phase 6 polish round 2 shipped 2026-06-27 (commits 6c25f9b through a83799a):
- IA: Sequences page is umbrella for Sequences | Transitions sub-tabs.
  Legacy /transitions redirects to /sequences/transitions.
- Unified top-bar pattern: sticky wrapper with collapsible search row +
  pinned sub-tab strip. Per-sub-tab UI state in useUiStore.
- position: sticky (not fixed) + top: 0 (NOT env(safe-area-inset-top)).
  App.vue's outer wrapper already pads safe-area-top; sticky inside the
  padded wrapper would double-offset on notched iOS. Plus
  will-change: transform for compositing parity.
- Two FABs by location, distinct verbs: Generate on Sequences sub-tab
  (opens GeneratorSheet); Build on Graph (enters sequence-mode); hidden
  on Transitions sub-tab.
- Graph top bar = centered View/Move 2-segment switcher. Drops h1,
  Transitions link, Sequence button. Zoom cluster moved to bottom-left
  of graph viewport.
- Sequence-mode bubble has min-width 280px so empty state has presence.
  Undo/Save disabled until ≥1/≥2 steps; Cancel always works.
- SequenceSheet: 🔗 → IconRoute, ✎ → IconEdit. Step rows whole-row
  tappable (drops Open button) with gw-glass chrome + LegL/LegR/LegNone
  side glyphs. Name-edit + Delete chrome migrated to Glasswork tokens.
- Two new icons: IconRoute, IconPencil as IconEdit.

Settled decisions are in spec/SESSION-HANDOFF.md "Decisions log" — don't
relitigate without specific reason.

Dev-only preview routes for design research:
  /spec/icons, /spec/tokens, /spec/rate-options, /spec/node-options,
  /spec/edge-options, /spec/selection-options.

Device smoke tests pending (after push to GH Pages):
- /sequences sub-tab switching + Generate FAB sub-tab-awareness
- /tricks sticky-bar behavior after fixed → sticky migration
- /graph View/Move switcher + Build FAB
- Sequence-mode bubble min-width on empty state
- SequenceSheet Glasswork chrome end-to-end

Three iOS-PWA gotchas worth knowing about (caught in device review):
- DO NOT add `overscroll-behavior-y: none` to html/body inside the
  @media (display-mode: standalone) block. It kills iOS rubber-band
  scroll and makes the whole app feel stiff. Sheets manage scroll
  lock at sheet level; translateZ(0) on .tabbar-fixed pins it
  during overscroll. Both already in place.
- Ripples / overlays on TabBar tabs must live on .tab-grid, not on
  individual .tab-button (.tab-button has overflow:hidden).
- Filter-button count badge overhangs (-top-1/-right-1). The
  containing .search-row has overflow:hidden for collapse animation;
  give the row 5px top+right padding to fit the overhang inside its
  clip box. NOT a backdrop-filter issue.

Recommended next moves (in order):
1. Phase 4f (Learning fold-in to Home) — smallest open screen item.
3. Phase 4g (People + ForeignProfile pages) — visual coherence sweep.
4. Phase 4i (Install + onboarding) — visual sweep.
5. Phase 7 (PWA polish) — app icon, splash, perf budget pass. Last.
6. Fix OAuth-on-dev (Supabase redirect URIs).
7. Optional cleanup: delete dormant useViewTransition composable + the
   --vt-direction CSS block (replaced by AP3 indicator morph).

What I want to do this session: [ describe the phase or specific issue ]
```
