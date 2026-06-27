# Add new trick — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "New trick" FAB to the Tricks page that opens a minimal creation sheet. Saving creates a new Trick (with progress fields defaulted), closes the create sheet, and immediately opens the existing TrickSheet for further editing.

**Architecture:** Three new pieces. `tricksStore.create` action wraps `upsertTrick` with form-to-Trick mapping + progress defaults. `TrickCreationSheet.vue` is a new component using the Phase 5 unified sheet pattern (two-layer panel, slide-up + fade, drag-to-close). Tricks.vue gains a glass FAB matching Sequences/Graph + a wire-up handler that hands off to `uiStore.openSheet` for the just-created trick.

**Tech Stack:** Vue 3 + Pinia + Vitest. No new dependencies.

**Spec:** `spec/2026-06-27-add-new-trick-design.md`

---

## Task 0: Pre-flight

**Files:** none modified.

- [ ] **Step 1: Verify baseline**

```bash
npm test
npm run build
```
Expected: 150/150 pass, build clean.

- [ ] **Step 2: Confirm spec committed**

```bash
git log -1 --oneline -- spec/2026-06-27-add-new-trick-design.md
```
Expected: commit `a8f1df7`.

---

## Task 1: Add `tricksStore.create` action + tests

**Files:**
- Modify: `src/stores/tricks.ts`
- Modify: `src/stores/__tests__/tricks.test.ts`

TDD: write failing tests, confirm fail, add the action, confirm pass.

- [ ] **Step 1: Append tests to `src/stores/__tests__/tricks.test.ts`**

Append a new `describe` block at the bottom of the file (after the existing block):

```ts
describe('tricks store — create (Phase add-new-trick)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('throws on empty name', async () => {
    const store = useTricksStore()
    await expect(store.create({ name: '', tier: 2, category: 'forward', lr: false })).rejects.toThrow(/required/i)
    await expect(store.create({ name: '   ', tier: 2, category: 'forward', lr: false })).rejects.toThrow(/required/i)
  })

  it('builds a complete Trick with progress defaults', async () => {
    const store = useTricksStore()
    const id = await store.create({ name: 'Test Trick', tier: 3, category: 'cross', lr: true })
    expect(id).toBeTypeOf('string')
    const created = store.byId(id)
    expect(created).toBeDefined()
    expect(created!.name).toBe('Test Trick')
    expect(created!.tier).toBe(3)
    expect(created!.category).toBe('cross')
    expect(created!.lr).toBe(true)
    expect(created!.status).toBe('Not Started')
    expect(created!.rate).toBeNull()
    expect(created!.rateL).toBeNull()
    expect(created!.rateR).toBeNull()
    expect(created!.last).toBeNull()
    expect(created!.aliases).toEqual([])
    expect(created!.tags).toEqual([])
    expect(created!.fav).toBe(false)
    expect(created!.icon).toBeNull()
    expect(created!.video).toBeNull()
    expect(created!.entry).toBe('2/f')
    expect(created!.exit).toBe('2/f')
  })

  it('trims name and stores trimmed value', async () => {
    const store = useTricksStore()
    const id = await store.create({ name: '  Spacy  ', tier: 1, category: 'forward', lr: false })
    expect(store.byId(id)!.name).toBe('Spacy')
  })

  it('handles optional icon and firstAlias', async () => {
    const store = useTricksStore()
    const id = await store.create({
      name: 'With extras',
      tier: 2,
      category: 'eagle',
      lr: false,
      icon: '🔥',
      firstAlias: 'flame',
    })
    const t = store.byId(id)!
    expect(t.icon).toBe('🔥')
    expect(t.aliases).toEqual(['flame'])
  })

  it('treats empty/whitespace icon and firstAlias as null/empty', async () => {
    const store = useTricksStore()
    const id = await store.create({
      name: 'No extras',
      tier: 2,
      category: 'forward',
      lr: false,
      icon: '   ',
      firstAlias: '',
    })
    const t = store.byId(id)!
    expect(t.icon).toBeNull()
    expect(t.aliases).toEqual([])
  })

  it('appends the new trick to the local list', async () => {
    const store = useTricksStore()
    const before = store.tricks.length
    await store.create({ name: 'New One', tier: 2, category: 'forward', lr: false })
    expect(store.tricks.length).toBe(before + 1)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run src/stores/__tests__/tricks.test.ts`
Expected: 6 new tests fail with "create is not a function" or similar.

- [ ] **Step 3: Add the `create` action to `src/stores/tricks.ts`**

Find the `actions:` block. After `async load()` (or at a sensible position alongside other mutating actions), add:

