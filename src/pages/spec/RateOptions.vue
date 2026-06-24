<script setup lang="ts">
import { gw } from '../../design/tokens'

type Variant = 'A' | 'B' | 'C'

const variants: { id: Variant; title: string; desc: string }[] = [
  { id: 'A', title: '5-dot strip (ordinal density)', desc: 'Familiar shape; dots fill left-to-right by rate. Off-hue density.' },
  { id: 'B', title: 'Single ordinal chip', desc: 'One labeled pill per leg ("Bad" / "Mid" / "Good"). Larger, glanceable.' },
  { id: 'C', title: 'Weighted vertical bars', desc: '1–5 vertical bars of growing height/weight.' },
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
</script>

<template>
  <div
    class="gw-aurora-bg-sm min-h-screen px-4 py-6 flex flex-col gap-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Rate options
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px' }">
      Three patterns for RateDots. Pick one. Leg color tints stay in all three.
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
              <!-- Option A: 5-dot strip -->
              <template v-if="v.id === 'A'">
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
              <!-- Option B: Single ordinal chip -->
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
              <!-- Option C: Weighted vertical bars -->
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
