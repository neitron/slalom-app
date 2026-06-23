<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { detectPlatform, useInstallPrompt } from '../utils/installPrompt'

const router = useRouter()
const platform = ref(detectPlatform())
const install = useInstallPrompt()
const status = ref<string>('')
const promptAvailable = ref(install.available())

onMounted(() => {
  const tick = () => { promptAvailable.value = install.available() }
  const t = window.setInterval(tick, 500)
  setTimeout(() => window.clearInterval(t), 10000)
})

async function onInstallClick() {
  status.value = ''
  const outcome = await install.prompt()
  if (outcome === 'accepted') status.value = 'Installing…'
  else if (outcome === 'dismissed') status.value = 'Install cancelled.'
  else status.value = 'Install not offered by this browser.'
}

function openApp() {
  router.replace('/')
}

const guide = computed(() => {
  const p = platform.value
  if (p.isStandalone) return 'installed'
  if (p.isIOS && p.isSafari) return 'ios-safari'
  if (p.isIOS) return 'ios-other'
  if (p.isAndroid && p.isChromium) return 'android-chrome'
  if (p.isAndroid) return 'android-other'
  if (p.isChromium) return 'desktop-chrome'
  return 'desktop-other'
})
</script>

<template>
  <div class="min-h-full flex flex-col p-4 gap-4 max-w-md mx-auto">
    <header class="flex flex-col items-center gap-2 mt-2 text-center">
      <img
        :src="`${$router.options.history.base}icon-192.png`"
        alt="Slalom Tricks"
        class="w-20 h-20 rounded-2xl shadow-lg"
      >
      <h1 class="text-xl font-semibold">Install Slalom Tricks</h1>
      <p class="text-sm text-muted">Add to your home screen for a full-screen, offline-capable app.</p>
    </header>

    <section
      v-if="guide === 'installed'"
      class="bg-card border border-rate-good/40 rounded-xl p-4 flex flex-col gap-3 text-center"
    >
      <div class="text-rate-good text-2xl">✓</div>
      <p class="text-sm">You're already running the installed app.</p>
      <button
        type="button"
        class="py-2 px-4 rounded-lg bg-accent text-bg font-semibold text-sm"
        @click="openApp"
      >Open Slalom</button>
    </section>

    <section
      v-else-if="guide === 'ios-safari'"
      class="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold">iPhone / iPad · Safari</h2>
      <ol class="text-sm flex flex-col gap-2.5 list-decimal pl-5 text-fg/90">
        <li>
          Tap the
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-card-2 border border-border-2 text-accent align-middle">
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
              <path d="M7 1.5v8.5M7 1.5l-2.5 2.5M7 1.5l2.5 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 7v6.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
            Share
          </span>
          button at the bottom of Safari.
        </li>
        <li>Scroll the share sheet down and tap <span class="font-semibold">Add to Home Screen</span>.</li>
        <li>Tap <span class="font-semibold">Add</span> in the top right.</li>
      </ol>
      <p class="text-xs text-muted">Then open the new Slalom icon on your home screen. It runs full-screen, works offline, and updates itself.</p>
    </section>

    <section
      v-else-if="guide === 'ios-other'"
      class="bg-card border border-rate-mid/40 rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold text-rate-mid">Open this page in Safari</h2>
      <p class="text-sm">Apple only allows installing web apps from Safari. Tap the menu in this browser and choose <span class="font-semibold">Open in Safari</span>, then come back to this page.</p>
    </section>

    <section
      v-else-if="guide === 'android-chrome' || guide === 'desktop-chrome'"
      class="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold">{{ guide === 'android-chrome' ? 'Android · Chrome' : 'Desktop · Chromium' }}</h2>
      <button
        v-if="promptAvailable"
        type="button"
        class="py-2.5 px-4 rounded-lg bg-accent text-bg font-semibold text-sm"
        @click="onInstallClick"
      >Install app</button>
      <div v-else class="text-sm flex flex-col gap-2">
        <p>If the install button doesn't appear automatically:</p>
        <ol class="list-decimal pl-5 flex flex-col gap-1.5">
          <li>Tap the browser menu (⋮ in the top corner).</li>
          <li>Choose <span class="font-semibold">Install app</span> or <span class="font-semibold">Add to Home screen</span>.</li>
        </ol>
      </div>
      <p
        v-if="status"
        class="text-xs text-muted"
      >{{ status }}</p>
    </section>

    <section
      v-else-if="guide === 'android-other'"
      class="bg-card border border-rate-mid/40 rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold text-rate-mid">Open this page in Chrome</h2>
      <p class="text-sm">Install support is best in Chrome on Android. Tap your browser menu and choose <span class="font-semibold">Open in Chrome</span>.</p>
    </section>

    <section
      v-else
      class="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold">Desktop browser</h2>
      <p class="text-sm">Look for an install icon in the address bar, or use the browser menu → <span class="font-semibold">Install Slalom Tricks</span>. Best support: Chrome or Edge.</p>
    </section>

    <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
      <p class="text-[11px] text-muted">Already added? Open the app from your home screen, or:</p>
      <button
        type="button"
        class="py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40"
        @click="openApp"
      >Continue to web app</button>
    </section>
  </div>
</template>
