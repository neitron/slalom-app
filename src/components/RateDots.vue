<script setup lang="ts">
import { computed } from 'vue'

type Props = {
  rate?: number | null
  rateL?: number | null
  rateR?: number | null
  lr?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  rate: null,
  rateL: null,
  rateR: null,
  lr: false,
  showLabel: true,
  size: 'sm',
})

function colorVar(rate: number | null | undefined): string {
  if (rate == null) return 'var(--rate-none)'
  if (rate >= 4) return 'var(--rate-good)'
  if (rate >= 2.5) return 'var(--rate-mid)'
  return 'var(--rate-bad)'
}

const dotSize = computed(() => (props.size === 'md' ? 'w-2 h-2' : 'w-[5px] h-[5px]'))

type Row = { rate: number | null; label: 'L' | 'R' | null }
const rows = computed<Row[]>(() =>
  props.lr
    ? [
        { rate: props.rateL ?? null, label: 'L' },
        { rate: props.rateR ?? null, label: 'R' },
      ]
    : [{ rate: props.rate ?? null, label: null }],
)

function filled(rate: number | null): number {
  return rate == null ? 0 : Math.round(rate)
}

function sideColor(label: 'L' | 'R' | null): string {
  if (label === 'L') return 'var(--side-l)'
  if (label === 'R') return 'var(--side-r)'
  return ''
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div
      v-for="(row, idx) in rows"
      :key="idx"
      class="flex items-center gap-1"
    >
      <span
        v-if="row.label"
        class="text-[9.5px] font-bold w-2.5 inline-block"
        :style="{ color: sideColor(row.label) }"
      >{{ row.label }}</span>
      <span
        v-for="i in 5"
        :key="i"
        class="inline-block rounded-full"
        :class="dotSize"
        :style="{ background: i <= filled(row.rate) ? colorVar(row.rate) : '#34353f' }"
      />
      <span
        v-if="showLabel"
        class="text-[10.5px] text-muted ml-1"
      >{{ row.rate == null ? 'not rated' : row.rate.toFixed(1) }}</span>
    </div>
  </div>
</template>
