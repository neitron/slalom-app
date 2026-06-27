<script setup lang="ts">
type Props = { size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <path d="M6 12 L18 12" />
  </svg>
</template>
