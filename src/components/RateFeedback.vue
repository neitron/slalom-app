<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Side } from '../domain/types'

type Score = 1 | 2 | 3 | 4 | 5

export type Report = {
  score: Score
  side: Side
  trickName?: string
  context?: 'trick' | 'transition' | 'sequence'
  label?: string
}

const props = defineProps<{ report: Report | null }>()
const emit = defineEmits<{ close: [] }>()

const DURATION_MS = 3500

const MESSAGES: Record<Score, string[]> = {
  1: [
    "Tough one. Every fall teaches your body something.",
    "Hard run today. Showing up IS the work.",
    "Bad days build the comeback. Tomorrow's another shot.",
    "Even pros bail. The street doesn't care — get back up.",
  ],
  2: [
    "Rough but real. The reps are stacking.",
    "Messy iteration is still iteration.",
    "Not quite there — but closer than yesterday.",
    "Friction now, fluency later.",
  ],
  3: [
    "Solid. Steady wins.",
    "On track. The next rep is closer.",
    "Honest score. Keep building.",
    "Middle ground today, breakthrough tomorrow.",
  ],
  4: [
    "Looking strong!",
    "Dialing in nicely.",
    "That's the line — keep it.",
    "Clean. Save the energy.",
  ],
  5: [
    "Crushed it!",
    "Filthy. Save that one.",
    "Flow state. Lock it in.",
    "That's the version they remember.",
  ],
}

const EMOJI: Record<Score, string> = {
  1: '💪',
  2: '🛠️',
  3: '👍',
  4: '🔥',
  5: '🎉',
}

const COLOR: Record<Score, string> = {
  1: 'var(--rate-bad)',
  2: 'var(--rate-bad)',
  3: 'var(--rate-mid)',
  4: 'var(--rate-good)',
  5: 'var(--rate-good)',
}

const progress = ref(0)
const message = ref('')
let raf: number | null = null
let startedAt = 0

function pickMsg(score: Score): string {
  const arr = MESSAGES[score]
  return arr[Math.floor(Math.random() * arr.length)]
}

function stop() {
  if (raf != null) cancelAnimationFrame(raf)
  raf = null
  startedAt = 0
}

function tick() {
  if (!startedAt) { raf = null; return }
  const elapsed = performance.now() - startedAt
  progress.value = Math.min(1, elapsed / DURATION_MS)
  if (progress.value >= 1) {
    raf = null
    emit('close')
    return
  }
  raf = requestAnimationFrame(tick)
}

watch(
  () => props.report,
  (r) => {
    stop()
    if (!r) return
    message.value = pickMsg(r.score)
    progress.value = 0
    startedAt = performance.now()
    raf = requestAnimationFrame(tick)
  },
  { immediate: true },
)

onBeforeUnmount(stop)

const RING_R = 19
const RING_C = 2 * Math.PI * RING_R
const ringOffset = computed(() => RING_C * progress.value)

const score = computed<Score | null>(() => props.report?.score ?? null)
const side = computed<Side | undefined>(() => props.report?.side)
const contextLabel = computed<string>(() => {
  const r = props.report
  if (!r) return ''
  if (r.label) return r.label
  if (r.context === 'transition') return 'Transition'
  if (r.context === 'sequence') return 'Sequence'
  return ''
})

function close() {
  stop()
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="rf">
      <div
        v-if="report && score != null"
        class="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/60 backdrop-blur-[2px]"
        @click="close"
      >
        <div
          class="bg-card border border-border rounded-2xl px-5 pt-5 pb-4 max-w-sm w-full shadow-2xl relative cursor-pointer"
          :style="{ boxShadow: `0 10px 40px -10px ${COLOR[score]}66, 0 0 0 1px ${COLOR[score]}33` }"
          @click.stop="close"
        >
          <div class="flex items-start gap-3 pr-10">
            <div class="text-4xl leading-none select-none">{{ EMOJI[score] }}</div>
            <div class="flex-1 min-w-0">
              <div
                class="text-[11px] uppercase tracking-wide font-semibold mb-0.5"
                :style="{ color: COLOR[score] }"
              >
                <template v-if="side">
                  <span :style="{ color: side === 'L' ? 'var(--side-l)' : 'var(--side-r)' }">{{ side }}</span>
                  · {{ score }}/5
                </template>
                <template v-else-if="contextLabel">{{ contextLabel }} · {{ score }}/5</template>
                <template v-else>Rated {{ score }}/5</template>
              </div>
              <p class="text-fg text-[15px] leading-snug">{{ message }}</p>
            </div>
          </div>

          <button
            type="button"
            class="absolute top-2 right-2 w-11 h-11 grid place-items-center"
            aria-label="Close"
            @click.stop="close"
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              class="absolute inset-0"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                :r="RING_R"
                fill="none"
                stroke="var(--border)"
                stroke-width="2"
                opacity="0.6"
              />
              <circle
                cx="22"
                cy="22"
                :r="RING_R"
                fill="none"
                :stroke="COLOR[score]"
                stroke-width="2.5"
                stroke-linecap="round"
                :stroke-dasharray="RING_C"
                :stroke-dashoffset="ringOffset"
                transform="rotate(-90 22 22)"
                style="transition: none"
              />
            </svg>
            <span class="relative text-muted text-base leading-none">✕</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rf-enter-active, .rf-leave-active { transition: opacity 180ms ease; }
.rf-enter-from, .rf-leave-to { opacity: 0; }
.rf-enter-active > div,
.rf-leave-active > div {
  transition: transform 220ms cubic-bezier(0.18, 1.2, 0.42, 1), opacity 180ms ease;
}
.rf-enter-from > div { opacity: 0; transform: translateY(-12px) scale(0.95); }
.rf-leave-to   > div { opacity: 0; transform: translateY(-6px)  scale(0.97); }
</style>
