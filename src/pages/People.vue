<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useFriendsStore } from '../stores/friends'
import { useProfileStore } from '../stores/profile'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import ProfileSearchResult from '../components/ProfileSearchResult.vue'
import AvatarBadge from '../components/AvatarBadge.vue'
import ShareProfile from '../components/ShareProfile.vue'
import { nicknameDisplay } from '../domain/display'
import { fetchProfilesByIds, getProfileByNickname } from '../storage/social'
import type { Profile } from '../domain/types'
import { IconChevronDown, IconChevronRight } from '../icons'

const friends = useFriendsStore()
const profile = useProfileStore()
const auth = useAuthStore()
const ui = useUiStore()

const search = ref('')
const searchResults = ref<Profile[]>([])
const searching = ref(false)
const showBlocked = ref(false)
let searchTimer: number | null = null

const profilesById = ref<Record<string, Profile>>({})

async function hydrateMissingProfiles(ids: string[]) {
  const missing = ids.filter((id) => !profilesById.value[id])
  if (!missing.length) return
  try {
    const fetched = await fetchProfilesByIds(missing)
    const byId: Record<string, Profile> = { ...profilesById.value }
    for (const p of fetched) byId[p.id] = p
    for (const id of missing) {
      if (!byId[id]) {
        byId[id] = {
          id, nickname: null, displayName: null, avatarEmoji: null, bio: null,
          visibility: 'private', nicknameChangedAt: null, createdAt: null, updatedAt: null,
        }
      }
    }
    profilesById.value = byId
  } catch (e) {
    ui.showError(`Couldn't load profiles: ${(e as Error).message}`)
  }
}

onMounted(async () => {
  if (auth.isSignedIn) {
    await friends.loadAll()
    if (!profile.profile) await profile.load()
    const allIds = new Set<string>()
    for (const f of friends.friendships) {
      allIds.add(f.requesterId === auth.currentUserId ? f.addresseeId : f.requesterId)
    }
    for (const b of friends.blocks) allIds.add(b.blockedId)
    await hydrateMissingProfiles([...allIds])
  }
})

watch(search, async (q) => {
  if (searchTimer != null) window.clearTimeout(searchTimer)
  if (q.trim().length < 2) {
    searchResults.value = []
    return
  }
  searchTimer = window.setTimeout(async () => {
    searching.value = true
    try {
      const res = await friends.searchByNickname(q.trim(), 20)
      searchResults.value = res
      for (const p of res) profilesById.value[p.id] = p
    } catch (e) {
      ui.showError(`Search failed: ${(e as Error).message}`)
    } finally {
      searching.value = false
    }
  }, 300)
})

const incoming = computed(() => friends.incoming)
const friendsList = computed(() => friends.accepted)
const blocked = computed(() => friends.blocks)

function otherIdOf(f: { requesterId: string; addresseeId: string }): string {
  const uid = auth.currentUserId
  return f.requesterId === uid ? f.addresseeId : f.requesterId
}

async function accept(id: string) { await friends.accept(id) }
async function decline(id: string) { await friends.decline(id) }
async function unblock(blockedId: string) { await friends.unblock(blockedId) }

async function tryNavSearch() {
  const q = search.value.trim()
  if (!q) return
  try {
    const p = await getProfileByNickname(q)
    if (p?.nickname) {
      window.location.hash = `#/u/${p.nickname}`
    } else {
      ui.showError(`No user matches @${q}`)
    }
  } catch (e) {
    ui.showError(`Lookup failed: ${(e as Error).message}`)
  }
}
</script>

