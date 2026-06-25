<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useSequencesStore } from '../stores/sequences'
import { useUiStore } from '../stores/ui'
import { loadView, saveView } from '../utils/graphView'
import { edgeMatches } from '../domain/edges'
import { displayName } from '../domain/display'
import type { Side, Transition, Trick } from '../domain/types'

interface ChainStep { trickId: string; side: Side }
import GraphView from '../components/GraphView.vue'
import GraphBubble from '../components/GraphBubble.vue'
import EdgeBubble from '../components/EdgeBubble.vue'
import LegChooser from '../components/LegChooser.vue'
import SequenceChain from '../components/SequenceChain.vue'
import { useSheetViewport } from '../composables/useSheetViewport'

const saveSheetPanelRef = ref<HTMLElement | null>(null)

const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()
const uiStore = useUiStore()

const graphViewRef = ref<InstanceType<typeof GraphView> | null>(null)

const selectedNodeId = ref<string | null>(null)
const selectedEdgeId = ref<string | null>(null)
const bubblePos = ref<{ x: number; y: number }>({ x: 0, y: 0 })

const linkSourceId = ref<string | null>(null)
const linkSourceSide = ref<Side>(null)

const pendingLegChooser = ref<
  | { trickId: string; leg: 'from' | 'to'; x: number; y: number }
  | null
>(null)

const pendingSequenceLeg = ref<
  | { trickId: string; x: number; y: number }
  | null
>(null)

const sequenceMode = ref(false)
const sequenceSteps = ref<ChainStep[]>([])
const showSaveSheet = ref(false)
const saveName = ref('')

useSheetViewport(saveSheetPanelRef, showSaveSheet)

let viewDebounce: number | null = null

onMounted(() => {
  if (!tricksStore.loaded) void tricksStore.load()
  if (!transitionsStore.loaded) void transitionsStore.load()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  if (viewDebounce != null) window.clearTimeout(viewDebounce)
  window.removeEventListener('keydown', onKey)
})

function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  if (pendingSequenceLeg.value) {
    pendingSequenceLeg.value = null
    return
  }
  if (pendingLegChooser.value) {
    pendingLegChooser.value = null
    return
  }
  if (linkSourceId.value) {
    cancelLinking()
    return
  }
  if (selectedNodeId.value || selectedEdgeId.value) {
    selectedNodeId.value = null
    selectedEdgeId.value = null
  }
}

const selectedTrick = computed<Trick | null>(() => {
  const id = selectedNodeId.value
  if (!id) return null
  return tricksStore.byId(id) ?? null
})

const selectedEdge = computed<Transition | null>(() => {
  const id = selectedEdgeId.value
  if (!id) return null
  return transitionsStore.byId(id) ?? null
})

const selectedEdgeFromTrick = computed<Trick | null>(() => {
  const e = selectedEdge.value
  if (!e) return null
  return tricksStore.byId(e.from) ?? null
})

const selectedEdgeToTrick = computed<Trick | null>(() => {
  const e = selectedEdge.value
  if (!e) return null
  return tricksStore.byId(e.to) ?? null
})

const linkSourceTrick = computed<Trick | null>(() => {
  const id = linkSourceId.value
  if (!id) return null
  return tricksStore.byId(id) ?? null
})

const sequenceIds = computed<string[]>(() => sequenceSteps.value.map((s) => s.trickId))

function autoSideForStep(prev: ChainStep | undefined, target: Trick): Side | 'choose' {
  if (!prev) return 'choose'
  const candidates = (['L', 'R'] as const).filter((side) =>
    transitionsStore.edges.some((e) =>
      edgeMatches(e, prev.trickId, prev.side, target.id!, side),
    ),
  )
  if (candidates.length === 1) return candidates[0]
  return 'choose'
}

function pushSequenceStep(trickId: string, side: Side): void {
  sequenceSteps.value = [...sequenceSteps.value, { trickId, side }]
}

function pendingSequenceLegTrick(): Trick | null {
  const id = pendingSequenceLeg.value?.trickId
  return id ? tricksStore.byId(id) ?? null : null
}

