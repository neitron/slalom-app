<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { drag } from 'd3-drag';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { useTricksStore } from '../stores/tricks';
import { useTransitionsStore } from '../stores/transitions';
import { effectiveRate, rateColor, sideColor } from '../domain/rating';
import { loadView, saveView, type NodePosition } from '../utils/graphView';
import type { Transition, Trick } from '../domain/types';

interface Props {
  highlightNodeId?: string | null;
  highlightEdgeId?: string | null;
  linkSourceId?: string | null;
  sequenceMode?: boolean;
  sequenceIds?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  highlightNodeId: null,
  highlightEdgeId: null,
  linkSourceId: null,
  sequenceMode: false,
  sequenceIds: () => [],
});

const emit = defineEmits<{
  (e: 'nodeTap', trickId: string, position: { x: number; y: number }): void;
  (e: 'edgeTap', edgeId: string, position: { x: number; y: number }): void;
  (e: 'bgTap'): void;
  (e: 'nodeDragEnd', trickId: string): void;
  (e: 'viewChange', view: { tx: number; ty: number; scale: number }): void;
}>();

const NODE_R = 22;
const DRAG_THRESHOLD = 4;
const PARALLEL_SPACING = 7;
const SELF_LOOP_BASE = 26;

const tricks = useTricksStore();
const transitions = useTransitionsStore();

const svgRef = ref<SVGSVGElement | null>(null);
const positions = ref<Record<string, NodePosition>>({});
const tx = ref(0);
const ty = ref(0);
const scale = ref(1);
const ready = ref(false);

const zoomBehavior = shallowRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
let internalViewUpdate = false;

const graphTricks = computed<Trick[]>(() => {
  const referenced = new Set<string>();
  for (const e of transitions.edges) {
    referenced.add(e.from);
    referenced.add(e.to);
  }
  return tricks.tricks.filter((t) => {
    if (!t.id) return false;
    if (effectiveRate(t) != null || t.rate != null || t.rateL != null || t.rateR != null) return true;
    return referenced.has(t.id);
  });
});

const trickById = computed<Record<string, Trick>>(() => {
  const m: Record<string, Trick> = {};
  for (const t of graphTricks.value) if (t.id) m[t.id] = t;
  return m;
});

const graphEdges = computed<Transition[]>(() =>
  transitions.edges.filter((e) => trickById.value[e.from] && trickById.value[e.to]),
);

interface EdgeRender {
  edge: Transition;
  d: string;
  midX: number;
  midY: number;
  g1x: number;
  g1y: number;
  g2x: number;
  g2y: number;
  stroke: string;
  useGradient: boolean;
  gradientId: string;
  c1: string;
  c2: string;
  markerStart: string;
  markerEnd: string;
  selfLoop: boolean;
}

const computeEdgeRender = (edge: Transition, index: number, off: number, flip: boolean): EdgeRender | null => {
  const a = trickById.value[edge.from];
  const b = trickById.value[edge.to];
  if (!a?.id || !b?.id) return null;
  const p1 = positions.value[a.id];
  const p2 = positions.value[b.id];
  if (!p1 || !p2) return null;
  const c1 = sideColor(edge.fromSide);
  const c2 = sideColor(edge.toSide);
  const selfLoop = a.id === b.id;
  let d = '';
  let midX = 0;
  let midY = 0;
  let g1x = 0;
  let g1y = 0;
  let g2x = 0;
  let g2y = 0;
  if (selfLoop) {
    const size = SELF_LOOP_BASE + off;
    const sx = p1.x - 9;
    const sy = p1.y - NODE_R * 0.6;
    const ex = p1.x + 9;
    const ey = p1.y - NODE_R * 0.6;
    d = `M ${sx} ${sy} C ${p1.x - size} ${p1.y - NODE_R - size} ${p1.x + size} ${p1.y - NODE_R - size} ${ex} ${ey}`;
    midX = p1.x;
    midY = p1.y - NODE_R - size * 0.75;
    g1x = sx; g1y = sy; g2x = ex; g2y = ey;
  } else {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const signed = off * (flip ? -1 : 1);
    const nx = -uy * signed;
    const ny = ux * signed;
    const x1 = p1.x + ux * (NODE_R + 2) + nx;
    const y1 = p1.y + uy * (NODE_R + 2) + ny;
    const x2 = p2.x - ux * (NODE_R + 6) + nx;
    const y2 = p2.y - uy * (NODE_R + 6) + ny;
    d = `M ${x1} ${y1} L ${x2} ${y2}`;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    g1x = x1; g1y = y1; g2x = x2; g2y = y2;
  }
  const useGradient = c1 !== c2;
  const gradientId = `slalom-edge-grad-${edge.id ?? `i${index}`}`;
  return {
    edge,
    d,
    midX,
    midY,
    g1x,
    g1y,
    g2x,
    g2y,
    stroke: useGradient ? `url(#${gradientId})` : c1,
    useGradient,
    gradientId,
    c1,
    c2,
    markerStart: markerIdFor(c1),
    markerEnd: markerIdFor(c2),
    selfLoop,
  };
};

