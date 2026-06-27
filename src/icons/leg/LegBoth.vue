<script setup lang="ts">
type Props = { size?: number }
const props = withDefaults(defineProps<Props>(), { size: 20 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <text
      x="12"
      y="18"
      text-anchor="middle"
      font-family="ui-rounded, -apple-system, system-ui, sans-serif"
      font-weight="700"
      font-size="13"
      letter-spacing="-0.4"
    >L·R</text>
  </svg>
</template>
