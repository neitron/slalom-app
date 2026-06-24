<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useTransitionsStore } from '../stores/transitions'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { TIERS } from '../domain/constants'
import { displayName } from '../domain/display'
import type { Side, Transition, Trick } from '../domain/types'
import RateDots from './RateDots.vue'
import RateButtons from './RateButtons.vue'

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let startScrollTop = 0
let active = false
const CLOSE_THRESHOLD = 100

function onTouchStart(e: TouchEvent) {
  startScrollTop = panelRef.value?.scrollTop ?? 0
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}

function onTouchMove(e: TouchEvent) {
  if (startScrollTop > 0) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0) return
  active = true
  dragging.value = true
  dragY.value = dy
}

function onTouchEnd() {
  dragging.value = false
  if (!active) { dragY.value = 0; return }
  active = false
  if (dragY.value > CLOSE_THRESHOLD) {
    close()
    dragY.value = 0
  } else {
    dragY.value = 0
  }
}

const transitionsStore = useTransitionsStore()
const tricksStore = useTricksStore()
const uiStore = useUiStore()

const edge = computed<Transition | undefined>(() =>
  uiStore.openTransitionId ? transitionsStore.byId(uiStore.openTransitionId) : undefined,
)

const fromTrick = computed<Trick | undefined>(() =>
  edge.value ? tricksStore.byId(edge.value.from) : undefined,
)
const toTrick = computed<Trick | undefined>(() =>
  edge.value ? tricksStore.byId(edge.value.to) : undefined,
)

const isOpen = computed(() => !!edge.value && !!fromTrick.value && !!toTrick.value)

const removeArmed = ref(false)
let removeTimer: number | null = null

function clearRemoveTimer() {
  if (removeTimer != null) {
    window.clearTimeout(removeTimer)
    removeTimer = null
  }
}

function armRemove() {
  if (removeArmed.value) {
    void doRemove()
    return
  }
  removeArmed.value = true
  clearRemoveTimer()
  removeTimer = window.setTimeout(() => {
    removeArmed.value = false
    removeTimer = null
  }, 3000)
}

async function doRemove() {
  clearRemoveTimer()
  removeArmed.value = false
  if (!edge.value?.id) return
  const id = edge.value.id
  uiStore.closeTransition()
  await transitionsStore.remove(id)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(
  () => edge.value?.id,
  (id) => {
    removeArmed.value = false
    clearRemoveTimer()
    uiStore.clearFeedback()
    if (id) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  },
)

onBeforeUnmount(() => {
  clearRemoveTimer()
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKey)
})

function close() {
  uiStore.closeTransition()
}

const arrow = computed(() => (edge.value?.bidi ? '⇄' : '→'))

function sideColor(side: Side): string {
  if (side === 'L') return 'var(--side-l)'
  if (side === 'R') return 'var(--side-r)'
  return 'var(--side-none)'
}

function statusLabel(rate: number | null): string {
  if (rate == null) return 'Not Started'
  if (rate >= 4.5) return 'Complete'
  return 'In Progress'
}

function statusDotColor(rate: number | null): string {
  if (rate == null) return 'var(--rate-none)'
  if (rate >= 4) return 'var(--rate-good)'
  if (rate >= 2.5) return 'var(--rate-mid)'
  return 'var(--rate-bad)'
}

function openTrick(id: string | undefined) {
  if (!id) return
  uiStore.closeTransition()
  uiStore.openSheet(id)
}

async function setFromSide(side: Side) {
  if (!edge.value?.id) return
  await transitionsStore.update({ id: edge.value.id, fromSide: side })
}

async function setToSide(side: Side) {
  if (!edge.value?.id) return
  await transitionsStore.update({ id: edge.value.id, toSide: side })
}

async function toggleBidi() {
  if (!edge.value?.id) return
  await transitionsStore.update({ id: edge.value.id, bidi: !edge.value.bidi })
}

async function onReport(payload: { score: 1 | 2 | 3 | 4 | 5; side: Side }) {
  if (!edge.value?.id) return
  uiStore.triggerFeedback({ score: payload.score, side: null, context: 'transition' })
  await transitionsStore.report(edge.value.id, payload.score)
}

const SIDES: Side[] = ['L', 'R', null]
function sideLabel(s: Side): string {
  return s === null ? 'none' : s
}
function sideChipBorder(active: boolean): string {
  if (!active) return 'border-border-2 text-muted'
  return 'border-transparent text-bg font-semibold'
}
function sideChipBg(active: boolean, s: Side): string {
  if (!active) return 'bg-card-2'
  if (s === 'L') return 'bg-side-l'
  if (s === 'R') return 'bg-side-r'
  return 'bg-side-none'
}
</script>