const markerIdFor = (c: string): string => {
  if (c === sideColor('L')) return 'slalom-arr-l';
  if (c === sideColor('R')) return 'slalom-arr-r';
  return 'slalom-arr-n';
};

const edgeRenders = computed<EdgeRender[]>(() => {
  const list = graphEdges.value;
  const groupCounts: Record<string, number> = {};
  const pairKey = (e: Transition) => {
    const a = e.from;
    const b = e.to;
    return a <= b ? `${a}~${b}` : `${b}~${a}`;
  };
  for (const e of list) {
    const k = pairKey(e);
    groupCounts[k] = (groupCounts[k] || 0) + 1;
  }
  const seen: Record<string, number> = {};
  const out: EdgeRender[] = [];
  list.forEach((e, idx) => {
    const k = pairKey(e);
    const i = (seen[k] = (seen[k] ?? -1) + 1);
    const n = groupCounts[k];
    const selfLoop = e.from === e.to;
    const off = selfLoop ? i * 20 : (i - (n - 1) / 2) * PARALLEL_SPACING;
    const flip = e.from > e.to;
    const r = computeEdgeRender(e, idx, off, flip);
    if (r) out.push(r);
  });
  return out;
});

const sequenceSet = computed(() => new Set(props.sequenceIds ?? []));

function halfPathD(p: NodePosition, side: 'L' | 'R'): string {
  const sweep = side === 'R' ? 1 : 0;
  return `M ${p.x} ${p.y - NODE_R} A ${NODE_R} ${NODE_R} 0 0 ${sweep} ${p.x} ${p.y + NODE_R}`;
}

function ringStroke(t: Trick, side?: 'L' | 'R'): string {
  if (side) {
    const v = side === 'L' ? t.rateL : t.rateR;
    return v == null ? '#565764' : rateColor(v);
  }
  const er = effectiveRate(t);
  return er == null ? '#565764' : rateColor(er);
}

function nodeLabel(t: Trick): string {
  return t.name.length > 22 ? t.name.slice(0, 21) + '…' : t.name;
}

function glyphFor(t: Trick): string {
  return t.icon || t.name.charAt(0).toUpperCase();
}

const initialized = ref(false);
let initRO: ResizeObserver | null = null;

function tryInit(): void {
  if (initialized.value) return;
  const svg = svgRef.value;
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  if (!graphTricks.value.length) return;
  initialized.value = true;
  if (initRO) {
    initRO.disconnect();
    initRO = null;
  }
  ensureInitialLayout();
  requestAnimationFrame(() => setupNodeDrag());
}

