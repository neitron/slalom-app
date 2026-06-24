<script setup lang="ts">
import { useRouter } from 'vue-router'
import HeaderProfileMenu from '../components/HeaderProfileMenu.vue'

const router = useRouter()
</script>

<template>
  <div class="gw-aurora-bg-lg min-h-screen px-4 pt-6 pb-24 flex flex-col gap-6">
    <header class="flex items-center justify-between">
      <h1
        class="font-semibold tracking-tight"
        :style="{ fontSize: 'var(--text-g-h1)', color: 'var(--color-g-fg)' }"
      >
        Slalom
      </h1>
      <HeaderProfileMenu />
    </header>

    <section
      class="gw-glass p-5 flex flex-col gap-4"
      :style="{ borderRadius: 'var(--radius-g-panel)' }"
    >
      <p
        :style="{
          fontSize: 'var(--text-g-body)',
          color: 'var(--color-g-fg-muted)',
        }"
      >
        Welcome. The Home surface is being designed.
      </p>
      <p
        :style="{
          fontSize: 'var(--text-g-body)',
          color: 'var(--color-g-fg-muted)',
        }"
      >
        For now, jump straight into your tricks or the Graph.
      </p>
      <div class="flex gap-3 mt-2">
        <button
          type="button"
          class="flex-1 py-3 font-semibold transition-colors"
          :style="{
            background: 'var(--color-g-brand)',
            color: 'var(--color-g-base)',
            borderRadius: 'var(--radius-g-chip)',
            fontSize: 'var(--text-g-body)',
          }"
          @click="router.push('/tricks')"
        >
          Open Tricks
        </button>
        <button
          type="button"
          class="flex-1 py-3 font-semibold transition-colors gw-glass-strong"
          :style="{
            color: 'var(--color-g-fg)',
            borderRadius: 'var(--radius-g-chip)',
            fontSize: 'var(--text-g-body)',
          }"
          @click="router.push('/graph')"
        >
          Open Graph
        </button>
      </div>
    </section>
  </div>
</template>
