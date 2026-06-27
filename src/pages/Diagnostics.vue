<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import { BUILD_SHA, buildLabel } from '../utils/buildInfo'
import { IconBack } from '../icons'

declare const __BUILD_TIME__: string

const router = useRouter()
const auth = useAuthStore()
const tricksStore = useTricksStore()
const transitionsStore = useTransitionsStore()
const sequencesStore = useSequencesStore()

const cloudConfigured = supabaseConfigured()
const queueLen = ref(0)
const status = ref<string>('')
const built = __BUILD_TIME__

const pushArmed = ref(false)
const reseedArmed = ref(false)
const resetLayoutArmed = ref(false)
const importArmed = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)
let pushTimer: number | null = null
let reseedTimer: number | null = null
let resetLayoutTimer: number | null = null
let importTimer: number | null = null

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
    const { tricks, transitions, sequences, practice_log } = result.pushed
    setStatus(`Pushed: ${tricks}t · ${transitions}x · ${sequences}s · ${practice_log}log`)
  } catch (e) {
    setStatus(`Push failed: ${(e as Error).message}`)
  } finally {
    auth.markSyncEnd()
    await refreshQueue()
  }
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
  if (!file) {
    importArmed.value = false
    return
  }
  const text = await file.text()
  try {
    await importJson(text)
    tricksStore.tricks = []
    tricksStore.loaded = false
    transitionsStore.edges = []
    transitionsStore.loaded = false
    sequencesStore.sequences = []
    sequencesStore.loaded = false
    await Promise.all([tricksStore.load(), transitionsStore.load(), sequencesStore.load()])
    await refreshQueue()
    setStatus(`Imported ${file.name}.`)
  } catch (e) {
    setStatus(`Import failed: ${(e as Error).message}`)
  } finally {
    input.value = ''
    importArmed.value = false
  }
}

function armImport() {
  if (importArmed.value) {
    importInputRef.value?.click()
    return
  }
  importArmed.value = true
  if (importTimer != null) window.clearTimeout(importTimer)
  importTimer = window.setTimeout(() => {
    importArmed.value = false
    importTimer = null
  }, 3000)
}
</script>

<template>
  <div class="page-shell">
    <div class="page-aurora gw-aurora-bg-sm" aria-hidden="true" />
    <div class="page-scroll p-4 flex flex-col gap-4">
      <header class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-1.5 gw-glass-strong active:scale-95 transition-transform flex items-center justify-center gap-1"
          :style="{
            borderRadius: 'var(--radius-g-chip)',
            color: 'var(--color-g-fg-muted)',
            fontSize: 'var(--text-g-micro)',
          }"
          @click="router.push('/settings')"
        ><IconBack :size="14" stroke="1.75" /> Settings</button>
        <h1 class="text-xl font-semibold flex-1">Diagnostics</h1>
      </header>

      <section
        v-if="cloudConfigured"
        class="bg-card border border-border rounded-xl p-3 flex flex-col gap-3"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-xs uppercase tracking-wide text-muted">Sync</h2>
          <span
            v-if="!auth.isSignedIn"
            class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-border/60 text-muted"
          >Not signed in</span>
        </div>

        <template v-if="!auth.isSignedIn">
          <p class="text-xs text-muted">
            Sign in from Settings to enable sync.
          </p>
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
        <h2 class="text-xs uppercase tracking-wide text-muted">Data</h2>
        <button
          type="button"
          class="w-full py-2 rounded-lg border border-border-2 text-fg text-sm hover:bg-border/40"
          @click="doExport"
        >Export JSON</button>
      </section>

      <section class="bg-card border border-rate-bad/40 rounded-xl p-3 flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-rate-bad" />
          <h2 class="text-xs uppercase tracking-wide text-rate-bad">Danger zone</h2>
        </div>
        <p class="text-[10.5px] text-muted">Each action requires two taps to confirm.</p>

        <button
          v-if="cloudConfigured && auth.isSignedIn"
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="pushArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-rate-bad/40 text-rate-bad hover:bg-rate-bad/10'"
          :disabled="auth.syncing"
          @click="armPushLocal"
        >{{ pushArmed ? 'Tap again to overwrite cloud' : 'Push local to cloud' }}</button>

        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="resetLayoutArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-rate-bad/40 text-rate-bad hover:bg-rate-bad/10'"
          @click="armResetLayout"
        >{{ resetLayoutArmed ? 'Tap again to reset graph layout' : 'Reset graph layout' }}</button>

        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="reseedArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-rate-bad/40 text-rate-bad hover:bg-rate-bad/10'"
          @click="armReseed"
        >{{ reseedArmed ? 'Tap again to wipe & re-seed' : 'Re-seed from bundle' }}</button>

        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="importArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-rate-bad/40 text-rate-bad hover:bg-rate-bad/10'"
          @click="armImport"
        >{{ importArmed ? 'Tap again to choose file & replace' : 'Import JSON (replaces local data)' }}</button>
        <input
          ref="importInputRef"
          type="file"
          accept="application/json"
          class="hidden"
          @change="onImportFile"
        >
      </section>

      <p
        v-if="status"
        class="text-xs text-muted"
      >{{ status }}</p>

      <section class="bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
        <h2 class="text-xs uppercase tracking-wide text-muted">Build</h2>
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
            :style="{ fontSize: 'var(--text-g-micro)' }">
          <dt :style="{ color: 'var(--color-g-fg-muted)' }">SHA</dt>
          <dd style="font-family: ui-monospace, monospace;">
            <a
              :href="`https://github.com/neitron/slalom-app/commit/${BUILD_SHA}`"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:text-muted"
            >{{ buildLabel() }}</a>
          </dd>
          <dt :style="{ color: 'var(--color-g-fg-muted)' }">Built at</dt>
          <dd style="font-family: ui-monospace, monospace;">{{ built }}</dd>
        </dl>
      </section>
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
</style>
