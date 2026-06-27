# Glasswork Phase 5.1 — TabBar View Transition design

Date: 2026-06-27
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
Predecessor: Phase 5 (Motion language, foundation pass) — `spec/2026-06-27-glasswork-phase-5-motion-design.md`

## Purpose

Add a directional slide transition when the user taps a TabBar item, using the **View Transitions API**. This is the first of the deferred-from-Phase-5 motion threads. Subsequent threads (RateDots pulse, spring tap-bounce, generator stagger, fibonacci breathing) each get their own small follow-up spec.

After this lands, navigating Home → Tricks → Graph → Sequences (or back) feels like sliding pages, matching native iOS app feel. Deep-link navigation (Settings, route changes outside TabBar) keeps the browser default (no transition or instant) for now — out of scope.

This document is the spec. The implementation plan lives in `docs/superpowers/plans/2026-06-27-glasswork-phase-5-1-tabbar-view-transition.md` (written after this is approved).

## Scope summary

**In scope:**
- A tiny composable (`src/composables/useViewTransition.ts`) that wraps `document.startViewTransition` with feature-detect + reduced-motion check.
- Router guard (`router.beforeEach`) that uses it to wrap navigations.
- Directional slide CSS using `::view-transition-old(root)` / `::view-transition-new(root)` pseudo-elements, driven by a `--vt-direction` CSS variable set per navigation.
- The 4 TabBar paths (`/`, `/tricks`, `/graph`, `/sequences`) get directional slide based on tab order.
- All other route changes get the **browser default** (cross-fade) when the View Transitions API is available — no special wiring, just the same router guard.
- Reduced-motion path: skip `startViewTransition` entirely, navigate normally.
- Feature-detect path: same — no `startViewTransition`, navigate normally.

