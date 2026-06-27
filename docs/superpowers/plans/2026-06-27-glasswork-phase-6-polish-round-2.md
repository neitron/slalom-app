# Glasswork Phase 6 polish round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve Phase 6 polish round 2 (D–H) plus the previously-open Phase 4e (Transitions placement) and deferred Phase 4d (Sequences page). Unify the top-bar pattern across Tricks/Sequences, fold Transitions into Sequences as a sub-tab, redesign the Graph top bar around a View/Move switcher + Build FAB, and finish the SequenceSheet's Glasswork migration.

**Architecture:** Sequences page becomes umbrella with Sequences | Transitions sub-tabs. Top-bar wrapper migrates from `position: fixed` (drift-prone on iOS PWA) to `position: sticky` inside the page scroll container. Per-page primary actions live in FABs (Generate on Sequences page; Build on Graph). Per-sub-tab UI state (search/sort/filter) lives in `useUiStore` parallel to the existing Tricks block.

**Tech Stack:** Vue 3 + script setup + Pinia + vue-router (hash mode) + Tailwind + Glasswork tokens + `@tabler/icons-vue` (via `src/icons/`) + Vitest.

**Spec:** `spec/2026-06-27-glasswork-phase-6-polish-round-2-design.md`

---

## Task 0: Pre-flight

**Files:** none modified

- [ ] **Step 1: Verify baseline tests pass**

Run: `npm test`
Expected: 144 tests passing, no failures.

- [ ] **Step 2: Verify build is clean**

Run: `npm run build`
Expected: build completes with no type errors.

- [ ] **Step 3: Sanity-check we're on `main` at the expected HEAD**

Run: `git log -1 --oneline`
Expected: `6c25f9b Phase 6 polish round 2 (D–H + 4d + 4e) design spec` (or newer; just confirm spec is committed).

---

## Task 1: Add IconRoute + IconEdit to icons module

**Files:**
- Modify: `src/icons/index.ts`

- [ ] **Step 1: Add the two new named re-exports**

Edit `src/icons/index.ts` — insert into the alphabetized re-export block (after `IconPlus`, before `IconDice5`):

```ts
  IconPlus,
  IconPencil as IconEdit,
  IconRoute,
  IconDice5 as IconGenerate,
```

The final block reads (showing only changed region):

```ts
  IconCheck,
  IconPlus,
  IconPencil as IconEdit,
  IconRoute,
  IconDice5 as IconGenerate,
  IconFocusCentered as IconResetView,
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Verify the icons exist in Tabler**

Run: `node -e "const t = require('@tabler/icons-vue'); console.log(typeof t.IconRoute, typeof t.IconPencil);"`
Expected: `object object` (both defined).

If either is `undefined`, the Tabler version may differ — check `node_modules/@tabler/icons-vue/dist/index.js` to confirm the export name, and adjust the alias (e.g., `IconWriting as IconEdit` if `IconPencil` doesn't exist).

- [ ] **Step 4: Commit**

```bash
git add src/icons/index.ts
git commit -m "Phase 6 polish R2: add IconRoute + IconEdit to icons module

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Extend `useUiStore` with sub-tab and per-sub-tab state

**Files:**
- Modify: `src/stores/ui.ts`
- Create: `src/stores/__tests__/ui.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/ui.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '../ui'

describe('useUiStore — sequences/transitions sub-tab state (Phase 6 R2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults sub-tab to "sequences"', () => {
    const ui = useUiStore()
    expect(ui.sequencesSubTab).toBe('sequences')
  })

  it('setSequencesSubTab switches between sub-tabs', () => {
    const ui = useUiStore()
    ui.setSequencesSubTab('transitions')
    expect(ui.sequencesSubTab).toBe('transitions')
    ui.setSequencesSubTab('sequences')
    expect(ui.sequencesSubTab).toBe('sequences')
  })

  it('defaults sequences search/sort to empty/newest', () => {
    const ui = useUiStore()
    expect(ui.sequencesSearch).toBe('')
    expect(ui.sequencesSort).toBe('newest')
  })

  it('defaults transitions search/sort/category', () => {
    const ui = useUiStore()
    expect(ui.transitionsSearch).toBe('')
    expect(ui.transitionsSort).toBe('name')
    expect(ui.transitionsCategory).toBe('all')
  })

  it('setters update sequences fields', () => {
    const ui = useUiStore()
    ui.setSequencesSearch('warm')
    ui.setSequencesSort('best')
    expect(ui.sequencesSearch).toBe('warm')
    expect(ui.sequencesSort).toBe('best')
  })

  it('setters update transitions fields', () => {
    const ui = useUiStore()
    ui.setTransitionsSearch('cross')
    ui.setTransitionsSort('recent')
    ui.setTransitionsCategory('forward')
    expect(ui.transitionsSearch).toBe('cross')
    expect(ui.transitionsSort).toBe('recent')
    expect(ui.transitionsCategory).toBe('forward')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run src/stores/__tests__/ui.test.ts`
Expected: fail (`sequencesSubTab` is `undefined`).

- [ ] **Step 3: Add the new state and types to `useUiStore`**

Edit `src/stores/ui.ts`. Add the type at the top (after the existing `Tab` type):

```ts
export type SequencesSubTab = 'sequences' | 'transitions'
export type SequencesSortKey = 'newest' | 'best' | 'worst'
export type TransitionsSortKey = 'name' | 'best' | 'worst' | 'recent'
```

Add an import for `Category` (already imported — confirm) and update the import line if missing:

```ts
import type { Category, Side, Tier, TrickStatus } from '../domain/types';
```

In the `state` block, add the new fields (after `tricksSort`):

```ts
    tricksSort: 'name' as SortKey,
    // Phase 6 R2 — Sequences/Transitions sub-tab state
    sequencesSubTab: 'sequences' as SequencesSubTab,
    sequencesSearch: '',
    sequencesSort: 'newest' as SequencesSortKey,
    transitionsSearch: '',
    transitionsSort: 'name' as TransitionsSortKey,
    transitionsCategory: 'all' as Category | 'all',
    feedback: null as FeedbackReport | null,
```

In the `actions` block, add the corresponding setters (after `setTricksSort`):

