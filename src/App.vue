<script setup lang="ts">
import { computed } from 'vue'
import TabBar from './components/TabBar.vue'
import RateFeedback, { type Report as RateFeedbackReport } from './components/RateFeedback.vue'
import TrickSheet from './components/TrickSheet.vue'
import TransitionSheet from './components/TransitionSheet.vue'
import SequenceSheet from './components/SequenceSheet.vue'
import { useUiStore } from './stores/ui'

const uiStore = useUiStore()

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
  <div class="flex flex-col min-h-screen">
    <main class="flex-1 overflow-y-auto pb-20">
      <RouterView />
    </main>
    <TabBar />
    <TrickSheet />
    <TransitionSheet />
    <SequenceSheet />
    <RateFeedback :report="feedbackReport" @close="onFeedbackClose" />
  </div>
</template>
