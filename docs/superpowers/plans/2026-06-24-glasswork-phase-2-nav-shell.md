# Glasswork Phase 2 — Nav / Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the App shell, TabBar, and header treatment with the new 4-tab IA, rendered in Glasswork material. Drop the postponed iOS keyboard workaround. Re-skin sheets in glass (material only, no behavior changes).

**Architecture:**
- App.vue becomes a minimal shell: `<main><RouterView/></main> <TabBar/> <Sheets/> <Toasts/>`. No header. Sheets stay always-mounted-at-shell.
- TabBar has 4 tabs (Home / Tricks / Graph / Sequences), uses `.gw-glass-strong` material with a white-pill active state.
- HeaderProfileMenu moves from `App.vue` to `Home.vue` (the user-approved decision in Task A1 — "avatar lives on Home").
- Routes change per the IA decisions doc: `/` → Home stub, `/tricks` → AllTricks, `/diagnostics` → placeholder.
- ResizeObserver layout dance (`--header-h`, `--tabbar-h`) replaced by static CSS tokens — TabBar height is fixed, no header to measure.
- `useIosKeyboardReset` deleted. The postponed iOS drift bug is acknowledged out-of-scope for this phase.
- Sheets get a material-only re-skin: glass background, new corner radius. Internal layout (rate buttons, step rows, etc.) untouched — Phase 3 owns that.

**Tech Stack:** Vue 3 + Vite + Tailwind v4 + Vue Router (hash) + Pinia + Vitest. Glasswork tokens from Phase 1 (`src/design/tokens.ts`, `src/design/glasswork.css`) are consumed throughout. No new runtime dependencies.

**Companion docs:**
- Direction spec: `spec/2026-06-24-redesign-glasswork-design.md`
- Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
- IA decisions: `spec/2026-06-24-glasswork-ia-decisions.md`
- Phase 1 plan: `docs/superpowers/plans/2026-06-24-glasswork-phase-1-ia-and-tokens.md`

---

## Design decisions resolved before this plan

(All three carried forward from a Phase-2 brainstorming pass, 2026-06-24.)

1. **Header**: DROPPED. No global header. Each screen owns its top. Avatar/menu lives on Home (placed inside `Home.vue`, not in the shell).
2. **`/` placeholder**: minimal Home stub — a single glass card with a friendly empty-state message and two large buttons: "Open Tricks" and "Open Graph." Real Home is Phase 4a.
3. **Sheet re-skin scope**: material-only (background, radius, border). No internal layout changes. RateButtons strip stays as-is until Phase 3.

---

## File structure

**Created:**
- `src/pages/Home.vue` — minimal Home stub. Owns the avatar/menu placement.
- `src/pages/Diagnostics.vue` — placeholder page. Contains a single sentence ("Engineering surface — populated in Phase 4h") + the build SHA + a link back to Settings. Reachable from `/diagnostics`.

**Modified:**
- `src/router.ts` — IA-decided routes. Add Home + Diagnostics + `/tricks` alias. Rename existing `/` from `AllTricks` to `Home`. Add `/tricks` → `AllTricks`.
- `src/App.vue` — minimal shell. Drop header. Drop `--header-h` ResizeObserver. Keep sheets, RateFeedback, ToastStack.
- `src/components/TabBar.vue` — 4 tabs (Home / Tricks / Graph / Sequences). New visual treatment using glasswork tokens.
- `src/components/TrickSheet.vue` — material re-skin (panel bg + radius). Markup untouched.
- `src/components/TransitionSheet.vue` — material re-skin.
- `src/components/SequenceSheet.vue` — material re-skin.
- `src/components/GeneratorSheet.vue` — material re-skin.
- `src/pages/Graph.vue` — re-skin the embedded save-sheet (only the sheet panel, not the graph itself).
- `src/style.css` — set `--tabbar-h` as a CSS token (~64px) instead of JS-written. Remove `--header-h` initial value. Keep the keyboard-hide class transition on `.tabbar-fixed` (the drift bug is postponed; the slide-up-on-keyboard behavior stays).

**Deleted:**
- `src/composables/useIosKeyboardReset.ts` — postponed-bug workaround.

