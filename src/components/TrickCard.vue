<script setup lang="ts">
import { computed } from 'vue'
import type { Trick } from '../domain/types'
import { displayName } from '../domain/display'
import RateDots from './RateDots.vue'

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
    class="bg-card border border-border rounded-xl p-3 cursor-pointer active:bg-border/40 transition-colors"
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
          class="text-fav"
          aria-label="favorite"
        >★</span>
        <span
          v-if="trick.icon"
          class="text-base leading-none"
        >{{ trick.icon }}</span>
        <span class="font-medium text-fg">{{ displayName(trick) }}</span>
      </div>
      <button
        type="button"
        class="shrink-0 -mt-0.5 -mr-1 p-1 rounded hover:bg-border/40"
        :class="hasVideoLink ? 'text-accent' : 'text-muted'"
        :title="hasVideoLink ? 'Watch tutorial' : 'Search tutorial on YouTube'"
        :aria-label="hasVideoLink ? 'Watch tutorial' : 'Search tutorial'"
        @click="onVideoClick"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
        </svg>
      </button>
    </div>

    <div class="text-muted text-xs mt-1 truncate">
      <span>{{ trick.category }}</span>
      <span v-if="otherAliases.length"> · aka {{ otherAliases.join(', ') }}</span>
      <span
        v-if="trick.tags.length"
        class="text-accent/80"
      > · {{ trick.tags.map(t => '#' + t).join(' ') }}</span>
    </div>

    <div class="mt-2">
      <RateDots
        :rate="trick.rate"
        :rate-l="trick.rateL"
        :rate-r="trick.rateR"
        :lr="trick.lr"
      />
    </div>
  </div>
</template>
