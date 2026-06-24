<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import {
  CATEGORIES,
  TIER_NAMES,
  graphWalk,
  knownShuffle,
  totallyRandom,
} from '../domain'
import type { Sequence, SequenceStep, Tier } from '../domain/types'
import SequenceChain from './SequenceChain.vue'
import { useSheetViewport } from '../composables/useSheetViewport'

type Mode = 'graph' | 'known' | 'random'

const props = defineProps<{ visible: boolean }>()
const visibleRef = computed(() => props.visible)
const panelRef = ref<HTMLElement | null>(null)
useSheetViewport(panelRef, visibleRef)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', sequence: Omit<Sequence, 'id' | 'created'>): void
}>()

const tricks = useTricksStore()
const transitions = useTransitionsStore()

const mode = ref<Mode>('graph')
const n = ref(5)
const tier = ref<Tier>(6)
const exCats = ref<string[]>([])
const exTags = ref<string[]>([])
const stance = ref(false)
const name = ref('')
const seed = ref(0)
const steps = ref<SequenceStep[]>([])

const allTags = computed<string[]>(() => {
  const s = new Set<string>()
  for (const t of tricks.tricks) for (const tg of t.tags) s.add(tg)
  return [...s].sort()
})

const nMax = computed(() => (mode.value === 'random' ? 8 : 12))

watch(mode, () => {
  if (n.value > nMax.value) n.value = nMax.value
})

let regenTimer: number | null = null
function scheduleRegen() {
  if (regenTimer != null) window.clearTimeout(regenTimer)
  regenTimer = window.setTimeout(() => {
    regenTimer = null
    regenerate(false)
  }, 150)
}

function makeRng(s: number) {
  let x = s >>> 0
  if (x === 0) x = 0x12345678
  return () => {
    x ^= x << 13; x >>>= 0
    x ^= x >> 17; x >>>= 0
    x ^= x << 5; x >>>= 0
    return (x >>> 0) / 0x100000000
  }
}

function regenerate(forceNewSeed: boolean) {
  if (forceNewSeed || seed.value === 0) {
    seed.value = Math.floor(Math.random() * 0x7fffffff) || 1
  }
  const rng = makeRng(seed.value)
  const filter = {
    tier: tier.value,
    exCats: exCats.value,
    exTags: exTags.value,
    stance: stance.value,
  }
  let result: SequenceStep[] | null = null
  if (mode.value === 'graph') {
    result = graphWalk({
      n: n.value,
      pool: tricks.tricks,
      edges: transitions.edges,
      filter,
      rng,
    })
  } else if (mode.value === 'known') {
    result = knownShuffle({
      n: n.value,
      tricks: tricks.tricks,
      filter,
      rng,
    })
  } else {
    result = totallyRandom({
      n: Math.min(n.value, 8),
      tricks: tricks.tricks,
      filter,
      rng,
    })
  }
  steps.value = result ?? []
}