function onNodeTap(trickId: string, position: { x: number; y: number }): void {
  if (sequenceMode.value) {
    const target = tricksStore.byId(trickId)
    if (!target) return
    if (!target.lr) {
      pushSequenceStep(trickId, null)
      return
    }
    const prev = sequenceSteps.value[sequenceSteps.value.length - 1]
    const auto = autoSideForStep(prev, target)
    if (auto === 'choose') {
      pendingSequenceLeg.value = { trickId, x: position.x, y: position.y }
    } else {
      pushSequenceStep(trickId, auto)
    }
    return
  }
  if (linkSourceId.value) {
    const target = tricksStore.byId(trickId)
    if (!target) return
    if (target.lr) {
      pendingLegChooser.value = { trickId, leg: 'to', x: position.x, y: position.y }
      return
    }
    void createEdge(linkSourceId.value, linkSourceSide.value, trickId, null)
    cancelLinking()
    return
  }
  selectedEdgeId.value = null
  selectedNodeId.value = trickId
  bubblePos.value = position
}

function onEdgeTap(edgeId: string, position: { x: number; y: number }): void {
  if (sequenceMode.value) return
  if (linkSourceId.value) return
  selectedNodeId.value = null
  selectedEdgeId.value = edgeId
  bubblePos.value = position
}

function onBgTap(): void {
  selectedNodeId.value = null
  selectedEdgeId.value = null
  pendingLegChooser.value = null
  pendingSequenceLeg.value = null
  if (linkSourceId.value) cancelLinking()
}

function onNodeDragEnd(_id: string): void {
  saveCurrentView()
}

function onViewChange(view: { tx: number; ty: number; scale: number }): void {
  if (viewDebounce != null) window.clearTimeout(viewDebounce)
  viewDebounce = window.setTimeout(() => {
    viewDebounce = null
    saveCurrentView(view)
  }, 200)
}

function saveCurrentView(partial?: { tx: number; ty: number; scale: number }): void {
  const existing = loadView()
  const positions = existing?.positions ?? {}
  const view = partial ?? {
    tx: existing?.tx ?? 0,
    ty: existing?.ty ?? 0,
    scale: existing?.scale ?? 1,
  }
  saveView({ positions, tx: view.tx, ty: view.ty, scale: view.scale })
}

function onBubbleDetails(trickId: string): void {
  selectedNodeId.value = null
  uiStore.openSheet(trickId)
}

function onBubbleStartLink(trickId: string, fromSide: Side): void {
  const t = tricksStore.byId(trickId)
  if (!t) return
  selectedNodeId.value = null
  if (t.lr && fromSide == null) {
    pendingLegChooser.value = { trickId, leg: 'from', x: bubblePos.value.x, y: bubblePos.value.y }
    return
  }
  linkSourceId.value = trickId
  linkSourceSide.value = fromSide
}

function onBubbleClose(): void {
  selectedNodeId.value = null
}

function onLegChose(side: 'L' | 'R'): void {
  const pending = pendingLegChooser.value
  if (!pending) return
  if (pending.leg === 'from') {
    linkSourceId.value = pending.trickId
    linkSourceSide.value = side
    pendingLegChooser.value = null
    return
  }
  const src = linkSourceId.value
  const srcSide = linkSourceSide.value
  pendingLegChooser.value = null
  if (!src) return
  void createEdge(src, srcSide, pending.trickId, side)
  cancelLinking()
}

function onSequenceLegChose(side: 'L' | 'R'): void {
  const pending = pendingSequenceLeg.value
  if (!pending) return
  pendingSequenceLeg.value = null
  pushSequenceStep(pending.trickId, side)
}

async function createEdge(
  from: string,
  fromSide: Side,
  to: string,
  toSide: Side,
): Promise<void> {
  await transitionsStore.add({
    from,
    to,
    fromSide,
    toSide,
    bidi: false,
    rate: null,
    last: null,
  })
}

function cancelLinking(): void {
  linkSourceId.value = null
  linkSourceSide.value = null
  pendingLegChooser.value = null
}

async function onEdgeReport(edgeId: string, score: number): Promise<void> {
  await transitionsStore.report(edgeId, score)
}

async function onEdgeToggleBidi(edgeId: string): Promise<void> {
  const e = transitionsStore.byId(edgeId)
  if (!e) return
  await transitionsStore.update({ id: edgeId, bidi: !e.bidi })
}

async function onEdgeRemove(edgeId: string): Promise<void> {
  await transitionsStore.remove(edgeId)
  selectedEdgeId.value = null
}

function onEdgeBubbleClose(): void {
  selectedEdgeId.value = null
}

