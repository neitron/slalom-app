# Glasswork Phase 4b — Tricks Search-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `/tricks` around a sticky search bar + bottom-sheet filter UI. Drop tier tabs. Fold the `?status=` chip from Phase 4a into the new sheet while preserving Home's See-all URL contract.

**Architecture:** A pure `useScrollDirection` composable drives hide-on-scroll behaviour. `FilterOpts` and `useUiStore` get plural multi-select fields (`tiers`, `categories`, `statuses`, `favOnly`) added alongside their singular legacy forms; the legacy forms are removed in the final cleanup task once AllTricks no longer references them. A new bottom-sheet component, `TricksFilterSheet.vue`, mirrors TrickSheet's drag-to-dismiss skeleton. AllTricks.vue is rewritten in place to use sticky search + inline sort pill + filter button.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`) · Pinia · Vue Router (hash) · TypeScript · Vitest (node env) · existing Glasswork token system (`gw-glass`, `--color-g-*`, `--radius-g-*`).

**Spec:** `spec/2026-06-26-glasswork-phase-4b-tricks-design.md`

---

## File map

**Create:**
- `src/composables/useScrollDirection.ts` — pure-ish: ref + window scroll listener.
- `src/composables/__tests__/useScrollDirection.test.ts` — vitest with a custom `target` to avoid touching real window.
- `src/components/TricksFilterSheet.vue` — bottom sheet, reads/writes `useUiStore`.

**Modify:**
- `src/stores/tricks.ts` — extend `FilterOpts` with plural fields + `favOnly`; update `filteredAndSorted` to accept both. Tests file extended.
- `src/stores/__tests__/tricks.test.ts` — new cases for plural fields, favOnly, multi-dim, deprecated singular still works.
- `src/stores/ui.ts` — add plural fields + actions in Task 3; remove legacy singulars in Task 7.
- `src/pages/AllTricks.vue` — full rewrite in Task 5.

**Delete (Task 7):**
- `src/components/TierTabs.vue`
- `src/components/SearchSort.vue`

**Phase 4b-coda (Task 8, separate commit):**
- Rename `src/pages/AllTricks.vue` → `src/pages/Tricks.vue` + update `src/router.ts` import.
- Remove deprecated singular `tier?` / `category?` / `status?` / `practicedOnly?` from `FilterOpts`.

---

## Task 1: `useScrollDirection` composable

**Files:**
- Create: `src/composables/useScrollDirection.ts`
- Test: `src/composables/__tests__/useScrollDirection.test.ts`

The composable accepts an optional `target` (defaults to `window`) so the test can drive scroll events on a fake EventTarget without touching the DOM.

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/useScrollDirection.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { useScrollDirection } from '../useScrollDirection'

class FakeScroller extends EventTarget {
  public scrollY = 0
  fire(nextY: number) {
    this.scrollY = nextY
    this.dispatchEvent(new Event('scroll'))
  }
}

