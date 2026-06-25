<script setup lang="ts">
import type { Sequence } from '../domain/types'

type Props = {
  currentSequence: Sequence | null
}
defineProps<Props>()

const emit = defineEmits<{
  (e: 'open-graph'): void
  (e: 'open-sequence', id: string): void
  (e: 'new-sequence'): void
}>()
</script>

<template>
  <div class="flex gap-2">
    <button
      type="button"
      class="flex-1 px-3 py-3 font-semibold text-left flex flex-col gap-0.5 active:scale-[0.98] transition-transform"
      :style="{
        background: 'var(--color-g-brand)',
        color: 'var(--color-g-base)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('open-graph')"
    >
      <span>Open Graph</span>
      <span :style="{ fontSize: '11px', opacity: 0.7 }">Trick map</span>
    </button>

    <button
      v-if="currentSequence"
      type="button"
      class="gw-glass flex-1 px-3 py-3 font-semibold text-left flex flex-col gap-0.5 active:scale-[0.98] transition-transform"
      :style="{
        color: 'var(--color-g-fg)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('open-sequence', currentSequence.id!)"
    >
      <span>Current Sequence</span>
      <span :style="{ fontSize: '11px', color: 'var(--color-g-fg-muted)' }" class="truncate">{{ currentSequence.name }}</span>
    </button>

    <button
      v-else
      type="button"
      class="gw-glass flex-1 px-3 py-3 font-semibold text-left flex flex-col gap-0.5 active:scale-[0.98] transition-transform"
      :style="{
        color: 'var(--color-g-fg)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('new-sequence')"
    >
      <span>New sequence</span>
      <span :style="{ fontSize: '11px', color: 'var(--color-g-fg-muted)' }">Start fresh</span>
    </button>
  </div>
</template>
