# Glasswork Phase 3a — Core Components (focused subset) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin five high-impact shared components in Glasswork material/type/color: `TrickCard`, `RateDots`, `RateButtons`, `ChipFilter`, `SearchSort`. Establish the new visual language for the catalog/list surfaces without changing per-screen layouts. Migrate `RateDots` from hue-traffic-light semantics to the off-hue density treatment defined in the Glasswork spec.

**Architecture:**
- A dev-only `/spec/rate-options` route is built FIRST and lets the user pick the RateDots pattern visually (the design call deferred during brainstorming).
- After the pick, the chosen pattern is implemented inside `RateDots.vue`. Interface (props: `rate`, `rateL`, `rateR`, `lr`, `size`) stays compatible.
- `RateButtons.vue` becomes a pill bar (Bad / Mid / Good + Reset), replacing the 4-column form grid.
- `TrickCard.vue` becomes a glass tile with new typography and the new RateDots strip.
- `ChipFilter.vue` and `SearchSort.vue` get glass material treatment (pill chips, glass input/select).
- Old tokens stay in place for components NOT in this phase (TransitionCard, SequenceCard, LegChooser, TierTabs, AvatarBadge, etc.). They're Phase 3b territory.

**Tech Stack:** Vue 3 + Vite + Tailwind v4 + Vitest. Glasswork tokens from Phase 1 + shell from Phase 2 are consumed throughout. No new dependencies.

**Companion docs:**
- Direction spec: `spec/2026-06-24-redesign-glasswork-design.md`
- IA decisions: `spec/2026-06-24-glasswork-ia-decisions.md`
- Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`
- Phase 1: `docs/superpowers/plans/2026-06-24-glasswork-phase-1-ia-and-tokens.md`
- Phase 2: `docs/superpowers/plans/2026-06-24-glasswork-phase-2-nav-shell.md`

---

## Design decisions carried in

(Resolved via brainstorming on 2026-06-25.)

- **RateDots visual pattern**: DEFERRED. Build a comparison page first; user picks visually before committing.
- **Leg distinction inside rate elements**: COLOR TINT per leg (peach for L, teal for R, cream for both). Rate density is the carrier of value; leg color is the carrier of identity. Both axes coexist because they live in orthogonal perceptual dimensions.
- **RateButtons layout**: PILL BAR — horizontal row of pills (Bad / Mid / Good + Reset). Labels are explicit so users don't have to decode the new visual.
- **Phase 3 scope**: SUBSET — TrickCard, RateDots, RateButtons, ChipFilter, SearchSort. TierTabs explicitly excluded (Phase 4b drops tier tabs entirely). TransitionCard, SequenceCard, LegChooser, AvatarBadge, FriendButton, SyncStatusDot, ToastStack, RateFeedback all defer to Phase 3b.

---

## File structure

**Created:**
- `src/pages/spec/RateOptions.vue` — dev-only comparison page showing all three RateDots option patterns side-by-side, each with L/R/both/no-leg variants and rate values 0–5 and unrated.

**Modified:**
- `src/router.ts` — add `/spec/rate-options` route gated on DEV.
- `src/components/RateDots.vue` — new ordinal density pattern (final pattern picked by user during this phase).
- `src/components/RateButtons.vue` — pill bar layout, new tokens.
- `src/components/TrickCard.vue` — glass tile re-skin, new typography, new rate integration.
- `src/components/ChipFilter.vue` — pill chips with glass material.
- `src/components/SearchSort.vue` — glass input + sort select.

**Untouched (deliberate scope limits):**
- TransitionCard, SequenceCard, LegChooser, AvatarBadge, FriendButton, ProfileSearchResult, EdgeBubble, GraphBubble, SyncStatusDot, ToastStack, RateFeedback, TierTabs — all Phase 3b or 4-territory.
- Every page-level component (AllTricks, Learning, etc.) — layout stays. The new components render inside the old page chrome.
- All stores, domain code, storage, sync.

---

## Task list

### Task 1 — Build the RateDots comparison page

**Files:**
- Create: `src/pages/spec/RateOptions.vue`
- Modify: `src/router.ts` (add dev-only route)

This task ships a preview page; the user picks one of the three options before Task 2 starts.

- [ ] **Step 1 — Create `src/pages/spec/RateOptions.vue`** with three side-by-side renderings.

The page should render, for EACH of the three options:
- A label (Option A / Option B / Option C) and a one-line description.
- A row for each leg variant: `lr: false` (no legs, single rate), `lr: true` showing rateL + rateR side-by-side.
- A column for each rate value: 0 (unrated), 1, 2, 3, 4, 5.

Implementation:

```vue
<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A' | 'B' | 'C'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'A', title: '5-dot strip (ordinal density)', desc: 'Familiar shape; dots fill left-to-right by rate. Off-hue density.' },
  { id: 'B', title: 'Single ordinal chip', desc: 'One labeled pill per leg ("Bad" / "Mid" / "Good"). Larger, glanceable.' },
  { id: 'C', title: 'Weighted vertical bars', desc: '1–5 vertical bars of growing height/weight.' },
]

