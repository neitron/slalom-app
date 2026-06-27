<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
// @ts-expect-error — vue-virtual-scroller v2-beta has no published types yet
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import type { CanonicalTrick } from '../domain/types'
import LibraryTrickCard from './LibraryTrickCard.vue'

const tricks = useTricksStore()
const ui = useUiStore()

const items = ref<CanonicalTrick[]>([])
const loading = ref(false)
const hasMore = ref(true)
const error = ref<string | null>(null)
const PAGE_SIZE = 50

let debounceHandle: number | null = null

async function loadPage(reset = false): Promise<void> {
  if (loading.value || (!hasMore.value && !reset)) return
  loading.value = true
  error.value = null
  try {
    const cursor = reset ? 0 : items.value.length
    const { items: page, hasMore: more } = await tricks.loadLibraryPage({
      search: ui.librarySearch,
      tiers: ui.libraryTiers,
      categories: ui.libraryCategories,
      cursor,
      pageSize: PAGE_SIZE,
    })
    items.value = reset ? page : [...items.value, ...page]
    hasMore.value = more
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load library'
  } finally {
    loading.value = false
  }
}

onMounted(() => { void loadPage(true) })

watch(
  [() => ui.librarySearch, () => ui.libraryTiers, () => ui.libraryCategories],
  () => {
    if (debounceHandle != null) window.clearTimeout(debounceHandle)
    debounceHandle = window.setTimeout(() => { void loadPage(true) }, 300)
  },
)

function onScrollEnd(): void {
  void loadPage(false)
}

function onAdopt(id: string): void {
  void tricks.adopt(id)
  // optimistically remove from visible list
  items.value = items.value.filter((c) => c.id !== id)
}
</script>

<template>
  <div class="flex flex-col gap-3" style="min-height: 60vh;">
    <div
      v-if="error"
      class="text-sm py-4 text-center"
      :style="{ color: 'var(--color-g-danger)' }"
    >{{ error }}</div>

    <div
      v-else-if="!loading && !items.length"
      class="text-muted text-sm py-8 text-center"
    >No tricks match — try clearing filters.</div>

    <RecycleScroller
      v-else
      :items="items"
      :item-size="76"
      key-field="id"
      class="flex-1 library-scroller"
      :emit-update="false"
      @scroll-end="onScrollEnd"
    >
      <template #default="{ item }: { item: CanonicalTrick }">
        <div class="py-1">
          <LibraryTrickCard :trick="item" @adopt="onAdopt" />
        </div>
      </template>
    </RecycleScroller>

    <div
      v-if="loading"
      class="text-muted text-xs py-2 text-center"
    >Loading…</div>
  </div>
</template>

<style scoped>
.library-scroller {
  /* RecycleScroller needs explicit height for virtualization */
  height: 60vh;
}
</style>