function ensureInitialLayout(): void {
  const svg = svgRef.value;
  if (!svg) return;
  const tricksList = graphTricks.value;
  if (!tricksList.length) {
    ready.value = true;
    return;
  }
  const saved = loadView();
  const allPresent =
    !!saved &&
    tricksList.every((t) => !!t.id && saved.positions[t.id] != null);
  if (saved && allPresent) {
    positions.value = { ...saved.positions };
    tx.value = saved.tx;
    ty.value = saved.ty;
    scale.value = saved.scale;
    applyZoomFromState();
    ready.value = true;
    return;
  }
  const rect = svg.getBoundingClientRect();
  const w = Math.max(rect.width, 320);
  const h = Math.max(rect.height, 400);
  interface SimNode extends SimulationNodeDatum {
    id: string;
    fx?: number | null;
    fy?: number | null;
  }
  const initial = (t: { id?: string; node_x?: number | null; node_y?: number | null }):
    { x?: number; y?: number; fixed: boolean } => {
    const sp = t.id ? saved?.positions[t.id] : undefined;
    if (sp) return { x: sp.x, y: sp.y, fixed: true };
    if (t.node_x != null && t.node_y != null) return { x: t.node_x, y: t.node_y, fixed: true };
    return { fixed: false };
  };
  const nodes: SimNode[] = tricksList.map((t) => {
    const seed = initial(t);
    return {
      id: t.id!,
      x: seed.x,
      y: seed.y,
      fx: seed.fixed ? seed.x : undefined,
      fy: seed.fixed ? seed.y : undefined,
    };
  });
  const needsLayout = nodes.some((n) => n.fx == null);
  if (needsLayout) {
    const links = graphEdges.value
      .filter((e) => e.from !== e.to)
      .map((e) => ({ source: e.from, target: e.to }));
    const sim = forceSimulation<SimNode>(nodes)
      .force('charge', forceManyBody().strength(-220))
      .force(
        'link',
        forceLink<SimNode, { source: string; target: string }>(links)
          .id((d) => d.id)
          .distance(110)
          .strength(0.6),
      )
      .force('center', forceCenter(w / 2, h / 2))
      .stop();
    for (let i = 0; i < 120; i += 1) sim.tick();
  }
  const next: Record<string, NodePosition> = {};
  for (const n of nodes) {
    next[n.id] = { x: n.x ?? w / 2, y: n.y ?? h / 2 };
  }
  positions.value = next;
  if (!saved) {
    const xs = Object.values(next).map((p) => p.x);
    const ys = Object.values(next).map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY, 1);
    const fit = Math.min(1, (Math.min(w, h) - 80) / (span + 80));
    scale.value = fit;
    tx.value = w / 2 - cx * fit;
    ty.value = h / 2 - cy * fit;
    applyZoomFromState();
  }
  if (saved) {
    tx.value = saved.tx;
    ty.value = saved.ty;
    scale.value = saved.scale;
    applyZoomFromState();
  }
  saveView({ positions: next, tx: tx.value, ty: ty.value, scale: scale.value });
  ready.value = true;
}

function applyZoomFromState(): void {
  const svg = svgRef.value;
  const z = zoomBehavior.value;
  if (!svg || !z) return;
  internalViewUpdate = true;
  select(svg).call(z.transform, zoomIdentity.translate(tx.value, ty.value).scale(scale.value));
  internalViewUpdate = false;
}

function setupZoom(): void {
  const svg = svgRef.value;
  if (!svg) return;
  const z = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 5])
    .filter((event) => {
      const target = event.target as Element | null;
      if (!target) return true;
      if (target.closest('.slalom-node')) return false;
      if (event.type === 'wheel') return true;
      if (event.type === 'mousedown' && (event as MouseEvent).button !== 0) return false;
      return true;
    })
    .on('zoom', (event) => {
      tx.value = event.transform.x;
      ty.value = event.transform.y;
      scale.value = event.transform.k;
      if (!internalViewUpdate) {
        emit('viewChange', { tx: tx.value, ty: ty.value, scale: scale.value });
      }
    });
  zoomBehavior.value = z;
  select(svg).call(z);
  select(svg).on('dblclick.zoom', null);
}

function setupNodeDrag(): void {
  const svg = svgRef.value;
  if (!svg) return;
  const root = select(svg).select<SVGGElement>('g.slalom-nodes');
  if (root.empty()) return;
  let originX = 0;
  let originY = 0;
  let startScreenX = 0;
  let startScreenY = 0;
  let moved = false;
  let activeId: string | null = null;
  const dragBehavior = drag<SVGGElement, unknown>()
    .container(() => svg)
    .filter((event) => {
      if ((event as PointerEvent).button !== undefined && (event as PointerEvent).button !== 0) return false;
      return true;
    })
    .on('start', function (event) {
      const id = (this as SVGGElement).getAttribute('data-id');
      activeId = id;
      moved = false;
      if (!id) return;
      const p = positions.value[id];
      originX = p?.x ?? 0;
      originY = p?.y ?? 0;
      startScreenX = event.x;
      startScreenY = event.y;
      event.sourceEvent?.stopPropagation?.();
    })
    .on('drag', function (event) {
      if (!activeId) return;
      const dx = event.x - startScreenX;
      const dy = event.y - startScreenY;
      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true;
      if (moved) {
        positions.value = {
          ...positions.value,
          [activeId]: { x: originX + dx, y: originY + dy },
        };
      }
    })
    .on('end', function (event) {
      const id = activeId;
      activeId = null;
      if (!id) return;
      if (moved) {
        emit('nodeDragEnd', id);
      } else {
        const screen = clientFromEvent(event.sourceEvent);
        emit('nodeTap', id, screen);
      }
    });
  root.selectAll<SVGGElement, unknown>('g.slalom-node').call(dragBehavior);
}