const sampleRates: (number | null)[] = [null, 1, 2, 3, 4, 5]

const legs: { key: 'none' | 'l' | 'r' | 'both'; label: string; tint: string }[] = [
  { key: 'none', label: 'No leg', tint: gw.fg },
  { key: 'l',    label: 'L',      tint: gw.leg.l },
  { key: 'r',    label: 'R',      tint: gw.leg.r },
  { key: 'both', label: 'Both',   tint: gw.leg.both },
]

function rateBucket(rate: number | null): 'none' | 'bad' | 'mid' | 'good' {
  if (rate == null) return 'none'
  if (rate < 2.5) return 'bad'
  if (rate < 4) return 'mid'
  return 'good'
}

function rateFillColor(rate: number | null): string {
  const b = rateBucket(rate)
  if (b === 'none') return gw.rate.none
  if (b === 'bad') return gw.rate.bad
  if (b === 'mid') return gw.rate.mid
  return gw.rate.good
}
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Rate options
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Three patterns for RateDots. Pick one. Leg color tints stay in all three.
    </p>

    <section
      v-for="v in variants"
      :key="v.id"
      class="gw-glass p-4 flex flex-col gap-4"
      :style="{ borderRadius: gw.radius.panel + 'px' }"
    >
      <header class="flex items-baseline gap-3">
        <span
          :style="{
            fontSize: gw.type.h2 + 'px',
            fontWeight: 700,
            color: gw.brand,
          }"
        >Option {{ v.id }}</span>
        <span :style="{ fontSize: gw.type.body + 'px' }">{{ v.title }}</span>
      </header>
      <p :style="{ color: gw.fgMuted, fontSize: gw.type.micro + 'px' }">{{ v.desc }}</p>

      <div class="flex flex-col gap-2">
        <div
          v-for="leg in legs"
          :key="leg.key"
          class="flex items-center gap-3"
        >
          <span
            :style="{
              fontSize: gw.type.micro + 'px',
              width: '52px',
              color: leg.tint,
              fontWeight: 600,
            }"
          >{{ leg.label }}</span>
          <div class="flex items-center gap-3">
            <div v-for="r in sampleRates" :key="String(r)" class="flex flex-col items-center gap-1">
              <!-- Option A: 5-dot strip -->
              <template v-if="v.id === 'A'">
                <div class="flex gap-[3px]">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: r != null && i <= Math.round(r) ? rateFillColor(r) : 'transparent',
                      border: `1px solid ${leg.tint}`,
                      boxSizing: 'border-box',
                    }"
                  />
                </div>
              </template>
              <!-- Option B: Single ordinal chip -->
              <template v-else-if="v.id === 'B'">
                <span
                  :style="{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: r == null ? gw.fgMuted : gw.base,
                    background: r == null ? 'transparent' : rateFillColor(r),
                    border: `1px solid ${leg.tint}`,
                    minWidth: '36px',
                    textAlign: 'center',
                    display: 'inline-block',
                  }"
                >{{ r == null ? '—' : (rateBucket(r) === 'bad' ? 'Bad' : rateBucket(r) === 'mid' ? 'Mid' : 'Good') }}</span>
              </template>
              <!-- Option C: Weighted vertical bars -->
              <template v-else-if="v.id === 'C'">
                <div class="flex items-end gap-[2px]" style="height: 16px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '3px',
                      height: (4 + i * 2.5) + 'px',
                      borderRadius: '1px',
                      background: r != null && i <= Math.round(r) ? rateFillColor(r) : 'transparent',
                      border: `1px solid ${leg.tint}`,
                      boxSizing: 'border-box',
                    }"
                  />
                </div>
              </template>
              <span :style="{ fontSize: '9px', color: gw.fgMuted, fontFamily: 'ui-monospace, monospace' }">
                {{ r == null ? '—' : r }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 2 — Add the dev-only route** in `src/router.ts`. Inside the DEV-gated spread (currently has `/spec/tokens`), add a second entry alongside it:

```ts
  ...(import.meta.env.DEV
    ? [
        {
          path: '/spec/tokens',
          name: 'spec-tokens',
          component: () => import('./pages/spec/Tokens.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
        {
          path: '/spec/rate-options',
          name: 'spec-rate-options',
          component: () => import('./pages/spec/RateOptions.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
      ]
    : []),
```

- [ ] **Step 3 — Verify**

```
npm run type-check && npm run build
```

Expected: clean.

- [ ] **Step 4 — Commit**

```bash
git add src/pages/spec/RateOptions.vue src/router.ts
git commit -m "Add /spec/rate-options dev preview for RateDots pattern decision"
```

---

### Task 2 — User picks the RateDots option

**Files:** none (interactive — controller-driven).

- [ ] **Step 1 — Start the dev server** and give the user the LAN URL to `/spec/rate-options`.

- [ ] **Step 2 — User picks A, B, or C.** Record the choice. The remaining tasks reference `<CHOSEN>` — substitute the actual letter.

- [ ] **Step 3 — Stop the dev server.**

---

### Task 3 — Migrate RateDots.vue to the chosen pattern

**Files:**
- Modify: `src/components/RateDots.vue`

The exact code in this task depends on which option the user picked. Three sub-variants below — the implementer uses the matching one.

#### If user picked Option A (5-dot strip — RECOMMENDED PATH IF YOU MUST CHOOSE WITHOUT INPUT)

Replace `RateDots.vue` with:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { gw } from '../design/tokens'

type Props = {
  rate?: number | null
  rateL?: number | null
  rateR?: number | null
  lr?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  rate: null,
  rateL: null,
  rateR: null,
  lr: false,
  size: 'sm',
})