<template>
  <div
    v-if="isOpen && edge && fromTrick && toTrick"
    class="fixed left-0 right-0 top-0 z-50 flex items-end overflow-hidden"
    style="inset: 0; height: auto"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="absolute inset-0 bg-black/60"
      @click="close"
    />

    <div
      ref="panelRef"
      class="relative w-full bg-card rounded-t-xl p-4 pt-2 max-h-[90svh] overflow-y-auto border-t border-border touch-pan-y overscroll-contain"
      :style="{
        transform: `translateY(${dragY}px)`,
        transition: dragging ? 'none' : 'transform 0.2s ease-out',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <div class="flex justify-center pb-2 -mt-1 cursor-grab active:cursor-grabbing">
        <div class="w-10 h-1 rounded-full bg-border-2" />
      </div>

      <div class="flex items-center gap-2">
        <h2 class="flex-1 text-base font-semibold leading-snug min-w-0 truncate">
          <span v-if="fromTrick.icon" class="mr-1">{{ fromTrick.icon }}</span>
          <span class="text-fg">{{ displayName(fromTrick) }}</span>
          <span
            class="ml-1 font-bold text-xs"
            :style="{ color: sideColor(edge.fromSide) }"
          >{{ edge.fromSide ?? '–' }}</span>
          <span class="mx-1.5 text-muted">{{ arrow }}</span>
          <span v-if="toTrick.icon" class="mr-1">{{ toTrick.icon }}</span>
          <span class="text-fg">{{ displayName(toTrick) }}</span>
          <span
            class="ml-1 font-bold text-xs"
            :style="{ color: sideColor(edge.toSide) }"
          >{{ edge.toSide ?? '–' }}</span>
        </h2>
        <button
          type="button"
          class="p-1 text-muted hover:text-fg"
          aria-label="Close"
          @click="close"
        >✕</button>
      </div>

      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt class="text-muted">From</dt>
        <dd>
          <button
            type="button"
            class="text-left hover:text-accent"
            @click="openTrick(fromTrick.id)"
          >
            <span v-if="fromTrick.icon" class="mr-1">{{ fromTrick.icon }}</span>
            <span class="font-medium">{{ displayName(fromTrick) }}</span>
            <span class="text-muted text-xs"> · {{ TIERS[fromTrick.tier] }} · {{ fromTrick.category }}</span>
          </button>
        </dd>
        <dt class="text-muted">To</dt>
        <dd>
          <button
            type="button"
            class="text-left hover:text-accent"
            @click="openTrick(toTrick.id)"
          >
            <span v-if="toTrick.icon" class="mr-1">{{ toTrick.icon }}</span>
            <span class="font-medium">{{ displayName(toTrick) }}</span>
            <span class="text-muted text-xs"> · {{ TIERS[toTrick.tier] }} · {{ toTrick.category }}</span>
          </button>
        </dd>
        <dt class="text-muted">Last</dt><dd>{{ edge.last ?? '—' }}</dd>
        <dt class="text-muted">Status</dt>
        <dd>
          <span
            class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5"
            :style="{ background: statusDotColor(edge.rate) }"
          />{{ statusLabel(edge.rate) }}
        </dd>
      </dl>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">From side</h3>
        <div class="flex gap-1.5">
          <button
            v-for="s in SIDES"
            :key="`f-${String(s)}`"
            type="button"
            class="px-3 py-1.5 rounded-md border text-xs transition-colors"
            :class="[sideChipBg(edge.fromSide === s, s), sideChipBorder(edge.fromSide === s)]"
            @click="setFromSide(s)"
          >{{ sideLabel(s) }}</button>
        </div>
      </section>

      <section class="mt-3">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">To side</h3>
        <div class="flex gap-1.5">
          <button
            v-for="s in SIDES"
            :key="`t-${String(s)}`"
            type="button"
            class="px-3 py-1.5 rounded-md border text-xs transition-colors"
            :class="[sideChipBg(edge.toSide === s, s), sideChipBorder(edge.toSide === s)]"
            @click="setToSide(s)"
          >{{ sideLabel(s) }}</button>
        </div>
      </section>

      <label class="mt-4 flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="edge.bidi"
          class="accent-accent"
          @change="toggleBidi"
        >
        <span>↔ Both directions</span>
      </label>

      <section class="mt-5">
        <RateDots
          :rate="edge.rate"
          :lr="false"
          size="md"
        />
      </section>

      <section class="mt-3">
        <RateButtons
          :lr="false"
          @report="onReport"
        />
      </section>

      <section class="mt-5 pt-3 border-t border-border">
        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="removeArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-border-2 text-muted hover:text-danger'"
          @click="armRemove"
        >{{ removeArmed ? 'Tap again to confirm delete' : 'Delete transition' }}</button>
      </section>
    </div>
  </div>
</template>
