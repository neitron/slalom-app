<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A' | 'B' | 'C'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'A', title: 'Apple Watch arcs (smooth)', desc: 'Concentric rings with smooth filled arcs. Bold, kinetic, instrument-feel.' },
  { id: 'B', title: 'LED dashed segments', desc: '5 dashed arcs around the circle. Lit/ghost in leg color with halo.' },
  { id: 'C', title: 'LED dot ring', desc: '5 dots around the circle at 72° positions. Pure LED idiom.' },
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
  { name: 'Snake (lr)', icon: '🐍', lr: true, rate: null, rateL: 4, rateR: 2 },
  { name: 'Sun (lr)', icon: '☀️', lr: true, rate: null, rateL: 5, rateR: 5 },
  { name: 'Cobra', icon: '🟪', lr: false, rate: 5, rateL: null, rateR: null },
  { name: 'New', icon: '✨', lr: false, rate: null, rateL: null, rateR: null },
]

// SVG geometry helpers
const ARC_R_OUTER = 22
const ARC_R_INNER = 16
const ARC_STROKE = 4
const DOT_CLOCK_RADIUS_OUTER = 22
const DOT_CLOCK_RADIUS_INNER = 16

// Pre-compute 5 clock positions (in degrees from 12 o'clock, clockwise)
const CLOCK_DEG = [0, 72, 144, 216, 288]
function clockPos(rDeg: number, radius: number): { x: number; y: number } {
  const rad = (rDeg - 90) * Math.PI / 180 // -90 to start at 12
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius }
}

