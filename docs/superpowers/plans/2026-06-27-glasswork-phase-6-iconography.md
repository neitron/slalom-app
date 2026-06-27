# Glasswork Phase 6 — Iconography implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every Lucide-style inline SVG icon and every unicode-glyph-as-UI-affordance with a coherent Tabler-based icon set, clearing the SHIP GATE for the Glasswork redesign.

**Architecture:** Add `@tabler/icons-vue`. Re-export selected Tabler components under semantic project-local names from `src/icons/index.ts` (so consumers never import from `@tabler/icons-vue` directly). Bespoke Vue components only for Leg-L/R/both/none typographic glyphs that no library carries. Touch every consuming site in a single PR organized by glyph family.

**Tech Stack:** Vue 3.5 (script setup, composition API), TypeScript, Vite, vue-router 4 (hash history), Vitest, Tailwind 4. Package manager: npm (`package-lock.json`).

**Spec:** `spec/2026-06-27-glasswork-phase-6-iconography-design.md`. Whenever this plan refers to a "Tabler icon for X" or "the spec's mapping", that table is authoritative — re-read it if anything below seems incomplete.

---

## Conventions used throughout this plan

**Verification commands** (run from `/Users/kzubenko/Projects/slalom-app`):

- `npm run test` — Vitest suite. Must stay at 144/144 passing.
- `npm run type-check` — `vue-tsc --noEmit`. Must succeed with zero errors.
- `npm run build` — full build (`vue-tsc -b && vite build`). Must succeed.
- `npm run dev` — dev server at `http://localhost:5173/#/` for manual verification.

**Cohesion target:** existing TabBar SVGs use `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"` on a 24-viewBox. Tabler defaults to `stroke-width="2"`. Every Tabler usage in the migration must pass `:stroke="1.75"` to match.

**Sizing:** Tabler accepts `:size` as a number. Pick the size that matches the visual footprint of the replaced glyph at each site. Typical sizes:
- Sheet close buttons: `18`
- Inline-text affordances: `16`
- Header buttons: `18` or `20`
- TabBar (unchanged): N/A

**Import pattern:** every consumer imports from `'../icons'` (or `'../../icons'` for pages), never from `'@tabler/icons-vue'`.

```ts
import { IconClose, IconFavOn, IconTransition } from '../icons'
```

**Commit cadence:** one commit per task, with the commit message shown in the task's final step. Frequent small commits.

---

## File structure to be created

```
src/icons/
├── index.ts            # NEW — Tabler re-exports under semantic names + bespoke Leg exports
├── README.md           # NEW — naming rule + add-an-icon checklist
└── leg/
    ├── LegL.vue        # NEW — bespoke "L" typography glyph
    ├── LegR.vue        # NEW — bespoke "R" typography glyph
    ├── LegBoth.vue     # NEW — bespoke "L·R" typography glyph
    └── LegNone.vue     # NEW — bespoke "—" typography glyph

src/pages/spec/
└── IconsPreview.vue    # NEW — dev-only preview route
```

Modified files (in sweep order):

- Sweep 1 (close ✕): `TrickSheet.vue`, `TransitionSheet.vue`, `SequenceSheet.vue`, `GeneratorSheet.vue`, `TricksFilterSheet.vue` (NOTE: no ✕ at the moment — verify before touching), `GraphBubble.vue`, `EdgeBubble.vue`, `RateFeedback.vue`, `pages/Graph.vue` (cancel button)
- Sweep 2 (favorites ★/☆): `TrickSheet.vue`, `TrickCard.vue`, `ForeignLearningList.vue`, `TricksFilterSheet.vue`, `pages/Tricks.vue`
- Sweep 3 (chevrons ▾/▸ + arrows ↔ ⇄ ↗ → + check ✓ + plus ➕): `Heatmap14.vue`, `pages/People.vue`, `pages/Install.vue`, `SequenceChain.vue`, `TransitionSheet.vue`, `EdgeBubble.vue`, `TransitionCard.vue`, `pages/ForeignProfile.vue`, `pages/Diagnostics.vue`, `pages/Settings.vue`, `GraphBubble.vue` (➕ buttons), `pages/Graph.vue` (↔ Transitions link)
- Sweep 4 (button-icon emoji 🎲 ⌂ ✥): `pages/Sequences.vue`, `GeneratorSheet.vue`, `GraphView.vue` (reset-view), `pages/Graph.vue` (Move toggle)
- Sweep 5 (inline SVGs): `pages/Tricks.vue` (search), `TrickCard.vue` (video), `ForeignLearningList.vue` (eye + video), `pages/Install.vue` (share)
- Sweep 6 (RateFeedback): `RateFeedback.vue` (close X over countdown ring)

---

## Task 1: Install Tabler + create the icons module

**Files:**
- Modify: `package.json` (add dependency via `npm install`)
- Modify: `package-lock.json` (updated by npm)
- Create: `src/icons/index.ts`
- Create: `src/icons/README.md`

- [ ] **Step 1.1: Install @tabler/icons-vue**

```bash
cd /Users/kzubenko/Projects/slalom-app
npm install @tabler/icons-vue
```

Expected: `package.json` gains `"@tabler/icons-vue": "^X.Y.Z"` under `dependencies`. Pin the major version when reviewing the diff — if npm picked a `^3` or newer, accept it.

- [ ] **Step 1.2: Create `src/icons/index.ts` with the semantic re-export layer**

Path: `src/icons/index.ts`

```ts
// Phase 6 icon module — re-exports Tabler under semantic project-local names.
//
// Consumers MUST import from '../icons' (or '../../icons' from pages),
// never directly from '@tabler/icons-vue'. This insulates call sites from
// upstream renames and leaves a single edit-point for future bespoke swaps.
//
// Cohesion note: every consumer must pass :stroke="1.75" to match the
// existing TabBar SVGs (Tabler defaults to 2).

export {
  IconX as IconClose,
  IconSearch,
  IconStar as IconFavOff,
  IconStarFilled as IconFavOn,
  IconLink as IconTransition,
  IconArrowsRightLeft as IconBidi,
  IconArrowLeft as IconBack,
  IconArrowRight,
  IconArrowUpRight as IconTrendUp,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconDots as IconMenuH,
  IconDotsVertical as IconMenuV,
  IconCheck,
  IconPlus,
  IconDice5 as IconGenerate,
  IconFocusCentered as IconResetView,
  IconArrowsMove as IconMoveMode,
  IconUsers as IconPeople,
  IconUser as IconProfile,
  IconSettings,
  IconCloudUp as IconSyncUp,
  IconCloudDown as IconSyncDown,
  IconCalendar,
  IconShare2 as IconShare,
  IconAdjustmentsHorizontal as IconFilter,
  IconEye,
  IconVideo,
  IconBrandYoutube,
} from '@tabler/icons-vue'

export { default as LegL } from './leg/LegL.vue'
export { default as LegR } from './leg/LegR.vue'
export { default as LegBoth } from './leg/LegBoth.vue'
export { default as LegNone } from './leg/LegNone.vue'

export type IconSize = 16 | 18 | 20 | 24
```

- [ ] **Step 1.3: Create `src/icons/README.md`**

Path: `src/icons/README.md`

