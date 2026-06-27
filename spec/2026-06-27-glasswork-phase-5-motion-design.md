# Glasswork Phase 5 — Motion language (foundation pass) design

Date: 2026-06-27
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
Direction: `spec/2026-06-24-redesign-glasswork-design.md`
Predecessors: Phase 6 (Iconography) + Phase 6 polish round 2

## Purpose

Establish a coherent motion language for the app and close the accessibility gap. The app has roughly 28 animation sites (16 CSS-`transition:` + 12 Vue `<Transition>`) but **zero of them honor `prefers-reduced-motion`**. Phase 5 (foundation pass) introduces a small set of motion tokens, wires reduced-motion compliance across the whole surface via those tokens, and converges all six sheets on a single enter/leave choreography pattern.

This is a **foundation pass** — explicitly NOT the maximalist motion phase the original direction sketched. Spring physics, View Transitions API, generator stagger, fibonacci breathing, and RateDots pulse are all deferred. Once the foundation is in place, those threads can be picked up individually as small follow-up phases without re-litigating tokens or a11y discipline.

This document is the spec. The implementation plan lives in `docs/superpowers/plans/2026-06-27-glasswork-phase-5-motion.md` (written after this is approved).

## Scope summary

**In scope:**
- Motion tokens (durations + easings) as CSS custom properties in `src/style.css`.
- Reduced-motion strategy via `@media (prefers-reduced-motion: reduce)` override of the tokens.
- Transform-fallback for sheet slides so reduced-motion gets fade-only (no jarring snap).
- Unified sheet enter/leave choreography across all 6 sheets.
- Replace hard-coded `Xms` and `cubic-bezier(...)` literals in `src/` with token references (where the literals are consumer-side; token definitions themselves keep literals).
- Two micro-popovers (GraphBubble, EdgeBubble) switched to tokens.
- Sticky-bar collapse timing on Tricks + Sequences switched to tokens.

**Out of scope (named so they aren't conflated):**
- Spring physics library or vanilla spring implementation.
- View Transitions API for sub-tab / route changes.
- Generator stagger (sequence reveal one-by-one).
- Fibonacci breathing on the Graph.
- Tap-to-cycle pulse on RateDots.
- New components, new sheets, new interactions.
- Tailwind's own `transition-*` utilities — leave as-is. They use sensible defaults; rewriting Tailwind utility output for the sake of token consistency is more churn than value.

## Decisions

### Motion tokens

Four durations, four easings. Defined as CSS custom properties at `:root` in `src/style.css`. Naming follows the existing `--<thing>-g-<modifier>` convention (e.g., `--text-g-body`, `--radius-g-chip`).

```css
:root {
  /* Durations */
  --motion-g-fast:       150ms;  /* tap/active feedback, hover-on-touch (rare), micro-state */
  --motion-g-base:       240ms;  /* most state changes — opacity fades, color transitions */
  --motion-g-slow:       320ms;  /* sheet enter/leave, big chrome moves */
  --motion-g-deliberate: 480ms;  /* rare — celebration / first-impression moments */

  /* Easings */
  --ease-g-out:    cubic-bezier(0.2, 0.8, 0.2, 1);   /* deceleration / entries (Apple-style) */
  --ease-g-in:     cubic-bezier(0.4, 0.0, 1, 1);     /* acceleration / exits */
  --ease-g-inout:  cubic-bezier(0.4, 0, 0.2, 1);     /* symmetric — both directions */
  --ease-g-spring: cubic-bezier(0.18, 1.2, 0.42, 1); /* gentle overshoot — used for delightful entries (sheets) */
}
```

No distance tokens. Slide distances are inherently per-component (sheet slides full panel height; bubble slides ~6px; chip slides 0). Tokenizing them would mostly be busywork.

### Reduced-motion strategy

Single global override at the token level. Consumers using `transition: <prop> var(--motion-g-base) var(--ease-g-out)` automatically respect the user's preference without per-component awareness.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-g-fast:       0.01ms;
    --motion-g-base:       100ms;  /* keep a tiny fade for state legibility */
    --motion-g-slow:       100ms;
    --motion-g-deliberate: 100ms;
  }
}
```

Duration collapses to ~instant (or 100ms for state-change fades — pure 0 makes state changes invisible and confusing). Easings stay the same — they don't matter at near-zero duration.

**Transform-fallback for slides.** Pure token-duration collapse still triggers a `translateY(100%) → 0` slide in 100ms — visually a snap. For sheets, we add a secondary rule that disables the transform entirely when reduced-motion is preferred. Result: opacity fade only, no slide:

```css
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: none !important;
  }
}
```

Same pattern can be added for the bubble enter (`gb-enter-from`) — drop the `translateY(-6px) scale(0.96)` to just opacity. Same for any other site that uses transform-on-enter.

### Sheet choreography (unified across all 6 sheets)

Today's state is inconsistent:
- TricksFilterSheet, TransitionsFilterSheet: have the full `<Transition name="sheet">` with slide-up + fade.
- TrickSheet, TransitionSheet, SequenceSheet, GeneratorSheet: most have only `<Teleport>` + `v-if`, no enter/leave transition wrapper. They appear/disappear instantly.
- Some have manual `transition: transform 0.2s ease-out` set on the panel for the drag-to-close gesture but no enter animation.

Target — all 6 sheets:

```vue
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40 flex items-end"
        role="dialog"
        aria-modal="true"
      >
        <div class="absolute inset-0 bg-black/60" @click="close" />
        <div
          ref="panelRef"
          class="sheet-panel gw-glass-strong relative w-full ..."
          :style="{
            transform: `translateY(${dragY}px)`,
            transition: dragging ? 'none' : 'transform var(--motion-g-slow) var(--ease-g-out)',
            ...
          }"
          @touchstart.passive="..."
          @touchmove.passive="..."
          @touchend="..."
        >
          ...
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition:
    transform var(--motion-g-slow) var(--ease-g-spring),
    opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel { transform: translateY(100%); }