function rateBucket(r: number | null | undefined): 'none' | 'bad' | 'mid' | 'good' {
  if (r == null) return 'none'
  if (r < 2.5) return 'bad'
  if (r < 4) return 'mid'
  return 'good'
}

function fill(r: number | null | undefined): string {
  const b = rateBucket(r)
  if (b === 'none') return 'transparent'
  if (b === 'bad') return gw.rate.bad
  if (b === 'mid') return gw.rate.mid
  return gw.rate.good
}

const dotPx = computed(() => (props.size === 'md' ? 8 : 6))
const gapPx = computed(() => (props.size === 'md' ? 4 : 3))

const ringNoLeg = gw.fgMuted
const ringL = gw.leg.l
const ringR = gw.leg.r
const ringBoth = gw.leg.both
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Single (no leg) -->
    <div
      v-if="!lr"
      class="flex"
      :style="{ gap: gapPx + 'px' }"
      aria-label="Rate"
    >
      <span
        v-for="i in 5"
        :key="i"
        :style="{
          width: dotPx + 'px',
          height: dotPx + 'px',
          borderRadius: '50%',
          background: rate != null && i <= Math.round(rate) ? fill(rate) : 'transparent',
          border: '1px solid ' + ringNoLeg,
          boxSizing: 'border-box',
        }"
      />
    </div>

    <!-- Per-leg L + R -->
    <template v-else>
      <div class="flex" :style="{ gap: gapPx + 'px' }" aria-label="Rate L">
        <span
          v-for="i in 5"
          :key="'l' + i"
          :style="{
            width: dotPx + 'px',
            height: dotPx + 'px',
            borderRadius: '50%',
            background: rateL != null && i <= Math.round(rateL) ? fill(rateL) : 'transparent',
            border: '1px solid ' + ringL,
            boxSizing: 'border-box',
          }"
        />
      </div>
      <div class="flex" :style="{ gap: gapPx + 'px' }" aria-label="Rate R">
        <span
          v-for="i in 5"
          :key="'r' + i"
          :style="{
            width: dotPx + 'px',
            height: dotPx + 'px',
            borderRadius: '50%',
            background: rateR != null && i <= Math.round(rateR) ? fill(rateR) : 'transparent',
            border: '1px solid ' + ringR,
            boxSizing: 'border-box',
          }"
        />
      </div>
    </template>
  </div>
