<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { detectPlatform, useInstallPrompt } from '../utils/installPrompt'
import { IconCheck, IconShare } from '../icons'

const router = useRouter()
const platform = ref(detectPlatform())
const install = useInstallPrompt()
const status = ref<string>('')
const promptAvailable = ref(install.available())
const iconSrc = `${import.meta.env.BASE_URL}icon-192.png`
const copied = ref(false)

const appUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  const { origin } = window.location
  const base = import.meta.env.BASE_URL || '/'
  return origin + base
})

onMounted(() => {
  // iOS records the displayed URL (incl. hash) as the launch URL when the
  // user taps Add to Home Screen. Strip the hash so the installed icon
  // opens the app, not this install page. Page content is unaffected.
  if (!platform.value.isStandalone && typeof window !== 'undefined') {
    const base = import.meta.env.BASE_URL || '/'
    window.history.replaceState(null, '', base)
  }
  const tick = () => { promptAvailable.value = install.available() }
  const t = window.setInterval(tick, 500)
  setTimeout(() => window.clearInterval(t), 10000)
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(appUrl.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 2000)
  } catch {
    status.value = 'Copy failed — long-press the link below instead.'
  }
}

async function onInstallClick() {
  status.value = ''
  const outcome = await install.prompt()
  if (outcome === 'accepted') status.value = 'Installing…'
  else if (outcome === 'dismissed') status.value = 'Install cancelled.'
  else status.value = 'Install not offered by this browser yet — try again in a moment.'
}

function openApp() {
  router.replace('/')
}

type Guide =
  | 'installed'
  | 'in-app-ios' | 'in-app-android'
  | 'ios-safari' | 'ios-chromium-modern'
  | 'android-chrome' | 'android-other'
  | 'desktop-chrome' | 'desktop-other'

const guide = computed<Guide>(() => {
  const p = platform.value
  if (p.isStandalone) return 'installed'
  if (p.isInAppBrowser) return p.isIOS ? 'in-app-ios' : 'in-app-android'
  if (p.isIOS && p.isSafari) return 'ios-safari'
  if (p.isIOS) return 'ios-chromium-modern'
  if (p.isAndroid && p.isChromium) return 'android-chrome'
  if (p.isAndroid) return 'android-other'
  if (p.isChromium) return 'desktop-chrome'
  return 'desktop-other'
})

const iosBrowserName = computed(() => {
  const p = platform.value
  if (p.isIOSChrome) return 'Chrome'
  if (p.isIOSFirefox) return 'Firefox'
  if (p.isIOSEdge) return 'Edge'
  return 'this browser'
})
</script>

<template>
  <div class="min-h-full flex flex-col p-4 gap-4 max-w-md mx-auto">
    <header class="flex flex-col items-center gap-2 mt-2 text-center">
      <img
        :src="iconSrc"
        alt="Slalom Tricks"
        class="w-20 h-20 rounded-2xl shadow-lg"
      >
      <h1 class="text-xl font-semibold">Install Slalom Tricks</h1>
      <p class="text-sm text-muted">Add to your home screen for a full-screen, offline-capable app.</p>
    </header>

    <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <span class="flex-1 text-xs text-muted truncate" :title="appUrl">{{ appUrl }}</span>
        <button
          type="button"
          class="shrink-0 px-2.5 py-1.5 rounded-md border border-border-2 bg-card-2 text-fg text-xs"
          @click="copyLink"
        ><span class="inline-flex items-center gap-1"><IconCheck v-if="copied" :size="14" stroke="1.75" />{{ copied ? 'Copied' : 'Copy link' }}</span></button>
      </div>
      <p class="text-[10.5px] text-muted">Use this if you need to open the page in a different browser.</p>
    </section>

    <section
      v-if="guide === 'installed'"
      class="bg-card border border-rate-good/40 rounded-xl p-4 flex flex-col gap-3 text-center"
    >
      <IconCheck :size="32" stroke="2" class="text-rate-good" />
      <p class="text-sm">You're already running the installed app.</p>
      <button
        type="button"
        class="py-2 px-4 rounded-lg bg-accent text-bg font-semibold text-sm"
        @click="openApp"
      >Open Slalom</button>
    </section>

    <section
      v-else-if="guide === 'in-app-ios'"
      class="bg-card border border-rate-mid/40 rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold text-rate-mid">
        Opened inside {{ platform.inAppName }}{{ platform.inAppName === 'In-app browser' ? '' : '' }}
      </h2>
      <p class="text-sm">In-app browsers can't add to your home screen. Open this page in <span class="font-semibold">Safari</span> or <span class="font-semibold">Chrome</span> first:</p>
      <ol class="text-sm flex flex-col gap-2 list-decimal pl-5">
        <li>Tap the menu in {{ platform.inAppName }} (usually the <span class="font-semibold">⋯</span> or three-dot icon).</li>
        <li>Choose <span class="font-semibold">Open in browser</span> / <span class="font-semibold">Open in Safari</span>.</li>
        <li>You'll land back on this install page — follow the steps for your browser.</li>
      </ol>
      <p class="text-xs text-muted">Or use <span class="font-semibold">Copy link</span> above and paste it into Safari's address bar.</p>
    </section>

    <section
      v-else-if="guide === 'in-app-android'"
      class="bg-card border border-rate-mid/40 rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold text-rate-mid">Opened inside {{ platform.inAppName }}</h2>
      <p class="text-sm">Install isn't available from in-app browsers. Open this page in <span class="font-semibold">Chrome</span>:</p>
      <ol class="text-sm flex flex-col gap-2 list-decimal pl-5">
        <li>Tap the menu (<span class="font-semibold">⋯</span> or three dots).</li>
        <li>Choose <span class="font-semibold">Open in Chrome</span> / <span class="font-semibold">Open in browser</span>.</li>
        <li>You'll land back on this install page in Chrome — tap <span class="font-semibold">Install app</span>.</li>
      </ol>
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
            <IconShare :size="16" stroke="1.75" />
            Share
          </span>
          button at the bottom of Safari.
        </li>
        <li>Scroll the share sheet down and tap <span class="font-semibold">Add to Home Screen</span>.</li>
        <li>Tap <span class="font-semibold">Add</span> in the top right.</li>
      </ol>
    </section>

    <section
      v-else-if="guide === 'ios-chromium-modern'"
      class="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
    >
      <h2 class="text-sm font-semibold">iPhone / iPad · {{ iosBrowserName }}</h2>
      <p class="text-sm">iOS lets {{ iosBrowserName }} add this app to your home screen since iOS 16.4:</p>
      <ol class="text-sm flex flex-col gap-2.5 list-decimal pl-5 text-fg/90">
        <li>Tap the <span class="font-semibold">⋯</span> menu (bottom-right in Chrome, top-right in others).</li>
        <li>Tap <span class="font-semibold">Share</span>.</li>
        <li>Scroll the share sheet and tap <span class="font-semibold">Add to Home Screen</span>.</li>
        <li>Tap <span class="font-semibold">Add</span> in the top right.</li>
      </ol>
      <p class="text-xs text-muted">If you don't see <span class="font-semibold">Add to Home Screen</span>, your iOS is older than 16.4 — copy the link above and open it in Safari instead.</p>
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
          <li>Tap the browser menu (<span class="font-semibold">⋮</span>).</li>
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
      <p class="text-sm">Install support is best in Chrome on Android. Use <span class="font-semibold">Copy link</span> above and paste into Chrome.</p>
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
