<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A' | 'B' | 'C' | 'D' | 'E'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'A', title: 'Leg-colored full edge', desc: 'Entire stroke is leg color (L=peach, R=teal, null=fg).' },
  { id: 'B', title: 'Gradient: from-side → to-side', desc: 'Stroke fades from FROM-leg color to TO-leg color.' },
  { id: 'C', title: 'Midpoint badge', desc: 'Neutral edge + small "L"/"R"/"•" pill at the midpoint.' },
  { id: 'D', title: 'Endpoint dots', desc: 'Neutral edge + colored anchor dot at each endpoint.' },
  { id: 'E', title: 'Dashed per side', desc: 'Solid leg-colored for L/R; dashed for null/both.' },
]

type Side = 'L' | 'R' | null

interface EdgeSample {
  fromSide: Side
  toSide: Side
  label: string
}

const samples: EdgeSample[] = [
  { fromSide: 'L', toSide: 'L', label: 'L→L' },
  { fromSide: 'R', toSide: 'R', label: 'R→R' },
  { fromSide: 'L', toSide: 'R', label: 'L→R' },
  { fromSide: 'R', toSide: 'L', label: 'R→L' },
  { fromSide: null, toSide: null, label: '? → ?' },
  { fromSide: 'L', toSide: null, label: 'L → ?' },
]

function sideColor(side: Side): string {
  if (side === 'L') return gw.leg.l
  if (side === 'R') return gw.leg.r
  return gw.fg
}

function sideLabel(side: Side): string {
  if (side === 'L') return 'L'
  if (side === 'R') return 'R'
  return '•'
}

// Geometry — two mock nodes per sample, horizontal layout
const NODE_R = 16
const SAMPLE_W = 180
const SAMPLE_H = 64
const NODE_LEFT_X = 28
const NODE_RIGHT_X = SAMPLE_W - 28
const NODE_Y = SAMPLE_H / 2

const midX = (NODE_LEFT_X + NODE_RIGHT_X) / 2
const midY = NODE_Y
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Edge options
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Five styles for transitions (edges) indicating which leg they connect.
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

      <div class="flex flex-wrap gap-4">
        <div
          v-for="(s, idx) in samples"
          :key="idx"
          class="flex flex-col items-center gap-1"
        >
          <svg
            :width="SAMPLE_W"
            :height="SAMPLE_H"
            :viewBox="`0 0 ${SAMPLE_W} ${SAMPLE_H}`"
            :style="{ background: 'rgba(255,255,255,0.03)', borderRadius: gw.radius.chip + 'px' }"
          >
            <defs v-if="v.id === 'B'">
              <linearGradient :id="`grad-${v.id}-${idx}`" :x1="NODE_LEFT_X" :y1="NODE_Y" :x2="NODE_RIGHT_X" :y2="NODE_Y" gradientUnits="userSpaceOnUse">
                <stop offset="0%" :stop-color="sideColor(s.fromSide)" />
                <stop offset="100%" :stop-color="sideColor(s.toSide)" />
              </linearGradient>
            </defs>

            <!-- Mock nodes -->
            <circle :cx="NODE_LEFT_X" :cy="NODE_Y" :r="NODE_R" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />
            <circle :cx="NODE_RIGHT_X" :cy="NODE_Y" :r="NODE_R" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="1" />

            <!-- Variant-specific edge -->
            <template v-if="v.id === 'A'">
              <!-- Single leg color (use the FROM side as the dominant color) -->
              <line
                :x1="NODE_LEFT_X + NODE_R"
                :y1="NODE_Y"
                :x2="NODE_RIGHT_X - NODE_R"
                :y2="NODE_Y"
                :stroke="sideColor(s.fromSide)"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </template>

            <template v-else-if="v.id === 'B'">
              <line
                :x1="NODE_LEFT_X + NODE_R"
                :y1="NODE_Y"
                :x2="NODE_RIGHT_X - NODE_R"
                :y2="NODE_Y"
                :stroke="`url(#grad-${v.id}-${idx})`"
                stroke-width="2"
                stroke-linecap="round"
              />
            </template>

            <template v-else-if="v.id === 'C'">
              <line
                :x1="NODE_LEFT_X + NODE_R"
                :y1="NODE_Y"
                :x2="NODE_RIGHT_X - NODE_R"
                :y2="NODE_Y"
                :stroke="gw.fg"
                stroke-opacity="0.25"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <!-- Badge: from-side -->
              <g :transform="`translate(${midX - 16}, ${midY})`">
                <rect x="-9" y="-7" width="18" height="14" rx="7" ry="7" fill="rgba(255,255,255,0.10)" :stroke="sideColor(s.fromSide)" stroke-width="1" />
                <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="700" :fill="sideColor(s.fromSide)">{{ sideLabel(s.fromSide) }}</text>
              </g>
              <g :transform="`translate(${midX + 16}, ${midY})`">
                <rect x="-9" y="-7" width="18" height="14" rx="7" ry="7" fill="rgba(255,255,255,0.10)" :stroke="sideColor(s.toSide)" stroke-width="1" />
                <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="700" :fill="sideColor(s.toSide)">{{ sideLabel(s.toSide) }}</text>
              </g>
            </template>

            <template v-else-if="v.id === 'D'">
              <line
                :x1="NODE_LEFT_X + NODE_R"
                :y1="NODE_Y"
                :x2="NODE_RIGHT_X - NODE_R"
                :y2="NODE_Y"
                :stroke="gw.fg"
                stroke-opacity="0.25"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <!-- Endpoint dots -->
              <circle :cx="NODE_LEFT_X + NODE_R + 4" :cy="NODE_Y" r="3" :fill="sideColor(s.fromSide)" />
              <circle :cx="NODE_RIGHT_X - NODE_R - 4" :cy="NODE_Y" r="3" :fill="sideColor(s.toSide)" />
            </template>

            <template v-else-if="v.id === 'E'">
              <!-- Dashed for null edges, solid for L/R -->
              <line
                :x1="NODE_LEFT_X + NODE_R"
                :y1="NODE_Y"
                :x2="NODE_RIGHT_X - NODE_R"
                :y2="NODE_Y"
                :stroke="sideColor(s.fromSide)"
                stroke-width="1.5"
                stroke-linecap="round"
                :stroke-dasharray="s.fromSide == null ? '6 4' : ''"
              />
            </template>
          </svg>
          <span :style="{ fontSize: '10px', color: gw.fgMuted, fontFamily: 'ui-monospace, monospace' }">{{ s.label }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
