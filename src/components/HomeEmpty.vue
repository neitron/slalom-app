<script setup lang="ts">
const emit = defineEmits<{
  (e: 'cta'): void
}>()
</script>

<template>
  <section
    class="gw-glass p-6 flex flex-col gap-4 items-start"
    :style="{ borderRadius: 'var(--radius-g-panel)' }"
  >
    <p
      :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)', lineHeight: 1.3 }"
      class="font-semibold"
    >Rate a trick to get started.</p>
    <p
      :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg-muted)' }"
    >Your Working-on list, recent activity, and 2-week heatmap all live here. They fill in as you tap.</p>
    <button
      type="button"
      class="px-4 py-2.5 font-semibold active:scale-95 transition-transform"
      :style="{
        background: 'var(--color-g-brand)',
        color: 'var(--color-g-base)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('cta')"
    >Open Tricks</button>
  </section>
</template>
