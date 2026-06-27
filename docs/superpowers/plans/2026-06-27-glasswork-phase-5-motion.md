# Glasswork Phase 5 — Motion language (foundation pass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce motion tokens (4 durations + 4 easings as CSS variables), wire `prefers-reduced-motion` compliance across every animation site via those tokens, and converge all six sheets on a unified two-layer enter/leave choreography.

**Architecture:** Token-level reduced-motion override keeps consumers ignorant of a11y plumbing — any component using `transition: <prop> var(--motion-g-base) var(--ease-g-out)` auto-respects the user's preference. Sheets get a bare outer `.sheet-panel-anim` wrapper so the class-based enter/leave slide doesn't collide with the inline drag transform on the inner panel.

**Tech Stack:** Vue 3 + `<script setup>` + Tailwind + Glasswork tokens + Vitest. No new dependencies.

**Spec:** `spec/2026-06-27-glasswork-phase-5-motion-design.md`

---

## Task 0: Pre-flight

**Files:** none modified.

- [ ] **Step 1: Verify baseline tests pass**

Run: `npm test`
Expected: 150/150 passing.

- [ ] **Step 2: Verify baseline build is clean**

Run: `npm run build`
Expected: build completes; only pre-existing INEFFECTIVE_DYNAMIC_IMPORT warnings.

- [ ] **Step 3: Confirm spec is committed**

Run: `git log -1 --oneline -- spec/2026-06-27-glasswork-phase-5-motion-design.md`
Expected: commit `082e74c` (or newer fix).

---

## Task 1: Add motion tokens + reduced-motion override to `glasswork.css`

**Files:**
- Modify: `src/design/glasswork.css`

Goal: Define the entire motion vocabulary in the same file as the rest of the Glasswork tokens. Single insertion at end-of-file.

- [ ] **Step 1: Append motion tokens block to `src/design/glasswork.css`**

Append at the end of the file (after the `.gw-halftone` rule):

```css

/* Motion tokens (Phase 5) ---------------------------------------------------
 * Four durations + four easings. Consumers reference these instead of
 * hard-coded ms / cubic-bezier literals. The reduced-motion @media block
 * below auto-collapses durations so any consumer using these tokens honors
 * prefers-reduced-motion without per-component awareness.
 *
 * Tokens that need to also drop transform-based motion (e.g. sheet slide-up)
 * declare their own @media (prefers-reduced-motion: reduce) override
 * locally in their component to remove the transform.
 * -------------------------------------------------------------------------- */
:root {
  --motion-g-fast:       150ms;
  --motion-g-base:       240ms;
  --motion-g-slow:       320ms;
  --motion-g-deliberate: 480ms;

  --ease-g-out:    cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-g-in:     cubic-bezier(0.4, 0.0, 1, 1);
  --ease-g-inout:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-g-spring: cubic-bezier(0.18, 1.2, 0.42, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-g-fast:       0.01ms;
    --motion-g-base:       100ms;
    --motion-g-slow:       100ms;
    --motion-g-deliberate: 100ms;
  }
}
```

- [ ] **Step 2: Verify build picks up the new tokens**

Run: `npm run build`
Expected: clean build. (Token definitions are pure CSS; no JS impact.)

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: 150/150.

- [ ] **Step 4: Commit**

```bash
git add src/design/glasswork.css
git commit -m "Phase 5: add motion tokens + reduced-motion override to glasswork.css

Four durations (fast/base/slow/deliberate) + four easings (out/in/inout/
spring) as CSS custom properties. @media (prefers-reduced-motion: reduce)
collapses durations so any consumer using the tokens auto-respects the
preference.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Refit `TricksFilterSheet.vue` to two-layer + tokens

**Files:**
- Modify: `src/components/TricksFilterSheet.vue`

Goal: Add the bare outer `.sheet-panel-anim` wrapper so the enter/leave slide actually fires (currently dead CSS — inline drag transform wins). Refit the existing `<Transition name="sheet">` CSS to tokens.

- [ ] **Step 1: Wrap the existing panel in a `.sheet-panel-anim` div**

Find this template block (around lines 105–127 in current file):

```html
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
      >
        <div
          class="absolute inset-0 bg-black/60"
          style="touch-action: none;"
          @click="emit('close')"
        />
        <div
          ref="panelRef"
          class="relative w-full max-h-[85dvh] gw-glass flex flex-col touch-pan-y overscroll-contain"
          :style="{
            borderTopLeftRadius: 'var(--radius-g-panel)',
            borderTopRightRadius: 'var(--radius-g-panel)',
            transform: `translateY(${dragY}px)`,
            transition: dragging ? 'none' : 'transform 280ms ease',
          }"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
