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
  <div
    class="gw-glass relative"
    :style="{
      padding: '12px 14px',
      borderRadius: 'var(--radius-g-panel)',
    }"
  >
    <div
      class="cursor-pointer active:opacity-90 transition-opacity"
      role="button"
      tabindex="0"
      @click="onOpen"
      @keydown.enter="onOpen"
      @keydown.space.prevent="onOpen"
    >
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <div
            class="font-medium truncate"
            :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
          >{{ sequence.name }}</div>
          <div
            class="mt-0.5"
            :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
          >
            <span>created {{ sequence.created }}</span>
            <span v-if="sequence.last"> · last {{ sequence.last }}</span>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 -mt-0.5 -mr-1 px-1.5 py-0.5 rounded font-semibold transition-colors"
          :style="{
            fontSize: '11px',
            color: removeArmed ? 'var(--color-g-fg)' : 'var(--color-g-danger, #f87171)',
            background: removeArmed ? 'var(--color-g-danger, #f87171)' : 'transparent',
          }"
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

    <div
      class="mt-3 pt-3"
      :style="{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }"
      @click.stop
    >
      <div
        class="mb-1"
        :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
      >How was it today?</div>
      <div class="flex gap-1.5">
        <button
          v-for="s in SCORES"
          :key="s"
          type="button"
          class="flex-1 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150 active:scale-95"
          :style="{
            color: flash === s ? 'var(--color-g-bg, #0a0a0f)' : 'var(--color-g-fg)',
            background: flash === s ? 'var(--color-g-brand)' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: flash === s ? '0 0 0 3px rgba(111,140,255,0.35)' : 'none',
            transform: flash === s ? 'scale(1.05)' : 'scale(1)',
          }"
          @click.stop="pick(s)"
        >
          {{ s }}
          <small
            class="block"
            :style="{ fontSize: '9px', color: flash === s ? 'var(--color-g-bg, #0a0a0f)' : 'var(--color-g-fg-muted)' }"
          >{{ HINTS[s] }}</small>
        </button>
      </div>
    </div>
  </div>
</template>
