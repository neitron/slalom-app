<script setup lang="ts">
import type { Trick } from '../domain/types'
import { displayName } from '../domain/display'

defineProps<{
  leg: 'from' | 'to' | 'step'
  trick: Trick
}>()

const emit = defineEmits<{
  chose: [side: 'L' | 'R']
}>()
</script>

<template>
  <div class="gw-glass-strong inline-flex items-center gap-2 p-2 shadow-2xl" :style="{ borderRadius: 'var(--radius-g-panel)' }">
    <span class="text-[11px] px-1" :style="{ color: 'var(--color-g-fg-muted)' }">
      {{ leg === 'from' ? 'from' : leg === 'to' ? 'to' : 'step' }} {{ displayName(trick) }}:
    </span>
    <button
      type="button"
      class="px-3 py-1.5 text-sm font-semibold"
      :style="{ borderRadius: 'var(--radius-g-chip)', background: 'var(--color-g-leg-l)', color: 'var(--color-g-base)' }"
      @click="emit('chose', 'L')"
    >L</button>
    <button
      type="button"
      class="px-3 py-1.5 text-sm font-semibold"
      :style="{ borderRadius: 'var(--radius-g-chip)', background: 'var(--color-g-leg-r)', color: 'var(--color-g-base)' }"
      @click="emit('chose', 'R')"
    >R</button>
  </div>
</template>
