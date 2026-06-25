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
import { effectiveRate } from '../domain/rating';
import { loadView, saveView, type NodePosition } from '../utils/graphView';
import { displayName } from '../domain/display';
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

const NODE_R = 28;
const SEMI_R = 22;
const GLYPH_SIZE = 16;
const NAME_OFFSET = NODE_R + 14;
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
  const c1 = legSideColor(edge.fromSide);
  const c2 = legSideColor(edge.toSide);
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
    const x1 = p1.x + ux * NODE_R + nx;
    const y1 = p1.y + uy * NODE_R + ny;
    const x2 = p2.x - ux * NODE_R + nx;
    const y2 = p2.y - uy * NODE_R + ny;
    d = `M ${x1} ${y1} L ${x2} ${y2}`;
    midX = (x1 + x2) / 2;
    midY = (y1 + y2) / 2;
    g1x = x1; g1y = y1; g2x = x2; g2y = y2;
  }
  const useGradient = !selfLoop;
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
  if (c === legSideColor('L')) return 'slalom-arr-l';
  if (c === legSideColor('R')) return 'slalom-arr-r';
  return 'slalom-arr-n';
};

function midpointX(r: EdgeRender): number {
  const a = positions.value[r.edge.from];
  const b = positions.value[r.edge.to];
  if (!a || !b) return 0;
  return (a.x + b.x) / 2;
}

function midpointY(r: EdgeRender): number {
  const a = positions.value[r.edge.from];
  const b = positions.value[r.edge.to];
  if (!a || !b) return 0;
  return (a.y + b.y) / 2;
}

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

const sequencePositions = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < (props.sequenceIds ?? []).length; i++) {
    const id = props.sequenceIds![i];
    if (id && !(id in m)) {
      m[id] = i + 1;
    }
  }
  return m;
});

// W6 node geometry — semicircle rate arcs
function w6PolarPoint(angleDeg: number, radius: number, cx: number, cy: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
}

function w6ArcBetween(startDeg: number, endDeg: number, radius: number, cx: number, cy: number): string {
  const s = w6PolarPoint(startDeg, radius, cx, cy);
  const e = w6PolarPoint(endDeg, radius, cx, cy);
  const sweep = endDeg > startDeg ? 1 : 0;
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}

function w6PartialArc(startDeg: number, endDeg: number, radius: number, cx: number, cy: number, fraction: number): string {
  if (fraction <= 0) return '';
  const f = Math.min(fraction, 0.9999);
  const targetDeg = startDeg + (endDeg - startDeg) * f;
  return w6ArcBetween(startDeg, targetDeg, radius, cx, cy);
}

function w6PartialArcCentered(centerDeg: number, halfSpan: number, radius: number, cx: number, cy: number, fraction: number): string {
  if (fraction <= 0) return '';
  const f = Math.min(fraction, 1);
  return w6ArcBetween(centerDeg - halfSpan * f, centerDeg + halfSpan * f, radius, cx, cy);
}

function w6RateFrac(r: number | null | undefined): number {
  if (r == null) return 0;
  return Math.max(0, Math.min(1, r / 5));
}

function effRateForLeg(t: Trick, side: 'L' | 'R'): number | null {
  if (!t.lr) return null;
  return side === 'L' ? t.rateL : t.rateR;
}

function effRateSingle(t: Trick): number | null {
  if (t.lr) return null;
  return t.rate;
}

function nodeLabel(t: Trick): string {
  const n = displayName(t);
  return n.length > 22 ? n.slice(0, 21) + '…' : n;
}

function glyphFor(t: Trick): string {
  return t.icon || displayName(t).charAt(0).toUpperCase();
}

// Edge rate encoding: opacity 0.30..0.85 grows linearly with rate (width is always hairline).
function edgeOpacity(rate: number | null | undefined): number {
  if (rate == null) return 0.30;
  return 0.30 + (Math.min(5, Math.max(0, rate)) / 5) * 0.55; // 0.30..0.85
}