</style>
```

Notes:
- The `.sheet-panel` class is targeted directly (not `.relative`). The existing TricksFilterSheet pattern uses `.relative` as the panel selector; we tighten that to the semantic `sheet-panel` class which all sheets already use.
- The drag-to-close `transition` (panel-only, fires on touchend snap-back) uses `--motion-g-slow` and the standard `--ease-g-out` so it matches the enter animation.
- Spring easing on enter gives the sheet a subtle settle-in overshoot — feels "alive" without being playful.

### Micro-popover choreography (GraphBubble, EdgeBubble)

Existing `gb-enter` transition uses inline hard-coded values. Switch to tokens:

```css
.gb-enter-active, .gb-leave-active {
  transition:
    transform var(--motion-g-base) var(--ease-g-spring),
    opacity var(--motion-g-fast) var(--ease-g-out);
}
.gb-enter-from { opacity: 0; transform: translateY(-6px) scale(0.96); }
.gb-leave-to   { opacity: 0; transform: translateY(-3px) scale(0.98); }
```

Plus the reduced-motion transform-fallback:

```css
@media (prefers-reduced-motion: reduce) {
  .gb-enter-from,
  .gb-leave-to {
    transform: none !important;
  }
}
```

### Sticky-bar collapse (Tricks, Sequences)

Current values are hard-coded `200ms ease`. Switch to tokens:

```css
.sticky-bar { transition: transform var(--motion-g-base) var(--ease-g-out); }
.search-row {
  transition:
    max-height var(--motion-g-base) var(--ease-g-out),
    opacity var(--motion-g-base) var(--ease-g-out),
    margin-bottom var(--motion-g-base) var(--ease-g-out);
}
```

### Other in-scope sites

Audit every `transition:` and Vue `<Transition>` in `src/` and replace any hard-coded `Xms`/`X.Xs` duration or `cubic-bezier(...)` literal with a token reference. Hard-coded literal values are only allowed in `style.css` token definitions. Examples expected to need updating:

- `src/pages/Sequences.vue` FAB: `transition: transform 150ms ease` → `var(--motion-g-fast) var(--ease-g-out)`.
- `src/pages/Graph.vue` FAB + mode-switcher: same.
- `src/components/RateDots.vue` — any inline transition strings.
- `src/components/TabBar.vue` — already uses transition on active state.
- `src/components/Heatmap14.vue`, `src/components/SequenceChain.vue`, `src/components/ChipFilter.vue`, etc. — to be audited.

The audit is part of the implementation plan, not the spec.

## Components touched

Foundation:
- `src/style.css` — add token definitions + reduced-motion override.

Sheets (unified choreography):
- `src/components/TrickSheet.vue`
- `src/components/TransitionSheet.vue`
- `src/components/SequenceSheet.vue`
- `src/components/GeneratorSheet.vue`
- `src/components/TricksFilterSheet.vue` (already has the pattern — refit to tokens)
- `src/components/TransitionsFilterSheet.vue` (already has the pattern — refit to tokens)

Micro-popovers:
- `src/components/GraphBubble.vue`
- `src/components/EdgeBubble.vue`

Other token-uptake:
- `src/pages/Tricks.vue` (sticky-bar transition)
- `src/pages/Sequences.vue` (sticky-bar + FAB transitions)
- `src/pages/Graph.vue` (FAB transition + mode-switcher transition)
- Any other consumer surfaced by the audit grep.

## Risks and open questions

- **iOS PWA Reduce Motion detection** — relies on the OS-level Settings → Accessibility → Motion → Reduce Motion. The CSS `@media (prefers-reduced-motion: reduce)` query is honored by iOS Safari. No JS detection needed.
- **Sheet enter animation may briefly conflict with `useBodyScrollLock`** which locks document overflow on open. The sheet's transform-from-translateY(100%) might paint outside body bounds for one frame before lock applies. Should be a non-issue in practice but worth eyeballing on device.
- **Spring easing on sheet enter** is a subjective call. If the overshoot feels playful or wrong for the user, switch the sheet-panel transition to `--ease-g-out` instead — single-line change.
- **Audit completeness** — we may miss a hard-coded literal in a component the grep doesn't catch (e.g., inline JS template strings). The acceptance grep at the end of the plan catches these.

## Acceptance criteria

- `grep -rnE '[0-9]+ms|[0-9]\.[0-9]+s|cubic-bezier' src/ --include='*.vue' --include='*.css'` returns ONLY:
  - The four duration definitions in `src/style.css`
  - The four easing definitions in `src/style.css`
  - Their reduced-motion override block in `src/style.css`
  - (Optional) any timing that genuinely shouldn't be a token (e.g., third-party widget config) — note in plan if any are intentionally kept.
- All 6 sheets render with `<Transition name="sheet">` and the unified choreography (slide-up + fade in, slide-down + fade out).
- With macOS or iOS "Reduce Motion" preference active:
  - Sheets fade in/out without sliding.
  - GraphBubble/EdgeBubble fade without `translateY/scale` transform.
  - FAB tap-active transform is instant (no scale animation).
  - Sticky-bar collapse on Tricks/Sequences is near-instant (100ms fade).
- All 150 existing tests pass.
- Build clean.
- Manual verification on iOS PWA with Settings → Accessibility → Motion → Reduce Motion both on and off.
