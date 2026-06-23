<script setup lang="ts">
import { computed } from 'vue'
import type { Side, Transition, Trick } from '../domain/types'
import { displayName } from '../domain/display'
import RateDots from './RateDots.vue'

type Props = {
  edge: Transition
  fromTrick: Trick
  toTrick: Trick
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [edgeId: string]
}>()

const arrow = computed(() => (props.edge.bidi ? '⇄' : '→'))

function sideColor(side: Side): string {
  if (side === 'L') return 'var(--side-l)'
  if (side === 'R') return 'var(--side-r)'
  return 'var(--side-none)'
}

function onClick() {
  if (props.edge.id) emit('open', props.edge.id)
}
</script>

<template>
  <div
    class="bg-card border border-border rounded-xl p-3 cursor-pointer active:bg-border/40 transition-colors"
    role="button"
    tabindex="0"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
  >
    <div class="flex items-center gap-2 min-w-0">
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <span v-if="fromTrick.icon" class="text-base leading-none shrink-0">{{ fromTrick.icon }}</span>
        <span class="font-medium text-fg truncate">{{ displayName(fromTrick) }}</span>
        <span
          class="font-bold text-[11px] shrink-0"
          :style="{ color: sideColor(edge.fromSide) }"
        >{{ edge.fromSide ?? '–' }}</span>
        <span class="mx-1 text-muted shrink-0">{{ arrow }}</span>
        <span v-if="toTrick.icon" class="text-base leading-none shrink-0">{{ toTrick.icon }}</span>
        <span class="font-medium text-fg truncate">{{ displayName(toTrick) }}</span>
        <span
          class="font-bold text-[11px] shrink-0"
          :style="{ color: sideColor(edge.toSide) }"
        >{{ edge.toSide ?? '–' }}</span>
      </div>
    </div>

    <div class="text-muted text-xs mt-1 truncate">
      <span>{{ fromTrick.category }} → {{ toTrick.category }}</span>
      <span> · last: {{ edge.last ?? '—' }}</span>
    </div>

    <div class="mt-2">
      <RateDots :rate="edge.rate" :lr="false" />
    </div>
  </div>
</template>