```

Wrap the inner panel div with a `.sheet-panel-anim` wrapper:

```html
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
      >
        <div
          class="absolute inset-0 bg-black/60"
          style="touch-action: none;"
          @click="emit('close')"
        />
        <div class="sheet-panel-anim w-full">
          <div
            ref="panelRef"
            class="relative w-full max-h-[85dvh] gw-glass flex flex-col touch-pan-y overscroll-contain"
            :style="{
              borderTopLeftRadius: 'var(--radius-g-panel)',
              borderTopRightRadius: 'var(--radius-g-panel)',
              transform: `translateY(${dragY}px)`,
              transition: dragging ? 'none' : 'transform var(--motion-g-slow) var(--ease-g-out)',
            }"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
          >
```

(Two changes here: added `<div class="sheet-panel-anim w-full">` wrapper, and changed the inline drag-snap-back `transition: 'transform 280ms ease'` → `'transform var(--motion-g-slow) var(--ease-g-out)'`.)

Don't forget to close the new wrapper before the existing `</Transition>` block — add a `</div>` after the inner panel's closing `</div>`. The structure becomes:

```
<Transition>
  <div v-if> (root)
    <div backdrop />
    <div .sheet-panel-anim>
      <div ref=panelRef .relative ...>
        ...content...
      </div>
    </div>
  </div>
</Transition>
```

- [ ] **Step 2: Replace the existing `<style scoped>` block with the token-based two-layer version**

Find the existing `<style scoped>` block at the bottom of the file (around lines 197–207):

```css
.sheet-enter-active,
.sheet-leave-active { transition: opacity 240ms ease; }
.sheet-enter-active .relative,
.sheet-leave-active .relative { transition: transform 280ms cubic-bezier(.2, .8, .2, 1), opacity 240ms ease; }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .relative,
.sheet-leave-to .relative { transform: translateY(100%); }
```

Replace with:

```css
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-active .sheet-panel-anim,
.sheet-leave-active .sheet-panel-anim {
  transition:
    transform var(--motion-g-slow) var(--ease-g-spring),
    opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel-anim,
.sheet-leave-to .sheet-panel-anim {
  transform: translateY(100%);
  opacity: 0;
}

/* Reduced-motion fallback: kill the slide, keep the fade */
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet-panel-anim,
  .sheet-leave-to .sheet-panel-anim {
    transform: none !important;
  }
}
```

- [ ] **Step 3: Type-check + tests + build**

```bash
npx vue-tsc -b --noEmit
npm test
npm run build
```
Expected: clean, 150/150, clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/TricksFilterSheet.vue
git commit -m "Phase 5: TricksFilterSheet — two-layer panel + motion tokens

Adds .sheet-panel-anim outer wrapper so the enter/leave slide-up
actually fires (previously inline drag transform on the inner panel
won CSS specificity, leaving the class-defined slide as dead code).
Refits CSS selectors to .sheet-panel-anim and replaces hard-coded
280ms/240ms timings + cubic-bezier literal with motion tokens.
Adds reduced-motion fallback that disables the transform.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Refit `TransitionsFilterSheet.vue` to two-layer + tokens

**Files:**
- Modify: `src/components/TransitionsFilterSheet.vue`

Goal: Same shape as Task 2 (TricksFilterSheet). Different existing content but same intervention.

- [ ] **Step 1: Wrap the panel in `.sheet-panel-anim`**

Find the existing template block (around lines 63–112):

```html
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="absolute inset-0 bg-black/60"
          style="touch-action: none;"
          @click="emit('close')"
        />
        <div
          ref="panelRef"
          class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[80dvh] overflow-y-auto touch-pan-y overscroll-contain"
          :style="{
            transform: `translateY(${dragY}px)`,
            transition: dragging ? 'none' : 'transform 280ms ease',
            borderTopLeftRadius: 'var(--radius-g-panel)',
            borderTopRightRadius: 'var(--radius-g-panel)',
          }"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