```markdown
# src/icons

Semantic icon module for the Glasswork redesign (Phase 6).

## Rule
Consumers import only from `'../icons'`. Never import directly from
`@tabler/icons-vue` — call sites must use the semantic re-exports below.

## Adding an icon

1. Pick the Tabler icon at https://tabler.io/icons.
2. Re-export it from `index.ts` under a semantic project-local name
   (`IconClose`, not `IconX`). If the Tabler name already reads
   semantically (`IconSearch`, `IconCheck`), keep it.
3. Use it: `import { IconYourName } from '../icons'`.
4. Pass `:stroke="1.75"` and `:size="16|18|20|24"` to match TabBar
   cohesion and the sizing convention.

## Bespoke
- `leg/LegL.vue`, `leg/LegR.vue`, `leg/LegBoth.vue`, `leg/LegNone.vue` —
  typography-based stance glyphs. No library has these.
```

- [ ] **Step 1.4: Verify type-check + tests still pass**

```bash
npm run type-check && npm run test
```

Expected: zero TS errors; 144/144 tests pass. Nothing imports from `../icons` yet, so this is a baseline confirmation that the new file did not break imports elsewhere.

- [ ] **Step 1.5: Commit**

```bash
git add package.json package-lock.json src/icons/index.ts src/icons/README.md
git commit -m "$(cat <<'EOF'
Phase 6 step 1: install @tabler/icons-vue + create src/icons module

Adds the semantic re-export layer. Consumers will import from '../icons'
under names like IconClose / IconFavOn / IconTransition — never directly
from @tabler/icons-vue. Pin cohesion: every consumer must pass
:stroke="1.75" to match the existing TabBar SVGs (Tabler defaults to 2).
EOF
)"
```

---

## Task 2: Create the four bespoke Leg glyph components

**Files:**
- Create: `src/icons/leg/LegL.vue`
- Create: `src/icons/leg/LegR.vue`
- Create: `src/icons/leg/LegBoth.vue`
- Create: `src/icons/leg/LegNone.vue`

These are typographic glyphs rendered as SVG `<text>` so they inherit `currentColor` and scale via a `size` prop. Bold weight + tight letter-spacing so "L", "R", "L·R", "—" read clearly at 16px.

- [ ] **Step 2.1: Create `LegL.vue`**

Path: `src/icons/leg/LegL.vue`

```vue
<script setup lang="ts">
type Props = { size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <text
      x="12"
      y="18"
      text-anchor="middle"
      font-family="ui-rounded, -apple-system, system-ui, sans-serif"
      font-weight="700"
      font-size="20"
      letter-spacing="-0.5"
    >L</text>
  </svg>
</template>
```

- [ ] **Step 2.2: Create `LegR.vue`**

Path: `src/icons/leg/LegR.vue`

```vue
<script setup lang="ts">
type Props = { size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <text
      x="12"
      y="18"
      text-anchor="middle"
      font-family="ui-rounded, -apple-system, system-ui, sans-serif"
      font-weight="700"
      font-size="20"
      letter-spacing="-0.5"
    >R</text>
  </svg>
</template>
```

- [ ] **Step 2.3: Create `LegBoth.vue`**

Path: `src/icons/leg/LegBoth.vue`

```vue
<script setup lang="ts">
type Props = { size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <text
      x="12"
      y="18"
      text-anchor="middle"
      font-family="ui-rounded, -apple-system, system-ui, sans-serif"
      font-weight="700"
      font-size="13"
      letter-spacing="-0.4"
    >L·R</text>
  </svg>
</template>
```

- [ ] **Step 2.4: Create `LegNone.vue`**

Path: `src/icons/leg/LegNone.vue`

```vue
<script setup lang="ts">
type Props = { size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M6 12 L18 12" />
  </svg>
</template>
```

- [ ] **Step 2.5: Verify type-check + tests still pass**

```bash
npm run type-check && npm run test
```

Expected: zero TS errors; 144/144 tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add src/icons/leg/
git commit -m "$(cat <<'EOF'
Phase 6 step 2: bespoke Leg glyph components (L / R / L·R / —)

SVG <text> glyphs in 24-viewBox, inherit currentColor, accept a size
prop. Initial picks: ui-rounded font, bold weight, tight letter-spacing.
The 16px legibility test happens against the /spec/icons preview route
in task 3 — adjust here if "L·R" doesn't read.
EOF
)"
```

---

## Task 3: Create the `/spec/icons` preview route

**Files:**
- Create: `src/pages/spec/IconsPreview.vue`
- Modify: `src/router.ts` (add route under existing DEV block)

- [ ] **Step 3.1: Create the preview page**

Path: `src/pages/spec/IconsPreview.vue`

```vue
<script setup lang="ts">
import {
  IconClose,
  IconSearch,
  IconFavOn,
  IconFavOff,
  IconTransition,
  IconBidi,
  IconBack,
  IconArrowRight,
  IconTrendUp,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconMenuH,
  IconMenuV,
  IconCheck,
  IconPlus,
  IconGenerate,
  IconResetView,
  IconMoveMode,
  IconPeople,
  IconProfile,
  IconSettings,
  IconSyncUp,
  IconSyncDown,
  IconCalendar,
  IconShare,
  IconFilter,
  IconEye,
  IconVideo,
  IconBrandYoutube,
  LegL,
  LegR,
  LegBoth,
  LegNone,
} from '../../icons'

type IconEntry = { name: string; component: any }

const tablerIcons: IconEntry[] = [
  { name: 'IconClose', component: IconClose },
  { name: 'IconSearch', component: IconSearch },
  { name: 'IconFavOn', component: IconFavOn },
  { name: 'IconFavOff', component: IconFavOff },
  { name: 'IconTransition', component: IconTransition },
  { name: 'IconBidi', component: IconBidi },
  { name: 'IconBack', component: IconBack },
  { name: 'IconArrowRight', component: IconArrowRight },
  { name: 'IconTrendUp', component: IconTrendUp },
  { name: 'IconChevronDown', component: IconChevronDown },
  { name: 'IconChevronRight', component: IconChevronRight },
  { name: 'IconChevronLeft', component: IconChevronLeft },
  { name: 'IconMenuH', component: IconMenuH },
  { name: 'IconMenuV', component: IconMenuV },
  { name: 'IconCheck', component: IconCheck },
  { name: 'IconPlus', component: IconPlus },
  { name: 'IconGenerate', component: IconGenerate },
  { name: 'IconResetView', component: IconResetView },
  { name: 'IconMoveMode', component: IconMoveMode },
  { name: 'IconPeople', component: IconPeople },
  { name: 'IconProfile', component: IconProfile },
  { name: 'IconSettings', component: IconSettings },
  { name: 'IconSyncUp', component: IconSyncUp },
  { name: 'IconSyncDown', component: IconSyncDown },
  { name: 'IconCalendar', component: IconCalendar },
  { name: 'IconShare', component: IconShare },
  { name: 'IconFilter', component: IconFilter },
  { name: 'IconEye', component: IconEye },
  { name: 'IconVideo', component: IconVideo },
  { name: 'IconBrandYoutube', component: IconBrandYoutube },
]

const legIcons: IconEntry[] = [
  { name: 'LegL', component: LegL },
  { name: 'LegR', component: LegR },
  { name: 'LegBoth', component: LegBoth },
  { name: 'LegNone', component: LegNone },
]

const sizes = [16, 18, 20, 24]
</script>