function onEdgeBubbleDetails(edgeId: string): void {
  selectedEdgeId.value = null
  uiStore.openTransition(edgeId)
}

function startSequenceMode(): void {
  sequenceMode.value = true
  sequenceSteps.value = []
  selectedNodeId.value = null
  selectedEdgeId.value = null
  cancelLinking()
}

function cancelSequenceMode(): void {
  sequenceMode.value = false
  sequenceSteps.value = []
  showSaveSheet.value = false
  saveName.value = ''
  pendingSequenceLeg.value = null
}

function undoSequenceStep(): void {
  if (!sequenceSteps.value.length) return
  sequenceSteps.value = sequenceSteps.value.slice(0, -1)
}

function openSaveSheet(): void {
  if (sequenceSteps.value.length < 2) return
  const d = new Date()
  saveName.value = `Sequence ${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`
  showSaveSheet.value = true
}

async function confirmSaveSequence(): Promise<void> {
  const name = saveName.value.trim()
  if (!name || sequenceSteps.value.length < 2) return
  const steps = sequenceSteps.value.map((s) => {
    const t = tricksStore.byId(s.trickId)
    return { name: t?.name ?? s.trickId, side: s.side }
  })
  if (!sequencesStore.loaded) await sequencesStore.load()
  await sequencesStore.create({ name, steps })
  cancelSequenceMode()
}

const chainSteps = computed(() =>
  sequenceSteps.value.map((s) => ({ trickId: s.trickId, side: s.side })),
)

const linkingHintName = computed<string>(() => {
  const t = linkSourceTrick.value
  if (!t) return ''
  const n = displayName(t)
  const side = linkSourceSide.value
  return side ? `${n} (${side})` : n
})

const pendingLegTrick = computed<Trick | null>(() => {
  const p = pendingLegChooser.value
  if (!p) return null
  return tricksStore.byId(p.trickId) ?? null
})

const legChooserStyle = computed<Record<string, string>>(() => {
  const p = pendingLegChooser.value
  if (!p) return {} as Record<string, string>
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360
  const left = Math.min(Math.max(p.x - 120, 8), vw - 248)
  return { left: left + 'px', top: (p.y + 12) + 'px' }
})

const sequenceLegTrick = computed<Trick | null>(() => pendingSequenceLegTrick())

const sequenceLegStyle = computed<Record<string, string>>(() => {
  const p = pendingSequenceLeg.value
  if (!p) return {} as Record<string, string>
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360
  const left = Math.min(Math.max(p.x - 120, 8), vw - 248)
  return { left: left + 'px', top: (p.y + 12) + 'px' }
})
</script>

