<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import TabBar from './components/TabBar.vue'
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

const uiStore = useUiStore()
const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()

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
  <div class="flex flex-col min-h-svh">
    <main class="flex-1 overflow-y-auto pb-20">
      <RouterView />
    </main>
    <TabBar />
    <SequenceSheet />
    <TransitionSheet />
    <TrickSheet />
    <RateFeedback :report="feedbackReport" @close="onFeedbackClose" />
    <ToastStack />
  </div>
</template>
