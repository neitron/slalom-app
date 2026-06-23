<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProfileStore } from '../stores/profile'
import { useAuthStore } from '../stores/auth'
import { nicknameErrorMessage, suggestAlternatives, validateNickname } from '../domain/nickname'

const router = useRouter()
const profile = useProfileStore()
const auth = useAuthStore()
const value = ref('')
const submitting = ref(false)
const serverError = ref<string | null>(null)

const validation = computed(() => validateNickname(value.value))
const message = computed<string | null>(() => {
  if (validation.value) return nicknameErrorMessage(validation.value)
  if (profile.checkingNickname) return 'Checking availability…'
  if (profile.nicknameAvailable === false) return 'Already taken.'
  if (serverError.value) return serverError.value
  return null
})
const canSave = computed(() => !validation.value && profile.nicknameAvailable !== false && !submitting.value)
const suggestions = computed(() => (profile.nicknameAvailable === false ? suggestAlternatives(value.value) : []))

watch(value, (v) => {
  serverError.value = null
  if (!validation.value && v.trim().length >= 3) {
    void profile.checkNicknameAvailable(v.trim())
  } else {
    profile.nicknameAvailable = null
  }
})

async function onSave() {
  if (!canSave.value) return
  submitting.value = true
  serverError.value = null
  try {
    await profile.upsertNickname(value.value.trim())
    router.replace('/people')
  } catch (e) {
    serverError.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}

function pickSuggestion(s: string) {
  value.value = s
}

function later() {
  if (window.history.length > 1) router.back()
  else router.replace('/')
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-md mx-auto w-full">
    <h1 class="text-xl font-semibold">Pick a nickname</h1>
    <p class="text-sm text-muted">
      Friends use this to find you. You can change it later.
    </p>

    <input
      v-model="value"
      type="text"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      placeholder="your_nickname"
      class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-base text-fg placeholder:text-muted focus:outline-none focus:border-accent"
    >
    <p v-if="message" class="text-xs" :class="profile.nicknameAvailable === true && !validation ? 'text-rate-good' : 'text-rate-bad'">{{ message }}</p>

    <div v-if="suggestions.length" class="flex flex-wrap gap-2">
      <button
        v-for="s in suggestions"
        :key="s"
        type="button"
        class="px-2 py-1 rounded-md border border-border-2 text-xs hover:bg-border/40"
        @click="pickSuggestion(s)"
      >@{{ s }}</button>
    </div>

    <div v-if="!auth.isSignedIn" class="text-xs text-rate-bad">
      Sign in first from Settings to claim a nickname.
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 px-3 py-2 rounded-lg bg-accent text-bg text-sm font-semibold disabled:opacity-50"
        :disabled="!canSave || !auth.isSignedIn"
        @click="onSave"
      >{{ submitting ? 'Saving…' : 'Save' }}</button>
      <button
        type="button"
        class="px-3 py-2 rounded-lg border border-border-2 text-sm text-muted"
        @click="later"
      >Maybe later</button>
    </div>
  </div>
</template>