<template>
  <div
    class="flex flex-col min-h-0"
    :style="{ height: 'calc(100dvh - env(safe-area-inset-top) - var(--tabbar-h, 4rem))' }"
  >
    <div class="flex items-center gap-2 px-3 pt-2 pb-2 shrink-0">
      <h1 class="text-lg font-semibold flex-1">Graph</h1>
      <RouterLink
        to="/transitions"
        class="px-3 py-1.5 rounded-full text-xs transition-colors gw-glass-strong"
        :style="{
          color: 'var(--color-g-fg-muted)',
          borderRadius: 'var(--radius-g-chip)',
        }"
      >↔ Transitions</RouterLink>
      <button
        type="button"
        class="px-3 py-1.5 rounded-full text-xs border transition-colors"
        :class="sequenceMode
          ? 'bg-accent text-bg border-accent font-semibold'
          : 'bg-card border-border-2 text-muted hover:text-fg'"
        @click="sequenceMode ? cancelSequenceMode() : startSequenceMode()"
      >⛓ Sequence</button>
    </div>

    <div class="flex-1 min-h-0 relative">
      <GraphView
        ref="graphViewRef"
        :highlight-node-id="selectedNodeId"
        :highlight-edge-id="selectedEdgeId"
        :link-source-id="linkSourceId"
        :sequence-mode="sequenceMode"
        :sequence-ids="sequenceIds"
        @node-tap="onNodeTap"
        @edge-tap="onEdgeTap"
        @bg-tap="onBgTap"
        @node-drag-end="onNodeDragEnd"
        @view-change="onViewChange"
      />
    </div>

    <div
      v-if="linkSourceId"
      class="fixed top-2 left-2 right-2 z-40 bg-card border border-accent rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg text-sm"
    >
      <span class="flex-1 truncate text-fg">
        Linking from
        <span class="font-semibold">{{ linkingHintName }}</span>.
        Tap target trick.
      </span>
      <button
        type="button"
        class="text-muted hover:text-fg px-1"
        aria-label="Cancel linking"
        @click="cancelLinking"
      >✕ cancel</button>
    </div>

    <div
      v-if="pendingLegChooser && pendingLegTrick"
      class="fixed z-50"
      :style="legChooserStyle"
      @click.stop
    >
      <LegChooser
        :leg="pendingLegChooser.leg"
        :trick="pendingLegTrick"
        @chose="onLegChose"
      />
    </div>

    <div
      v-if="pendingSequenceLeg && sequenceLegTrick"
      class="fixed z-50"
      :style="sequenceLegStyle"
      @click.stop
    >
      <LegChooser
        leg="step"
        :trick="sequenceLegTrick"
        @chose="onSequenceLegChose"
      />
    </div>

    <GraphBubble
      v-if="selectedTrick && !linkSourceId"
      :trick="selectedTrick"
      :x="bubblePos.x"
      :y="bubblePos.y"
      mode="view"
      :sequence-mode="sequenceMode"
      @details="onBubbleDetails"
      @start-link="onBubbleStartLink"
      @close="onBubbleClose"
    />

    <EdgeBubble
      v-if="selectedEdge && selectedEdgeFromTrick && selectedEdgeToTrick"
      :edge="selectedEdge"
      :from-trick="selectedEdgeFromTrick"
      :to-trick="selectedEdgeToTrick"
      :x="bubblePos.x"
      :y="bubblePos.y"
      @report="onEdgeReport"
      @toggle-bidi="onEdgeToggleBidi"
      @remove="onEdgeRemove"
      @details="onEdgeBubbleDetails"
      @close="onEdgeBubbleClose"
    />

    <div
      v-if="sequenceMode"
      class="fixed left-0 right-0 z-40 bg-card border-t border-border px-3 py-2"
      :style="{ bottom: 'calc(var(--tabbar-h, 4rem) + 0.5rem)' }"
    >
      <div class="mb-2 min-h-[1.5rem]">
        <SequenceChain
          v-if="sequenceSteps.length"
          :steps="chainSteps"
        />
        <div
          v-else
          class="text-xs text-muted"
        >Tap tricks on the graph to build a sequence.</div>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 py-1.5 rounded-lg border border-border-2 text-fg text-sm disabled:opacity-40"
          :disabled="!sequenceSteps.length"
          @click="undoSequenceStep"
        >Undo</button>
        <button
          type="button"
          class="flex-1 py-1.5 rounded-lg border border-border-2 text-muted hover:text-fg text-sm"
          @click="cancelSequenceMode"
        >Cancel</button>
        <button
          type="button"
          class="flex-1 py-1.5 rounded-lg bg-accent text-bg font-semibold text-sm disabled:opacity-40"
          :disabled="sequenceSteps.length < 2"
          @click="openSaveSheet"
        >Save</button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showSaveSheet"
        class="fixed inset-0 z-[60] flex items-end"
        role="dialog"
        aria-modal="true"
      >
        <div class="absolute inset-0 bg-black/60" @click="showSaveSheet = false" />
        <div
          ref="saveSheetPanelRef"
          class="sheet-panel relative w-full gw-glass-strong p-4"
          :style="{ borderTopLeftRadius: 'var(--radius-g-panel)', borderTopRightRadius: 'var(--radius-g-panel)' }"
        >
        <div class="flex justify-center pb-2 -mt-1">
          <div class="w-10 h-1 rounded-full bg-border-2" />
        </div>
        <h2 class="text-lg font-semibold mb-3">Save sequence</h2>
        <input
          v-model="saveName"
          type="text"
          placeholder="sequence name"
          class="w-full px-2 py-2 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
        >
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 py-2 rounded-lg border border-border-2 text-muted hover:text-fg"
            @click="showSaveSheet = false"
          >Cancel</button>
          <button
            type="button"
            class="flex-1 py-2 rounded-lg bg-accent text-bg font-semibold disabled:opacity-50"
            :disabled="!saveName.trim()"
            @click="confirmSaveSequence"
          >Save</button>
        </div>
      </div>
      </div>
    </Teleport>
  </div>
</template>
