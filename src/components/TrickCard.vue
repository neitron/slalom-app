<script setup lang="ts">
import { computed } from 'vue'
import type { Trick } from '../domain/types'
import { displayName } from '../domain/display'
import { autosizeIcon } from '../utils/graphemes'
import RateDots from './RateDots.vue'
import { IconFavOn, IconBrandYoutube } from '../icons'

type Props = {
  trick: Trick
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [trick: Trick]
  video: [trick: Trick]
}>()

const hasVideoLink = computed(() => !!props.trick.video)

const otherAliases = computed(() =>
  props.trick.aliases.filter((a) => a !== props.trick.mainAlias),
)

function onCardClick() {
  emit('open', props.trick)
}

function onVideoClick(e: MouseEvent) {
  e.stopPropagation()
  emit('video', props.trick)
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
    @click="onCardClick"
    @keydown.enter="onCardClick"
    @keydown.space.prevent="onCardClick"
  >
    <div class="flex items-start gap-2">
      <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        <span
          v-if="trick.fav"
          :style="{ color: 'var(--color-g-brand)' }"
          aria-label="favorite"
        ><IconFavOn :size="14" stroke="1.75" /></span>
        <span
          v-if="trick.icon"
          class="leading-none whitespace-nowrap"
          :style="{ fontSize: autosizeIcon(trick.icon, 16) + 'px' }"
        >{{ trick.icon }}</span>
        <span
          class="font-semibold"
          :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
        >{{ displayName(trick) }}</span>
      </div>
      <button
        type="button"
        class="shrink-0 -mt-0.5 -mr-1 p-1.5 rounded transition-colors"
        :style="{
          color: hasVideoLink ? 'var(--color-g-brand)' : 'var(--color-g-fg-muted)',
        }"
        :title="hasVideoLink ? 'Watch tutorial' : 'Search tutorial on YouTube'"
        :aria-label="hasVideoLink ? 'Watch tutorial' : 'Search tutorial'"
        @click="onVideoClick"
      >
        <IconBrandYoutube :size="20" stroke="1.75" />
      </button>
    </div>

    <div class="mt-1.5 flex items-center gap-3">
      <div
        class="min-w-0 flex-1 truncate"
        :style="{ fontSize: 'var(--text-g-micro)', color: 'var(--color-g-fg-muted)' }"
      >
        <span>{{ trick.category }}</span>
        <span v-if="otherAliases.length"> · aka {{ otherAliases.join(', ') }}</span>
        <span
          v-if="trick.tags.length"
          :style="{ color: 'var(--color-g-brand-sky)' }"
        > · {{ trick.tags.map(t => '#' + t).join(' ') }}</span>
      </div>
      <div class="shrink-0">
        <RateDots
          :rate="trick.rate"
          :rate-l="trick.rateL"
          :rate-r="trick.rateR"
          :lr="trick.lr"
        />
      </div>
    </div>
  </div>
</template>