function clientFromEvent(ev: Event | undefined): { x: number; y: number } {
  if (!ev) return { x: 0, y: 0 };
  const me = ev as MouseEvent;
  if (typeof me.clientX === 'number') return { x: me.clientX, y: me.clientY };
  const te = ev as TouchEvent;
  const t = te.changedTouches?.[0] ?? te.touches?.[0];
  if (t) return { x: t.clientX, y: t.clientY };
  return { x: 0, y: 0 };
}

function worldToScreen(wx: number, wy: number): { x: number; y: number } {
  const svg = svgRef.value;
  if (!svg) return { x: 0, y: 0 };
  const r = svg.getBoundingClientRect();
  return { x: r.left + wx * scale.value + tx.value, y: r.top + wy * scale.value + ty.value };
}

function onSvgClick(ev: MouseEvent): void {
  if (ev.target === svgRef.value) {
    emit('bgTap');
  }
}

function onEdgeClick(ev: MouseEvent, r: EdgeRender): void {
  ev.stopPropagation();
  if (!r.edge.id) return;
  const screen = worldToScreen(r.midX, r.midY);
  emit('edgeTap', r.edge.id, screen);
}

function zoomIn(): void {
  const svg = svgRef.value;
  const z = zoomBehavior.value;
  if (!svg || !z) return;
  select(svg).transition().duration(150).call(z.scaleBy, 1.25);
}

function zoomOut(): void {
  const svg = svgRef.value;
  const z = zoomBehavior.value;
  if (!svg || !z) return;
  select(svg).transition().duration(150).call(z.scaleBy, 1 / 1.25);
}

function resetView(): void {
  const svg = svgRef.value;
  const z = zoomBehavior.value;
  if (!svg || !z) return;
  select(svg).transition().duration(180).call(z.transform, zoomIdentity);
}

onMounted(() => {
  setupZoom();
  if (svgRef.value && typeof ResizeObserver !== 'undefined') {
    initRO = new ResizeObserver(() => tryInit());
    initRO.observe(svgRef.value);
  }
  tryInit();
});

watch(
  () => graphTricks.value.map((t) => t.id).join('|'),
  () => {
    if (!initialized.value) {
      tryInit();
      return;
    }
    const tricksList = graphTricks.value;
    let dirty = false;
    const next = { ...positions.value };
    for (const t of tricksList) {
      if (!t.id) continue;
      if (!next[t.id]) {
        const svg = svgRef.value;
        const rect = svg?.getBoundingClientRect();
        const cx = rect ? rect.width / 2 : 200;
        const cy = rect ? rect.height / 2 : 200;
        const a = Math.random() * Math.PI * 2;
        next[t.id] = { x: cx + Math.cos(a) * 80, y: cy + Math.sin(a) * 80 };
        dirty = true;
      }
    }
    if (dirty) positions.value = next;
    requestAnimationFrame(() => setupNodeDrag());
  },
);

onBeforeUnmount(() => {
  if (initRO) {
    initRO.disconnect();
    initRO = null;
  }
  if (svgRef.value) select(svgRef.value).on('.zoom', null);
});

defineExpose({ resetView, zoomIn, zoomOut });
</script>

