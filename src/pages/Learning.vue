<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { CATEGORIES } from '../domain/constants'
import { effectiveRate, hasRate } from '../domain/rating'
import type { Category, Trick } from '../domain/types'
import ChipFilter, { type ChipOption } from '../components/ChipFilter.vue'
import SearchSort, { type SortMode } from '../components/SearchSort.vue'
import ForeignLearningList from '../components/ForeignLearningList.vue'

const tricksStore = useTricksStore()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
})

const search = ref('')
const category = ref<Category | 'all'>('all')
const sortMode = ref<SortMode>('worst')

const practiced = computed<Trick[]>(() => tricksStore.tricks.filter(hasRate))

const categoryOptions = computed<ChipOption[]>(() => {
  const opts: ChipOption[] = [{ value: 'all', label: 'all', count: practiced.value.length }]
  for (const c of CATEGORIES) {
    const count = practiced.value.filter((t) => t.category === c).length
    if (count > 0) opts.push({ value: c, label: c, count })
  }
  return opts
})

const sortKey = computed<SortKey>(() => (sortMode.value === '' ? 'name' : sortMode.value))

const list = computed<Trick[]>(() => {
  const q = search.value.trim().toLowerCase()
  let arr = practiced.value.slice()
  if (category.value !== 'all') arr = arr.filter((t) => t.category === category.value)
  if (q) {
    arr = arr.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.aliases.some((a) => a.toLowerCase().includes(q)),
    )
  }
  arr.sort((a, b) => {
    if (sortKey.value === 'name') return a.name.localeCompare(b.name)
    const ra = effectiveRate(a) ?? 0
    const rb = effectiveRate(b) ?? 0
    return sortKey.value === 'best'
      ? rb - ra || a.name.localeCompare(b.name)
      : ra - rb || a.name.localeCompare(b.name)
  })
  return arr
})

function setCategory(v: string | string[]) {
  category.value = v as Category | 'all'
}
</script>

<template>
  <div class="p-3 flex flex-col gap-3">
    <h1 class="text-lg font-semibold">Learning</h1>

    <ChipFilter
      :options="categoryOptions"
      :model-value="category"
      @update:model-value="setCategory"
    />

    <SearchSort
      :search="search"
      :sort="sortMode"
      placeholder="Search practiced…"
      @update:search="search = $event"
      @update:sort="sortMode = $event"
    />

    <div v-if="!tricksStore.loaded" class="text-muted text-sm py-8 text-center">Loading…</div>

    <ForeignLearningList v-else :tricks="list" :readonly="false" />
  </div>
</template>
