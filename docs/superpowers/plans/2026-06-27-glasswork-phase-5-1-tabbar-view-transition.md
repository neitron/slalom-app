# Glasswork Phase 5.1 — TabBar View Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a directional slide transition when the user taps a TabBar item, using the View Transitions API. Honors `prefers-reduced-motion` and feature-detects so older browsers degrade to instant nav.

**Architecture:** Small composable wraps `document.startViewTransition` with feature-detect + reduced-motion check. TabBar intercepts tab clicks via `RouterLink` custom slot, sets a `--vt-direction` CSS variable based on tab order, then runs the navigation inside the composable. CSS `@supports` + `::view-transition-*` pseudo-elements drive the slide animation. Three files total.

**Tech Stack:** Vue 3 + Vue Router 4 + View Transitions API (no new deps). Motion tokens from Phase 5.

**Spec:** `spec/2026-06-27-glasswork-phase-5-1-tabbar-view-transition-design.md`

---

## Task 0: Pre-flight

**Files:** none modified.

- [ ] **Step 1: Verify baseline**

```bash
npm test
npm run build
```
Expected: 150/150 pass, build clean.

- [ ] **Step 2: Confirm spec is committed**

```bash
git log -1 --oneline -- spec/2026-06-27-glasswork-phase-5-1-tabbar-view-transition-design.md
```
Expected: commit `2544011`.

---

## Task 1: Create `useViewTransition` composable

**Files:**
- Create: `src/composables/useViewTransition.ts`

- [ ] **Step 1: Write the composable**

Create `src/composables/useViewTransition.ts`:

```ts
/**
 * Wraps document.startViewTransition with feature-detect + reduced-motion check.
 * Returns a function that takes a callback and runs it inside a View Transition
 * (or directly if VT API isn't supported or the user prefers reduced motion).
 *
 * Errors during the transition are swallowed — they typically indicate the user
 * navigated away mid-flight, which is expected behavior.
 */

interface ViewTransition {
  finished: Promise<void>
  ready: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition(): void
}

interface DocumentWithVT extends Document {
  startViewTransition?: (cb: () => void | Promise<void>) => ViewTransition
}

export type ViewTransitionRunner = (cb: () => void | Promise<void>) => Promise<void>

export function useViewTransition(): ViewTransitionRunner {
  return async (cb) => {
    const doc = document as DocumentWithVT
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supported = typeof doc.startViewTransition === 'function'
    if (!supported || reduce) {
      await cb()
      return
    }
    const transition = doc.startViewTransition!(async () => {
      await cb()
    })
    try {
      await transition.finished
    } catch {
      /* user navigated away mid-transition — expected, swallow */
    }
  }
}
```

- [ ] **Step 2: Type-check + tests**

```bash
npx vue-tsc -b --noEmit
npm test
```
Expected: clean, 150/150.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useViewTransition.ts
git commit -m "Phase 5.1: useViewTransition composable

Tiny wrapper around document.startViewTransition. Feature-detects the
API (iOS Safari 18+ / Chrome 111+) and falls through to plain callback
execution if unsupported or if the user prefers reduced motion. Errors
during the transition are swallowed (user navigated away mid-flight).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add View Transitions CSS to `style.css`

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: Append the VT CSS block at end-of-file**

Append to `src/style.css` (after the existing rules):

```css

/* View Transitions — Phase 5.1
   --vt-direction is set on :root by TabBar before triggering the transition.
   +1 = going right in tab order (Home → Tricks → Graph → Sequences);
        old slides left, new slides in from right.
   -1 = going left in tab order; old slides right, new slides in from left.
    0 = no direction (deep links, programmatic nav) → opacity fade only. */

@supports (view-transition-name: root) {
  :root {
    --vt-direction: 0;
    --vt-slide-distance: 24px;
  }

  ::view-transition-old(root) {
    animation: vt-slide-out var(--motion-g-base) var(--ease-g-out);
  }
  ::view-transition-new(root) {
    animation: vt-slide-in var(--motion-g-base) var(--ease-g-out);
  }

  @keyframes vt-slide-out {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(calc(var(--vt-direction) * var(--vt-slide-distance) * -1)); }
  }
  @keyframes vt-slide-in {
    from { opacity: 0; transform: translateX(calc(var(--vt-direction) * var(--vt-slide-distance))); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none;
    }
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: clean (only pre-existing INEFFECTIVE_DYNAMIC_IMPORT warnings).

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "Phase 5.1: view-transition CSS — directional slide via --vt-direction

@supports-gated block defines slide-in/slide-out keyframes animated on
::view-transition-old(root) and ::view-transition-new(root) pseudo-elements.
The slide direction is multiplied by --vt-direction (-1/0/1), so deep-link
navigation (direction=0) collapses to pure opacity fade — the browser
default behavior — while TabBar taps that set ±1 get a 24px directional
slide. Reduced-motion disables all animation inside this @supports block.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire TabBar click interception + direction logic

**Files:**
- Modify: `src/components/TabBar.vue`

- [ ] **Step 1: Add imports + direction constant + click handler**

Edit `src/components/TabBar.vue`. In the `<script setup>` block, add at the top of the imports:

```ts
import { useRouter } from 'vue-router'
import { useViewTransition } from '../composables/useViewTransition'
```

The existing `useRoute` import should remain. Below the existing `const route = useRoute()` line, add:

```ts
const router = useRouter()
const vt = useViewTransition()
const TAB_ORDER: string[] = ['/', '/tricks', '/graph', '/sequences']

