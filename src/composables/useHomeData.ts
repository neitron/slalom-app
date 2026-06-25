import { computed, onScopeDispose, ref, type Ref } from 'vue'
import { liveQuery } from 'dexie'
import { db } from '../storage/dexie'
import { useTricksStore } from '../stores/tricks'
import { useSequencesStore } from '../stores/sequences'
import { useTransitionsStore } from '../stores/transitions'
import {
  buildHeatmap14,
  countWorkingOn,
  joinActivityRows,
  pickCurrentSequence,
  selectWorkingOn,
  sessionsInWindow,
  streakFromLogs,
  ACTIVITY_WINDOW_DAYS,
  HEATMAP_WINDOW_DAYS,
  type ActivityRow,
  type Heatmap14Cell,
} from './homeDataCompute'
import { daysAgoLocalIso } from '../utils/dates'
import type { PracticeLog, Sequence, Trick } from '../domain/types'

export interface UseHomeData {
  workingOn:        Ref<Trick[]>
  workingOnCount:   Ref<number>
  activityRows:     Ref<ActivityRow[]>
  heatmap14:        Ref<Heatmap14Cell[]>
  sessionsTotal14:  Ref<number>
  sessionsDelta14:  Ref<number | null>
  streakDays:       Ref<number>
  currentSequence:  Ref<Sequence | null>
  isLoading:        Ref<boolean>
}

export function useHomeData(): UseHomeData {
  const tricksStore = useTricksStore()
  const sequencesStore = useSequencesStore()
  const transitionsStore = useTransitionsStore()

  tricksStore.load()
  sequencesStore.load()
  transitionsStore.load()

  const recentLogs = ref<PracticeLog[]>([])
  const liveLoaded = ref(false)

  const subscription = liveQuery(() =>
    db.practice_log
      .where('at')
      .above(daysAgoLocalIso(2 * HEATMAP_WINDOW_DAYS) + 'T00:00:00')
      .reverse()
      .sortBy('at'),
  ).subscribe({
    next: (rows) => {
      recentLogs.value = rows
      liveLoaded.value = true
    },
    error: (err) => {
      console.error('[useHomeData] liveQuery error', err)
      liveLoaded.value = true
    },
  })

  onScopeDispose(() => subscription.unsubscribe())

  const workingOn = computed(() => selectWorkingOn(tricksStore.tricks))
  const workingOnCount = computed(() => countWorkingOn(tricksStore.tricks))

  const logs14 = computed(() => {
    const cutoff = daysAgoLocalIso(HEATMAP_WINDOW_DAYS - 1) + 'T00:00:00'
    return recentLogs.value.filter((l) => l.at >= cutoff)
  })
  const logs7 = computed(() => {
    const cutoff = daysAgoLocalIso(ACTIVITY_WINDOW_DAYS - 1) + 'T00:00:00'
    return recentLogs.value.filter((l) => l.at >= cutoff)
  })

  const heatmap14 = computed(() => buildHeatmap14(logs14.value))
  const sessionsTotal14 = computed(() => sessionsInWindow(recentLogs.value, HEATMAP_WINDOW_DAYS))
  const sessionsDelta14 = computed<number | null>(() => {
    const olderCutoff = daysAgoLocalIso(2 * HEATMAP_WINDOW_DAYS - 1) + 'T00:00:00'
    const newerCutoff = daysAgoLocalIso(HEATMAP_WINDOW_DAYS - 1) + 'T00:00:00'
    const prior = recentLogs.value.filter((l) => l.at >= olderCutoff && l.at < newerCutoff).length
    if (prior === 0 && sessionsTotal14.value === 0) return null
    if (prior === 0) return null
    return sessionsTotal14.value - prior
  })
  const streakDaysRef = computed(() => streakFromLogs(recentLogs.value))

  const activityRows = computed(() =>
    joinActivityRows(
      logs7.value,
      tricksStore.tricks,
      sequencesStore.sequences,
      transitionsStore.edges,
    ),
  )

  const currentSequence = computed(() => pickCurrentSequence(sequencesStore.sequences))

  const isLoading = computed(
    () => !liveLoaded.value || !tricksStore.loaded || !sequencesStore.loaded,
  )

  return {
    workingOn,
    workingOnCount,
    activityRows,
    heatmap14,
    sessionsTotal14,
    sessionsDelta14,
    streakDays: streakDaysRef,
    currentSequence,
    isLoading,
  }
}
