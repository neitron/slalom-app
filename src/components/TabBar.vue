<script setup lang="ts">
const tabs = [
  { to: '/', icon: '🎯', label: 'Tricks' },
  { to: '/learning', icon: '📚', label: 'Learning' },
  { to: '/graph', icon: '🕸️', label: 'Graph' },
  { to: '/transitions', icon: '🔀', label: 'Transitions' },
  { to: '/sequences', icon: '🔗', label: 'Sequences' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
]
</script>

<template>
  <nav
    class="fixed bottom-0 inset-x-0 grid grid-cols-6 gap-0.5 bg-card border-t border-border pt-1 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
  >
    <RouterLink
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="flex flex-col items-center justify-center min-h-[44px] py-1 rounded-lg"
      active-class="bg-accent text-bg font-semibold"
      :class="{ 'text-muted': $route.path !== t.to }"
    >
      <span class="text-base leading-none">{{ t.icon }}</span>
      <span class="mt-0.5 text-[10px] leading-tight">{{ t.label }}</span>
    </RouterLink>
  </nav>
</template>
