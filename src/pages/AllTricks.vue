<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { CATEGORIES, TIER_NAMES } from '../domain/constants'
import type { Category, Tier, Trick, TrickStatus } from '../domain/types'
import { resolveVideoUrl } from '../domain/video'
import TierTabs, { type TierOption } from '../components/TierTabs.vue'
import ChipFilter, { type ChipOption } from '../components/ChipFilter.vue'
import SearchSort, { type SortMode } from '../components/SearchSort.vue'
import TrickCard from '../components/TrickCard.vue'
import { useRoute, useRouter } from 'vue-router'

const tricksStore = useTricksStore()
const uiStore = useUiStore()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
})

const sortMode = ref<SortMode>('')

const route = useRoute()
const router = useRouter()

const STATUS_FROM_QUERY: Record<string, TrickStatus> = {
  'in-progress': 'In Progress',
  'complete': 'Complete',
  'not-started': 'Not Started',
}

const statusFilter = computed<TrickStatus | null>(() => {
  const raw = route.query.status
  if (typeof raw !== 'string') return null
  return STATUS_FROM_QUERY[raw] ?? null
})

function clearStatusFilter() {
  const next = { ...route.query }
  delete next.status
  void router.replace({ path: route.path, query: next })
}

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
    status: statusFilter.value,
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
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />
    <div class="page-scroll p-3 flex flex-col gap-3">
      <h1 class="text-lg font-semibold">All Tricks</h1>

    <div
      v-if="statusFilter"
      class="flex justify-start"
    >
      <button
        type="button"
        class="gw-glass-strong flex items-center gap-2 px-3 py-1.5 active:scale-95 transition-transform"
        :style="{
          borderRadius: 'var(--radius-g-chip)',
          color: 'var(--color-g-fg)',
          fontSize: 'var(--text-g-micro)',
        }"
        @click="clearStatusFilter"
      >
        <span>{{ statusFilter }}</span>
        <span :style="{ color: 'var(--color-g-fg-muted)', fontSize: '14px', lineHeight: 1 }">×</span>
      </button>
    </div>

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
</style>
