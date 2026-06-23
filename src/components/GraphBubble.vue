<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Trick } from '../domain/types'
import { displayName } from '../domain/display'
import RateDots from './RateDots.vue'

type Props = {
  trick: Trick
  x: number
  y: number
  mode: 'view' | 'linking'
  sequenceMode: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  details: [trickId: string]
  startLink: [trickId: string, fromSide: 'L' | 'R' | null]
  close: []
}>()

const root = ref<HTMLDivElement | null>(null)
const pos = ref({ left: props.x, top: props.y })

const MARGIN = 8

async function clamp() {
  await nextTick()
  const el = root.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = props.x - rect.width / 2
  let top = props.y + 14
  if (left < MARGIN) left = MARGIN
  if (left + rect.width > vw - MARGIN) left = vw - MARGIN - rect.width
  if (top + rect.height > vh - MARGIN) top = props.y - rect.height - 14
  if (top < MARGIN) top = MARGIN
  pos.value = { left, top }
}

watch(() => [props.x, props.y], clamp)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  clamp()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})

const meta = computed(() => `${props.trick.category} · T${props.trick.tier}`)

function details() {
  if (props.trick.id) emit('details', props.trick.id)
}

function startLink(side: 'L' | 'R' | null) {
  if (props.sequenceMode) return
  if (props.trick.id) emit('startLink', props.trick.id, side)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="gb">
      <div
        ref="root"
        class="fixed z-50 bg-card border border-border rounded-xl p-3 shadow-2xl w-[240px]"
        :style="{ left: pos.left + 'px', top: pos.top + 'px' }"
        @click.stop
      >
        <div class="flex items-start gap-2 mb-2">
          <div class="text-2xl leading-none select-none">{{ trick.icon ?? '·' }}</div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-fg text-[15px] leading-tight truncate">{{ displayName(trick) }}</div>
            <div class="text-[11px] text-muted mt-0.5">{{ meta }}</div>
          </div>
          <button
            type="button"
            class="text-muted text-base leading-none -mr-1 -mt-1 w-6 h-6 grid place-items-center"
            aria-label="Close"
            @click="emit('close')"
          >✕</button>
        </div>

        <RateDots
          :rate="trick.rate"
          :rate-l="trick.rateL"
          :rate-r="trick.rateR"
          :lr="trick.lr"
          size="md"
        />

        <div
          v-if="mode === 'view'"
          class="flex gap-1.5 mt-3"
        >
          <button
            type="button"
            class="flex-1 py-1.5 rounded-lg border border-border-2 bg-card-2 text-fg text-xs"
            @click="details"
          >Details</button>
          <template v-if="trick.lr">
            <button
              type="button"
              class="flex-1 py-1.5 rounded-lg btn-l text-xs"
              :class="{ 'opacity-40 pointer-events-none': sequenceMode }"
              @click="startLink('L')"
            >➕ from L</button>
            <button
              type="button"
              class="flex-1 py-1.5 rounded-lg btn-r text-xs"
              :class="{ 'opacity-40 pointer-events-none': sequenceMode }"
              @click="startLink('R')"
            >➕ from R</button>
          </template>
          <button
            v-else
            type="button"
            class="flex-1 py-1.5 rounded-lg border border-border-2 bg-card-2 text-fg text-xs"
            :class="{ 'opacity-40 pointer-events-none': sequenceMode }"
            @click="startLink(null)"
          >➕ Transition</button>
        </div>

        <div
          v-else
          class="mt-3 text-[12px] text-accent leading-snug"
        >
          Tap a target node to link…
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.gb-enter-active, .gb-leave-active {
  transition: transform 180ms cubic-bezier(0.18, 1.2, 0.42, 1), opacity 140ms ease;
}
.gb-enter-from { opacity: 0; transform: translateY(-6px) scale(0.96); }
.gb-leave-to   { opacity: 0; transform: translateY(-3px) scale(0.98); }
</style>