```ts
    setTricksSort(v: SortKey): void {
      this.tricksSort = v;
    },
    setSequencesSubTab(v: SequencesSubTab): void {
      this.sequencesSubTab = v;
    },
    setSequencesSearch(v: string): void {
      this.sequencesSearch = v;
    },
    setSequencesSort(v: SequencesSortKey): void {
      this.sequencesSort = v;
    },
    setTransitionsSearch(v: string): void {
      this.transitionsSearch = v;
    },
    setTransitionsSort(v: TransitionsSortKey): void {
      this.transitionsSort = v;
    },
    setTransitionsCategory(v: Category | 'all'): void {
      this.transitionsCategory = v;
    },
    resetTricksFilters(): void {
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/stores/__tests__/ui.test.ts`
Expected: 6/6 pass.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: all tests pass (was 144, should now be 150 with new tests).

- [ ] **Step 6: Commit**

```bash
git add src/stores/ui.ts src/stores/__tests__/ui.test.ts
git commit -m "Phase 6 polish R2: useUiStore — sub-tab + per-sub-tab search/sort/filter state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Router — add `/sequences/transitions` + redirect `/transitions`

**Files:**
- Modify: `src/router.ts`

- [ ] **Step 1: Add the sub-tab route + redirect**

Edit `src/router.ts`. Replace the existing two route lines:

```ts
  { path: '/transitions', name: 'transitions', component: () => import('./pages/Transitions.vue') },
  { path: '/sequences', name: 'sequences', component: () => import('./pages/Sequences.vue') },
```

with:

```ts
  { path: '/sequences', name: 'sequences', component: () => import('./pages/Sequences.vue') },
  { path: '/sequences/transitions', name: 'sequences-transitions', component: () => import('./pages/Sequences.vue'), meta: { subTab: 'transitions' } },
  { path: '/transitions', name: 'transitions-legacy', redirect: '/sequences/transitions' },
```

Note: both `/sequences` and `/sequences/transitions` resolve to the same `Sequences.vue` component. The component reads `route.meta.subTab` to know which sub-tab to activate (else defaults to 'sequences').

- [ ] **Step 2: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Verify tests still pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/router.ts
git commit -m "Phase 6 polish R2: router — /sequences/transitions sub-route + /transitions redirect

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Tricks page — `position: fixed` → `position: sticky`

**Files:**
- Modify: `src/pages/Tricks.vue`

Goal: change positioning model without changing visuals. The sticky bar continues to hide on scroll-down via `transform`, but rides the page scroll container instead of anchoring to the visualViewport.

- [ ] **Step 1: Update the sticky-bar styles**

Edit `src/pages/Tricks.vue`. In the `<style scoped>` block at the bottom, replace:

```css
.sticky-bar {
  position: fixed;
  top: env(safe-area-inset-top);
  left: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  transition: transform 200ms ease;
}
.sticky-bar.hidden {
  transform: translateY(calc(-100% - 1rem));
}
```

with:

```css
.sticky-bar {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 20;
  transition: transform 200ms ease;
  margin: 0 0.75rem;
}
.sticky-bar.hidden {
  transform: translateY(calc(-100% - 1rem));
}
```

- [ ] **Step 2: Remove the now-unneeded top-padding spacer**

Find and remove the spacer in the template (currently inside `.page-scroll`):

```html
      <!-- spacer so content begins below the sticky bar on initial paint -->
      <div aria-hidden="true" style="height: 72px;" />
```

Remove the entire `<div aria-hidden="true" style="height: 72px;" />` line plus the comment above it. Sticky elements occupy normal flow, so no spacer is needed.

- [ ] **Step 3: Move the sticky-bar inside `.page-scroll`**

The sticky bar must be the first child of the scrolling container, not a sibling. Currently the template structure is:

```html
<div class="page-shell">
  <div class="page-aurora ..." />
  <div class="sticky-bar" :class="{ hidden: stickyHidden }">  ← outside .page-scroll
    ...
  </div>
  <div class="page-scroll p-3 ...">
    ...
  </div>
</div>
```

Change it to:

```html
<div class="page-shell">
  <div class="page-aurora ..." />
  <div class="page-scroll p-3 flex flex-col gap-3">
    <div class="sticky-bar" :class="{ hidden: stickyHidden }">
      <div class="gw-glass px-3 py-2 flex items-center gap-2"
           :style="{ borderRadius: 'var(--radius-g-panel)' }">
        ... (search input, sort button, filter button) ...
      </div>
    </div>

    <!-- chips + list (no spacer) -->
    ...
  </div>
</div>
```

Also remove `style="padding-top: 0;"` from `.page-scroll` since the spacer is gone.

- [ ] **Step 4: Verify `useScrollDirection` still works**

Currently `useScrollDirection` watches `window.scroll`. After moving the sticky bar into `.page-scroll`, scroll events may now fire on that container instead of `window`. Verify by reading the component.

If scroll behavior is broken (sticky bar never hides), update the `useScrollDirection({ threshold: 8 })` call to pass the scroll container as `target`. Get a ref to `.page-scroll`:

```ts
const pageScrollRef = ref<HTMLElement | null>(null)
// ...
const { hidden: stickyHidden } = useScrollDirection({
  target: pageScrollRef.value as unknown as Window | undefined,
  threshold: 8,
})
```

And add `ref="pageScrollRef"` to the `.page-scroll` div. Note: this requires waiting for the ref to be assigned — wrap in `onMounted` or use a watcher. If `Home.vue` (uses `body` scroll) works fine with `window`, we may not need this change — confirm during testing.

Recommendation: do a smoke-test first with the simple sticky change; only thread the ref if behavior is broken.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Open: http://localhost:5173 in browser
Steps:
1. Navigate to /tricks
2. Scroll down — sticky bar should slide up out of view
3. Scroll up — sticky bar should slide back into view
4. Search input + sort cycle + filter button work as before

If broken: re-examine which scroll source `useScrollDirection` is watching.

- [ ] **Step 6: Run tests + build**

Run: `npm test && npm run build`
Expected: all tests pass, build clean.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Tricks.vue
git commit -m "Phase 6 polish R2: Tricks — sticky-bar position fixed → sticky

Removes the iOS PWA visualViewport drift surface for the search bar
position (focused-input drift still happens, separate issue). Drops
the now-unneeded top-padding spacer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Extract `TransitionsList` component from `Transitions.vue`

**Files:**
- Create: `src/components/TransitionsList.vue`

Goal: pull the transitions row-rendering logic into a reusable component so the Sequences page can embed it inside the Transitions sub-tab.

- [ ] **Step 1: Create `src/components/TransitionsList.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useUiStore } from '../stores/ui'
import type { Category, Transition, Trick } from '../domain/types'
import TransitionCard from './TransitionCard.vue'