</template>
```

Notes:
- Leg color is the ring/border. Fill color is the rate-density token (rate-bad/mid/good).
- Unrated dots are transparent with a thin leg-colored ring.
- The `lr` prop drives single vs L+R rendering. The `both`/no-leg cases use `gw.fgMuted` as a fallback ring color.

#### If user picked Option B (single ordinal chip)

Replace `RateDots.vue` with a version that renders one labeled pill per leg (or one pill total when `lr=false`). Each pill shows the rate's bucket name ("Bad" / "Mid" / "Good") plus the bucket's fill color. Leg color is the pill border.

```vue
<script setup lang="ts">
import { gw } from '../design/tokens'

type Props = {
  rate?: number | null
  rateL?: number | null
  rateR?: number | null
  lr?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  rate: null,
  rateL: null,
  rateR: null,
  lr: false,
  size: 'sm',
})

function rateBucket(r: number | null | undefined): 'none' | 'bad' | 'mid' | 'good' {
  if (r == null) return 'none'
  if (r < 2.5) return 'bad'
  if (r < 4) return 'mid'
  return 'good'
}

function fill(r: number | null | undefined): string {
  const b = rateBucket(r)
  if (b === 'none') return 'transparent'
  if (b === 'bad') return gw.rate.bad
  if (b === 'mid') return gw.rate.mid
  return gw.rate.good
}

function label(r: number | null | undefined): string {
  const b = rateBucket(r)
  if (b === 'none') return '—'
  if (b === 'bad') return 'Bad'
  if (b === 'mid') return 'Mid'
  return 'Good'
}

const chipPad = (props.size === 'md') ? '4px 10px' : '2px 8px'
const chipFont = (props.size === 'md') ? '12px' : '10px'
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="!lr"
      :style="{
        padding: chipPad,
        borderRadius: '999px',
        fontSize: chipFont,
        fontWeight: 600,
        color: rate == null ? gw.fgMuted : gw.base,
        background: rate == null ? 'transparent' : fill(rate),
        border: '1px solid ' + gw.fgMuted,
        minWidth: '36px',
        textAlign: 'center',
        display: 'inline-block',
      }"
    >{{ label(rate) }}</span>
    <template v-else>
      <span
        :style="{
          padding: chipPad,
          borderRadius: '999px',
          fontSize: chipFont,
          fontWeight: 600,
          color: rateL == null ? gw.fgMuted : gw.base,
          background: rateL == null ? 'transparent' : fill(rateL),
          border: '1px solid ' + gw.leg.l,
          minWidth: '36px',
          textAlign: 'center',
          display: 'inline-block',
        }"
      >{{ label(rateL) }}</span>
      <span
        :style="{
          padding: chipPad,
          borderRadius: '999px',
          fontSize: chipFont,
          fontWeight: 600,
          color: rateR == null ? gw.fgMuted : gw.base,
          background: rateR == null ? 'transparent' : fill(rateR),
          border: '1px solid ' + gw.leg.r,
          minWidth: '36px',
          textAlign: 'center',
          display: 'inline-block',
        }"
      >{{ label(rateR) }}</span>
    </template>
  </div>