function legSideColor(side: 'L' | 'R' | null | undefined): string {
  if (side === 'L') return 'var(--color-g-leg-l)';
  if (side === 'R') return 'var(--color-g-leg-r)';
  return 'var(--color-g-fg)';
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
  // Pre-assign fibonacci spawn positions for new nodes (no saved position, no node_x/y).
  // We do this BEFORE the force sim so that nodes with fibonacci anchors are treated as
  // fixed — preventing the sim from scattering them to the forceCenter target.
  const newPositions: Record<string, NodePosition> = { ...positions.value }
  for (const t of tricksList) {
    if (!t.id) continue
    if (newPositions[t.id]) continue  // already has a position
    const sp = saved?.positions[t.id]
    if (sp) continue  // will be picked up by initial()
    if (t.node_x != null && t.node_y != null) continue  // fixed by node_x/y
    const anchor = nextSpawnPosition()
    newPositions[t.id] = { x: anchor.x, y: anchor.y }
    // Update positions immediately so nextSpawnPosition() sees the new placement
    positions.value = newPositions
  }
  const nodes: SimNode[] = tricksList.map((t) => {
    const seed = initial(t);
    // If we pre-assigned a fibonacci position, treat it as fixed for the sim
    const fibPos = t.id ? newPositions[t.id] : undefined;
    const x = seed.x ?? fibPos?.x;
    const y = seed.y ?? fibPos?.y;
    const fixed = seed.fixed || (fibPos != null && !seed.fixed && saved?.positions[t.id!] == null && t.node_x == null);
    return {
      id: t.id!,
      x,
      y,
      fx: fixed ? x : undefined,
      fy: fixed ? y : undefined,
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
    next[n.id] = { x: n.x ?? newPositions[n.id]?.x ?? w / 2, y: n.y ?? newPositions[n.id]?.y ?? h / 2 };
  }
  positions.value = next;
  if (!saved) {
    // Center world origin (0,0) — which is the fibonacci spiral center — at screen center.
    const rect2 = svgRef.value?.getBoundingClientRect()
    if (rect2 && tx.value === 0 && ty.value === 0) {
      tx.value = rect2.width / 2
      ty.value = rect2.height / 2
    } else {
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
    }
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
        // Use fibonacci spawn anchor for dynamically-added tricks
        positions.value = next; // update so nextSpawnPosition sees current placements
        const anchor = nextSpawnPosition();
        next[t.id] = { x: anchor.x, y: anchor.y };
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

// Fibonacci anchor-dot grid — golden-spiral substrate behind the graph.
// Subtle: low alpha, no animation in v1.
const GRID_DOT_COUNT = 160       // denser than before (was 96)
const GRID_SCALE = 26            // denser than before (was 38)
const GRID_DOT_R = 1.0           // uniform dot radius
const GOLDEN_ANGLE_RAD = Math.PI * (3 - Math.sqrt(5)) // ≈ 137.508° in radians

const gridPath = computed<string>(() => {
  const parts: string[] = []
  for (let i = 1; i <= GRID_DOT_COUNT; i++) {
    const angle = i * GOLDEN_ANGLE_RAD
    const radius = GRID_SCALE * Math.sqrt(i)
    const cx = Math.cos(angle) * radius
    const cy = Math.sin(angle) * radius
    parts.push(`M ${cx.toFixed(2)} ${cy.toFixed(2)} m ${-GRID_DOT_R} 0 a ${GRID_DOT_R} ${GRID_DOT_R} 0 1 0 ${GRID_DOT_R * 2} 0 a ${GRID_DOT_R} ${GRID_DOT_R} 0 1 0 ${-GRID_DOT_R * 2} 0`)
  }
  return parts.join(' ')
})

// Spawn anchors — sparser fibonacci spiral used to position new nodes without overlap.
const SPAWN_ANCHOR_COUNT = 400
const SPAWN_SCALE = 72  // ~2.5 × NODE_R so adjacent anchors don't overlap when NODE_R = 28

interface SpawnAnchor { x: number; y: number }

const spawnAnchors: SpawnAnchor[] = (() => {
  const arr: SpawnAnchor[] = []
  for (let i = 1; i <= SPAWN_ANCHOR_COUNT; i++) {
    const angle = i * GOLDEN_ANGLE_RAD
    const radius = SPAWN_SCALE * Math.sqrt(i)
    arr.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return arr
})()

function nextSpawnPosition(): { x: number; y: number } {
  const minDist = (NODE_R + 4) * 2  // collision buffer
  const taken = Object.values(positions.value)
  for (const anchor of spawnAnchors) {
    let conflict = false
    for (const p of taken) {
      const dx = p.x - anchor.x
      const dy = p.y - anchor.y
      if (Math.sqrt(dx * dx + dy * dy) < minDist) {
        conflict = true
        break
      }
    }
    if (!conflict) return { x: anchor.x, y: anchor.y }
  }
  // Fallback: pick the last anchor (out at the edge of the spiral)
  return spawnAnchors[spawnAnchors.length - 1]
}
</script>

<template>
  <div class="relative w-full h-full">
    <svg
      ref="svgRef"
      class="slalom-graph w-full h-full block select-none"
      @click="onSvgClick"
    >
      <defs>
        <filter id="gw-edge-glow"
          filterUnits="userSpaceOnUse"
          x="-2000" y="-2000"
          width="4000" height="4000"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
        </filter>
        <filter id="gw-node-glow"
          filterUnits="userSpaceOnUse"
          x="-2000" y="-2000"
          width="4000" height="4000"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
        <linearGradient id="gw-node-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,0.40)" />
          <stop offset="25%" stop-color="rgba(255,255,255,0.14)" />
          <stop offset="55%" stop-color="rgba(255,255,255,0.04)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0.22)" />
        </linearGradient>
        <marker
          v-for="m in [
            { id: 'slalom-arr-l', color: legSideColor('L') },
            { id: 'slalom-arr-r', color: legSideColor('R') },
            { id: 'slalom-arr-n', color: legSideColor(null) },
          ]"
          :key="m.id"
          :id="m.id"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M1 1 L9 5 L1 9"
            fill="none"
            :stroke="m.color"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
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
        <g class="gw-graph-grid" aria-hidden="true">
          <path
            :d="gridPath"
            fill="var(--color-g-brand)"
            fill-opacity="0.10"
            pointer-events="none"
          />
        </g>
        <g class="slalom-edges">
          <template v-for="r in edgeRenders" :key="(r.edge.id ?? '') + ':' + r.d">
            <!-- S3 glow layer: soft brand halo behind highlighted edge -->
            <path
              v-if="r.edge.id && r.edge.id === highlightEdgeId"
              :d="r.d"
              fill="none"
              stroke="var(--color-g-brand)"
              stroke-width="4.5"
              stroke-opacity="0.4"
              stroke-linecap="round"
              filter="url(#gw-edge-glow)"
              pointer-events="none"
            />
            <!-- Always-on gentle glow halo (leg from-side color, 3px, behind crisp line) -->
            <path
              v-if="r.edge.id !== highlightEdgeId"
              :d="r.d"
              fill="none"
              :stroke="legSideColor(r.edge.fromSide)"
              stroke-width="3"
              :stroke-opacity="edgeOpacity(r.edge.rate) * 0.4"
              stroke-linecap="round"
              filter="url(#gw-edge-glow)"
              pointer-events="none"
            />
            <!-- Crisp hairline: idle uses leg-gradient + rate-encoded opacity; selected uses brand color -->
            <path
              :d="r.d"
              fill="none"
              :stroke="r.edge.id === highlightEdgeId ? 'var(--color-g-brand)' : r.stroke"
              :stroke-width="r.edge.id === highlightEdgeId ? 1.5 : 1"
              :stroke-opacity="r.edge.id === highlightEdgeId ? 1 : edgeOpacity(r.edge.rate)"
              stroke-linecap="round"
              :marker-end="r.edge.bidi ? undefined : `url(#${r.markerEnd})`"
              :marker-start="undefined"
            />
            <!-- Bidi midpoint diamond -->
            <g
              v-if="r.edge.bidi && r.edge.from !== r.edge.to"
              :transform="`translate(${midpointX(r)}, ${midpointY(r)}) rotate(45)`"
              pointer-events="none"
            >
              <rect x="-3" y="-3" width="6" height="6"
                :fill="legSideColor(r.edge.fromSide)"
                fill-opacity="0.7"
              />
            </g>
            <!-- Wide transparent hit-target for click -->
            <path
              :d="r.d"
              fill="none"
              stroke="transparent"
              stroke-width="14"
              style="cursor: pointer"
              @click="onEdgeClick($event, r)"
            />
          </template>
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
              <!-- S3 selected glow ring (stays unscaled, outside the scale group) -->
              <circle
                v-if="t.id === highlightNodeId"
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R + 5"
                fill="none"
                stroke="var(--color-g-brand)"
                stroke-width="3"
                stroke-opacity="0.45"
                filter="url(#gw-node-glow)"
                pointer-events="none"
              />
              <!-- S3 link-source dashed glow ring -->
              <circle
                v-if="t.id === linkSourceId"
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R + 5"
                fill="none"
                stroke="var(--color-g-brand)"
                stroke-width="2"
                stroke-dasharray="4 3"
                stroke-opacity="0.55"
                filter="url(#gw-node-glow)"
                pointer-events="none"
              />

              <!-- Node body group: scales up when selected (S3 treatment) -->
              <g
                :transform="t.id === highlightNodeId
                  ? `translate(${positions[t.id].x}, ${positions[t.id].y}) scale(1.06) translate(${-positions[t.id].x}, ${-positions[t.id].y})`
                  : ''"
              >
              <!-- Glass circle background (W6 design) -->
              <circle
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R"
                :fill="sequenceSet.has(t.id) ? 'rgba(181, 168, 255, 0.20)' : 'rgba(255, 255, 255, 0.06)'"
              />
              <circle
                :cx="positions[t.id].x"
                :cy="positions[t.id].y"
                :r="NODE_R"
                fill="none"
                stroke="url(#gw-node-stroke)"
                stroke-width="1"
              />

              <!-- W6 rate semicircles -->
              <template v-if="t.lr">
                <!-- L track -->
                <path
                  :d="w6ArcBetween(185, 355, SEMI_R, positions[t.id].x, positions[t.id].y)"
                  fill="none"
                  stroke="var(--color-g-leg-l)"
                  stroke-opacity="0.15"
                  stroke-width="1"
                />
                <!-- L glow -->
                <path
                  v-if="w6RateFrac(effRateForLeg(t, 'L')) > 0"
                  :d="w6PartialArc(185, 355, SEMI_R, positions[t.id].x, positions[t.id].y, w6RateFrac(effRateForLeg(t, 'L')))"
                  fill="none"
                  stroke="var(--color-g-leg-l)"
                  stroke-width="3"
                  stroke-opacity="0.5"
                  stroke-linecap="round"
                  filter="url(#gw-node-glow)"
                  pointer-events="none"
                />
                <!-- L crisp -->
                <path
                  v-if="w6RateFrac(effRateForLeg(t, 'L')) > 0"
                  :d="w6PartialArc(185, 355, SEMI_R, positions[t.id].x, positions[t.id].y, w6RateFrac(effRateForLeg(t, 'L')))"
                  fill="none"
                  stroke="var(--color-g-leg-l)"
                  stroke-width="1"
                  stroke-linecap="round"
                  pointer-events="none"
                />
                <!-- R track -->
                <path
                  :d="w6ArcBetween(175, 5, SEMI_R, positions[t.id].x, positions[t.id].y)"
                  fill="none"
                  stroke="var(--color-g-leg-r)"
                  stroke-opacity="0.15"
                  stroke-width="1"
                />
                <!-- R glow -->
                <path
                  v-if="w6RateFrac(effRateForLeg(t, 'R')) > 0"
                  :d="w6PartialArc(175, 5, SEMI_R, positions[t.id].x, positions[t.id].y, w6RateFrac(effRateForLeg(t, 'R')))"
                  fill="none"
                  stroke="var(--color-g-leg-r)"
                  stroke-width="3"
                  stroke-opacity="0.5"
                  stroke-linecap="round"
                  filter="url(#gw-node-glow)"
                  pointer-events="none"
                />
                <!-- R crisp -->
                <path
                  v-if="w6RateFrac(effRateForLeg(t, 'R')) > 0"
                  :d="w6PartialArc(175, 5, SEMI_R, positions[t.id].x, positions[t.id].y, w6RateFrac(effRateForLeg(t, 'R')))"
                  fill="none"
                  stroke="var(--color-g-leg-r)"
                  stroke-width="1"
                  stroke-linecap="round"
                  pointer-events="none"
                />
              </template>
              <template v-else>
                <!-- u track -->
                <path
                  :d="w6ArcBetween(95, 265, SEMI_R, positions[t.id].x, positions[t.id].y)"
                  fill="none"
                  stroke="var(--color-g-fg)"
                  stroke-opacity="0.15"
                  stroke-width="1"
                />
                <!-- u glow -->
                <path
                  v-if="w6RateFrac(effRateSingle(t)) > 0"
                  :d="w6PartialArcCentered(180, 85, SEMI_R, positions[t.id].x, positions[t.id].y, w6RateFrac(effRateSingle(t)))"
                  fill="none"
                  stroke="var(--color-g-fg)"
                  stroke-width="3"
                  stroke-opacity="0.5"
                  stroke-linecap="round"
                  filter="url(#gw-node-glow)"
                  pointer-events="none"
                />
                <!-- u crisp -->
                <path
                  v-if="w6RateFrac(effRateSingle(t)) > 0"
                  :d="w6PartialArcCentered(180, 85, SEMI_R, positions[t.id].x, positions[t.id].y, w6RateFrac(effRateSingle(t)))"
                  fill="none"
                  stroke="var(--color-g-fg)"
                  stroke-width="1"
                  stroke-linecap="round"
                  pointer-events="none"
                />
              </template>

              <!-- Glyph (centered in circle) -->
              <text
                :x="positions[t.id].x"
                :y="positions[t.id].y + 5"
                text-anchor="middle"
                :font-size="GLYPH_SIZE"
                pointer-events="none"
              >{{ glyphFor(t) }}</text>

              <!-- Name (below circle) -->
              <text
                :x="positions[t.id].x"
                :y="positions[t.id].y + NAME_OFFSET"
                text-anchor="middle"
                font-size="11"
                font-weight="600"
                fill="var(--color-g-fg)"
                pointer-events="none"
              >{{ nodeLabel(t) }}</text>
              </g>
              <!-- S4 sequence badge: 1-indexed position in chain, top-right corner of node -->
              <g
                v-if="sequencePositions[t.id]"
                :transform="`translate(${positions[t.id].x + NODE_R * 0.7}, ${positions[t.id].y - NODE_R * 0.7})`"
                pointer-events="none"
              >
                <!-- Glow halo behind badge -->
                <circle r="11" fill="var(--color-g-brand)" opacity="0.45" filter="url(#gw-node-glow)" />
                <!-- Solid badge -->
                <circle r="9" fill="var(--color-g-brand)" />
                <text x="0" y="3" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-g-base)">{{ sequencePositions[t.id] }}</text>
              </g>
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
