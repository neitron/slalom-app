<script setup lang="ts">
import { ref } from 'vue'
import { gw } from '../design/tokens'

type Side = 'L' | 'R' | null

type Props = {
  lr?: boolean
}

withDefaults(defineProps<Props>(), { lr: false })

const emit = defineEmits<{
  (e: 'report', payload: { score: 1 | 2 | 3 | 4 | 5; side: Side }): void
}>()

const pills: { id: 'bad' | 'mid' | 'good'; label: string; score: 1 | 3 | 5; fill: string }[] = [
  { id: 'bad',  label: 'Bad',  score: 1, fill: gw.rate.bad },
  { id: 'mid',  label: 'Mid',  score: 3, fill: gw.rate.mid },
  { id: 'good', label: 'Good', score: 5, fill: gw.rate.good },
]

// Track last tapped score per side for visual feedback
const lastL = ref<number | null>(null)
const lastR = ref<number | null>(null)
const lastNone = ref<number | null>(null)

function getLastRef(side: Side) {
  if (side === 'L') return lastL
  if (side === 'R') return lastR
  return lastNone
}

function tap(score: 1 | 3 | 5, side: Side) {
  getLastRef(side).value = score
  emit('report', { score, side })
}

function reset(side: Side) {
  getLastRef(side).value = null
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- lr mode: one pill row per side -->
    <template v-if="lr">
      <div v-for="side in (['L', 'R'] as const)" :key="side" class="flex flex-col gap-1">
        <div
          class="text-[12.5px]"
          :style="{ color: side === 'L' ? 'var(--color-g-leg-l)' : 'var(--color-g-leg-r)' }"
        >
          {{ side === 'L' ? 'Left foot leading' : 'Right foot leading' }} — how was it today?
        </div>
        <div class="flex items-center gap-2">
          <button
            v-for="p in pills"
            :key="p.id"
            type="button"
            class="flex-1 py-2 font-semibold transition-all duration-150 active:scale-95"
            :style="{
              background: p.fill,
              color: 'var(--color-g-base, #0E0D12)',
              borderRadius: 'var(--radius-g-chip, 14px)',
              fontSize: 'var(--text-g-body, 15px)',
              opacity: getLastRef(side).value !== null && getLastRef(side).value !== p.score ? 0.45 : 1,
              transform: getLastRef(side).value === p.score ? 'scale(1.06)' : '',
            }"
            @click="tap(p.score, side)"
          >{{ p.label }}</button>
          <button
            type="button"
            class="px-3 py-2 transition-colors active:scale-95"
            :style="{
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--color-g-fg-muted, #8E8B98)',
              borderRadius: 'var(--radius-g-chip, 14px)',
              fontSize: 'var(--text-g-micro, 12px)',
            }"
            :aria-label="`Reset ${side} rate`"
            @click="reset(side)"
          >Reset</button>
        </div>
      </div>
    </template>

    <!-- default mode: single pill row, side = null -->
    <template v-else>
      <div class="text-[12.5px]" :style="{ color: 'var(--color-g-fg-muted)' }">How was this trick today?</div>
      <div class="flex items-center gap-2">
        <button
          v-for="p in pills"
          :key="p.id"
          type="button"
          class="flex-1 py-2 font-semibold transition-all duration-150 active:scale-95"
          :style="{
            background: p.fill,
            color: 'var(--color-g-base, #0E0D12)',
            borderRadius: 'var(--radius-g-chip, 14px)',
            fontSize: 'var(--text-g-body, 15px)',
            opacity: getLastRef(null).value !== null && getLastRef(null).value !== p.score ? 0.45 : 1,
            transform: getLastRef(null).value === p.score ? 'scale(1.06)' : '',
          }"
          @click="tap(p.score, null)"
        >{{ p.label }}</button>
        <button
          type="button"
          class="px-3 py-2 transition-colors active:scale-95"
          :style="{
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--color-g-fg-muted, #8E8B98)',
            borderRadius: 'var(--radius-g-chip, 14px)',
            fontSize: 'var(--text-g-micro, 12px)',
          }"
          aria-label="Reset rate"
          @click="reset(null)"
        >Reset</button>
      </div>
    </template>
  </div>
</template>