```ts
    async create(input: {
      name: string
      tier: Tier
      category: Category
      lr: boolean
      icon?: string | null
      firstAlias?: string | null
    }): Promise<string> {
      const name = input.name.trim()
      if (!name) throw new Error('Trick name required')
      const alias = input.firstAlias?.trim()
      const aliasArr: string[] = alias ? [alias] : []
      const trick: Trick = {
        name,
        tier: input.tier,
        category: input.category,
        entry: '2/f',
        exit: '2/f',
        lr: input.lr,
        rate: null,
        rateL: null,
        rateR: null,
        last: null,
        status: 'Not Started',
        aliases: aliasArr,
        mainAlias: null,
        video: null,
        icon: input.icon?.trim() || null,
        tags: [],
        fav: false,
      }
      const id = await upsertTrick(trick)
      trick.id = id
      this.tricks = [...this.tricks, trick]
      return id
    },
```

The existing import line `import { ... upsertTrick ... } from '../storage/repo'` (or similar) should already cover `upsertTrick`. If not, add it to the existing imports.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run src/stores/__tests__/tricks.test.ts`
Expected: all green (existing + 6 new tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: 156/156 (was 150 + 6 new).

- [ ] **Step 6: Commit**

```bash
git add src/stores/tricks.ts src/stores/__tests__/tricks.test.ts
git commit -m "Add-new-trick: tricksStore.create action + tests

Wraps the form input → Trick mapping with progress defaults
(rate/rateL/rateR/last null, status 'Not Started', empty
aliases/tags, no fav, no video, no icon, entry/exit defaulted
to '2/f'). Calls existing upsertTrick which auto-generates an
id when missing. Throws on empty/whitespace name.

Six tests cover: empty-name guard, default-fields, name trim,
optional icon/firstAlias, whitespace cleanup, local list
append. Suite goes from 150 to 156 tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create `TrickCreationSheet.vue`

**Files:**
- Create: `src/components/TrickCreationSheet.vue`

- [ ] **Step 1: Create the component**

Create `src/components/TrickCreationSheet.vue`:

```vue
<script setup lang="ts">
import { computed, ref, toRef, watch, nextTick } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { CATEGORIES } from '../domain/constants'
import type { Category, Tier } from '../domain/types'
import ChipFilter, { type ChipOption } from './ChipFilter.vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import { IconClose } from '../icons'

type Props = { visible: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', id: string): void
}>()

const tricks = useTricksStore()
const ui = useUiStore()

const name = ref('')
const tier = ref<Tier>(2)
const category = ref<Category>('forward')
const lr = ref(false)
const icon = ref('')
const firstAlias = ref('')
const saving = ref(false)

const nameInputRef = ref<HTMLInputElement | null>(null)
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

useBodyScrollLock(toRef(props, 'visible'))

watch(() => props.visible, async (v) => {
  if (v) {
    // reset form
    name.value = ''
    tier.value = 2
    category.value = 'forward'
    lr.value = false
    icon.value = ''
    firstAlias.value = ''
    saving.value = false
    dragY.value = 0
    await nextTick()
    nameInputRef.value?.focus()
  }
})

const categoryOptions = computed<ChipOption[]>(() =>
  CATEGORIES.map((c) => ({ value: c, label: c })),
)
function setCategory(v: string | string[]) {
  category.value = v as Category
}

const TIERS: Tier[] = [1, 2, 3, 4, 5, 6]

const canSave = computed(() => !saving.value && name.value.trim().length > 0)

async function onSave(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  try {
    const id = await tricks.create({
      name: name.value,
      tier: tier.value,
      category: category.value,
      lr: lr.value,
      icon: icon.value || null,
      firstAlias: firstAlias.value || null,
    })
    emit('created', id)
    emit('close')
  } catch (err) {
    saving.value = false
    const message = err instanceof Error ? err.message : 'Failed to create trick'
    ui.showError(message)
  }
}
</script>

<template>
  <Teleport to="body">
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
            class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[90dvh] overflow-y-auto touch-pan-y overscroll-contain"
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
            <div class="flex justify-center pb-2 -mt-1">
              <div class="w-10 h-1 rounded-full bg-border-2" />
            </div>

            <div class="flex items-center gap-2 mb-3">
              <h2 class="text-lg font-semibold flex-1">New trick</h2>
              <button
                type="button"
                class="p-1 text-muted hover:text-fg"
                aria-label="Close"
                @click="emit('close')"
              ><IconClose :size="18" stroke="1.75" /></button>
            </div>

            <section class="mb-4">
              <label
                for="trick-name"
                class="block text-xs uppercase tracking-wide text-muted mb-1.5"
              >Name</label>
              <input
                id="trick-name"
                ref="nameInputRef"
                v-model="name"
                type="text"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
                class="w-full px-3 py-2 text-sm outline-none"
                :style="{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-g-fg)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
                @keydown.enter.prevent="onSave"
              >
            </section>

            <section class="mb-4">
              <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Tier</h3>
              <div class="flex gap-1">
                <button
                  v-for="t in TIERS"
                  :key="t"
                  type="button"
                  class="flex-1 py-2 text-sm transition-colors"
                  :style="t === tier
                    ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontWeight: 600 }
                    : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
                  :class="t === tier ? '' : 'gw-glass-strong'"
                  @click="tier = t"
                >T{{ t }}</button>
              </div>
            </section>

            <section class="mb-4">
              <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Category</h3>
              <ChipFilter
                :options="categoryOptions"
                :model-value="category"
                @update:model-value="setCategory"
              />
            </section>

            <section class="mb-4">
              <label class="flex items-center justify-between gap-3 cursor-pointer">
                <span class="text-sm">Left/Right variants</span>
                <span class="relative inline-flex items-center">
                  <input
                    v-model="lr"
                    type="checkbox"
                    class="peer sr-only"
                  >
                  <span
                    class="w-10 h-6 rounded-full transition-colors"
                    :style="lr
                      ? { background: 'var(--color-g-brand)' }
                      : { background: 'rgba(255,255,255,0.12)' }"
                  />
                  <span
                    class="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    :style="lr ? { transform: 'translateX(16px)' } : {}"
                  />
                </span>
              </label>
            </section>

            <section class="mb-4">
              <label
                for="trick-icon"
                class="block text-xs uppercase tracking-wide text-muted mb-1.5"
              >Icon <span class="text-[10px] normal-case opacity-60">(optional)</span></label>
              <input
                id="trick-icon"
                v-model="icon"
                type="text"
                maxlength="32"
                placeholder="Up to 3 emojis"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                class="w-full px-3 py-2 text-sm outline-none"
                :style="{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-g-fg)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
              >
            </section>

            <section class="mb-4">
              <label
                for="trick-alias"
                class="block text-xs uppercase tracking-wide text-muted mb-1.5"
              >Alias <span class="text-[10px] normal-case opacity-60">(optional)</span></label>
              <input
                id="trick-alias"
                v-model="firstAlias"
                type="text"
                placeholder="Another name for this trick"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
                class="w-full px-3 py-2 text-sm outline-none"
                :style="{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-g-fg)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
              >
            </section>

            <div class="mt-5 pt-3 border-t border-border flex gap-2">
              <button
                type="button"
                class="flex-1 py-2 text-sm gw-glass-strong"
                :style="{
                  color: 'var(--color-g-fg-muted)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
                @click="emit('close')"
              >Cancel</button>
              <button
                type="button"
                class="flex-1 py-2 text-sm font-semibold disabled:opacity-40"
                :style="{
                  background: 'var(--color-g-brand)',
                  color: 'var(--color-g-base)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
                :disabled="!canSave"
                @click="onSave"
              >{{ saving ? 'Saving…' : 'Create trick' }}</button>
            </div>
          </div>
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

- [ ] **Step 2: Type-check + tests + build**

```bash
npx vue-tsc -b --noEmit && npm test && npm run build
```
Expected: clean / 156 / clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/TrickCreationSheet.vue
git commit -m "Add-new-trick: TrickCreationSheet component

Form sheet using the Phase 5 unified two-layer pattern (.sheet-panel-anim
outer + .sheet-panel inner). Fields: name (required, autofocus on open),
tier (6-segment selector default 2), category (ChipFilter default forward),
LR toggle (custom switch with brand-color fill), optional icon (text input
maxlength 32), optional first alias. Save disabled until name non-empty.
On save: calls tricksStore.create, emits 'created' with the id, then
'close' so the parent can hand off to TrickSheet for further editing.
Errors push a toast via uiStore.showError.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Wire FAB + handler in `Tricks.vue`

**Files:**
- Modify: `src/pages/Tricks.vue`

- [ ] **Step 1: Add imports**

In the existing import block at top of `<script setup>`, append/extend:

```ts
import TrickCreationSheet from '../components/TrickCreationSheet.vue'
```

In the icons import line (currently `import { IconFavOn, IconSearch, IconFilter, IconClose } from '../icons'`), add `IconPlus`:

```ts
import { IconFavOn, IconSearch, IconFilter, IconClose, IconPlus } from '../icons'
```

- [ ] **Step 2: Add state + handler**

Below the existing refs / computeds, add:

```ts
const creationSheetOpen = ref(false)