**Untouched (deliberate scope limits):**
- All pages other than Home/Diagnostics/Graph save-sheet: visual treatment unchanged. Phase 3 (core components) + Phase 4 (per-screen) own those.
- All stores, domain code, storage, sync.
- `useKeyboardOpen` composable — still needed for the TabBar slide-up.
- `useSheetViewport` composable — still needed for sheet behavior over keyboard.

---

## Verification points

Each task ends with one or more of:
- `npm test` → expect 95+ tests pass.
- `npm run build` → clean build.
- `npm run dev` + LAN URL check on iOS → user manually verifies route renders.

The visual "smoke test" gate at the end of the phase (Task 14) is a user-driven walkthrough on real iOS.

---

## Task list

### Task 1 — Add Home stub page

**Files:**
- Create: `src/pages/Home.vue`

- [ ] **Step 1 — Create the file.**

Create `src/pages/Home.vue`:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'
import HeaderProfileMenu from '../components/HeaderProfileMenu.vue'

const router = useRouter()
</script>

<template>
  <div class="gw-aurora-bg-lg min-h-screen px-4 pt-6 pb-24 flex flex-col gap-6">
    <header class="flex items-center justify-between">
      <h1
        class="font-semibold tracking-tight"
        :style="{ fontSize: 'var(--text-g-h1)', color: 'var(--color-g-fg)' }"
      >
        Slalom
      </h1>
      <HeaderProfileMenu />
    </header>

    <section
      class="gw-glass p-5 flex flex-col gap-4"
      :style="{ borderRadius: 'var(--radius-g-panel)' }"
    >
      <p
        :style="{
          fontSize: 'var(--text-g-body)',
          color: 'var(--color-g-fg-muted)',
        }"
      >
        Welcome. The Home surface is being designed.
      </p>
      <p
        :style="{
          fontSize: 'var(--text-g-body)',
          color: 'var(--color-g-fg-muted)',
        }"
      >
        For now, jump straight into your tricks or the Graph.
      </p>
      <div class="flex gap-3 mt-2">
        <button
          type="button"
          class="flex-1 py-3 font-semibold transition-colors"
          :style="{
            background: 'var(--color-g-brand)',
            color: 'var(--color-g-base)',
            borderRadius: 'var(--radius-g-chip)',
            fontSize: 'var(--text-g-body)',
          }"
          @click="router.push('/tricks')"
        >
          Open Tricks
        </button>
        <button
          type="button"
          class="flex-1 py-3 font-semibold transition-colors gw-glass-strong"
          :style="{
            color: 'var(--color-g-fg)',
            borderRadius: 'var(--radius-g-chip)',
            fontSize: 'var(--text-g-body)',
          }"
          @click="router.push('/graph')"
        >
          Open Graph
        </button>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 2 — Type check.**

```
npm run type-check
```

Expected: no errors involving `Home.vue`.

- [ ] **Step 3 — Commit.**

```bash
git add src/pages/Home.vue
git commit -m "Add minimal Home stub page (Glasswork Phase 2)"
```

---

### Task 2 — Add Diagnostics placeholder page

**Files:**
- Create: `src/pages/Diagnostics.vue`

- [ ] **Step 1 — Create the file.**

Create `src/pages/Diagnostics.vue`:

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router'

declare const __BUILD_SHA__: string
declare const __BUILD_TIME__: string

const router = useRouter()
const sha = __BUILD_SHA__
const built = __BUILD_TIME__
</script>

<template>
  <div class="min-h-screen px-4 pt-6 pb-24 flex flex-col gap-6"
       :style="{ background: 'var(--color-g-base)', color: 'var(--color-g-fg)' }">
    <h1 class="font-semibold tracking-tight" :style="{ fontSize: 'var(--text-g-h1)' }">
      Diagnostics
    </h1>

    <section
      class="gw-glass p-5 flex flex-col gap-3"
      :style="{ borderRadius: 'var(--radius-g-panel)' }"
    >
      <p :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg-muted)' }">
        Engineering surface — populated in Phase 4h.
      </p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
          :style="{ fontSize: 'var(--text-g-micro)' }">
        <dt :style="{ color: 'var(--color-g-fg-muted)' }">Build SHA</dt>
        <dd style="font-family: ui-monospace, monospace;">{{ sha }}</dd>
        <dt :style="{ color: 'var(--color-g-fg-muted)' }">Built at</dt>
        <dd style="font-family: ui-monospace, monospace;">{{ built }}</dd>
      </dl>
    </section>

    <button
      type="button"
      class="self-start px-4 py-2 gw-glass-strong"
      :style="{
        borderRadius: 'var(--radius-g-chip)',
        color: 'var(--color-g-fg)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="router.push('/settings')"
    >
      ← Settings
    </button>
  </div>
