<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useSequencesStore } from '../stores/sequences'
import type { Sequence } from '../domain/types'
import { useUiStore, type SequencesSubTab, type SequencesSortKey, type TransitionsSortKey } from '../stores/ui'
import SequenceCard from '../components/SequenceCard.vue'
import GeneratorSheet from '../components/GeneratorSheet.vue'
import TransitionsList from '../components/TransitionsList.vue'
import TransitionsFilterSheet from '../components/TransitionsFilterSheet.vue'
import { useScrollDirection } from '../composables/useScrollDirection'
import { IconSearch, IconFilter, IconGenerate } from '../icons'

const tricksStore = useTricksStore()
// transitionsStore is preloaded here (not consumed by the parent template) so TransitionsList mounts without a loading flash on sub-tab switch
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const generatorOpen = ref(false)
const transitionsFilterOpen = ref(false)

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  if (!transitionsStore.loaded) void transitionsStore.load()
  if (!sequencesStore.loaded) void sequencesStore.load()
  syncSubTabFromRoute()
})

watch(() => route.meta.subTab, () => syncSubTabFromRoute())

function syncSubTabFromRoute() {
  const meta = route.meta.subTab as SequencesSubTab | undefined
  ui.setSequencesSubTab(meta === 'transitions' ? 'transitions' : 'sequences')
}

function switchSubTab(tab: SequencesSubTab) {
  ui.setSequencesSubTab(tab)
  const target = tab === 'transitions' ? '/sequences/transitions' : '/sequences'
  if (route.path !== target) void router.replace(target)
}

// Sort cycle — different per sub-tab
const SEQ_SORT_CYCLE: SequencesSortKey[] = ['newest', 'best', 'worst']
const SEQ_SORT_LABEL: Record<SequencesSortKey, string> = { newest: 'Newest', best: 'Best', worst: 'Worst' }
const TRA_SORT_CYCLE: TransitionsSortKey[] = ['name', 'best', 'worst', 'recent']
const TRA_SORT_LABEL: Record<TransitionsSortKey, string> = { name: 'Name', best: 'Best', worst: 'Worst', recent: 'Recent' }

const sortLabel = computed(() =>
  ui.sequencesSubTab === 'sequences'
    ? SEQ_SORT_LABEL[ui.sequencesSort]
    : TRA_SORT_LABEL[ui.transitionsSort],
)

function cycleSort() {
  if (ui.sequencesSubTab === 'sequences') {
    const i = SEQ_SORT_CYCLE.indexOf(ui.sequencesSort)
    ui.setSequencesSort(SEQ_SORT_CYCLE[(i + 1) % SEQ_SORT_CYCLE.length])
  } else {
    const i = TRA_SORT_CYCLE.indexOf(ui.transitionsSort)
    ui.setTransitionsSort(TRA_SORT_CYCLE[(i + 1) % TRA_SORT_CYCLE.length])
  }
}

const searchValue = computed(() =>
  ui.sequencesSubTab === 'sequences' ? ui.sequencesSearch : ui.transitionsSearch,
)
function setSearch(v: string) {
  if (ui.sequencesSubTab === 'sequences') ui.setSequencesSearch(v)
  else ui.setTransitionsSearch(v)
}

const filterCount = computed(() => {
  if (ui.sequencesSubTab === 'sequences') return 0
  return ui.transitionsCategory !== 'all' ? 1 : 0
})

const showFilterButton = computed(() => ui.sequencesSubTab === 'transitions')

const sequences = computed<Sequence[]>(() => {
  const all = sequencesStore.sortedBy(ui.sequencesSort)
  const q = ui.sequencesSearch.trim().toLowerCase()
  if (!q) return all
  return all.filter((s) => s.name.toLowerCase().includes(q))
})

async function onSave(seq: Omit<Sequence, 'id' | 'created'>): Promise<void> {
  await sequencesStore.create({ name: seq.name, steps: seq.steps })
  generatorOpen.value = false
}
async function onReport(id: string, score: number): Promise<void> {
  await sequencesStore.report(id, score)
}
async function onRemove(id: string): Promise<void> {
  await sequencesStore.remove(id)
}

const { hidden: stickyHidden } = useScrollDirection({ threshold: 8 })
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
              v-if="showFilterButton"
              type="button"
              class="shrink-0 relative w-9 h-9 grid place-items-center active:scale-95 transition-transform gw-glass-strong"
              :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
              aria-label="Open filters"
              @click="transitionsFilterOpen = true"
            >
              <IconFilter :size="16" stroke="1.75" aria-hidden="true" />
              <span
                v-if="filterCount > 0"
                class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full font-semibold"
                :style="{ background: 'var(--color-g-brand)', color: 'var(--color-g-base)', fontSize: '10px' }"
              >{{ filterCount }}</span>
            </button>
          </div>

          <!-- Row 2: sub-tabs (always pinned; pt-* gap lives on .search-row's margin-bottom so it collapses with the row) -->
          <div class="flex flex-wrap gap-1">
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :style="ui.sequencesSubTab === 'sequences'
                ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }"
              @click="switchSubTab('sequences')"
            >Sequences</button>
            <button
              type="button"
              class="px-3 py-1.5 transition-colors"
              :style="ui.sequencesSubTab === 'transitions'
                ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }"
              @click="switchSubTab('transitions')"
            >Transitions</button>
          </div>
        </div>
      </div>

      <!-- Sub-tab content -->
      <template v-if="ui.sequencesSubTab === 'sequences'">
        <div
          v-if="!sequencesStore.loaded"
          class="text-muted text-sm py-8 text-center"
        >Loading…</div>
        <div
          v-else-if="!sequences.length"
          class="text-muted text-sm py-8 text-center"
        >No sequences yet — tap <strong>Generate</strong> to build one.</div>
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <SequenceCard
            v-for="s in sequences"
            :key="s.id"
            :sequence="s"
            @report="onReport"
            @remove="onRemove"
            @open="ui.openSequence($event)"
          />
        </div>
      </template>

      <template v-else>
        <TransitionsList />
      </template>
    </div>

    <!-- FAB: visible only on Sequences sub-tab -->
    <button
      v-if="ui.sequencesSubTab === 'sequences'"
      type="button"
      class="fab"
      aria-label="Generate sequence"
      @click="generatorOpen = true"
    >
      <IconGenerate :size="18" stroke="1.75" />
      <span>Generate</span>
    </button>

    <GeneratorSheet
      :visible="generatorOpen"
      @close="generatorOpen = false"
      @save="onSave"
    />

    <TransitionsFilterSheet
      :visible="transitionsFilterOpen"
      @close="transitionsFilterOpen = false"
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
  /* horizontal inset matches Tricks.vue so the sticky-bar feels anchored consistently across pages */
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
