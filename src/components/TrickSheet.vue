<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { TIERS } from '../domain/constants'
import { effectiveRate, statusOf } from '../domain/rating'
import { resolveVideoUrl } from '../domain/video'
import { displayName } from '../domain/display'
import type { Side, Trick } from '../domain/types'
import RateDots from './RateDots.vue'
import RateButtons from './RateButtons.vue'
import { useSheetViewport } from '../composables/useSheetViewport'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'

const panelRef = ref<HTMLElement | null>(null)
const scrollAreaRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let startScrollTop = 0
let active = false
let suppressDrag = false
const CLOSE_THRESHOLD = 100

const FORM_CONTROL_SELECTOR = 'input, select, textarea, [role="slider"]'
function isOnFormControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(FORM_CONTROL_SELECTOR) != null
}

function onTouchStart(e: TouchEvent) {
  suppressDrag = isOnFormControl(e.target)
  startScrollTop = scrollAreaRef.value?.scrollTop ?? 0
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}

function onTouchMove(e: TouchEvent) {
  if (suppressDrag) return
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

useSheetViewport(panelRef, isOpen)

const editMode = ref(false)
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
  () => {
    editMode.value = false
    emojiDraft.value = trick.value?.icon ?? ''
    aliasDraft.value = ''
    tagDraft.value = ''
    videoDraft.value = trick.value?.video ?? ''
    resetArmed.value = false
    clearResetTimer()
    uiStore.clearFeedback()
  },
)

useBodyScrollLock(isOpen)

