<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

const headerRef = ref<HTMLElement | null>(null)
let headerObserver: ResizeObserver | null = null
let lastHeaderH = ''
let headerRafPending = false

function writeHeaderH() {
  headerRafPending = false
  const el = headerRef.value
  if (!el) return
  const h = el.offsetHeight + 'px'
  if (h !== lastHeaderH) {
    lastHeaderH = h
    document.documentElement.style.setProperty('--header-h', h)
  }
}

function scheduleHeaderWrite() {
  if (headerRafPending) return
  headerRafPending = true
  requestAnimationFrame(writeHeaderH)
}

onMounted(() => {
  window.addEventListener('slalom:pulled', onPulled)
  window.addEventListener('slalom:error', onError as EventListener)
  if (headerRef.value && typeof ResizeObserver !== 'undefined') {
    headerObserver = new ResizeObserver(() => scheduleHeaderWrite())
    headerObserver.observe(headerRef.value)
    scheduleHeaderWrite()
  } else if (headerRef.value) {
    scheduleHeaderWrite()
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('slalom:pulled', onPulled)
  window.removeEventListener('slalom:error', onError as EventListener)
  if (headerObserver) {
    headerObserver.disconnect()
    headerObserver = null
  }
  document.documentElement.style.removeProperty('--header-h')
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
  <div :style="{ paddingTop: 'env(safe-area-inset-top)' }">
    <header
      v-if="showHeader"
      ref="headerRef"
      class="sticky top-0 z-30 flex justify-end items-center px-3 py-1 bg-card/95 backdrop-blur border-b border-border"
      :style="{
        marginTop: 'calc(env(safe-area-inset-top) * -1)',
        paddingTop: 'env(safe-area-inset-top)',
      }"
    >
      <HeaderProfileMenu />
    </header>
    <main>
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
