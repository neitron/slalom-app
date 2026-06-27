<script setup lang="ts">
import type { Side, Transition, Trick } from '../domain/types'
import { displayName } from '../domain/display'
import RateDots from './RateDots.vue'
import { IconBidi, IconArrowRight } from '../icons'

type Props = {
  edge: Transition
  fromTrick: Trick
  toTrick: Trick
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [edgeId: string]
}>()

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
    class="gw-glass cursor-pointer active:opacity-90 transition-opacity"
    :style="{
      padding: '12px 14px',
      borderRadius: 'var(--radius-g-panel)',
    }"
    role="button"
    tabindex="0"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
  >
    <div class="flex items-center gap-2 min-w-0">
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <span v-if="fromTrick.icon" class="text-base leading-none shrink-0">{{ fromTrick.icon }}</span>
        <span
          class="font-medium truncate"
          :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
        >{{ displayName(fromTrick) }}</span>
        <span
          class="font-bold shrink-0"
          :style="{ fontSize: '11px', color: sideColor(edge.fromSide) }"
        >{{ edge.fromSide ?? '–' }}</span>
        <component :is="props.edge.bidi ? IconBidi : IconArrowRight" :size="14" stroke="1.75" class="mx-1 shrink-0" :style="{ color: 'var(--color-g-fg-muted)' }" />
        <span v-if="toTrick.icon" class="text-base leading-none shrink-0">{{ toTrick.icon }}</span>
        <span
          class="font-medium truncate"
          :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
        >{{ displayName(toTrick) }}</span>
        <span
          class="font-bold shrink-0"
          :style="{ fontSize: '11px', color: sideColor(edge.toSide) }"
        >{{ edge.toSide ?? '–' }}</span>
      </div>
    </div>

    <div
      class="mt-1 truncate"
      :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
    >
      <span>{{ fromTrick.category }} → {{ toTrick.category }}</span>
      <span> · last: {{ edge.last ?? '—' }}</span>
    </div>

    <div class="mt-2">
      <RateDots :rate="edge.rate" :lr="false" />
    </div>
  </div>
</template>
