<script setup lang="ts">
import { computed } from 'vue'
import type { Profile } from '../domain/types'
import { useFriendsStore } from '../stores/friends'
import { useAuthStore } from '../stores/auth'
import AvatarBadge from './AvatarBadge.vue'
import { nicknameDisplay } from '../domain/display'

type Props = { profile: Profile }
const props = defineProps<Props>()

const friends = useFriendsStore()
const auth = useAuthStore()

const chip = computed<string | null>(() => {
  const uid = auth.currentUserId
  if (!uid) return null
  if (uid === props.profile.id) return 'You'
  if (friends.isBlockedByMe(props.profile.id)) return 'Blocked'
  if (friends.isFriend(props.profile.id)) return 'Friend'
  const rel = friends.friendships.find(
    (f) =>
      (f.requesterId === uid && f.addresseeId === props.profile.id) ||
      (f.requesterId === props.profile.id && f.addresseeId === uid),
  )
  if (rel?.status === 'pending') return 'Pending'
  return null
})
</script>

<template>
  <RouterLink
    :to="`/u/${profile.nickname || profile.id}`"
    class="gw-glass flex items-center gap-3 p-2"
    :style="{ borderRadius: 'var(--radius-g-chip)' }"
  >
    <AvatarBadge :profile="profile" size="md" />
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium truncate" :style="{ color: 'var(--color-g-fg)' }">{{ nicknameDisplay(profile) }}</div>
      <div class="text-[11px] truncate" :style="{ color: 'var(--color-g-fg-muted)' }">@{{ profile.nickname || '—' }}</div>
    </div>
    <span
      v-if="chip"
      class="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
      :style="{ background: 'var(--color-g-fg)10', color: 'var(--color-g-fg-muted)' }"
    >{{ chip }}</span>
  </RouterLink>
</template>
