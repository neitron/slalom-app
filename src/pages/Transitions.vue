<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useUiStore } from '../stores/ui'
import { CATEGORIES } from '../domain/constants'
import type { Category, Transition, Trick } from '../domain/types'
import ChipFilter, { type ChipOption } from '../components/ChipFilter.vue'
import TransitionCard from '../components/TransitionCard.vue'

type TSort = 'name' | 'best' | 'worst' | 'recent'

const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const uiStore = useUiStore()

const search = ref('')
const sort = ref<TSort>('name')
const category = ref<Category | 'all'>('all')

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  if (!transitionsStore.loaded) void transitionsStore.load()
})

const categoryOptions = computed<ChipOption[]>(() => {
  const opts: ChipOption[] = [{ value: 'all', label: 'all' }]
  for (const c of CATEGORIES) opts.push({ value: c, label: c })
  return opts
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
  const q = search.value.trim().toLowerCase()
  let list = rows.value
  if (category.value !== 'all') {
    list = list.filter((r) => r.from.category === category.value || r.to.category === category.value)
  }
  if (q) {
    list = list.filter(
      (r) => r.from.name.toLowerCase().includes(q) || r.to.name.toLowerCase().includes(q),
    )
  }
  const arr = list.slice()
  if (sort.value === 'name') {
    arr.sort((a, b) =>
      a.from.name.localeCompare(b.from.name) || a.to.name.localeCompare(b.to.name),
    )
  } else if (sort.value === 'best') {
    arr.sort(
      (a, b) =>
        (b.edge.rate ?? -1) - (a.edge.rate ?? -1) ||
        a.from.name.localeCompare(b.from.name),
    )
  } else if (sort.value === 'worst') {
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

function setCategory(v: string | string[]) {
  category.value = v as Category | 'all'
}

function onOpen(id: string) {
  uiStore.openTransition(id)
}
</script>

<template>
  <div class="p-3 flex flex-col gap-3">
    <h1 class="text-lg font-semibold">Transitions</h1>

    <ChipFilter
      :options="categoryOptions"
      :model-value="category"
      @update:model-value="setCategory"
    />

    <div class="flex gap-2">
      <input
        v-model="search"
        type="search"
        placeholder="Search by trick name…"
        class="flex-1 px-2.5 py-2 bg-card border border-border-2 rounded-lg text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
      >
      <select
        v-model="sort"
        class="px-2 py-2 bg-card border border-border-2 rounded-lg text-xs text-muted cursor-pointer focus:outline-none focus:border-accent"
      >
        <option value="name">A–Z</option>
        <option value="best">Best first</option>
        <option value="worst">Worst first</option>
        <option value="recent">Recent</option>
      </select>
    </div>

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
