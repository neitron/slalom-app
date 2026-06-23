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
  <div class="inline-flex items-center gap-2 bg-card border border-border rounded-xl p-2 shadow-2xl">
    <span class="text-[11px] text-muted px-1">
      {{ leg === 'from' ? 'from' : leg === 'to' ? 'to' : 'step' }} {{ displayName(trick) }}:
    </span>
    <button
      type="button"
      class="px-3 py-1.5 rounded-lg btn-l text-sm font-semibold"
      @click="emit('chose', 'L')"
    >L</button>
    <button
      type="button"
      class="px-3 py-1.5 rounded-lg btn-r text-sm font-semibold"
      @click="emit('chose', 'R')"
    >R</button>
  </div>
</template>
