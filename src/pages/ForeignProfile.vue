<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProfileById, getProfileByNickname } from '../storage/social'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
import { useForeignProgressStore } from '../stores/foreignProgress'
import { useAuthStore } from '../stores/auth'
import { useFriendsStore } from '../stores/friends'
import { useUiStore } from '../stores/ui'
import AvatarBadge from '../components/AvatarBadge.vue'
import FriendButton from '../components/FriendButton.vue'
import ForeignLearningList from '../components/ForeignLearningList.vue'
import { nicknameDisplay } from '../domain/display'
import type { Profile } from '../domain/types'

const route = useRoute()
const router = useRouter()
const foreign = useForeignProgressStore()
const auth = useAuthStore()
const friends = useFriendsStore()
const ui = useUiStore()

const resolved = ref<Profile | null>(null)
const resolving = ref(true)
const notFound = ref(false)
const loadError = ref<string | null>(null)
const lastNickname = ref<string>('')
const view = ref<'tricks' | 'transitions' | 'sequences'>('tricks')

async function resolve(nickname: string) {
  lastNickname.value = nickname
  resolving.value = true
  notFound.value = false
  loadError.value = null
  try {
    const p = UUID_RE.test(nickname)
      ? await getProfileById(nickname)
      : await getProfileByNickname(nickname)
    if (!p) {
      notFound.value = true
      resolved.value = null
      return
    }
    resolved.value = p
    if (p.nickname && p.nickname !== nickname) {
      router.replace(`/u/${p.nickname}`)
      return
    }
    if (auth.currentUserId === p.id) {
      router.replace('/learning')
      return
    }
    await friends.loadAll()
    await foreign.load(p)
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e)
    console.warn('[foreign] resolve failed', e)
    loadError.value = msg
    resolved.value = null
    ui.showError(`Couldn't load profile: ${msg}`)
  } finally {
    resolving.value = false
  }
}

function retry() {
  if (lastNickname.value) void resolve(lastNickname.value)
}

watch(
  () => route.params.nickname,
  (n) => {
    const nick = Array.isArray(n) ? n[0] : n
    if (nick) void resolve(nick)
  },
  { immediate: true },
)

const entry = computed(() => (resolved.value ? foreign.get(resolved.value.id) : null))

const segLabel = computed(() => `@${resolved.value?.nickname ?? ''}'s`)

function back() {
  if (window.history.length > 1) router.back()
  else void router.push('/people')
}
</script>

