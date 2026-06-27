<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
import { getAllTransitions, getAllSequences } from './storage/repo'
import { useIosKeyboardReset } from './composables/useIosKeyboardReset'

const uiStore = useUiStore()
const route = useRoute()
const tricksStore = useTricksStore()
const hideTabs = computed(() => !!route.meta.hideTabs)
const fullViewport = computed(() => !!route.meta.fullViewport)
const mainPaddingBottom = computed(() =>
  hideTabs.value || fullViewport.value
    ? '0px'
    : 'calc(env(safe-area-inset-bottom) + 6.5rem)',
)
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()

useIosKeyboardReset()

async function reloadStoresFromDexie() {
  const [edges, sequences] = await Promise.all([
    getAllTransitions(),
    getAllSequences(),
  ])
  // tricks store uses canonicals + overlays state — reload via store's own load action
  tricksStore.loaded = false
  void tricksStore.load()
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
    :style="{
      paddingTop: 'env(safe-area-inset-top)',
      background: 'var(--color-g-base)',
      minHeight: '100dvh',
    }"
  >
    <main :style="{ paddingBottom: mainPaddingBottom }">
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