async function onTabClick(to: string, navigate: (e?: MouseEvent) => Promise<void>): Promise<void> {
  const fromIdx = TAB_ORDER.indexOf(route.path)
  const toIdx = TAB_ORDER.indexOf(to)
  const dir = (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx)
    ? (toIdx > fromIdx ? 1 : -1)
    : 0
  document.documentElement.style.setProperty('--vt-direction', String(dir))
  try {
    await vt(async () => {
      await navigate()
    })
  } finally {
    document.documentElement.style.setProperty('--vt-direction', '0')
  }
}
```

- [ ] **Step 2: Convert RouterLink usage to `custom` slot mode with intercepted click**

In the `<template>` block, find the existing RouterLink:

```html
      <RouterLink
        v-for="(t, idx) in tabs"
        :key="t.to"
        :to="t.to"
        class="relative flex flex-col items-center justify-center min-h-[44px] py-1.5"
        :style="{ borderRadius: tabBorderRadius(idx, tabs.length) }"
        :class="isActive(t.to)
          ? 'tabbar-active font-semibold'
          : 'text-[color:var(--color-g-fg-muted)]'"
      >
        ...
      </RouterLink>
```

Replace the OPENING `<RouterLink>` tag and its rendered output with the custom slot pattern:

```html
      <RouterLink
        v-for="(t, idx) in tabs"
        :key="t.to"
        :to="t.to"
        custom
        v-slot="{ href, navigate }"
      >
        <a
          :href="href"
          class="relative flex flex-col items-center justify-center min-h-[44px] py-1.5"
          :style="{ borderRadius: tabBorderRadius(idx, tabs.length) }"
          :class="isActive(t.to)
            ? 'tabbar-active font-semibold'
            : 'text-[color:var(--color-g-fg-muted)]'"
          @click.prevent="onTabClick(t.to, navigate)"
        >
          ... (existing svg + label + badge) ...
        </a>
      </RouterLink>
```

The entire body of the original RouterLink (the `<svg>`, `<span>`, `<span v-if=...>` badge) moves verbatim inside the new `<a>` tag. The closing tag changes from `</RouterLink>` to `</a></RouterLink>`.

- [ ] **Step 3: Type-check + tests + build**

```bash
npx vue-tsc -b --noEmit && npm test && npm run build
```
Expected: clean / 150 / clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/TabBar.vue
git commit -m "Phase 5.1: TabBar — intercept tab clicks for directional View Transition

Uses RouterLink's custom slot mode so the rendered <a> keeps native
anchor href / right-click support while we intercept the click with
@click.prevent. Sets --vt-direction on :root based on TAB_ORDER index
diff (±1 for directional slide, 0 for same-tab tap), then drives the
navigation through useViewTransition (which feature-detects and honors
prefers-reduced-motion). Resets --vt-direction to 0 in a finally block
so subsequent programmatic nav defaults to plain cross-fade.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Verification + SESSION-HANDOFF update

**Files:**
- Modify: `spec/SESSION-HANDOFF.md`

- [ ] **Step 1: Final tests + build**

```bash
npm test && npm run build
```
Expected: 150/150 + clean build.

- [ ] **Step 2: Manual smoke test (controller responsibility)**

On dev server (`npm run dev`) + iOS Safari 18+ device:
- Tap Tricks tab from Home → content slides left, new page slides in from right.
- Tap Home from Tricks → reverse direction.
- Tap Graph from Home → content slides further left, new page from right (TAB_ORDER index 0→2 = direction +1, still rightward).
- Tap Settings via Profile menu (NOT a TabBar slot) → default cross-fade (no directional slide).
- iOS Settings → Accessibility → Motion → Reduce Motion ON → tap any TabBar tab → instant nav, no slide.
- Right-click / cmd-click a TabBar item → opens normally in new tab (anchor href preserved).

- [ ] **Step 3: Update `spec/SESSION-HANDOFF.md`**

Add a "Phase 5.1 — TabBar View Transition" subsection at the top of "What's shipped". Update the State block with new HEAD + commit count. Add a Decisions log entry for the View Transitions adoption + composable pattern. Update the "Prompt for new session" with the new HEAD. Add to the Decisions log:

> - DECIDED 2026-06-27 (Phase 5.1): TabBar navigation uses View Transitions API (iOS Safari 18+ / Chrome 111+) with a directional slide based on TAB_ORDER index diff (Home/Tricks/Graph/Sequences = 0/1/2/3). `--vt-direction` CSS variable carries -1/0/+1. Deep links keep VT default (cross-fade) when supported. Reduced-motion + unsupported browsers degrade to instant nav. Wiring: `useViewTransition` composable + TabBar RouterLink-custom-slot click intercept + CSS `@supports (view-transition-name: root)` block.

- [ ] **Step 4: Final commit**

```bash
git add spec/SESSION-HANDOFF.md
git commit -m "SESSION-HANDOFF: Phase 5.1 (TabBar View Transition) shipped

Adds Phase 5.1 to 'What's shipped' subsection with the composable +
TabBar wiring + CSS approach. Decisions log captures the directional
slide design + browser-support matrix. Updates new-session prompt
HEAD ref.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Don't push automatically**

Stop here. User pushes manually when ready.

---

## Self-review checklist (run after writing this plan, before handoff)

- [ ] Every spec section has at least one task implementing it.
- [ ] No "TBD" / "TODO" placeholders.
- [ ] `useViewTransition` (Task 1) is consumed exactly as the spec describes in Task 3.
- [ ] `--vt-direction` is set in Task 3 and consumed in Task 2's CSS.
- [ ] Reduced-motion handled in both the composable (Task 1) AND the CSS (Task 2).
- [ ] All `git commit` messages include the `Co-Authored-By` line.
