<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { CATEGORIES, TIER_NAMES } from '../domain/constants'
import type { Category, Tier, Trick } from '../domain/types'
import { resolveVideoUrl } from '../domain/video'
import TierTabs, { type TierOption } from '../components/TierTabs.vue'
import ChipFilter, { type ChipOption } from '../components/ChipFilter.vue'
import SearchSort, { type SortMode } from '../components/SearchSort.vue'
import TrickCard from '../components/TrickCard.vue'

const tricksStore = useTricksStore()
const uiStore = useUiStore()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
})

const sortMode = ref<SortMode>('')

const tierOptions = computed<TierOption[]>(() =>
  TIER_NAMES.map((name, i) => {
    const tier = (i + 1) as Tier
    return { tier, name, count: tricksStore.byTier(tier).length }
  }),
)

const categoryOptions = computed<ChipOption[]>(() => {
  const inTier = tricksStore.byTier(uiStore.tier)
  const opts: ChipOption[] = [{ value: 'all', label: 'all', count: inTier.length }]
  for (const c of CATEGORIES) {
    const count = inTier.filter((t) => t.category === c).length
    opts.push({ value: c, label: c, count })
  }
  return opts
})

const sortKey = computed<SortKey>(() => (sortMode.value === '' ? 'name' : sortMode.value))

const list = computed<Trick[]>(() =>
  tricksStore.filteredAndSorted({
    tier: uiStore.tier,
    category: uiStore.category,
    search: uiStore.search,
    sort: sortKey.value,
  }),
)

function setTier(v: number) {
  uiStore.setTier(v as Tier)
}

function setCategory(v: string | string[]) {
  uiStore.setCategory(v as Category | 'all')
}

function onOpen(t: Trick) {
  if (t.id) uiStore.openSheet(t.id)
}

function onVideo(t: Trick) {
  const { url } = resolveVideoUrl(t)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="p-3 flex flex-col gap-3">
    <h1 class="text-lg font-semibold">All Tricks</h1>

    <TierTabs
      :tiers="tierOptions"
      :model-value="uiStore.tier"
      @update:model-value="setTier"
    />

    <ChipFilter
      :options="categoryOptions"
      :model-value="uiStore.category"
      @update:model-value="setCategory"
    />

    <SearchSort
      :search="uiStore.search"
      :sort="sortMode"
      @update:search="uiStore.setSearch($event)"
      @update:sort="sortMode = $event"
    />

    <div
      v-if="!tricksStore.loaded"
      class="text-muted text-sm py-8 text-center"
    >Loading…</div>

    <div
      v-else-if="!list.length"
      class="text-muted text-sm py-8 text-center"
    >No tricks match.</div>

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
</template>