function arcPath(radius: number, fraction: number): string {
  // Returns SVG path for an arc starting at 12 o'clock, going clockwise, covering `fraction` of the circle.
  if (fraction <= 0) return ''
  const angle = Math.min(fraction, 0.9999) * 2 * Math.PI
  const startX = 0
  const startY = -radius
  const endX = Math.sin(angle) * radius
  const endY = -Math.cos(angle) * radius
  const largeArc = angle > Math.PI ? 1 : 0
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`
}

function rateFraction(rate: number | null): number {
  if (rate == null) return 0
  return Math.max(0, Math.min(1, rate / 5))
}
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Node options
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Three rate-bar treatments for graph nodes. Name lives outside the circle.
    </p>

    <section
      v-for="v in variants"
      :key="v.id"
      class="gw-glass p-4 flex flex-col gap-4"
      :style="{ borderRadius: gw.radius.panel + 'px' }"
    >
      <header class="flex items-baseline gap-3">
        <span
          :style="{
            fontSize: gw.type.h2 + 'px',
            fontWeight: 700,
            color: gw.brand,
          }"
        >Option {{ v.id }}</span>
        <span :style="{ fontSize: gw.type.body + 'px' }">{{ v.title }}</span>
      </header>
      <p :style="{ color: gw.fgMuted, fontSize: gw.type.micro + 'px' }">{{ v.desc }}</p>

      <div class="flex flex-wrap gap-6">
        <div
          v-for="(s, idx) in samples"
          :key="idx"
          class="flex flex-col items-center gap-1"
          style="width: 84px;"
        >
          <svg width="64" height="64" viewBox="-32 -32 64 64">
            <!-- Variant A: Apple Watch arcs -->
            <template v-if="v.id === 'A'">
              <template v-if="s.lr">
                <!-- Outer ring L -->
                <circle
                  :r="ARC_R_OUTER"
                  cx="0"
                  cy="0"
                  fill="none"
                  :stroke="gw.leg.l"
                  stroke-opacity="0.15"
                  :stroke-width="ARC_STROKE"
                />
                <path
                  :d="arcPath(ARC_R_OUTER, rateFraction(s.rateL))"
                  fill="none"
                  :stroke="gw.leg.l"
                  :stroke-width="ARC_STROKE"
                  stroke-linecap="round"
                />
                <!-- Inner ring R -->
                <circle
                  :r="ARC_R_INNER"
                  cx="0"
                  cy="0"
                  fill="none"
                  :stroke="gw.leg.r"
                  stroke-opacity="0.15"
                  :stroke-width="ARC_STROKE"
                />
                <path
                  :d="arcPath(ARC_R_INNER, rateFraction(s.rateR))"
                  fill="none"
                  :stroke="gw.leg.r"
                  :stroke-width="ARC_STROKE"
                  stroke-linecap="round"
                />
              </template>
              <template v-else>
                <circle
                  :r="ARC_R_OUTER"
                  cx="0"
                  cy="0"
                  fill="none"
                  :stroke="gw.fg"
                  stroke-opacity="0.15"
                  :stroke-width="ARC_STROKE"
                />
                <path
                  :d="arcPath(ARC_R_OUTER, rateFraction(s.rate))"
                  fill="none"
                  :stroke="gw.fg"
                  :stroke-width="ARC_STROKE"
                  stroke-linecap="round"
                />
              </template>
              <!-- Glyph in center -->
              <text
                text-anchor="middle"
                dominant-baseline="central"
                :style="{ fontSize: '14px' }"
              >{{ s.icon }}</text>
            </template>

            <!-- Variant B: LED dashed segments -->
            <template v-else-if="v.id === 'B'">
              <template v-if="s.lr">
                <!-- Outer ring L segments -->
                <template v-for="(deg, i) in CLOCK_DEG" :key="'lout' + i">
                  <path
                    :d="arcPath(ARC_R_OUTER, 0.10)"
                    :transform="`rotate(${deg})`"
                    fill="none"
                    :stroke="gw.leg.l"
                    :stroke-width="3"
                    stroke-linecap="round"
                    :stroke-opacity="i < (s.rateL ?? 0) ? 1 : 0.1"
                  />
                </template>
                <!-- Inner ring R segments -->
                <template v-for="(deg, i) in CLOCK_DEG" :key="'rin' + i">
                  <path
                    :d="arcPath(ARC_R_INNER, 0.10)"
                    :transform="`rotate(${deg})`"
                    fill="none"
                    :stroke="gw.leg.r"
                    :stroke-width="3"
                    stroke-linecap="round"
                    :stroke-opacity="i < (s.rateR ?? 0) ? 1 : 0.1"
                  />
                </template>
              </template>
              <template v-else>
                <template v-for="(deg, i) in CLOCK_DEG" :key="'sn' + i">
                  <path
                    :d="arcPath(ARC_R_OUTER, 0.10)"
                    :transform="`rotate(${deg})`"
                    fill="none"
                    :stroke="gw.fg"
                    :stroke-width="3"
                    stroke-linecap="round"
                    :stroke-opacity="i < (s.rate ?? 0) ? 1 : 0.1"
                  />
                </template>
              </template>
              <!-- Glyph in center -->
              <text
                text-anchor="middle"
                dominant-baseline="central"
                :style="{ fontSize: '14px' }"
              >{{ s.icon }}</text>
            </template>

            <!-- Variant C: LED dot ring -->
            <template v-else-if="v.id === 'C'">
              <template v-if="s.lr">
                <!-- Outer dots L -->
                <template v-for="(deg, i) in CLOCK_DEG" :key="'doutL' + i">
                  <circle
                    :cx="clockPos(deg, DOT_CLOCK_RADIUS_OUTER).x"
                    :cy="clockPos(deg, DOT_CLOCK_RADIUS_OUTER).y"
                    r="2.5"
                    :fill="gw.leg.l"
                    :opacity="i < (s.rateL ?? 0) ? 1 : 0.1"
                  />
                </template>
                <!-- Inner dots R -->
                <template v-for="(deg, i) in CLOCK_DEG" :key="'dinR' + i">
                  <circle
                    :cx="clockPos(deg, DOT_CLOCK_RADIUS_INNER).x"
                    :cy="clockPos(deg, DOT_CLOCK_RADIUS_INNER).y"
                    r="2.5"
                    :fill="gw.leg.r"
                    :opacity="i < (s.rateR ?? 0) ? 1 : 0.1"
                  />
                </template>
              </template>
              <template v-else>
                <template v-for="(deg, i) in CLOCK_DEG" :key="'dsn' + i">
                  <circle
                    :cx="clockPos(deg, DOT_CLOCK_RADIUS_OUTER).x"
                    :cy="clockPos(deg, DOT_CLOCK_RADIUS_OUTER).y"
                    r="2.5"
                    :fill="gw.fg"
                    :opacity="i < (s.rate ?? 0) ? 1 : 0.1"
                  />
                </template>
              </template>
              <!-- Glyph in center -->
              <text
                text-anchor="middle"
                dominant-baseline="central"
                :style="{ fontSize: '14px' }"
              >{{ s.icon }}</text>
            </template>
          </svg>
          <span
            :style="{
              fontSize: '11px',
              color: gw.fg,
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: '1.2',
            }"
          >{{ s.name }}</span>
          <span
            :style="{
              fontSize: '9px',
              color: gw.fgMuted,
              fontFamily: 'ui-monospace, monospace',
            }"
          >{{ s.lr ? `L${s.rateL ?? '—'} R${s.rateR ?? '—'}` : `r=${s.rate ?? '—'}` }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
