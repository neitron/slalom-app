<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFriendsStore } from '../stores/friends'
import { useKeyboardOpen } from '../composables/useKeyboardOpen'

type Tab = { to: string; label: string; icon: 'home' | 'tricks' | 'graph' | 'sequences' }

const tabs: Tab[] = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/tricks', icon: 'tricks', label: 'Tricks' },
  { to: '/graph', icon: 'graph', label: 'Graph' },
  { to: '/sequences', icon: 'sequences', label: 'Sequences' },
]

const friends = useFriendsStore()
const incomingCount = computed<number>(() => friends.incomingCount)

const route = useRoute()
const hideTabs = computed(() => !!route.meta.hideTabs)

const kbOpen = useKeyboardOpen()

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <Teleport to="body">
    <nav
      v-if="!hideTabs"
      class="tabbar-fixed gw-glass-strong grid grid-cols-4 gap-1 px-1 pt-1"
      :class="{ 'is-hidden': kbOpen }"
      :style="{
        paddingBottom: '0.25rem',
      }"
    >
      <RouterLink
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="relative flex flex-col items-center justify-center min-h-[44px] py-1.5"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
        :class="isActive(t.to)
          ? 'tabbar-active font-semibold'
          : 'text-[color:var(--color-g-fg-muted)]'"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <template v-if="t.icon === 'home'">
            <path d="M3 11.5L12 4l9 7.5" />
            <path d="M5 10.5V20h14V10.5" />
          </template>
          <template v-else-if="t.icon === 'tricks'">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </template>
          <template v-else-if="t.icon === 'graph'">
            <circle cx="5" cy="6" r="2" />
            <circle cx="19" cy="6" r="2" />
            <circle cx="12" cy="18" r="2" />
            <path d="M6.5 7.5L11 16.5M17.5 7.5L13 16.5M6.5 6h11" />
          </template>
          <template v-else-if="t.icon === 'sequences'">
            <path d="M10 13a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5" />
            <path d="M14 11a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5" />
          </template>
        </svg>
        <span class="mt-0.5 text-[10px] leading-tight">{{ t.label }}</span>
        <span
          v-if="t.icon === 'home' && incomingCount > 0"
          class="absolute top-0.5 right-2 w-2 h-2 rounded-full"
          :style="{ background: 'var(--color-g-danger)' }"
        />
      </RouterLink>
    </nav>
  </Teleport>
</template>

<style scoped>
.tabbar-active {
  background: var(--color-g-fg);
  color: var(--color-g-base);
}
</style>