</template>
```

#### If user picked Option C (weighted vertical bars)

Replace `RateDots.vue` with 5 vertical bars per leg, growing in height left-to-right, filled to the rate:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { gw } from '../design/tokens'

type Props = {
  rate?: number | null
  rateL?: number | null
  rateR?: number | null
  lr?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  rate: null,
  rateL: null,
  rateR: null,
  lr: false,
  size: 'sm',
})

function rateBucket(r: number | null | undefined): 'none' | 'bad' | 'mid' | 'good' {
  if (r == null) return 'none'
  if (r < 2.5) return 'bad'
  if (r < 4) return 'mid'
  return 'good'
}

function fill(r: number | null | undefined): string {
  const b = rateBucket(r)
  if (b === 'none') return 'transparent'
  if (b === 'bad') return gw.rate.bad
  if (b === 'mid') return gw.rate.mid
  return gw.rate.good
}

const barWidth = computed(() => (props.size === 'md' ? 4 : 3))
const containerHeight = computed(() => (props.size === 'md' ? 18 : 14))

function barHeight(i: number): number {
  return 4 + i * (props.size === 'md' ? 3 : 2)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      v-if="!lr"
      class="flex items-end gap-[2px]"
      :style="{ height: containerHeight + 'px' }"
    >
      <span
        v-for="i in 5"
        :key="i"
        :style="{
          width: barWidth + 'px',
          height: barHeight(i) + 'px',
          borderRadius: '1px',
          background: rate != null && i <= Math.round(rate) ? fill(rate) : 'transparent',
          border: '1px solid ' + gw.fgMuted,
          boxSizing: 'border-box',
        }"
      />
    </div>
    <template v-else>
      <div class="flex items-end gap-[2px]" :style="{ height: containerHeight + 'px' }">
        <span
          v-for="i in 5"
          :key="'l' + i"
          :style="{
            width: barWidth + 'px',
            height: barHeight(i) + 'px',
            borderRadius: '1px',
            background: rateL != null && i <= Math.round(rateL) ? fill(rateL) : 'transparent',
            border: '1px solid ' + gw.leg.l,
            boxSizing: 'border-box',
          }"
        />
      </div>
      <div class="flex items-end gap-[2px]" :style="{ height: containerHeight + 'px' }">
        <span
          v-for="i in 5"
          :key="'r' + i"
          :style="{
            width: barWidth + 'px',
            height: barHeight(i) + 'px',
            borderRadius: '1px',
            background: rateR != null && i <= Math.round(rateR) ? fill(rateR) : 'transparent',
            border: '1px solid ' + gw.leg.r,
            boxSizing: 'border-box',
          }"
        />
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 1 — Replace** `src/components/RateDots.vue` with the matching variant above.

- [ ] **Step 2 — Verify**

```
npm run type-check && npm test && npm run build
```

Expected: 95 tests pass, clean. (No RateDots tests today; the rating-domain tests test the data, not the rendering.)

- [ ] **Step 3 — Commit**

```bash
git add src/components/RateDots.vue
git commit -m "RateDots: off-hue density + leg-color ring (Glasswork Phase 3a)"
```

---

### Task 4 — Replace RateButtons with the pill bar

**Files:**
- Modify: `src/components/RateButtons.vue`

The current RateButtons component fires a `report` event when the user taps a rating. It's a 4-column grid with Reset / Bad / Mid / Good (or similar). Verify by reading the existing file, then replace.

- [ ] **Step 1 — Read the file first** to understand the existing event surface:

```
cat src/components/RateButtons.vue
```

Note: prop and emit signatures. The pill bar must preserve them.

- [ ] **Step 2 — Replace** with a horizontal pill bar:

```vue
<script setup lang="ts">
import { gw } from '../design/tokens'

type Props = {
  lr?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lr: false,
})

const emit = defineEmits<{
  report: [score: number]
}>()

const pills: { id: 'bad' | 'mid' | 'good'; label: string; score: number; fill: string }[] = [
  { id: 'bad',  label: 'Bad',  score: 1, fill: gw.rate.bad },
  { id: 'mid',  label: 'Mid',  score: 3, fill: gw.rate.mid },
  { id: 'good', label: 'Good', score: 5, fill: gw.rate.good },
]

function tap(score: number) {
  emit('report', score)
}

function reset() {
  emit('report', 0)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      v-for="p in pills"
      :key="p.id"
      type="button"
      class="flex-1 py-2 font-semibold transition-colors"
      :style="{
        background: p.fill,
        color: gw.base,
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="tap(p.score)"
    >{{ p.label }}</button>
    <button
      type="button"
      class="px-3 py-2 gw-glass-strong transition-colors"
      :style="{
        color: 'var(--color-g-fg-muted)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-micro)',
      }"
      @click="reset"
      aria-label="Reset rate"
    >Reset</button>
  </div>
