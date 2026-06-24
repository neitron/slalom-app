<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import HeaderProfileMenu from './components/HeaderProfileMenu.vue'
import RateFeedback, { type Report as RateFeedbackReport } from './components/RateFeedback.vue'
import TrickSheet from './components/TrickSheet.vue'
import TransitionSheet from './components/TransitionSheet.vue'
import SequenceSheet from './components/SequenceSheet.vue'
import ToastStack from './components/ToastStack.vue'
import { useUiStore } from './stores/ui'
import { useTricksStore } from './stores/tricks'
import { useTransitionsStore } from './stores/transitions'
import { useSequencesStore } from './stores/sequences'
import { getAllTricks, getAllTransitions, getAllSequences } from './storage/repo'

const route = useRoute()
const uiStore = useUiStore()
const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()

const showTabs = computed(() => !route.meta.hideTabs)
const showHeader = computed(() => !route.meta.hideTabs)

async function reloadStoresFromDexie() {
  const [tricks, edges, sequences] = await Promise.all([
    getAllTricks(),
    getAllTransitions(),
    getAllSequences(),
  ])
  tricksStore.tricks = tricks
  tricksStore.loaded = true
  transitionsStore.edges = edges
  transitionsStore.loaded = true
  sequencesStore.sequences = sequences
  sequencesStore.loaded = true
}

const onPulled = () => { void reloadStoresFromDexie() }
const onError = (e: Event) => {
  const msg = (e as CustomEvent<{ message: string }>).detail?.message
  if (msg) uiStore.showError(msg)
}
onMounted(() => {
  window.addEventListener('slalom:pulled', onPulled)
  window.addEventListener('slalom:error', onError as EventListener)
})
onBeforeUnmount(() => {
  window.removeEventListener('slalom:pulled', onPulled)
  window.removeEventListener('slalom:error', onError as EventListener)
})

const feedbackReport = computed<RateFeedbackReport | null>(() => {
  const f = uiStore.feedback
  if (!f) return null
  return { score: f.score, side: f.side, context: f.context, label: f.label }
})

function onFeedbackClose() {
  uiStore.clearFeedback()
}
</script>

<template>
  <div
    class="flex flex-col min-h-svh"
    :style="{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }"
  >
    <header
      v-if="showHeader"
      class="shrink-0 flex justify-end items-center px-3 py-1 bg-card/60 border-b border-border"
    >
      <HeaderProfileMenu />
    </header>
    <main class="flex-1 min-h-0 overflow-y-auto">
      <RouterView />
    </main>
    <TabBar v-if="showTabs" />
    <SequenceSheet />
    <TransitionSheet />
    <TrickSheet />
    <RateFeedback :report="feedbackReport" @close="onFeedbackClose" />
    <ToastStack />
  </div>
</template>
