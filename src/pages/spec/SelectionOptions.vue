<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'S1' | 'S2' | 'S3' | 'S4'
type State = 'idle' | 'selected' | 'sequence' | 'linkSource' | 'linkTarget'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'S1', title: 'Glow halo on both', desc: 'Selected → outer Gaussian glow. Sequence → brand tint + small glow. Link-source → dashed glow.' },
  { id: 'S2', title: 'Ring border on both', desc: 'Selected → crisp 2px brand ring. Sequence → ring + tinted fill. Link-source → dashed ring.' },
  { id: 'S3', title: 'Scale + glow (subtle motion)', desc: 'Selected → glow + scale 1.05. Sequence → brand tint. Link-source → dashed glow.' },
  { id: 'S4', title: 'Outline + chip indicator', desc: 'Selected → outline + ✓ badge. Sequence → numbered badge. Link-source → arrow badge.' },
]

const states: { id: State; label: string }[] = [
  { id: 'idle',       label: 'Idle' },
  { id: 'selected',   label: 'Selected' },
  { id: 'sequence',   label: 'Sequence' },
  { id: 'linkSource', label: 'Link source' },
  { id: 'linkTarget', label: 'Link target' },
]

const NODE_R = 22
const SEMI_R = 17
const SLOT_W = 64
const SLOT_H = 64

