<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Side, Transition as TransitionEdge, Trick } from '../domain/types'
import { useUiStore } from '../stores/ui'
import { displayName } from '../domain/display'
import RateDots from './RateDots.vue'
import { IconClose, IconBidi, IconArrowRight, IconTransition } from '../icons'

const uiStore = useUiStore()

type Props = {
  edge: TransitionEdge
  fromTrick: Trick
  toTrick: Trick
  x: number
  y: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  report: [edgeId: string, score: number]
  toggleBidi: [edgeId: string]
  remove: [edgeId: string]
  details: [edgeId: string]
  close: []
}>()

const root = ref<HTMLDivElement | null>(null)
const pos = ref({ left: props.x, top: props.y })

const MARGIN = 8

async function clamp() {
  await nextTick()
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = props.x - rect.width / 2
  let top = props.y + 14
  if (left < MARGIN) left = MARGIN
  if (left + rect.width > vw - MARGIN) left = vw - MARGIN - rect.width
  if (top + rect.height > vh - MARGIN) top = props.y - rect.height - 14
  if (top < MARGIN) top = MARGIN
  pos.value = { left, top }
}

watch(() => [props.x, props.y], clamp)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  clamp()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearArm()
})

function sideColor(side: Side): string {
  if (side === 'L') return 'var(--side-l)'
  if (side === 'R') return 'var(--side-r)'
  return 'var(--side-none)'
}

const removeArmed = ref(false)
let armTimer: number | null = null

function clearArm() {
  if (armTimer != null) {
    window.clearTimeout(armTimer)
    armTimer = null
  }
  removeArmed.value = false
}

function onRemove() {
  if (!props.edge.id) return
  if (!removeArmed.value) {
    removeArmed.value = true
    armTimer = window.setTimeout(clearArm, 3000)
    return
  }
  clearArm()
  emit('remove', props.edge.id)
}

function report(score: number) {
  if (!props.edge.id) return
  const s = score as 1 | 2 | 3 | 4 | 5
  uiStore.triggerFeedback({ score: s, side: null, context: 'transition' })
  emit('report', props.edge.id, score)
}

function toggleBidi() {
  if (props.edge.id) emit('toggleBidi', props.edge.id)
}

function openDetails() {
  if (props.edge.id) emit('details', props.edge.id)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="gb">
      <div
        ref="root"
        class="fixed z-50 w-[260px]"
        :style="{ left: pos.left + 'px', top: pos.top + 'px', touchAction: 'none' }"
        @click.stop
        @touchstart.stop
        @touchmove.stop
        @touchend.stop
      >
      <div
        class="gw-glass-strong p-3"
        :style="{ borderRadius: 'var(--radius-g-panel)' }"
      >
        <div class="flex items-start gap-2 mb-2">
          <div class="flex-1 min-w-0 text-[13px] font-semibold leading-snug">
            <span :style="{ color: 'var(--color-g-fg)' }">{{ displayName(fromTrick) }}</span>
            <span
              v-if="edge.fromSide"
              class="ml-1 font-bold"
              :style="{ color: sideColor(edge.fromSide) }"
            >({{ edge.fromSide }})</span>
            <component :is="props.edge.bidi ? IconBidi : IconArrowRight" :size="14" stroke="1.75" class="mx-1.5" :style="{ color: 'var(--color-g-fg-muted)' }" />
            <span :style="{ color: 'var(--color-g-fg)' }">{{ displayName(toTrick) }}</span>
            <span
              v-if="edge.toSide"
              class="ml-1 font-bold"
              :style="{ color: sideColor(edge.toSide) }"
            >({{ edge.toSide }})</span>
          </div>
          <button
            type="button"
            class="text-base leading-none -mr-1 -mt-1 w-6 h-6 grid place-items-center"
            :style="{ color: 'var(--color-g-fg-muted)' }"
            aria-label="Close"
            @click="emit('close')"
          ><IconClose :size="16" stroke="1.75" /></button>
        </div>

        <RateDots
          :rate="edge.rate"
          size="md"
        />

        <div class="grid grid-cols-5 gap-1 mt-3">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="py-1.5 text-xs gw-glass"
            :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
            @click="report(n)"
          >{{ n }}</button>
        </div>

        <label class="flex items-center gap-2 mt-3 text-[12px] cursor-pointer select-none" :style="{ color: 'var(--color-g-fg)' }">
          <input
            type="checkbox"
            :checked="edge.bidi"
            class="accent-accent"
            @change="toggleBidi"
          >
          <span class="inline-flex items-center gap-1"><IconTransition :size="14" stroke="1.75" /> both directions</span>
        </label>

        <button
          type="button"
          class="w-full mt-2 py-1.5 text-xs gw-glass"
          :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
          @click="openDetails"
        >Details</button>

        <button
          type="button"
          class="w-full mt-2 py-1.5 text-xs"
          :style="removeArmed
            ? { borderRadius: 'var(--radius-g-chip)', background: 'var(--color-g-danger)', color: 'var(--color-g-fg)', border: '1px solid var(--color-g-danger)' }
            : { borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg-muted)', border: '1px solid rgba(255,255,255,0.10)' }"
          @click="onRemove"
        >{{ removeArmed ? 'Tap again to confirm' : 'Remove edge' }}</button>
      </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gb-enter-active, .gb-leave-active {
  transition:
    transform var(--motion-g-base) var(--ease-g-spring),
    opacity var(--motion-g-fast) var(--ease-g-out);
}
.gb-enter-from { opacity: 0; transform: translateY(-6px) scale(0.96); }
.gb-leave-to   { opacity: 0; transform: translateY(-3px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .gb-enter-from,
  .gb-leave-to {
    transform: none !important;
  }
}
</style>