<template>
  <div class="p-3 flex flex-col gap-3">
    <h1 class="text-lg font-semibold">People</h1>

    <div
      v-if="!auth.isSignedIn"
      class="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
    >
      <p class="text-sm text-muted">Sign in to find friends and share your progress.</p>
      <RouterLink
        to="/settings"
        class="min-h-[44px] grid place-items-center rounded-lg bg-accent text-bg text-sm font-semibold"
      >Go to Settings to sign in</RouterLink>
    </div>

    <template v-else>
      <div
        v-if="profile.profile?.nickname"
        class="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
      >
        <AvatarBadge :profile="profile.profile" size="lg" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">{{ nicknameDisplay(profile.profile) }}</div>
          <div class="text-[11px] text-muted truncate">@{{ profile.profile.nickname }}</div>
        </div>
      </div>
      <div
        v-else
        class="bg-card border border-border rounded-xl p-3 flex flex-col gap-2"
      >
        <p class="text-sm text-muted">Pick a nickname so friends can find you.</p>
        <RouterLink
          to="/onboarding/nickname"
          class="px-3 py-2 rounded-lg bg-accent text-bg text-sm font-semibold text-center"
        >Pick a nickname</RouterLink>
      </div>

      <ShareProfile />

      <div class="sticky top-0 bg-bg/95 backdrop-blur z-10 -mx-3 px-3 py-2 border-b border-border">
        <input
          v-model="search"
          type="text"
          placeholder="Find by @nickname"
          autocomplete="off"
          class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
          @keydown.enter="tryNavSearch"
        >
      </div>

      <section v-if="search.trim().length >= 2" class="flex flex-col gap-1">
        <div class="text-xs uppercase tracking-wide text-muted">
          <template v-if="searching">Searching…</template>
          <template v-else-if="!searchResults.length">No matches</template>
          <template v-else>Search results</template>
        </div>
        <ProfileSearchResult
          v-for="p in searchResults"
          :key="p.id"
          :profile="p"
        />
      </section>

      <section v-if="incoming.length" class="flex flex-col gap-1">
        <div class="text-xs uppercase tracking-wide text-muted">Incoming requests</div>
        <div
          v-for="f in incoming"
          :key="f.id"
          class="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
        >
          <AvatarBadge :profile="profilesById[otherIdOf(f)] ?? null" size="md" />
          <div class="flex-1 text-sm truncate">{{ nicknameDisplay(profilesById[otherIdOf(f)] ?? null) || otherIdOf(f).slice(0,8) }}</div>
          <button
            type="button"
            class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm bg-accent text-bg font-semibold"
            @click="accept(f.id)"
          >Accept</button>
          <button
            type="button"
            class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-border-2 text-muted"
            @click="decline(f.id)"
          >Decline</button>
        </div>
      </section>

      <section class="flex flex-col gap-1">
        <div class="text-xs uppercase tracking-wide text-muted">Friends</div>
        <div v-if="!friendsList.length" class="text-sm text-muted p-3 text-center">No friends yet. Search for a nickname above.</div>
        <ProfileSearchResult
          v-for="f in friendsList"
          :key="f.id"
          :profile="(profilesById[otherIdOf(f)] ?? null) || { id: otherIdOf(f), nickname: null, displayName: null, avatarEmoji: null, bio: null, visibility: 'private', nicknameChangedAt: null, createdAt: null, updatedAt: null }"
        />
      </section>

      <section v-if="blocked.length" class="flex flex-col gap-1">
        <button
          type="button"
          class="text-xs uppercase tracking-wide text-muted text-left flex items-center gap-2"
          @click="showBlocked = !showBlocked"
        >
          <span>Blocked ({{ blocked.length }})</span>
          <component :is="showBlocked ? IconChevronDown : IconChevronRight" :size="14" stroke="1.75" />
        </button>
        <div v-if="showBlocked" class="flex flex-col gap-1">
          <div
            v-for="b in blocked"
            :key="b.blockedId"
            class="flex items-center gap-2 p-2 rounded-lg bg-card border border-border"
          >
            <AvatarBadge :profile="profilesById[b.blockedId] ?? null" size="md" />
            <div class="flex-1 text-sm truncate">{{ nicknameDisplay(profilesById[b.blockedId] ?? null) || b.blockedId.slice(0,8) }}</div>
            <button
              type="button"
              class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-rate-bad/40 text-rate-bad"
              @click="unblock(b.blockedId)"
            >Unblock</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
