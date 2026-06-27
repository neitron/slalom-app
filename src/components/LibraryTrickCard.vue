<script setup lang="ts">
import type { CanonicalTrick } from '../domain/types'
import { IconPlus, IconCheck } from '../icons'

type Props = { trick: CanonicalTrick; adopted?: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'adopt', id: string): void }>()

function onAdopt(): void {
  if (props.trick.id && !props.adopted) emit('adopt', props.trick.id)
}
</script>

<template>
  <div
    class="gw-glass-strong flex items-center gap-3 p-3"
    :style="{ borderRadius: 'var(--radius-g-chip)' }"
  >
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-semibold truncate">{{ trick.name }}</span>
        <span
          class="text-[10px] uppercase tracking-wide shrink-0"
          :style="{ color: 'var(--color-g-fg-muted)' }"
        >T{{ trick.tier }}</span>
        <span
          class="text-[10px] shrink-0"
          :style="{ color: 'var(--color-g-fg-muted)' }"
        >{{ trick.category }}</span>
      </div>
      <div
        v-if="trick.defaultAliases.length"
        class="text-xs truncate"
        :style="{ color: 'var(--color-g-fg-muted)' }"
      >a.k.a. {{ trick.defaultAliases[0] }}</div>
    </div>
    <button
      type="button"
      class="shrink-0 flex items-center gap-1 px-3 py-1.5 transition-colors"
      :class="adopted ? '' : 'gw-glass-strong'"
      :style="adopted
        ? { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }
        : { background: 'var(--color-g-brand)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }"
      :disabled="adopted"
      @click="onAdopt"
    >
      <IconCheck v-if="adopted" :size="14" stroke="1.75" />
      <IconPlus v-else :size="14" stroke="1.75" />
      <span>{{ adopted ? 'Adopted' : 'Add' }}</span>
    </button>
  </div>
</template>
