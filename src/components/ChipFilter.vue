<script setup lang="ts">
import { computed } from 'vue'

export type ChipOption = {
  value: string
  label: string
  count?: number
}

type Props = {
  options: ChipOption[]
  modelValue: string | string[]
  multi?: boolean
}

const props = withDefaults(defineProps<Props>(), { multi: false })

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | string[]): void
}>()

const selected = computed<Set<string>>(() => {
  if (Array.isArray(props.modelValue)) return new Set(props.modelValue)
  return new Set([props.modelValue])
})

function isActive(value: string): boolean {
  return selected.value.has(value)
}

function toggle(value: string) {
  if (props.multi) {
    const next = new Set(selected.value)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    emit('update:modelValue', [...next])
  } else {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-1.5 pb-1">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="shrink-0 px-3 py-1 text-xs whitespace-nowrap transition-colors"
      :class="isActive(o.value) ? 'font-semibold' : 'gw-glass-strong'"
      :style="isActive(o.value)
        ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)' }
        : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
      @click="toggle(o.value)"
    >
      {{ o.label }}<span
        v-if="o.count != null"
        class="ml-1 opacity-60"
      >{{ o.count }}</span>
    </button>
  </div>
</template>
