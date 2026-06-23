<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { Sequence, Side } from '../domain/types'
import { useUiStore } from '../stores/ui'
import RateDots from './RateDots.vue'
import SequenceChain from './SequenceChain.vue'

const uiStore = useUiStore()

const props = defineProps<{ sequence: Sequence }>()

const emit = defineEmits<{
  (e: 'report', id: string, score: number): void
  (e: 'remove', id: string): void
  (e: 'open', id: string): void
}>()

function onOpen() {
  if (props.sequence.id) emit('open', props.sequence.id)
}

const SCORES = [1, 2, 3, 4, 5] as const
const HINTS: Record<number, string> = {
  1: 'bad',
  2: 'rough',
  3: 'ok',
  4: 'good',
  5: 'excellent',
}

const flash = ref<number | null>(null)
let flashTimer: number | null = null

function pick(score: number) {
  if (!props.sequence.id) return
  flash.value = score
  if (flashTimer != null) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => { flash.value = null; flashTimer = null }, 450)
  const s = score as 1 | 2 | 3 | 4 | 5
  uiStore.triggerFeedback({ score: s, side: null, context: 'sequence' })
  emit('report', props.sequence.id, score)
}

const removeArmed = ref(false)
let removeTimer: number | null = null

function clearRemoveTimer() {
  if (removeTimer != null) {
    window.clearTimeout(removeTimer)
    removeTimer = null
  }
}

function armRemove() {
  if (!props.sequence.id) return
  if (removeArmed.value) {
    clearRemoveTimer()
    removeArmed.value = false
    emit('remove', props.sequence.id)
    return
  }
  removeArmed.value = true
  clearRemoveTimer()
  removeTimer = window.setTimeout(() => {
    removeArmed.value = false
    removeTimer = null
  }, 3000)
}

onBeforeUnmount(() => {
  if (flashTimer != null) window.clearTimeout(flashTimer)
  clearRemoveTimer()
})

const _side: Side = null
void _side
</script>

<template>
  <div class="bg-card border border-border rounded-xl p-3 relative">
    <div
      class="cursor-pointer"
      role="button"
      tabindex="0"
      @click="onOpen"
      @keydown.enter="onOpen"
      @keydown.space.prevent="onOpen"
    >
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <div class="font-medium text-fg truncate">{{ sequence.name }}</div>
          <div class="text-muted text-[11px] mt-0.5">
            <span>created {{ sequence.created }}</span>
            <span v-if="sequence.last"> · last {{ sequence.last }}</span>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 -mt-0.5 -mr-1 px-1.5 py-0.5 rounded text-[11px] transition-colors"
          :class="removeArmed
            ? 'bg-danger text-fg font-semibold'
            : 'text-danger hover:bg-danger/10'"
          :aria-label="removeArmed ? 'Confirm delete' : 'Delete sequence'"
          @click.stop="armRemove"
        >{{ removeArmed ? 'Confirm' : 'Delete' }}</button>
      </div>

      <div class="mt-2">
        <SequenceChain :steps="sequence.steps.map((s) => ({ trickId: s.name, side: s.side }))" />
      </div>

      <div class="mt-3">
        <RateDots :rate="sequence.rate" :lr="false" />
      </div>
    </div>

    <div class="mt-2" @click.stop>
      <div class="text-[11.5px] text-muted mb-1">How was it today?</div>
      <div class="flex gap-1.5">
        <button
          v-for="s in SCORES"
          :key="s"
          type="button"
          class="flex-1 py-1.5 rounded-lg bg-card-2 text-sm cursor-pointer transition-all duration-150 active:scale-95 border border-border-2 text-fg hover:bg-accent hover:text-bg hover:border-accent"
          :class="flash === s ? 'bg-accent text-bg scale-105 shadow-[0_0_0_3px_rgba(111,140,255,0.35)]' : ''"
          @click.stop="pick(s)"
        >
          {{ s }}
          <small class="block text-[9px] text-muted">{{ HINTS[s] }}</small>
        </button>
      </div>
    </div>
  </div>
</template>
