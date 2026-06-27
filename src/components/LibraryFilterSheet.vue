<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useUiStore } from '../stores/ui'
import { CATEGORIES, TIER_NAMES } from '../domain/constants'
import type { Category, Tier } from '../domain/types'
import ChipFilter, { type ChipOption } from './ChipFilter.vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import { IconClose } from '../icons'

type Props = { visible: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const ui = useUiStore()
const panelRef = ref<HTMLElement | null>(null)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
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
  startY = e.touches[0].clientY
  active = false
  dragY.value = 0
  dragging.value = false
}
function onTouchMove(e: TouchEvent) {
  if (suppressDrag) return
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

const tierModel = computed<string[]>({
  get: () => ui.libraryTiers.map(String),
  set: (v) => ui.setLibraryTiers(v.map((n) => Number(n) as Tier)),
})
const categoryModel = computed<string[]>({
  get: () => ui.libraryCategories.slice(),
  set: (v) => ui.setLibraryCategories(v as Category[]),
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="visible"
        class="fixed inset-0 z-40 flex items-end"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="absolute inset-0 bg-black/60"
          style="touch-action: none;"
          @click="emit('close')"
        />
        <div class="sheet-panel-anim w-full">
          <div
            ref="panelRef"
            class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[80dvh] overflow-y-auto touch-pan-y overscroll-contain"
            :style="{
              transform: `translateY(${dragY}px)`,
              transition: dragging ? 'none' : 'transform var(--motion-g-slow) var(--ease-g-out)',
              borderTopLeftRadius: 'var(--radius-g-panel)',
              borderTopRightRadius: 'var(--radius-g-panel)',
            }"
            @touchstart.passive="onTouchStart"
            @touchmove.passive="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
          >
            <div class="flex justify-center pb-2 -mt-1">
              <div class="w-10 h-1 rounded-full bg-border-2" />
            </div>

            <div class="flex items-center gap-2 mb-3">
              <h2 class="text-lg font-semibold flex-1">Filter library</h2>
              <button
                type="button"
                class="p-1 text-muted hover:text-fg"
                aria-label="Close"
                @click="emit('close')"
              ><IconClose :size="18" stroke="1.75" /></button>
            </div>

            <section class="mt-2">
              <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Tier</h3>
              <ChipFilter
                :options="tierOptions"
                :model-value="tierModel"
                :multi="true"
                @update:model-value="(v) => (tierModel = v as string[])"
              />
            </section>

            <section class="mt-4">
              <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Category</h3>
              <ChipFilter
                :options="categoryOptions"
                :model-value="categoryModel"
                :multi="true"
                @update:model-value="(v) => (categoryModel = v as string[])"
              />
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-active .sheet-panel-anim,
.sheet-leave-active .sheet-panel-anim {
  transition:
    transform var(--motion-g-slow) var(--ease-g-spring),
    opacity var(--motion-g-base) var(--ease-g-out);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel-anim,
.sheet-leave-to .sheet-panel-anim {
  transform: translateY(100%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-from .sheet-panel-anim,
  .sheet-leave-to .sheet-panel-anim {
    transform: none !important;
  }
}
</style>
