<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProfileStore } from '../stores/profile'

const profile = useProfileStore()
const copied = ref(false)

const shareUrl = computed<string>(() => {
  const nick = profile.profile?.nickname
  if (!nick) return ''
  const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return `${origin}#/u/${nick}`
})

async function onCopy() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1500)
  } catch { /* swallow */ }
}

async function onShare() {
  if (!shareUrl.value) return
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: `@${profile.profile?.nickname} on slalom`, url: shareUrl.value })
    } catch { /* user cancel */ }
  } else {
    await onCopy()
  }
}
</script>

<template>
  <div
    v-if="profile.profile?.nickname"
    class="bg-card border border-border rounded-xl p-3 flex flex-col gap-2"
  >
    <div class="text-xs uppercase tracking-wide text-muted">Share profile</div>
    <div class="flex items-center gap-2">
      <span class="flex-1 text-sm font-mono truncate">@{{ profile.profile.nickname }}</span>
      <button
        type="button"
        class="min-h-[44px] px-3 py-2.5 rounded-md border border-border-2 text-sm hover:bg-border/40"
        @click="onCopy"
      >{{ copied ? 'Copied' : 'Copy link' }}</button>
      <button
        type="button"
        class="min-h-[44px] px-3 py-2.5 rounded-md border border-border-2 text-sm hover:bg-border/40"
        @click="onShare"
      >Share</button>
    </div>
    <div class="text-[10.5px] text-muted break-all">{{ shareUrl }}</div>
  </div>
</template>
