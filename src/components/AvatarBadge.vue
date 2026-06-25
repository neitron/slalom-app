<script setup lang="ts">
import { computed } from 'vue'
import type { Profile } from '../domain/types'
import { avatarBgColor, avatarMonogram } from '../domain/display'

type Props = {
  profile: Profile | null | undefined
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), { size: 'md' })

const dims = computed(() => {
  if (props.size === 'sm') return { box: 'w-7 h-7 text-[11px]', emoji: 'text-base' }
  if (props.size === 'lg') return { box: 'w-14 h-14 text-lg', emoji: 'text-3xl' }
  return { box: 'w-9 h-9 text-xs', emoji: 'text-xl' }
})

const bg = computed(() => avatarBgColor(props.profile?.id))
const mono = computed(() => avatarMonogram(props.profile))
</script>

<template>
  <div
    class="rounded-full flex items-center justify-center font-semibold select-none shrink-0"
    :class="dims.box"
    :style="profile?.avatarEmoji
      ? { background: 'var(--color-g-base-raised)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--color-g-fg)' }
      : { background: bg, border: '1px solid rgba(255,255,255,0.10)', color: 'var(--color-g-fg)' }"
    :aria-label="profile?.nickname || mono"
  >
    <span v-if="profile?.avatarEmoji" :class="dims.emoji">{{ profile.avatarEmoji }}</span>
    <span v-else>{{ mono }}</span>
  </div>
</template>