const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const uiStore = useUiStore()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  if (!transitionsStore.loaded) void transitionsStore.load()
})

type Row = { edge: Transition; from: Trick; to: Trick }

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const edge of transitionsStore.edges) {
    const from = tricksStore.byId(edge.from)
    const to = tricksStore.byId(edge.to)
    if (!from || !to) continue
    out.push({ edge, from, to })
  }
  return out
})

const filtered = computed<Row[]>(() => {
  const q = uiStore.transitionsSearch.trim().toLowerCase()
  let list = rows.value
  const cat = uiStore.transitionsCategory
  if (cat !== 'all') {
    list = list.filter((r) => r.from.category === cat || r.to.category === cat)
  }
  if (q) {
    list = list.filter(
      (r) => r.from.name.toLowerCase().includes(q) || r.to.name.toLowerCase().includes(q),
    )
  }
  const arr = list.slice()
  const sort = uiStore.transitionsSort
  if (sort === 'name') {
    arr.sort((a, b) =>
      a.from.name.localeCompare(b.from.name) || a.to.name.localeCompare(b.to.name),
    )
  } else if (sort === 'best') {
    arr.sort(
      (a, b) =>
        (b.edge.rate ?? -1) - (a.edge.rate ?? -1) ||
        a.from.name.localeCompare(b.from.name),
    )
  } else if (sort === 'worst') {
    arr.sort((a, b) => {
      const ar = a.edge.rate
      const br = b.edge.rate
      if (ar == null && br == null) return a.from.name.localeCompare(b.from.name)
      if (ar == null) return 1
      if (br == null) return -1
      return ar - br || a.from.name.localeCompare(b.from.name)
    })
  } else {
    arr.sort((a, b) => {
      const al = a.edge.last ?? ''
      const bl = b.edge.last ?? ''
      if (!al && !bl) return a.from.name.localeCompare(b.from.name)
      if (!al) return 1
      if (!bl) return -1
      return bl.localeCompare(al)
    })
  }
  return arr
})

