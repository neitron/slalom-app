<script setup lang="ts">
import RateDots from './RateDots.vue'
import { nextCycleScore } from '../composables/homeDataCompute'
import { useTricksStore } from '../stores/tricks'
import type { Trick } from '../domain/types'

type Props = {
  tricks: Trick[]
  totalCount: number
  isLoading?: boolean
}
withDefaults(defineProps<Props>(), { isLoading: false })

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'see-all'): void
}>()

const tricksStore = useTricksStore()

function iconFor(t: Trick): string {
  if (t.icon) return t.icon
  return t.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase()
}

function cycle(t: Trick, event: Event) {
  event.stopPropagation()
  if (!t.id) return
  const side: 'L' | null = t.lr ? 'L' : null
  const currentRate = t.lr ? t.rateL : t.rate
  const next = nextCycleScore(currentRate)
  void tricksStore.report(t.id, side, next)
}

function openSheet(t: Trick) {
  if (t.id) emit('open', t.id)
}
</script>

<template>
  <section class="flex flex-col gap-2">
    <header class="flex items-center justify-between px-2">
      <h2
        class="font-semibold"
        :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)' }"
      >
        Working on <span :style="{ color: 'var(--color-g-fg-muted)', fontWeight: 400, fontSize: 'var(--text-g-body)' }">· {{ totalCount }}</span>
      </h2>
      <button
        v-if="totalCount > tricks.length"
        type="button"
        class="active:opacity-60"
        :style="{ color: 'var(--color-g-brand)', fontSize: 'var(--text-g-body)' }"
        @click="emit('see-all')"
      >See all ›</button>
    </header>

    <template v-if="isLoading">
      <div
        v-for="i in 3"
        :key="i"
        class="gw-glass gw-hatch h-12"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
      />
    </template>

    <template v-else-if="tricks.length === 0">
      <div
        class="px-3 py-2 gw-hatch"
        :style="{
          borderRadius: 'var(--radius-g-chip)',
          color: 'var(--color-g-fg-muted)',
          fontSize: 'var(--text-g-body)',
        }"
      >Nothing in progress — rate something to start.</div>
    </template>

    <template v-else>
      <button
        v-for="t in tricks"
        :key="t.id"
        type="button"
        class="gw-glass flex items-center gap-3 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
        @click="openSheet(t)"
      >
        <span
          class="flex items-center justify-center font-semibold w-7 h-7"
          :style="{
            color: 'var(--color-g-fg)',
            fontSize: t.icon ? '18px' : '12px',
            letterSpacing: t.icon ? '0' : '0.04em',
          }"
        >{{ iconFor(t) }}</span>
        <span
          class="flex-1 truncate"
          :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
        >{{ t.name }}</span>
        <span
          class="px-2 py-1 -m-1"
          role="button"
          tabindex="0"
          :aria-label="`Cycle rate for ${t.name}`"
          @click="cycle(t, $event)"
        >
          <RateDots
            :rate="t.rate"
            :rate-l="t.rateL"
            :rate-r="t.rateR"
            :lr="t.lr"
          />
        </span>
      </button>
    </template>
  </section>
</template>