**Out of scope (named so they aren't conflated):**
- Sub-tab View Transitions (Sequences ↔ Transitions sub-tab) — sub-tabs use `router.replace` with `route.meta.subTab` so the same router hook would fire, but the same-component re-render doesn't naturally trigger a VT. Needs separate design.
- Spring physics / RateDots pulse / generator stagger / fibonacci breathing — each gets its own small spec.
- Cross-document transitions (the newer Chrome-only API).
- Hero element transitions (`view-transition-name` on specific elements to morph between pages).

## Decisions

### Browser support

View Transitions API is supported in:
- iOS Safari 18.0+ (released September 2024)
- Chrome 111+
- Edge 111+
- Firefox: not yet (as of late 2025)

Older iOS / unsupported browsers degrade to instant navigation (no transition). The feature-detect guarantees zero regression for unsupported environments.

### Composable shape

```ts
// src/composables/useViewTransition.ts
export function useViewTransition(): (cb: () => void | Promise<void>) => Promise<void> {
  return async (cb) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supported = typeof (document as any).startViewTransition === 'function'
    if (!supported || reduce) {
      await cb()
      return
    }
    const transition = (document as any).startViewTransition(async () => {
      await cb()
    })
    try { await transition.finished } catch { /* user navigated away mid-transition */ }
  }
}
```

Returns a function that takes a callback and returns a Promise. The callback runs inside the transition (or directly if VT isn't available). Errors during the transition are swallowed (user navigated away mid-flight — expected behavior).

### Router integration

Vue Router's `beforeEach` guard. Standard pattern: the guard runs before component swap, so we wrap the actual navigation commit inside `startViewTransition`'s callback.

Vue Router has a known awkwardness here — the `next()` callback or returning navigation is the commit point. The cleanest pattern: use `router.beforeResolve` and trigger the transition by deferring the route component mount.

For our purposes, the simplest reliable pattern is to use the `router.afterEach` hook to set the direction CSS variable, and trigger `startViewTransition` from the TabBar component's click handler (it has access to both source and destination):

```vue
<!-- TabBar.vue click handler -->
const router = useRouter()
const vt = useViewTransition()
const TAB_ORDER: string[] = ['/', '/tricks', '/graph', '/sequences']

function onTabClick(e: Event, to: string) {
  e.preventDefault()
  const fromIdx = TAB_ORDER.indexOf(router.currentRoute.value.path)
  const toIdx = TAB_ORDER.indexOf(to)
  if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
    document.documentElement.style.setProperty('--vt-direction', toIdx > fromIdx ? '1' : '-1')
  }
  void vt(async () => {
    await router.push(to)
  })
}
```

Bound to `<RouterLink>` via `@click.prevent`, so RouterLink's native href / accessibility still works while the click is intercepted.

Non-TabBar navigations (deep links, programmatic navigation in code) keep the normal `router.push` / `<RouterLink>` flow — they get the default cross-fade (or instant if VT not supported).

### CSS — directional slide

Add to `src/style.css` or a new `src/design/view-transitions.css` file. Recommend `style.css` since it's a small block and lives next to other root rules.

```css
/* View Transitions — directional slide for TabBar nav, default for everything else.
   --vt-direction is set on :root by TabBar before triggering the transition.
   +1 = going right in tab order (Home→Tricks→Graph→Sequences); old slides left, new slides in from right.
   -1 = going left in tab order; old slides right, new slides in from left.
   Unset = default cross-fade (browser default for ::view-transition-*).
*/

@supports (view-transition-name: root) {
  :root {
    /* default: no direction = browser default cross-fade only */
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

Distance is small (24px) — the slide is subtle, not a full-screen swipe. The opacity fade carries the perceived transition; the small horizontal motion adds directionality without feeling like a page-flip.

When `--vt-direction: 0` (deep links, programmatic nav), the slide distance multiplies to 0, leaving pure opacity fade — exactly the browser default behavior.

### TabBar-specific click interception

`TabBar.vue` currently uses `<RouterLink :to="t.to">` which generates anchor tags. To intercept the click without breaking accessibility:

```vue
<RouterLink
  v-for="(t, idx) in tabs"
  :key="t.to"
  :to="t.to"
  custom
  v-slot="{ href, navigate, isActive }"
>
  <a
    :href="href"
    @click.prevent="onTabClick(t.to, navigate)"
    class="..."
    :class="isActive ? '...' : '...'"
    ...
  >
    ...
  </a>
</RouterLink>
```

Uses RouterLink's `custom` slot mode so we get the `href`, `navigate()`, and `isActive` helpers but render our own `<a>` with intercepted click. Preserves SEO/a11y of the underlying anchor.

```ts
function onTabClick(to: string, navigate: (e?: MouseEvent) => Promise<void>) {
  const fromIdx = TAB_ORDER.indexOf(router.currentRoute.value.path)
  const toIdx = TAB_ORDER.indexOf(to)
  if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
    document.documentElement.style.setProperty('--vt-direction', String(toIdx > fromIdx ? 1 : -1))
  } else {
    document.documentElement.style.setProperty('--vt-direction', '0')
  }
  void vt(async () => {
    await navigate()
  })
}
```

`navigate()` is RouterLink's commit-the-route function. Wrapped in our VT composable.

### After-transition cleanup

After the transition completes, `--vt-direction` is reset to `0` so any subsequent programmatic navigation (e.g., from a deep link, sheet) doesn't accidentally pick up the last TabBar direction:

```ts
void vt(async () => {
  await navigate()
}).finally(() => {
  document.documentElement.style.setProperty('--vt-direction', '0')
})
```

## Components touched

- (New) `src/composables/useViewTransition.ts` — the composable.
- `src/components/TabBar.vue` — click interception via `RouterLink custom` + direction logic.
- `src/style.css` — VT CSS rules + reduced-motion fallback inside `@supports (view-transition-name: root)`.

That's the entire surface. No router changes, no other files touched.

## Risks and open questions

- **Vue's RouterView reconciliation under VT.** Vue's component swap is async. The VT API expects the DOM to update synchronously inside the `startViewTransition` callback. Vue Router's `await navigate()` should resolve after the new component is mounted — verify on device that the slide actually animates the new content (not just the old content sliding out into a black page).
- **Sticky-bar interaction.** Tricks + Sequences pages have a sticky top bar; Graph has the floating mode switcher; Sequences has the FAB. These are children of the page root, so they slide with the page — which is the desired behavior (they don't feel "stuck behind" while pages slide). Verify on device.
- **TabBar self-stability.** The TabBar itself is teleported to `<body>` and lives outside the RouterView. It should NOT slide with the page transition (the root capture only covers what's inside `<main>`). Verify: tapping a tab triggers slide on content area only; TabBar stays planted.
- **Hash-history quirks.** The app uses `createWebHashHistory`. View Transitions API doesn't know about hash routing per se; the transition fires on DOM update, which happens after the route component swaps. Should work but worth verifying.
- **`router.currentRoute.value.path`** at click time may report the from-path (correct) or be mid-transition. If it reports incorrectly during rapid taps, fall back to caching last-known path manually.

## Acceptance criteria

- Tap a TabBar tab on iOS 18+ Safari → content slides directionally based on tab order; TabBar itself stays planted.
- Tap a TabBar tab on iOS 17 / older / Firefox / unsupported browser → instant navigation, no transition, no errors.
- Tap a TabBar tab with macOS / iOS "Reduce Motion" preference active → instant navigation, no transition.
- Deep-link navigation (RouterLink not in TabBar, programmatic `router.push`) → default cross-fade where VT supported, instant otherwise. No directional slide.
- TabBar accessibility unchanged — anchor `href` still points to the route; right-click → "Open link in new tab" / cmd-click still works.
- 150/150 tests pass.
- Build clean.
