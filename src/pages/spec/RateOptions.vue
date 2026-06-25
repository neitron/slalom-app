<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'Q', title: 'Soft LED dots (3px core)', desc: 'Thinner. Halo opacity 0.3, blur 2.5px, color-dodge. Unlit opacity 0.08.' },
  { id: 'R', title: 'Whisper dots (2px, no color-dodge)', desc: 'Even thinner. Normal blend mode for a quieter halo.' },
  { id: 'S', title: 'Hairline slashes (1.5px wide)', desc: 'F slashes, much thinner, soft glow.' },
  { id: 'T', title: 'Thin LED bar (2px segments)', desc: 'Slimmer N. Battery indicator at a smaller scale.' },
  { id: 'L', title: '(prev) LED dots 4px', desc: 'Stronger version.' },
  { id: 'M', title: '(prev) LED slashes 2.5px', desc: 'Stronger version.' },
  { id: 'N', title: '(prev) LED segment bar 3px', desc: 'Stronger version.' },
  { id: 'O', title: '(prev) LED constellation', desc: 'For reference.' },
  { id: 'P', title: '(prev) LED liquid stripe', desc: 'For reference.' },
  { id: 'J', title: '(prev) Liquid stripe (no glow)', desc: 'For reference.' },
  { id: 'K', title: '(prev) Constellation (no LED)', desc: 'For reference.' },
  { id: 'F', title: '(prev) Slashes', desc: 'For reference.' },
  { id: 'H', title: '(prev) Bare leg dots', desc: 'For reference.' },
  { id: 'I', title: '(prev) Blurred ghost dots', desc: 'For reference.' },
  { id: 'G', title: '(prev) Dots with border', desc: 'For reference.' },
  { id: 'D', title: '(prev) Hero numeral', desc: 'For reference.' },
  { id: 'E', title: '(prev) Radial arc', desc: 'For reference.' },
  { id: 'A', title: '(rejected) leg ring + density fill', desc: 'For reference.' },
  { id: 'B', title: '(rejected) Single ordinal chip', desc: 'For reference.' },
  { id: 'C', title: '(rejected) Weighted vertical bars', desc: 'For reference.' },
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
              <!-- Option Q: Soft LED dots, 3px core -->
              <template v-if="v.id === 'Q'">
                <div class="flex" style="gap: 5px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 1,
                      }"
                    >
                      <div
                        :style="{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: leg.tint,
                          opacity: 0.3,
                          filter: 'blur(2.5px)',
                          mixBlendMode: 'color-dodge',
                          position: 'relative',
                          top: '-1px',
                          left: '-1px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 0.08,
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option R: Whisper dots, 2px no color-dodge -->
              <template v-else-if="v.id === 'R'">
                <div class="flex" style="gap: 4px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '2px',
                        height: '2px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 1,
                      }"
                    >
                      <div
                        :style="{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: leg.tint,
                          opacity: 0.4,
                          filter: 'blur(2px)',
                          position: 'relative',
                          top: '-1px',
                          left: '-1px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '2px',
                        height: '2px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 0.12,
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option S: Hairline slashes -->
              <template v-else-if="v.id === 'S'">
                <div class="flex items-center" style="gap: 4px; height: 16px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '1.5px',
                        height: '12px',
                        background: leg.tint,
                        opacity: 1,
                        transform: 'skewX(-20deg)',
                        borderRadius: '1px',
                        position: 'relative',
                      }"
                    >
                      <div
                        :style="{
                          position: 'absolute',
                          width: '6px',
                          height: '16px',
                          left: '-2.25px',
                          top: '-2px',
                          background: leg.tint,
                          opacity: 0.3,
                          filter: 'blur(3px)',
                          mixBlendMode: 'color-dodge',
                          borderRadius: '4px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '1.5px',
                        height: '12px',
                        background: leg.tint,
                        opacity: 0.1,
                        transform: 'skewX(-20deg)',
                        borderRadius: '1px',
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option T: Thin LED segment bar -->
              <template v-else-if="v.id === 'T'">
                <div class="flex items-center" style="gap: 2px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '8px',
                        height: '2px',
                        borderRadius: '999px',
                        background: leg.tint,
                        opacity: 1,
                        position: 'relative',
                      }"
                    >
                      <div
                        :style="{
                          position: 'absolute',
                          width: '10px',
                          height: '4px',
                          left: '-1px',
                          top: '-1px',
                          background: leg.tint,
                          opacity: 0.3,
                          filter: 'blur(2.5px)',
                          mixBlendMode: 'color-dodge',
                          borderRadius: '999px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '8px',
                        height: '2px',
                        borderRadius: '999px',
                        background: leg.tint,
                        opacity: 0.1,
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option L: LED dots (user's recipe baseline) -->
              <template v-else-if="v.id === 'L'">
                <div class="flex" style="gap: 5px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 1,
                      }"
                    >
                      <div
                        :style="{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: leg.tint,
                          opacity: 0.5,
                          filter: 'blur(3px)',
                          mixBlendMode: 'color-dodge',
                          position: 'relative',
                          top: '-1px',
                          left: '-1px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 0.1,
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option M: LED slashes -->
              <template v-else-if="v.id === 'M'">
                <div class="flex items-center" style="gap: 3px; height: 18px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '2.5px',
                        height: '14px',
                        background: leg.tint,
                        opacity: 1,
                        transform: 'skewX(-20deg)',
                        borderRadius: '1px',
                        position: 'relative',
                      }"
                    >
                      <div
                        :style="{
                          position: 'absolute',
                          width: '8px',
                          height: '20px',
                          left: '-3px',
                          top: '-3px',
                          background: leg.tint,
                          opacity: 0.5,
                          filter: 'blur(4px)',
                          mixBlendMode: 'color-dodge',
                          borderRadius: '4px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '2.5px',
                        height: '14px',
                        background: leg.tint,
                        opacity: 0.1,
                        transform: 'skewX(-20deg)',
                        borderRadius: '1px',
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option N: LED segment bar -->
              <template v-else-if="v.id === 'N'">
                <div class="flex items-center" style="gap: 2px;">
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        width: '9px',
                        height: '3px',
                        borderRadius: '999px',
                        background: leg.tint,
                        opacity: 1,
                        position: 'relative',
                      }"
                    >
                      <div
                        :style="{
                          position: 'absolute',
                          width: '11px',
                          height: '5px',
                          left: '-1px',
                          top: '-1px',
                          background: leg.tint,
                          opacity: 0.5,
                          filter: 'blur(3px)',
                          mixBlendMode: 'color-dodge',
                          borderRadius: '999px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        width: '9px',
                        height: '3px',
                        borderRadius: '999px',
                        background: leg.tint,
                        opacity: 0.1,
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option O: LED constellation -->
              <template v-else-if="v.id === 'O'">
                <div
                  style="width: 38px; height: 24px; position: relative;"
                >
                  <template v-for="i in 5" :key="i">
                    <div
                      v-if="r != null && i <= Math.round(r)"
                      :style="{
                        position: 'absolute',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 1,
                        left: [4, 14, 26, 18, 32][i - 1] + 'px',
                        top: [12, 4, 8, 16, 18][i - 1] + 'px',
                      }"
                    >
                      <div
                        :style="{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: leg.tint,
                          opacity: 0.5,
                          filter: 'blur(3px)',
                          mixBlendMode: 'color-dodge',
                          position: 'relative',
                          top: '-1px',
                          left: '-1px',
                        }"
                      />
                    </div>
                    <span
                      v-else
                      :style="{
                        position: 'absolute',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: leg.tint,
                        opacity: 0.1,
                        left: [4, 14, 26, 18, 32][i - 1] + 'px',
                        top: [12, 4, 8, 16, 18][i - 1] + 'px',
                      }"
                    />
                  </template>
                </div>
              </template>

              <!-- Option P: LED liquid stripe -->
              <template v-else-if="v.id === 'P'">
                <div
                  :style="{
                    width: '64px',
                    height: '8px',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: `${leg.tint}10`,
                  }"
                >
                  <div
                    v-if="r != null"
                    :style="{
                      position: 'absolute',
                      inset: '0',
                      width: `${(Math.min(r, 5) / 5) * 100}%`,
                      background: leg.tint,
                      opacity: 1,
                    }"
                  />
                  <div
                    v-if="r != null && r > 0"
                    :style="{
                      position: 'absolute',
                      top: '-4px',
                      bottom: '-4px',
                      left: `calc(${(Math.min(r, 5) / 5) * 100}% - 8px)`,
                      width: '16px',
                      background: leg.tint,
                      opacity: 0.6,
                      filter: 'blur(5px)',
                      mixBlendMode: 'color-dodge',
                      borderRadius: '999px',
                    }"
                  />
                </div>
              </template>

              <!-- Option J: Liquid stripe -->
              <template v-else-if="v.id === 'J'">
                <div
                  :style="{
                    width: '64px',
                    height: '10px',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    position: 'relative',
                    background: `${leg.tint}15`,
                  }"
                >
                  <div
                    :style="{
                      position: 'absolute',
                      inset: '0',
                      width: r != null ? `${(Math.min(r, 5) / 5) * 100}%` : '0%',
                      background: `linear-gradient(to bottom, ${leg.tint}, ${leg.tint}cc)`,
                      borderRadius: '999px',
                    }"
                  />
                  <div
                    v-if="r != null && r < 5"
                    :style="{
                      position: 'absolute',
                      top: '0',
                      bottom: '0',
                      left: `${(Math.min(r, 5) / 5) * 100}%`,
                      right: '0',
                      background: `${leg.tint}33`,
                      filter: 'blur(3px)',
                    }"
                  />
                </div>
              </template>

              <!-- Option K: Constellation cluster -->
              <template v-else-if="v.id === 'K'">
                <div
                  style="
                    width: 38px;
                    height: 24px;
                    position: relative;
                  "
                >
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      position: 'absolute',
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: leg.tint,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.25,
                      boxShadow: r != null && i <= Math.round(r) ? `0 0 6px ${leg.tint}80` : 'none',
                      left: [4, 14, 26, 18, 32][i - 1] + 'px',
                      top: [12, 4, 8, 16, 18][i - 1] + 'px',
                    }"
                  />
                </div>
              </template>

              <!-- Option D: Hero numeral -->
              <template v-else-if="v.id === 'D'">
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
                <div class="flex" style="gap: 3px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '6px',
                      height: '6px',
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
                <div class="flex" style="gap: 3px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: leg.tint,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.30,
                    }"
                  />
                </div>
              </template>

              <!-- Option I: Blurred ghost dots -->
              <template v-else-if="v.id === 'I'">
                <div class="flex" style="gap: 3px;">
                  <span
                    v-for="i in 5"
                    :key="i"
                    :style="{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: leg.tint,
                      opacity: r != null && i <= Math.round(r) ? 1 : 0.45,
                      filter: r != null && i <= Math.round(r) ? 'none' : 'blur(5px)',
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