</template>
```

- [ ] **Step 2 — Type check.**

```
npm run type-check
```

Expected: no errors involving `Diagnostics.vue`. The `__BUILD_SHA__`/`__BUILD_TIME__` globals are defined in `vite.config.ts` via `define:` — TS sees them via the `declare const` lines.

- [ ] **Step 3 — Commit.**

```bash
git add src/pages/Diagnostics.vue
git commit -m "Add Diagnostics placeholder page (Glasswork Phase 2)"
```

---

### Task 3 — Update router with new route map

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1 — Replace the routes array** to match the IA decisions doc.

In `src/router.ts`, replace the entire `routes` array with:

```ts
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./pages/Home.vue') },
  { path: '/tricks', name: 'tricks', component: AllTricks },
  { path: '/learning', name: 'learning', component: () => import('./pages/Learning.vue') },
  { path: '/graph', name: 'graph', component: () => import('./pages/Graph.vue') },
  { path: '/transitions', name: 'transitions', component: () => import('./pages/Transitions.vue') },
  { path: '/sequences', name: 'sequences', component: () => import('./pages/Sequences.vue') },
  { path: '/people', name: 'people', component: () => import('./pages/People.vue') },
  { path: '/u/:nickname', name: 'foreign-profile', component: () => import('./pages/ForeignProfile.vue') },
  { path: '/onboarding/nickname', name: 'nickname-onboarding', component: () => import('./pages/NicknameOnboarding.vue'), meta: { hideTabs: true } },
  { path: '/settings', name: 'settings', component: () => import('./pages/Settings.vue') },
  { path: '/diagnostics', name: 'diagnostics', component: () => import('./pages/Diagnostics.vue') },
  { path: '/install', name: 'install', component: () => import('./pages/Install.vue'), meta: { hideTabs: true } },
  ...(import.meta.env.DEV
    ? [
        {
          path: '/spec/tokens',
          name: 'spec-tokens',
          component: () => import('./pages/spec/Tokens.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
      ]
    : []),
]
```

Important changes vs. before:
- `/` is now `Home` (was `AllTricks`).
- `/tricks` is new and resolves to `AllTricks` (still imported eagerly at the top).
- `/diagnostics` is new (lazy import).

The existing top import `import AllTricks from './pages/AllTricks.vue'` stays — `/tricks` reuses it.

- [ ] **Step 2 — Type check.**

```
npm run type-check
```

Expected: no errors.

- [ ] **Step 3 — Commit.**

```bash
git add src/router.ts
git commit -m "Route map: / → Home, add /tricks + /diagnostics (Glasswork Phase 2 IA)"
```

---

### Task 4 — Delete `useIosKeyboardReset` composable

**Files:**
- Delete: `src/composables/useIosKeyboardReset.ts`

- [ ] **Step 1 — Confirm no other consumer.**

```
grep -rn "useIosKeyboardReset" src/
```

Expected: only `App.vue` references it. (That reference is removed in Task 5.)

If the grep shows other consumers besides `App.vue`: STOP and report. The plan assumes only `App.vue` consumes it.

- [ ] **Step 2 — Delete the file.**

```bash
git rm src/composables/useIosKeyboardReset.ts
```

- [ ] **Step 3 — Confirm App.vue still references it (it will, until Task 5).**

That's expected. The next task removes the import. The build will be temporarily broken between Tasks 4 and 5 — that's fine; we commit Task 4 + 5 individually and the project compiles after Task 5.

Actually, since the build will be broken: combine Tasks 4 and 5 into a single commit by NOT committing Task 4 yet. Instead, after `git rm` succeeds, immediately move to Task 5. The combined commit lands at the end of Task 5.

Skip the standalone commit for Task 4. Mark Task 4 staged but uncommitted.

```
git status
```

Expected: deletion of `useIosKeyboardReset.ts` staged, nothing else.

---

### Task 5 — Replace `src/App.vue` with the new shell

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1 — Replace App.vue completely** with:

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import TabBar from './components/TabBar.vue'
import RateFeedback, { type Report as RateFeedbackReport } from './components/RateFeedback.vue'
import TrickSheet from './components/TrickSheet.vue'
import TransitionSheet from './components/TransitionSheet.vue'
import SequenceSheet from './components/SequenceSheet.vue'
import ToastStack from './components/ToastStack.vue'
import { useUiStore } from './stores/ui'
import { useTricksStore } from './stores/tricks'
import { useTransitionsStore } from './stores/transitions'
import { useSequencesStore } from './stores/sequences'
import { getAllTricks, getAllTransitions, getAllSequences } from './storage/repo'
import { computed } from 'vue'

const uiStore = useUiStore()
const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()

async function reloadStoresFromDexie() {
  const [tricks, edges, sequences] = await Promise.all([
    getAllTricks(),
    getAllTransitions(),
    getAllSequences(),
  ])
  tricksStore.tricks = tricks
  tricksStore.loaded = true
  transitionsStore.edges = edges
  transitionsStore.loaded = true
  sequencesStore.sequences = sequences
  sequencesStore.loaded = true
}

const onPulled = () => { void reloadStoresFromDexie() }
const onError = (e: Event) => {
  const msg = (e as CustomEvent<{ message: string }>).detail?.message
  if (msg) uiStore.showError(msg)
}

onMounted(() => {
  window.addEventListener('slalom:pulled', onPulled)
  window.addEventListener('slalom:error', onError as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('slalom:pulled', onPulled)
  window.removeEventListener('slalom:error', onError as EventListener)
})

const feedbackReport = computed<RateFeedbackReport | null>(() => {
  const f = uiStore.feedback
  if (!f) return null
  return { score: f.score, side: f.side, context: f.context, label: f.label }
})

function onFeedbackClose() {
  uiStore.clearFeedback()
}
</script>

<template>
  <div
    :style="{
      paddingTop: 'env(safe-area-inset-top)',
      background: 'var(--color-g-base)',
      minHeight: '100dvh',
    }"
  >
    <main>
      <RouterView />
    </main>
    <TabBar />
    <SequenceSheet />
    <TransitionSheet />
    <TrickSheet />
    <RateFeedback :report="feedbackReport" @close="onFeedbackClose" />
    <ToastStack />
  </div>
</template>
```

Key differences vs. the old App.vue:
- No `<header>` element. No `HeaderProfileMenu` import.
- No `headerRef`, no ResizeObserver, no `--header-h` writes.
- No `useRoute` import (was only used to gate the header — the header is gone).
- No `showTabs`/`showHeader` computed — the TabBar gates itself via `route.meta.hideTabs` (set in Task 6).
- `useIosKeyboardReset` is gone (deleted in Task 4).

Note: `TabBar` will render globally and self-gate. Routes with `meta: { hideTabs: true }` (Install, Onboarding nickname, /spec/tokens) need the TabBar to hide itself — Task 6 implements that.

- [ ] **Step 2 — Type check.**

```
npm run type-check
```

Expected: errors will remain on `TabBar.vue` (still references `useIosKeyboardReset`-free architecture but not the new design yet). Those resolve in Task 6.

Actually — TabBar already uses `useKeyboardOpen` (not `useIosKeyboardReset`). The old App.vue was the only consumer of `useIosKeyboardReset`. So type-check should pass clean after this step.

If it fails on anything mentioning `useIosKeyboardReset`: grep again, fix the orphan reference, re-type-check.

- [ ] **Step 3 — Commit Tasks 4 + 5 together.**

```bash
git add src/App.vue
git commit -m "$(cat <<'EOF'
Drop header, simplify App shell, remove iOS keyboard workaround

Glasswork Phase 2: App.vue is now a minimal shell (main + TabBar +
sheets + toasts). HeaderProfileMenu moves to Home. The
useIosKeyboardReset composable is deleted as part of the
shell re-architecture (postponed bug stays postponed).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4 — Run the full test suite.**

```
npm test
```

Expected: all 95 tests pass. (Tests don't import App.vue; they test pure logic.)

- [ ] **Step 5 — Build.**

```
npm run build
```

Expected: clean.

---

### Task 6 — Replace TabBar with the 4-tab glass version

**Files:**
- Modify: `src/components/TabBar.vue`

- [ ] **Step 1 — Replace the file** with:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFriendsStore } from '../stores/friends'
import { useKeyboardOpen } from '../composables/useKeyboardOpen'

type Tab = { to: string; label: string; icon: 'home' | 'tricks' | 'graph' | 'sequences' }

const tabs: Tab[] = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/tricks', icon: 'tricks', label: 'Tricks' },
  { to: '/graph', icon: 'graph', label: 'Graph' },
  { to: '/sequences', icon: 'sequences', label: 'Sequences' },
]

const friends = useFriendsStore()
const incomingCount = computed<number>(() => friends.incomingCount)

const route = useRoute()
const hideTabs = computed(() => !!route.meta.hideTabs)

const kbOpen = useKeyboardOpen()

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <Teleport to="body">
    <nav
      v-if="!hideTabs"
      class="tabbar-fixed gw-glass-strong grid grid-cols-4 gap-1 px-1 pt-1"
      :class="{ 'is-hidden': kbOpen }"
      :style="{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.25rem)',
      }"
    >
      <RouterLink
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="relative flex flex-col items-center justify-center min-h-[44px] py-1.5"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
        :class="isActive(t.to)
          ? 'tabbar-active font-semibold'
          : 'text-[color:var(--color-g-fg-muted)]'"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <template v-if="t.icon === 'home'">
            <path d="M3 11.5L12 4l9 7.5" />
            <path d="M5 10.5V20h14V10.5" />
          </template>
          <template v-else-if="t.icon === 'tricks'">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </template>
          <template v-else-if="t.icon === 'graph'">
            <circle cx="5" cy="6" r="2" />
            <circle cx="19" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <path d="M6.5 7.5L11 16.5M17.5 7.5L13 16.5M6.5 6h11" />
          </template>
          <template v-else-if="t.icon === 'sequences'">
            <path d="M10 13a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5" />
            <path d="M14 11a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5" />
          </template>
        </svg>
        <span class="mt-0.5 text-[10px] leading-tight">{{ t.label }}</span>
        <span
          v-if="t.icon === 'home' && incomingCount > 0"
          class="absolute top-0.5 right-2 w-2 h-2 rounded-full"
          :style="{ background: 'var(--color-g-danger)' }"
        />
      </RouterLink>
    </nav>
  </Teleport>
</template>

<style scoped>
.tabbar-active {
  background: var(--color-g-fg);
  color: var(--color-g-base);
}
</style>
```

Key behavior:
- 4 tabs only. Old Tricks/Learning/Transitions/People tabs are dropped — those routes still exist and are reachable from Home / Graph / HeaderProfileMenu.
- The "incoming friend request" red dot moves from People to Home (since People is no longer in the bar). When People is accessed from Home, the user sees the dot there too.
- Active state is the **white pill** (`bg: --color-g-fg`, `color: --color-g-base`) per the design spec.
- Inactive labels use `--color-g-fg-muted` for the cool calm read.
- Material is `.gw-glass-strong` instead of the old `bg-card`.
- `hideTabs` is read directly from `route.meta` — no need for App.vue to gate the render.
- Icons use stroke width 1.75 (slightly lighter than the old 2). Glasswork direction calls these out as Lucide stand-ins to be replaced in Phase 6; the stroke change is a small visual nod toward the new aesthetic.

- [ ] **Step 2 — Update `src/style.css`** for the new TabBar height.

In `src/style.css`, find the `:root` block at the top:

```css
@layer base {
  :root {
    --tabbar-h: 4rem;
    --header-h: 60px;
  }
```

Change to:

```css
@layer base {
  :root {
    --tabbar-h: 4rem;
  }
```

(Drop `--header-h` — no more header.)

The `body { padding-bottom: var(--tabbar-h); }` rule below it stays as-is — the static value handles the TabBar height since we no longer write it from JS.

- [ ] **Step 3 — Type check + tests + build.**

```
npm run type-check && npm test && npm run build
```

Expected: pass / 95 pass / clean.

- [ ] **Step 4 — Commit.**

```bash
git add src/components/TabBar.vue src/style.css
git commit -m "TabBar: 4-tab glass version (Home / Tricks / Graph / Sequences)"
```

---

### Task 7 — Re-skin TrickSheet (material only)

**Files:**
- Modify: `src/components/TrickSheet.vue`

- [ ] **Step 1 — Find the sheet panel** in the template. Look for the element with classes including `bg-card`, `border-border`, `rounded-t-xl` (or similar) that wraps the sheet's content. Common pattern from the codebase:

```html
<div class="sheet-panel ... bg-card ... rounded-t-xl ...">
```

- [ ] **Step 2 — Apply the material re-skin.**

In the SAME element, replace the visual classes with the Glasswork material:
- Remove: `bg-card`, `bg-card-2`, `border-border`, `border-border-2`, any `rounded-t-xl` / `rounded-xl` corner classes.
- Add the class `gw-glass-strong`.
- Add inline style for the rounded top: `:style="{ borderTopLeftRadius: 'var(--radius-g-panel)', borderTopRightRadius: 'var(--radius-g-panel)' }"`.

Preserve every other class (sizing, padding, scroll, drag, the `sheet-panel` class which carries safe-area + keyboard rules from `style.css`).

DO NOT touch any internal markup — buttons, rate dots, rate buttons, headers inside the sheet stay exactly as they are. Only the OUTER panel surface changes.

- [ ] **Step 3 — Type check + build.**

```
npm run type-check && npm run build
```

Expected: clean.

- [ ] **Step 4 — Commit.**

```bash
git add src/components/TrickSheet.vue
git commit -m "TrickSheet: glass material re-skin (Glasswork Phase 2)"
```

---

### Task 8 — Re-skin TransitionSheet (material only)

**Files:**
- Modify: `src/components/TransitionSheet.vue`

- [ ] **Step 1 — Same procedure as Task 7.** Find the outer sheet panel. Replace its `bg-card`/`border-border`/corner-radius classes with `gw-glass-strong` + inline-style top radii.

- [ ] **Step 2 — Type check + build.**

```
npm run type-check && npm run build
```

- [ ] **Step 3 — Commit.**

```bash
git add src/components/TransitionSheet.vue
git commit -m "TransitionSheet: glass material re-skin (Glasswork Phase 2)"
```

---

### Task 9 — Re-skin SequenceSheet (material only)

**Files:**
- Modify: `src/components/SequenceSheet.vue`

- [ ] **Step 1 — Same procedure as Task 7.**

- [ ] **Step 2 — Type check + build.**

```
npm run type-check && npm run build
```

- [ ] **Step 3 — Commit.**

```bash
git add src/components/SequenceSheet.vue
git commit -m "SequenceSheet: glass material re-skin (Glasswork Phase 2)"
```

---

### Task 10 — Re-skin GeneratorSheet (material only)

**Files:**
- Modify: `src/components/GeneratorSheet.vue`

- [ ] **Step 1 — Same procedure as Task 7.**

- [ ] **Step 2 — Type check + build.**

```
npm run type-check && npm run build
```

- [ ] **Step 3 — Commit.**

```bash
git add src/components/GeneratorSheet.vue
git commit -m "GeneratorSheet: glass material re-skin (Glasswork Phase 2)"
```

---

### Task 11 — Re-skin Graph save-sheet (material only)

**Files:**
- Modify: `src/pages/Graph.vue`

- [ ] **Step 1 — Find the inline save-sheet** inside `src/pages/Graph.vue`. Look for the `<Teleport to="body">` block that contains a `sheet-panel` class.

- [ ] **Step 2 — Apply the same material re-skin** to the save-sheet panel:
- Replace `bg-card border-t border-border rounded-t-xl` with `gw-glass-strong`.
- Add `:style="{ borderTopLeftRadius: 'var(--radius-g-panel)', borderTopRightRadius: 'var(--radius-g-panel)' }"`.

DO NOT touch the rest of `Graph.vue` — the graph itself, the sequence-mode bar, the link-source banner, etc., are all out of scope for Phase 2. They get redesigned in Phase 4c.

- [ ] **Step 3 — Type check + build.**

```
npm run type-check && npm run build
```

- [ ] **Step 4 — Commit.**

```bash
git add src/pages/Graph.vue
git commit -m "Graph save-sheet: glass material re-skin (Glasswork Phase 2)"
```

---

### Task 12 — Verify route smoke check

**Files:** none (verification).

- [ ] **Step 1 — Run the dev server.**

```
npm run dev -- --host
```

Note the LAN URL printed (e.g., `http://192.168.x.x:5173/`).

- [ ] **Step 2 — User opens each route on iOS Safari and confirms:**

Tap-walk the routes; controller may relay the LAN URL to the user. Required confirms:

- `/#/` — Home stub renders. Two buttons visible. Avatar (top-right) opens menu.
- `/#/tricks` — All Tricks renders, search/filter works.
- `/#/learning` — Learning renders.
- `/#/graph` — Graph renders. Graph functional. Save-sheet opens with glass material when a sequence is built.
- `/#/transitions` — Transitions renders.
- `/#/sequences` — Sequences list renders. Generator opens with glass material.
- `/#/people` — People renders.
- `/#/settings` — Settings renders.
- `/#/diagnostics` — Diagnostics placeholder renders with build SHA.
- `/#/install` — Install renders (no tab bar visible).
- `/#/onboarding/nickname` — onboarding renders (no tab bar visible).
- `/#/spec/tokens` — token preview renders (dev only, no tab bar).
- Tap any trick card → TrickSheet opens with glass material.

iOS Safari performance: tabbed switching feels smooth. Keyboard open in any input → TabBar slides down (drift bug is acknowledged out-of-scope). No `100vh` jumpiness.

If anything is broken: stop and fix before Task 13.

- [ ] **Step 3 — Stop dev server.**

```
pkill -f "vite --host" || true
```

---

### Task 13 — Update roadmap status + Phase 2 commit

**Files:**
- Modify: `spec/2026-06-24-redesign-glasswork-roadmap.md`

- [ ] **Step 1 — Edit the status table.**

Change the Phase 2 row from:

```
| 2 — Nav/shell | (not yet written) | — | — |
```

to:

```
| 2 — Nav/shell | `docs/superpowers/plans/2026-06-24-glasswork-phase-2-nav-shell.md` | Shipped | 2026-06-24 |
```

- [ ] **Step 2 — Run full test suite + build.**

```
npm test && npm run build
```

Expected: 95 tests pass, clean build.

- [ ] **Step 3 — Commit.**

```bash
git add spec/2026-06-24-redesign-glasswork-roadmap.md
git commit -m "$(cat <<'EOF'
Glasswork Phase 2 shipped — nav/shell

New 4-tab shell, glass material, Home stub at /, Diagnostics
placeholder, dropped useIosKeyboardReset. Sheets re-skinned in glass
(material only). All existing routes still functional.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Decisions made

To append to a `DECISIONS.md` log or include in closing commit notes:

- DECIDED: header is dropped from the global shell. Each screen owns its top.
- DECIDED: HeaderProfileMenu placement moves to Home; non-Home screens reach Settings/People by tapping Home tab first.
- DECIDED: TabBar = 4 tabs only (Home / Tricks / Graph / Sequences). Active state = white pill on the new dark base.
- DECIDED: `--header-h` CSS variable removed; `--tabbar-h` is now static (4rem) in `:root`.
- DECIDED: iOS TabBar keyboard drift remains postponed; `useIosKeyboardReset` deleted in this phase.
- DECIDED: Sheet re-skin is material-only in Phase 2. Internal layout (RateButtons, step rows, etc.) stays in Phase 3.

---

## Open questions deferred to later phases

- Phase 3: do the sheets need a thin top "handle" indicator on the new glass surface (since the existing `bg-border-2` strip may not read against frost)?
- Phase 4a: Home v1 content list (per IA decisions). The stub in Phase 2 is intentionally minimal.
- Phase 4h: Settings split — what moves to `/diagnostics` beyond the build SHA. The current Diagnostics page is a placeholder.

---

## Scope guard (read before starting)

This phase touches a lot of files. Discipline:
- Sheets get a MATERIAL re-skin — the `bg-card` → `gw-glass-strong` swap and corner-radius. Do NOT change any internal markup, buttons, layout grid, rate strip, RateDots/RateButtons, or any text inside sheets. Those are Phase 3.
- Graph internal UI (graph view, sequence mode, bubbles) is OUT OF SCOPE. Only the save-sheet panel.
- All page components other than Home/Diagnostics: zero touches.
- No new dependencies.