<template>
  <main class="min-h-screen p-4" style="background: var(--color-g-base); color: var(--color-g-fg);">
    <h1 class="text-lg font-semibold mb-1">Phase 6 icon preview</h1>
    <p class="text-xs opacity-60 mb-4">All icons at 16 / 18 / 20 / 24. Default and accent color.</p>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">TabBar (kept as-is, for cohesion check)</h2>
      <div class="flex gap-4 items-center p-3 rounded-lg" style="background: var(--color-g-glass);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14V10.5"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6.5 7.5L11 16.5M17.5 7.5L13 16.5M6.5 6h11"/></svg>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5"/><path d="M14 11a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5"/></svg>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">Tabler (default color)</h2>
      <div class="grid grid-cols-1 gap-1">
        <div
          v-for="icon in tablerIcons"
          :key="icon.name"
          class="flex items-center gap-4 px-2 py-1.5 rounded"
          style="background: var(--color-g-glass);"
        >
          <span class="text-[11px] font-mono opacity-70 w-36 truncate">{{ icon.name }}</span>
          <component
            v-for="s in sizes"
            :key="s"
            :is="icon.component"
            :size="s"
            :stroke="1.75"
          />
        </div>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">Tabler (accent color)</h2>
      <div class="grid grid-cols-1 gap-1" style="color: var(--color-g-brand);">
        <div
          v-for="icon in tablerIcons.slice(0, 6)"
          :key="icon.name + '-acc'"
          class="flex items-center gap-4 px-2 py-1.5 rounded"
          style="background: var(--color-g-glass);"
        >
          <span class="text-[11px] font-mono opacity-70 w-36 truncate">{{ icon.name }}</span>
          <component
            v-for="s in sizes"
            :key="s"
            :is="icon.component"
            :size="s"
            :stroke="1.75"
          />
        </div>
      </div>
    </section>

    <section class="mb-6">
      <h2 class="text-xs uppercase tracking-wide opacity-70 mb-2">Bespoke leg glyphs</h2>
      <div class="grid grid-cols-1 gap-1">
        <div
          v-for="icon in legIcons"
          :key="icon.name"
          class="flex items-center gap-4 px-2 py-1.5 rounded"
          style="background: var(--color-g-glass);"
        >
          <span class="text-[11px] font-mono opacity-70 w-36 truncate">{{ icon.name }}</span>
          <component
            v-for="s in sizes"
            :key="s"
            :is="icon.component"
            :size="s"
          />
        </div>
      </div>
    </section>
  </main>