```

Wrap the inner panel:

```html
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="absolute inset-0 bg-black/60"
          style="touch-action: none;"
          @click="emit('close')"
        />
        <div class="sheet-panel-anim w-full">
          <div
            ref="panelRef"
            class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[80dvh] overflow-y-auto touch-pan-y overscroll-contain"
            :style="{
              transform: `translateY(${dragY}px)`,
              transition: dragging ? 'none' : 'transform var(--motion-g-slow) var(--ease-g-out)',
              borderTopLeftRadius: 'var(--radius-g-panel)',
              borderTopRightRadius: 'var(--radius-g-panel)',
            }"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
```

(Added `<div class="sheet-panel-anim w-full">` wrapper, changed inline transition to tokens.)

Add the corresponding `</div>` after the inner panel's closing tag.

- [ ] **Step 2: Replace the existing `<style scoped>` block**

Find (around lines 117–125):

```css
.sheet-enter-active,
.sheet-leave-active { transition: opacity 240ms ease; }
.sheet-enter-active .relative,
.sheet-leave-active .relative { transition: transform 280ms cubic-bezier(.2, .8, .2, 1), opacity 240ms ease; }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .relative,
.sheet-leave-to .relative { transform: translateY(100%); }
```

Replace with:

```css
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-active .sheet-panel-anim,
.sheet-leave-active .sheet-panel-anim {
  transition:
    transform var(--motion-g-slow) var(--ease-g-spring),
    opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel-anim,
.sheet-leave-to .sheet-panel-anim {
  transform: translateY(100%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet-panel-anim,
  .sheet-leave-to .sheet-panel-anim {
    transform: none !important;
  }
}
```

- [ ] **Step 3: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/TransitionsFilterSheet.vue
git commit -m "Phase 5: TransitionsFilterSheet — two-layer panel + motion tokens

Same intervention as TricksFilterSheet (Task 2): adds .sheet-panel-anim
outer wrapper so enter/leave slide actually fires, refits to tokens,
adds reduced-motion transform fallback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Add full unified pattern to `TrickSheet.vue`

**Files:**
- Modify: `src/components/TrickSheet.vue`

Goal: This sheet currently has `<Teleport>` + `v-if` but NO `<Transition>` wrapper — it pops in/out instantly. Add the full unified pattern.

- [ ] **Step 1: Read the file's current root template structure**

Run: read `src/components/TrickSheet.vue` to confirm the existing template starts with `<Teleport to="body">` containing a single `<div v-if="...">` root. Note the exact `v-if` expression (likely `v-if="isOpen"` or similar) and the existing panel element's classes/refs/handlers.

- [ ] **Step 2: Insert `<Transition name="sheet">` wrapper + `.sheet-panel-anim` outer**

Inside `<Teleport to="body">`, wrap the existing `v-if` root in `<Transition name="sheet">`. Wrap the inner panel (the element with the drag-to-close inline transform, if present, or the main glass panel) in `<div class="sheet-panel-anim w-full">`.

The result (preserving existing content):

```html
<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="<existing-v-if-expression>"
        class="<existing-root-classes — must include 'fixed inset-0 ... flex items-end'>"
        role="dialog"
        aria-modal="true"
      >
        <!-- preserve existing backdrop click handler -->
        <div class="absolute inset-0 bg-black/60" @click="<existing-close-handler>" />

        <div class="sheet-panel-anim w-full">
          <div
            ref="<existing-panel-ref>"
            class="<existing-panel-classes including gw-glass-strong, max-h-Xdvh, overflow-y-auto, touch-pan-y, overscroll-contain>"
            :style="{
              <preserve borderTop radius if set>,
              transform: `translateY(${dragY}px)`,
              transition: dragging ? 'none' : 'transform var(--motion-g-slow) var(--ease-g-out)',
            }"
            @touchstart.passive="<existing-handler>"
            @touchmove.passive="<existing-handler>"
            @touchend="<existing-handler>"
            @touchcancel="<existing-handler — add if missing>"
          >
            <!-- existing sheet content unchanged -->
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
```

If the existing template does NOT have `role="dialog"` / `aria-modal="true"`, add them per spec (consistent with TricksFilterSheet / TransitionsFilterSheet). If the existing template lacks the drag handlers entirely (some sheets don't), keep the inline drag style and handlers off and just add the wrapper — the sheet still gets the slide-up enter via the class on the outer wrapper.

- [ ] **Step 3: Add the scoped style block**

If the file already has `<style scoped>`, append to it. If not, add a new one before `</template>`:

```vue
<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-active .sheet-panel-anim,
.sheet-leave-active .sheet-panel-anim {
  transition:
    transform var(--motion-g-slow) var(--ease-g-spring),
    opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel-anim,
.sheet-leave-to .sheet-panel-anim {
  transform: translateY(100%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet-panel-anim,
  .sheet-leave-to .sheet-panel-anim {
    transform: none !important;
  }
}
</style>
```

- [ ] **Step 4: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 5: Manual smoke test (controller responsibility — note in commit)**

On dev server: open a trick from /tricks. The sheet should slide up + fade in. Tap backdrop → slides down + fades out.

- [ ] **Step 6: Commit**

```bash
git add src/components/TrickSheet.vue
git commit -m "Phase 5: TrickSheet — unified two-layer enter/leave + motion tokens

Was: Teleport + v-if with no transition wrapper (sheet popped in/out
instantly). Now: <Transition name='sheet'> + outer .sheet-panel-anim
slide-up + fade in/out via motion tokens. Reduced-motion fallback
disables the slide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Add full unified pattern to `TransitionSheet.vue`

**Files:**
- Modify: `src/components/TransitionSheet.vue`

Same shape as Task 4. Different content; same intervention.

- [ ] **Step 1: Read the file** to confirm current root template structure and existing `v-if` expression, panel classes, refs, and touch handlers.

- [ ] **Step 2: Wrap with `<Transition name="sheet">` + `.sheet-panel-anim`**

Apply the same pattern from Task 4 Step 2. Preserve all existing content, classes, refs, and handlers — only add the `<Transition>` wrapper, the `.sheet-panel-anim` outer wrapper, and (if drag-to-close is present) update the inline transition to use tokens.

- [ ] **Step 3: Add the scoped style block** (same CSS block from Task 4 Step 3).

- [ ] **Step 4: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/TransitionSheet.vue
git commit -m "Phase 5: TransitionSheet — unified two-layer enter/leave + motion tokens

Same intervention as TrickSheet (Task 4): add <Transition> wrapper +
.sheet-panel-anim outer + token-based timings + reduced-motion fallback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Add full unified pattern to `SequenceSheet.vue`

**Files:**
- Modify: `src/components/SequenceSheet.vue`

Same shape as Tasks 4–5.

- [ ] **Step 1: Read the file** — note the existing structure. SequenceSheet does have `dragY`, `dragging`, touch handlers, and the inline `transform: translateY(${dragY}px)` + `transition: dragging ? 'none' : 'transform 0.2s ease-out'`. The 0.2s/ease-out will be replaced with tokens during wrapping.

- [ ] **Step 2: Wrap with `<Transition name="sheet">` + `.sheet-panel-anim`** (same pattern as Task 4).

- [ ] **Step 3: Replace the inline drag-snap transition** with token form:
  
  Find: `transition: dragging ? 'none' : 'transform 0.2s ease-out',`
  Replace with: `transition: dragging ? 'none' : 'transform var(--motion-g-slow) var(--ease-g-out)',`

- [ ] **Step 4: Add the scoped style block** (same CSS from Task 4 Step 3).

- [ ] **Step 5: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/SequenceSheet.vue
git commit -m "Phase 5: SequenceSheet — unified two-layer enter/leave + motion tokens

Same intervention as Tasks 4 & 5: <Transition> wrapper + .sheet-panel-anim
outer + token timings + reduced-motion fallback. Also replaces the inline
drag-snap-back '0.2s ease-out' with var(--motion-g-slow) var(--ease-g-out).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Add full unified pattern to `GeneratorSheet.vue`

**Files:**
- Modify: `src/components/GeneratorSheet.vue`

Same shape as Tasks 4–6.

- [ ] **Step 1: Read the file** to confirm structure (Teleport + v-if + glass panel + drag handlers + body scroll lock).

- [ ] **Step 2: Wrap with `<Transition name="sheet">` + `.sheet-panel-anim`** (same pattern).

- [ ] **Step 3: Replace any inline hard-coded transition timing on the panel with token form** (same swap as Task 6 Step 3 if applicable).

- [ ] **Step 4: Add the scoped style block** (same CSS).

- [ ] **Step 5: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/GeneratorSheet.vue
git commit -m "Phase 5: GeneratorSheet — unified two-layer enter/leave + motion tokens

Closes the sheet-choreography unification: all 6 sheets now use the
same <Transition name='sheet'> wrapper + .sheet-panel-anim outer +
token-based timings + reduced-motion fallback.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: GraphBubble + EdgeBubble — token uptake + reduced-motion fallback

**Files:**
- Modify: `src/components/GraphBubble.vue`
- Modify: `src/components/EdgeBubble.vue`

Goal: Both micro-popovers use a `gb-enter` named Vue transition with inline timings. Switch to tokens; add reduced-motion fallback that removes the transform.

- [ ] **Step 1: Update `src/components/GraphBubble.vue` styles**

Find the existing `<style scoped>` block (currently uses `180ms cubic-bezier(0.18, 1.2, 0.42, 1)` and similar literals):

```css
.gb-enter-active, .gb-leave-active {
  transition: transform 180ms cubic-bezier(0.18, 1.2, 0.42, 1), opacity 140ms ease;
}
.gb-enter-from { opacity: 0; transform: translateY(-6px) scale(0.96); }
.gb-leave-to   { opacity: 0; transform: translateY(-3px) scale(0.98); }
```

Replace with:

```css
.gb-enter-active, .gb-leave-active {
  transition:
    transform var(--motion-g-base) var(--ease-g-spring),
    opacity var(--motion-g-fast) var(--ease-g-out);
}
.gb-enter-from { opacity: 0; transform: translateY(-6px) scale(0.96); }
.gb-leave-to   { opacity: 0; transform: translateY(-3px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .gb-enter-from,
  .gb-leave-to {
    transform: none !important;
  }
}
```

- [ ] **Step 2: Update `src/components/EdgeBubble.vue` styles**

Read the file's `<style scoped>` block. If it uses the same `gb-enter` / `gb-leave` pattern with hard-coded timings, replace with the same token form + reduced-motion block from Step 1.

If EdgeBubble uses a different transition name (e.g., `eb-enter`), update the selectors accordingly while keeping the same timing-token swap.

- [ ] **Step 3: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/GraphBubble.vue src/components/EdgeBubble.vue
git commit -m "Phase 5: GraphBubble + EdgeBubble — motion tokens + reduced-motion fallback

Replace hard-coded ms/cubic-bezier literals with var(--motion-g-*) and
var(--ease-g-*). Add @media (prefers-reduced-motion: reduce) block that
removes the transform from enter/leave so the bubble fades only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Tricks sticky-bar — token uptake

**Files:**
- Modify: `src/pages/Tricks.vue`

Goal: Replace the hard-coded `200ms ease` and `300ms ease` (etc.) in the sticky-bar styles with motion tokens.

- [ ] **Step 1: Update sticky-bar styles**

Find the `<style scoped>` block near the bottom of the file. Locate:

```css
.sticky-bar {
  position: sticky;
  /* App.vue's wrapper paddingTop only affects INITIAL layout. position: sticky
     tracks the viewport when stuck, so top must include the safe-area inset
     directly — otherwise the bar slides under the notch on scroll. */
  top: env(safe-area-inset-top);
  z-index: 20;
  transition: transform 200ms ease;
  will-change: transform;
  margin: 0 0.75rem;
}
```

Change the `transition` line:

```css
.sticky-bar {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 20;
  transition: transform var(--motion-g-base) var(--ease-g-out);
  will-change: transform;
  margin: 0 0.75rem;
}
```

Then locate `.sticky-bar.hidden` — no transition to update there (the property is just `transform`, no `transition`).

- [ ] **Step 2: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Tricks.vue
git commit -m "Phase 5: Tricks sticky-bar — token uptake (200ms ease → tokens)

Replaces hard-coded 200ms ease with var(--motion-g-base) var(--ease-g-out).
Reduced-motion now applies via the token override.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Sequences sticky-bar + FAB — token uptake

**Files:**
- Modify: `src/pages/Sequences.vue`

Goal: Replace hard-coded timings in the sticky-bar, search-row collapse, and FAB transitions.

- [ ] **Step 1: Update sticky-bar style**

Find:

```css
.sticky-bar {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 20;
  will-change: transform;
  margin: 0 0.75rem;
}
```

(No transition currently — `.sticky-bar` doesn't translate on Sequences; the search-row inside does. No change needed here unless an inherited transition was added — verify by reading the full file.)

- [ ] **Step 2: Update search-row transition**

Find:

```css
.search-row {
  max-height: 80px;
  overflow: hidden;
  opacity: 1;
  margin-bottom: 8px;
  transition: max-height 200ms ease, opacity 200ms ease, margin-bottom 200ms ease;
}
```

Replace the `transition` line:

```css
.search-row {
  max-height: 80px;
  overflow: hidden;
  opacity: 1;
  margin-bottom: 8px;
  transition:
    max-height var(--motion-g-base) var(--ease-g-out),
    opacity var(--motion-g-base) var(--ease-g-out),
    margin-bottom var(--motion-g-base) var(--ease-g-out);
}
```

- [ ] **Step 3: Update FAB transition**

Find:

```css
.fab {
  ...
  transition: transform 150ms ease;
}
.fab:active {
  transform: scale(0.95);
}
```

Replace the FAB's `transition` line:

```css
.fab {
  ...
  transition: transform var(--motion-g-fast) var(--ease-g-out);
}
```

- [ ] **Step 4: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Sequences.vue
git commit -m "Phase 5: Sequences sticky-bar + FAB — token uptake

Search-row collapse: 200ms ease → var(--motion-g-base) var(--ease-g-out).
FAB tap-active: 150ms ease → var(--motion-g-fast) var(--ease-g-out).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Graph FAB + mode switcher — token uptake

**Files:**
- Modify: `src/pages/Graph.vue`

Goal: Replace hard-coded timings on the FAB and the mode-switcher.

- [ ] **Step 1: Update FAB transition**

Find:

```css
.fab {
  ...
  transition: transform 150ms ease;
}
```

Replace `transition` line:

```css
.fab {
  ...
  transition: transform var(--motion-g-fast) var(--ease-g-out);
}
```

- [ ] **Step 2: Update mode-switcher segment transitions**

Find:

```css
.mode-switcher .seg {
  ...
  transition: background-color 200ms ease, color 200ms ease;
}
```

Replace `transition` line:

```css
.mode-switcher .seg {
  ...
  transition:
    background-color var(--motion-g-base) var(--ease-g-out),
    color var(--motion-g-base) var(--ease-g-out);
}
```

- [ ] **Step 3: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Graph.vue
git commit -m "Phase 5: Graph FAB + mode switcher — token uptake

FAB tap-active: 150ms ease → var(--motion-g-fast) var(--ease-g-out).
Mode switcher seg color/bg: 200ms ease → var(--motion-g-base) var(--ease-g-out).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Audit remaining hard-coded literals + verification + SESSION-HANDOFF

**Files:**
- Modify: any remaining files surfaced by the audit grep
- Modify: `spec/SESSION-HANDOFF.md`

Goal: Sweep the entire `src/` tree for any leftover hard-coded `Xms` / `Xs` / `cubic-bezier(...)` literals in `.vue` and `.css` files, replace them with tokens, then update the handoff.

- [ ] **Step 1: Run the audit grep**

Run:

```bash
grep -rnE '(transition|animation)[^:]*: [^;]*[0-9]+(\.[0-9]+)?(ms|s)\b' src/ --include='*.vue' --include='*.css' | grep -v 'glasswork.css'
```

Also:

```bash
grep -rn 'cubic-bezier' src/ --include='*.vue' --include='*.css' | grep -v 'glasswork.css'
```

Expected: The first grep may return remaining files like `RateDots.vue`, `Heatmap14.vue`, `ChipFilter.vue`, `TabBar.vue`, etc. The second should be empty (we already moved all easings to tokens in Tasks 1–11).

- [ ] **Step 2: For each remaining file, swap hard-coded timings to tokens**

For each file from the grep output:
- If the transition affects an interactive feedback (tap, hover) → `var(--motion-g-fast) var(--ease-g-out)`
- If the transition affects state changes (color, background, opacity) → `var(--motion-g-base) var(--ease-g-out)`
- If the transition affects layout chrome (sticky bars, big moves) → `var(--motion-g-slow) var(--ease-g-out)`

The grep output gives you `file:line:offending-line` — open each file, make the swap, save.

- [ ] **Step 3: Re-run the audit grep to confirm clean**

```bash
grep -rnE '(transition|animation)[^:]*: [^;]*[0-9]+(\.[0-9]+)?(ms|s)\b' src/ --include='*.vue' --include='*.css' | grep -v 'glasswork.css'
```

Expected: empty.

If non-empty: investigate each. Some literals are intentionally kept (e.g., a third-party widget's required timing, or a CSS keyframes definition where `0%`/`100%` aren't motion timings). Document any intentional keeps in the commit message.

- [ ] **Step 4: Type-check + tests + build**

Run: `npx vue-tsc -b --noEmit && npm test && npm run build`
Expected: clean, 150/150, clean.

- [ ] **Step 5: Manual smoke test on dev server**

Run: `npm run dev` and verify on phone (LAN URL):
- Open any sheet (Trick, Transition, Sequence, Generator, TricksFilter, TransitionsFilter) — should slide up + fade in, slide down + fade out.
- Toggle macOS / iOS "Reduce Motion" preference (Settings → Accessibility → Motion → Reduce Motion). With it on:
  - Sheets fade in/out without sliding.
  - FAB tap-active scale is near-instant.
  - GraphBubble fades without `translateY/scale`.
  - Sticky-bar collapse on Tricks/Sequences is near-instant.

- [ ] **Step 6: Update `spec/SESSION-HANDOFF.md`**

Edit the handoff:
- Move Phase 5 from the "Recommended next moves" list to a new subsection under "What's shipped since the 2026-06-26 handoff (additive)".
- Update "State right now" with the new HEAD commit + tests-pass.
- Add Decisions log entries:
  - Motion vocabulary = 4 durations + 4 easings, named `--motion-g-{fast,base,slow,deliberate}` and `--ease-g-{out,in,inout,spring}`.
  - Reduced-motion via token override at the @media level — consumers get a11y for free.
  - Sheet enter/leave uses two-layer (outer `.sheet-panel-anim` + inner `.sheet-panel`) so class-based slide and inline drag transform don't collide.
- Update "Prompt for new session" to reflect new HEAD + 150 tests (still) + Phase 5 shipped.

- [ ] **Step 7: Final commit**

```bash
git add src/ spec/SESSION-HANDOFF.md
git commit -m "Phase 5: audit sweep + SESSION-HANDOFF update

Closes the foundation pass. Any remaining hard-coded ms/cubic-bezier
literals in src/ (outside glasswork.css token definitions) swept to
token references. Handoff updated with Phase 5 shipped + decisions log.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: Do not push automatically**

Stop here. User pushes manually when ready.

---

## Self-review checklist (run after writing this plan, before handoff)

- [ ] Every spec section has at least one task implementing it.
- [ ] No "TBD" / "TODO" / "add appropriate X" placeholders.
- [ ] Type names match between tasks (e.g., `.sheet-panel-anim` introduced in Task 2 is referenced consistently through Task 7).
- [ ] All file paths are absolute or relative to repo root.
- [ ] All `git commit` messages include the `Co-Authored-By` line.
- [ ] Reduced-motion fallback present in every sheet task (2–7) and bubble task (8).
- [ ] Acceptance criteria covered by the audit grep in Task 12.
