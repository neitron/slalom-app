<script setup lang="ts">
import { computed } from 'vue'

type Tab = { label: string; value: string }

const props = defineProps<{
  tabs: Tab[]
  value: string
}>()
const emit = defineEmits<{
  (e: 'update:value', v: string): void
}>()

const activeIdx = computed<number>(() => {
  const i = props.tabs.findIndex((t) => t.value === props.value)
  return i >= 0 ? i : 0
})

function onClick(v: string): void {
  if (v !== props.value) emit('update:value', v)
}
</script>

<template>
  <div
    class="sub-tab-grid"
    :style="{
      '--active-idx': activeIdx,
      '--tab-count': tabs.length,
    }"
    role="tablist"
  >
    <span class="sub-tab-indicator" aria-hidden="true" />
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      :aria-selected="t.value === value"
      class="sub-tab-button"
      :class="{ active: t.value === value }"
      @click="onClick(t.value)"
    >{{ t.label }}</button>
  </div>
</template>

<style scoped>
/* Same morph pattern as TabBar but inline / no glass — sub-tabs sit on the
   page's sticky-bar glass already. Tab count is dynamic (2 or 3). */
.sub-tab-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(var(--tab-count, 2), 1fr);
  gap: 0.25rem;
  padding: 3px;
  border-radius: var(--radius-g-chip);
  background: rgba(255, 255, 255, 0.04);
}

/* Morphing selection pill. Math mirrors TabBar (padding 3px ≈ 0.1875rem,
   gap 0.25rem). Per-tab width = (100% - 2*padding - (n-1)*gap) / n. */
.sub-tab-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: calc((100% - 6px - (var(--tab-count, 2) - 1) * 0.25rem) / var(--tab-count, 2));
  left: calc(
    3px + var(--active-idx, 0) * (
      ((100% - 6px - (var(--tab-count, 2) - 1) * 0.25rem) / var(--tab-count, 2))
      + 0.25rem
    )
  );
  background: var(--color-g-fg);
  border-radius: var(--radius-g-chip);
  z-index: 0;
  transition:
    left var(--motion-g-slow) cubic-bezier(0.32, 0.72, 0, 1),
    transform var(--motion-g-fast) var(--ease-g-out);
  will-change: left, transform;
  pointer-events: none;
}

.sub-tab-grid:active .sub-tab-indicator {
  transform: scale(0.97);
}

.sub-tab-button {
  position: relative;
  padding: 6px 11px;
  border-radius: var(--radius-g-chip);
  font-size: var(--text-g-micro);
  color: var(--color-g-fg-muted);
  background: transparent;
  z-index: 1;
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--motion-g-slow) cubic-bezier(0.32, 0.72, 0, 1),
    transform var(--motion-g-fast) var(--ease-g-out);
}
.sub-tab-button.active {
  color: var(--color-g-base);
  font-weight: 600;
}
.sub-tab-button:active {
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .sub-tab-indicator,
  .sub-tab-button { transition: none; }
  .sub-tab-grid:active .sub-tab-indicator,
  .sub-tab-button:active { transform: none; }
}
</style>
