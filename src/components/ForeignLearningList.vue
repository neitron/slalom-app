<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Trick } from '../domain/types'
import { displayName } from '../domain/display'
import { TIERS } from '../domain/constants'
import { resolveVideoUrl } from '../domain/video'
import { useUiStore } from '../stores/ui'
import RateDots from './RateDots.vue'

type Props = {
  tricks: Trick[]
  readonly?: boolean
  ownerNickname?: string
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  ownerNickname: '',
})

const uiStore = useUiStore()
const search = ref('')

const list = computed<Trick[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.tricks
  return props.tricks.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.aliases.some((a) => a.toLowerCase().includes(q)),
  )
})

function onOpen(t: Trick) {
  if (props.readonly) return
  if (t.id) uiStore.openSheet(t.id)
}

function onVideo(t: Trick, e: MouseEvent) {
  e.stopPropagation()
  const { url } = resolveVideoUrl(t)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    class="flex flex-col gap-2"
    :class="readonly ? 'rounded-xl border-l-4 border-l-fav/60 bg-fav/5 p-2' : ''"
  >
    <div
      v-if="readonly && ownerNickname"
      class="sticky top-[60px] z-[5] -mx-2 px-3 py-1.5 bg-fav/15 backdrop-blur border-y border-fav/30 flex items-center gap-2 text-[11px] font-semibold text-fav"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span class="truncate">Viewing @{{ ownerNickname }} (read-only)</span>
    </div>

    <input
      v-model="search"
      type="text"
      placeholder="Search…"
      autocapitalize="off"
      autocorrect="off"
      spellcheck="false"
      class="w-full px-3 py-2 rounded-lg bg-bg border border-border-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
    >

    <div v-if="!list.length" class="text-muted text-sm py-8 text-center">
      <template v-if="readonly">No tricks rated yet.</template>
      <template v-else>Nothing practiced yet. Report a trick to see it here.</template>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div
        v-for="t in list"
        :key="t.id"
        class="border rounded-xl p-3 transition-colors relative"
        :class="readonly
          ? 'cursor-default bg-card/40 border-dashed border-fav/30 grayscale-[0.6] opacity-80'
          : 'bg-card border-border cursor-pointer active:bg-border/40'"
        @click="onOpen(t)"
      >
        <span
          v-if="readonly"
          class="absolute top-1 right-1 text-[9px] uppercase tracking-wide font-bold text-fav/80 bg-bg/70 px-1.5 py-0.5 rounded"
        >view-only</span>
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
            <span v-if="t.fav" class="text-fav">★</span>
            <span v-if="t.icon" class="text-base leading-none">{{ t.icon }}</span>
            <span class="font-medium" :class="readonly ? 'text-muted' : 'text-fg'">{{ displayName(t) }}</span>
          </div>
          <button
            type="button"
            class="shrink-0 -mt-0.5 -mr-1 p-1 rounded hover:bg-border/40"
            :class="t.video ? 'text-accent' : 'text-muted'"
            :title="t.video ? 'Watch tutorial' : 'Search tutorial'"
            @click="onVideo(t, $event)"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          </button>
        </div>
        <div class="text-muted text-xs mt-1 truncate">
          <span class="text-accent/80">{{ TIERS[t.tier] }}</span>
          <span> · {{ t.category }}</span>
          <span v-if="t.aliases.filter(a => a !== t.mainAlias).length"> · aka {{ t.aliases.filter(a => a !== t.mainAlias).join(', ') }}</span>
          <span v-if="t.tags.length" class="text-accent/80"> · {{ t.tags.map(x => '#' + x).join(' ') }}</span>
        </div>
        <div class="mt-2 pointer-events-none">
          <RateDots :rate="t.rate" :rate-l="t.rateL" :rate-r="t.rateR" :lr="t.lr" />
        </div>
      </div>
    </div>
  </div>
</template>
