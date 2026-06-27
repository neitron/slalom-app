<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useSequencesStore } from '../stores/sequences'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useUiStore } from '../stores/ui'
import { edgeMatches } from '../domain/edges'
import type { Transition } from '../domain/types'
import { displayName } from '../domain/display'
import type { Sequence, Side } from '../domain/types'
import RateDots from './RateDots.vue'
import RateButtons from './RateButtons.vue'
import SequenceChain from './SequenceChain.vue'
import { useSheetViewport } from '../composables/useSheetViewport'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import { IconClose, IconEdit, IconRoute, LegL, LegR, LegNone } from '../icons'

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let startScrollTop = 0
let active = false
let suppressDrag = false
const CLOSE_THRESHOLD = 100

const FORM_CONTROL_SELECTOR = 'input, select, textarea, [role="slider"]'
function isOnFormControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(FORM_CONTROL_SELECTOR) != null
}

function onTouchStart(e: TouchEvent) {
  suppressDrag = isOnFormControl(e.target)
  startScrollTop = panelRef.value?.scrollTop ?? 0
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}

function onTouchMove(e: TouchEvent) {
  if (suppressDrag) return
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
const transitionsStore = useTransitionsStore()
const uiStore = useUiStore()

const seq = computed<Sequence | undefined>(() =>
  uiStore.openSequenceId ? sequencesStore.byId(uiStore.openSequenceId) : undefined,
)

const isOpen = computed(() => !!seq.value)

useSheetViewport(panelRef, isOpen)

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
  () => {
    editingName.value = false
    nameDraft.value = seq.value?.name ?? ''
    removeArmed.value = false
    clearRemoveTimer()
    uiStore.clearFeedback()
  },
)

useBodyScrollLock(isOpen)

onBeforeUnmount(() => {
  clearRemoveTimer()
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
      name: t ? displayName(t) : step.name,
      icon: t?.icon ?? null,
      side: step.side,
      trickId: t?.id ?? tid,
    }
  })
})

const chainSteps = computed(() =>
  (seq.value?.steps ?? []).map((s) => ({ trickId: idByName(s.name), side: s.side })),
)

// Pairs (i, i+1) whose transition isn't in the transitions store yet.
const missingTransitionPairs = computed<Array<{ from: StepView; to: StepView }>>(() => {
  const steps = stepViews.value
  if (steps.length < 2) return []
  const out: Array<{ from: StepView; to: StepView }> = []
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i]
    const b = steps[i + 1]
    const exists = transitionsStore.edges.some((e) =>
      edgeMatches(e, a.trickId, a.side, b.trickId, b.side),
    )
    if (!exists) out.push({ from: a, to: b })
  }
  return out
})

const missingCount = computed(() => missingTransitionPairs.value.length)
const creatingMissing = ref(false)

async function createMissingTransitions() {
  if (creatingMissing.value) return
  const pairs = missingTransitionPairs.value
  if (pairs.length === 0) return
  creatingMissing.value = true
  try {
    for (const p of pairs) {
      // Look for an existing non-bidi inverse (B→A with sides swapped).
      // If found, promote it to bidi instead of creating a duplicate.
      const inverse = transitionsStore.edges.find((e) =>
        !e.bidi &&
        e.from === p.to.trickId &&
        e.to === p.from.trickId &&
        (e.fromSide ?? null) === (p.to.side ?? null) &&
        (e.toSide ?? null) === (p.from.side ?? null),
      )
      if (inverse?.id) {
        await transitionsStore.update({ id: inverse.id, bidi: true })
        continue
      }
      const draft: Transition = {
        from: p.from.trickId,
        to: p.to.trickId,
        fromSide: p.from.side,
        toSide: p.to.side,
        bidi: false,
        rate: null,
        last: null,
      }
      await transitionsStore.add(draft)
    }
  } finally {
    creatingMissing.value = false
  }
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
  <Teleport to="body">
    <div
      v-if="isOpen && seq"
      class="fixed left-0 right-0 top-0 z-50 flex items-end overflow-hidden"
      style="inset: 0; height: auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="absolute inset-0 bg-black/60"
        style="touch-action: none;"
        @click="close"
      />

      <div
        ref="panelRef"
        class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[90dvh] overflow-y-auto touch-pan-y overscroll-contain"
        :style="{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
          borderTopLeftRadius: 'var(--radius-g-panel)',
          borderTopRightRadius: 'var(--radius-g-panel)',
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
        <IconRoute :size="20" stroke="1.75" :style="{ color: 'var(--color-g-fg)' }" aria-hidden="true" />
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
          ><IconEdit :size="14" stroke="1.75" /></button>
        </template>
        <template v-else>
          <input
            ref="nameInputRef"
            v-model="nameDraft"
            type="text"
            class="flex-1 px-3 py-2 text-sm outline-none"
            :style="{
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--color-g-fg)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            @keydown.enter.prevent="commitName"
            @keydown.escape.prevent="cancelEditName"
            @blur="commitName"
          >
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold"
            :style="{
              background: 'var(--color-g-brand)',
              color: 'var(--color-g-base)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            @mousedown.prevent="commitName"
          >Save</button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs gw-glass-strong"
            :style="{
              color: 'var(--color-g-fg-muted)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            @mousedown.prevent="cancelEditName"
          >Cancel</button>
        </template>
        <button
          type="button"
          class="p-1 text-muted hover:text-fg"
          aria-label="Close"
          @click="close"
        ><IconClose :size="18" stroke="1.75" /></button>
      </div>

      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt class="text-muted">Created</dt><dd>{{ seq.created }}</dd>
        <dt class="text-muted">Last practiced</dt><dd>{{ seq.last ?? '—' }}</dd>
        <dt class="text-muted">Steps</dt><dd>{{ seq.steps.length }}</dd>
      </dl>

      <section class="mt-4">
        <div class="flex items-center justify-between mb-1.5">
          <h3 class="text-xs uppercase tracking-wide text-muted">Chain</h3>
          <button
            v-if="missingCount > 0"
            type="button"
            class="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
            :style="{
              background: 'var(--color-g-brand)',
              color: 'var(--color-g-base)',
              borderRadius: 'var(--radius-g-chip)',
            }"
            :disabled="creatingMissing"
            @click="createMissingTransitions"
          >{{ creatingMissing ? 'Adding…' : `Learn ${missingCount} transition${missingCount === 1 ? '' : 's'}` }}</button>
        </div>
        <SequenceChain :steps="chainSteps" />
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Steps</h3>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="step in stepViews"
            :key="step.key"
          >
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 gw-glass-strong active:opacity-80 transition-opacity text-left"
              :style="{ borderRadius: 'var(--radius-g-chip)' }"
              @click="openTrick(step.trickId)"
            >
              <span
                v-if="step.icon"
                class="text-base leading-none shrink-0"
              >{{ step.icon }}</span>
              <span class="flex-1 text-sm text-fg truncate">{{ step.name }}</span>
              <LegL v-if="step.side === 'L'" :size="14" />
              <LegR v-else-if="step.side === 'R'" :size="14" />
              <LegNone v-else :size="14" />
            </button>
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
          class="w-full py-2 text-sm transition-colors"
          :class="removeArmed ? 'font-semibold' : 'gw-glass-strong'"
          :style="removeArmed
            ? { background: 'var(--color-g-danger)', color: 'var(--color-g-fg)', borderRadius: 'var(--radius-g-chip)' }
            : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
          @click="armRemove"
        >{{ removeArmed ? 'Tap again to confirm delete' : 'Delete sequence' }}</button>
      </section>
      </div>
    </div>
  </Teleport>
</template>