describe('useScrollDirection', () => {
  it('initial state: not hidden', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    expect(hidden.value).toBe(false)
    stop()
  })

  it('hides when scrolling down past threshold', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(20)
    expect(hidden.value).toBe(true)
    stop()
  })

  it('reveals when scrolling up past threshold', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(40)
    expect(hidden.value).toBe(true)
    target.fire(20)
    expect(hidden.value).toBe(false)
    stop()
  })

  it('ignores sub-threshold deltas (no thrash)', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(40)
    expect(hidden.value).toBe(true)
    target.fire(35) // -5, below threshold
    expect(hidden.value).toBe(true)
    target.fire(31) // -9 from anchor (40), passes threshold → reveal
    expect(hidden.value).toBe(false)
    stop()
  })

  it('always reveals near the top (scrollY < threshold)', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    target.fire(40)
    expect(hidden.value).toBe(true)
    target.fire(3)
    expect(hidden.value).toBe(false)
    stop()
  })

  it('stop() removes the listener', () => {
    const target = new FakeScroller()
    const { hidden, stop } = useScrollDirection({ target: target as unknown as Window, threshold: 8 })
    stop()
    target.fire(100)
    expect(hidden.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/composables/__tests__/useScrollDirection.test.ts
```

Expected: `Cannot find module '../useScrollDirection'`.

- [ ] **Step 3: Implement**

Create `src/composables/useScrollDirection.ts`:

```ts
import { onScopeDispose, ref, type Ref } from 'vue'

export interface UseScrollDirectionOptions {
  target?: Window | (EventTarget & { scrollY: number })
  threshold?: number
}

export interface UseScrollDirection {
  hidden: Ref<boolean>
  stop: () => void
}

export function useScrollDirection(opts: UseScrollDirectionOptions = {}): UseScrollDirection {
  const target = opts.target ?? (typeof window !== 'undefined' ? window : undefined)
  const threshold = opts.threshold ?? 8
  const hidden = ref(false)
  let anchor = 0 // last position at which we flipped state OR the current scroll dir began
  let lastDir: 'down' | 'up' | 'idle' = 'idle'

  function onScroll() {
    if (!target) return
    const y = (target as { scrollY: number }).scrollY
    if (y < threshold) {
      hidden.value = false
      anchor = y
      lastDir = 'idle'
      return
    }
    const delta = y - anchor
    if (Math.abs(delta) < threshold) return
    if (delta > 0 && lastDir !== 'down') {
      hidden.value = true
      anchor = y
      lastDir = 'down'
    } else if (delta < 0 && lastDir !== 'up') {
      hidden.value = false
      anchor = y
      lastDir = 'up'
    } else {
      // Same direction past threshold — slide anchor along so future flips still need threshold from current y.
      anchor = y
    }
  }

  target?.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)

  function stop() {
    target?.removeEventListener('scroll', onScroll)
  }
  onScopeDispose(stop)

  return { hidden, stop }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/composables/__tests__/useScrollDirection.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Run the whole test suite to confirm no regressions**

```bash
npm test
```

Expected: 132 + 6 = 138 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/composables/useScrollDirection.ts src/composables/__tests__/useScrollDirection.test.ts
git commit -m "Phase 4b: useScrollDirection composable"
```

---

## Task 2: Extend `FilterOpts` with plural fields + `favOnly`

**Files:**
- Modify: `src/stores/tricks.ts` (lines 20-26 for the interface, lines 62-80 for the getter)
- Modify: `src/stores/__tests__/tricks.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Open `src/stores/__tests__/tricks.test.ts` and add these cases at the end of the existing `describe('tricks store — status filter', ...)` block (just before its closing `})`). Add the helper `tWithFav` at the top of the file just under the existing `t` helper:

```ts
const tWithFav = (id: string, name: string, status: Trick['status'], fav: boolean, tier = 1 as const): Trick => ({
  id, name, tier, category: 'forward', entry: '2/f', exit: '2/f',
  lr: false, rate: null, rateL: null, rateR: null, last: null,
  status, aliases: [], video: null, icon: null, tags: [], fav,
})
```

Then append inside the existing `describe`:

```ts
  // Plural multi-select fields (Phase 4b)
  it('filteredAndSorted({ tiers: [2, 3] }) returns only tier 2 and 3', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
      tWithFav('3', 'C', 'Not Started', false, 3),
      tWithFav('4', 'D', 'Not Started', false, 4),
    ]
    const result = store.filteredAndSorted({ tiers: [2, 3] })
    expect(result.map((x) => x.id).sort()).toEqual(['2', '3'])
  })

  it('filteredAndSorted({ tiers: [] }) is unconstrained on tier', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
    ]
    const result = store.filteredAndSorted({ tiers: [] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ categories: ["forward", "backward"] }) returns only those', () => {
    const store = useTricksStore()
    const forward = tWithFav('1', 'A', 'Not Started', false)
    const backward = { ...tWithFav('2', 'B', 'Not Started', false), category: 'backward' as const }
    const cross = { ...tWithFav('3', 'C', 'Not Started', false), category: 'cross' as const }
    store.tricks = [forward, backward, cross]
    const result = store.filteredAndSorted({ categories: ['forward', 'backward'] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ statuses: ["In Progress", "Complete"] }) returns both', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'In Progress', false),
      tWithFav('2', 'B', 'Complete', false),
      tWithFav('3', 'C', 'Not Started', false),
    ]
    const result = store.filteredAndSorted({ statuses: ['In Progress', 'Complete'] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ favOnly: true }) returns only favs', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', true),
      tWithFav('2', 'B', 'Not Started', false),
      tWithFav('3', 'C', 'Not Started', true),
    ]
    const result = store.filteredAndSorted({ favOnly: true })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })

  it('AND across dimensions, OR within: tiers + statuses + favOnly compose correctly', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'In Progress', true, 2),
      tWithFav('2', 'B', 'In Progress', false, 2),     // not fav → filtered out
      tWithFav('3', 'C', 'Complete', true, 3),
      tWithFav('4', 'D', 'Not Started', true, 2),       // wrong status → filtered out
      tWithFav('5', 'E', 'In Progress', true, 5),       // wrong tier → filtered out
    ]
    const result = store.filteredAndSorted({
      tiers: [2, 3],
      statuses: ['In Progress', 'Complete'],
      favOnly: true,
    })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })

  it('deprecated singular `tier: 2` still narrows to tier 2', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
      tWithFav('3', 'C', 'Not Started', false, 3),
    ]
    const result = store.filteredAndSorted({ tier: 2 })
    expect(result.map((x) => x.id)).toEqual(['2'])
  })

  it('plural wins when both singular and plural passed', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
      tWithFav('3', 'C', 'Not Started', false, 3),
    ]
    const result = store.filteredAndSorted({ tier: 2, tiers: [1, 3] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })
```

- [ ] **Step 2: Run, confirm the new tests fail**

```bash
npm test -- src/stores/__tests__/tricks.test.ts
```

Expected: the new plural-form tests fail.

- [ ] **Step 3: Update `FilterOpts` and `filteredAndSorted`**

In `src/stores/tricks.ts`, find the `FilterOpts` interface (~line 20). Replace with:

```ts
export interface FilterOpts {
  // Multi-select (Phase 4b)
  tiers?:      Tier[]        | null;
  categories?: Category[]    | null;
  statuses?:   TrickStatus[] | null;
  favOnly?:    boolean;

  // Existing — kept
  search?: string;
  sort?:   SortKey;

  // Deprecated singular forms — removed in Phase 4b-coda (Task 8).
  tier?:          Tier | null;
  category?:      Category | 'all';
  status?:        TrickStatus | null;
  practicedOnly?: boolean;
}
```

Then find the `filteredAndSorted` getter. Replace its inner body with:

```ts
filteredAndSorted(state) {
  return (opts: FilterOpts = {}): Trick[] => {
    const {
      tier = null,
      category = 'all',
      search = '',
      sort = 'name',
      practicedOnly = false,
      status = null,
      tiers = null,
      categories = null,
      statuses = null,
      favOnly = false,
    } = opts;
    let list = state.tricks.slice();

    // Tier — plural wins.
    if (tiers != null && tiers.length > 0) {
      const setT = new Set(tiers);
      list = list.filter((t) => setT.has(t.tier));
    } else if (tier != null) {
      list = list.filter((t) => t.tier === tier);
    }

    // Category — plural wins.
    if (categories != null && categories.length > 0) {
      const setC = new Set(categories);
      list = list.filter((t) => setC.has(t.category));
    } else if (category && category !== 'all') {
      list = list.filter((t) => t.category === category);
    }

    if (search) list = list.filter((t) => matchesQuery(t, search));
    if (practicedOnly) list = list.filter((t) => hasRate(t));

    // Status — plural wins.
    if (statuses != null && statuses.length > 0) {
      const setS = new Set(statuses);
      list = list.filter((t) => setS.has(t.status));
    } else if (status != null) {
      list = list.filter((t) => t.status === status);
    }

    if (favOnly) list = list.filter((t) => t.fav);

    list.sort(sorters[sort]);
    return list;
  };
},
```

- [ ] **Step 4: Run tests + build**

```bash
npm test -- src/stores/__tests__/tricks.test.ts
npm run build
```

Expected: all tests pass; build clean.

- [ ] **Step 5: Commit**

```bash
git add src/stores/tricks.ts src/stores/__tests__/tricks.test.ts
git commit -m "Phase 4b: FilterOpts plural fields (tiers/categories/statuses/favOnly)"
```

---

## Task 3: Extend `useUiStore` with plural filter fields

**Files:**
- Modify: `src/stores/ui.ts`

The legacy singular fields stay for now (they're removed in Task 7) so AllTricks can keep building between this commit and Task 5.

- [ ] **Step 1: Update `useUiStore`**

Open `src/stores/ui.ts`. Modify the imports (line 2) to include `TrickStatus`:

```ts
import type { Category, Side, Tier, TrickStatus } from '../domain/types';
```

Then in the `state` object (lines 24-35), add the plural fields below the existing singular ones:

```ts
state: () => ({
  openSheetTrickId: null as string | null,
  openTransitionId: null as string | null,
  openSequenceId: null as string | null,
  currentTab: 'tricks' as Tab,
  tier: 1 as Tier,
  category: 'all' as Category | 'all',
  search: '',
  sort: 'name' as SortKey,
  // Phase 4b — plural fields (legacy singulars above stay until Task 7)
  tricksTiers:      [] as Tier[],
  tricksCategories: [] as Category[],
  tricksStatuses:   [] as TrickStatus[],
  tricksFavOnly:    false,
  tricksSearch:     '',
  tricksSort:       'name' as SortKey,
  feedback: null as FeedbackReport | null,
  toasts: [] as Toast[],
}),
```

In `actions`, add (anywhere after the existing setSort action and before `triggerFeedback`):

```ts
setTricksTiers(v: Tier[]): void {
  this.tricksTiers = v;
},
setTricksCategories(v: Category[]): void {
  this.tricksCategories = v;
},
setTricksStatuses(v: TrickStatus[]): void {
  this.tricksStatuses = v;
},
setTricksFavOnly(v: boolean): void {
  this.tricksFavOnly = v;
},
setTricksSearch(v: string): void {
  this.tricksSearch = v;
},
setTricksSort(v: SortKey): void {
  this.tricksSort = v;
},
resetTricksFilters(): void {
  this.tricksTiers = [];
  this.tricksCategories = [];
  this.tricksStatuses = [];
  this.tricksFavOnly = false;
  // search + sort intentionally NOT reset by this action
},
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean. (No tests change.)

- [ ] **Step 3: Commit**

```bash
git add src/stores/ui.ts
git commit -m "Phase 4b: useUiStore plural filter fields"
```

---

## Task 4: `TricksFilterSheet.vue`

**Files:**
- Create: `src/components/TricksFilterSheet.vue`

The sheet mirrors `TrickSheet`'s skeleton (Teleport + backdrop + drag handle). Reads/writes `useUiStore` directly. Receives a `visible` prop + `close` emit from `AllTricks.vue`.

- [ ] **Step 1: Implement**

Create `src/components/TricksFilterSheet.vue`:

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiStore } from '../stores/ui'
import { useTricksStore } from '../stores/tricks'
import { CATEGORIES, TIER_NAMES } from '../domain/constants'
import type { Category, Tier, TrickStatus } from '../domain/types'
import ChipFilter, { type ChipOption } from './ChipFilter.vue'

type Props = { visible: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const ui = useUiStore()
const tricksStore = useTricksStore()

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let active = false
const CLOSE_THRESHOLD = 100

function onTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}
function onTouchMove(e: TouchEvent) {
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

const tierOptions = computed<ChipOption[]>(() =>
  TIER_NAMES.map((_n, i) => ({ value: String(i + 1), label: `T${i + 1}` })),
)
const categoryOptions = computed<ChipOption[]>(() =>
  CATEGORIES.map((c) => ({ value: c, label: c })),
)
const statusOptions: ChipOption[] = [
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Complete', label: 'Complete' },
  { value: 'Not Started', label: 'Not Started' },
]

const tierModel = computed<string[]>({
  get: () => ui.tricksTiers.map(String),
  set: (v) => ui.setTricksTiers(v.map((n) => Number(n) as Tier)),
})
const categoryModel = computed<string[]>({
  get: () => ui.tricksCategories.slice(),
  set: (v) => ui.setTricksCategories(v as Category[]),
})
const statusModel = computed<string[]>({
  get: () => ui.tricksStatuses.slice(),
  set: (v) => ui.setTricksStatuses(v as TrickStatus[]),
})

const resultCount = computed(() =>
  tricksStore.filteredAndSorted({
    tiers: ui.tricksTiers,
    categories: ui.tricksCategories,
    statuses: ui.tricksStatuses,
    favOnly: ui.tricksFavOnly,
    search: ui.tricksSearch,
    sort: ui.tricksSort,
  }).length,
)

function onResetAll() {
  ui.resetTricksFilters()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
      >
        <div
          class="absolute inset-0 bg-black/60"
          @click="emit('close')"
        />
        <div
          ref="panelRef"
          class="relative w-full max-h-[85dvh] gw-glass flex flex-col"
          :style="{
            borderTopLeftRadius: 'var(--radius-g-panel)',
            borderTopRightRadius: 'var(--radius-g-panel)',
            transform: `translateY(${dragY}px)`,
            transition: dragging ? 'none' : 'transform 280ms ease',
          }"
        >
          <div
            class="pt-3 pb-1 flex justify-center cursor-grab"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
          >
            <div class="w-10 h-1 rounded-full" :style="{ background: 'rgba(255,255,255,0.18)' }" />
          </div>

          <header class="px-4 py-2 flex items-center justify-between">
            <h2 class="font-semibold" :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)' }">Filters</h2>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 active:opacity-60"
                :style="{ color: 'var(--color-g-brand)', fontSize: 'var(--text-g-body)' }"
                @click="onResetAll"
              >Reset all</button>
              <button
                type="button"
                class="w-8 h-8 grid place-items-center gw-glass-strong"
                :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
                aria-label="Close filters"
                @click="emit('close')"
              >×</button>
            </div>
          </header>

          <div class="px-4 pb-4 flex flex-col gap-4 overflow-y-auto">
            <section class="flex flex-col gap-2">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Tier</h3>
              <ChipFilter :options="tierOptions" :model-value="tierModel" :multi="true" @update:model-value="tierModel = $event as string[]" />
            </section>

            <section class="flex flex-col gap-2">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Category</h3>
              <ChipFilter :options="categoryOptions" :model-value="categoryModel" :multi="true" @update:model-value="categoryModel = $event as string[]" />
            </section>

            <section class="flex flex-col gap-2">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Status</h3>
              <ChipFilter :options="statusOptions" :model-value="statusModel" :multi="true" @update:model-value="statusModel = $event as string[]" />
            </section>

            <section class="flex items-center justify-between">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Favorites only</h3>
              <button
                type="button"
                class="px-3 py-1.5 transition-colors"
                :class="ui.tricksFavOnly ? 'font-semibold' : 'gw-glass-strong'"
                :style="ui.tricksFavOnly
                  ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)' }
                  : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
                @click="ui.setTricksFavOnly(!ui.tricksFavOnly)"
              >{{ ui.tricksFavOnly ? '★ On' : 'Off' }}</button>
            </section>
          </div>

          <footer
            class="px-4 py-3 border-t"
            :style="{ borderColor: 'rgba(255,255,255,0.08)' }"
          >
            <p :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg-muted)', textAlign: 'center' }">
              <span :style="{ color: 'var(--color-g-fg)', fontWeight: 600 }">{{ resultCount }}</span> result<span v-if="resultCount !== 1">s</span>
            </p>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 240ms ease; }
.sheet-enter-active .relative,
.sheet-leave-active .relative { transition: transform 280ms cubic-bezier(.2, .8, .2, 1), opacity 240ms ease; }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .relative,
.sheet-leave-to .relative { transform: translateY(100%); }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/TricksFilterSheet.vue
git commit -m "Phase 4b: TricksFilterSheet component"
```

---

## Task 5: Rewrite `src/pages/AllTricks.vue`

**Files:**
- Modify: `src/pages/AllTricks.vue` (full rewrite)

- [ ] **Step 1: Implement**

Replace `src/pages/AllTricks.vue` entirely with:

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import type { Trick, TrickStatus } from '../domain/types'
import { resolveVideoUrl } from '../domain/video'
import TrickCard from '../components/TrickCard.vue'
import TricksFilterSheet from '../components/TricksFilterSheet.vue'
import { useScrollDirection } from '../composables/useScrollDirection'

const tricksStore = useTricksStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  syncStatusFromQuery()
})

watch(() => route.query.status, () => syncStatusFromQuery())

const STATUS_FROM_QUERY: Record<string, TrickStatus> = {
  'in-progress': 'In Progress',
  'complete': 'Complete',
  'not-started': 'Not Started',
}
const STATUS_TO_QUERY: Record<TrickStatus, string> = {
  'In Progress': 'in-progress',
  'Complete': 'complete',
  'Not Started': 'not-started',
}

const statusFromUrl = computed<TrickStatus | null>(() => {
  const raw = route.query.status
  if (typeof raw !== 'string') return null
  return STATUS_FROM_QUERY[raw] ?? null
})

function syncStatusFromQuery() {
  const fromUrl = statusFromUrl.value
  if (fromUrl == null) return
  // URL wins on mount + route changes — overwrite in-memory selection.
  ui.setTricksStatuses([fromUrl])
}

// Sheet → URL: rewrite when statuses array changes to length 1; clear otherwise.
watch(() => ui.tricksStatuses.slice(), (next, prev) => {
  const hasUrl = typeof route.query.status === 'string'
  if (next.length === 1) {
    const slug = STATUS_TO_QUERY[next[0]]
    if (route.query.status !== slug) {
      void router.replace({ path: route.path, query: { ...route.query, status: slug } })
    }
  } else if (hasUrl) {
    const nextQ = { ...route.query }
    delete nextQ.status
    void router.replace({ path: route.path, query: nextQ })
  }
}, { deep: true })

function clearStatusFromActiveStrip() {
  ui.setTricksStatuses([])
  const next = { ...route.query }
  delete next.status
  void router.replace({ path: route.path, query: next })
}

const filterSheetOpen = ref(false)

const filterCount = computed(() =>
  ui.tricksTiers.length +
  ui.tricksCategories.length +
  ui.tricksStatuses.length +
  (ui.tricksFavOnly ? 1 : 0),
)

const SORT_CYCLE: SortKey[] = ['name', 'best', 'worst']
const SORT_LABEL: Record<SortKey, string> = { name: 'Name', best: 'Best', worst: 'Worst' }
function cycleSort() {
  const i = SORT_CYCLE.indexOf(ui.tricksSort)
  ui.setTricksSort(SORT_CYCLE[(i + 1) % SORT_CYCLE.length])
}

const list = computed<Trick[]>(() =>
  tricksStore.filteredAndSorted({
    tiers: ui.tricksTiers,
    categories: ui.tricksCategories,
    statuses: ui.tricksStatuses,
    favOnly: ui.tricksFavOnly,
    search: ui.tricksSearch,
    sort: ui.tricksSort,
  }),
)

const anyFilterActive = computed(() => filterCount.value > 0 || ui.tricksSearch.length > 0)

const { hidden: stickyHidden } = useScrollDirection({ threshold: 8 })

function onOpen(t: Trick) {
  if (t.id) ui.openSheet(t.id)
}
function onVideo(t: Trick) {
  const { url } = resolveVideoUrl(t)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />

    <div
      class="sticky-bar"
      :class="{ hidden: stickyHidden }"
    >
      <div class="gw-glass px-3 py-2 flex items-center gap-2"
           :style="{ borderRadius: 'var(--radius-g-panel)' }">
        <label class="flex-1 flex items-center gap-2 px-3 py-2"
               :style="{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-g-chip)' }">
          <span aria-hidden="true" :style="{ color: 'var(--color-g-fg-muted)' }">⌕</span>
          <input
            :value="ui.tricksSearch"
            type="search"
            placeholder="Search tricks…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="flex-1 bg-transparent outline-none"
            :style="{ color: 'var(--color-g-fg)', fontSize: 'var(--text-g-body)' }"
            @input="ui.setTricksSearch(($event.target as HTMLInputElement).value)"
          >
        </label>
        <button
          type="button"
          class="px-3 py-2 active:scale-95 transition-transform gw-glass-strong"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          @click="cycleSort"
        >{{ SORT_LABEL[ui.tricksSort] }}</button>
        <button
          type="button"
          class="px-3 py-2 active:scale-95 transition-transform gw-glass-strong"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          aria-label="Open filters"
          @click="filterSheetOpen = true"
        >
          Filters<span
            v-if="filterCount > 0"
            class="ml-1.5 px-1.5 rounded-full font-semibold"
            :style="{ background: 'var(--color-g-brand)', color: 'var(--color-g-base)', fontSize: '10px' }"
          >{{ filterCount }}</span>
        </button>
      </div>
    </div>

    <div class="page-scroll p-3 flex flex-col gap-3" style="padding-top: 0;">
      <!-- spacer so content begins below the sticky bar on initial paint -->
      <div aria-hidden="true" style="height: 72px;" />

      <div
        v-if="statusFromUrl"
        class="flex justify-start"
      >
        <button
          type="button"
          class="gw-glass-strong flex items-center gap-2 px-3 py-1.5 active:scale-95 transition-transform"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          @click="clearStatusFromActiveStrip"
        >
          <span>{{ statusFromUrl }}</span>
          <span :style="{ color: 'var(--color-g-fg-muted)', fontSize: '14px', lineHeight: 1 }">×</span>
        </button>
      </div>

      <div
        v-if="!tricksStore.loaded"
        class="text-muted text-sm py-8 text-center"
      >Loading…</div>

      <div
        v-else-if="!list.length && anyFilterActive"
        class="text-muted text-sm py-8 text-center flex flex-col gap-2 items-center"
      >
        <span>No matches — try clearing filters.</span>
        <button
          type="button"
          class="px-3 py-1.5 active:scale-95 transition-transform gw-glass-strong"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          @click="filterSheetOpen = true"
        >Open filters</button>
      </div>

      <div
        v-else-if="!list.length"
        class="text-muted text-sm py-8 text-center"
      >No tricks yet.</div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <TrickCard
          v-for="t in list"
          :key="t.id"
          :trick="t"
          @open="onOpen"
          @video="onVideo"
        />
      </div>
    </div>

    <TricksFilterSheet
      :visible="filterSheetOpen"
      @close="filterSheetOpen = false"
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
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Run the test suite**

```bash
npm test
```

Expected: all tests pass (no regressions; legacy filter tests still rely on backward-compatible singular fields).

- [ ] **Step 4: Smoke-test the dev server**

```bash
npm run dev
```

In the browser at the dev URL, navigate to `/#/tricks`. Verify:
- Sticky search bar visible at the top, hides on scroll-down, reveals on scroll-up.
- Filter button opens the bottom sheet; drag-down dismisses it.
- Toggling chips inside the sheet updates the result count live and updates the page list immediately.
- Setting exactly one status from the sheet writes `?status=...` to the URL; setting two or zero removes it.
- Loading `/#/tricks?status=in-progress` selects In Progress in the sheet AND shows the dismissible chip in the active-filter strip.
- Tapping `×` on the chip clears both the URL param and the in-memory `tricksStatuses`.
- Sort pill cycles `Name → Best → Worst → Name` and re-sorts the list each tap.
- Empty result with any filter active: shows the muted "No matches" copy + Open filters button.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AllTricks.vue
git commit -m "Phase 4b: AllTricks search-first rewrite"
```

---

## Task 6: Manual device smoke test (iOS Safari)

**Files:** None.

- [ ] **Step 1: Serve a preview**

```bash
npm run build && npm run preview -- --host 0.0.0.0
```

Open the LAN URL on a real iPhone. Or use the existing `npm run dev -- --host 0.0.0.0` session.

- [ ] **Step 2: Verify on hardware**

- Sticky header doesn't jitter during rapid scrolls.
- Filter sheet drag-to-dismiss matches the feel of TrickSheet.
- Chip taps register without lag on slow connections.
- Multi-status URL contract works across browser back-forward navigations (forward to `?status=in-progress` should re-set the in-memory array; backing out should clear).
- TabBar at the bottom is not occluded by the sticky filter bar or the sheet backdrop.

If any check fails, fix the underlying cause before moving on.

---

## Task 7: Cleanup — remove legacy singulars + dead components

**Files:**
- Modify: `src/stores/ui.ts` — remove the legacy single-value tier / category / search / sort fields and their actions.
- Delete: `src/components/TierTabs.vue`
- Delete: `src/components/SearchSort.vue`

The Phase 4a `?status=` chip on AllTricks (which used `statusFilter` computed off `route.query.status`) has been replaced by `statusFromUrl` in Task 5. No consumer of the old singulars remains.

- [ ] **Step 1: Confirm no remaining consumers of the legacy singulars**

```bash
grep -rn "ui\.tier\b\|ui\.category\b\|ui\.search\b\|ui\.sort\b\|uiStore\.tier\b\|uiStore\.category\b\|uiStore\.search\b\|uiStore\.sort\b\|setTier\b\|setCategory\b\|setSearch\b\|setSort\b" src/ 2>/dev/null
```

Expected: no matches outside `src/stores/ui.ts` itself.

If any consumer is found, fix it first (port to the plural equivalent or delete the line) before continuing.

- [ ] **Step 2: Strip the legacy fields from `useUiStore`**

In `src/stores/ui.ts`, remove from `state`:

```ts
tier: 1 as Tier,
category: 'all' as Category | 'all',
search: '',
sort: 'name' as SortKey,
```

Remove the corresponding actions:

```ts
setTier(tier: Tier): void { this.tier = tier; },
setCategory(category: Category | 'all'): void { this.category = category; },
setSearch(search: string): void { this.search = search; },
setSort(sort: SortKey): void { this.sort = sort; },
```

If `Category` or `Tier` is no longer used in the file's imports (it still is — the plural fields use it), leave them.

- [ ] **Step 3: Delete the dead components**

```bash
rm src/components/TierTabs.vue src/components/SearchSort.vue
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build
npm test
```

Expected: clean. If TypeScript errors arise from a forgotten consumer, fix and re-run.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Phase 4b: remove legacy ui store singulars + TierTabs/SearchSort"
```

---

## Task 8: Phase 4b-coda — rename AllTricks → Tricks; drop deprecated FilterOpts singulars

**Files:**
- Rename: `src/pages/AllTricks.vue` → `src/pages/Tricks.vue`
- Modify: `src/router.ts`
- Modify: `src/stores/tricks.ts`
- Modify: `src/stores/__tests__/tricks.test.ts`

- [ ] **Step 1: Rename the page**

```bash
git mv src/pages/AllTricks.vue src/pages/Tricks.vue
```

Update `src/router.ts` to import from the new path:

```ts
// Find this line:
import AllTricks from './pages/AllTricks.vue'
// Replace with:
import Tricks from './pages/Tricks.vue'
```

And the route definition:

```ts
// Find:
{ path: '/tricks', name: 'tricks', component: AllTricks },
// Replace with:
{ path: '/tricks', name: 'tricks', component: Tricks },
```

- [ ] **Step 2: Drop deprecated singular fields from `FilterOpts`**

In `src/stores/tricks.ts`, find the `FilterOpts` interface and remove these four lines:

```ts
tier?:          Tier | null;
category?:      Category | 'all';
status?:        TrickStatus | null;
practicedOnly?: boolean;
```

Then in `filteredAndSorted`, remove the destructured legacy fields and their branches. The cleaned-up body:

```ts
filteredAndSorted(state) {
  return (opts: FilterOpts = {}): Trick[] => {
    const {
      search = '',
      sort = 'name',
      tiers = null,
      categories = null,
      statuses = null,
      favOnly = false,
    } = opts;
    let list = state.tricks.slice();
    if (tiers != null && tiers.length > 0) {
      const setT = new Set(tiers);
      list = list.filter((t) => setT.has(t.tier));
    }
    if (categories != null && categories.length > 0) {
      const setC = new Set(categories);
      list = list.filter((t) => setC.has(t.category));
    }
    if (search) list = list.filter((t) => matchesQuery(t, search));
    if (statuses != null && statuses.length > 0) {
      const setS = new Set(statuses);
      list = list.filter((t) => setS.has(t.status));
    }
    if (favOnly) list = list.filter((t) => t.fav);
    list.sort(sorters[sort]);
    return list;
  };
},
```

- [ ] **Step 3: Remove now-stale tests for deprecated singulars**

In `src/stores/__tests__/tricks.test.ts`, delete:
- the "filteredAndSorted({ status: ..." test that uses the deprecated singular `status`
- the "combines status with search" test (uses singular)
- the "combines status with sort=best" test (uses singular)
- the "deprecated singular `tier: 2` still narrows..." test
- the "plural wins when both..." test

Keep the "omitting status returns all tricks" test if it doesn't reference singulars; otherwise port it to use the plural form OR delete it (the plural-form tests already cover unconstrained behavior).

If `hasRate` import was only for the deleted `practicedOnly` branch, remove the import from `tricks.ts` too.

- [ ] **Step 4: Verify build + tests**

```bash
npm run build
npm test
```

Expected: clean. The `Home.vue` link `router.push({ path: '/tricks', query: { status: 'in-progress' } })` still works because the page reads `route.query.status` directly (not via `FilterOpts.status`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Phase 4b-coda: rename AllTricks → Tricks; drop FilterOpts singulars"
```

---

## Task 9: Document the phase as shipped

**Files:**
- Modify: `spec/SESSION-HANDOFF.md` — move Phase 4b out of "NOT done" and into "shipped" section
- Modify: `spec/2026-06-24-redesign-glasswork-roadmap.md` — add the Phase 4b row to the status table

- [ ] **Step 1: Edit handoff**

In `spec/SESSION-HANDOFF.md`, change the line:

```
- Glasswork redesign: **Phases 1, 2, 3a, 3b, 4a, 4c, 4h shipped locally**. Phases 4b/d/e/f/g/i + 5 + 6 + 7 still open.
```

To:

```
- Glasswork redesign: **Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h shipped locally**. Phases 4d/e/f/g/i + 5 + 6 + 7 still open.
```

Remove the "Phase 4b — Tricks" entry from the "What's NOT done" section. Add a "Phase 4b — Tricks" section under "What's shipped (Glasswork)" with a brief summary (search-first sticky header, bottom-sheet filter, sort pill, multi-select tier/category/status, fav toggle, `?status=` URL contract preserved).

- [ ] **Step 2: Update the roadmap status table**

In `spec/2026-06-24-redesign-glasswork-roadmap.md`, change the line:

```
| 4b/d/e/f/g/i — remaining screens | (not yet written) | — | — |
```

To:

```
| 4b — Tricks search-first | `docs/superpowers/plans/2026-06-26-glasswork-phase-4b-tricks.md` | Shipped | 2026-06-26 |
| 4d/e/f/g/i — remaining screens | (not yet written) | — | — |
```

- [ ] **Step 3: Commit**

```bash
git add spec/SESSION-HANDOFF.md spec/2026-06-24-redesign-glasswork-roadmap.md
git commit -m "Phase 4b: docs — mark Tricks search-first shipped"
```

---

## What this plan deliberately does not do

- URL-encoding for multi-filters beyond `?status=`. Status-only contract is preserved per Phase 4a; tier/category/fav stay in-memory.
- Recently-searched / saved-search drawer.
- Filter presets.
- `practicedOnly` as a separate filter axis (Status "In Progress" + "Complete" approximates).
- Replacing `TrickCard` visuals or the grid layout.
- Sort persistence to localStorage.
- Component-level unit tests — project convention is data-layer-only tests + manual + iOS device smoke.
