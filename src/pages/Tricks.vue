<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTricksStore, type SortKey } from '../stores/tricks'
import { useUiStore, type TricksSubTab, type LibrarySortKey } from '../stores/ui'
import type { Trick, TrickStatus } from '../domain/types'
import { resolveVideoUrl } from '../domain/video'
import TrickCard from '../components/TrickCard.vue'
import TricksFilterSheet from '../components/TricksFilterSheet.vue'
import TrickCreationSheet from '../components/TrickCreationSheet.vue'
import LibraryList from '../components/LibraryList.vue'
import LibraryFilterSheet from '../components/LibraryFilterSheet.vue'
import { useScrollDirection } from '../composables/useScrollDirection'
import { IconFavOn, IconSearch, IconFilter, IconClose, IconPlus } from '../icons'

const tricksStore = useTricksStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  syncSubTabFromRoute()
  syncStatusFromQuery()
})

// ─── Sub-tab routing (mirrors Sequences pattern) ───────────────────────────
watch(() => route.meta.subTab, () => syncSubTabFromRoute())

function syncSubTabFromRoute() {
  const meta = route.meta.subTab as TricksSubTab | undefined
  ui.setTricksSubTab(meta === 'library' ? 'library' : 'my-tricks')
}

function switchSubTab(tab: TricksSubTab) {
  ui.setTricksSubTab(tab)
  const target = tab === 'library' ? '/tricks/library' : '/tricks'
  if (route.path !== target) void router.replace(target)
}

// ─── ?status= URL sync (My Tricks only) ────────────────────────────────────
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

// ─── Active filter chips (My Tricks) ───────────────────────────────────────
interface ActiveFilterChip {
  key: string
  label: string
  remove: () => void
}

const activeFilterChips = computed<ActiveFilterChip[]>(() => {
  const chips: ActiveFilterChip[] = []
  for (const t of ui.tricksTiers) {
    chips.push({
      key: `tier-${t}`,
      label: `T${t}`,
      remove: () => ui.setTricksTiers(ui.tricksTiers.filter((x) => x !== t)),
    })
  }
  for (const c of ui.tricksCategories) {
    chips.push({
      key: `cat-${c}`,
      label: c,
      remove: () => ui.setTricksCategories(ui.tricksCategories.filter((x) => x !== c)),
    })
  }
  for (const s of ui.tricksStatuses) {
    chips.push({
      key: `status-${s}`,
      label: s,
      // The tricksStatuses watcher handles URL cleanup automatically.
      remove: () => ui.setTricksStatuses(ui.tricksStatuses.filter((x) => x !== s)),
    })
  }
  if (ui.tricksFavOnly) {
    chips.push({
      key: 'fav',
      label: 'Favorites',
      remove: () => ui.setTricksFavOnly(false),
    })
  }
  return chips
})

// ─── Sheets ─────────────────────────────────────────────────────────────────
const filterSheetOpen = ref(false)
const libraryFilterOpen = ref(false)
const creationSheetOpen = ref(false)

function onTrickCreated(id: string): void {
  creationSheetOpen.value = false
  ui.openSheet(id)
}

// ─── Filter count (per sub-tab) ─────────────────────────────────────────────
const filterCount = computed(() => {
  if (ui.tricksSubTab === 'my-tricks') {
    return (
      ui.tricksTiers.length +
      ui.tricksCategories.length +
      ui.tricksStatuses.length +
      (ui.tricksFavOnly ? 1 : 0)
    )
  }
  return ui.libraryTiers.length + ui.libraryCategories.length
})

// ─── Sort cycle (per sub-tab) ────────────────────────────────────────────────
const TRICKS_SORT_CYCLE: SortKey[] = ['name', 'best', 'worst']
const TRICKS_SORT_LABEL: Record<SortKey, string> = { name: 'Name', best: 'Best', worst: 'Worst' }
const LIBRARY_SORT_CYCLE: LibrarySortKey[] = ['newest', 'name']
const LIBRARY_SORT_LABEL: Record<LibrarySortKey, string> = { newest: 'Newest', name: 'Name' }

const sortLabel = computed(() =>
  ui.tricksSubTab === 'my-tricks'
    ? TRICKS_SORT_LABEL[ui.tricksSort]
    : LIBRARY_SORT_LABEL[ui.librarySort],
)

function cycleSort() {
  if (ui.tricksSubTab === 'my-tricks') {
    const i = TRICKS_SORT_CYCLE.indexOf(ui.tricksSort)
    ui.setTricksSort(TRICKS_SORT_CYCLE[(i + 1) % TRICKS_SORT_CYCLE.length])
  } else {
    const i = LIBRARY_SORT_CYCLE.indexOf(ui.librarySort)
    ui.setLibrarySort(LIBRARY_SORT_CYCLE[(i + 1) % LIBRARY_SORT_CYCLE.length])
  }
}

// ─── Search (per sub-tab) ───────────────────────────────────────────────────
const searchValue = computed(() =>
  ui.tricksSubTab === 'my-tricks' ? ui.tricksSearch : ui.librarySearch,
)
function setSearch(v: string) {
  if (ui.tricksSubTab === 'my-tricks') ui.setTricksSearch(v)
  else ui.setLibrarySearch(v)
}

