<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePreferencesStore, type RateDotStyle } from '../stores/preferences'
import RateDots from '../components/RateDots.vue'
import { useAuthStore } from '../stores/auth'
import { useProfileStore } from '../stores/profile'
import AvatarBadge from '../components/AvatarBadge.vue'
import ShareProfile from '../components/ShareProfile.vue'
import { supabaseConfigured } from '../storage/supabase'
import { nicknameErrorMessage, validateNickname } from '../domain/nickname'
import type { ProfileVisibility } from '../domain/types'
import { IconArrowRight } from '../icons'

const prefs = usePreferencesStore()

const rateDotOptions: { id: RateDotStyle; label: string }[] = [
  { id: 'dots',    label: 'Dots' },
  { id: 'slashes', label: 'Slashes' },
  { id: 'bars',    label: 'Bars' },
]

function pickRateDotStyle(id: RateDotStyle): void {
  prefs.setRateDotStyle(id)
}

const router = useRouter()
const auth = useAuthStore()
const profileStore = useProfileStore()

const nicknameInput = ref('')
const displayNameInput = ref('')
const bioInput = ref('')
const emojiInput = ref('')
const visibilityInput = ref<ProfileVisibility>('private')
const profileMsg = ref<string>('')

function syncProfileInputs() {
  const p = profileStore.profile
  nicknameInput.value = p?.nickname ?? ''
  displayNameInput.value = p?.displayName ?? ''
  bioInput.value = p?.bio ?? ''
  emojiInput.value = p?.avatarEmoji ?? ''
  visibilityInput.value = p?.visibility ?? 'private'
}

const nicknameValidationMsg = computed<string | null>(() => {
  if (!nicknameInput.value.trim()) return null
  const err = validateNickname(nicknameInput.value.trim())
  return err ? nicknameErrorMessage(err) : null
})

async function onSaveProfile() {
  profileMsg.value = ''
  try {
    const patch: Record<string, unknown> = {}
    const p = profileStore.profile
    const nick = nicknameInput.value.trim() || null
    if (nick !== (p?.nickname ?? null)) {
      if (nick) {
        const err = validateNickname(nick)
        if (err) { profileMsg.value = nicknameErrorMessage(err); return }
      }
      patch.nickname = nick
    }
    if (displayNameInput.value.trim() !== (p?.displayName ?? '')) patch.displayName = displayNameInput.value.trim() || null
    if (bioInput.value !== (p?.bio ?? '')) patch.bio = bioInput.value.trim() || null
    if (emojiInput.value !== (p?.avatarEmoji ?? '')) patch.avatarEmoji = emojiInput.value.trim().slice(0, 4) || null

    const effectiveNickname = nick ?? p?.nickname ?? null
    let visibility = visibilityInput.value
    if (!effectiveNickname && visibility !== 'private') {
      visibility = 'private'
      visibilityInput.value = 'private'
      profileMsg.value = 'Pick a nickname first to share with friends or publicly. Saved as Private.'
    }
    if (visibility !== (p?.visibility ?? 'private')) patch.visibility = visibility

    if (!Object.keys(patch).length) { if (!profileMsg.value) profileMsg.value = 'No changes.'; return }
    await profileStore.updateField(patch)
    if (!profileMsg.value) profileMsg.value = 'Saved.'
    syncProfileInputs()
  } catch (e) {
    profileMsg.value = profileStore.error || (e as Error).message
  }
}

const cloudConfigured = supabaseConfigured()
const email = ref('')
const magicSent = ref(false)

onMounted(async () => {
  if (auth.isSignedIn) {
    if (!profileStore.profile) await profileStore.load()
    syncProfileInputs()
  }
})

async function onSendMagicLink() {
  if (!email.value.trim()) return
  magicSent.value = false
  await auth.sendMagicLink(email.value.trim(), window.location.origin + import.meta.env.BASE_URL)
  if (!auth.error) magicSent.value = true
}

async function onSignInGoogle() {
  magicSent.value = false
  await auth.signInWithGoogle(window.location.origin + import.meta.env.BASE_URL)
}

async function onReload() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update()))
    }
  } catch { /* swallow */ }
  window.location.reload()
}

