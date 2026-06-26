<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HeaderProfileMenu from '../components/HeaderProfileMenu.vue'
import QuickJumps from '../components/QuickJumps.vue'
import Heatmap14 from '../components/Heatmap14.vue'
import WorkingOnList from '../components/WorkingOnList.vue'
import ActivityFeed from '../components/ActivityFeed.vue'
import HomeEmpty from '../components/HomeEmpty.vue'
import GeneratorSheet from '../components/GeneratorSheet.vue'
import { useHomeData } from '../composables/useHomeData'
import { useUiStore } from '../stores/ui'
import { useSequencesStore } from '../stores/sequences'
import type { Sequence } from '../domain/types'

const router = useRouter()
const uiStore = useUiStore()
const sequencesStore = useSequencesStore()
const data = useHomeData()

const showGenerator = ref(false)

async function onGeneratorSave(seq: Omit<Sequence, 'id' | 'created'>): Promise<void> {
  const saved = await sequencesStore.create({ name: seq.name, steps: seq.steps })
  showGenerator.value = false
  if (saved.id) uiStore.openSequence(saved.id)
}

const isFullyEmpty = computed(
  () =>
    !data.isLoading.value &&
    data.workingOnCount.value === 0 &&
    data.activityRows.value.length === 0 &&
    data.heatmap14.value.every((c) => c.count === 0),
)
</script>

<template>
  <div class="home-page">
    <div class="home-aurora gw-aurora-bg-lg" aria-hidden="true" />
    <div class="home-scroll">
      <header class="flex items-center justify-between">
        <h1
          class="font-semibold tracking-tight"
          :style="{ fontSize: 'var(--text-g-h1)', color: 'var(--color-g-fg)' }"
        >Slalom</h1>
        <HeaderProfileMenu />
      </header>

      <QuickJumps
        :current-sequence="data.currentSequence.value"
        @open-graph="router.push('/graph')"
        @open-sequence="(id) => uiStore.openSequence(id)"
        @new-sequence="showGenerator = true"
      />

      <template v-if="isFullyEmpty">
        <HomeEmpty @cta="router.push('/tricks')" />
      </template>

      <template v-else>
        <Heatmap14
          :cells="data.heatmap14.value"
          :sessions-total="data.sessionsTotal14.value"
          :sessions-delta="data.sessionsDelta14.value"
          :streak-days="data.streakDays.value"
          :is-loading="data.isLoading.value"
        />

        <WorkingOnList
          :tricks="data.workingOn.value"
          :total-count="data.workingOnCount.value"
          :is-loading="data.isLoading.value"
          @open="(id) => uiStore.openSheet(id)"
          @see-all="router.push({ path: '/tricks', query: { status: 'in-progress' } })"
        />

        <ActivityFeed
          :rows="data.activityRows.value"
          :is-loading="data.isLoading.value"
        />
      </template>
    </div>

  <GeneratorSheet
      :visible="showGenerator"
      @close="showGenerator = false"
      @save="onGeneratorSave"
    />
  </div>
</template>

<style scoped>
.home-page {
  position: relative;
}
/* Fixed aurora layer: stays put while content scrolls over it. */
.home-aurora {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.home-scroll {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem 1rem 0;
}
</style>
