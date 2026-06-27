<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useSequencesStore, type SequenceSortKey } from '../stores/sequences'
import type { Sequence } from '../domain/types'
import SequenceCard from '../components/SequenceCard.vue'
import GeneratorSheet from '../components/GeneratorSheet.vue'
import { useUiStore } from '../stores/ui'
import { IconGenerate } from '../icons'

const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()
const uiStore = useUiStore()

const sort = ref<SequenceSortKey>('newest')
const generatorOpen = ref(false)

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  if (!transitionsStore.loaded) void transitionsStore.load()
  if (!sequencesStore.loaded) void sequencesStore.load()
})

const list = computed<Sequence[]>(() => sequencesStore.sortedBy(sort.value))

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
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />
    <div class="page-scroll p-3 flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold flex-1">Sequences</h1>
      <select
        v-model="sort"
        class="px-2 py-1.5 bg-card border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
      >
        <option value="newest">Newest</option>
        <option value="best">Best</option>
        <option value="worst">Worst</option>
      </select>
      <button
        type="button"
        class="px-3 py-1.5 rounded-full text-xs bg-accent text-bg font-semibold flex items-center justify-center gap-1.5"
        @click="generatorOpen = true"
      ><IconGenerate :size="16" stroke="1.75" /> Generate</button>
    </div>

    <div
      v-if="!sequencesStore.loaded"
      class="text-muted text-sm py-8 text-center"
    >Loading…</div>

    <div
      v-else-if="!list.length"
      class="text-muted text-sm py-8 text-center"
    >No sequences yet — tap <strong>Generate</strong> to build one.</div>

    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      <SequenceCard
        v-for="s in list"
        :key="s.id"
        :sequence="s"
        @report="onReport"
        @remove="onRemove"
        @open="uiStore.openSequence($event)"
      />
    </div>

      <GeneratorSheet
        :visible="generatorOpen"
        @close="generatorOpen = false"
        @save="onSave"
      />
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
