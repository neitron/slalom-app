<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useFriendsStore } from '../stores/friends'
import { useProfileStore } from '../stores/profile'
import { computeFriendButtonState } from '../domain/friendship'
import type { Profile } from '../domain/types'

type Props = {
  target: Profile
}

const props = defineProps<Props>()

const auth = useAuthStore()
const friends = useFriendsStore()
const profile = useProfileStore()
const busy = ref(false)

const state = computed(() =>
  computeFriendButtonState({
    viewerId: auth.currentUserId,
    targetId: props.target.id,
    ownNicknameClaimed: !!profile.profile?.nickname,
    friendships: friends.friendships,
    blocks: friends.blocks,
  }),
)

const rel = computed(() => {
  const uid = auth.currentUserId
  return friends.friendships.find(
    (f) =>
      (f.requesterId === uid && f.addresseeId === props.target.id) ||
      (f.requesterId === props.target.id && f.addresseeId === uid),
  )
})

async function onSend() {
  if (!profile.profile?.nickname) return
  busy.value = true
  try {
    await friends.sendRequest(props.target.id)
  } finally {
    busy.value = false
  }
}

async function onAccept() {
  if (!rel.value) return
  busy.value = true
  try {
    await friends.accept(rel.value.id)
  } finally {
    busy.value = false
  }
}

async function onDecline() {
  if (!rel.value) return
  busy.value = true
  try {
    await friends.decline(rel.value.id)
  } finally {
    busy.value = false
  }
}

async function onCancel() {
  if (!rel.value) return
  busy.value = true
  try {
    await friends.cancel(rel.value.id)
  } finally {
    busy.value = false
  }
}

async function onUnfriend() {
  busy.value = true
  try {
    await friends.unfriend(props.target.id)
  } finally {
    busy.value = false
  }
}

async function onUnblock() {
  busy.value = true
  try {
    await friends.unblock(props.target.id)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <span v-if="state === 'self'" />

  <button
    v-else-if="state === 'no_nickname'"
    type="button"
    class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-border-2 text-muted cursor-not-allowed"
    :title="'Pick a nickname to send friend requests'"
    disabled
  >Add friend</button>

  <button
    v-else-if="state === 'none'"
    type="button"
    class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm bg-accent text-bg font-semibold disabled:opacity-50"
    :disabled="busy"
    @click="onSend"
  >{{ busy ? 'Sending…' : 'Add friend' }}</button>

  <button
    v-else-if="state === 'pending_outgoing'"
    type="button"
    class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-border-2 text-muted disabled:opacity-50"
    :disabled="busy"
    @click="onCancel"
  >{{ busy ? '…' : 'Requested · cancel' }}</button>

  <div v-else-if="state === 'pending_incoming'" class="flex gap-2">
    <button
      type="button"
      class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm bg-accent text-bg font-semibold disabled:opacity-50"
      :disabled="busy"
      @click="onAccept"
    >{{ busy ? '…' : 'Accept' }}</button>
    <button
      type="button"
      class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-border-2 text-muted disabled:opacity-50"
      :disabled="busy"
      @click="onDecline"
    >Decline</button>
  </div>

  <button
    v-else-if="state === 'friends'"
    type="button"
    class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-border-2 text-muted disabled:opacity-50"
    :disabled="busy"
    @click="onUnfriend"
  >{{ busy ? '…' : 'Friends · unfriend' }}</button>

  <button
    v-else-if="state === 'blocked_by_me'"
    type="button"
    class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-rate-bad/40 text-rate-bad disabled:opacity-50"
    :disabled="busy"
    @click="onUnblock"
  >{{ busy ? '…' : 'Unblock' }}</button>

  <span
    v-else-if="state === 'blocked_by_them'"
    class="min-h-[44px] px-3 py-2.5 rounded-lg text-sm border border-border-2 text-muted"
  >Unavailable</span>
</template>