function arcBetween(startDeg: number, endDeg: number, radius: number, cx = 0, cy = 0): string {
  const sRad = (startDeg - 90) * Math.PI / 180
  const eRad = (endDeg - 90) * Math.PI / 180
  const sx = cx + Math.cos(sRad) * radius
  const sy = cy + Math.sin(sRad) * radius
  const ex = cx + Math.cos(eRad) * radius
  const ey = cy + Math.sin(eRad) * radius
  const sweep = endDeg > startDeg ? 1 : 0
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} ${sweep} ${ex} ${ey}`
}

function partialArcCentered(centerDeg: number, halfSpan: number, radius: number, fraction: number): string {
  if (fraction <= 0) return ''
  const f = Math.min(fraction, 1)
  return arcBetween(centerDeg - halfSpan * f, centerDeg + halfSpan * f, radius)
}

// All node samples use rate=3 for visual consistency (so the focus stays on the SELECTION style)
const SAMPLE_RATE = 3
const SAMPLE_FRAC = SAMPLE_RATE / 5
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Selection options
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Four unified selection languages — same idiom for nodes and edges.
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

      <div class="flex flex-col gap-3">
        <!-- NODES row -->
        <div>
          <div :style="{ fontSize: '10px', color: gw.fgMuted, marginBottom: '4px' }">NODES</div>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="st in states"
              :key="'n' + st.id"
              class="flex flex-col items-center gap-1"
            >
              <svg :width="SLOT_W" :height="SLOT_H" :viewBox="`${-SLOT_W/2} ${-SLOT_H/2} ${SLOT_W} ${SLOT_H}`">
                <defs>
                  <filter :id="`glow-${v.id}-${st.id}`" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
                  </filter>
                </defs>

                <!-- Selection treatment per variant -->

                <!-- S1 Glow halo -->
                <template v-if="v.id === 'S1'">
                  <circle
                    v-if="st.id === 'selected'"
                    cx="0" cy="0" :r="NODE_R + 2"
                    fill="none"
                    :stroke="gw.brand"
                    stroke-width="4"
                    stroke-opacity="0.5"
                    :filter="`url(#glow-${v.id}-${st.id})`"
                  />
                  <circle
                    v-if="st.id === 'linkSource'"
                    cx="0" cy="0" :r="NODE_R + 2"
                    fill="none"
                    :stroke="gw.brand"
                    stroke-width="3"
                    stroke-opacity="0.6"
                    stroke-dasharray="4 3"
                    :filter="`url(#glow-${v.id}-${st.id})`"
                  />
                  <circle
                    v-if="st.id === 'linkTarget'"
                    cx="0" cy="0" :r="NODE_R + 4"
                    fill="none"
                    :stroke="gw.brand"
                    stroke-width="5"
                    stroke-opacity="0.65"
                    :filter="`url(#glow-${v.id}-${st.id})`"
                  />
                </template>

                <!-- S2 Ring border -->
                <template v-else-if="v.id === 'S2'">
                  <circle
                    v-if="st.id === 'selected'"
                    cx="0" cy="0" :r="NODE_R + 3"
                    fill="none" :stroke="gw.brand"
                    stroke-width="2" />
                  <circle
                    v-if="st.id === 'linkSource'"
                    cx="0" cy="0" :r="NODE_R + 3"
                    fill="none" :stroke="gw.brand"
                    stroke-width="2" stroke-dasharray="4 3" />
                  <circle
                    v-if="st.id === 'linkTarget'"
                    cx="0" cy="0" :r="NODE_R + 4"
                    fill="none" :stroke="gw.brand"
                    stroke-width="3" />
                </template>

                <!-- S3 Scale + glow -->
                <template v-else-if="v.id === 'S3'">
                  <circle
                    v-if="st.id === 'selected'"
                    cx="0" cy="0" :r="NODE_R + 2"
                    fill="none" :stroke="gw.brand"
                    stroke-width="3" stroke-opacity="0.45"
                    :filter="`url(#glow-${v.id}-${st.id})`" />
                  <circle
                    v-if="st.id === 'linkSource'"
                    cx="0" cy="0" :r="NODE_R + 2"
                    fill="none" :stroke="gw.brand"
                    stroke-width="2" stroke-opacity="0.55"
                    stroke-dasharray="4 3"
                    :filter="`url(#glow-${v.id}-${st.id})`" />
                  <circle
                    v-if="st.id === 'linkTarget'"
                    cx="0" cy="0" :r="NODE_R + 3"
                    fill="none" :stroke="gw.brand"
                    stroke-width="4" stroke-opacity="0.55"
                    :filter="`url(#glow-${v.id}-${st.id})`" />
                </template>

                <!-- S4 Outline + chip -->
                <template v-else-if="v.id === 'S4'">
                  <circle
                    v-if="st.id === 'selected' || st.id === 'linkSource'"
                    cx="0" cy="0" :r="NODE_R + 2"
                    fill="none" :stroke="gw.brand"
                    stroke-width="1.5"
                    :stroke-dasharray="st.id === 'linkSource' ? '3 2' : ''" />
                  <circle
                    v-if="st.id === 'linkTarget'"
                    cx="0" cy="0" :r="NODE_R + 2"
                    fill="none" :stroke="gw.brand"
                    stroke-width="1.5" stroke-dasharray="6 3" />
                </template>

                <!-- Node body (W6 design) — wrap with optional scale -->
                <g :transform="(v.id === 'S3' && (st.id === 'selected' || st.id === 'linkTarget')) ? 'scale(1.06)' : 'scale(1)'">
                  <!-- glass circle -->
                  <circle cx="0" cy="0" :r="NODE_R" :fill="st.id === 'sequence' ? 'rgba(181, 168, 255, 0.20)' : 'rgba(255, 255, 255, 0.06)'" />
                  <circle cx="0" cy="0" :r="NODE_R" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
                  <!-- u track + fill -->
                  <path :d="arcBetween(95, 265, SEMI_R)" fill="none" :stroke="gw.fg" stroke-opacity="0.15" stroke-width="1" />
                  <path :d="partialArcCentered(180, 85, SEMI_R, SAMPLE_FRAC)"
                    fill="none" :stroke="gw.fg" stroke-width="3" stroke-opacity="0.5" stroke-linecap="round"
                    :filter="`url(#glow-${v.id}-${st.id})`"
                    pointer-events="none" />
                  <path :d="partialArcCentered(180, 85, SEMI_R, SAMPLE_FRAC)"
                    fill="none" :stroke="gw.fg" stroke-width="1" stroke-linecap="round"
                    pointer-events="none" />
                  <!-- glyph -->
                  <text x="0" y="5" text-anchor="middle" font-size="13" pointer-events="none">⚡</text>
                </g>

                <!-- S4 chip indicators -->
                <template v-if="v.id === 'S4'">
                  <g v-if="st.id === 'selected'" transform="translate(18, -22)">
                    <circle cx="0" cy="0" r="7" :fill="gw.brand" />
                    <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="700" :fill="gw.base">✓</text>
                  </g>
                  <g v-if="st.id === 'sequence'" transform="translate(18, -22)">
                    <circle cx="0" cy="0" r="7" :fill="gw.brand" />
                    <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="700" :fill="gw.base">2</text>
                  </g>
                  <g v-if="st.id === 'linkSource'" transform="translate(18, -22)">
                    <circle cx="0" cy="0" r="7" :fill="gw.brand" />
                    <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="700" :fill="gw.base">→</text>
                  </g>
                </template>
              </svg>
              <span :style="{ fontSize: '10px', color: gw.fgMuted, fontFamily: 'ui-monospace, monospace' }">{{ st.label }}</span>
            </div>
          </div>
        </div>

        <!-- EDGES row -->
        <div>
          <div :style="{ fontSize: '10px', color: gw.fgMuted, marginBottom: '4px' }">EDGES</div>
          <div class="flex flex-wrap gap-4">
            <div
              v-for="st in states"
              :key="'e' + st.id"
              class="flex flex-col items-center gap-1"
            >
              <svg :width="120" :height="56" :viewBox="`0 0 120 56`">
                <defs>
                  <filter :id="`eglow-${v.id}-${st.id}`" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
                  </filter>
                </defs>

                <!-- Two mock dots as edge endpoints -->
                <circle cx="14" cy="28" r="6" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.20)" stroke-width="1" />
                <circle cx="106" cy="28" r="6" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.20)" stroke-width="1" />

                <!-- S1: Glow on selected/etc -->
                <template v-if="v.id === 'S1'">
                  <line v-if="st.id === 'selected' || st.id === 'linkTarget'"
                    x1="20" y1="28" x2="100" y2="28"
                    :stroke="gw.brand" stroke-width="6" stroke-opacity="0.5"
                    stroke-linecap="round"
                    :filter="`url(#eglow-${v.id}-${st.id})`" />
                  <line x1="20" y1="28" x2="100" y2="28"
                    :stroke="st.id === 'idle' ? gw.fg : gw.brand"
                    :stroke-opacity="st.id === 'idle' ? 0.25 : 1"
                    stroke-width="1.5" stroke-linecap="round"
                    :stroke-dasharray="st.id === 'linkSource' ? '5 3' : ''" />
                </template>

                <!-- S2: Crisp brand stroke -->
                <template v-else-if="v.id === 'S2'">
                  <line x1="20" y1="28" x2="100" y2="28"
                    :stroke="st.id === 'idle' ? gw.fg : gw.brand"
                    :stroke-opacity="st.id === 'idle' ? 0.25 : 1"
                    :stroke-width="st.id === 'linkTarget' ? 3 : st.id === 'selected' ? 2 : 1.5"
                    stroke-linecap="round"
                    :stroke-dasharray="st.id === 'linkSource' ? '5 3' : ''" />
                </template>

                <!-- S3: Glow on selected + slight thickness -->
                <template v-else-if="v.id === 'S3'">
                  <line v-if="st.id === 'selected' || st.id === 'linkTarget'"
                    x1="20" y1="28" x2="100" y2="28"
                    :stroke="gw.brand" stroke-width="4.5" stroke-opacity="0.4"
                    stroke-linecap="round"
                    :filter="`url(#eglow-${v.id}-${st.id})`" />
                  <line x1="20" y1="28" x2="100" y2="28"
                    :stroke="st.id === 'idle' ? gw.fg : gw.brand"
                    :stroke-opacity="st.id === 'idle' ? 0.25 : 1"
                    :stroke-width="st.id === 'selected' || st.id === 'linkTarget' ? 2 : 1.5"
                    stroke-linecap="round"
                    :stroke-dasharray="st.id === 'linkSource' ? '5 3' : ''" />
                </template>

                <!-- S4: Outline + side-tag chip -->
                <template v-else-if="v.id === 'S4'">
                  <line x1="20" y1="28" x2="100" y2="28"
                    :stroke="st.id === 'idle' ? gw.fg : gw.brand"
                    :stroke-opacity="st.id === 'idle' ? 0.25 : 1"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    :stroke-dasharray="st.id === 'linkSource' || st.id === 'linkTarget' ? '4 3' : ''" />
                  <g v-if="st.id === 'selected'" transform="translate(60, 18)">
                    <circle cx="0" cy="0" r="7" :fill="gw.brand" />
                    <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="700" :fill="gw.base">✓</text>
                  </g>
                  <g v-if="st.id === 'sequence'" transform="translate(60, 18)">
                    <circle cx="0" cy="0" r="7" :fill="gw.brand" />
                    <text x="0" y="3" text-anchor="middle" font-size="9" font-weight="700" :fill="gw.base">·</text>
                  </g>
                </template>
              </svg>
              <span :style="{ fontSize: '10px', color: gw.fgMuted, fontFamily: 'ui-monospace, monospace' }">{{ st.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
