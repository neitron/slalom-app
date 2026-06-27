# Add new trick — design

Date: 2026-06-27
Predecessor: Phase 6 polish round 2 (Tricks page chrome) + Phase 5 (sheet pattern)

## Purpose

Close a critical UX gap: the Tricks page currently has no way to add a new trick. The only path to "more tricks" is the database seed. After this ships, the user can tap a FAB on the Tricks page, fill a minimal form, and the new trick appears in the list — ready for further editing in the existing `TrickSheet`.

## Scope

**In scope:**
- New FAB on the Tricks page (`Apple-glass pill with label`, matches Sequences/Graph FABs from Phase 6 polish R2).
- New `TrickCreationSheet.vue` component using the unified Phase 5 sheet choreography (two-layer `.sheet-panel-anim` + `.sheet-panel`, slide-up + fade, drag-to-close, reduced-motion fallback).
- Minimal form: name + tier + category + LR toggle + optional icon (emoji) + optional first alias.
- New `tricksStore.create(input)` action that builds a complete `Trick`, generates an id via the existing `upsertTrick` flow, and inserts into local state.
- Post-save behavior: close the create sheet, then immediately open the existing `TrickSheet` for the just-created trick (user can fill extended fields like video / multiple aliases / tags / entry / exit).

**Out of scope:**
- Editing extended fields inline in the create sheet (entry, exit, video, tags, multiple aliases, fav). All deferred to `TrickSheet` edit flow that opens automatically after create.
- Auto-positioning new trick on the Graph (no `node_x`/`node_y`; the Graph layout will place via fibonacci default when next loaded).
- Duplicate-name detection / dedup. Allow duplicates for now — user-facing concern only, not a data integrity issue.
- Server-side validation (client-only form check).
- Bulk add / import flow.

## Decisions

### FAB

Same Apple-glass pill pattern as the Sequences/Graph FABs (Decisions log 2026-06-27 R2 follow-up — FAB style):

- 44px tall, `padding: 0 16px 0 14px`, `border-radius: 999px`
- `background: rgba(255, 255, 255, 0.10)`, `backdrop-filter: blur(24px) saturate(180%)`
- `inset 0 0 0 0.5px rgba(255, 255, 255, 0.18)` hairline border, `0 4px 16px rgba(0, 0, 0, 0.30)` drop shadow
- White text (label "New trick") + `IconPlus` (18px, stroke 1.75) on the left
- `bottom: calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem)`, `right: 1rem`, `z-index: 30`
- Tap-active scale via `var(--motion-g-fast) var(--ease-g-out)` transition

Always visible on Tricks page (Tricks has no sub-tabs; FAB is unconditional).

### TrickCreationSheet component

New file: `src/components/TrickCreationSheet.vue`. Uses the unified sheet pattern from Phase 5:

```html
<Teleport to="body">
  <Transition name="sheet">
    <div v-if="visible" class="fixed inset-0 z-40 flex items-end" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
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
          ...form content...
        </div>
      </div>
    </div>
  </Transition>
</Teleport>
```

Form layout (top-to-bottom inside the panel):

1. **Drag handle** (`w-10 h-1 rounded-full bg-border-2`, top center, matches other sheets).
2. **Header row**: `<h2>New trick</h2>` + Close button (`IconClose`).
3. **Name input** (full width):
   - Label `<label>Name</label>` (text-xs uppercase muted)
   - `<input type="text" v-model="name" autofocus />` with Glasswork chrome (background `rgba(255,255,255,0.06)`, `border-radius: var(--radius-g-chip)`, padding `px-3 py-2`)
   - Validation: trimmed name must be non-empty; otherwise Save disabled.
4. **Tier picker** (6-segment selector, 1–6):
   - Section label `<h3>Tier</h3>` (text-xs uppercase muted)
   - 6 buttons in a flex row, equal width, active style mirrors the Glasswork active-segment pattern (background `var(--color-g-fg)`, text `var(--color-g-base)`, `border-radius: var(--radius-g-chip)`). Inactive: `gw-glass-strong`, muted text.
   - Default: tier 2.
5. **Category picker** (`ChipFilter` single-select, existing component):
   - Section label `<h3>Category</h3>`
   - Options: all 9 entries from `CATEGORIES` (forward, backward, cross, eagle, one-foot, sitting, spin, seven, wheeling). No "all" option.
   - Default: "forward".
6. **LR toggle**:
   - Row: `<span>Left/Right variants</span>` + toggle switch (right-aligned).
   - Toggle = Glasswork switch (TBD — use Tailwind peer + checkbox pattern OR a small Switch component). Default: off.
7. **Icon (optional)**:
   - Label `<label>Icon (optional)</label>`
   - `<input type="text" v-model="icon" maxlength="32" placeholder="Up to 3 emojis" />`
   - Use existing `MAX_TRICK_EMOJIS` clamp + grapheme count on save.
8. **First alias (optional)**:
   - Label `<label>Alias (optional)</label>`
   - `<input type="text" v-model="firstAlias" placeholder="Another name for this trick" />`