function rollNew() {
  regenerate(true)
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      if (!name.value) name.value = defaultName()
      regenerate(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

watch(
  [mode, n, tier, exCats, exTags, stance],
  () => {
    if (!props.visible) return
    scheduleRegen()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (regenTimer != null) window.clearTimeout(regenTimer)
  document.body.style.overflow = ''
})

function defaultName(): string {
  const d = new Date()
  const dd = d.toISOString().slice(0, 10)
  const hm = d.toTimeString().slice(0, 5)
  return `Sequence ${dd} ${hm}`
}

function close() {
  emit('close')
}

function save() {
  if (!steps.value.length) return
  const finalName = name.value.trim() || defaultName()
  emit('save', {
    name: finalName,
    rate: null,
    last: null,
    steps: steps.value.map((s) => ({ name: s.name, side: s.side })),
  })
  name.value = ''
}

const previewSteps = computed(() =>
  steps.value.map((s) => ({ trickId: s.name, side: s.side })),
)

function toggleArr(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed left-0 right-0 top-0 z-50 flex items-end overflow-hidden"
      style="height: 100dvh"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/60" @click="close" />

      <div
        ref="panelRef"
        class="sheet-panel relative w-full bg-card rounded-t-xl p-4 pt-2 max-h-[90dvh] overflow-y-auto border-t border-border"
      >
      <div class="flex justify-center pb-2 -mt-1">
        <div class="w-10 h-1 rounded-full bg-border-2" />
      </div>

      <div class="flex items-center gap-2">
        <h2 class="flex-1 text-lg font-semibold">Generate sequence</h2>
        <button
          type="button"
          class="p-1 text-muted hover:text-fg"
          aria-label="Close"
          @click="close"
        >✕</button>
      </div>

      <section class="mt-3">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Mode</h3>
        <div class="flex gap-1.5">
          <button
            v-for="opt in [
              { v: 'graph', label: 'Graph walk' },
              { v: 'known', label: 'Known shuffle' },
              { v: 'random', label: 'Random' },
            ]"
            :key="opt.v"
            type="button"
            class="flex-1 px-3 py-1.5 rounded-full text-xs border transition-colors"
            :class="mode === opt.v
              ? 'bg-accent text-bg border-accent font-semibold'
              : 'bg-card border-border-2 text-muted hover:text-fg'"
            @click="mode = opt.v as Mode"
          >{{ opt.label }}</button>
        </div>
      </section>

      <section class="mt-4">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-xs uppercase tracking-wide text-muted">Length</h3>
          <span class="text-xs text-fg">{{ n }}</span>
        </div>
        <input
          v-model.number="n"
          type="range"
          min="1"
          :max="nMax"
          step="1"
          class="w-full accent-accent"
        >
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Difficulty up to</h3>
        <select
          v-model.number="tier"
          class="w-full px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
        >
          <option
            v-for="(label, i) in TIER_NAMES"
            :key="i"
            :value="(i + 1)"
          >{{ label }}</option>
        </select>
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Exclude categories</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in CATEGORIES"
            :key="c"
            type="button"
            class="px-2.5 py-1 rounded-full text-xs border transition-colors"
            :class="exCats.includes(c)
              ? 'bg-danger/20 border-danger text-danger font-semibold'
              : 'bg-card border-border-2 text-muted hover:text-fg'"
            @click="exCats = toggleArr(exCats, c)"
          >{{ c }}</button>
        </div>
      </section>

      <section
        v-if="allTags.length"
        class="mt-4"
      >
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Exclude tags</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tg in allTags"
            :key="tg"
            type="button"
            class="px-2.5 py-1 rounded-full text-xs border transition-colors"
            :class="exTags.includes(tg)
              ? 'bg-danger/20 border-danger text-danger font-semibold'
              : 'bg-card border-border-2 text-muted hover:text-fg'"
            @click="exTags = toggleArr(exTags, tg)"
          >#{{ tg }}</button>
        </div>
      </section>

      <section
        v-if="mode === 'random'"
        class="mt-4"
      >
        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            v-model="stance"
            type="checkbox"
            class="accent-accent"
          >
          <span>Match exit → entry stance</span>
        </label>
      </section>

      <section class="mt-4">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-xs uppercase tracking-wide text-muted">Preview</h3>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-xs border border-border-2 text-fg hover:bg-card-2"
            @click="rollNew"
          >🎲 Regenerate</button>
        </div>
        <div class="bg-card-2 border border-border-2 rounded-lg p-2 min-h-[2.5rem]">
          <SequenceChain
            v-if="previewSteps.length"
            :steps="previewSteps"
          />
          <div
            v-else
            class="text-xs text-muted py-1"
          >No sequence — try relaxing filters.</div>
        </div>
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Name</h3>
        <input
          v-model="name"
          type="text"
          placeholder="sequence name"
          class="w-full px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
        >
      </section>

      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="flex-1 py-2 rounded-lg border border-border-2 text-muted hover:text-fg"
          @click="close"
        >Cancel</button>
        <button
          type="button"
          class="flex-1 py-2 rounded-lg bg-accent text-bg font-semibold disabled:opacity-50"
          :disabled="!previewSteps.length"
          @click="save"
        >Save</button>
      </div>
      </div>
    </div>
  </Teleport>
</template>