</template>
```

The `lr` prop is preserved as a prop but unused in this iteration (the pill bar doesn't distinguish L/R — the consumer that uses `lr` typically wraps RateButtons in a leg picker; that's Phase 3b territory if needed). Type-check will pass.

**IMPORTANT — verify the emit signature** matches the existing one. The current RateButtons emits a `report` event. If the signature differs (e.g., emits a `{ score, side }` object instead of just a number), adapt the pill bar to match. Read the existing consumers (TrickSheet, TransitionSheet, SequenceSheet, Graph) for confirmation.

If you find any mismatch in the existing component's emit shape: STOP and report DONE_WITH_CONCERNS describing the actual shape, and the controller will reconcile.

- [ ] **Step 3 — Verify**

```
npm run type-check && npm test && npm run build
```

- [ ] **Step 4 — Commit**

```bash
git add src/components/RateButtons.vue
git commit -m "RateButtons: pill bar (Bad / Mid / Good + Reset)"
```

---

### Task 5 — Re-skin TrickCard

**Files:**
- Modify: `src/components/TrickCard.vue`

Current TrickCard is a `bg-card border border-border rounded-xl p-3` tile with: row of (icon + name + fav star + video button), subtitle (category · aliases · tags), bottom rate dots. The new version uses glass material, new typography, and the new RateDots.

- [ ] **Step 1 — Read the existing file** to confirm the prop interface:

```
cat src/components/TrickCard.vue
```

- [ ] **Step 2 — Replace the template + outer surface** while keeping the script logic intact. Replace the outer `<div>` and inner structure:

Replace the entire `<template>` block with:

```vue
<template>
  <div
    class="gw-glass cursor-pointer active:opacity-90 transition-opacity"
    :style="{
      padding: '12px 14px',
      borderRadius: 'var(--radius-g-panel)',
    }"
    role="button"
    tabindex="0"
    @click="onCardClick"
    @keydown.enter="onCardClick"
    @keydown.space.prevent="onCardClick"
  >
    <div class="flex items-start gap-2">
      <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        <span
          v-if="trick.fav"
          :style="{ color: 'var(--color-g-brand)' }"
          aria-label="favorite"
        >★</span>
        <span
          v-if="trick.icon"
          class="text-base leading-none"
        >{{ trick.icon }}</span>
        <span
          class="font-semibold"
          :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
        >{{ displayName(trick) }}</span>
      </div>
      <button
        type="button"
        class="shrink-0 -mt-0.5 -mr-1 p-1.5 rounded transition-colors"
        :style="{
          color: hasVideoLink ? 'var(--color-g-brand)' : 'var(--color-g-fg-muted)',
        }"
        :title="hasVideoLink ? 'Watch tutorial' : 'Search tutorial on YouTube'"
        :aria-label="hasVideoLink ? 'Watch tutorial' : 'Search tutorial'"
        @click="onVideoClick"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      </button>
    </div>

    <div
      class="mt-1.5 truncate"
      :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
    >
      <span>{{ trick.category }}</span>
      <span v-if="otherAliases.length"> · aka {{ otherAliases.join(', ') }}</span>
      <span
        v-if="trick.tags.length"
        :style="{ color: 'var(--color-g-brand-sky)' }"
      > · {{ trick.tags.map(t => '#' + t).join(' ') }}</span>
    </div>

    <div class="mt-2.5">
      <RateDots
        :rate="trick.rate"
        :rate-l="trick.rateL"
        :rate-r="trick.rateR"
        :lr="trick.lr"
      />
    </div>
  </div>
</template>
```

Script block stays exactly as it is — props, emits, `displayName`, `hasVideoLink`, `otherAliases`, click handlers. No logic change.

- [ ] **Step 3 — Verify**

```
npm run type-check && npm test && npm run build
```

- [ ] **Step 4 — Commit**

```bash
git add src/components/TrickCard.vue
git commit -m "TrickCard: glass tile + new typography (Glasswork Phase 3a)"
```

---

### Task 6 — Re-skin ChipFilter

**Files:**
- Modify: `src/components/ChipFilter.vue`

The component is a row of selectable chips. Today: `bg-card border border-border-2` for inactive, `bg-accent text-bg` for active. New version: glass for inactive, white-pill for active (consistent with TabBar).

- [ ] **Step 1 — Read the file** to confirm the prop interface and structure:

```
cat src/components/ChipFilter.vue
```

- [ ] **Step 2 — Apply the visual swap** in the template ONLY. Preserve the script (props, emits, computed) entirely.

For each chip button in the template:
- Replace the existing class attribute / inline-style binding to:
  - Inactive: `class="gw-glass-strong"` + style `{ color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }`.
  - Active: `class=""` (no glass) + style `{ background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)' }`.
- Keep the existing padding utility classes (e.g. `px-2.5 py-1`) and the click handler.
- The count badge (if present) should use `color: 'var(--color-g-fg-muted)'` when inactive and inherit-color when active.

Verify the file structure by reading the existing template. Apply the swap conservatively — only the visual treatment changes; markup hierarchy stays.

- [ ] **Step 3 — Verify**

```
npm run type-check && npm test && npm run build
```

- [ ] **Step 4 — Commit**

```bash
git add src/components/ChipFilter.vue
git commit -m "ChipFilter: glass chips + white-pill active (Glasswork Phase 3a)"
```

---

