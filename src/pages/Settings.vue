<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { db } from '../storage/dexie'
import { ensureSeeded } from '../storage/seed'
import { exportJson, importJson, withoutOutbox } from '../storage/repo'
import { useTricksStore } from '../stores/tricks'
import { useTransitionsStore } from '../stores/transitions'
import { useSequencesStore } from '../stores/sequences'
import { useAuthStore } from '../stores/auth'
import { supabaseConfigured } from '../storage/supabase'
import { listOutbox } from '../storage/outbox'
import { flushOutbox, pullAll, pushLocalAll, runStartupSync } from '../storage/sync'
import { clearPositions } from '../utils/graphView'

const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()
const auth = useAuthStore()

const cloudConfigured = supabaseConfigured()
const email = ref('')
const magicSent = ref(false)
const queueLen = ref(0)
const pushArmed = ref(false)
let pushTimer: number | null = null

const reseedArmed = ref(false)
const resetLayoutArmed = ref(false)
const status = ref<string>('')
let reseedTimer: number | null = null
let resetLayoutTimer: number | null = null

function setStatus(msg: string) {
  status.value = msg
  window.setTimeout(() => {
    if (status.value === msg) status.value = ''
  }, 3000)
}

async function refreshQueue(): Promise<void> {
  queueLen.value = (await listOutbox()).length
}

onMounted(() => {
  if (cloudConfigured) void refreshQueue()
})

const lastSyncLabel = computed<string>(() => {
  if (!auth.lastSyncAt) return 'never'
  const delta = Date.now() - auth.lastSyncAt
  const sec = Math.floor(delta / 1000)
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
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

async function onSyncNow() {
  auth.markSyncStart()
  try {
    await flushOutbox()
    await pullAll()
  } catch (e) {
    setStatus(`Sync failed: ${(e as Error).message}`)
  } finally {
    auth.markSyncEnd()
    await refreshQueue()
  }
}

async function onRefreshSync() {
  await runStartupSync()
  await refreshQueue()
}

function armPushLocal() {
  if (pushArmed.value) {
    void doPushLocal()
    return
  }
  pushArmed.value = true
  if (pushTimer != null) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    pushArmed.value = false
    pushTimer = null
  }, 3000)
}

async function doPushLocal() {
  if (pushTimer != null) window.clearTimeout(pushTimer)
  pushTimer = null
  pushArmed.value = false
  auth.markSyncStart()
  try {
    const result = await pushLocalAll()
    console.log('[push] result', result)
    const { tricks, transitions, sequences, practice_log } = result.pushed
    setStatus(`Pushed: ${tricks}t · ${transitions}x · ${sequences}s · ${practice_log}log`)
  } catch (e) {
    console.error('[push] failed', e)
    setStatus(`Push failed: ${(e as Error).message}`)
  } finally {
    auth.markSyncEnd()
    await refreshQueue()
  }
}

async function onSignOut() {
  await auth.signOut()
  magicSent.value = false
  email.value = ''
}

function armResetLayout() {
  if (resetLayoutArmed.value) {
    clearPositions()
    resetLayoutArmed.value = false
    if (resetLayoutTimer != null) window.clearTimeout(resetLayoutTimer)
    resetLayoutTimer = null
    setStatus('Graph layout reset. Re-open Graph to apply.')
    return
  }
  resetLayoutArmed.value = true
  if (resetLayoutTimer != null) window.clearTimeout(resetLayoutTimer)
  resetLayoutTimer = window.setTimeout(() => {
    resetLayoutArmed.value = false
    resetLayoutTimer = null
  }, 3000)
}

function armReseed() {
  if (reseedArmed.value) {
    void doReseed()
    return
  }
  reseedArmed.value = true
  if (reseedTimer != null) window.clearTimeout(reseedTimer)
  reseedTimer = window.setTimeout(() => {
    reseedArmed.value = false
    reseedTimer = null
  }, 3000)
}

async function doReseed() {
  if (reseedTimer != null) window.clearTimeout(reseedTimer)
  reseedTimer = null
  reseedArmed.value = false
  await withoutOutbox(async () => {
    await db.transaction(
      'rw',
      db.tricks,
      db.transitions,
      db.sequences,
      db.practice_log,
      async () => {
        await db.tricks.clear()
        await db.transitions.clear()
        await db.sequences.clear()
        await db.practice_log.clear()
      },
    )
    await ensureSeeded()
  })
  tricksStore.tricks = []
  tricksStore.loaded = false
  transitionsStore.edges = []
  transitionsStore.loaded = false
  sequencesStore.sequences = []
  sequencesStore.loaded = false
  await Promise.all([tricksStore.load(), transitionsStore.load(), sequencesStore.load()])
  await refreshQueue()
  setStatus('Re-seeded from bundle.')
}