function onOpen(id: string) {
  uiStore.openTransition(id)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="text-muted text-xs">{{ filtered.length }} transitions</div>

    <div
      v-if="!transitionsStore.loaded || !tricksStore.loaded"
      class="text-muted text-sm py-8 text-center"
    >Loading…</div>

    <div
      v-else-if="!filtered.length"
      class="text-muted text-sm py-8 text-center"
    >No transitions match.</div>

    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      <TransitionCard
        v-for="r in filtered"
        :key="r.edge.id"
        :edge="r.edge"
        :from-trick="r.from"
        :to-trick="r.to"
        @open="onOpen"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TransitionsList.vue
git commit -m "Phase 6 polish R2: extract TransitionsList component

Reads filter/sort state from useUiStore (transitionsSearch / transitionsSort /
transitionsCategory) instead of local refs. Prepares for embedding inside
the Sequences page Transitions sub-tab.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Create `TransitionsFilterSheet` component

**Files:**
- Create: `src/components/TransitionsFilterSheet.vue`

- [ ] **Step 1: Create the filter sheet**

Mirrors `TricksFilterSheet.vue` structure but only has a Category section. Create `src/components/TransitionsFilterSheet.vue`:

```vue
<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useUiStore } from '../stores/ui'
import { CATEGORIES } from '../domain/constants'
import type { Category } from '../domain/types'
import ChipFilter, { type ChipOption } from './ChipFilter.vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import { IconClose } from '../icons'

type Props = { visible: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const ui = useUiStore()
const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let active = false
let suppressDrag = false
const CLOSE_THRESHOLD = 100

const FORM_CONTROL_SELECTOR = 'input, select, textarea, [role="slider"]'
function isOnFormControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(FORM_CONTROL_SELECTOR) != null
}
function onTouchStart(e: TouchEvent) {
  suppressDrag = isOnFormControl(e.target)
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}
function onTouchMove(e: TouchEvent) {
  if (suppressDrag) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0) return
  active = true
  dragging.value = true
  dragY.value = dy
}
function onTouchEnd() {
  dragging.value = false
  if (!active) { dragY.value = 0; return }
  if (dragY.value > CLOSE_THRESHOLD) emit('close')
  else dragY.value = 0
}
watch(() => props.visible, (v) => { if (v) dragY.value = 0 })
useBodyScrollLock(toRef(props, 'visible'))

const categoryOptions = computed<ChipOption[]>(() => {
  const opts: ChipOption[] = [{ value: 'all', label: 'all' }]
  for (const c of CATEGORIES) opts.push({ value: c, label: c })
  return opts
})

function setCategory(v: string | string[]) {
  ui.setTransitionsCategory(v as Category | 'all')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[60] flex items-end"
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
        class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[80dvh] overflow-y-auto"
        :style="{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
          borderTopLeftRadius: 'var(--radius-g-panel)',
          borderTopRightRadius: 'var(--radius-g-panel)',
        }"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <div class="flex justify-center pb-2 -mt-1">
          <div class="w-10 h-1 rounded-full bg-border-2" />
        </div>

        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-semibold flex-1">Filter transitions</h2>
          <button
            type="button"
            class="p-1 text-muted hover:text-fg"
            aria-label="Close"
            @click="emit('close')"
          ><IconClose :size="18" stroke="1.75" /></button>
        </div>

        <section class="mt-2">
          <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Category</h3>
          <ChipFilter
            :options="categoryOptions"
            :model-value="ui.transitionsCategory"
            @update:model-value="setCategory"
          />
        </section>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TransitionsFilterSheet.vue
git commit -m "Phase 6 polish R2: TransitionsFilterSheet component

Mirrors TricksFilterSheet shape; only has the Category section.
Reads/writes uiStore.transitionsCategory.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Sequences page — full rewrite (umbrella + sub-tabs + top bar + FAB)

**Files:**
- Modify: `src/pages/Sequences.vue` (full rewrite)

- [ ] **Step 1: Rewrite `src/pages/Sequences.vue`**

Replace the entire file with:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useSequencesStore } from '../stores/sequences'
import type { Sequence } from '../domain/types'
import { useUiStore, type SequencesSubTab, type SequencesSortKey, type TransitionsSortKey } from '../stores/ui'
import SequenceCard from '../components/SequenceCard.vue'
import GeneratorSheet from '../components/GeneratorSheet.vue'
import TransitionsList from '../components/TransitionsList.vue'
import TransitionsFilterSheet from '../components/TransitionsFilterSheet.vue'
import { useScrollDirection } from '../composables/useScrollDirection'
import { IconSearch, IconFilter, IconGenerate } from '../icons'

const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const generatorOpen = ref(false)
const transitionsFilterOpen = ref(false)

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  if (!transitionsStore.loaded) void transitionsStore.load()
  if (!sequencesStore.loaded) void sequencesStore.load()
  syncSubTabFromRoute()
})

watch(() => route.meta.subTab, () => syncSubTabFromRoute())

function syncSubTabFromRoute() {
  const meta = route.meta.subTab as SequencesSubTab | undefined
  ui.setSequencesSubTab(meta === 'transitions' ? 'transitions' : 'sequences')
}

function switchSubTab(tab: SequencesSubTab) {
  ui.setSequencesSubTab(tab)
  const target = tab === 'transitions' ? '/sequences/transitions' : '/sequences'
  if (route.path !== target) void router.replace(target)
}

// Sort cycle — different per sub-tab
const SEQ_SORT_CYCLE: SequencesSortKey[] = ['newest', 'best', 'worst']
const SEQ_SORT_LABEL: Record<SequencesSortKey, string> = { newest: 'Newest', best: 'Best', worst: 'Worst' }
const TRA_SORT_CYCLE: TransitionsSortKey[] = ['name', 'best', 'worst', 'recent']
const TRA_SORT_LABEL: Record<TransitionsSortKey, string> = { name: 'Name', best: 'Best', worst: 'Worst', recent: 'Recent' }

const sortLabel = computed(() =>
  ui.sequencesSubTab === 'sequences'
    ? SEQ_SORT_LABEL[ui.sequencesSort]
    : TRA_SORT_LABEL[ui.transitionsSort],
)

function cycleSort() {
  if (ui.sequencesSubTab === 'sequences') {
    const i = SEQ_SORT_CYCLE.indexOf(ui.sequencesSort)
    ui.setSequencesSort(SEQ_SORT_CYCLE[(i + 1) % SEQ_SORT_CYCLE.length])
  } else {
    const i = TRA_SORT_CYCLE.indexOf(ui.transitionsSort)
    ui.setTransitionsSort(TRA_SORT_CYCLE[(i + 1) % TRA_SORT_CYCLE.length])
  }
}

const searchValue = computed(() =>
  ui.sequencesSubTab === 'sequences' ? ui.sequencesSearch : ui.transitionsSearch,
)
function setSearch(v: string) {
  if (ui.sequencesSubTab === 'sequences') ui.setSequencesSearch(v)
  else ui.setTransitionsSearch(v)
}

const filterCount = computed(() => {
  if (ui.sequencesSubTab === 'sequences') return 0
  return ui.transitionsCategory !== 'all' ? 1 : 0
})

const showFilterButton = computed(() => ui.sequencesSubTab === 'transitions')

const sequences = computed<Sequence[]>(() => {
  const all = sequencesStore.sortedBy(ui.sequencesSort)
  const q = ui.sequencesSearch.trim().toLowerCase()
  if (!q) return all
  return all.filter((s) => s.name.toLowerCase().includes(q))
})

async function onSave(seq: Omit<Sequence, 'id' | 'created'>): Promise<void> {
  await sequencesStore.create({ name: seq.name, steps: seq.steps })
  generatorOpen.value = false
}
async function onReport(id: string, score: number): Promise<void> {
  await sequencesStore.report(id, score)
}
async function onRemove(id: string): Promise<void> {
  await sequencesStore.remove(id)
}

const { hidden: stickyHidden } = useScrollDirection({ threshold: 8 })
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />

    <div class="page-scroll p-3 flex flex-col gap-3">
      <!-- Sticky top bar: row 1 (collapsible) + row 2 (pinned sub-tabs) -->
      <div class="sticky-bar">
        <div class="gw-glass" :style="{ borderRadius: 'var(--radius-g-panel)', padding: '8px 12px' }">
          <!-- Row 1: search + sort + filter (collapsible) -->
          <div class="search-row flex items-center gap-2" :class="{ collapsed: stickyHidden }">
            <label class="flex-1 min-w-0 flex items-center gap-2 px-3 py-2"
                   :style="{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-g-chip)' }">
              <IconSearch :size="16" stroke="1.75" :style="{ color: 'var(--color-g-fg-muted)' }" aria-hidden="true" />
              <input
                :value="searchValue"
                type="search"
                placeholder="Search…"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                class="flex-1 min-w-0 bg-transparent outline-none"
                :style="{ color: 'var(--color-g-fg)', fontSize: 'var(--text-g-body)' }"
                @input="setSearch(($event.target as HTMLInputElement).value)"
              >
            </label>
            <button
              type="button"
              class="shrink-0 px-3 py-2 active:scale-95 transition-transform gw-glass-strong"
              :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
              @click="cycleSort"
            >{{ sortLabel }}</button>
            <button
              v-if="showFilterButton"
              type="button"
              class="shrink-0 relative w-9 h-9 grid place-items-center active:scale-95 transition-transform gw-glass-strong"
              :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
              aria-label="Open filters"
              @click="transitionsFilterOpen = true"
            >
              <IconFilter :size="16" stroke="1.75" aria-hidden="true" />
              <span
                v-if="filterCount > 0"
                class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full font-semibold"
                :style="{ background: 'var(--color-g-brand)', color: 'var(--color-g-base)', fontSize: '10px' }"
              >{{ filterCount }}</span>
            </button>
          </div>

          <!-- Row 2: sub-tabs (always pinned) -->
          <div class="flex flex-wrap gap-1 pt-2">
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :style="ui.sequencesSubTab === 'sequences'
                ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }"
              @click="switchSubTab('sequences')"
            >Sequences</button>
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :style="ui.sequencesSubTab === 'transitions'
                ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }"
              @click="switchSubTab('transitions')"
            >Transitions</button>
          </div>
        </div>
      </div>

      <!-- Sub-tab content -->
      <template v-if="ui.sequencesSubTab === 'sequences'">
        <div
          v-if="!sequencesStore.loaded"
          class="text-muted text-sm py-8 text-center"
        >Loading…</div>
        <div
          v-else-if="!sequences.length"
          class="text-muted text-sm py-8 text-center"
        >No sequences yet — tap <strong>Generate</strong> to build one.</div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <SequenceCard
            v-for="s in sequences"
            :key="s.id"
            :sequence="s"
            @report="onReport"
            @remove="onRemove"
            @open="ui.openSequence($event)"
          />
        </div>
      </template>

      <template v-else>
        <TransitionsList />
      </template>
    </div>

    <!-- FAB: visible only on Sequences sub-tab -->
    <button
      v-if="ui.sequencesSubTab === 'sequences'"
      type="button"
      class="fab"
      aria-label="Generate sequence"
      @click="generatorOpen = true"
    ><IconGenerate :size="22" stroke="1.75" /></button>

    <GeneratorSheet
      :visible="generatorOpen"
      @close="generatorOpen = false"
      @save="onSave"
    />

    <TransitionsFilterSheet
      :visible="transitionsFilterOpen"
      @close="transitionsFilterOpen = false"
    />
  </div>
</template>

<style scoped>
.page-shell { position: relative; }
.page-aurora {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.page-scroll { position: relative; z-index: 1; }

.sticky-bar {
  position: sticky;
  top: env(safe-area-inset-top);
  z-index: 20;
}

.search-row {
  max-height: 80px;
  overflow: hidden;
  opacity: 1;
  transition: max-height 200ms ease, opacity 200ms ease;
}
.search-row.collapsed {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}

.fab {
  position: fixed;
  right: 1rem;
  bottom: calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-g-brand);
  color: var(--color-g-base);
  display: grid;
  place-items: center;
  box-shadow: 0 6px 20px rgba(110, 231, 183, 0.45), 0 0 0 1px rgba(110, 231, 183, 0.3);
  z-index: 30;
  transition: transform 150ms ease;
}
.fab:active {
  transform: scale(0.95);
}
</style>
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Steps:
1. Navigate to /sequences — sub-tab "Sequences" active, FAB visible bottom-right
2. Tap FAB — GeneratorSheet opens
3. Tap "Transitions" sub-tab — switches view, FAB hides, filter button appears, URL becomes /#/sequences/transitions
4. Tap filter button — TransitionsFilterSheet opens, pick a Category, close — list filters
5. Tap "Sequences" sub-tab — URL returns to /#/sequences, sequences list reappears
6. Direct-load /#/sequences/transitions — Transitions sub-tab is active
7. Direct-load /#/transitions (legacy) — redirects to /#/sequences/transitions
8. Scroll page — search row collapses; sub-tab row stays pinned
9. Scroll up — search row reappears

- [ ] **Step 4: Run tests + build**

Run: `npm test && npm run build`
Expected: all tests pass, build clean.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Sequences.vue
git commit -m "Phase 6 polish R2: Sequences page — umbrella + sub-tabs + FAB

Sequences page becomes the umbrella for two sub-tabs (Sequences |
Transitions). Unified top bar: search + sort cycle + filter (collapsible);
sub-tab strip (pinned). Generate FAB visible on Sequences sub-tab,
hidden on Transitions. Sub-tab persisted in URL via /sequences and
/sequences/transitions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Retire `Transitions.vue` (standalone page is unreachable)

**Files:**
- Delete: `src/pages/Transitions.vue`

The legacy `/transitions` route already redirects (Task 3, no component import). The page's content lives in `TransitionsList.vue` (Task 5) and is embedded in `Sequences.vue` (Task 7). The standalone page is dead code.

- [ ] **Step 1: Confirm `Transitions.vue` is not referenced anywhere**

Run: `grep -rn 'pages/Transitions' src/`
Expected: no matches.

- [ ] **Step 2: Delete the file (stages the removal at the same time)**

Run: `git rm src/pages/Transitions.vue`
Expected: `rm 'src/pages/Transitions.vue'` and the file is staged for commit.

- [ ] **Step 3: Run tests + build**

Run: `npm test && npm run build`
Expected: all tests pass, build clean (no stale imports).

- [ ] **Step 4: Commit**

```bash
git commit -m "Phase 6 polish R2: retire standalone Transitions.vue

/transitions now redirects to /sequences/transitions (handled by Sequences
page via TransitionsList component). Standalone page is dead code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Graph page — top bar = View/Move segmented switcher (drop other items)

**Files:**
- Modify: `src/pages/Graph.vue`

- [ ] **Step 1: Replace the top-bar block**

Edit `src/pages/Graph.vue`. Find:

```html
    <div class="flex items-center gap-2 px-3 pt-2 pb-2 shrink-0">
      <h1 class="text-lg font-semibold flex-1">Graph</h1>
      <RouterLink
        to="/transitions"
        class="..."
      ><IconTransition :size="16" stroke="1.75" /> Transitions</RouterLink>
      <button
        type="button"
        class="..."
        :aria-pressed="moveMode"
        @click="moveMode = !moveMode"
      ><IconMoveMode :size="14" stroke="1.75" /> Move</button>
      <button
        type="button"
        class="..."
        @click="sequenceMode ? cancelSequenceMode() : startSequenceMode()"
      >⛓ Sequence</button>
    </div>
```

Replace with:

```html
    <div class="flex items-center justify-center px-3 pt-2 pb-2 shrink-0">
      <div
        v-if="!sequenceMode"
        class="inline-flex gap-0.5 p-1 gw-glass-strong"
        role="tablist"
        aria-label="Graph mode"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="!moveMode"
          class="px-3 py-1 transition-colors"
          :style="!moveMode
            ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'calc(var(--radius-g-chip) - 4px)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
            : { color: 'var(--color-g-fg-muted)', borderRadius: 'calc(var(--radius-g-chip) - 4px)', fontSize: 'var(--text-g-micro)' }"
          @click="moveMode = false"
        >View</button>
        <button
          type="button"
          role="tab"
          :aria-selected="moveMode"
          class="px-3 py-1 transition-colors flex items-center gap-1"
          :style="moveMode
            ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'calc(var(--radius-g-chip) - 4px)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
            : { color: 'var(--color-g-fg-muted)', borderRadius: 'calc(var(--radius-g-chip) - 4px)', fontSize: 'var(--text-g-micro)' }"
          @click="moveMode = true"
        ><IconMoveMode :size="14" stroke="1.75" /> Move</button>
      </div>
    </div>
```

Also update the script imports — remove `IconTransition` (no longer used here):

```ts
import { IconClose, IconMoveMode } from '../icons'
```

(was `import { IconClose, IconTransition, IconMoveMode } from '../icons'`)

- [ ] **Step 2: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Navigate: /graph
Verify: top bar shows only a centered View/Move segmented switcher. No "Graph" h1, no Transitions link, no Sequence button. View ↔ Move toggling works (drag-to-move only when Move active — existing behavior). When entering sequence-mode (will be wired in Task 10), the switcher disappears.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Graph.vue
git commit -m "Phase 6 polish R2: Graph top bar = centered View/Move switcher

Drops 'Graph' h1, Transitions link (now sub-tab inside Sequences),
⛓ Sequence button (becomes FAB in next task). View/Move is a 2-way
segmented control bound to existing moveMode ref. Hidden during
sequence-mode.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Graph page — add Build FAB

**Files:**
- Modify: `src/pages/Graph.vue`

- [ ] **Step 1: Import `IconRoute`**

Edit the import line at the top of `<script setup>`:

```ts
import { IconClose, IconMoveMode, IconRoute } from '../icons'
```

- [ ] **Step 2: Add the FAB markup**

In `src/pages/Graph.vue`, find the outer wrapper div (with `flex flex-col min-h-0`) and add the FAB as a sibling of the existing `<GraphView>`, after `</div>` of the `.flex-1.min-h-0.relative` graph-area block but inside the page wrapper. Concretely, find:

```html
    <div class="flex-1 min-h-0 relative">
      <GraphView ... />
    </div>
```

Immediately after that closing `</div>`, add:

```html
    <button
      v-if="!sequenceMode"
      type="button"
      class="fab"
      aria-label="Build sequence"
      @click="startSequenceMode"
    ><IconRoute :size="22" stroke="1.75" /></button>
```

- [ ] **Step 3: Add the FAB style**

At the bottom of the file (the file currently has no `<style scoped>` block — add one):

```vue
<style scoped>
.fab {
  position: fixed;
  right: 1rem;
  bottom: calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-g-brand);
  color: var(--color-g-base);
  display: grid;
  place-items: center;
  box-shadow: 0 6px 20px rgba(110, 231, 183, 0.45), 0 0 0 1px rgba(110, 231, 183, 0.3);
  z-index: 30;
  transition: transform 150ms ease;
}
.fab:active {
  transform: scale(0.95);
}
</style>
```

- [ ] **Step 4: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Navigate: /graph
Verify:
1. FAB visible bottom-right above TabBar, with IconRoute glyph.
2. Tap FAB → enters sequence-mode → FAB hides, View/Move switcher hides, sequence-mode bubble appears.
3. Tap Cancel in bubble → exits sequence-mode → FAB returns, switcher returns.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Graph.vue
git commit -m "Phase 6 polish R2: Graph — Build sequence FAB

FAB bottom-right above TabBar with IconRoute glyph. Tap enters
sequence-mode (existing startSequenceMode behavior). FAB hidden during
sequence-mode (the bubble handles the build UI).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Graph — sequence-mode bubble min-width + empty hint

**Files:**
- Modify: `src/pages/Graph.vue`

- [ ] **Step 1: Update bubble styles + empty state markup**

Edit the bubble block in `src/pages/Graph.vue`. Find:

```html
    <div
      v-if="sequenceMode"
      class="fixed z-40 gw-glass-strong"
      :style="{
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        maxWidth: 'min(calc(100vw - 1.5rem), 420px)',
        width: 'max-content',
        bottom: 'calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 0.5rem + 0.5rem)',
        borderRadius: 'var(--radius-g-panel)',
        padding: '12px 14px',
      }"
    >
      <div class="mb-2 min-h-[1.5rem]">
        <SequenceChain
          v-if="sequenceSteps.length"
          :steps="chainSteps"
        />
        <div
          v-else
          :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
        >Tap tricks on the graph to build a sequence.</div>
      </div>
      ...
```

Replace the wrapper `:style` and the empty-state inner div:

```html
    <div
      v-if="sequenceMode"
      class="fixed z-40 gw-glass-strong"
      :style="{
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        maxWidth: 'min(calc(100vw - 1.5rem), 420px)',
        minWidth: 'min(280px, calc(100vw - 1.5rem))',
        width: 'max-content',
        bottom: 'calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 0.5rem + 0.5rem)',
        borderRadius: 'var(--radius-g-panel)',
        padding: '12px 14px',
      }"
    >
      <div class="mb-2 min-h-[1.5rem]">
        <SequenceChain
          v-if="sequenceSteps.length"
          :steps="chainSteps"
        />
        <div
          v-else
          class="text-center"
          :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
        >Tap tricks on the graph to build a sequence</div>
      </div>
      ...
```

Two changes: added `minWidth: 'min(280px, calc(100vw - 1.5rem))'`, and added `class="text-center"` to the placeholder div (so the hint text centers within the now-wider bubble).

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`
Navigate: /graph
Steps:
1. Tap Build FAB — bubble appears at min-width ~280px (not "broken-looking tiny").
2. Empty state: hint text centered; Undo disabled (40% opacity); Cancel active; Save disabled (40% opacity).
3. Tap one node — chain shows one step; Undo enabled; Cancel enabled; Save still disabled.
4. Tap second node — chain shows two steps; Save enabled.
5. Tap Cancel — exits sequence-mode; FAB returns.

- [ ] **Step 3: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass, build clean.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Graph.vue
git commit -m "Phase 6 polish R2: sequence-mode bubble — min-width 280px + centered hint

Fixes 'broken-looking tiny' empty state. Bubble has presence regardless
of step count; Undo/Save remain disabled until ≥1 / ≥2 steps; Cancel
always works.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: GraphView — reposition zoom cluster to bottom-LEFT

**Files:**
- Modify: `src/components/GraphView.vue`

- [ ] **Step 1: Move the zoom-cluster container**

Edit `src/components/GraphView.vue`. Find the zoom-cluster block (around line 1060):

```html
    <div
      class="absolute right-3 flex flex-col gap-1.5"
      :style="{
        bottom: 'calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem)',
      }"
    >
