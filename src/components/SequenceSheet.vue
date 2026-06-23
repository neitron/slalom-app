<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useSequencesStore } from '../stores/sequences'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import type { Sequence, Side } from '../domain/types'
import RateDots from './RateDots.vue'
import RateButtons from './RateButtons.vue'
import SequenceChain from './SequenceChain.vue'

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

const sequencesStore = useSequencesStore()
const tricksStore = useTricksStore()
const uiStore = useUiStore()

const seq = computed<Sequence | undefined>(() =>
  uiStore.openSequenceId ? sequencesStore.byId(uiStore.openSequenceId) : undefined,
)

const isOpen = computed(() => !!seq.value)

const editingName = ref(false)
const nameDraft = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

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
  if (!seq.value?.id) return
  const id = seq.value.id
  await sequencesStore.remove(id)
  uiStore.closeSequence()
}

watch(
  () => seq.value?.id,
  (id) => {
    editingName.value = false
    nameDraft.value = seq.value?.name ?? ''
    removeArmed.value = false
    clearRemoveTimer()
    uiStore.clearFeedback()
    if (id) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  clearRemoveTimer()
  document.body.style.overflow = ''
})

function close() {
  uiStore.closeSequence()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKeydown)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}

async function startEditName() {
  if (!seq.value) return
  nameDraft.value = seq.value.name
  editingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
}

async function commitName() {
  if (!seq.value?.id) {
    editingName.value = false
    return
  }
  const v = nameDraft.value.trim()
  if (v && v !== seq.value.name) {
    await sequencesStore.rename(seq.value.id, v)
  }
  editingName.value = false
}

function cancelEditName() {
  editingName.value = false
  nameDraft.value = seq.value?.name ?? ''
}

function idByName(name: string): string {
  const byId = tricksStore.byId(name)
  if (byId?.id) return byId.id
  const byName = tricksStore.tricks.find((t) => t.name === name)
  if (byName?.id) return byName.id
  return name
}

type StepView = { key: string; name: string; icon: string | null; side: Side; trickId: string }
const stepViews = computed<StepView[]>(() => {
  const s = seq.value
  if (!s) return []
  return s.steps.map((step, i) => {
    const tid = idByName(step.name)
    const t = tricksStore.byId(tid) ?? tricksStore.tricks.find((x) => x.name === step.name)
    return {
      key: `${i}-${step.name}`,
      name: t?.name ?? step.name,
      icon: t?.icon ?? null,
      side: step.side,
      trickId: t?.id ?? tid,
    }
  })
})

const chainSteps = computed(() =>
  (seq.value?.steps ?? []).map((s) => ({ trickId: idByName(s.name), side: s.side })),
)

function sideColor(s: Side): string {
  if (s === 'L') return 'var(--side-l)'
  if (s === 'R') return 'var(--side-r)'
  return 'var(--side-none)'
}

function openTrick(id: string) {
  uiStore.openSheet(id)
}

async function onReport(payload: { score: 1 | 2 | 3 | 4 | 5; side: Side }) {
  if (!seq.value?.id) return
  uiStore.triggerFeedback({ score: payload.score, side: null, context: 'sequence' })
  await sequencesStore.report(seq.value.id, payload.score)
}
</script>

<template>
  <div
    v-if="isOpen && seq"
    class="fixed left-0 right-0 top-0 z-50 flex items-end overflow-hidden"
    style="height: 100dvh"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="absolute inset-0 bg-black/60"
      @click="close"
    />

    <div
      ref="panelRef"
      class="relative w-full bg-card rounded-t-xl p-4 pt-2 max-h-[90dvh] overflow-y-auto border-t border-border touch-pan-y overscroll-contain"
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
        <span class="text-xl leading-none">🔗</span>
        <template v-if="!editingName">
          <h2
            class="flex-1 text-lg font-semibold truncate cursor-text"
            @click="startEditName"
          >{{ seq.name }}</h2>
          <button
            type="button"
            class="p-1 text-muted hover:text-fg"
            aria-label="Rename"
            @click="startEditName"
          >✎</button>
        </template>
        <template v-else>
          <input
            ref="nameInputRef"
            v-model="nameDraft"
            type="text"
            class="flex-1 px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
            @keydown.enter.prevent="commitName"
            @keydown.escape.prevent="cancelEditName"
            @blur="commitName"
          >
          <button
            type="button"
            class="px-2.5 py-1.5 rounded bg-accent text-bg text-xs font-semibold"
            @mousedown.prevent="commitName"
          >Save</button>
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-border-2 text-muted text-xs"
            @mousedown.prevent="cancelEditName"
          >Cancel</button>
        </template>
        <button
          type="button"
          class="p-1 text-muted hover:text-fg"
          aria-label="Close"
          @click="close"
        >✕</button>
      </div>

      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt class="text-muted">Created</dt><dd>{{ seq.created }}</dd>
        <dt class="text-muted">Last practiced</dt><dd>{{ seq.last ?? '—' }}</dd>
        <dt class="text-muted">Steps</dt><dd>{{ seq.steps.length }}</dd>
      </dl>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Chain</h3>
        <SequenceChain :steps="chainSteps" />
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Steps</h3>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="step in stepViews"
            :key="step.key"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card-2 border border-border-2"
          >
            <span
              v-if="step.icon"
              class="text-base leading-none"
            >{{ step.icon }}</span>
            <span class="flex-1 text-sm text-fg truncate">{{ step.name }}</span>
            <span
              class="font-bold text-[11px] w-3 text-center"
              :style="{ color: sideColor(step.side) }"
            >{{ step.side ?? '·' }}</span>
            <button
              type="button"
              class="shrink-0 px-2 py-0.5 rounded border border-border-2 text-[11px] text-muted hover:text-fg hover:border-accent"
              @click="openTrick(step.trickId)"
            >Open</button>
          </li>
          <li
            v-if="!stepViews.length"
            class="text-xs text-muted"
          >No steps</li>
        </ul>
      </section>

      <section class="mt-5">
        <RateDots
          :rate="seq.rate"
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
        >{{ removeArmed ? 'Tap again to confirm delete' : 'Delete sequence' }}</button>
      </section>
    </div>
  </div>
</template>