async function doExport() {
  const text = await exportJson()
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `slalom-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  setStatus('Exported.')
}

async function onImportFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  try {
    await importJson(text)
    tricksStore.tricks = []
    tricksStore.loaded = false
    await tricksStore.load()
    await refreshQueue()
    setStatus(`Imported ${file.name}.`)
  } catch (e) {
    setStatus(`Import failed: ${(e as Error).message}`)
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="p-4 flex flex-col gap-4">
    <h1 class="text-xl font-semibold">Settings</h1>

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
        <div class="flex items-center justify-between text-xs text-muted">
          <span>Last sync: {{ lastSyncLabel }}</span>
          <div class="flex items-center gap-2">
            <span
              class="inline-block w-1.5 h-1.5 rounded-full"
              :class="auth.online ? 'bg-rate-good' : 'bg-rate-bad'"
            />
            <span>{{ auth.online ? 'Online' : 'Offline' }}</span>
            <button
              type="button"
              class="ml-1 w-7 h-7 grid place-items-center rounded-md border border-border-2 text-fg text-sm hover:bg-border/40 disabled:opacity-50"
              :disabled="auth.syncing"
              :title="'Refresh sync'"
              @click="onRefreshSync"
            >{{ auth.syncing ? '…' : '↻' }}</button>
          </div>
        </div>

        <div class="text-xs text-muted">
          Outbox queue: <span class="font-semibold text-fg">{{ queueLen }}</span>
          <span v-if="queueLen > 0"> pending</span>
        </div>

        <button
          type="button"
          class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40 disabled:opacity-50"
          :disabled="auth.syncing"
          @click="onSyncNow"
        >{{ auth.syncing ? 'Syncing…' : 'Sync now' }}</button>

        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="pushArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-border-2 text-muted hover:text-fg hover:bg-border/40'"
          :disabled="auth.syncing"
          @click="armPushLocal"
        >{{ pushArmed ? 'Tap again to overwrite cloud' : 'Push local to cloud' }}</button>

        <button
          type="button"
          class="w-full py-2 rounded-lg border border-border-2 text-muted text-sm hover:text-fg hover:bg-border/40"
          @click="onSignOut"
        >Sign out</button>
      </template>
    </section>

    <section class="bg-card border border-border rounded-xl p-3">
      <h2 class="text-xs uppercase tracking-wide text-muted mb-2">Storage</h2>
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full bg-rate-good"></span>
        <span class="text-sm">Storage mode: <span class="font-semibold">Local (Dexie)</span></span>
      </div>
    </section>

    <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-3">
      <h2 class="text-xs uppercase tracking-wide text-muted">App</h2>
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
      <h2 class="text-xs uppercase tracking-wide text-muted">Data</h2>

      <button
        type="button"
        class="w-full py-2 rounded-lg text-sm transition-colors"
        :class="reseedArmed
          ? 'bg-danger text-fg font-semibold'
          : 'border border-border-2 text-fg hover:bg-border/40'"
        @click="armReseed"
      >{{ reseedArmed ? 'Tap again to wipe & re-seed' : 'Re-seed from bundle' }}</button>

      <button
        type="button"
        class="w-full py-2 rounded-lg text-sm transition-colors"
        :class="resetLayoutArmed
          ? 'bg-danger text-fg font-semibold'
          : 'border border-border-2 text-muted hover:text-fg hover:bg-border/40'"
        @click="armResetLayout"
      >{{ resetLayoutArmed ? 'Tap again to reset graph layout' : 'Reset graph layout' }}</button>

      <button
        type="button"
        class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40"
        @click="doExport"
      >Export JSON</button>

      <label class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40 text-center cursor-pointer">
        Import JSON
        <input
          type="file"
          accept="application/json"
          class="hidden"
          @change="onImportFile"
        >
      </label>
    </section>

    <p
      v-if="status"
      class="text-xs text-muted"
    >{{ status }}</p>
  </div>
</template>
