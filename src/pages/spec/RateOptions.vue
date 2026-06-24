<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'D', title: 'Hero numeral', desc: 'Rate as a bold number in a leg-tinted glass pill. Number is the brand.' },
  { id: 'E', title: 'Apple-Watch radial arc', desc: 'A small ring fills around the circle. Kinetic, iOS-native.' },
  { id: 'F', title: 'Tally / slash marks', desc: '1–5 diagonal slashes in leg color. Skate-tag energy.' },
  { id: 'G', title: 'Dots filled with leg color', desc: '5 dots, count = rate, fill = leg hue. No separate rate-hue.' },
  { id: 'H', title: 'Bare leg dots (no border)', desc: 'Like F coloring, in dots. Rated = bright leg color; unrated = same color at 0.30 opacity.' },
  { id: 'I', title: 'Blurred ghost dots', desc: 'Same as H but unrated dots are heavily blurred — "ghost" steps you haven\'t reached.' },
  { id: 'A', title: '(rejected) 5-dot strip, leg ring + density fill', desc: 'Original Option A — for reference.' },
  { id: 'B', title: '(rejected) Single ordinal chip', desc: 'Original Option B — for reference.' },
  { id: 'C', title: '(rejected) Weighted vertical bars', desc: 'Original Option C — for reference.' },
]

const sampleRates: (number | null)[] = [null, 1, 2, 3, 4, 5]

const legs: { key: 'none' | 'l' | 'r' | 'both'; label: string; tint: string }[] = [
  { key: 'none', label: 'No leg', tint: gw.fg },
  { key: 'l',    label: 'L',      tint: gw.leg.l },
  { key: 'r',    label: 'R',      tint: gw.leg.r },
  { key: 'both', label: 'Both',   tint: gw.leg.both },
]

function rateBucket(rate: number | null): 'none' | 'bad' | 'mid' | 'good' {
  if (rate == null) return 'none'
  if (rate < 2.5) return 'bad'
  if (rate < 4) return 'mid'
  return 'good'
}

function rateFillColor(rate: number | null): string {
  const b = rateBucket(rate)
  if (b === 'none') return gw.rate.none
  if (b === 'bad') return gw.rate.bad
  if (b === 'mid') return gw.rate.mid
  return gw.rate.good
}

// For Option E (radial arc) — SVG arc geometry.
const arcRadius = 9
const arcCircumference = 2 * Math.PI * arcRadius
function arcDashOffset(rate: number | null): number {
  if (rate == null) return arcCircumference
  return arcCircumference * (1 - Math.min(rate, 5) / 5)
}
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Rate options · v2
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Four new patterns (D–G). The three rejected ones (A/B/C) are kept at the bottom for reference.
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

      <div class="flex flex-col gap-2">
        <div
          v-for="leg in legs"
          :key="leg.key"
          class="flex items-center gap-3"
        >
          <span
            :style="{
              fontSize: gw.type.micro + 'px',
              width: '52px',
              color: leg.tint,
              fontWeight: 600,
            }"
          >{{ leg.label }}</span>
          <div class="flex items-center gap-3">
            <div v-for="r in sampleRates" :key="String(r)" class="flex flex-col items-center gap-1">
              <!-- Option D: Hero numeral -->
              <template v-if="v.id === 'D'">
                <span
                  :style="{
                    minWidth: '48px',
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '999px',
                    fontSize: '20px',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                    color: r == null ? gw.fgMuted : leg.tint,
                    background: r == null ? 'transparent' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${r == null ? gw.fgMuted : leg.tint}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }"
                >{{ r == null ? '—' : r.toFixed(1) }}</span>
              </template>

              <!-- Option E: Apple-Watch radial arc -->
              <template v-else-if="v.id === 'E'">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <!-- track -->
                  <circle
                    cx="12"
                    cy="12"
                    :r="arcRadius"
                    fill="none"
                    :stroke="leg.tint"
                    stroke-opacity="0.2"
                    stroke-width="3"
                  />
                  <!-- fill -->
                  <circle
                    v-if="r != null"
                    cx="12"
                    cy="12"
                    :r="arcRadius"
                    fill="none"
                    :stroke="leg.tint"
                    stroke-width="3"
                    :stroke-dasharray="arcCircumference"
                    :stroke-dashoffset="arcDashOffset(r)"
                    stroke-linecap="round"
                    transform="rotate(-90 12 12)"
                  />
                </svg>
              </template>

              <!-- Option F: Tally / slash marks -->
              <template v-else-if="v.id === 'F'">
                <div class="flex items-center" style="gap: 3px; height: 18px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '2.5px',
                      height: '14px',
                      background: r != null && i <= Math.round(r) ? leg.tint : 'transparent',
                      border: r != null && i <= Math.round(r) ? 'none' : `1px solid ${leg.tint}`,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.4,
                      transform: 'skewX(-20deg)',
                      borderRadius: '1px',
                      boxSizing: 'border-box',
                    }"
                  />
                </div>
              </template>

              <!-- Option G: Dots filled with leg color -->
              <template v-else-if="v.id === 'G'">
                <div class="flex" style="gap: 4px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: r != null && i <= Math.round(r) ? leg.tint : 'transparent',
                      border: `1.5px solid ${leg.tint}`,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.35,
                      boxSizing: 'border-box',
                    }"
                  />
                </div>
              </template>

              <!-- Option H: Bare leg dots, no border -->
              <template v-else-if="v.id === 'H'">
                <div class="flex" style="gap: 4px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: leg.tint,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.30,
                    }"
                  />
                </div>
              </template>

              <!-- Option I: Blurred ghost dots -->
              <template v-else-if="v.id === 'I'">
                <div class="flex" style="gap: 4px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: leg.tint,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.45,
                      filter: r != null && i <= Math.round(r) ? 'none' : 'blur(2px)',
                    }"
                  />
                </div>
              </template>

              <!-- Option A: original 5-dot strip with density fill (rejected, for reference) -->
              <template v-else-if="v.id === 'A'">
                <div class="flex gap-[3px]">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: r != null && i <= Math.round(r) ? rateFillColor(r) : 'transparent',
                      border: `1px solid ${leg.tint}`,
                      boxSizing: 'border-box',
                    }"
                  />
                </div>
              </template>

              <!-- Option B: single ordinal chip (rejected) -->
              <template v-else-if="v.id === 'B'">
                <span
                  :style="{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: r == null ? gw.fgMuted : gw.base,
                    background: r == null ? 'transparent' : rateFillColor(r),
                    border: `1px solid ${leg.tint}`,
                    minWidth: '36px',
                    textAlign: 'center',
                    display: 'inline-block',
                  }"
                >{{ r == null ? '—' : (rateBucket(r) === 'bad' ? 'Bad' : rateBucket(r) === 'mid' ? 'Mid' : 'Good') }}</span>
              </template>

              <!-- Option C: weighted vertical bars (rejected) -->
              <template v-else-if="v.id === 'C'">
                <div class="flex items-end gap-[2px]" style="height: 16px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '3px',
                      height: (4 + i * 2.5) + 'px',
                      borderRadius: '1px',
                      background: r != null && i <= Math.round(r) ? rateFillColor(r) : 'transparent',
                      border: `1px solid ${leg.tint}`,
                      boxSizing: 'border-box',
                    }"
                  />
                </div>
              </template>

              <span :style="{ fontSize: '9px', color: gw.fgMuted, fontFamily: 'ui-monospace, monospace' }">
                {{ r == null ? '—' : r }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
