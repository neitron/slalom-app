<script setup lang="ts">
import { computed } from 'vue'
import { useFriendsStore } from '../stores/friends'

type Tab = { to: string; label: string; icon: 'tricks' | 'learning' | 'graph' | 'transitions' | 'sequences' | 'people' }

const tabs: Tab[] = [
  { to: '/', icon: 'tricks', label: 'Tricks' },
  { to: '/learning', icon: 'learning', label: 'Learning' },
  { to: '/graph', icon: 'graph', label: 'Graph' },
  { to: '/transitions', icon: 'transitions', label: 'Transitions' },
  { to: '/sequences', icon: 'sequences', label: 'Sequences' },
  { to: '/people', icon: 'people', label: 'People' },
]

const friends = useFriendsStore()
const incomingCount = computed<number>(() => friends.incomingCount)
</script>

<template>
  <nav
    class="fixed left-0 right-0 bottom-0 z-30 grid grid-cols-6 gap-0.5 bg-card border-t border-border pt-1 px-1"
    :style="{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.25rem)' }"
  >
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="relative flex flex-col items-center justify-center min-h-[44px] py-1 rounded-lg"
      active-class="bg-accent text-bg font-semibold"
      :class="{ 'text-muted': $route.path !== t.to }"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="t.icon === 'tricks'">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </template>
        <template v-else-if="t.icon === 'learning'">
          <path d="M3 5a2 2 0 0 1 2-2h11v18H5a2 2 0 0 1-2-2z" />
          <path d="M21 7v14H8" />
        </template>
        <template v-else-if="t.icon === 'graph'">
          <circle cx="5" cy="6" r="2" />
          <circle cx="19" cy="6" r="2" />
          <circle cx="12" cy="18" r="2" />
          <path d="M6.5 7.5L11 16.5M17.5 7.5L13 16.5M6.5 6h11" />
        </template>
        <template v-else-if="t.icon === 'transitions'">
          <path d="M4 7h12l-3-3M20 17H8l3 3" />
        </template>
        <template v-else-if="t.icon === 'sequences'">
          <path d="M10 13a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1.5 1.5" />
          <path d="M14 11a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1.5-1.5" />
        </template>
        <template v-else-if="t.icon === 'people'">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 19c1-3.4 3.5-5 6-5s5 1.6 6 5" />
          <circle cx="17" cy="9" r="2.6" />
          <path d="M15.5 14.2c2.3.2 4 1.6 4.5 4.8" />
        </template>
      </svg>
      <span class="mt-0.5 text-[10px] leading-tight">{{ t.label }}</span>
      <span
        v-if="t.icon === 'people' && incomingCount > 0"
        class="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-rate-bad"
      />
    </RouterLink>
  </nav>
</template>