### Task 7 — Re-skin SearchSort

**Files:**
- Modify: `src/components/SearchSort.vue`

A search input + sort select, side by side. Today uses `bg-card border-border-2 focus:border-accent`. New version: glass input, glass select.

- [ ] **Step 1 — Read the file**:

```
cat src/components/SearchSort.vue
```

- [ ] **Step 2 — In the template, swap visual classes:**

For the `<input>`:
- Remove: `bg-card`, `border border-border-2`, `focus:border-accent`, any `rounded-lg`/`rounded`.
- Add class `gw-glass-strong`.
- Add inline style: `{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-body)' }`.
- Keep padding utilities (e.g. `px-3 py-2`), placeholder, model binding.

For the `<select>`:
- Same swap: `gw-glass-strong` + chip radius + body font + `var(--color-g-fg-muted)` color (selects read as quieter).

Preserve script + structure.

- [ ] **Step 3 — Verify**

```
npm run type-check && npm test && npm run build
```

- [ ] **Step 4 — Commit**

```bash
git add src/components/SearchSort.vue
git commit -m "SearchSort: glass input + glass select (Glasswork Phase 3a)"
```

---

### Task 8 — Smoke test on phone

**Files:** none (interactive — controller-driven).

- [ ] **Step 1 — Start dev server, give the user the LAN URL.**

- [ ] **Step 2 — User opens on iOS Safari:**
  - `/#/tricks` — All Tricks. Cards should look like glass tiles. ChipFilter chips should look glass. Search input glass. Filter/sort functional.
  - Tap any trick → TrickSheet opens. RateDots inside the sheet use the new pattern. RateButtons should be the pill bar.
  - `/#/learning` — same components, same look.
  - `/#/sequences` — SequenceSheet still works (the rate buttons inside changed visually).
  - `/#/graph` — graph still works. Edge bubble's rate buttons changed.

- [ ] **Step 3 — Confirm or report issues.** If broken, controller dispatches a fix subagent. If "good," proceed to Task 9.

- [ ] **Step 4 — Stop dev server.**

---

### Task 9 — Update roadmap status + Phase 3a commit

**Files:**
- Modify: `spec/2026-06-24-redesign-glasswork-roadmap.md`

- [ ] **Step 1 — Update the status table.**

Find the Phase 3 row:

```
| 3 — Core components | (not yet written) | — | — |
```

Change to:

```
| 3a — Core components (subset) | `docs/superpowers/plans/2026-06-25-glasswork-phase-3a-core-components.md` | Shipped | 2026-06-25 |
| 3b — Core components (remaining) | (not yet written) | — | — |
```

(Add a new row for 3b directly after.)

- [ ] **Step 2 — Run final sanity**

```
npm test && npm run build
```

Expected: 95 tests pass, clean build.

- [ ] **Step 3 — Commit**

```bash
git add spec/2026-06-24-redesign-glasswork-roadmap.md
git commit -m "$(cat <<'EOF'
Glasswork Phase 3a shipped — core components (subset)

TrickCard, RateDots, RateButtons, ChipFilter, SearchSort re-skinned
in Glasswork material. RateDots migrated off-hue (density + leg-color
ring). RateButtons is now a pill bar (Bad / Mid / Good + Reset).
Layouts and component interfaces unchanged. Phase 3b will pick up
TransitionCard, SequenceCard, LegChooser, AvatarBadge, and others.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Decisions made

- DECIDED: RateDots leg distinction via leg-color RING; rate density carries value via off-hue fill (rate-bad / rate-mid / rate-good).
- DECIDED: RateButtons is a pill bar with explicit labels (Bad / Mid / Good + Reset).
- DECIDED: Phase 3 splits into 3a (subset) and 3b (remaining). 3a covers the catalog/list surfaces. 3b covers transition/sequence cards + social/profile pieces.
- DECIDED: TierTabs explicitly excluded from Phase 3 — Phase 4b drops it entirely in favor of a filter sheet.
- DEFERRED: First-encounter teaching for the new rate semantics. Pill-bar labels carry meaning; if confusion shows up in use, add a hint later.

---

## Scope guard

- DO NOT redesign internal layouts of components beyond the swaps specified.
- DO NOT touch any component not listed in "Modified."
- DO NOT touch pages beyond updating `src/router.ts` for the dev-only preview route.
- If RateDots or RateButtons consumers break due to interface changes: STOP and report.
- iOS keyboard drift bug stays postponed.
