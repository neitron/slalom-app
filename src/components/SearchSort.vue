<script setup lang="ts">
export type SortMode = '' | 'best' | 'worst'

type Props = {
  search: string
  sort: SortMode
  placeholder?: string
}

withDefaults(defineProps<Props>(), { placeholder: 'Search tricks…' })

const emit = defineEmits<{
  (e: 'update:search', value: string): void
  (e: 'update:sort', value: SortMode): void
}>()

function onSearchInput(ev: Event) {
  emit('update:search', (ev.target as HTMLInputElement).value)
}

function onSortChange(ev: Event) {
  emit('update:sort', (ev.target as HTMLSelectElement).value as SortMode)
}
</script>

<template>
  <div class="flex gap-2">
    <input
      type="search"
      :value="search"
      :placeholder="placeholder"
      class="flex-1 px-2.5 py-2 gw-glass-strong focus:outline-none"
      :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)', fontSize: 'var(--text-g-body)' }"
      @input="onSearchInput"
    >
    <select
      :value="sort"
      class="px-2 py-2 gw-glass-strong cursor-pointer focus:outline-none"
      :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg-muted)', fontSize: 'var(--text-g-micro)' }"
      @change="onSortChange"
    >
      <option value="">A–Z</option>
      <option value="best">Best first</option>
      <option value="worst">Worst first</option>
    </select>
  </div>
</template>

<style scoped>
input::placeholder {
  color: var(--color-g-fg-faint);
}
</style>
