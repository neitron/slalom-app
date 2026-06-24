# Glasswork Redesign — 7-Phase Roadmap

Date: 2026-06-24
Direction spec: `spec/2026-06-24-redesign-glasswork-design.md`
Phase 1 implementation plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-1-ia-and-tokens.md`

This document is the **roadmap** — it owns sequencing, dependencies, and acceptance criteria for the redesign as a whole. It does not own task-level implementation. Each phase gets its own detailed implementation plan, written when its prerequisites are met.

---

## Phasing principles

1. **No big-bang rewrite.** Every phase must ship to production on its own and leave the app working.
2. **Forward-only bridging.** Old tokens and components coexist with new ones during transition phases. The old system is removed only after the last consumer migrates.
3. **Visual coherence is allowed to be temporarily imperfect.** During Phase 2–4, mixed-design screens are expected. The acceptance bar is "no broken functionality," not "fully redesigned."
4. **Ship gates are explicit.** Some phases (notably P6 iconography) are gates: the redesign is not "done" until they pass.
5. **iOS Safari is the perf reference platform.** Frost + blur + gradient costs real frame budget on iOS PWAs. Every phase that touches material has a perf checkpoint on real iOS hardware before merge.

---

## Phase 1 — Information architecture + token system

Sequenced first because every later phase needs both.

**Goal.** Decide the navigation/IA model. Define a complete token system (color, surface, type, motion, pattern) and bridge it to the existing app so old screens keep rendering.

**Inputs.**
- Glasswork direction spec.
- Current app inventory (10 routes, 6 tabs, 8 stores, current token system).
- User-flagged constraints: keep Graph prominent; social = side trip; quick-search-first; in-session tap-to-cycle.

**Deliverables.**
- `spec/2026-06-24-glasswork-ia-decisions.md` — final IA decisions, route map, tab map, decision log.
- New token system in `src/style.css` + `tailwind.config.js` (or `@theme` in v4 form), with old tokens preserved alongside.
- Concrete hex values for: base, lilac lead, leg L/R/both/none, rate scale (single hue + density variants), peach/mint/sky supporting accents, danger.
- A token-preview route (`/spec/tokens`, hidden behind a dev flag) showing every swatch + every typographic size + every pattern fill. Manual reference.
- Contrast + ΔE verification tests in `src/__tests__/tokens.spec.ts`.
- A small Tailwind utility set for the glass panel (`.glass`, `.glass-strong`, `.aurora-bg`, `.hatch-fill`).
- Detailed plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-1-ia-and-tokens.md`.

**Acceptance criteria.**
- IA decisions doc committed and signed off by the user.
- All new tokens defined with hex values that pass the contrast + ΔE tests.
- Token-preview route renders cleanly on iOS Safari (real device check).
- Existing app continues to build, all 70+ tests pass, no visual regressions on existing screens (because old tokens are preserved).
- App is deployable to GH Pages from this phase's branch.

**Out of scope.**
- Touching any existing component's markup.
- Changing routing or `App.vue` shell.
- Implementing motion, iconography, or screen-level redesigns.

**Risks.**
- Hex values are aesthetic decisions and may need iteration after the user sees the preview. Plan reserves a "tune hexes after preview" step.
- The current `tailwind.config.js` uses Tailwind v4 + a referenced `tailwind.config.js`. Need to verify whether to express tokens via the config or via `@theme` in CSS.

**Estimated relative size.** Medium. ~1–2 sessions of focused work.

---

## Phase 2 — Nav / shell architecture

