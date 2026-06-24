<script setup lang="ts">
import { useRouter } from 'vue-router'

declare const __BUILD_SHA__: string
declare const __BUILD_TIME__: string

const router = useRouter()
const sha = __BUILD_SHA__
const built = __BUILD_TIME__
</script>

<template>
  <div class="min-h-screen px-4 pt-6 pb-24 flex flex-col gap-6"
       :style="{ background: 'var(--color-g-base)', color: 'var(--color-g-fg)' }">
    <h1 class="font-semibold tracking-tight" :style="{ fontSize: 'var(--text-g-h1)' }">
      Diagnostics
    </h1>

    <section
      class="gw-glass p-5 flex flex-col gap-3"
      :style="{ borderRadius: 'var(--radius-g-panel)' }"
    >
      <p :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg-muted)' }">
        Engineering surface — populated in Phase 4h.
      </p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
          :style="{ fontSize: 'var(--text-g-micro)' }">
        <dt :style="{ color: 'var(--color-g-fg-muted)' }">Build SHA</dt>
        <dd style="font-family: ui-monospace, monospace;">{{ sha }}</dd>
        <dt :style="{ color: 'var(--color-g-fg-muted)' }">Built at</dt>
        <dd style="font-family: ui-monospace, monospace;">{{ built }}</dd>
      </dl>
    </section>

    <button
      type="button"
      class="self-start px-4 py-2 gw-glass-strong"
      :style="{
        borderRadius: 'var(--radius-g-chip)',
        color: 'var(--color-g-fg)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="router.push('/settings')"
    >
      ← Settings
    </button>
  </div>
</template>
