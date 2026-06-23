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
  <div class="relative">
    <button
      type="button"
      class="w-11 h-11 rounded-full overflow-hidden border border-border-2 grid place-items-center"
      :aria-label="'Profile menu'"
      @click="toggle"
    >
      <AvatarBadge :profile="profile.profile" size="sm" />
    </button>

    <div
      v-if="open"
      class="fixed inset-0 z-40"
      @click="close"
    />
    <div
      v-if="open"
      class="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1"
    >
      <div v-if="auth.isSignedIn" class="flex items-center gap-2 p-2">
        <AvatarBadge :profile="profile.profile" size="md" />
        <div class="min-w-0">
          <div class="text-sm font-medium truncate">{{ nicknameDisplay(profile.profile) }}</div>
          <div class="text-[11px] text-muted truncate">
            <template v-if="profile.profile?.nickname">@{{ profile.profile.nickname }}</template>
            <template v-else>No nickname yet</template>
          </div>
        </div>
      </div>

      <button
        v-if="auth.isSignedIn && !profile.profile?.nickname"
        type="button"
        class="w-full text-left px-3 py-2 rounded-lg text-sm bg-accent text-bg font-semibold"
        @click="go('/onboarding/nickname')"
      >Pick a nickname</button>

      <button
        type="button"
        class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-border/40"
        @click="go('/people')"
      >People</button>
      <button
        type="button"
        class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-border/40"
        @click="go('/settings')"
      >Settings</button>
      <button
        v-if="auth.isSignedIn"
        type="button"
        class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-border/40 text-muted"
        @click="onSignOut"
      >Sign out</button>
      <button
        v-else
        type="button"
        class="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-border/40"
        @click="go('/settings')"
      >Sign in</button>
    </div>
  </div>
</template>
