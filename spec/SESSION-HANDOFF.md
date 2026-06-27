# Session handoff — 2026-06-27

Picking up next session: paste the **"Prompt for new session"** at the bottom
of this file into a fresh `claude` invocation at
`/Users/kzubenko/Projects/slalom-app`. Or `claude --resume` and choose the
recent slalom-app session.

---

## State right now

- **Branch**: `main` at `5a63fdd`, **pushed to `origin/main`** (GH Pages
  redeploy on every push).
- 144/144 tests pass, build clean.
- Glasswork redesign: **Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h, 6 shipped to
  prod.** Phase 4d **DEFERRED** (doesn't fit the user's training procedure
  — see Decisions log). Phases 4e/f/g/i + 5 + 7 still open.
- Server-side: `transitions.rate`, `sequences.rate`, and
  `user_trick_progress.{rate, rate_l, rate_r}` columns migrated from
  `smallint` to `numeric(4, 2)` so the client's blended rates (e.g. `3.4`)
  push cleanly.

## Recent commits worth scanning (most recent first)

```
5a63fdd Phase 6 step 9: RateFeedback close ✕ → IconClose
016d2c2 Phase 6 step 8 (sweep 5): inline SVGs → Tabler
c923603 Phase 6 step 7 (sweep 4): button-icon emoji 🎲 ⌂ ✥ → Tabler
e967b53 Phase 6 step 6 (sweep 3): chevrons / arrows / check / plus
f3864fa Phase 6 step 5 (sweep 2): favorites ★/☆ → IconFavOn / IconFavOff
99cd189 Phase 6 step 4 (sweep 1): close glyph -> IconClose
f957709 Phase 6 step 3: /spec/icons preview route
1303d71 Phase 6 step 2 fix: LegNone stroke-width 2 → 1.75 (TabBar cohesion)
545f9e5 Phase 6 step 2: bespoke Leg glyph components (L / R / L·R / —)
69e83bf Phase 6 step 1: install @tabler/icons-vue + create src/icons module
afe7ec4 Phase 6 (Iconography) implementation plan
f1d4442 Phase 6 (Iconography) design spec
6e484cb Session handoff: 2026-06-27 — phases 4a/4b/4h shipped + recent polish, 4d deferred
b3c6480 Graph: pan starts from anywhere (including nodes); native click for tap
7527850 ToastStack: place below safe-area-inset-top (notch was hiding errors)
```

`git push origin main` — when ready to ship.

---

## What's shipped since the 2026-06-26 handoff (additive)

### Phase 6 — Iconography (shipped 2026-06-27) — SHIP GATE cleared
- Library-first via `@tabler/icons-vue` (v3.x) re-exported under semantic names from `src/icons/index.ts`. TabBar 4 entity marks kept as-is (already custom and slalom-flavored). Bespoke `Leg*.vue` components in `src/icons/leg/` for L / R / both / none stance glyphs (no library carries these). Zero unicode glyphs used as UI affordances anywhere in `src/`.
- Spec: `spec/2026-06-27-glasswork-phase-6-iconography-design.md`. Plan: `docs/superpowers/plans/2026-06-27-glasswork-phase-6-iconography.md`.
- Notable spec amendments: §7.1 "no library defaults" → "Tabler is acceptable, sits cohesively with TabBar". §7.3 stroke language locked at 1.75 / round / round / 24 grid (matches existing TabBar SVGs 1:1).
- Dev-only preview at `/#/spec/icons` (added to the existing spec-route block).
- Cohesion convention: every consumer passes static `stroke="1.75"` attribute (NOT v-bind — Vue strict typing rejected the number-bind form). Documented in `src/icons/index.ts` and `src/icons/README.md`.
- Addressed the brainstorm-time bug where `➕` on GraphBubble's leg buttons was barely visible on colored backgrounds — replaced with `IconPlus` at `stroke="2"` (heavier weight) for legibility.
- Implementer also caught two omissions from the inventory during sweep 5: Tricks page had a filter SVG (now `IconFilter`) and a `⌕` unicode search glyph (now `IconSearch`).

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

### Phase 4d — Sequences (DEFERRED 2026-06-27)
User decided the carousel rehearsal-script direction doesn't fit how they
actually rehearse. The brainstorm was halted before the spec was written.
The existing SequenceSheet keeps its compact list shape; the new
"Learn N transitions" button is the only recent change here.

### Phase 4e — Transitions
Only a placeholder `↔ Transitions` link in Graph header. Real placement
(list view inside Graph? separate route?) undecided.

### Phase 4f — Learning
Subsumed into Home per IA — depends on 4a (now shipped, so this can pick up).

### Phase 4g — People + ForeignProfile
Components re-skinned, pages not redesigned.

### Phase 4i — Install + onboarding
Visual sweep not done.

### Phase 5 — Motion language
Spring physics presets, View Transitions API, sheet choreography,
generator stagger, fibonacci grid breathing animation, tap-to-cycle
pulse on RateDots — all with `prefers-reduced-motion: reduce` paths.

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

---

## Recommended next moves

1. **Phase 5 (Motion language).** Spring physics + View Transitions + sheet choreography. High-leverage polish moment; can happen any time.
2. **Phase 4f (Learning fold-in to Home).** Smallest open screen-level item; depends on 4a, which is shipped.
3. **Phase 4g (People + ForeignProfile pages).** Visual coherence sweep.
4. **Phase 4e (Transitions placement).** Decide list view vs route; small IA call.
5. **Phase 4i (Install + onboarding).** Visual sweep.
6. **Phase 7 (PWA polish).** App icon, splash, perf budget pass. Best done last.

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
Continue the Glasswork redesign. Branch is main at 5a63fdd, on origin
(pushed). 144/144 tests pass, build clean.

READ FIRST (in this order):
- spec/SESSION-HANDOFF.md  ← single source of truth for current state
- spec/2026-06-24-redesign-glasswork-design.md  ← direction
- spec/2026-06-24-redesign-glasswork-roadmap.md  ← phase map
- spec/2026-06-24-glasswork-ia-decisions.md  ← IA

Shipped: Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h, 6. Phase 4d DEFERRED
(carousel doesn't fit user's training procedure). Open: 4e, 4f, 4g, 4i,
5, 7.

Phase 6 (Iconography — SHIP GATE) is now complete:
- Library-first via @tabler/icons-vue re-exported from src/icons/index.ts.
- Bespoke Leg* components for L/R/both/none stance glyphs.
- Zero unicode glyphs used as UI affordances anywhere in src/.
- Dev-only preview at /spec/icons.

Settled decisions are in spec/SESSION-HANDOFF.md "Decisions log" — don't
relitigate without specific reason.

Dev-only preview routes for design research:
  /spec/icons, /spec/tokens, /spec/rate-options, /spec/node-options,
  /spec/edge-options, /spec/selection-options.

Recommended next phases (in order): Phase 5 (motion language), Phase 4f
(Learning fold-in to Home), Phase 4g (People + ForeignProfile pages),
Phase 4e (Transitions placement), Phase 4i (Install + onboarding),
Phase 7 (PWA polish).

What I want to do this session: [ describe the phase or specific issue ]
```