<template>
  <div class="p-3 flex flex-col gap-3">
    <div v-if="resolving" class="text-muted text-sm text-center py-8">Loading…</div>

    <div v-else-if="loadError" class="bg-card border border-border rounded-xl p-6 flex flex-col gap-3 items-center">
      <div class="text-lg font-semibold">Couldn't load profile</div>
      <div class="text-xs text-muted text-center">{{ loadError }}</div>
      <div class="flex gap-2">
        <button type="button" class="min-h-[44px] px-4 py-2.5 rounded-lg border border-border-2 text-sm" @click="back">Back</button>
        <button type="button" class="min-h-[44px] px-4 py-2.5 rounded-lg bg-accent text-bg text-sm font-semibold" @click="retry">Retry</button>
      </div>
    </div>

    <div v-else-if="notFound" class="bg-card border border-border rounded-xl p-6 flex flex-col gap-3 items-center">
      <div class="text-lg font-semibold">User not found</div>
      <button type="button" class="min-h-[44px] px-4 py-2.5 rounded-lg border border-border-2 text-sm" @click="back">Back</button>
    </div>

    <template v-else-if="resolved">
      <div class="sticky top-0 z-10 -mx-3 px-3 py-2 bg-bg/95 backdrop-blur border-b border-border flex items-center gap-3">
        <button
          type="button"
          class="w-11 h-11 grid place-items-center rounded-md border border-border-2 text-fg hover:bg-border/40"
          aria-label="Back"
          @click="back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <AvatarBadge :profile="resolved" size="md" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold truncate">{{ nicknameDisplay(resolved) }}</div>
          <div class="text-[11px] text-muted truncate">@{{ resolved.nickname }}</div>
        </div>
        <FriendButton :target="resolved" />
      </div>

      <div class="border-l-4 border-l-fav bg-fav/10 rounded-r-md px-3 py-2 text-xs text-muted">
        Viewing @{{ resolved.nickname }}
        <span v-if="resolved.bio"> · {{ resolved.bio }}</span>
      </div>

      <div v-if="entry?.reason === 'private'" class="bg-card border border-border rounded-xl p-6 text-center">
        <div class="text-base font-semibold mb-1">This profile is private</div>
        <div class="text-xs text-muted">Only the owner can see progress here.</div>
      </div>

      <div v-else-if="entry?.reason === 'friends_only'" class="bg-card border border-border rounded-xl p-6 text-center flex flex-col items-center gap-3">
        <div class="text-base font-semibold">Friends only</div>
        <div class="text-xs text-muted">Send a request to see progress.</div>
        <FriendButton :target="resolved" />
      </div>

      <div v-else-if="entry?.reason === 'blocked'" class="bg-card border border-border rounded-xl p-6 text-center">
        <div class="text-base font-semibold mb-1">Unavailable</div>
        <div class="text-xs text-muted">You have blocked this user.</div>
      </div>

      <template v-else-if="entry?.reason === 'ok'">
        <div v-if="!auth.online && entry.cachedAt" class="text-[11px] text-muted px-1">
          Cached snapshot from {{ new Date(entry.cachedAt).toLocaleTimeString() }}.
        </div>

        <div class="flex gap-1 bg-card border border-border rounded-lg p-1">
          <button
            v-for="opt in (['tricks','transitions','sequences'] as const)"
            :key="opt"
            type="button"
            class="flex-1 min-h-[44px] px-2 py-2.5 rounded-md text-sm"
            :class="view === opt ? 'bg-accent text-bg font-semibold' : 'text-muted'"
            @click="view = opt"
          >{{ opt[0].toUpperCase() + opt.slice(1) }}</button>
        </div>

        <div v-if="entry.loading" class="text-muted text-sm text-center py-8">Loading {{ segLabel }} progress…</div>

        <template v-else>
          <ForeignLearningList
            v-if="view === 'tricks'"
            :tricks="entry.tricks"
            :readonly="true"
            :owner-nickname="resolved.nickname || ''"
          />
          <div v-else-if="view === 'transitions'">
            <div v-if="!entry.transitions.length" class="text-muted text-sm py-8 text-center">No transitions rated yet.</div>
            <div v-else class="flex flex-col gap-2">
              <div
                v-for="x in entry.transitions"
                :key="x.id"
                class="bg-card border border-border rounded-xl p-3 opacity-95"
              >
                <div class="text-sm truncate">{{ x.from }} → {{ x.to }}</div>
                <div class="text-[11px] text-muted">rate: {{ x.rate ?? '—' }} · last: {{ x.last ?? '—' }}</div>
              </div>
            </div>
          </div>
          <div v-else-if="view === 'sequences'">
            <div v-if="!entry.sequences.length" class="text-muted text-sm py-8 text-center">No sequences rated yet.</div>
            <div v-else class="flex flex-col gap-2">
              <div
                v-for="s in entry.sequences"
                :key="s.id"
                class="bg-card border border-border rounded-xl p-3 opacity-95"
              >
                <div class="text-sm font-medium truncate">{{ s.name }}</div>
                <div class="text-[11px] text-muted">rate: {{ s.rate ?? '—' }} · last: {{ s.last ?? '—' }}</div>
              </div>
            </div>
          </div>
        </template>
      </template>

      <div v-else-if="entry?.error" class="text-sm text-rate-bad p-3 text-center">{{ entry.error }}</div>
    </template>
  </div>
</template>
