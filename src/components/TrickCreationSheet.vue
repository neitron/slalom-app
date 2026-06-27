<script setup lang="ts">
import { computed, ref, toRef, watch, nextTick } from 'vue'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import { CATEGORIES } from '../domain/constants'
import type { Category, Tier } from '../domain/types'
import ChipFilter, { type ChipOption } from './ChipFilter.vue'
import { useBodyScrollLock } from '../composables/useBodyScrollLock'
import { IconClose } from '../icons'

type Props = { visible: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', id: string): void
}>()

const tricks = useTricksStore()
const ui = useUiStore()

const name = ref('')
const tier = ref<Tier>(2)
const category = ref<Category>('forward')
const lr = ref(false)
const icon = ref('')
const firstAlias = ref('')
const saving = ref(false)

const nameInputRef = ref<HTMLInputElement | null>(null)
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

useBodyScrollLock(toRef(props, 'visible'))

watch(() => props.visible, async (v) => {
  if (v) {
    // reset form
    name.value = ''
    tier.value = 2
    category.value = 'forward'
    lr.value = false
    icon.value = ''
    firstAlias.value = ''
    saving.value = false
    dragY.value = 0
    await nextTick()
    nameInputRef.value?.focus()
  }
})

const categoryOptions = computed<ChipOption[]>(() =>
  CATEGORIES.map((c) => ({ value: c, label: c })),
)
function setCategory(v: string | string[]) {
  category.value = v as Category
}

const TIERS: Tier[] = [1, 2, 3, 4, 5, 6]

const canSave = computed(() => !saving.value && name.value.trim().length > 0)

async function onSave(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  try {
    const id = await tricks.create({
      name: name.value,
      tier: tier.value,
      category: category.value,
      lr: lr.value,
      icon: icon.value || null,
      firstAlias: firstAlias.value || null,
    })
    emit('created', id)
    emit('close')
  } catch (err) {
    saving.value = false
    const message = err instanceof Error ? err.message : 'Failed to create trick'
    ui.showError(message)
  }
}
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
            class="sheet-panel gw-glass-strong relative w-full p-4 pt-2 max-h-[90dvh] overflow-y-auto touch-pan-y overscroll-contain"
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
              <h2 class="text-lg font-semibold flex-1">New trick</h2>
              <button
                type="button"
                class="p-1 text-muted hover:text-fg"
                aria-label="Close"
                @click="emit('close')"
              ><IconClose :size="18" stroke="1.75" /></button>
            </div>

            <section class="mb-4">
              <label
                for="trick-name"
                class="block text-xs uppercase tracking-wide text-muted mb-1.5"
              >Name</label>
              <input
                id="trick-name"
                ref="nameInputRef"
                v-model="name"
                type="text"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
                class="w-full px-3 py-2 text-sm outline-none"
                :style="{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-g-fg)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
                @keydown.enter.prevent="onSave"
              >
            </section>

            <section class="mb-4">
              <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Tier</h3>
              <div class="flex gap-1">
                <button
                  v-for="t in TIERS"
                  :key="t"
                  type="button"
                  class="flex-1 py-2 text-sm transition-colors"
                  :style="t === tier
                    ? { background: 'var(--color-g-fg)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontWeight: 600 }
                    : { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)' }"
                  :class="t === tier ? '' : 'gw-glass-strong'"
                  @click="tier = t"
                >T{{ t }}</button>
              </div>
            </section>

            <section class="mb-4">
              <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Category</h3>
              <ChipFilter
                :options="categoryOptions"
                :model-value="category"
                @update:model-value="setCategory"
              />
            </section>

            <section class="mb-4">
              <label class="flex items-center justify-between gap-3 cursor-pointer">
                <span class="text-sm">Left/Right variants</span>
                <span class="relative inline-flex items-center">
                  <input
                    v-model="lr"
                    type="checkbox"
                    class="peer sr-only"
                  >
                  <span
                    class="w-10 h-6 rounded-full transition-colors"
                    :style="lr
                      ? { background: 'var(--color-g-brand)' }
                      : { background: 'rgba(255,255,255,0.12)' }"
                  />
                  <span
                    class="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    :style="lr ? { transform: 'translateX(16px)' } : {}"
                  />
                </span>
              </label>
            </section>

            <section class="mb-4">
              <label
                for="trick-icon"
                class="block text-xs uppercase tracking-wide text-muted mb-1.5"
              >Icon <span class="text-[10px] normal-case opacity-60">(optional)</span></label>
              <input
                id="trick-icon"
                v-model="icon"
                type="text"
                maxlength="32"
                placeholder="Up to 3 emojis"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                class="w-full px-3 py-2 text-sm outline-none"
                :style="{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-g-fg)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
              >
            </section>

            <section class="mb-4">
              <label
                for="trick-alias"
                class="block text-xs uppercase tracking-wide text-muted mb-1.5"
              >Alias <span class="text-[10px] normal-case opacity-60">(optional)</span></label>
              <input
                id="trick-alias"
                v-model="firstAlias"
                type="text"
                placeholder="Another name for this trick"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
                class="w-full px-3 py-2 text-sm outline-none"
                :style="{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-g-fg)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
              >
            </section>

            <div class="mt-5 pt-3 border-t border-border flex gap-2">
              <button
                type="button"
                class="flex-1 py-2 text-sm gw-glass-strong"
                :style="{
                  color: 'var(--color-g-fg-muted)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
                @click="emit('close')"
              >Cancel</button>
              <button
                type="button"
                class="flex-1 py-2 text-sm font-semibold disabled:opacity-40"
                :style="{
                  background: 'var(--color-g-brand)',
                  color: 'var(--color-g-base)',
                  borderRadius: 'var(--radius-g-chip)',
                }"
                :disabled="!canSave"
                @click="onSave"
              >{{ saving ? 'Saving…' : 'Create trick' }}</button>
            </div>
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