async function onSignOut() {
  await auth.signOut()
  magicSent.value = false
  email.value = ''
}
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />
    <div class="page-scroll p-4 flex flex-col gap-4">
      <h1 class="text-xl font-semibold">Settings</h1>

    <section
      v-if="auth.isSignedIn"
      class="bg-card border border-border rounded-xl p-3 flex flex-col gap-3"
    >
      <h2 class="text-xs uppercase tracking-wide text-muted">Profile</h2>
      <div class="flex items-center gap-3">
        <AvatarBadge :profile="profileStore.profile" size="lg" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ profileStore.profile?.displayName || profileStore.profile?.nickname || 'No nickname yet' }}</div>
          <div v-if="profileStore.profile?.nickname" class="text-[11px] text-muted truncate">@{{ profileStore.profile.nickname }}</div>
          <RouterLink
            v-else
            to="/onboarding/nickname"
            class="text-[11px] text-accent underline"
          >Pick a nickname</RouterLink>
        </div>
      </div>

      <label class="text-[11px] text-muted">Nickname</label>
      <input
        v-model="nicknameInput"
        type="text"
        autocomplete="off"
        placeholder="your_nickname"
        class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
      >
      <p v-if="nicknameValidationMsg" class="text-[11px] text-rate-bad">{{ nicknameValidationMsg }}</p>

      <label class="text-[11px] text-muted">Display name</label>
      <input
        v-model="displayNameInput"
        type="text"
        autocomplete="off"
        class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
      >

      <label class="text-[11px] text-muted">Avatar emoji</label>
      <input
        v-model="emojiInput"
        type="text"
        maxlength="4"
        class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
      >

      <label class="text-[11px] text-muted">Bio</label>
      <textarea
        v-model="bioInput"
        rows="2"
        class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
      />

      <fieldset class="flex flex-col gap-1">
        <legend class="text-[11px] text-muted">Visibility</legend>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" value="public" v-model="visibilityInput" :disabled="!profileStore.profile?.nickname && !nicknameInput.trim()" />
          Public
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" value="friends" v-model="visibilityInput" :disabled="!profileStore.profile?.nickname && !nicknameInput.trim()" />
          Friends only
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" value="private" v-model="visibilityInput" />
          Private
        </label>
        <p v-if="!profileStore.profile?.nickname && !nicknameInput.trim()" class="text-[10.5px] text-muted">Public/Friends require a nickname.</p>
      </fieldset>

      <button
        type="button"
        class="w-full py-2 rounded-lg bg-accent text-bg text-sm font-semibold disabled:opacity-50"
        :disabled="profileStore.saving"
        @click="onSaveProfile"
      >{{ profileStore.saving ? 'Saving…' : 'Save profile' }}</button>
      <p v-if="profileMsg" class="text-[11px] text-muted">{{ profileMsg }}</p>

      <ShareProfile />
    </section>

    <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-xs uppercase tracking-wide text-muted">Cloud</h2>
        <span
          v-if="cloudConfigured && !auth.isSignedIn"
          class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-border/60 text-muted"
        >Not signed in</span>
        <span
          v-else-if="cloudConfigured && auth.isSignedIn"
          class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-rate-good/20 text-rate-good"
        >Signed in as {{ auth.email }}</span>
      </div>

      <p
        v-if="!cloudConfigured"
        class="text-xs text-muted"
      >
        Cloud sync not configured. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env.local
        and rebuild.
      </p>

      <template v-else-if="!auth.isSignedIn">
        <button
          type="button"
          class="w-full py-2 rounded-lg bg-accent text-bg text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          :disabled="auth.sending"
          @click="onSignInGoogle"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2c-.4.4 6.7-4.9 6.7-14.9 0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          {{ auth.sending ? 'Opening…' : 'Continue with Google' }}
        </button>

        <div class="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted">
          <div class="flex-1 h-px bg-border" />
          or magic link
          <div class="flex-1 h-px bg-border" />
        </div>

        <input
          v-model="email"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
        >
        <button
          type="button"
          class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40 disabled:opacity-50"
          :disabled="auth.sending || !email.trim()"
          @click="onSendMagicLink"
        >{{ auth.sending ? 'Sending…' : 'Send magic link' }}</button>
        <p
          v-if="magicSent && !auth.error"
          class="text-xs text-rate-good"
        >Check your email — link is good for an hour.</p>
        <p
          v-if="auth.error"
          class="text-xs text-rate-bad"
        >{{ auth.error }}</p>
      </template>

      <template v-else>
        <p class="text-xs text-muted">
          Signed in. Sync controls live in
          <button
            type="button"
            class="underline hover:text-fg"
            @click="router.push('/diagnostics')"
          >Diagnostics</button>.
        </p>
        <button
          type="button"
          class="w-full py-2 rounded-lg border border-border-2 text-muted text-sm hover:text-fg hover:bg-border/40"
          @click="onSignOut"
        >Sign out</button>
      </template>
    </section>

    <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-3">
      <h2 class="text-xs uppercase tracking-wide text-muted">App</h2>
      <RouterLink
        to="/install"
        class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40 text-center"
      >Install on this device</RouterLink>
      <button
        type="button"
        class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40"
        @click="onReload"
      >Reload app (force update)</button>
      <p class="text-[10.5px] text-muted">
        Forces the service worker to fetch the latest deployed code. Use after a new release.
      </p>
    </section>

    <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-3">
      <h2 class="text-xs uppercase tracking-wide text-muted">Display</h2>

      <div class="flex flex-col gap-2">
        <span class="text-sm text-fg">Rate indicator</span>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="opt in rateDotOptions"
            :key="opt.id"
            type="button"
            class="flex flex-col items-center gap-2 py-3 px-2 rounded-lg transition-colors"
            :class="prefs.rateDotStyle === opt.id ? 'rate-style-active' : 'rate-style-inactive'"
            :style="{
              borderRadius: 'var(--radius-g-chip)',
            }"
            @click="pickRateDotStyle(opt.id)"
          >
            <RateDots :rate="3" :rate-l="3" :rate-r="3" :lr="false" />
            <span class="text-xs font-semibold">{{ opt.label }}</span>
          </button>
        </div>
      </div>
    </section>

    <button
      type="button"
      class="w-full py-2 rounded-lg border border-border-2 text-muted text-sm hover:text-fg hover:bg-border/40 flex items-center justify-center gap-1"
      @click="router.push('/diagnostics')"
    >Diagnostics <IconArrowRight :size="14" stroke="1.75" /></button>
    </div>
  </div>
</template>

<style scoped>
.page-shell { position: relative; }
.page-aurora {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.page-scroll { position: relative; z-index: 1; }
.rate-style-active {
  background: var(--color-g-fg);
  color: var(--color-g-base);
}
.rate-style-inactive {
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-g-fg-muted);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