// ─── My Tricks list ─────────────────────────────────────────────────────────
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

    <div class="page-scroll p-3 flex flex-col gap-3">
      <!-- Sticky top bar: row 1 (collapsible) + row 2 (pinned sub-tabs) -->
      <div class="sticky-bar">
        <div class="gw-glass" :style="{ borderRadius: 'var(--radius-g-panel)', padding: '8px 12px' }">
          <!-- Row 1: search + sort + filter (collapsible) -->
          <div class="search-row flex items-center gap-2" :class="{ collapsed: stickyHidden }">
            <label class="flex-1 min-w-0 flex items-center gap-2 px-3 py-2"
                   :style="{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-g-chip)' }">
              <IconSearch :size="16" stroke="1.75" :style="{ color: 'var(--color-g-fg-muted)' }" aria-hidden="true" />
              <input
                :value="searchValue"
                type="search"
                placeholder="Search…"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                class="flex-1 min-w-0 bg-transparent outline-none"
                :style="{ color: 'var(--color-g-fg)', fontSize: 'var(--text-g-body)' }"
                @input="setSearch(($event.target as HTMLInputElement).value)"
              >
            </label>
            <button
              type="button"
              class="shrink-0 px-3 py-2 active:scale-95 transition-transform gw-glass-strong"
              :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
              @click="cycleSort"
            >{{ sortLabel }}</button>
            <button
              type="button"
              class="shrink-0 relative w-9 h-9 grid place-items-center active:scale-95 transition-transform gw-glass-strong"
              :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
              aria-label="Open filters"
              @click="ui.tricksSubTab === 'my-tricks' ? filterSheetOpen = true : libraryFilterOpen = true"
            >
              <IconFilter :size="16" stroke="1.75" aria-hidden="true" />
              <span
                v-if="filterCount > 0"
                class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full font-semibold"
                :style="{ background: 'var(--color-g-brand)', color: 'var(--color-g-base)', fontSize: '10px' }"
              >{{ filterCount }}</span>
            </button>
          </div>

          <!-- Row 2: sub-tabs (always pinned; margin-bottom on .search-row collapses the gap) -->
          <div class="flex flex-wrap gap-1">
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :style="ui.tricksSubTab === 'my-tricks'
                ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }"
              @click="switchSubTab('my-tricks')"
            >My Tricks</button>
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :style="ui.tricksSubTab === 'library'
                ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }"
              @click="switchSubTab('library')"
            >Library</button>
          </div>
        </div>
      </div>

      <!-- My Tricks sub-tab content -->
      <template v-if="ui.tricksSubTab === 'my-tricks'">
        <div
          v-if="activeFilterChips.length > 0"
          class="flex flex-wrap gap-1.5"
        >
          <button
            v-for="chip in activeFilterChips"
            :key="chip.key"
            type="button"
            class="gw-glass-strong flex items-center gap-2 px-3 py-1.5 active:scale-95 transition-transform"
            :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-micro)' }"
            @click="chip.remove"
          >
            <IconFavOn v-if="chip.key === 'fav'" :size="12" stroke="1.75" />
            <span>{{ chip.label }}</span>
            <IconClose :size="14" stroke="1.75" :style="{ color: 'var(--color-g-fg-muted)' }" />
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
      </template>

      <!-- Library sub-tab content -->
      <template v-else>
        <LibraryList />
      </template>
    </div>

    <!-- FAB: visible only on My Tricks sub-tab -->
    <button
      v-if="ui.tricksSubTab === 'my-tricks'"
      type="button"
      class="fab"
      aria-label="Create new trick"
      @click="creationSheetOpen = true"
    >
      <IconPlus :size="18" stroke="1.75" />
      <span>New trick</span>
    </button>

    <TricksFilterSheet
      :visible="filterSheetOpen"
      @close="filterSheetOpen = false"
    />

    <LibraryFilterSheet
      :visible="libraryFilterOpen"
      @close="libraryFilterOpen = false"
    />

    <TrickCreationSheet
      v-if="ui.tricksSubTab === 'my-tricks'"
      :visible="creationSheetOpen"
      @close="creationSheetOpen = false"
      @created="onTrickCreated"
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
  position: sticky;
  /* App.vue's wrapper paddingTop only affects INITIAL layout. position: sticky
     tracks the viewport when stuck, so top must include the safe-area inset
     directly — otherwise the bar slides under the notch on scroll. */
  top: env(safe-area-inset-top);
  z-index: 20;
  will-change: transform;
  /* horizontal inset matches Sequences.vue so the sticky-bar feels anchored consistently across pages */
  margin: 0 0.75rem;
}

.search-row {
  max-height: 80px;
  overflow: hidden;
  opacity: 1;
  margin-bottom: 8px;
  transition:
    max-height var(--motion-g-base) var(--ease-g-out),
    opacity var(--motion-g-base) var(--ease-g-out),
    margin-bottom var(--motion-g-base) var(--ease-g-out);
}
.search-row.collapsed {
  max-height: 0;
  opacity: 0;
  margin-bottom: 0;
  pointer-events: none;
}

.fab {
  position: fixed;
  right: 1rem;
  bottom: calc(var(--tabbar-h, 4rem) + max(env(safe-area-inset-bottom), 0.5rem) + 1.5rem);
  height: 44px;
  padding: 0 16px 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  color: white;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow:
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.18),
    0 4px 16px rgba(0, 0, 0, 0.30);
  z-index: 30;
  transition: transform var(--motion-g-fast) var(--ease-g-out);
}
.fab:active {
  transform: scale(0.95);
}
</style>
