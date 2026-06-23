<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { TIERS } from '../domain/constants'
import { effectiveRate, statusOf } from '../domain/rating'
import { resolveVideoUrl } from '../domain/video'
import type { Side, Trick } from '../domain/types'
import RateDots from './RateDots.vue'
import RateButtons from './RateButtons.vue'

const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let startScrollTop = 0
let active = false
const CLOSE_THRESHOLD = 100

function onTouchStart(e: TouchEvent) {
  startScrollTop = panelRef.value?.scrollTop ?? 0
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}

function onTouchMove(e: TouchEvent) {
  if (startScrollTop > 0) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0) return
  active = true
  dragging.value = true
  dragY.value = dy
}

function onTouchEnd() {
  dragging.value = false
  if (!active) { dragY.value = 0; return }
  active = false
  if (dragY.value > CLOSE_THRESHOLD) {
    close()
    dragY.value = 0
  } else {
    dragY.value = 0
  }
}

const tricksStore = useTricksStore()
const uiStore = useUiStore()

const trick = computed<Trick | undefined>(() =>
  uiStore.openSheetTrickId ? tricksStore.byId(uiStore.openSheetTrickId) : undefined,
)

const isOpen = computed(() => !!trick.value)

const editingEmoji = ref(false)
const emojiDraft = ref('')
const aliasDraft = ref('')
const tagDraft = ref('')
const videoDraft = ref('')

const resetArmed = ref(false)
let resetTimer: number | null = null

function clearResetTimer() {
  if (resetTimer != null) {
    window.clearTimeout(resetTimer)
    resetTimer = null
  }
}

function armReset() {
  if (resetArmed.value) {
    void doReset()
    return
  }
  resetArmed.value = true
  clearResetTimer()
  resetTimer = window.setTimeout(() => {
    resetArmed.value = false
    resetTimer = null
  }, 3000)
}

async function doReset() {
  clearResetTimer()
  resetArmed.value = false
  if (!trick.value?.id) return
  await tricksStore.resetProgress(trick.value.id)
}

watch(
  () => trick.value?.id,
  (id) => {
    editingEmoji.value = false
    emojiDraft.value = trick.value?.icon ?? ''
    aliasDraft.value = ''
    tagDraft.value = ''
    videoDraft.value = trick.value?.video ?? ''
    resetArmed.value = false
    clearResetTimer()
    uiStore.clearFeedback()
    if (id) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  clearResetTimer()
  document.body.style.overflow = ''
})

function close() {
  uiStore.closeSheet()
}

function effRate(t: Trick): number | null {
  return effectiveRate(t)
}

function status(t: Trick): string {
  return statusOf(t)
}

async function onReport(payload: { score: 1 | 2 | 3 | 4 | 5; side: Side }) {
  if (!trick.value?.id) return
  uiStore.triggerFeedback({ score: payload.score, side: payload.side, context: 'trick' })
  await tricksStore.report(trick.value.id, payload.side, payload.score)
}

async function toggleFav() {
  if (!trick.value?.id) return
  await tricksStore.toggleFav(trick.value.id)
}

async function toggleLr() {
  if (!trick.value?.id) return
  await tricksStore.toggleLr(trick.value.id)
}

async function saveEmoji() {
  if (!trick.value?.id) return
  const v = emojiDraft.value.trim()
  await tricksStore.updateEmoji(trick.value.id, v || null)
  editingEmoji.value = false
}

async function clearEmoji() {
  if (!trick.value?.id) return
  emojiDraft.value = ''
  await tricksStore.updateEmoji(trick.value.id, null)
}

async function addAlias() {
  const v = aliasDraft.value.trim()
  if (!v || !trick.value?.id) return
  const next = [...trick.value.aliases]
  if (!next.includes(v)) next.push(v)
  await tricksStore.updateAliases(trick.value.id, next)
  aliasDraft.value = ''
}

async function removeAlias(a: string) {
  if (!trick.value?.id) return
  const next = trick.value.aliases.filter((x) => x !== a)
  await tricksStore.updateAliases(trick.value.id, next)
}

