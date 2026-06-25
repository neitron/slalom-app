<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'
import AvatarBadge from './AvatarBadge.vue'
import { nicknameDisplay } from '../domain/display'

const auth = useAuthStore()
const profile = useProfileStore()
const router = useRouter()
const open = ref(false)

onMounted(() => {
  if (auth.isSignedIn && !profile.profile) void profile.load()
})

function toggle() { open.value = !open.value }
function close() { open.value = false }

function go(path: string) {
  close()
  void router.push(path)
}

async function onSignOut() {
  close()
  await auth.signOut()
}
</script>

<template>
  <div :style="{ position: 'relative', display: 'inline-block' }">
    <button
      type="button"
      class="w-11 h-11 rounded-full overflow-hidden grid place-items-center"
      :style="{
        background: 'rgba(255, 255, 255, 0.10)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        position: 'relative',
        zIndex: 2,
      }"
      :aria-label="'Profile menu'"
      @click="toggle"
    >
      <AvatarBadge :profile="profile.profile" size="sm" />
    </button>

    <!-- Click-outside catcher (fixed full-viewport, but does NOT use Teleport) -->
    <div
      v-if="open"
      @click="close"
      :style="{
        position: 'fixed',
        inset: '0',
        zIndex: 60,
      }"
    />

    <!-- Dropdown menu, inline position: absolute -->
    <div
      v-if="open"
      :style="{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        right: '0',
        width: '14rem',
        zIndex: 70,
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        background: 'rgba(30, 28, 38, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        borderRadius: 'var(--radius-g-panel)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }"
    >
      <div v-if="auth.isSignedIn" :style="{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }">
        <AvatarBadge :profile="profile.profile" size="md" />
        <div :style="{ minWidth: '0' }">
          <div class="text-sm font-medium truncate" :style="{ color: 'var(--color-g-fg)' }">{{ nicknameDisplay(profile.profile) }}</div>
          <div class="text-[11px] truncate" :style="{ color: 'var(--color-g-fg-muted)' }">
            <template v-if="profile.profile?.nickname">@{{ profile.profile.nickname }}</template>
            <template v-else>No nickname yet</template>
          </div>
        </div>
      </div>

      <button
        v-if="auth.isSignedIn && !profile.profile?.nickname"
        type="button"
        class="w-full text-left px-3 py-2 text-sm font-semibold"
        :style="{ background: 'var(--color-g-brand)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)' }"
        @click="go('/onboarding/nickname')"
      >Pick a nickname</button>

      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm"
        :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
        @click="go('/people')"
      >People</button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-sm"
        :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
        @click="go('/settings')"
      >Settings</button>
      <button
        v-if="auth.isSignedIn"
        type="button"
        class="w-full text-left px-3 py-2 text-sm"
        :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg-muted)' }"
        @click="onSignOut"
      >Sign out</button>
      <button
        v-else
        type="button"
        class="w-full text-left px-3 py-2 text-sm"
        :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
        @click="go('/settings')"
      >Sign in</button>
    </div>
  </div>
</template>
