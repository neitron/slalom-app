<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { supabaseConfigured } from '../storage/supabase'
import { listOutbox } from '../storage/outbox'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const configured = supabaseConfigured()
const queueLen = ref(0)
let timer: number | null = null

async function refresh(): Promise<void> {
  queueLen.value = (await listOutbox()).length
}

onMounted(() => {
  if (!configured) return
  void refresh()
  timer = window.setInterval(() => {
    void refresh()
  }, 4000)
})

onUnmounted(() => {
  if (timer != null) window.clearInterval(timer)
})

const color = computed<string>(() => {
  if (!auth.online) return 'var(--rate-bad)'
  if (!auth.isSignedIn) return 'var(--rate-none)'
  if (auth.syncing || queueLen.value > 0) return 'var(--rate-mid)'
  return 'var(--rate-good)'
})

const title = computed<string>(() => {
  if (!auth.online) return 'Offline'
  if (!auth.isSignedIn) return 'Signed out'
  if (auth.syncing) return 'Syncing…'
  if (queueLen.value > 0) return `${queueLen.value} pending`
  return 'Synced'
})
</script>

<template>
  <span
    v-if="configured"
    class="inline-block rounded-full"
    :style="{ width: '6px', height: '6px', backgroundColor: color }"
    :title="title"
    :aria-label="title"
  />
</template>