```

Change `right-3` to `left-3`:

```html
    <div
      class="absolute left-3 flex flex-col gap-1.5"
      :style="{
        bottom: 'calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem)',
      }"
    >
```

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`
Navigate: /graph
Verify: `+`, `−`, `⌂` buttons are stacked vertically in the bottom-LEFT of the graph viewport. Build FAB is in the bottom-RIGHT — no overlap.

Test all three buttons still work (zoom in / out / reset).

- [ ] **Step 3: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/GraphView.vue
git commit -m "Phase 6 polish R2: GraphView — zoom cluster right → left

Frees bottom-right for the Build FAB. No other behavior change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: SequenceSheet — header IconRoute + rename IconEdit

**Files:**
- Modify: `src/components/SequenceSheet.vue`

- [ ] **Step 1: Update imports**

In `src/components/SequenceSheet.vue`, find:

```ts
import { IconClose } from '../icons'
```

Replace with:

```ts
import { IconClose, IconEdit, IconRoute } from '../icons'
```

- [ ] **Step 2: Replace the 🔗 unicode header glyph**

Find:

```html
      <div class="flex items-center gap-2">
        <span class="text-xl leading-none">🔗</span>
```

Replace with:

```html
      <div class="flex items-center gap-2">
        <IconRoute :size="20" stroke="1.75" :style="{ color: 'var(--color-g-fg)' }" aria-hidden="true" />
```

