<script setup lang="ts">
import { computed } from 'vue'
import type { Heatmap14Cell } from '../composables/homeDataCompute'

type Props = {
  cells: Heatmap14Cell[]
  sessionsTotal: number
  sessionsDelta: number | null
  streakDays: number
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), { isLoading: false })

const deltaLabel = computed(() => {
  if (props.sessionsDelta == null) return null
  if (props.sessionsDelta > 0) return `↗ +${props.sessionsDelta}`
  if (props.sessionsDelta < 0) return `↘ ${props.sessionsDelta}`
  return '→ 0'
})

const deltaColor = computed(() => {
  if (props.sessionsDelta == null) return 'var(--color-g-fg-muted)'
  if (props.sessionsDelta > 0) return 'var(--color-g-leg-r)'
  if (props.sessionsDelta < 0) return 'var(--color-g-leg-l)'
  return 'var(--color-g-fg-muted)'
})

const cellBg = (level: 0 | 1 | 2 | 3): string => {
  if (level === 0) return 'rgba(255,255,255,0.03)'
  if (level === 1) return 'rgba(181, 168, 255, 0.18)'
  if (level === 2) return 'rgba(181, 168, 255, 0.40)'
  return 'rgba(181, 168, 255, 0.75)'
}
const cellFg = (level: 0 | 1 | 2 | 3): string => {
  if (level === 0) return 'var(--color-g-fg-muted)'
  if (level === 1) return 'var(--color-g-fg)'
  return 'var(--color-g-base)'
}
</script>

<template>
  <section
    class="gw-glass p-4 flex flex-col gap-3"
    :style="{ borderRadius: 'var(--radius-g-panel)' }"
    aria-label="Last 14 days activity"
  >
    <header class="flex items-baseline justify-between px-1">
      <div class="flex items-baseline gap-4">
        <div class="flex flex-col">
          <span
            class="font-semibold"
            :style="{ fontSize: '22px', color: 'var(--color-g-fg)', lineHeight: 1 }"
            data-testid="sessions-total"
          >{{ sessionsTotal }}</span>
          <span
            :style="{ fontSize: '10px', letterSpacing: '0.06em', color: 'var(--color-g-fg-muted)', textTransform: 'uppercase' }"
          >Sessions <span v-if="deltaLabel" :style="{ color: deltaColor, fontWeight: 600 }">{{ deltaLabel }}</span></span>
        </div>
        <div class="flex flex-col">
          <span
            class="font-semibold"
            :style="{ fontSize: '22px', color: 'var(--color-g-fg)', lineHeight: 1 }"
            data-testid="streak-days"
          >{{ streakDays }}</span>
          <span
            :style="{ fontSize: '10px', letterSpacing: '0.06em', color: 'var(--color-g-fg-muted)', textTransform: 'uppercase' }"
          >Day streak</span>
        </div>
      </div>
      <span
        :style="{ fontSize: '11px', color: 'var(--color-g-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }"
      >14 days</span>
    </header>

    <div
      v-if="!isLoading"
      class="grid grid-cols-7 gap-1.5"
    >
      <div
        v-for="c in cells"
        :key="c.dateLocal"
        class="aspect-square flex items-center justify-center text-[11px]"
        :style="{
          background: cellBg(c.level),
          color: cellFg(c.level),
          borderRadius: 'var(--radius-g-micro)',
          fontWeight: c.level >= 2 ? 600 : 400,
          border: c.isToday ? '1.5px solid var(--color-g-brand)' : '1.5px solid transparent',
        }"
        :aria-label="`${c.dateLocal}: ${c.count} sessions`"
      >{{ c.dayOfMonth }}</div>
    </div>
    <div v-else class="grid grid-cols-7 gap-1.5">
      <div
        v-for="i in 14"
        :key="i"
        class="aspect-square gw-hatch"
        :style="{ borderRadius: 'var(--radius-g-micro)' }"
      />
    </div>

    <div class="flex items-center gap-1.5 justify-end px-1">
      <span :style="{ fontSize: '10px', color: 'var(--color-g-fg-muted)' }">less</span>
      <span class="w-3 h-3" :style="{ background: cellBg(0), borderRadius: '3px' }" />
      <span class="w-3 h-3" :style="{ background: cellBg(1), borderRadius: '3px' }" />
      <span class="w-3 h-3" :style="{ background: cellBg(2), borderRadius: '3px' }" />
      <span class="w-3 h-3" :style="{ background: cellBg(3), borderRadius: '3px' }" />
      <span :style="{ fontSize: '10px', color: 'var(--color-g-fg-muted)' }">more</span>
    </div>
  </section>
</template>