9. **Action row** (bottom of panel, with `border-top` divider):
   - **Save** button: `gw-glass-strong` brand-fill style (`background: var(--color-g-brand); color: var(--color-g-base)`), full-width or right-aligned. Disabled until `name.trim()` is non-empty. Label "Create trick".
   - **Cancel** button: `gw-glass-strong` muted style, left of Save. Calls `emit('close')`.

Component props/emits:

```ts
type Props = { visible: boolean }
type Emits = {
  (e: 'close'): void
  (e: 'created', id: string): void  // emitted after successful create
}
```

State (local refs):
- `name: string` (default '')
- `tier: Tier` (default 2)
- `category: Category` (default 'forward')
- `lr: boolean` (default false)
- `icon: string` (default '')
- `firstAlias: string` (default '')
- `saving: boolean` (default false, prevents double-submit)
- Standard sheet refs: `panelRef`, `dragY`, `dragging`, etc. (copied from existing sheet pattern)

On visible→true: reset all form fields. On visible→false: do nothing (next open resets).

On submit:
- Set `saving = true`
- Call `tricksStore.create({ name, tier, category, lr, icon: icon || null, firstAlias: firstAlias || null })`
- Await; on success, emit `'created'` with the new id, then emit `'close'`
- On error, set `saving = false`, push a toast via `uiStore.showError(message)`

### tricksStore.create action

New action in `src/stores/tricks.ts`:

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
  const aliasArr: string[] = input.firstAlias?.trim() ? [input.firstAlias.trim()] : []
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
}
```

Defaults:
- `entry: '2/f'`, `exit: '2/f'` — most common skating stance (two-foot forward). User can edit later via TrickSheet.
- `aliases: []` unless `firstAlias` provided.
- `mainAlias: null` (no main alias picked).
- `icon: null` unless input provided.
- All progress fields null; status 'Not Started'.

### Tricks page integration

Edit `src/pages/Tricks.vue`:

1. Add `import TrickCreationSheet from '../components/TrickCreationSheet.vue'`
2. Add `import { IconPlus } from '../icons'` (alongside existing imports)
3. Add `const creationSheetOpen = ref(false)` ref
4. Add FAB markup as sibling of `<TricksFilterSheet>` (so position:fixed anchors to viewport, not page-scroll):

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
   ```

5. Add the creation sheet:

   ```html
   <TrickCreationSheet
     :visible="creationSheetOpen"
     @close="creationSheetOpen = false"
     @created="onTrickCreated"
   />
   ```

6. Add the `onTrickCreated` handler:

   ```ts
   function onTrickCreated(id: string): void {
     creationSheetOpen.value = false
     ui.openSheet(id)  // immediately open TrickSheet for further edits
   }
   ```

7. Add the FAB styles in `<style scoped>` block (same recipe as Sequences/Graph FABs — copy verbatim):

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

## Components touched

- (New) `src/components/TrickCreationSheet.vue` — the form sheet (~200 lines).
- `src/stores/tricks.ts` — add `create` action.
- `src/pages/Tricks.vue` — FAB markup + style + creation-sheet wiring + `onTrickCreated` handler.

That's it. No router changes, no other files touched.

## Risks and open questions

- **`mainAlias` field**: existing TrickSheet handles a separate `mainAlias` (one alias promoted to display name override). The create sheet only takes a "first alias" — we leave `mainAlias: null`. User can promote via the existing TrickSheet flow if desired.
- **Toast on success**: spec doesn't show a toast; just the flow close → open TrickSheet. If user wants explicit confirmation, add `ui.pushToast('info', 'Trick created')` before opening TrickSheet. Currently leaning against it because the immediate TrickSheet open IS the confirmation.
- **`autofocus` on name input**: standard pattern; iOS Safari sometimes ignores it on dynamically-inserted elements. If name input doesn't focus on open, can wire `nextTick` + `nameInputRef?.focus()` in a `watch(() => props.visible)`.
- **Sheet height**: form is short (~6 sections × ~60px) — `max-h-[90dvh]` is more than enough. No scrolling expected on tall phones.
- **Tier control styling**: 6 equal segments may feel cramped on narrow screens. If so, drop to a smaller width per segment via `flex-1` and `min-width: 0`.

## Acceptance criteria

- Tricks page bottom-right shows a glass FAB labeled "New trick" with IconPlus.
- Tapping the FAB opens the creation sheet with slide-up animation (or fade-only with Reduce Motion).
- Form fields: name (text), tier (6 segments, default 2), category (chip filter, default forward), LR toggle (default off), optional icon input, optional first-alias input.
- Save button disabled until name is non-empty (trimmed).
- Tapping Save: trick appears in the list (sorted per current sort), the creation sheet closes, and the existing TrickSheet opens for the new trick id.
- Cancel button or backdrop tap closes the creation sheet without saving.
- Drag-to-close gesture works (matches all other sheets).
- 150/150 tests pass + 1 new test for `tricksStore.create` (defaults, empty-name guard, alias handling).
- Build clean.
