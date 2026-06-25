<script setup lang="ts">
import type { ActivityRow } from '../composables/homeDataCompute'

type Props = {
  rows: ActivityRow[]
  isLoading?: boolean
}
withDefaults(defineProps<Props>(), { isLoading: false })

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const mins = Math.floor((now - then) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yest.'
  return `${days}d`
}

function sideColor(side: ActivityRow['side']): string {
  if (side === 'L') return 'var(--color-g-leg-l)'
  if (side === 'R') return 'var(--color-g-leg-r)'
  return 'var(--color-g-fg)'
}
</script>

<template>
  <section class="flex flex-col gap-2">
    <header class="px-2">
      <h2
        class="font-semibold"
        :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)' }"
      >Recent activity</h2>
    </header>

    <div
      class="flex flex-col gap-1.5 overflow-y-auto"
      style="max-height: 360px;"
    >
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="gw-glass gw-hatch h-10"
          :style="{ borderRadius: 'var(--radius-g-chip)' }"
        />
      </template>

      <template v-else-if="rows.length === 0">
        <div
          class="px-3 py-2 gw-hatch"
          :style="{
            borderRadius: 'var(--radius-g-chip)',
            color: 'var(--color-g-fg-muted)',
            fontSize: 'var(--text-g-body)',
          }"
        >No sessions in the last 7 days.</div>
      </template>

      <template v-else>
        <div
          v-for="r in rows"
          :key="r.id"
          class="gw-glass flex items-center gap-3 px-3 py-2"
          :style="{ borderRadius: 'var(--radius-g-chip)' }"
        >
          <span
            class="flex items-center justify-center w-6 h-6"
            :style="{ color: 'var(--color-g-fg-muted)', fontSize: '15px' }"
          >{{ r.icon ?? '·' }}</span>
          <span
            class="flex-1 truncate"
            :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
          >{{ r.displayName }}</span>
          <span
            :style="{
              fontSize: 'var(--text-g-body)',
              color: sideColor(r.side),
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }"
          ><span v-if="r.side">{{ r.side }} </span>{{ r.score }}</span>
          <span
            :style="{
              fontSize: 'var(--text-g-micro)',
              color: 'var(--color-g-fg-muted)',
              minWidth: '38px',
              textAlign: 'right',
            }"
          >{{ timeAgo(r.at) }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
