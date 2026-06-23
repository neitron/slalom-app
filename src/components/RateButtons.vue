<script setup lang="ts">
import { ref } from 'vue'

type Side = 'L' | 'R' | null

type Props = {
  lr?: boolean
}

withDefaults(defineProps<Props>(), { lr: false })

const emit = defineEmits<{
  (e: 'report', payload: { score: 1 | 2 | 3 | 4 | 5; side: Side }): void
}>()

const SCORES: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5]
const HINTS: Record<number, string> = {
  1: 'bad',
  2: 'rough',
  3: 'ok',
  4: 'good',
  5: 'excellent',
}

const flash = ref<{ side: Side; score: number } | null>(null)
let flashTimer: number | null = null

function sideClasses(side: Side): string {
  if (side === 'L') return 'btn-l'
  if (side === 'R') return 'btn-r'
  return 'border border-border-2 text-fg hover:bg-accent hover:text-bg hover:border-accent'
}

function isFlashed(side: Side, score: number): boolean {
  return flash.value?.side === side && flash.value?.score === score
}

function pick(score: 1 | 2 | 3 | 4 | 5, side: Side) {
  flash.value = { side, score }
  if (flashTimer != null) window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => { flash.value = null; flashTimer = null }, 450)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(15) } catch { /* ignore */ }
  }
  emit('report', { score, side })
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <template v-if="lr">
      <div>
        <div class="text-[12.5px] mb-1" style="color: var(--side-l)">
          Left foot leading — how was it today?
        </div>
        <div class="flex gap-1.5">
          <button
            v-for="s in SCORES"
            :key="`l-${s}`"
            type="button"
            class="flex-1 py-2 rounded-lg bg-card-2 text-sm cursor-pointer transition-all duration-150 active:scale-95"
            :class="[sideClasses('L'), isFlashed('L', s) ? 'bg-side-l text-bg scale-110 shadow-[0_0_0_3px_rgba(255,179,107,0.35)]' : '']"
            @click="pick(s, 'L')"
          >
            {{ s }}
            <small class="block text-[9px] text-muted">{{ HINTS[s] }}</small>
          </button>
        </div>
      </div>
      <div>
        <div class="text-[12.5px] mb-1" style="color: var(--side-r)">
          Right foot leading — how was it today?
        </div>
        <div class="flex gap-1.5">
          <button
            v-for="s in SCORES"
            :key="`r-${s}`"
            type="button"
            class="flex-1 py-2 rounded-lg bg-card-2 text-sm cursor-pointer transition-all duration-150 active:scale-95"
            :class="[sideClasses('R'), isFlashed('R', s) ? 'bg-side-r text-bg scale-110 shadow-[0_0_0_3px_rgba(124,197,255,0.35)]' : '']"
            @click="pick(s, 'R')"
          >
            {{ s }}
            <small class="block text-[9px] text-muted">{{ HINTS[s] }}</small>
          </button>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="text-[12.5px] text-muted mb-1">How was this trick today?</div>
      <div class="flex gap-1.5">
        <button
          v-for="s in SCORES"
          :key="s"
          type="button"
          class="flex-1 py-2 rounded-lg bg-card-2 text-sm cursor-pointer transition-all duration-150 active:scale-95"
          :class="[sideClasses(null), isFlashed(null, s) ? 'bg-accent text-bg scale-110 shadow-[0_0_0_3px_rgba(111,140,255,0.35)]' : '']"
          @click="pick(s, null)"
        >
          {{ s }}
          <small class="block text-[9px] text-muted">{{ HINTS[s] }}</small>
        </button>
      </div>
    </template>
  </div>
</template>
