<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useUiStore } from '../stores/ui'
import { useTricksStore } from '../stores/tricks'
import { CATEGORIES, TIER_NAMES } from '../domain/constants'
import type { Category, Tier, TrickStatus } from '../domain/types'
import ChipFilter, { type ChipOption } from './ChipFilter.vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import { IconFavOn } from '../icons'

type Props = { visible: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const ui = useUiStore()
const tricksStore = useTricksStore()

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
  if (dragY.value > CLOSE_THRESHOLD) emit('close')
  else dragY.value = 0
}

watch(() => props.visible, (v) => { if (v) dragY.value = 0 })

useBodyScrollLock(toRef(props, 'visible'))

const tierOptions = computed<ChipOption[]>(() =>
  TIER_NAMES.map((_n, i) => ({ value: String(i + 1), label: `T${i + 1}` })),
)
const categoryOptions = computed<ChipOption[]>(() =>
  CATEGORIES.map((c) => ({ value: c, label: c })),
)
const statusOptions: ChipOption[] = [
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Complete', label: 'Complete' },
  { value: 'Not Started', label: 'Not Started' },
]

const tierModel = computed<string[]>({
  get: () => ui.tricksTiers.map(String),
  set: (v) => ui.setTricksTiers(v.map((n) => Number(n) as Tier)),
})
const categoryModel = computed<string[]>({
  get: () => ui.tricksCategories.slice(),
  set: (v) => ui.setTricksCategories(v as Category[]),
})
const statusModel = computed<string[]>({
  get: () => ui.tricksStatuses.slice(),
  set: (v) => ui.setTricksStatuses(v as TrickStatus[]),
})

const resultCount = computed(() =>
  tricksStore.filteredAndSorted({
    tiers: ui.tricksTiers,
    categories: ui.tricksCategories,
    statuses: ui.tricksStatuses,
    favOnly: ui.tricksFavOnly,
    search: ui.tricksSearch,
    sort: ui.tricksSort,
  }).length,
)

function onResetAll() {
  ui.resetTricksFilters()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
      >
        <div
          class="absolute inset-0 bg-black/60"
          style="touch-action: none;"
          @click="emit('close')"
        />
        <div
          ref="panelRef"
          class="relative w-full max-h-[85dvh] gw-glass flex flex-col touch-pan-y overscroll-contain"
          :style="{
            borderTopLeftRadius: 'var(--radius-g-panel)',
            borderTopRightRadius: 'var(--radius-g-panel)',
            transform: `translateY(${dragY}px)`,
            transition: dragging ? 'none' : 'transform 280ms ease',
          }"
          @touchstart.passive="onTouchStart"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div class="pt-3 pb-1 flex justify-center">
            <div class="w-10 h-1 rounded-full" :style="{ background: 'rgba(255,255,255,0.18)' }" />
          </div>

          <header class="px-4 py-2 flex items-center justify-between">
            <h2 class="font-semibold" :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)' }">Filters</h2>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 active:opacity-60"
                :style="{ color: 'var(--color-g-brand)', fontSize: 'var(--text-g-body)' }"
                @click="onResetAll"
              >Reset all</button>
              <button
                type="button"
                class="w-8 h-8 grid place-items-center gw-glass-strong"
                :style="{ borderRadius: 'var(--radius-g-chip)', color: 'var(--color-g-fg)' }"
                aria-label="Close filters"
                @click="emit('close')"
              >×</button>
            </div>
          </header>

          <div
            ref="scrollAreaRef"
            class="px-4 pb-4 flex flex-col gap-4 overflow-y-auto overscroll-contain"
          >
            <section class="flex flex-col gap-2">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Tier</h3>
              <ChipFilter :options="tierOptions" :model-value="tierModel" :multi="true" @update:model-value="tierModel = $event as string[]" />
            </section>

            <section class="flex flex-col gap-2">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Category</h3>
              <ChipFilter :options="categoryOptions" :model-value="categoryModel" :multi="true" @update:model-value="categoryModel = $event as string[]" />
            </section>

            <section class="flex flex-col gap-2">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Status</h3>
              <ChipFilter :options="statusOptions" :model-value="statusModel" :multi="true" @update:model-value="statusModel = $event as string[]" />
            </section>

            <section class="flex items-center justify-between">
              <h3 class="text-xs uppercase tracking-wide" :style="{ color: 'var(--color-g-fg-muted)' }">Favorites only</h3>
              <button
                type="button"
                class="px-3 py-1.5 transition-colors"
                :class="ui.tricksFavOnly ? 'font-semibold' : 'gw-glass-strong'"
                :style="ui.tricksFavOnly
                  ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)' }
                  : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
                @click="ui.setTricksFavOnly(!ui.tricksFavOnly)"
              ><span class="inline-flex items-center gap-1"><IconFavOn v-if="ui.tricksFavOnly" :size="14" stroke="1.75" />{{ ui.tricksFavOnly ? 'On' : 'Off' }}</span></button>
            </section>
          </div>

          <footer
            class="px-4 py-3 border-t"
            :style="{ borderColor: 'rgba(255,255,255,0.08)' }"
          >
            <p :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg-muted)', textAlign: 'center' }">
              <span :style="{ color: 'var(--color-g-fg)', fontWeight: 600 }">{{ resultCount }}</span> result<span v-if="resultCount !== 1">s</span>
            </p>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 240ms ease; }
.sheet-enter-active .relative,
.sheet-leave-active .relative { transition: transform 280ms cubic-bezier(.2, .8, .2, 1), opacity 240ms ease; }
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .relative,
.sheet-leave-to .relative { transform: translateY(100%); }
</style>