- [ ] **Step 3: Replace the ✎ rename button glyph**

Find:

```html
          <button
            type="button"
            class="p-1 text-muted hover:text-fg"
            aria-label="Rename"
            @click="startEditName"
          >✎</button>
```

Replace with:

```html
          <button
            type="button"
            class="p-1 text-muted hover:text-fg"
            aria-label="Rename"
            @click="startEditName"
          ><IconEdit :size="14" stroke="1.75" /></button>
```

- [ ] **Step 4: Confirm no remaining unicode UI affordances in the file**

Run: `grep -n '🔗\|✎' src/components/SequenceSheet.vue`
Expected: no output.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Open any sequence to display the sheet.
Verify:
1. Header shows IconRoute glyph (route icon) instead of 🔗 emoji.
2. Tap rename pencil — shows IconEdit glyph; clicking it enters rename mode as before.

- [ ] **Step 6: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/SequenceSheet.vue
git commit -m "Phase 6 polish R2: SequenceSheet — 🔗 → IconRoute, ✎ → IconEdit

Phase 6 sweep miss caught in polish round 2. Both glyphs now from the
Tabler set via the semantic re-export module.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: SequenceSheet — step rows tappable + Glasswork chrome + Leg icons

**Files:**
- Modify: `src/components/SequenceSheet.vue`

