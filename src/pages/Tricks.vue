<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import type { Trick, TrickStatus } from '../domain/types'
import { resolveVideoUrl } from '../domain/video'
import TrickCard from '../components/TrickCard.vue'
import TricksFilterSheet from '../components/TricksFilterSheet.vue'
import { useScrollDirection } from '../composables/useScrollDirection'

const tricksStore = useTricksStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  syncStatusFromQuery()
})

watch(() => route.query.status, () => syncStatusFromQuery())

const STATUS_FROM_QUERY: Record<string, TrickStatus> = {
  'in-progress': 'In Progress',
  'complete': 'Complete',
  'not-started': 'Not Started',
}
const STATUS_TO_QUERY: Record<TrickStatus, string> = {
  'In Progress': 'in-progress',
  'Complete': 'complete',
  'Not Started': 'not-started',
}

const statusFromUrl = computed<TrickStatus | null>(() => {
  const raw = route.query.status
  if (typeof raw !== 'string') return null
  return STATUS_FROM_QUERY[raw] ?? null
})

function syncStatusFromQuery() {
  const fromUrl = statusFromUrl.value
  if (fromUrl == null) return
  // URL wins on mount + route changes — overwrite in-memory selection.
  ui.setTricksStatuses([fromUrl])
}

// Sheet → URL: rewrite when statuses array changes to length 1; clear otherwise.
watch(() => ui.tricksStatuses.slice(), (next) => {
  const hasUrl = typeof route.query.status === 'string'
  if (next.length === 1) {
    const slug = STATUS_TO_QUERY[next[0]]
    if (route.query.status !== slug) {
      void router.replace({ path: route.path, query: { ...route.query, status: slug } })
    }
  } else if (hasUrl) {
    const nextQ = { ...route.query }
    delete nextQ.status
    void router.replace({ path: route.path, query: nextQ })
  }
}, { deep: true })

function clearStatusFromActiveStrip() {
  ui.setTricksStatuses([])
  const next = { ...route.query }
  delete next.status
  void router.replace({ path: route.path, query: next })
}

const filterSheetOpen = ref(false)

const filterCount = computed(() =>
  ui.tricksTiers.length +
  ui.tricksCategories.length +
  ui.tricksStatuses.length +
  (ui.tricksFavOnly ? 1 : 0),
)

const SORT_CYCLE: SortKey[] = ['name', 'best', 'worst']
const SORT_LABEL: Record<SortKey, string> = { name: 'Name', best: 'Best', worst: 'Worst' }
function cycleSort() {
  const i = SORT_CYCLE.indexOf(ui.tricksSort)
  ui.setTricksSort(SORT_CYCLE[(i + 1) % SORT_CYCLE.length])
}

const list = computed<Trick[]>(() =>
  tricksStore.filteredAndSorted({
    tiers: ui.tricksTiers,
    categories: ui.tricksCategories,
    statuses: ui.tricksStatuses,
    favOnly: ui.tricksFavOnly,
    search: ui.tricksSearch,
    sort: ui.tricksSort,
  }),
)

const anyFilterActive = computed(() => filterCount.value > 0 || ui.tricksSearch.length > 0)

const { hidden: stickyHidden } = useScrollDirection({ threshold: 8 })

function onOpen(t: Trick) {
  if (t.id) ui.openSheet(t.id)
}
function onVideo(t: Trick) {
  const { url } = resolveVideoUrl(t)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />

    <div
      class="sticky-bar"
      :class="{ hidden: stickyHidden }"
    >
      <div class="gw-glass px-3 py-2 flex items-center gap-2"
           :style="{ borderRadius: 'var(--radius-g-panel)' }">
        <label class="flex-1 flex items-center gap-2 px-3 py-2"
               :style="{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-g-chip)' }">
          <span aria-hidden="true" :style="{ color: 'var(--color-g-fg-muted)' }">⌕</span>
          <input
            :value="ui.tricksSearch"
            type="search"
            placeholder="Search tricks…"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            class="flex-1 bg-transparent outline-none"
            :style="{ color: 'var(--color-g-fg)', fontSize: 'var(--text-g-body)' }"
            @input="ui.setTricksSearch(($event.target as HTMLInputElement).value)"
          >
        </label>
        <button
          type="button"
          class="px-3 py-2 active:scale-95 transition-transform gw-glass-strong"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          @click="cycleSort"
        >{{ SORT_LABEL[ui.tricksSort] }}</button>
        <button
          type="button"
          class="px-3 py-2 active:scale-95 transition-transform gw-glass-strong"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          aria-label="Open filters"
          @click="filterSheetOpen = true"
        >
          Filters<span
            v-if="filterCount > 0"
            class="ml-1.5 px-1.5 rounded-full font-semibold"
            :style="{ background: 'var(--color-g-brand)', color: 'var(--color-g-base)', fontSize: '10px' }"
          >{{ filterCount }}</span>
        </button>
      </div>
    </div>

    <div class="page-scroll p-3 flex flex-col gap-3" style="padding-top: 0;">
      <!-- spacer so content begins below the sticky bar on initial paint -->
      <div aria-hidden="true" style="height: 72px;" />

      <div
        v-if="statusFromUrl"
        class="flex justify-start"
      >
        <button
          type="button"
          class="gw-glass-strong flex items-center gap-2 px-3 py-1.5 active:scale-95 transition-transform"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          @click="clearStatusFromActiveStrip"
        >
          <span>{{ statusFromUrl }}</span>
          <span :style="{ color: 'var(--color-g-fg-muted)', fontSize: '14px', lineHeight: 1 }">×</span>
        </button>
      </div>

      <div
        v-if="!tricksStore.loaded"
        class="text-muted text-sm py-8 text-center"
      >Loading…</div>

      <div
        v-else-if="!list.length && anyFilterActive"
        class="text-muted text-sm py-8 text-center flex flex-col gap-2 items-center"
      >
        <span>No matches — try clearing filters.</span>
        <button
          type="button"
          class="px-3 py-1.5 active:scale-95 transition-transform gw-glass-strong"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
          @click="filterSheetOpen = true"
        >Open filters</button>
      </div>

      <div
        v-else-if="!list.length"
        class="text-muted text-sm py-8 text-center"
      >No tricks yet.</div>

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

    <TricksFilterSheet
      :visible="filterSheetOpen"
      @close="filterSheetOpen = false"
    />
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
.sticky-bar {
  position: fixed;
  top: env(safe-area-inset-top);
  left: 0.75rem;
  right: 0.75rem;
  z-index: 20;
  transition: transform 200ms ease;
}
.sticky-bar.hidden {
  transform: translateY(calc(-100% - 1rem));
}
</style>
