<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A2' | 'V1' | 'V2' | 'V3' | 'V4'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'A2', title: 'Full ring — R outer + LED glow', desc: 'Refined Apple-Watch full ring. R is the outer concentric, L is inner. Filled arc gently glows.' },
  { id: 'V1', title: 'Bold semicircles', desc: 'LR mode: "(" left = L, ")" right = R, filling from bottom up. Non-lr: "u" bottom half filling along arc.' },
  { id: 'V2', title: 'Thin semicircles', desc: 'Same shapes as V1, thinner stroke (1.5px).' },
  { id: 'V3', title: 'LED dashed semicircles', desc: '5 dashes per semicircle, lit/ghost with LED halo.' },
  { id: 'V4', title: 'LED dot semicircles', desc: '5 dots per semicircle, lit/ghost with LED halo.' },
]

interface NodeSample {
  name: string
  icon: string
  lr: boolean
  rate: number | null
  rateL: number | null
  rateR: number | null
}

const samples: NodeSample[] = [
  { name: 'Cross', icon: '🟦', lr: false, rate: 3, rateL: null, rateR: null },
  { name: 'Snake', icon: '🐍', lr: true, rate: null, rateL: 4, rateR: 2 },
  { name: 'Sun', icon: '☀️', lr: true, rate: null, rateL: 5, rateR: 5 },
  { name: 'Cobra', icon: '🟪', lr: false, rate: 5, rateL: null, rateR: null },
  { name: 'New', icon: '✨', lr: false, rate: null, rateL: null, rateR: null },
]

// Geometry
const FULL_RING_R_OUTER = 20
const FULL_RING_R_INNER = 14
const SEMI_R = 19

function arcPathFraction(radius: number, fraction: number): string {
  // Full-circle arc starting at 12 o'clock, going clockwise.
  if (fraction <= 0) return ''
  const angle = Math.min(fraction, 0.9999) * 2 * Math.PI
  const startX = 0, startY = -radius
  const endX = Math.sin(angle) * radius
  const endY = -Math.cos(angle) * radius
  const largeArc = angle > Math.PI ? 1 : 0
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`
}

function fullCircleTrack(radius: number): string {
  // Full circle as a path so stroke-opacity can apply uniformly.
  return `M 0 ${-radius} A ${radius} ${radius} 0 1 1 0 ${radius} A ${radius} ${radius} 0 1 1 0 ${-radius}`
}

// Semicircle helpers: angles in degrees from 12 o'clock, clockwise.
function polarPoint(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius }
}

function arcBetween(startDeg: number, endDeg: number, radius: number): string {
  const s = polarPoint(startDeg, radius)
  const e = polarPoint(endDeg, radius)
  const sweep = endDeg > startDeg ? 1 : 0
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} ${sweep} ${e.x} ${e.y}`
}

// LR semicircle ranges (5° gaps so L and R never merge at top/bottom):
//   L semicircle: 185° → 355° (bottom-up via 9 o'clock, left half)
//   R semicircle: 175° → 5°  (bottom-up via 3 o'clock, right half)
//   Non-lr u: 95° → 265° (bottom semi with 5° gaps)

function rateFrac(rate: number | null): number {
  if (rate == null) return 0
  return Math.max(0, Math.min(1, rate / 5))
}

// Returns a partial arc within a semicircle.
// startDeg + endDeg define the semicircle ends. fraction (0..1) determines fill from start toward end.
function partialArc(startDeg: number, endDeg: number, radius: number, fraction: number): string {
  if (fraction <= 0) return ''
  const f = Math.min(fraction, 0.9999)
  const targetDeg = startDeg + (endDeg - startDeg) * f
  return arcBetween(startDeg, targetDeg, radius)
}

// Dash/dot positions along a semicircle: 5 evenly-spaced points
function semicirclePositions(startDeg: number, endDeg: number, count: number, radius: number): { x: number; y: number; deg: number }[] {
  const points = []
  // Position dashes/dots at the centers of 5 equal sub-arcs.
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const deg = startDeg + (endDeg - startDeg) * t
    const p = polarPoint(deg, radius)
    points.push({ x: p.x, y: p.y, deg })
  }
  return points
}