</template>
```

- [ ] **Step 3.2: Register the route in `src/router.ts`**

Read `src/router.ts` first to confirm the current shape of the DEV-only routes block (lines ~17-50).

Add a new entry to the DEV-only routes array. After the existing `/spec/selection-options` entry (currently ending around line 48), insert:

```ts
        {
          path: '/spec/icons',
          name: 'spec-icons',
          component: () => import('./pages/spec/IconsPreview.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
```

The full DEV block in `src/router.ts` should now contain 6 entries: tokens, rate-options, node-options, edge-options, selection-options, **icons**.

- [ ] **Step 3.3: Verify type-check + tests still pass**

```bash
npm run type-check && npm run test
```

Expected: zero TS errors; 144/144 tests pass.

- [ ] **Step 3.4: Manual verification**

```bash
npm run dev
```

Open `http://localhost:5173/#/spec/icons` in a desktop browser AND on your phone (use your LAN IP). Confirm:
- All Tabler icons render at all 4 sizes
- No console errors
- Visual stroke weight of Tabler icons next to TabBar mark row looks coherent (1.75 stroke matched)
- Leg glyphs read as L, R, both, none at 16px on the phone — if "L·R" reads cramped, edit `src/icons/leg/LegBoth.vue` and tune `font-size` / `letter-spacing` (try 12 / -0.3, or swap to "L|R")
- Accent-color section: icons render in brand purple

- [ ] **Step 3.5: Commit**

```bash
git add src/pages/spec/IconsPreview.vue src/router.ts
git commit -m "$(cat <<'EOF'
Phase 6 step 3: /spec/icons preview route

Lists every icon in src/icons/index.ts at 16/18/20/24, default and
accent color, with TabBar marks above for cohesion check. Dev-only via
import.meta.env.DEV gate alongside the existing spec/* routes.
EOF
)"
```

---

## Task 4 — Sweep 1: close buttons (✕ → IconClose)

Eight sites currently render `✕` as a button glyph. Replace each with `<IconClose :size="..." :stroke="1.75" />`.

**Files to modify (verified at plan time, file:line):**
- `src/components/TrickSheet.vue:348`
- `src/components/TransitionSheet.vue:258`
- `src/components/SequenceSheet.vue:342`
- `src/components/GeneratorSheet.vue:252`
- `src/components/GraphBubble.vue:98`
- `src/components/EdgeBubble.vue:148`
- `src/components/RateFeedback.vue:200` (deferred to Task 9 — has an animated ring around it)
- `src/pages/Graph.vue:462` (Graph "cancel" button uses `✕ cancel` — the text "cancel" stays, only the `✕` glyph is replaced)

For each file: read the file, replace the `>✕<` button glyph, add the import. Pattern shown below for the first file; apply the same shape to the others.

- [ ] **Step 4.1: Read each target file to confirm current content**

```bash
for f in src/components/TrickSheet.vue src/components/TransitionSheet.vue src/components/SequenceSheet.vue src/components/GeneratorSheet.vue src/components/GraphBubble.vue src/components/EdgeBubble.vue src/pages/Graph.vue; do
  echo "=== $f ==="
  grep -n '>✕' "$f"
done
```

Expected: each file shows the line number listed above (or close to it — line numbers may drift slightly between plan time and execution).

- [ ] **Step 4.2: Modify `src/components/TrickSheet.vue`**

Add to the `<script setup>` block's imports section (find the existing `import { ... } from 'vue'` or similar near the top):

```ts
import { IconClose } from '../icons'
```

Around line 348, the close button currently looks like:

```vue
            >✕</button>
```

The full button element ends with `>✕</button>` — replace just the `✕` text node:

```vue
            ><IconClose :size="18" :stroke="1.75" /></button>
```

If the `aria-label="Close"` attribute is not already present on this `<button>`, add it for accessibility.

- [ ] **Step 4.3: Apply the same pattern to TransitionSheet.vue, SequenceSheet.vue, GeneratorSheet.vue**

For each file:
1. Add `import { IconClose } from '../icons'` to the `<script setup>` block.
2. Replace the `>✕</button>` text node with `><IconClose :size="18" :stroke="1.75" /></button>`.
3. Ensure the button has `aria-label="Close"`.

These three sheets are structurally identical to TrickSheet — same close-button shape in the header.

- [ ] **Step 4.4: Modify `src/components/GraphBubble.vue`**

Add `import { IconClose } from '../icons'` to `<script setup>`.

Around line 98, replace the `>✕</button>` text node with `><IconClose :size="16" :stroke="1.75" /></button>` (smaller size — GraphBubble's close button is in a compact 6x6 grid).

- [ ] **Step 4.5: Modify `src/components/EdgeBubble.vue`**

Same as GraphBubble — `import { IconClose } from '../icons'`, replace `>✕</button>` with `><IconClose :size="16" :stroke="1.75" /></button>`.

- [ ] **Step 4.6: Modify `src/pages/Graph.vue`**

Add `import { IconClose } from '../icons'` to `<script setup>`.

Around line 462, the button currently reads `>✕ cancel</button>`. Replace with:

```vue
      ><span class="inline-flex items-center gap-1"><IconClose :size="14" :stroke="1.75" /> cancel</span></button>
```

(Wraps icon + text in a flex span so they sit on the same baseline.)

- [ ] **Step 4.7: Verify no `>✕<` remains in component templates**

```bash
grep -rnE ">✕" --include="*.vue" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/" | grep -v "RateFeedback"
```

Expected: zero hits (RateFeedback intentionally deferred to Task 9).

- [ ] **Step 4.8: Run type-check, tests, and build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds.

- [ ] **Step 4.9: Manual spot-check**

`npm run dev`, then open each sheet on phone (TrickSheet via tapping a trick card, TransitionSheet via tapping an edge bubble's "edit", SequenceSheet via tapping a sequence card, GeneratorSheet via the Generate button on Sequences page, GraphBubble via tapping a graph node, EdgeBubble via tapping a graph edge, Graph cancel via entering link mode then cancel). Confirm:
- Close button is visible and tappable
- Stroke weight matches surrounding UI
- 44px tap target preserved (the `<button>` size shouldn't change — only its glyph content swapped)

- [ ] **Step 4.10: Commit**

```bash
git add src/components/TrickSheet.vue src/components/TransitionSheet.vue src/components/SequenceSheet.vue src/components/GeneratorSheet.vue src/components/GraphBubble.vue src/components/EdgeBubble.vue src/pages/Graph.vue
git commit -m "$(cat <<'EOF'
Phase 6 step 4 (sweep 1): close ✕ → IconClose

Replaces unicode close glyph in 6 sheet/bubble components plus the Graph
cancel button. RateFeedback's close (over an animated countdown ring) is
deferred to its own task since the ring SVG stays.
EOF
)"
```

---

## Task 5 — Sweep 2: favorites (★/☆ → IconFavOn/IconFavOff)

**Files to modify:**
- `src/components/TrickSheet.vue:322` (`>★</button>`), `:445` (`{{ trick.mainAlias === a ? '★' : '☆' }}`), `:446` (`<span ...>★</span>`)
- `src/components/TrickCard.vue:54` (`>★</span>`)
- `src/components/ForeignLearningList.vue:94` (`<span v-if="t.fav" class="text-fav">★</span>`)
- `src/components/TricksFilterSheet.vue:179` (`{{ ui.tricksFavOnly ? '★ On' : 'Off' }}`)
- `src/pages/Tricks.vue:96` (`label: '★ Favorites'` — this is a sort-mode label string in a TS array)

**Note on TrickSheet line 426:** the body text `tap ★ to set display name` is instructional copy describing the affordance — leave the `★` character there since it points at a star icon visible in the same UI. (Or rewrite the copy to say "tap the star" — copy-level call, do whichever you prefer; both are acceptable.)

**Note on Tricks.vue:96:** the `'★ Favorites'` label is a TypeScript string in an array used for a sort cycle button display. It's not in a Vue template directly, but it does render as a button label. Rewrite the string and have the consuming component render an icon — see step 5.6.

- [ ] **Step 5.1: Modify `src/components/TrickSheet.vue`**

Add to `<script setup>`:

```ts
import { IconClose, IconFavOn, IconFavOff } from '../icons'
```

(`IconClose` should already be imported from Task 4 — extend the import line.)

Around line 322, the favorite toggle button currently:

```vue
            >★</button>
```

Replace with:

```vue
            ><IconFavOn :size="18" :stroke="1.75" /></button>
```

Around lines 445-446, the per-alias star/star-outline display:

```vue
                >{{ trick.mainAlias === a ? '★' : '☆' }}</button>
                <span v-else-if="trick.mainAlias === a" class="text-accent leading-none">★</span>
```

Replace with:

```vue
                ><component :is="trick.mainAlias === a ? IconFavOn : IconFavOff" :size="14" :stroke="1.75" /></button>
                <IconFavOn v-else-if="trick.mainAlias === a" :size="14" :stroke="1.75" class="text-accent" />
```

(The `<component :is>` dynamic is needed because the original was a ternary expression.)

- [ ] **Step 5.2: Modify `src/components/TrickCard.vue`**

Add `import { IconFavOn } from '../icons'` to `<script setup>`.

Around line 54, replace:

```vue
        >★</span>
```

With:

```vue
        ><IconFavOn :size="14" :stroke="1.75" /></span>
```

- [ ] **Step 5.3: Modify `src/components/ForeignLearningList.vue`**

Add `import { IconFavOn } from '../icons'` to `<script setup>`.

Around line 94, replace:

```vue
            <span v-if="t.fav" class="text-fav">★</span>
```

With:

```vue
            <IconFavOn v-if="t.fav" :size="14" :stroke="1.75" class="text-fav" />
```

- [ ] **Step 5.4: Modify `src/components/TricksFilterSheet.vue`**

Add `import { IconFavOn } from '../icons'` to `<script setup>`.

Around line 179, the filter toggle currently:

```vue
              >{{ ui.tricksFavOnly ? '★ On' : 'Off' }}</button>
```

Replace with:

```vue
              ><span class="inline-flex items-center gap-1">
                <IconFavOn v-if="ui.tricksFavOnly" :size="14" :stroke="1.75" />
                {{ ui.tricksFavOnly ? 'On' : 'Off' }}
              </span></button>
```

- [ ] **Step 5.5: Verify spec-routes preview**

`npm run dev` → `http://localhost:5173/#/spec/icons` to confirm IconFavOn / IconFavOff are visible. Then visit `/#/tricks` and tap a card to open TrickSheet — favorite toggle should render.

- [ ] **Step 5.6: Handle `src/pages/Tricks.vue:96` sort-mode label**

Read `src/pages/Tricks.vue` around lines 90-120 to understand the sort-modes array structure. The label `'★ Favorites'` is currently a plain string in an array.

Change strategy: leave the array key as a plain string (e.g., `'Favorites'`), and where the sort label is rendered in the template, render an `IconFavOn` next to the label when the active sort is "Favorites".

Add `import { IconFavOn } from '../icons'` to `<script setup>`.

Change `label: '★ Favorites',` to `label: 'Favorites',`.

Locate the template position where this label is rendered (search `sortMode` or the sort cycle button). Prepend `<IconFavOn v-if="sortMode === 'Favorites'" :size="14" :stroke="1.75" />` next to the label text.

If the sort-modes array is used in multiple places (e.g., a dropdown listing all options), only show the icon next to the "Favorites" entry in those displays — not for "Name", "Best", "Worst".

- [ ] **Step 5.7: Verify no `★` or `☆` remains in component templates**

```bash
grep -rnE "★|☆" --include="*.vue" --include="*.ts" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/" | grep -v "// \|tap ★ to"
```

Expected: zero hits (`tap ★ to set display name` instructional copy is acceptable to keep — that's prose, not affordance).

- [ ] **Step 5.8: Run type-check, tests, and build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds.

- [ ] **Step 5.9: Manual spot-check on phone**

- TrickSheet favorite toggle (filled when active, outline when not)
- TrickCard's favorite indicator
- ForeignLearningList read-only foreign profile view
- TricksFilterSheet — toggle "Favorites only" on/off
- Tricks page — cycle sort modes through "Favorites"

- [ ] **Step 5.10: Commit**

```bash
git add src/components/TrickSheet.vue src/components/TrickCard.vue src/components/ForeignLearningList.vue src/components/TricksFilterSheet.vue src/pages/Tricks.vue
git commit -m "$(cat <<'EOF'
Phase 6 step 5 (sweep 2): favorites ★/☆ → IconFavOn / IconFavOff

Replaces unicode star glyphs in 5 sites. Tricks page sort label
"★ Favorites" becomes plain "Favorites" with an inline IconFavOn prefix
when active. Instructional copy ("tap ★ to set display name") in
TrickSheet retained as prose describing the affordance.
EOF
)"
```

---

## Task 6 — Sweep 3: chevrons + arrows + check + plus

This sweep covers the remaining static-glyph affordances: chevrons (▾ ▸), directional arrows (↔ ⇄ → ↗ ←), the checkmark (✓), and the plus (➕).

**Files to modify:**

| File:line | Current | Replacement |
|---|---|---|
| `src/components/Heatmap14.vue:17` | `\`↗ +${...}\`` (JS template string) | refactor to render `<IconTrendUp>` in template, drop the `↗` from the string |
| `src/pages/People.vue:212` | `{{ showBlocked ? '▾' : '▸' }}` | `<component :is="showBlocked ? IconChevronDown : IconChevronRight" :size="14" :stroke="1.75" />` |
| `src/pages/Install.vue:103` | `{{ copied ? '✓ Copied' : 'Copy link' }}` | wrap in span with conditional `<IconCheck>` |
| `src/pages/Install.vue:112` | `<div class="text-rate-good text-2xl">✓</div>` | `<IconCheck :size="32" :stroke="2" class="text-rate-good" />` |
| `src/components/SequenceChain.vue:84` | `<span ...>→</span>` | `<IconArrowRight :size="14" :stroke="1.75" class="text-muted" />` |
| `src/components/TransitionSheet.vue:140` | `'⇄' : '→'` computed | refactor to render `<IconBidi>` / `<IconArrowRight>` in template |
| `src/components/TransitionSheet.vue:331` | `<span>↔ Both directions</span>` | swap `↔` for `<IconTransition>` inline |
| `src/components/EdgeBubble.vue:70` | `'⇄' : '→'` computed | same refactor as TransitionSheet:140 |
| `src/components/EdgeBubble.vue:174` | `<span>↔ both directions</span>` | swap `↔` for `<IconTransition>` inline |
| `src/components/TransitionCard.vue:19` | `'⇄' : '→'` computed | same refactor |
| `src/pages/ForeignProfile.vue:116` | inline chevron-left SVG (Back button) | `<IconChevronLeft :size="16" :stroke="2" />` |
| `src/pages/Diagnostics.vue:246` | `>← Settings</button>` | wrap in span: `><span class="inline-flex items-center gap-1"><IconBack :size="14" :stroke="1.75" /> Settings</span></button>` |
| `src/pages/Settings.vue:339` | `>Diagnostics →</button>` | `><span class="inline-flex items-center gap-1">Diagnostics <IconArrowRight :size="14" :stroke="1.75" /></span></button>` |
| `src/components/GraphBubble.vue:126,133,142` | `>➕ from L</button>`, `>➕ from R</button>`, `>➕ Transition</button>` | wrap in span with `<IconPlus>` (sizing 14, stroke 1.75) |
| `src/pages/Graph.vue:394` | `>↔ Transitions</RouterLink>` | wrap in span: `><span class="inline-flex items-center gap-1"><IconTransition :size="16" :stroke="1.75" /> Transitions</span></RouterLink>` |

- [ ] **Step 6.1: Modify `src/components/Heatmap14.vue`**

Add `import { IconTrendUp } from '../icons'` to `<script setup>`.

Read lines 10-30 to find the `if (props.sessionsDelta > 0) return ...` block. Currently returns a string like `↗ +N`. Refactor:

- Change the computed to return only the numeric portion: `\`+${props.sessionsDelta}\`` (or just `props.sessionsDelta` as a number, depending on how the template uses it).
- In the template position that renders this, prepend `<IconTrendUp v-if="props.sessionsDelta > 0" :size="12" :stroke="1.75" />` inline next to the number.

Read the existing Heatmap14 template to see exactly how the delta is rendered (likely a small badge or pill) — match the existing styling. The `↘ −N` negative-delta case may use a `↘` glyph too — if so, replace with `IconTrendUp` rotated via CSS `transform: rotate(90deg)` OR add `IconArrowRight` rotated, OR use Tabler's `IconArrowDownRight` — pick the cleanest.

- [ ] **Step 6.2: Modify `src/pages/People.vue`**

Add `import { IconChevronDown, IconChevronRight } from '../icons'` to `<script setup>`.

Around line 212, replace:

```vue
          <span>{{ showBlocked ? '▾' : '▸' }}</span>
```

With:

```vue
          <component :is="showBlocked ? IconChevronDown : IconChevronRight" :size="14" :stroke="1.75" />
```

- [ ] **Step 6.3: Modify `src/pages/Install.vue`**

Add `import { IconCheck } from '../icons'` to `<script setup>`.

Around line 103:

```vue
        >{{ copied ? '✓ Copied' : 'Copy link' }}</button>
```

Replace with:

```vue
        ><span class="inline-flex items-center gap-1">
          <IconCheck v-if="copied" :size="14" :stroke="1.75" />
          {{ copied ? 'Copied' : 'Copy link' }}
        </span></button>
```

Around line 112:

```vue
      <div class="text-rate-good text-2xl">✓</div>
```

Replace with:

```vue
      <IconCheck :size="32" :stroke="2" class="text-rate-good" />
```

- [ ] **Step 6.4: Modify `src/components/SequenceChain.vue`**

Add `import { IconArrowRight } from '../icons'` to `<script setup>`.

Around line 84, replace:

```vue
        <span class="text-muted text-sm select-none">→</span>
```

With:

```vue
        <IconArrowRight :size="14" :stroke="1.75" class="text-muted" />
```

- [ ] **Step 6.5: Refactor TransitionSheet, EdgeBubble, TransitionCard "arrow" computed**

Three files use the same pattern:
```ts
const arrow = computed(() => (...bidi check... ? '⇄' : '→'))
```
And consume `{{ arrow }}` in templates.

For each file:

1. Remove the `arrow` computed entirely.
2. Add `import { IconBidi, IconArrowRight } from '../icons'` to `<script setup>`.
3. Find the `{{ arrow }}` usage in the template and replace with:

```vue
<component :is="edge?.bidi ? IconBidi : IconArrowRight" :size="14" :stroke="1.75" />
```

(Adjust `edge?.bidi` to match the actual variable used in each file — TransitionSheet uses `edge.value?.bidi`, EdgeBubble uses `props.edge.bidi`, TransitionCard uses `props.edge.bidi`. In templates, drop the `.value` since template auto-unwraps refs.)

Then in TransitionSheet around line 331:

```vue
        <span>↔ Both directions</span>
```

Replace with:

```vue
        <span class="inline-flex items-center gap-1"><IconTransition :size="14" :stroke="1.75" /> Both directions</span>
```

Add `IconTransition` to the import on the same line.

Same change in EdgeBubble around line 174 (`<span>↔ both directions</span>` → same pattern).

- [ ] **Step 6.6: Modify `src/pages/ForeignProfile.vue`**

Add `import { IconChevronLeft } from '../icons'` to `<script setup>`.

Around line 116, the existing inline SVG:

```vue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
```

Replace the entire `<svg>...</svg>` with:

```vue
          <IconChevronLeft :size="16" :stroke="2" />
```

- [ ] **Step 6.7: Modify `src/pages/Diagnostics.vue`**

Add `import { IconBack } from '../icons'` to `<script setup>`.

Around line 246:

```vue
        >← Settings</button>
```

Replace with:

```vue
        ><span class="inline-flex items-center gap-1"><IconBack :size="14" :stroke="1.75" /> Settings</span></button>
```

- [ ] **Step 6.8: Modify `src/pages/Settings.vue`**

Add `import { IconArrowRight } from '../icons'` to `<script setup>`.

Around line 339:

```vue
        >Diagnostics →</button>
```

Replace with:

```vue
        ><span class="inline-flex items-center gap-1">Diagnostics <IconArrowRight :size="14" :stroke="1.75" /></span></button>
```

- [ ] **Step 6.9: Modify `src/components/GraphBubble.vue`**

Add `IconPlus` to the existing icons import (which should already have `IconClose` from Task 4):

```ts
import { IconClose, IconPlus } from '../icons'
```

Around lines 126, 133, 142, three buttons currently render:

```vue
            >➕ from L</button>
            >➕ from R</button>
          >➕ Transition</button>
```

Replace each with:

```vue
            ><span class="inline-flex items-center justify-center gap-1"><IconPlus :size="12" :stroke="2" /> from L</span></button>
            ><span class="inline-flex items-center justify-center gap-1"><IconPlus :size="12" :stroke="2" /> from R</span></button>
          ><span class="inline-flex items-center justify-center gap-1"><IconPlus :size="12" :stroke="2" /> Transition</span></button>
```

(Stroke 2 here, not 1.75, because the plus glyph on colored backgrounds needs a touch more weight to read — this addresses the original feedback that `➕` was barely visible on the dark colored buttons.)

- [ ] **Step 6.10: Modify `src/pages/Graph.vue`**

`IconClose` should already be imported from Task 4. Extend the import:

```ts
import { IconClose, IconTransition } from '../icons'
```

Around line 394:

```vue
      >↔ Transitions</RouterLink>
```

Replace with:

```vue
      ><span class="inline-flex items-center gap-1"><IconTransition :size="16" :stroke="1.75" /> Transitions</span></RouterLink>
```

- [ ] **Step 6.11: Verify no chevron / arrow / check / plus glyphs remain in component positions**

```bash
grep -rnE "▾|▸|↔|⇄|↗|➕" --include="*.vue" --include="*.ts" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/" | grep -v "^.*://"
```

Expected: zero hits.

```bash
grep -rnE "^[^/]*>→<|^[^/]*>← " --include="*.vue" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/"
```

Expected: zero hits for `→` / `←` used as a UI affordance. Body-prose `→` (e.g. ForeignProfile.vue line 182 `{{ x.from }} → {{ x.to }}`) is content describing two trick names — keep these.

- [ ] **Step 6.12: Run type-check, tests, and build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds.

- [ ] **Step 6.13: Manual spot-check**

- Heatmap14 in Home — positive-delta and zero-delta cases display
- People — toggle the "blocked" section, chevron rotates
- Install — Copy link button, copied confirmation, large checkmark
- SequenceChain — the arrow between steps
- TransitionSheet / EdgeBubble / TransitionCard — open with bidi=true and bidi=false, confirm correct icon
- ForeignProfile — back chevron at the top
- Diagnostics — `← Settings` back button
- Settings — `Diagnostics →` link
- GraphBubble — open a node, the three "+ from L / from R / Transition" buttons are visible and the plus glyph reads on the colored backgrounds (this is the original feedback issue)
- Graph header — the "↔ Transitions" link

- [ ] **Step 6.14: Commit**

```bash
git add src/components/Heatmap14.vue src/components/SequenceChain.vue src/components/TransitionSheet.vue src/components/EdgeBubble.vue src/components/TransitionCard.vue src/components/GraphBubble.vue src/pages/People.vue src/pages/Install.vue src/pages/ForeignProfile.vue src/pages/Diagnostics.vue src/pages/Settings.vue src/pages/Graph.vue
git commit -m "$(cat <<'EOF'
Phase 6 step 6 (sweep 3): chevrons / arrows / check / plus

Replaces ▾ ▸ ↔ ⇄ ↗ ← → ✓ ➕ unicode affordances across 12 files.
GraphBubble's ➕ buttons get stroke="2" specifically (heavier weight)
so the plus reads on the colored leg-tint backgrounds — addresses
the brainstorm feedback that the emoji ➕ was barely visible.
Refactors three computed-arrow-string sites (TransitionSheet,
EdgeBubble, TransitionCard) to render icons directly in template.
EOF
)"
```

---

## Task 7 — Sweep 4: button-icon emoji (🎲 ⌂ ✥)

Four sites use full-color emoji as UI button glyphs. Replace with Tabler.

**Files to modify:**
- `src/pages/Sequences.vue:59` (Generate button) and `:70` (empty-state copy)
- `src/components/GeneratorSheet.vue:369` (Regenerate button)
- `src/components/GraphView.vue:1082` (`⌂` reset-view)
- `src/pages/Graph.vue:403` (`✥ Move` toggle)

- [ ] **Step 7.1: Modify `src/pages/Sequences.vue`**

Add `import { IconGenerate } from '../icons'` to `<script setup>`.

Around line 59:

```vue
      >🎲 Generate</button>
```

Replace with:

```vue
      ><span class="inline-flex items-center gap-1.5"><IconGenerate :size="16" :stroke="1.75" /> Generate</span></button>
```

Around line 70 (empty-state copy):

```vue
    >No sequences yet — tap 🎲 Generate to build one.</div>
```

Replace with:

```vue
    >No sequences yet — tap <strong>Generate</strong> to build one.</div>
```

(Strips the emoji from prose; uses bold to point at the affordance.)

- [ ] **Step 7.2: Modify `src/components/GeneratorSheet.vue`**

Add `IconGenerate` to the existing icons import (which already has `IconClose` from Task 4):

```ts
import { IconClose, IconGenerate } from '../icons'
```

Around line 369:

```vue
          >🎲 Regenerate</button>
```

Replace with:

```vue
          ><span class="inline-flex items-center gap-1.5"><IconGenerate :size="16" :stroke="1.75" /> Regenerate</span></button>
```

- [ ] **Step 7.3: Modify `src/components/GraphView.vue`**

Add `import { IconResetView } from '../icons'` to `<script setup>`.

Around line 1082:

```vue
      >⌂</button>
```

Replace with:

```vue
      ><IconResetView :size="18" :stroke="1.75" /></button>
```

Ensure the button has `aria-label="Reset view"`.

- [ ] **Step 7.4: Modify `src/pages/Graph.vue`**

Extend the existing icons import to include `IconMoveMode`:

```ts
import { IconClose, IconTransition, IconMoveMode } from '../icons'
```

Around line 403:

```vue
      >✥ Move</button>
```

Replace with:

```vue
      ><span class="inline-flex items-center gap-1"><IconMoveMode :size="14" :stroke="1.75" /> Move</span></button>
```

- [ ] **Step 7.5: Verify no emoji-as-button-glyph remains**

```bash
grep -rnE "🎲|⌂|✥" --include="*.vue" --include="*.ts" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/"
```

Expected: zero hits.

- [ ] **Step 7.6: Run type-check, tests, and build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds.

- [ ] **Step 7.7: Manual spot-check**

- Sequences page — Generate button + empty state copy
- GeneratorSheet — Regenerate button
- Graph — reset-view button (`⌂` corner — now `IconResetView`)
- Graph header — `✥ Move` toggle

- [ ] **Step 7.8: Commit**

```bash
git add src/pages/Sequences.vue src/components/GeneratorSheet.vue src/components/GraphView.vue src/pages/Graph.vue
git commit -m "$(cat <<'EOF'
Phase 6 step 7 (sweep 4): button-icon emoji 🎲 ⌂ ✥ → Tabler

Sequences Generate + GeneratorSheet Regenerate → IconGenerate.
GraphView reset-view → IconResetView. Graph Move toggle → IconMoveMode.
Sequences empty-state copy strips the dice emoji from prose.
EOF
)"
```

---

## Task 8 — Sweep 5: inline SVGs (search, video, eye, share)

Four remaining sites have hand-drawn inline `<svg>` elements (not unicode glyphs). Replace with Tabler.

**Files to modify:**
- `src/pages/Tricks.vue` (search input — magnifier SVG)
- `src/components/TrickCard.vue` (tutorial button — video SVG)
- `src/components/ForeignLearningList.vue` (read-only badge — eye SVG; per-row tutorial — video SVG)
- `src/pages/Install.vue` (Share button — iOS-share SVG)

- [ ] **Step 8.1: Modify `src/pages/Tricks.vue` — search input**

Extend existing icons import:

```ts
import { IconClose, IconTransition, IconMoveMode, IconArrowRight, IconFavOn, IconSearch } from '../icons'
```

(adjust list based on what was added in prior tasks — keep only what's actually used).

Find the inline magnifier `<svg>` around line 182 (`grep -n '<svg' src/pages/Tricks.vue`):

```vue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            ...
          </svg>
```

Replace the entire `<svg>...</svg>` with:

```vue
          <IconSearch :size="16" :stroke="1.75" />
```

- [ ] **Step 8.2: Modify `src/components/TrickCard.vue` — tutorial video button**

Add to existing icons import (which has `IconFavOn` from Task 5):

```ts
import { IconFavOn, IconBrandYoutube } from '../icons'
```

Find the inline video SVG around line 75:

```vue
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
```

Replace with:

```vue
        <IconBrandYoutube :size="20" :stroke="1.75" />
```

(Use `IconBrandYoutube` because the button's title is `'Watch tutorial' : 'Search tutorial on YouTube'` — the YouTube context is explicit. If after manual review this reads too brand-heavy, swap to `IconVideo` — both are imported in `src/icons/index.ts`.)

- [ ] **Step 8.3: Modify `src/components/ForeignLearningList.vue` — eye + video**

Extend existing icons import (which has `IconFavOn` from Task 5):

```ts
import { IconFavOn, IconEye, IconBrandYoutube } from '../icons'
```

Find the eye SVG around line 56:

```vue
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
```

Replace with:

```vue
      <IconEye :size="12" :stroke="2" />
```

Find the video SVG around line 105:

```vue
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
```

Replace with:

```vue
            <IconBrandYoutube :size="20" :stroke="1.75" />
```

(Same brand choice as Task 8.2 for cohesion — match.)

- [ ] **Step 8.4: Modify `src/pages/Install.vue` — Share button**

Extend existing icons import (which has `IconCheck` from Task 6):

```ts
import { IconCheck, IconShare } from '../icons'
```

Find the share SVG around line 159:

```vue
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
              ...
            </svg>
```

Replace with:

```vue
            <IconShare :size="16" :stroke="1.75" />
```

- [ ] **Step 8.5: Verify no remaining hand-drawn inline icon SVGs**

```bash
grep -rnE "<svg" --include="*.vue" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/" | grep -v "TabBar\|GraphView\|RateFeedback\|icons/leg\|Settings.vue:240"
```

Expected: zero hits.

(Settings.vue:240 is the Google brand logo — out of scope per spec. TabBar entity marks stay. GraphView:732 is the graph canvas. RateFeedback's animated countdown ring stays — its inner `✕` text gets handled in Task 9. Leg components are bespoke.)

- [ ] **Step 8.6: Run type-check, tests, and build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds.

- [ ] **Step 8.7: Manual spot-check**

- Tricks page — sticky search input shows the magnifier icon
- TrickCard — video/tutorial button
- ForeignLearningList — open a foreign profile, the eye badge at the top + per-row video buttons
- Install — Share button

- [ ] **Step 8.8: Commit**

```bash
git add src/pages/Tricks.vue src/components/TrickCard.vue src/components/ForeignLearningList.vue src/pages/Install.vue
git commit -m "$(cat <<'EOF'
Phase 6 step 8 (sweep 5): inline SVGs → Tabler

Replaces the hand-drawn search magnifier (Tricks), tutorial video glyph
(TrickCard + ForeignLearningList), eye badge (ForeignLearningList), and
iOS-share glyph (Install). Tutorial uses IconBrandYoutube since the
button context is explicitly "search on YouTube".
EOF
)"
```

---

## Task 9 — RateFeedback close X (ring stays, glyph swaps)

**Files to modify:**
- `src/components/RateFeedback.vue:200`

The countdown ring `<svg>` from lines 170-199 is an animated indicator — keep. Only the `✕` text overlay at line 200 swaps to IconClose.

- [ ] **Step 9.1: Read RateFeedback.vue around the close button**

```bash
sed -n '160,205p' /Users/kzubenko/Projects/slalom-app/src/components/RateFeedback.vue
```

Confirm the structure: a `<button>` containing the countdown `<svg>` followed by a `<span>...✕</span>`. The button uses `class="absolute top-2 right-2 w-11 h-11 grid place-items-center"`.

- [ ] **Step 9.2: Modify `src/components/RateFeedback.vue`**

Add `import { IconClose } from '../icons'` to `<script setup>`.

Around line 200:

```vue
            <span class="relative text-base leading-none" :style="{ color: 'var(--color-g-fg-muted)' }">✕</span>
```

Replace with:

```vue
            <IconClose :size="16" :stroke="1.75" class="relative" :style="{ color: 'var(--color-g-fg-muted)' }" />
```

(The countdown ring SVG above this line stays untouched.)

- [ ] **Step 9.3: Verify zero `✕` remains in component templates project-wide**

```bash
grep -rnE "✕" --include="*.vue" --include="*.ts" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/"
```

Expected: zero hits.

- [ ] **Step 9.4: Run type-check, tests, build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds.

- [ ] **Step 9.5: Manual spot-check**

Trigger a rate-feedback toast (rate a trick from a card or sheet — `useRateFeedback` should fire). Confirm:
- Countdown ring animates as before
- Close glyph is now `IconClose` instead of `✕`
- Tap dismisses the toast

- [ ] **Step 9.6: Commit**

```bash
git add src/components/RateFeedback.vue
git commit -m "$(cat <<'EOF'
Phase 6 step 9: RateFeedback close ✕ → IconClose

Countdown ring SVG stays (animated indicator, not an icon). Inner ✕
text overlay swaps to IconClose. Closes out the ✕ → IconClose sweep.
EOF
)"
```

---

## Task 10 — Final acceptance + handoff doc updates

**Files to modify:**
- `spec/SESSION-HANDOFF.md`

- [ ] **Step 10.1: Run the full acceptance grep checklist**

```bash
echo "=== Unicode UI affordances (must be zero) ==="
grep -rnE "✕|★|☆|⌂|✥|↔|⇄|↗|🎲|▾|▸|✓|➕" --include="*.vue" --include="*.ts" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/" | grep -vE "//|/\*|tap ★ to"

echo ""
echo "=== Inline SVGs outside allowed list (must be zero) ==="
grep -rnE "<svg" --include="*.vue" /Users/kzubenko/Projects/slalom-app/src | grep -v "/spec/" | grep -vE "TabBar|GraphView|RateFeedback|icons/leg|Settings.vue:240"

echo ""
echo "=== Direct Tabler imports (must be zero outside src/icons) ==="
grep -rn "@tabler/icons-vue" --include="*.vue" --include="*.ts" /Users/kzubenko/Projects/slalom-app/src | grep -v "src/icons/"
```

All three sections expected to print zero result lines (the headers are fine — only the result lines matter).

- [ ] **Step 10.2: Full clean build**

```bash
npm run type-check && npm run test && npm run build
```

Expected: zero TS errors; 144/144 tests pass; build succeeds. Note the build output size — compare to a pre-Phase-6 baseline if you have one. Target: ≤8 KB gz growth in the icon-bearing chunks (see spec acceptance criterion #7).

- [ ] **Step 10.3: Full manual spot-check on iOS PWA + Safari tab**

`npm run dev`, open on phone over LAN.

- TabBar 4 — visible and cohesive with the new icons
- Open every sheet (TrickSheet from a trick card, TransitionSheet from an edge bubble, SequenceSheet from a sequence card, GeneratorSheet from Sequences page, TricksFilterSheet from Tricks header) — close button renders, taps dismiss
- GraphBubble — tap a node, see the "+ from L / + from R / + Transition" buttons with visible plus icons on the colored backgrounds (the original feedback bug)
- EdgeBubble — tap an edge, see close + transition/bidi icons
- Graph header — Transitions link with IconTransition, Move toggle with IconMoveMode, reset-view with IconResetView
- Sequences — Generate button, empty state copy, Regenerate inside GeneratorSheet
- Heatmap14 on Home — positive-delta indicator
- People — toggle blocked section, chevron rotates
- Install — Copy link → copied check, large checkmark, Share button
- Diagnostics back / Settings → Diagnostics link
- ForeignProfile back chevron + read-only badge + per-row video
- Tricks search input magnifier
- TrickCard video/youtube button
- Rate a trick → RateFeedback toast with countdown ring + new close icon

Confirm no rendering issues at retina, no stroke-weight mismatch with the TabBar, no broken touch targets.

- [ ] **Step 10.4: Update `spec/SESSION-HANDOFF.md`**

Read `spec/SESSION-HANDOFF.md` to see the current structure (the "State right now" section at the top, "What's shipped" sections, "What's NOT done" sections, "Decisions log").

Edits:

1. **Top "State right now"** — change "Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h shipped" to include "**4c**" (it's already there), and add **6** to the shipped list. Wait — re-read; the spec earlier said "Phase 6 (SHIP GATE)" is open. After this task, it's shipped. Update to: "Phases 1, 2, 3a, 3b, 4a, 4b, 4c, 4h, **6** shipped to prod."
2. **"What's shipped since the 2026-06-26 handoff"** — add a new subsection at the top:

   ```markdown
   ### Phase 6 — Iconography (shipped 2026-06-27)
   - Library-first via `@tabler/icons-vue` re-exported under semantic names from `src/icons/`. TabBar 4 entity marks kept as-is. Bespoke `Leg*.vue` components in `src/icons/leg/` for L / R / both / none stance glyphs. Zero unicode glyphs used as UI affordances anywhere in `src/`.
   - Spec: `spec/2026-06-27-glasswork-phase-6-iconography-design.md`. Plan: `docs/superpowers/plans/2026-06-27-glasswork-phase-6-iconography.md`.
   - Notable spec amendments: §7.1 "no library defaults" → "Tabler is acceptable, sits cohesively with TabBar". §7.3 stroke language locked at 1.75 / round / round / 24 grid.
   - Dev-only preview at `/#/spec/icons` (added to the existing spec-route block).
   - Addressed the brainstorm-time bug where `➕` on GraphBubble's leg buttons was barely visible on colored backgrounds — replaced with `IconPlus` at stroke="2" for legibility.
   ```
3. **"What's NOT done" → "Phase 6"** — remove the entire "Phase 6 — Bespoke iconography (SHIP GATE)" subsection. Update the intro line if it counts open phases.
4. **"Decisions log"** — append:

   ```markdown
   - DECIDED 2026-06-27: Phase 6 ships library-first via Tabler Icons re-exported under semantic names. The §7.3 "bespoke" stance softens: Tabler's house style matches the existing TabBar 1:1 and is distinct enough from Lucide that the templated-tell concern does not recur. The src/icons/ semantic re-export layer leaves the door open for future bespoke swaps without touching consumers.
   - DECIDED 2026-06-27: Leg-L / Leg-R / Leg-both / Leg-none are bespoke SVG <text> components in src/icons/leg/. No library carries these.
   - DECIDED 2026-06-27: Tutorial buttons in TrickCard and ForeignLearningList use IconBrandYoutube (button title explicitly mentions YouTube). ForeignProfile back button uses IconChevronLeft (matches the visual character of the prior hand-drawn chevron, vs IconBack which would be an arrow).
   ```

- [ ] **Step 10.5: Final commit + push**

```bash
git add spec/SESSION-HANDOFF.md
git commit -m "$(cat <<'EOF'
Phase 6 (Iconography) shipped — SHIP GATE cleared

Library-first via @tabler/icons-vue re-exported under semantic names
from src/icons/. TabBar 4 entity marks kept; bespoke Leg* components
for L/R/both/none. Zero unicode glyphs used as UI affordances anywhere
in src/. Dev-only preview at /spec/icons.

Updates SESSION-HANDOFF.md: marks Phase 6 shipped, records the §7.1
and §7.3 amendments, adds the bespoke-leg + youtube-tutorial decisions
to the log.
EOF
)"
```

Then push when ready:

```bash
git push origin main
```

(GH Pages will redeploy automatically.)

---

## Spec coverage check (self-review)

| Spec requirement | Task |
|---|---|
| `pnpm add @tabler/icons-vue` (note: this project uses npm; equivalent `npm install`) | Task 1 |
| `src/icons/` module with semantic re-exports | Task 1 |
| `src/icons/leg/Leg*.vue` bespoke components | Task 2 |
| `/spec/icons` dev preview route | Task 3 |
| Unicode → Tabler mapping (inventory table) | Tasks 4–7, 9 |
| Inline SVG → Tabler mapping (inventory table) | Task 8 |
| Migration order step 1: add package + module | Task 1 |
| Migration order step 2: close buttons | Task 4 |
| Migration order step 3: favorites | Task 5 |
| Migration order step 4: chevrons / arrows / check / plus | Task 6 |
| Migration order step 5: button-icon emoji | Task 7 |
| Migration order step 6: inline SVGs | Task 8 |
| Migration order step 7: verify on iOS | Tasks 4.9 / 5.9 / 6.13 / 7.7 / 8.7 / 9.5 / 10.3 (incremental) |
| Acceptance #1: zero unicode UI affordances | Task 10.1 grep check |
| Acceptance #2: zero hand-drawn inline SVGs outside allowed list | Task 10.1 grep check |
| Acceptance #3: semantic names via src/icons | Task 10.1 grep check |
| Acceptance #4: /spec/icons renders without console errors | Task 3.4 + 10.3 |
| Acceptance #5: iOS Safari/PWA spot check | Task 10.3 |
| Acceptance #6: 144/144 tests still pass | Each task's verify step |
| Acceptance #7: bundle delta ≤8 KB gz | Task 10.2 |
| RateDots out of scope | Honored (not touched) |
| TabBar out of scope | Honored (not touched) |
| Body-prose unicode kept (Install ⋯, ForeignProfile from→to) | Honored (excluded from grep) |
| Brand mark (Google logo) kept | Honored (excluded from grep) |
| Open after spec: tutorial icon choice | Resolved → IconBrandYoutube |
| Open after spec: ForeignProfile back arrow | Resolved → IconChevronLeft |
| Open after spec: LegBoth legibility | Tuned during Task 3.4 manual check |
| Open after spec: Sequences copy rewrite | Resolved in Task 7.1 (uses `<strong>` instead of dice glyph) |