- [ ] **Step 1: Add Leg icon imports**

Edit the import line at the top:

```ts
import { IconClose, IconEdit, IconRoute, LegL, LegR, LegNone } from '../icons'
```

- [ ] **Step 2: Rewrite the Steps section**

In `src/components/SequenceSheet.vue`, find the existing Steps section:

```html
      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Steps</h3>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="step in stepViews"
            :key="step.key"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card-2 border border-border-2"
          >
            <span
              v-if="step.icon"
              class="text-base leading-none"
            >{{ step.icon }}</span>
            <span class="flex-1 text-sm text-fg truncate">{{ step.name }}</span>
            <span
              class="font-bold text-[11px] w-3 text-center"
              :style="{ color: sideColor(step.side) }"
            >{{ step.side ?? '·' }}</span>
            <button
              type="button"
              class="shrink-0 px-2 py-0.5 rounded border border-border-2 text-[11px] text-muted hover:text-fg hover:border-accent"
              @click="openTrick(step.trickId)"
            >Open</button>
          </li>
          <li
            v-if="!stepViews.length"
            class="text-xs text-muted"
          >No steps</li>
        </ul>
      </section>
```

Replace with:

```html
      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Steps</h3>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="step in stepViews"
            :key="step.key"
          >
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 gw-glass-strong active:opacity-80 transition-opacity text-left"
              :style="{ borderRadius: 'var(--radius-g-chip)' }"
              @click="openTrick(step.trickId)"
            >
              <span
                v-if="step.icon"
                class="text-base leading-none shrink-0"
              >{{ step.icon }}</span>
              <span class="flex-1 text-sm text-fg truncate">{{ step.name }}</span>
              <LegL v-if="step.side === 'L'" :size="14" />
              <LegR v-else-if="step.side === 'R'" :size="14" />
              <LegNone v-else :size="14" />
            </button>
          </li>
          <li
            v-if="!stepViews.length"
            class="text-xs text-muted"
          >No steps</li>
        </ul>
      </section>
```

This drops:
- The explicit `<button>Open</button>` (whole row tappable now).
- The `bg-card-2 border border-border-2` chrome (replaced with `gw-glass-strong` + chip radius).
- The raw `step.side` text and `sideColor()` styling (replaced with Leg* icon components).

- [ ] **Step 3: Remove the now-unused `sideColor` helper**

Find:

```ts
function sideColor(s: Side): string {
  if (s === 'L') return 'var(--side-l)'
  if (s === 'R') return 'var(--side-r)'
  return 'var(--side-none)'
}
```

Remove the function. Confirm with: `grep -n "sideColor" src/components/SequenceSheet.vue` — should return no matches.

- [ ] **Step 4: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors. If `Side` import is now unused, remove it from the import line.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Open a sequence sheet that has steps.
Verify:
1. Step rows have gw-glass chrome (not pre-Glasswork card-2 chrome).
2. Tapping anywhere on a step row opens that trick's sheet (no explicit Open button).
3. L steps show LegL glyph, R steps show LegR glyph, null-side steps show LegNone.

- [ ] **Step 6: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/SequenceSheet.vue
git commit -m "Phase 6 polish R2: SequenceSheet — step rows tappable + Glasswork chrome

Whole row tappable (drops explicit Open button). bg-card-2/border-border-2
→ gw-glass-strong + chip radius. Raw L/R/· text → LegL/LegR/LegNone icon
components. Removes now-unused sideColor() helper.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: SequenceSheet — name-edit + Delete chrome migration

**Files:**
- Modify: `src/components/SequenceSheet.vue`

- [ ] **Step 1: Migrate the name-edit input + buttons**

Find:

```html
        <template v-else>
          <input
            ref="nameInputRef"
            v-model="nameDraft"
            type="text"
            class="flex-1 px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
            @keydown.enter.prevent="commitName"
            @keydown.escape.prevent="cancelEditName"
            @blur="commitName"
          >
          <button
            type="button"
            class="px-2.5 py-1.5 rounded bg-accent text-bg text-xs font-semibold"
            @mousedown.prevent="commitName"
          >Save</button>
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-border-2 text-muted text-xs"
            @mousedown.prevent="cancelEditName"
          >Cancel</button>
        </template>
```

