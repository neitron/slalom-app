<script setup lang="ts">
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
</script>

<template>
  <div
    class="fixed left-0 right-0 top-2 z-50 flex flex-col items-center gap-2 px-3 pointer-events-none"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="pointer-events-auto max-w-md w-full px-3 py-2 text-sm flex items-start gap-2 gw-glass-strong"
        :style="t.kind === 'error'
          ? { borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-danger)', border: '1px solid rgba(255,80,80,0.35)' }
          : { borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
        role="status"
        @click="ui.dismissToast(t.id)"
      >
        <span class="flex-1 break-words">{{ t.message }}</span>
        <button
          type="button"
          class="opacity-60 hover:opacity-100 -mr-1 -mt-0.5 text-base leading-none"
          :style="{ color: 'inherit' }"
          aria-label="Dismiss"
          @click.stop="ui.dismissToast(t.id)"
        >×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 180ms ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
