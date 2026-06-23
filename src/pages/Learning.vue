<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { CATEGORIES, TIERS } from '../domain/constants'
import { effectiveRate, hasRate } from '../domain/rating'
import type { Category, Trick } from '../domain/types'
import { displayName } from '../domain/display'
import { resolveVideoUrl } from '../domain/video'
import ChipFilter, { type ChipOption } from '../components/ChipFilter.vue'
import SearchSort, { type SortMode } from '../components/SearchSort.vue'
import RateDots from '../components/RateDots.vue'

const tricksStore = useTricksStore()
const uiStore = useUiStore()

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

function onOpen(t: Trick) {
  if (t.id) uiStore.openSheet(t.id)
}

function onVideo(t: Trick, e: MouseEvent) {
  e.stopPropagation()
  const { url } = resolveVideoUrl(t)
  window.open(url, '_blank', 'noopener,noreferrer')
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

    <div
      v-if="!tricksStore.loaded"
      class="text-muted text-sm py-8 text-center"
    >Loading…</div>

    <div
      v-else-if="!list.length"
      class="text-muted text-sm py-8 text-center"
    >Nothing practiced yet. Report a trick to see it here.</div>

    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      <div
        v-for="t in list"
        :key="t.id"
        class="bg-card border border-border rounded-xl p-3 cursor-pointer active:bg-border/40 transition-colors"
        role="button"
        tabindex="0"
        @click="onOpen(t)"
        @keydown.enter="onOpen(t)"
        @keydown.space.prevent="onOpen(t)"
      >
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <span v-if="t.fav" class="text-fav">★</span>
            <span v-if="t.icon" class="text-base leading-none">{{ t.icon }}</span>
            <span class="font-medium text-fg">{{ displayName(t) }}</span>
          </div>
          <button
            type="button"
            class="shrink-0 -mt-0.5 -mr-1 p-1 rounded hover:bg-border/40"
            :class="t.video ? 'text-accent' : 'text-muted'"
            :title="t.video ? 'Watch tutorial' : 'Search tutorial'"
            @click="onVideo(t, $event)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </button>
        </div>

        <div class="text-muted text-xs mt-1 truncate">
          <span class="text-accent/80">{{ TIERS[t.tier] }}</span>
          <span> · {{ t.category }}</span>
          <span v-if="t.aliases.filter(a => a !== t.mainAlias).length"> · aka {{ t.aliases.filter(a => a !== t.mainAlias).join(', ') }}</span>
          <span v-if="t.tags.length" class="text-accent/80"> · {{ t.tags.map(x => '#' + x).join(' ') }}</span>
        </div>

        <div class="mt-2">
          <RateDots
            :rate="t.rate"
            :rate-l="t.rateL"
            :rate-r="t.rateR"
            :lr="t.lr"
          />
        </div>
      </div>
    </div>
  </div>
</template>