Replace with:

```html
        <template v-else>
          <input
            ref="nameInputRef"
            v-model="nameDraft"
            type="text"
            class="flex-1 px-3 py-2 text-sm outline-none"
            :style="{
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--color-g-fg)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            @keydown.enter.prevent="commitName"
            @keydown.escape.prevent="cancelEditName"
            @blur="commitName"
          >
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold"
            :style="{
              background: 'var(--color-g-brand)',
              color: 'var(--color-g-base)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            @mousedown.prevent="commitName"
          >Save</button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs gw-glass-strong"
            :style="{
              color: 'var(--color-g-fg-muted)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            @mousedown.prevent="cancelEditName"
          >Cancel</button>
        </template>
```

- [ ] **Step 2: Migrate the Delete button**

Find:

```html
      <section class="mt-5 pt-3 border-t border-border">
        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="removeArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-border-2 text-muted hover:text-danger'"
          @click="armRemove"
        >{{ removeArmed ? 'Tap again to confirm delete' : 'Delete sequence' }}</button>
      </section>
```

Replace with:

```html
      <section class="mt-5 pt-3 border-t border-border">
        <button
          type="button"
          class="w-full py-2 text-sm transition-colors"
          :class="removeArmed ? 'font-semibold' : 'gw-glass-strong'"
          :style="removeArmed
            ? { background: 'var(--color-g-danger)', color: 'var(--color-g-fg)', borderRadius: 'var(--radius-g-chip)' }
            : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
          @click="armRemove"
        >{{ removeArmed ? 'Tap again to confirm delete' : 'Delete sequence' }}</button>
      </section>
```

- [ ] **Step 3: Verify type-check passes**

Run: `npx vue-tsc -b --noEmit`
Expected: no type errors.

- [ ] **Step 4: Manual smoke test**

Open a sequence sheet.
Verify:
1. Tap rename pencil — input + Save + Cancel render with Glasswork chrome (no bg-card-2 / border-border-2). Rename still saves on Enter / blur, cancels on Escape.
2. Delete button — Glasswork-styled. Two-tap arm: first tap arms (red), second tap confirms delete. Auto-disarm after 3s still works.

- [ ] **Step 5: Run tests + build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/SequenceSheet.vue
git commit -m "Phase 6 polish R2: SequenceSheet — name-edit + Delete Glasswork chrome

bg-card-2/border-border-2 → gw-glass + brand/danger/muted tokens. Save
button uses brand fill matching TrickSheet pattern; Cancel uses gw-glass;
Delete uses gw-glass at rest and danger fill when armed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Verification + SESSION-HANDOFF update

**Files:**
- Modify: `spec/SESSION-HANDOFF.md`

- [ ] **Step 1: Full test suite + build**

Run: `npm test && npm run build`
Expected: all tests pass (≥150 — the 144 baseline plus 6 new in `ui.test.ts`). Build clean.

- [ ] **Step 2: Acceptance criteria pass**

Walk the spec's "Acceptance criteria" section item-by-item in the running app (`npm run dev`). Confirm:

- [ ] /sequences renders unified top bar with sub-tabs row.
- [ ] Sub-tab switch persists in URL (/sequences ↔ /sequences/transitions).
- [ ] Direct-load /sequences/transitions activates Transitions sub-tab.
- [ ] /transitions redirects to /sequences/transitions.
- [ ] /tricks top bar uses position: sticky (open DevTools Inspector → check computed style).
- [ ] /graph top bar shows centered View | Move switcher only.
- [ ] /graph viewport: zoom cluster bottom-left, Build FAB bottom-right.
- [ ] /sequences (Sequences sub-tab) has Generate FAB; switching to Transitions hides it.
- [ ] Sequence-mode bubble has min-width 280px on empty state; Undo + Save disabled; Cancel active.
- [ ] SequenceSheet header renders IconRoute (not 🔗); rename button renders IconEdit (not ✎).
- [ ] `grep -rn '🔗\|✎' src/components/SequenceSheet.vue` returns nothing.
- [ ] `grep -rn 'bg-card-2\|border-border-2' src/components/SequenceSheet.vue` returns nothing.

- [ ] **Step 3: Update `spec/SESSION-HANDOFF.md`**

Edit the handoff file. Update sections:

- Under "What's shipped since the 2026-06-26 handoff (additive)" — add a new subsection "Phase 6 polish round 2 (shipped 2026-06-27 or later — set the date)" summarizing the work in 4-6 bullets matching the depth of other entries.
- Move "Phase 6 polish round 2 — design queue (raised 2026-06-27 device review)" out of "What's NOT done" (now shipped).
- Remove the Phase 4d "DEFERRED" entry (it's been subsumed).
- Remove the Phase 4e "Transitions" entry (it's been subsumed).
- Update "State right now" branch description: increment commit count.
- Update Decisions log with the IA decision (Sequences umbrella + sub-tabs), the position-sticky decision, the two-FABs decision.
- Update the "Prompt for new session" block to reflect the new state.

- [ ] **Step 4: Final commit**

```bash
git add spec/SESSION-HANDOFF.md
git commit -m "SESSION-HANDOFF: Phase 6 polish round 2 shipped

Adds Phase 6 R2 ship summary (unified top bar, Sequences umbrella with
sub-tabs, two FABs, Graph top bar redesign, sequence-mode bubble fix,
SequenceSheet Glasswork migration). Retires deferred 4d and open 4e
from 'what's NOT done' — both subsumed. Adds decisions log entries
for IA shape, position-sticky, two-FABs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Don't push automatically**

Stop here. The user pushes manually when ready (per session convention — GH Pages redeploys on every push).

---

## Self-review checklist (run after writing this plan, before handoff)

- [ ] Every spec section has at least one task implementing it.
- [ ] No "TBD" / "TODO" / "add appropriate X" placeholders.
- [ ] Type names match between tasks (e.g., `SequencesSubTab` introduced in Task 2 is used in Task 7 with the same spelling).
- [ ] All file paths are absolute or relative to repo root (no `./foo.ts`).
- [ ] All `git commit` messages include the Co-Authored-By line.
- [ ] Manual smoke tests describe expected behavior (not just "verify it works").