// Dashed segment: a small arc at the given center degree (span reduced to 16°)
function dashAt(centerDeg: number, span: number, radius: number): string {
  return arcBetween(centerDeg - span / 2, centerDeg + span / 2, radius)
}
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Node options · v3
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Glass circle nodes with rate bars. Pick one for the actual graph.
    </p>

    <section
      v-for="v in variants"
      :key="v.id"
      class="gw-glass p-4 flex flex-col gap-4"
      :style="{ borderRadius: gw.radius.panel + 'px' }"
    >
      <header class="flex items-baseline gap-3">
        <span :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 700, color: gw.brand }">{{ v.id }}</span>
        <span :style="{ fontSize: gw.type.body + 'px' }">{{ v.title }}</span>
      </header>
      <p :style="{ color: gw.fgMuted, fontSize: gw.type.micro + 'px' }">{{ v.desc }}</p>

      <div class="flex flex-wrap gap-6">
        <div
          v-for="(s, idx) in samples"
          :key="idx"
          class="flex flex-col items-center gap-1.5"
          style="width: 84px;"
        >
          <!-- Fix 1: block-level SVG inside overflow:hidden circle, no grid/absolute tricks -->
          <div
            class="gw-glass"
            :style="{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
            }"
          >
            <svg
              :style="{ width: '100%', height: '100%', display: 'block' }"
              viewBox="-28 -28 56 56"
            >
              <!-- Defs for LED glow filter — Fix 3: stdDeviation reduced to 1.5 -->
              <defs>
                <filter id="gw-node-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
                </filter>
              </defs>

              <!-- A2: Full ring, R outer + LED glow on filled arc -->
              <!-- Fix 3 (A2 glow tuning): stroke-width 4.5, opacity 0.35 -->
              <template v-if="v.id === 'A2'">
                <template v-if="s.lr">
                  <!-- Outer R track -->
                  <path :d="fullCircleTrack(FULL_RING_R_OUTER)" fill="none" :stroke="gw.leg.r" stroke-opacity="0.15" stroke-width="3.5" />
                  <!-- Outer R glow -->
                  <path v-if="rateFrac(s.rateR) > 0"
                    :d="arcPathFraction(FULL_RING_R_OUTER, rateFrac(s.rateR))"
                    fill="none" :stroke="gw.leg.r" stroke-width="4.5" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <!-- Outer R arc -->
                  <path :d="arcPathFraction(FULL_RING_R_OUTER, rateFrac(s.rateR))"
                    fill="none" :stroke="gw.leg.r" stroke-width="3.5" stroke-linecap="round" />
                  <!-- Inner L track -->
                  <path :d="fullCircleTrack(FULL_RING_R_INNER)" fill="none" :stroke="gw.leg.l" stroke-opacity="0.15" stroke-width="3.5" />
                  <!-- Inner L glow -->
                  <path v-if="rateFrac(s.rateL) > 0"
                    :d="arcPathFraction(FULL_RING_R_INNER, rateFrac(s.rateL))"
                    fill="none" :stroke="gw.leg.l" stroke-width="4.5" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="arcPathFraction(FULL_RING_R_INNER, rateFrac(s.rateL))"
                    fill="none" :stroke="gw.leg.l" stroke-width="3.5" stroke-linecap="round" />
                </template>
                <template v-else>
                  <path :d="fullCircleTrack(FULL_RING_R_OUTER)" fill="none" :stroke="gw.fg" stroke-opacity="0.15" stroke-width="3.5" />
                  <path v-if="rateFrac(s.rate) > 0"
                    :d="arcPathFraction(FULL_RING_R_OUTER, rateFrac(s.rate))"
                    fill="none" :stroke="gw.fg" stroke-width="4.5" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="arcPathFraction(FULL_RING_R_OUTER, rateFrac(s.rate))"
                    fill="none" :stroke="gw.fg" stroke-width="3.5" stroke-linecap="round" />
                </template>
              </template>

              <!-- V1: Bold semicircles -->
              <!-- Fix 3 (V1 glow tuning): stroke-width 4, opacity 0.35 -->
              <!-- Fix 4: L fills 185→355, R fills 175→5 (bottom-up) -->
              <!-- Fix 5: 5° gaps applied to track and fill ranges -->
              <template v-else-if="v.id === 'V1'">
                <template v-if="s.lr">
                  <!-- L: 185°→355°, bottom-up via 9 o'clock -->
                  <path :d="arcBetween(185, 355, SEMI_R)" fill="none" :stroke="gw.leg.l" stroke-opacity="0.15" stroke-width="3.5" />
                  <path v-if="rateFrac(s.rateL) > 0"
                    :d="partialArc(185, 355, SEMI_R, rateFrac(s.rateL))"
                    fill="none" :stroke="gw.leg.l" stroke-width="4" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="partialArc(185, 355, SEMI_R, rateFrac(s.rateL))"
                    fill="none" :stroke="gw.leg.l" stroke-width="3.5" stroke-linecap="round" />
                  <!-- R: 175°→5°, bottom-up via 3 o'clock -->
                  <path :d="arcBetween(175, 5, SEMI_R)" fill="none" :stroke="gw.leg.r" stroke-opacity="0.15" stroke-width="3.5" />
                  <path v-if="rateFrac(s.rateR) > 0"
                    :d="partialArc(175, 5, SEMI_R, rateFrac(s.rateR))"
                    fill="none" :stroke="gw.leg.r" stroke-width="4" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="partialArc(175, 5, SEMI_R, rateFrac(s.rateR))"
                    fill="none" :stroke="gw.leg.r" stroke-width="3.5" stroke-linecap="round" />
                </template>
                <template v-else>
                  <!-- u: 95°→265°, 5° gaps at each end -->
                  <path :d="arcBetween(95, 265, SEMI_R)" fill="none" :stroke="gw.fg" stroke-opacity="0.15" stroke-width="3.5" />
                  <path v-if="rateFrac(s.rate) > 0"
                    :d="partialArc(95, 265, SEMI_R, rateFrac(s.rate))"
                    fill="none" :stroke="gw.fg" stroke-width="4" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="partialArc(95, 265, SEMI_R, rateFrac(s.rate))"
                    fill="none" :stroke="gw.fg" stroke-width="3.5" stroke-linecap="round" />
                </template>
              </template>

              <!-- V2: Thin semicircles (1.5px) -->
              <!-- Fix 2: add glow layer -->
              <!-- Fix 4 & 5: same bottom-up ranges + gaps -->
              <template v-else-if="v.id === 'V2'">
                <template v-if="s.lr">
                  <!-- L track + glow + fill -->
                  <path :d="arcBetween(185, 355, SEMI_R)" fill="none" :stroke="gw.leg.l" stroke-opacity="0.15" stroke-width="1.5" />
                  <path v-if="rateFrac(s.rateL) > 0"
                    :d="partialArc(185, 355, SEMI_R, rateFrac(s.rateL))"
                    fill="none" :stroke="gw.leg.l" stroke-width="3" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="partialArc(185, 355, SEMI_R, rateFrac(s.rateL))"
                    fill="none" :stroke="gw.leg.l" stroke-width="1.5" stroke-linecap="round" />
                  <!-- R track + glow + fill -->
                  <path :d="arcBetween(175, 5, SEMI_R)" fill="none" :stroke="gw.leg.r" stroke-opacity="0.15" stroke-width="1.5" />
                  <path v-if="rateFrac(s.rateR) > 0"
                    :d="partialArc(175, 5, SEMI_R, rateFrac(s.rateR))"
                    fill="none" :stroke="gw.leg.r" stroke-width="3" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="partialArc(175, 5, SEMI_R, rateFrac(s.rateR))"
                    fill="none" :stroke="gw.leg.r" stroke-width="1.5" stroke-linecap="round" />
                </template>
                <template v-else>
                  <!-- u track + glow + fill -->
                  <path :d="arcBetween(95, 265, SEMI_R)" fill="none" :stroke="gw.fg" stroke-opacity="0.15" stroke-width="1.5" />
                  <path v-if="rateFrac(s.rate) > 0"
                    :d="partialArc(95, 265, SEMI_R, rateFrac(s.rate))"
                    fill="none" :stroke="gw.fg" stroke-width="3" stroke-opacity="0.35"
                    stroke-linecap="round" filter="url(#gw-node-glow)" pointer-events="none" />
                  <path :d="partialArc(95, 265, SEMI_R, rateFrac(s.rate))"
                    fill="none" :stroke="gw.fg" stroke-width="1.5" stroke-linecap="round" />
                </template>
              </template>

              <!-- V3: Dashed semicircles -->
              <!-- Fix 2: add glow halo to lit dashes -->
              <!-- Fix 4 & 5: bottom-up ranges + 5° gaps -->
              <!-- Fix 6: stroke-width 2, dash span 16°, glow stroke-width 3 -->
              <template v-else-if="v.id === 'V3'">
                <template v-if="s.lr">
                  <!-- L dashes: 185°→355° -->
                  <template v-for="(p, i) in semicirclePositions(185, 355, 5, SEMI_R)" :key="'l' + i">
                    <!-- Glow halo (lit only) -->
                    <path
                      v-if="i < (s.rateL ?? 0)"
                      :d="dashAt(p.deg, 16, SEMI_R)"
                      fill="none"
                      :stroke="gw.leg.l"
                      stroke-width="3"
                      stroke-opacity="0.35"
                      stroke-linecap="round"
                      filter="url(#gw-node-glow)"
                      pointer-events="none"
                    />
                    <!-- Crisp dash -->
                    <path :d="dashAt(p.deg, 16, SEMI_R)" fill="none"
                      :stroke="gw.leg.l"
                      :stroke-opacity="i < (s.rateL ?? 0) ? 1 : 0.1"
                      stroke-width="2" stroke-linecap="round" />
                  </template>
                  <!-- R dashes: 175°→5° -->
                  <template v-for="(p, i) in semicirclePositions(175, 5, 5, SEMI_R)" :key="'r' + i">
                    <!-- Glow halo (lit only) -->
                    <path
                      v-if="i < (s.rateR ?? 0)"
                      :d="dashAt(p.deg, 16, SEMI_R)"
                      fill="none"
                      :stroke="gw.leg.r"
                      stroke-width="3"
                      stroke-opacity="0.35"
                      stroke-linecap="round"
                      filter="url(#gw-node-glow)"
                      pointer-events="none"
                    />
                    <!-- Crisp dash -->
                    <path :d="dashAt(p.deg, 16, SEMI_R)" fill="none"
                      :stroke="gw.leg.r"
                      :stroke-opacity="i < (s.rateR ?? 0) ? 1 : 0.1"
                      stroke-width="2" stroke-linecap="round" />
                  </template>
                </template>
                <template v-else>
                  <!-- u dashes: 95°→265° -->
                  <template v-for="(p, i) in semicirclePositions(95, 265, 5, SEMI_R)" :key="'u' + i">
                    <!-- Glow halo (lit only) -->
                    <path
                      v-if="i < (s.rate ?? 0)"
                      :d="dashAt(p.deg, 16, SEMI_R)"
                      fill="none"
                      :stroke="gw.fg"
                      stroke-width="3"
                      stroke-opacity="0.35"
                      stroke-linecap="round"
                      filter="url(#gw-node-glow)"
                      pointer-events="none"
                    />
                    <!-- Crisp dash -->
                    <path :d="dashAt(p.deg, 16, SEMI_R)" fill="none"
                      :stroke="gw.fg"
                      :stroke-opacity="i < (s.rate ?? 0) ? 1 : 0.1"
                      stroke-width="2" stroke-linecap="round" />
                  </template>
                </template>
              </template>

              <!-- V4: Dot semicircles -->
              <!-- Fix 2: add glow halo circle to lit dots -->
              <!-- Fix 4 & 5: bottom-up ranges + 5° gaps -->
              <template v-else-if="v.id === 'V4'">
                <template v-if="s.lr">
                  <!-- L dots: 185°→355° -->
                  <template v-for="(p, i) in semicirclePositions(185, 355, 5, SEMI_R)" :key="'dl' + i">
                    <!-- Glow halo (lit only) -->
                    <circle
                      v-if="i < (s.rateL ?? 0)"
                      :cx="p.x" :cy="p.y" r="5"
                      :fill="gw.leg.l" fill-opacity="0.35"
                      filter="url(#gw-node-glow)"
                      pointer-events="none"
                    />
                    <circle :cx="p.x" :cy="p.y" r="2.5" :fill="gw.leg.l" :opacity="i < (s.rateL ?? 0) ? 1 : 0.1" />
                  </template>
                  <!-- R dots: 175°→5° -->
                  <template v-for="(p, i) in semicirclePositions(175, 5, 5, SEMI_R)" :key="'dr' + i">
                    <!-- Glow halo (lit only) -->
                    <circle
                      v-if="i < (s.rateR ?? 0)"
                      :cx="p.x" :cy="p.y" r="5"
                      :fill="gw.leg.r" fill-opacity="0.35"
                      filter="url(#gw-node-glow)"
                      pointer-events="none"
                    />
                    <circle :cx="p.x" :cy="p.y" r="2.5" :fill="gw.leg.r" :opacity="i < (s.rateR ?? 0) ? 1 : 0.1" />
                  </template>
                </template>
                <template v-else>
                  <!-- u dots: 95°→265° -->
                  <template v-for="(p, i) in semicirclePositions(95, 265, 5, SEMI_R)" :key="'du' + i">
                    <!-- Glow halo (lit only) -->
                    <circle
                      v-if="i < (s.rate ?? 0)"
                      :cx="p.x" :cy="p.y" r="5"
                      :fill="gw.fg" fill-opacity="0.35"
                      filter="url(#gw-node-glow)"
                      pointer-events="none"
                    />
                    <circle :cx="p.x" :cy="p.y" r="2.5" :fill="gw.fg" :opacity="i < (s.rate ?? 0) ? 1 : 0.1" />
                  </template>
                </template>
              </template>

              <!-- Center glyph -->
              <text text-anchor="middle" dominant-baseline="central" :style="{ fontSize: '14px' }">{{ s.icon }}</text>
            </svg>
          </div>
          <span :style="{ fontSize: '11px', color: gw.fg, fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }">{{ s.name }}</span>
          <span :style="{ fontSize: '9px', color: gw.fgMuted, fontFamily: 'ui-monospace, monospace' }">{{ s.lr ? `L${s.rateL ?? '—'} R${s.rateR ?? '—'}` : `r=${s.rate ?? '—'}` }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