function onTrickCreated(id: string): void {
  creationSheetOpen.value = false
  ui.openSheet(id)
}
```

- [ ] **Step 3: Add FAB markup + creation-sheet wiring**

In `<template>`, find the existing `<TricksFilterSheet :visible="filterSheetOpen" @close="filterSheetOpen = false" />` line near the end. AFTER it (still inside the page-shell wrapper but at the same nesting level), add:

```html
    <button
      type="button"
      class="fab"
      aria-label="Create new trick"
      @click="creationSheetOpen = true"
    >
      <IconPlus :size="18" stroke="1.75" />
      <span>New trick</span>
    </button>

    <TrickCreationSheet
      :visible="creationSheetOpen"
      @close="creationSheetOpen = false"
      @created="onTrickCreated"
    />
```

- [ ] **Step 4: Add FAB style**

In the existing `<style scoped>` block (after `.sticky-bar.hidden`), append:

```css
.fab {
  position: fixed;
  right: 1rem;
  bottom: calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem);
  height: 44px;
  padding: 0 16px 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.18),
    0 4px 16px rgba(0, 0, 0, 0.30);
  z-index: 30;
  transition: transform var(--motion-g-fast) var(--ease-g-out);
}
.fab:active {
  transform: scale(0.95);
}
```

- [ ] **Step 5: Type-check + tests + build**

```bash
npx vue-tsc -b --noEmit && npm test && npm run build
```
Expected: clean / 156 / clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Tricks.vue
git commit -m "Add-new-trick: Tricks page FAB + creation-sheet wiring

Apple-glass pill FAB matching Sequences/Graph (label 'New trick',
IconPlus glyph, bottom-right, position: fixed, safe-area-aware bottom
calc, motion-g-fast tap-active transition). On click, opens
TrickCreationSheet. On 'created' emit, closes the create sheet and
immediately calls ui.openSheet(id) so the user can fill extended
fields (entry/exit/video/multi-aliases/tags) via the existing TrickSheet
edit flow — minimal create form by design.

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
Expected: 156/156 + clean build.

- [ ] **Step 2: Manual smoke test (controller responsibility)**

On dev server, on iOS PWA:
- /tricks shows new "New trick" FAB bottom-right with glass pill chrome.
- Tap FAB → creation sheet slides up + fades in.
- Name input is auto-focused.
- Save button disabled until name is typed.
- Tap a tier segment → it highlights; default is T2.
- Tap category chips → single-select swaps.
- Toggle LR → switch slides + color fills brand.
- Type optional icon and alias.
- Tap Save → sheet slides down + fades out, TrickSheet for the new trick opens immediately.
- New trick is visible in the Tricks list (current sort applied).
- Drag-to-close (drag panel down > 100px) closes without saving.
- Backdrop tap closes without saving.
- Cancel button closes without saving.

- [ ] **Step 3: Update `spec/SESSION-HANDOFF.md`**

Add a "Add new trick" subsection at the top of "What's shipped". Update the State block with new HEAD + commit count + test count (156). Add a Decisions log entry. Update the "Prompt for new session" with new HEAD.

Add to Decisions log:

> - DECIDED 2026-06-27 (Add-new-trick): Tricks page gets a "New trick" FAB matching the Sequences/Graph Apple-glass pill pattern. Tap opens `TrickCreationSheet` (new component using the Phase 5 two-layer sheet pattern). Minimal form: name + tier + category + LR + optional icon + optional first alias. Extended fields (entry/exit/video/multi-aliases/tags) are intentionally deferred to the existing TrickSheet edit flow — the post-save handler closes the create sheet and immediately calls `ui.openSheet(newId)` so the user can fill them in without an extra navigation step. `tricksStore.create()` action throws on empty name and defaults entry/exit to '2/f', status to 'Not Started', and all progress fields to null.

- [ ] **Step 4: Final commit**

```bash
git add spec/SESSION-HANDOFF.md
git commit -m "SESSION-HANDOFF: add-new-trick shipped

Adds the add-new-trick subsection at the top of 'What's shipped'.
Captures the minimal-form + post-save-opens-TrickSheet design, the
new tricksStore.create action, and the FAB-on-Tricks pattern.
Decisions log entry covers the deferred-fields policy. Updates new-
session prompt HEAD ref + test count (150 → 156).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Don't push automatically**

Stop here. User pushes manually when ready.

---

## Self-review checklist (run after writing this plan, before handoff)

- [ ] Every spec section has at least one task implementing it.
- [ ] No "TBD" / "TODO" placeholders.
- [ ] `tricksStore.create` signature in Task 1 matches the call site in Task 2.
- [ ] `TrickCreationSheet`'s `'created'` emit shape matches Task 3's `onTrickCreated(id: string)` handler.
- [ ] FAB style in Task 3 matches the established Sequences/Graph FAB recipe exactly.
- [ ] All `git commit` messages include the `Co-Authored-By` line.