async function addTag() {
  const v = tagDraft.value.trim().replace(/^#/, '')
  if (!v || !trick.value?.id) return
  const next = [...trick.value.tags]
  if (!next.includes(v)) next.push(v)
  await tricksStore.updateTags(trick.value.id, next)
  tagDraft.value = ''
}

async function removeTag(tag: string) {
  if (!trick.value?.id) return
  const next = trick.value.tags.filter((x) => x !== tag)
  await tricksStore.updateTags(trick.value.id, next)
}

async function saveVideo() {
  if (!trick.value?.id) return
  const v = videoDraft.value.trim()
  await tricksStore.updateVideo(trick.value.id, v || null)
}

function openVideo() {
  if (!trick.value) return
  const { url } = resolveVideoUrl(trick.value)
  window.open(url, '_blank', 'noopener,noreferrer')
}

const video = computed(() => (trick.value ? resolveVideoUrl(trick.value) : null))
</script>

<template>
  <div
    v-if="isOpen && trick"
    class="fixed left-0 right-0 top-0 z-50 flex items-end overflow-hidden"
    style="height: 100dvh"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="absolute inset-0 bg-black/60"
      @click="close"
    />

    <div
      ref="panelRef"
      class="relative w-full bg-card rounded-t-xl p-4 pt-2 max-h-[90dvh] overflow-y-auto border-t border-border touch-pan-y overscroll-contain"
      :style="{
        transform: `translateY(${dragY}px)`,
        transition: dragging ? 'none' : 'transform 0.2s ease-out',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <div class="flex justify-center pb-2 -mt-1 cursor-grab active:cursor-grabbing">
        <div class="w-10 h-1 rounded-full bg-border-2" />
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="p-1 text-lg"
          :class="trick.fav ? 'text-fav' : 'text-muted hover:text-fav'"
          :aria-label="trick.fav ? 'Unfavorite' : 'Favorite'"
          @click="toggleFav"
        >★</button>
        <span v-if="trick.icon" class="text-xl leading-none">{{ trick.icon }}</span>
        <h2 class="flex-1 text-lg font-semibold truncate">{{ trick.name }}</h2>
        <button
          type="button"
          class="p-1 text-muted hover:text-fg"
          aria-label="Edit emoji"
          @click="editingEmoji = !editingEmoji"
        >✎</button>
        <button
          type="button"
          class="p-1 text-muted hover:text-fg"
          aria-label="Close"
          @click="close"
        >✕</button>
      </div>

      <div
        v-if="editingEmoji"
        class="mt-2 flex gap-2 items-center"
      >
        <input
          v-model="emojiDraft"
          type="text"
          maxlength="4"
          placeholder="emoji"
          class="flex-1 px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
        >
        <button
          type="button"
          class="px-2.5 py-1.5 rounded bg-accent text-bg text-xs font-semibold"
          @click="saveEmoji"
        >Save</button>
        <button
          type="button"
          class="px-2.5 py-1.5 rounded border border-border-2 text-muted text-xs"
          @click="clearEmoji"
        >Clear</button>
      </div>

      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt class="text-muted">Tier</dt><dd>{{ TIERS[trick.tier] }}</dd>
        <dt class="text-muted">Category</dt><dd>{{ trick.category }}</dd>
        <dt class="text-muted">Entry</dt><dd>{{ trick.entry }}</dd>
        <dt class="text-muted">Exit</dt><dd>{{ trick.exit }}</dd>
        <dt class="text-muted">Status</dt>
        <dd>
          <span
            class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5"
            :style="{
              background:
                effRate(trick) == null ? 'var(--rate-none)' :
                (effRate(trick) ?? 0) >= 4 ? 'var(--rate-good)' :
                (effRate(trick) ?? 0) >= 2.5 ? 'var(--rate-mid)' : 'var(--rate-bad)'
            }"
          />{{ status(trick) }}
        </dd>
        <dt class="text-muted">Last</dt><dd>{{ trick.last ?? '—' }}</dd>
      </dl>

      <label class="mt-3 flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="trick.lr"
          class="accent-accent"
          @change="toggleLr"
        >
        <span>Track
          <span class="font-semibold" :style="{ color: trick.lr ? 'var(--side-l)' : undefined }">L</span>
          /
          <span class="font-semibold" :style="{ color: trick.lr ? 'var(--side-r)' : undefined }">R</span>
          separately
        </span>
      </label>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Aliases</h3>
        <div class="flex flex-wrap gap-1.5 mb-2">
          <span
            v-for="a in trick.aliases"
            :key="a"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card-2 border border-border-2 text-xs"
          >
            {{ a }}
            <button
              type="button"
              class="text-muted hover:text-danger"
              :aria-label="`remove ${a}`"
              @click="removeAlias(a)"
            >×</button>
          </span>
          <span v-if="!trick.aliases.length" class="text-xs text-muted">none</span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="aliasDraft"
            type="text"
            placeholder="add alias"
            class="flex-1 px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
            @keydown.enter.prevent="addAlias"
          >
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-border-2 text-xs"
            @click="addAlias"
          >Add</button>
        </div>
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Tags</h3>
        <div class="flex flex-wrap gap-1.5 mb-2">
          <span
            v-for="tg in trick.tags"
            :key="tg"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card-2 border border-border-2 text-xs text-accent"
          >
            #{{ tg }}
            <button
              type="button"
              class="text-muted hover:text-danger"
              :aria-label="`remove ${tg}`"
              @click="removeTag(tg)"
            >×</button>
          </span>
          <span v-if="!trick.tags.length" class="text-xs text-muted">none</span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="tagDraft"
            type="text"
            placeholder="add tag"
            class="flex-1 px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
            @keydown.enter.prevent="addTag"
          >
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-border-2 text-xs"
            @click="addTag"
          >Add</button>
        </div>
      </section>

      <section class="mt-4">
        <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Pinned video</h3>
        <div class="flex gap-2">
          <input
            v-model="videoDraft"
            type="url"
            placeholder="https://youtube.com/…"
            class="flex-1 px-2 py-1.5 bg-card-2 border border-border-2 rounded text-sm focus:outline-none focus:border-accent"
          >
          <button
            type="button"
            class="px-2.5 py-1.5 rounded border border-border-2 text-xs"
            @click="saveVideo"
          >Save</button>
          <button
            type="button"
            class="px-2.5 py-1.5 rounded text-xs"
            :class="video?.concrete ? 'bg-accent text-bg font-semibold' : 'border border-border-2 text-muted'"
            @click="openVideo"
          >{{ video?.concrete ? 'Watch' : 'Search' }}</button>
        </div>
      </section>

      <section class="mt-5">
        <RateDots
          :rate="trick.rate"
          :rate-l="trick.rateL"
          :rate-r="trick.rateR"
          :lr="trick.lr"
          size="md"
        />
      </section>

      <section class="mt-3">
        <RateButtons
          :lr="trick.lr"
          @report="onReport"
        />
      </section>

      <section class="mt-5 pt-3 border-t border-border">
        <button
          type="button"
          class="w-full py-2 rounded-lg text-sm transition-colors"
          :class="resetArmed
            ? 'bg-danger text-fg font-semibold'
            : 'border border-border-2 text-muted hover:text-danger'"
          @click="armReset"
        >{{ resetArmed ? 'Tap again to confirm reset' : 'Reset progress' }}</button>
      </section>
    </div>
  </div>
</template>
