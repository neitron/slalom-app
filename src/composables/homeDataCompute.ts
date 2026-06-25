import type {
  PracticeLog,
  Sequence,
  Side,
  Transition,
  Trick,
} from '../domain/types'
import {
  daysAgoLocalIso,
  groupByLocalDay,
  streakDays,
  todayLocalIso,
} from '../utils/dates'

export interface ActivityRow {
  id: string
  entityType: 'trick' | 'sequence' | 'transition'
  entityId: string
  displayName: string
  icon: string | null
  side: Side
  score: number
  at: string
}

export interface Heatmap14Cell {
  dateLocal: string
  dayOfMonth: number
  count: number
  level: 0 | 1 | 2 | 3
  isToday: boolean
}

export const WORKING_ON_CAP = 5
export const HEATMAP_WINDOW_DAYS = 14
export const ACTIVITY_WINDOW_DAYS = 7
export const CURRENT_SEQUENCE_WINDOW_DAYS = 14

function intensityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  return 3
}

export function selectWorkingOn(tricks: Trick[]): Trick[] {
  const cutoff = daysAgoLocalIso(ACTIVITY_WINDOW_DAYS)
  const matched = tricks.filter(
    (t) => t.status === 'In Progress' || (t.last != null && t.last >= cutoff),
  )
  matched.sort((a, b) => {
    const la = a.last ?? ''
    const lb = b.last ?? ''
    if (lb !== la) return lb.localeCompare(la)
    return a.name.localeCompare(b.name)
  })
  return matched.slice(0, WORKING_ON_CAP)
}

export function countWorkingOn(tricks: Trick[]): number {
  const cutoff = daysAgoLocalIso(ACTIVITY_WINDOW_DAYS)
  let n = 0
  for (const t of tricks) {
    if (t.status === 'In Progress' || (t.last != null && t.last >= cutoff)) n++
  }
  return n
}

export function buildHeatmap14(logs: PracticeLog[]): Heatmap14Cell[] {
  const counts = groupByLocalDay(logs.map((l) => l.at))
  const today = todayLocalIso()
  const cells: Heatmap14Cell[] = []
  for (let i = HEATMAP_WINDOW_DAYS - 1; i >= 0; i--) {
    const date = daysAgoLocalIso(i)
    const count = counts.get(date) ?? 0
    cells.push({
      dateLocal: date,
      dayOfMonth: Number(date.slice(8, 10)),
      count,
      level: intensityLevel(count),
      isToday: date === today,
    })
  }
  return cells
}

export function sessionsInWindow(logs: PracticeLog[], days: number): number {
  const cutoff = daysAgoLocalIso(days - 1)
  let n = 0
  for (const l of logs) {
    const day = l.at.slice(0, 10)
    if (day >= cutoff) n++
  }
  return n
}

export function streakFromLogs(logs: PracticeLog[]): number {
  const counts = groupByLocalDay(logs.map((l) => l.at))
  return streakDays(counts)
}

const ENTITY_FALLBACK_LABEL: Record<ActivityRow['entityType'], string> = {
  trick: 'Trick',
  sequence: 'Sequence',
  transition: 'Transition',
}

export function joinActivityRows(
  logs: PracticeLog[],
  tricks: Trick[],
  sequences: Sequence[],
  transitions: Transition[],
): ActivityRow[] {
  const trickById = new Map(tricks.filter((t) => t.id).map((t) => [t.id!, t]))
  const seqById = new Map(sequences.filter((s) => s.id).map((s) => [s.id!, s]))
  const trById = new Map(transitions.filter((e) => e.id).map((e) => [e.id!, e]))

  return logs.map<ActivityRow>((l) => {
    let displayName: string = ENTITY_FALLBACK_LABEL[l.entityType]
    let icon: string | null = null
    if (l.entityType === 'trick') {
      const t = trickById.get(l.entityId)
      if (t) { displayName = t.name; icon = t.icon }
    } else if (l.entityType === 'sequence') {
      const s = seqById.get(l.entityId)
      if (s) { displayName = s.name }
    } else if (l.entityType === 'transition') {
      const e = trById.get(l.entityId)
      if (e) {
        const fromName = trickById.get(e.from)?.name ?? '?'
        const toName = trickById.get(e.to)?.name ?? '?'
        displayName = `${fromName} → ${toName}`
      }
    }
    return {
      id: l.id!,
      entityType: l.entityType,
      entityId: l.entityId,
      displayName,
      icon,
      side: l.side,
      score: l.score,
      at: l.at,
    }
  })
}

export function pickCurrentSequence(sequences: Sequence[]): Sequence | null {
  const cutoff = daysAgoLocalIso(CURRENT_SEQUENCE_WINDOW_DAYS)
  const eligible = sequences.filter((s) => s.last != null && s.last >= cutoff)
  if (eligible.length === 0) return null
  eligible.sort((a, b) => (b.last ?? '').localeCompare(a.last ?? ''))
  return eligible[0]
}

export function nextCycleScore(currentRate: number | null): 1 | 3 | 5 {
  if (currentRate == null) return 1
  const rounded = Math.round(currentRate)
  if (rounded <= 1) return 3
  if (rounded === 2) return 3
  if (rounded === 3) return 5
  if (rounded === 4) return 5
  return 1
}