**Goal.** Replace `App.vue` + `TabBar.vue` + header with a new shell that reflects the new IA, sized to ≤5 bottom tabs (Phase 1's IA decision likely lands on 4 + header). Architect cleanly *without* the postponed iOS keyboard workaround.

**Inputs.**
- Phase 1 IA decisions + tokens.
- Glasswork's frost + aurora material direction.

**Deliverables.**
- New `App.vue` shell with explicit safe-area handling.
- New `TabBar.vue` rendering only the IA-decided tabs.
- New header treatment (or removal — decided in Phase 1 IA).
- Sheet base re-skinned in glass (TrickSheet, TransitionSheet, SequenceSheet, GeneratorSheet, save-sheet on Graph).
- Removal of `useIosKeyboardReset` (the postponed-bug workaround).
- Cleanup of the dual-ResizeObserver `--header-h` / `--tabbar-h` layout dance — replaced by whatever the new shell makes natural.
- Detailed plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-2-nav-shell.md` (written after Phase 1 ships).

**Acceptance criteria.**
- New shell renders every existing route without functional regression.
- Tests still pass.
- iOS Safari: no `100vh` jumpiness, safe-areas respected, keyboard open/close doesn't push UI off-screen during normal use (drift bug is acknowledged but not required to be fixed here).
- Perf checkpoint: shell + idle Tricks page sustains 60fps on real iOS hardware.
- People + Settings continue to be reachable from the new shell.

**Out of scope.**
- Component-level visual changes inside screens (defer to Phase 3).
- Per-screen layout changes (defer to Phase 4).
- The iOS keyboard drift bug — reassessed *if* the new shell incidentally resolves it; otherwise still postponed.

**Risks.**
- Removing the `useIosKeyboardReset` workaround may surface the original drift bug. Acceptable per the user's "postpone" decision, but Phase 2 acceptance must explicitly *not* require the drift to be solved.
- Sheet re-skin touches a lot of code at once. The Phase 2 plan must keep this scoped (re-skin only — no behavior changes).

**Estimated relative size.** Medium–large. ~2 sessions.

---

## Phase 3 — Core components

**Goal.** Re-skin the shared component primitives in Glasswork material/type/color, *without changing their interfaces or per-screen layouts*. After this phase, every screen still has the same content layout, but rendered in the new visual language.

**Inputs.**
- Phase 1 tokens.
- Phase 2 shell.

**Components in scope.**
- `TrickCard`, `TransitionCard`, `SequenceCard`
- `RateDots` (the off-hue density treatment)
- `RateButtons`
- `ChipFilter`, `TierTabs`, `SearchSort`
- `LegChooser`, `EdgeBubble`, `GraphBubble`
- `AvatarBadge`, `FriendButton`, `ProfileSearchResult`
- `SyncStatusDot`, `ToastStack`
- The `RateFeedback` overlay

**Deliverables.**
- All listed components updated to new tokens, new type, new corner radii.
- `RateDots` migrated from hue-traffic-light to density treatment (a meaningful behavior change inside a component, but interface-compatible).
- Visual regression baseline captured (manual screenshots per component) before and after, to verify scope didn't creep into layout changes.
- Detailed plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-3-core-components.md`.

**Acceptance criteria.**
- Every existing screen still renders without functional regression.
- All tests still pass; `RateDots` semantic tests updated to assert the new density-based output (but the *prop interface* is unchanged).
- iOS Safari perf checkpoint on the densest screen (AllTricks, ~80 cards) — sustained 60fps scroll.

**Out of scope.**
- Layout changes per screen (Phase 4).
- Replacing icons (Phase 6 — icons stay Lucide during Phase 3, marked for replacement).
- Adding motion beyond what already exists (Phase 5).

**Risks.**
- `RateDots` carries semantic meaning across the codebase. The density treatment must be unambiguous (the user-noted concern: first-time users may read "filled" as "good"). Phase 3 plan must include a first-encounter affordance — possibly a tooltip on first long-press, or a subtle legend on Learning's empty state.

**Estimated relative size.** Large. ~3 sessions. The biggest pure-visual phase.

---

## Phase 4 — Screen-by-screen

**Goal.** Apply IA decisions and per-screen redesigns to each route. This is the phase that *visibly changes the app*.

**Inputs.**
- Phases 1–3 (IA, tokens, shell, components).

**Per-screen work (each shippable independently):**
- `4a. Home / session` — new surface. The "what should I do right now" screen.
- `4b. Tricks` — search-first interaction; consider dropping tier tabs in favor of a filter sheet; aurora-bg policy.
- `4c. Graph` — the centerpiece. Fibonacci anchor-dot grid as substrate. Sequence-mode UI refined.
- `4d. Sequences list + generator + sheet` — SequenceSheet treated as rehearsal script (large readable steps, big side glyphs, rate-after-run sheet).
- `4e. Transitions` — placement decided in IA (likely subsumed into Graph as a list view).
- `4f. Learning` — subsumed into Home / surfaced via Home → Practiced.
- `4g. People + Foreign profile` — demoted; visual coherence sweep.
- `4h. Settings (split)` — user-facing settings reorganized; `Diagnostics` page split off.
- `4i. Install + onboarding nickname` — visual coherence sweep on existing flows.

**Deliverables.**
- Each screen ships its own commit/branch and is independently testable.
- Per-screen plan documents: `docs/superpowers/plans/2026-06-24-glasswork-phase-4{a..i}-*.md`.

**Acceptance criteria per screen.**
- All existing functionality preserved unless explicitly redesigned (e.g., the tier-tabs change in 4b is a deliberate IA change).
- All tests still pass; new screens have new tests.
- iOS Safari perf check on the screen.

**Out of scope.**
- Motion beyond functional state changes (Phase 5).
- Bespoke icons (Phase 6 — Lucide stand-ins still allowed, marked).
- PWA install funnel polish (Phase 7).

**Risks.**
- Home is a *new surface*. Easy to over-design. Plan must constrain it to a minimal v1 (what's-being-drilled, recent activity, jump-to-graph, jump-to-current-sequence — and stop there).
- Graph fibonacci-dot work has perf risk (rendering hundreds of dots in SVG/canvas).

**Estimated relative size.** Largest phase. ~6–10 sessions, distributed across 4a–4i.

---

## Phase 5 — Motion language

**Goal.** Add the kinetic motion the user explicitly chose: springs, view transitions, sheet choreography, microinteractions.

**Inputs.**
- Phases 1–4 ship with functional placeholder motion (Tailwind defaults + existing sheet drag).

**Deliverables.**
- A motion utility module (`src/motion/` or similar) defining spring presets, view-transition helpers, and Vue composables for common patterns (`useTapPulse`, `useSheetSpring`, `useViewTransition`).
- View Transitions API integration where supported, spring fallback elsewhere.
- Motion on: tap-to-cycle rate dot, sheet open/close, route transitions, generator stagger, Graph fibonacci-grid breathing.
- `prefers-reduced-motion` paths for all of the above.
- Detailed plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-5-motion.md`.

**Acceptance criteria.**
- Each motion moment listed above is implemented and reviewable in the app.
- `prefers-reduced-motion: reduce` disables all overshoot/parallax/breathing motion; functional state changes still animate (linearly).
- iOS Safari perf check: no frame drops under sustained interaction (tap-to-cycle repeatedly, scroll a list during sheet open).

**Out of scope.**
- Adding new screens or features.
- Sound effects.

**Risks.**
- Adding spring physics may need a library. Options: hand-rolled with `requestAnimationFrame` (no dep), or a small library (`@vueuse/motion`, `popmotion`, `motion`). The plan must choose and justify before introducing a dependency — per the rule that new deps require approval.

**Estimated relative size.** Medium. ~2 sessions.

---

## Phase 6 — Bespoke iconography

**SHIP GATE.** The redesign cannot ship to a final state until this phase completes. Phases 1–5 use Lucide stand-ins with explicit markers; Phase 6 replaces them.

**Goal.** Design and integrate a bespoke icon set for all Slalom-specific entities and primary UI symbols.

**Inputs.**
- All preceding phases (icons are placed where they finally need to be).

**Deliverables.**
- Source SVGs for the icon set listed in the design spec §7.2.
- A `src/icons/` module exporting all icons as Vue components with consistent props (`size`, `currentColor`-driven stroke).
- Replacement of every Lucide / Feather use in the codebase with the new icons.
- Detailed plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-6-iconography.md`.

**Acceptance criteria.**
- Zero remaining inline Lucide-style SVG strokes in the app.
- Icon set previewed on a `/spec/icons` dev route, all sizes (16/20/24), all states (default/active).
- iOS Safari: no rendering issues with custom SVGs at retina + zoomed scales.

**Out of scope.**
- Marketing illustrations.
- App icon / splash images (Phase 7).

**Risks.**
- Icon design is real creative work. Sourcing options (in-house, contractor, premium icon library + custom additions) is itself a decision the Phase 6 plan must resolve before tasks start.
- Slalom-specific marks (cone, chain, spiral) may need 2–3 design rounds.

**Estimated relative size.** Medium–large in elapsed time, smaller in implementation effort. Bottleneck is design, not code.

---

## Phase 7 — PWA polish

**Goal.** iOS-native polish: app icon set, splash screens, install funnel, safe-area edge-case handling, theme-color refinement, install prompt placement, and a final perf budget pass.

**Inputs.** Everything that came before.

**Deliverables.**
- New app icon at all required sizes for iOS / Android / favicon.
- Splash images for iOS PWA install.
- `index.html` `<meta>` updates: `theme-color`, `apple-mobile-web-app-*`, viewport refinements.
- Refined `/install` page using the new design language; install-prompt placement audited.
- Final iOS Safari perf budget pass: LCP, scroll fps, interaction latency on AllTricks (densest screen) and Graph (most expensive screen).
- Detailed plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-7-pwa-polish.md`.

**Acceptance criteria.**
- All install / splash assets present and referenced.
- iOS PWA install from `/install` produces an installed app with correct icon and splash.
- LCP < 2.5s on a cold cache on a mid-tier iPhone.
- AllTricks scroll holds 60fps with 80+ cards loaded.

**Out of scope.**
- Push notifications (M4 territory).
- Practice-log charts (M4).

**Estimated relative size.** Small–medium. ~1–2 sessions, partly dependent on icon set delivery.

---

## Cross-phase concerns

### Token bridging strategy

During Phase 1 → Phase 3, **old tokens and new tokens coexist**. Existing components reference old token names; new components and re-skinned components reference new names. The Phase 1 plan must define the bridge explicitly (e.g., new tokens live under a `g-` prefix or a `--gw-` CSS-var namespace, old ones remain).

The old tokens are removed only at the *end* of Phase 3 (or beginning of Phase 4), once no consumer references them.

### iOS Safari perf budget

Frost + backdrop blur + animated gradients in a PWA are not free. Every phase that introduces material has a perf checkpoint:

- P1: token-preview route — informal check, frost panel + aurora bg sustaining 60fps idle.
- P2: shell — sustained 60fps with a list visible.
- P3: densest screen (AllTricks) — sustained 60fps scroll.
- P5: motion — sustained 60fps during spring-heavy interactions.
- P7: final budget pass — LCP, FID/INP, scroll fps.

If a checkpoint fails, the phase that introduced the cost owns the fix — either by trimming the gradient policy, reducing blur radius, or layering differently. This is *not* a separate phase.

### iOS keyboard drift (postponed)

The iOS TabBar drift bug from M3.5 (six mechanisms T1–T6 tried, none stuck) is **out of scope for the redesign**. The new shell will be architected without the workaround. If the new shell incidentally resolves it: bonus. If not: it's re-attempted as a separate, post-Phase-7 task with a fresh approach.

### Decision log

Every phase plan ends with a "decisions made" section appended to its closing commit message. Subsequent phases can refer back. This is how the redesign stays coherent across many sessions.

### Independent shippability

Every phase ships to production on its own. Branch hygiene:

- Phase 1 ships on `main`.
- Phases 2–7 are each their own branch off `main`, merged when their acceptance criteria pass.
- Intermediate work-in-progress branches are fine but never become long-lived.

---

## Sequencing summary

```
Phase 1 — IA + tokens                  [foundation]
   ↓
Phase 2 — Nav/shell                    [structural]
   ↓
Phase 3 — Core components              [visual baseline]
   ↓
Phase 4 — Screen-by-screen             [content; sub-phased 4a–4i]
   ↓
Phase 5 — Motion language              [kinetic layer]
   ↓
Phase 6 — Bespoke iconography          [SHIP GATE]
   ↓
Phase 7 — PWA polish                   [iOS-native finish]
```

Phases are strictly ordered. Within Phase 4, sub-screens (4a–4i) can ship independently and partially in parallel.

---

## Status tracking

| Phase | Plan doc | Status | Shipped |
|---|---|---|---|
| 1 — IA + tokens | `docs/superpowers/plans/2026-06-24-glasswork-phase-1-ia-and-tokens.md` | Shipped | 2026-06-24 |
| 2 — Nav/shell | `docs/superpowers/plans/2026-06-24-glasswork-phase-2-nav-shell.md` | Shipped | 2026-06-25 |
| 3 — Core components | (not yet written) | — | — |
| 4 — Screen-by-screen | (not yet written) | — | — |
| 5 — Motion language | (not yet written) | — | — |
| 6 — Bespoke iconography | (not yet written) | — | — |
| 7 — PWA polish | (not yet written) | — | — |

Update this table as phases progress.