onBeforeUnmount(() => {
  clearResetTimer()
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

function onModeChange(toLr: boolean): void {
  if (!trick.value?.id) return
  if (trick.value.lr === toLr) return
  void tricksStore.toggleLr(trick.value.id)
}

async function saveEmoji() {
  if (!trick.value?.id) return
  const v = emojiDraft.value.trim()
  await tricksStore.updateEmoji(trick.value.id, v || null)
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

async function toggleMainAlias(a: string) {
  if (!trick.value?.id) return
  const cur = trick.value.mainAlias
  await tricksStore.setMainAlias(trick.value.id, cur === a ? null : a)
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

const detailItems = computed(() => {
  const t = trick.value
  if (!t) return []
  return [
    { label: 'Tier',     value: TIERS[t.tier] ?? '—', isStatus: false },
    { label: 'Category', value: t.category   ?? '—', isStatus: false },
    { label: 'Entry',    value: t.entry      ?? '—', isStatus: false },
    { label: 'Exit',     value: t.exit       ?? '—', isStatus: false },
    { label: 'Status',   value: status(t),             isStatus: true  },
    { label: 'Last',     value: t.last       ?? '—', isStatus: false },
  ]
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && trick"
      class="fixed left-0 right-0 top-0 z-50 flex items-end overflow-hidden"
      style="inset: 0; height: auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="absolute inset-0 bg-black/60"
        style="touch-action: none;"
        @click="close"
      />

      <div
        ref="panelRef"
        class="sheet-panel relative w-full gw-glass-strong max-h-[90dvh] flex flex-col touch-pan-y overscroll-contain"
        :style="{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
          borderTopLeftRadius: 'var(--radius-g-panel)',
          borderTopRightRadius: 'var(--radius-g-panel)',
        }"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
      >
        <!-- Scrollable body -->
        <div ref="scrollAreaRef" class="flex-1 overflow-y-auto p-4 pt-2">
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
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-semibold truncate">{{ displayName(trick) }}</h2>
              <p
                v-if="trick.mainAlias && trick.mainAlias !== trick.name"
                class="text-[11px] text-muted truncate"
              >Original: {{ trick.name }}</p>
            </div>
            <button
              type="button"
              class="p-1.5"
              :style="{
                borderRadius: 'var(--radius-g-chip)',
                color: editMode ? 'var(--color-g-base)' : 'var(--color-g-fg-muted)',
                background: editMode ? 'var(--color-g-fg)' : 'transparent',
              }"
              :aria-label="editMode ? 'Exit edit mode' : 'Edit trick'"
              :aria-pressed="editMode"
              @click="editMode = !editMode"
            >✎</button>
            <button
              type="button"
              class="p-1 text-muted hover:text-fg"
              aria-label="Close"
              @click="close"
            >✕</button>
          </div>

          <!-- Emoji edit — only in edit mode -->
          <div
            v-if="editMode"
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

          <dl
            class="grid grid-cols-2 mt-3"
            :style="{
              borderRadius: 'var(--radius-g-chip)',
              overflow: 'hidden',
            }"
          >
            <div
              v-for="(item, idx) in detailItems"
              :key="item.label"
              class="px-3 py-2"
              :style="{
                borderTop: idx >= 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderLeft: idx % 2 === 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }"
            >
              <dt
                class="uppercase tracking-wide"
                :style="{
                  fontSize: '10px',
                  color: 'var(--color-g-fg-muted)',
                  letterSpacing: '0.04em',
                }"
              >{{ item.label }}</dt>
              <dd
                class="mt-0.5 truncate"
                :style="{
                  fontSize: 'var(--text-g-body)',
                  color: 'var(--color-g-fg)',
                }"
              >
                <template v-if="item.isStatus">
                  <span
                    class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1"
                    :style="{
                      background:
                        effRate(trick) == null ? 'var(--rate-none)' :
                        (effRate(trick) ?? 0) >= 4 ? 'var(--rate-good)' :
                        (effRate(trick) ?? 0) >= 2.5 ? 'var(--rate-mid)' : 'var(--rate-bad)'
                    }"
                  />{{ item.value }}
                </template>
                <template v-else>{{ item.value }}</template>
              </dd>
            </div>
          </dl>

          <!-- Aliases — hidden in view mode when empty -->
          <section v-if="trick.aliases.length > 0 || editMode" class="mt-4">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-xs uppercase tracking-wide text-muted">Aliases</h3>
              <span v-if="editMode" class="text-[10px] text-muted">tap ★ to set display name</span>
            </div>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="a in trick.aliases"
                :key="a"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs"
                :class="trick.mainAlias === a
                  ? 'bg-accent/15 border-accent text-fg'
                  : 'bg-card-2 border-border-2'"
              >
                <!-- Star toggle: only in edit mode; static star marker in view mode -->
                <button
                  v-if="editMode"
                  type="button"
                  class="leading-none"
                  :class="trick.mainAlias === a ? 'text-accent' : 'text-muted hover:text-fg'"
                  :aria-label="trick.mainAlias === a ? `clear main alias` : `set ${a} as main`"
                  @click="toggleMainAlias(a)"
                >{{ trick.mainAlias === a ? '★' : '☆' }}</button>
                <span v-else-if="trick.mainAlias === a" class="text-accent leading-none">★</span>
                {{ a }}
                <button
                  v-if="editMode"
                  type="button"
                  class="text-muted hover:text-danger"
                  :aria-label="`remove ${a}`"
                  @click="removeAlias(a)"
                >×</button>
              </span>
              <span v-if="editMode && !trick.aliases.length" class="text-xs text-muted">none</span>
            </div>
            <div v-if="editMode" class="flex gap-2">
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

          <!-- Tags — hidden in view mode when empty -->
          <section v-if="trick.tags.length > 0 || editMode" class="mt-4">
            <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Tags</h3>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="tg in trick.tags"
                :key="tg"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card-2 border border-border-2 text-xs text-accent"
              >
                #{{ tg }}
                <button
                  v-if="editMode"
                  type="button"
                  class="text-muted hover:text-danger"
                  :aria-label="`remove ${tg}`"
                  @click="removeTag(tg)"
                >×</button>
              </span>
              <span v-if="editMode && !trick.tags.length" class="text-xs text-muted">none</span>
            </div>
            <div v-if="editMode" class="flex gap-2">
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

          <!-- Video — in view mode show only if concrete; in edit mode always show -->
          <section v-if="video?.concrete || editMode" class="mt-4">
            <h3 class="text-xs uppercase tracking-wide text-muted mb-1">Pinned video</h3>
            <div v-if="editMode" class="flex gap-2">
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
            <div v-else>
              <button
                type="button"
                class="px-2.5 py-1.5 rounded bg-accent text-bg text-xs font-semibold"
                @click="openVideo"
              >Watch</button>
            </div>
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
        <!-- /Scrollable body -->

        <!-- Sticky rate island -->
        <div class="shrink-0 px-4 pb-4 pt-2">
          <div
            class="gw-glass-strong p-3 flex flex-col gap-2"
            :style="{ borderRadius: 'var(--radius-g-panel)' }"
          >
            <RateDots
              :rate="trick.rate"
              :rate-l="trick.rateL"
              :rate-r="trick.rateR"
              :lr="trick.lr"
              size="md"
            />

            <div
              class="gw-glass-strong flex p-0.5 self-start"
              :style="{ borderRadius: 'var(--radius-g-chip)' }"
              role="radiogroup"
              aria-label="Rate mode"
            >
              <button
                type="button"
                class="px-3 py-1 transition-all duration-150 font-semibold"
                :style="{
                  background: !trick.lr ? 'var(--color-g-fg)' : 'transparent',
                  color: !trick.lr ? 'var(--color-g-base)' : 'var(--color-g-fg-muted)',
                  borderRadius: 'calc(var(--radius-g-chip) - 2px)',
                  fontSize: 'var(--text-g-micro)',
                }"
                :aria-pressed="!trick.lr"
                @click="onModeChange(false)"
              >Both legs</button>
              <button
                type="button"
                class="px-3 py-1 transition-all duration-150 font-semibold"
                :style="{
                  background: trick.lr ? 'var(--color-g-fg)' : 'transparent',
                  color: trick.lr ? 'var(--color-g-base)' : 'var(--color-g-fg-muted)',
                  borderRadius: 'calc(var(--radius-g-chip) - 2px)',
                  fontSize: 'var(--text-g-micro)',
                }"
                :aria-pressed="trick.lr"
                @click="onModeChange(true)"
              >Per leg</button>
            </div>

            <RateButtons
              :lr="trick.lr"
              @report="onReport"
            />
          </div>
        </div>
        <!-- /Sticky rate island -->
      </div>
    </div>
  </Teleport>
</template>
