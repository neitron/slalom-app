<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useUiStore } from '../stores/ui'
import type { Transition, Trick } from '../domain/types'
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