<template>
  <div class="relative w-full h-full">
    <svg
      ref="svgRef"
      class="slalom-graph w-full h-full block select-none"
      @click="onSvgClick"
    >
      <defs>
        <marker
          v-for="m in [
            { id: 'slalom-arr-l', color: sideColor('L') },
            { id: 'slalom-arr-r', color: sideColor('R') },
            { id: 'slalom-arr-n', color: sideColor(null) },
          ]"
          :key="m.id"
          :id="m.id"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="4.5"
          markerHeight="4.5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" :fill="m.color" />
        </marker>
        <linearGradient
          v-for="r in edgeRenders.filter((r) => r.useGradient)"
          :key="r.gradientId"
          :id="r.gradientId"
          gradientUnits="userSpaceOnUse"
          :x1="r.g1x"
          :y1="r.g1y"
          :x2="r.g2x"
          :y2="r.g2y"
        >
          <stop offset="0%" :stop-color="r.c1" />
          <stop offset="100%" :stop-color="r.c2" />
        </linearGradient>
      </defs>
      <g :transform="`translate(${tx},${ty}) scale(${scale})`">
        <g class="slalom-edges">
          <g v-for="r in edgeRenders" :key="(r.edge.id ?? '') + ':' + r.d" class="slalom-edge">
            <path
              v-if="r.edge.id && r.edge.id === highlightEdgeId"
              :d="r.d"
              fill="none"
              stroke="#ffffff"
              stroke-opacity="0.35"
              :stroke-width="9"
              stroke-linecap="round"
            />
            <path
              :d="r.d"
              fill="none"
              :stroke="r.stroke"
              :stroke-width="r.edge.id === highlightEdgeId ? 3 : 2"
              :marker-end="`url(#${r.markerEnd})`"
              :marker-start="r.edge.bidi ? `url(#${r.markerStart})` : undefined"
            />
            <path
              :d="r.d"
              fill="none"
              stroke="transparent"
              stroke-width="14"
              style="cursor: pointer"
              @click="onEdgeClick($event, r)"
            />
          </g>
        </g>
        <g class="slalom-nodes">
          <g
            v-for="t in graphTricks"
            :key="t.id"
            class="slalom-node"
            :data-id="t.id"
            :style="{ cursor: 'pointer' }"
          >
            <template v-if="t.id && positions[t.id]">
              <circle
                v-if="t.id === highlightNodeId"
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R + 5"
                fill="none"
                stroke="#ffffff"
                stroke-width="2.5"
                stroke-opacity="0.85"
              />
              <circle
                v-if="t.id === linkSourceId"
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R + 5"
                fill="none"
                stroke="#ffffff"
                stroke-width="2"
                stroke-dasharray="4 3"
                stroke-opacity="0.9"
              />
              <circle
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R"
                :fill="sequenceSet.has(t.id) ? '#2c3550' : 'var(--card, #1c1d24)'"
                :stroke="'var(--border, #2a2b33)'"
                stroke-width="1"
              />
              <template v-if="t.lr">
                <path
                  :d="halfPathD(positions[t.id], 'L')"
                  fill="none"
                  stroke-width="3"
                  :stroke="ringStroke(t, 'L')"
                />
                <path
                  :d="halfPathD(positions[t.id], 'R')"
                  fill="none"
                  stroke-width="3"
                  :stroke="ringStroke(t, 'R')"
                />
                <text
                  :x="positions[t.id].x - NODE_R - 8"
                  :y="positions[t.id].y + 3"
                  text-anchor="middle"
                  font-size="9"
                  font-weight="bold"
                  :fill="sideColor('L')"
                >L</text>
                <text
                  :x="positions[t.id].x + NODE_R + 8"
                  :y="positions[t.id].y + 3"
                  text-anchor="middle"
                  font-size="9"
                  font-weight="bold"
                  :fill="sideColor('R')"
                >R</text>
              </template>
              <circle
                v-else
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R"
                fill="none"
                stroke-width="3"
                :stroke="ringStroke(t)"
              />
              <text
                :x="positions[t.id].x"
                :y="positions[t.id].y + 6"
                text-anchor="middle"
                font-size="18"
                style="pointer-events: none"
              >{{ glyphFor(t) }}</text>
              <text
                :x="positions[t.id].x"
                :y="positions[t.id].y + NODE_R + 13"
                text-anchor="middle"
                font-size="11"
                fill="var(--fg, #e6e6ec)"
                style="pointer-events: none"
              >{{ nodeLabel(t) }}</text>
            </template>
          </g>
        </g>
      </g>
    </svg>
    <div class="absolute bottom-3 right-3 flex flex-col gap-1.5">
      <button
        type="button"
        class="w-9 h-9 rounded-md bg-card border border-border text-fg text-lg leading-none flex items-center justify-center active:opacity-70"
        aria-label="Zoom in"
        @click="zoomIn"
      >+</button>
      <button
        type="button"
        class="w-9 h-9 rounded-md bg-card border border-border text-fg text-lg leading-none flex items-center justify-center active:opacity-70"
        aria-label="Zoom out"
        @click="zoomOut"
      >−</button>
      <button
        type="button"
        class="w-9 h-9 rounded-md bg-card border border-border text-fg text-base leading-none flex items-center justify-center active:opacity-70"
        aria-label="Reset view"
        @click="resetView"
      >⌂</button>
    </div>
  </div>
</template>

<style scoped>
.slalom-graph {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>
