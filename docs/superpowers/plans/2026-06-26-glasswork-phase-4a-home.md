# Glasswork Phase 4a — Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` stub with the real Home surface per spec — Quick-jumps row → 14-day activity heatmap → top-5 Working-on list → 7-day granular activity feed — plus a `/tricks?status=in-progress` bridge.

**Architecture:** All data plumbing lives in a single composable `useHomeData()` that delegates to four pure compute functions (testable in isolation via vitest's node env). Practice-log queries use Dexie `liveQuery()` for reactivity. UI is split into one page (`Home.vue`) + five focused components (`QuickJumps`, `Heatmap14`, `WorkingOnList`, `ActivityFeed`, `HomeEmpty`) so each file stays ~100 LOC.

**Tech Stack:** Vue 3 (`<script setup lang="ts">`) · Pinia · Dexie 4 (`liveQuery`) · TypeScript · Vitest (node env, no DOM) · Tailwind v4 with the existing `gw-*` token utilities.

**Spec:** `spec/2026-06-26-glasswork-phase-4a-home-design.md`

---

## File map (locked before tasks begin)

**Create:**
- `src/utils/dates.ts` — `todayLocalIso()`, `daysAgoLocalIso(n)`, `groupByLocalDay()`, `streakDays()`.
- `src/utils/__tests__/dates.test.ts`
- `src/composables/homeDataCompute.ts` — pure functions: `selectWorkingOn`, `buildHeatmap14`, `joinActivityRows`, `pickCurrentSequence`, plus shared types `ActivityRow`, `Heatmap14Cell`.
- `src/composables/__tests__/homeDataCompute.test.ts`
- `src/composables/useHomeData.ts` — thin reactive wrapper over `homeDataCompute.ts` + the `liveQuery` subscription. No unit tests; manual verification.
- `src/components/QuickJumps.vue`
- `src/components/Heatmap14.vue`
- `src/components/WorkingOnList.vue`
- `src/components/ActivityFeed.vue`
- `src/components/HomeEmpty.vue`
- `src/stores/__tests__/tricks.test.ts` — new file; covers the `status` filter addition.

**Modify:**
- `src/stores/tricks.ts` — add `status` to `FilterOpts`; honour it in `filteredAndSorted`. Keep all other behavior unchanged.
- `src/pages/Home.vue` — full rewrite; uses `useHomeData()` + the five new components.
- `src/pages/AllTricks.vue` — read `route.query.status`, pass it into the filter call, render dismissible chip when set.

---

## Cycle semantics for Working-on row dots (decided here, not in spec)

Tap-to-cycle on a `WorkingOnList` row's dots cycles through the discrete pill scores `1 → 3 → 5 → 1` ("Bad" → "Mid" → "Good" → back to "Bad"). The starting point is computed from the current effective rate, mapped to the nearest pill:

| Current effective rate (rounded) | Next score on tap |
|---|---|
| null / 0 | 1 (Bad) |
| 1 | 3 (Mid) |
| 2 | 3 (Mid) |
| 3 | 5 (Good) |
| 4 | 5 (Good) |
| 5 | 1 (Bad) |

For LR tricks, L-dots and R-dots cycle independently using each side's rate. The behaviour is deterministic from store state — no extra local component state is needed.

This is consistent with the canonical `RateButtons` contract (`score: 1 | 3 | 5`, `side: 'L' | 'R' | null`) and routes through the existing `tricksStore.report()` → `applyReport()` → `blend()` pipeline, so the practice_log row, status updates, and outbox enqueue all happen for free.

---

## Task 1: Branch + worktree (optional — skip if working on `main`)

**Files:** None. Environment setup only.

- [ ] **Step 1: Decide on isolation.** The existing redesign work has been committed directly to `main` (78+ commits ahead of `origin`). If you prefer the same flow, skip to Task 2.

- [ ] **Step 2 (optional): Create a worktree.**

```bash
git worktree add ../slalom-app-4a -b phase-4a-home
cd ../slalom-app-4a
```

Then proceed to Task 2 inside the worktree.

---

## Task 2: `src/utils/dates.ts` — local-day primitives

**Files:**
- Create: `src/utils/dates.ts`
- Test: `src/utils/__tests__/dates.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/dates.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  todayLocalIso,
  daysAgoLocalIso,
  groupByLocalDay,
  streakDays,
} from '../dates'

const setNow = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('todayLocalIso', () => {
  it('returns YYYY-MM-DD for local-day boundary', () => {
    setNow('2026-06-26T10:30:00')
    expect(todayLocalIso()).toBe('2026-06-26')
  })
})

describe('daysAgoLocalIso', () => {
  it('returns the ISO of N local-days ago', () => {
    setNow('2026-06-26T10:30:00')
    expect(daysAgoLocalIso(0)).toBe('2026-06-26')
    expect(daysAgoLocalIso(1)).toBe('2026-06-25')
    expect(daysAgoLocalIso(13)).toBe('2026-06-13')
  })

  it('crosses month boundaries', () => {
    setNow('2026-07-02T08:00:00')
    expect(daysAgoLocalIso(5)).toBe('2026-06-27')
  })
})

describe('groupByLocalDay', () => {
  it('buckets ISO timestamps by their local YYYY-MM-DD', () => {
    const timestamps = [
      '2026-06-26T01:00:00',
      '2026-06-26T23:30:00',
      '2026-06-25T12:00:00',
    ]
    const map = groupByLocalDay(timestamps)
    expect(map.get('2026-06-26')).toBe(2)
    expect(map.get('2026-06-25')).toBe(1)
    expect(map.size).toBe(2)
  })

  it('returns an empty map for an empty input', () => {
    expect(groupByLocalDay([]).size).toBe(0)
  })
})

describe('streakDays', () => {
  it('walks back from today while counts >= 1', () => {
    setNow('2026-06-26T10:00:00')
    const counts = new Map([
      ['2026-06-26', 2],
      ['2026-06-25', 1],
      ['2026-06-24', 3],
      // 2026-06-23 missing → streak stops
      ['2026-06-22', 5],
    ])
    expect(streakDays(counts)).toBe(3)
  })

  it('counts today as part of streak even if today has 0 sessions', () => {
    setNow('2026-06-26T08:00:00')
    const counts = new Map([
      ['2026-06-25', 1],
      ['2026-06-24', 2],
    ])
    expect(streakDays(counts)).toBe(3)
  })

  it('returns 1 (today freebie) when the counts map is empty', () => {
    setNow('2026-06-26T08:00:00')
    expect(streakDays(new Map())).toBe(1)
  })

  it('returns 1 when yesterday is the first gap and today has no sessions yet', () => {
    setNow('2026-06-26T08:00:00')
    const counts = new Map([
      ['2026-06-24', 5],
    ])
    expect(streakDays(counts)).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/utils/__tests__/dates.test.ts
```

Expected: fails with `Cannot find module '../dates'`.

- [ ] **Step 3: Implement**

Create `src/utils/dates.ts`:

```ts
const pad = (n: number): string => String(n).padStart(2, '0')

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayLocalIso(): string {
  return toLocalIso(new Date())
}

export function daysAgoLocalIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalIso(d)
}

export function groupByLocalDay(timestamps: string[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const t of timestamps) {
    const key = toLocalIso(new Date(t))
    out.set(key, (out.get(key) ?? 0) + 1)
  }
  return out
}

export function streakDays(counts: Map<string, number>): number {
  let streak = 0
  let cursor = new Date()
  // Today always counts as +1 (the streak shows tomorrow's potential lost).
  // Walk back while the day either is today OR has >=1 session.
  let allowTodayFreebie = true
  for (let i = 0; i < 365; i++) {
    const key = toLocalIso(cursor)
    const hit = (counts.get(key) ?? 0) >= 1
    if (hit || allowTodayFreebie) {
      streak += 1
      allowTodayFreebie = false
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/utils/__tests__/dates.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dates.ts src/utils/__tests__/dates.test.ts
git commit -m "Phase 4a: local-day date utilities"
```

---

## Task 3: Extend `FilterOpts` with `status` field

**Files:**
- Modify: `src/stores/tricks.ts:20-26` (`FilterOpts` interface) and `:62-80` (`filteredAndSorted` getter)
- Create: `src/stores/__tests__/tricks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/tricks.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTricksStore } from '../tricks'
import type { Trick } from '../../domain/types'

const t = (id: string, name: string, status: Trick['status']): Trick => ({
  id,
  name,
  tier: 1,
  category: 'forward',
  entry: '2/f',
  exit: '2/f',
  lr: false,
  rate: null,
  rateL: null,
  rateR: null,
  last: null,
  status,
  aliases: [],
  video: null,
  icon: null,
  tags: [],
  fav: false,
})

describe('tricks store — status filter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('filteredAndSorted({ status: "In Progress" }) returns only In Progress', () => {
    const store = useTricksStore()
    store.tricks = [
      t('1', 'Alpha', 'In Progress'),
      t('2', 'Bravo', 'Not Started'),
      t('3', 'Charlie', 'Complete'),
      t('4', 'Delta', 'In Progress'),
    ]
    const result = store.filteredAndSorted({ status: 'In Progress' })
    expect(result.map((x) => x.id)).toEqual(['1', '4'])
  })

  it('combines status with search', () => {
    const store = useTricksStore()
    store.tricks = [
      t('1', 'Alpha', 'In Progress'),
      t('2', 'Alphabravo', 'Not Started'),
      t('3', 'Alphacharlie', 'In Progress'),
    ]
    const result = store.filteredAndSorted({ status: 'In Progress', search: 'alpha' })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })

  it('combines status with sort=best', () => {
    const store = useTricksStore()
    store.tricks = [
      { ...t('1', 'A', 'In Progress'), rate: 2 },
      { ...t('2', 'B', 'In Progress'), rate: 5 },
      { ...t('3', 'C', 'Complete'), rate: 5 },
    ]
    const result = store.filteredAndSorted({ status: 'In Progress', sort: 'best' })
    expect(result.map((x) => x.id)).toEqual(['2', '1'])
  })

  it('omitting status returns all tricks (no behavior change)', () => {
    const store = useTricksStore()
    store.tricks = [
      t('1', 'A', 'In Progress'),
      t('2', 'B', 'Not Started'),
    ]
    expect(store.filteredAndSorted({}).map((x) => x.id).sort()).toEqual(['1', '2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/stores/__tests__/tricks.test.ts
```

Expected: the first three tests fail (status filter not yet supported); the last test passes.

- [ ] **Step 3: Implement**

In `src/stores/tricks.ts`, find the `FilterOpts` interface (~line 20):

```ts
export interface FilterOpts {
  tier?: Tier | null;
  category?: Category | 'all';
  search?: string;
  sort?: SortKey;
  practicedOnly?: boolean;
}
```

Replace with:

```ts
export interface FilterOpts {
  tier?: Tier | null;
  category?: Category | 'all';
  search?: string;
  sort?: SortKey;
  practicedOnly?: boolean;
  status?: TrickStatus | null;
}
```

Add the import for `TrickStatus` to the existing `import type` line at the top of the file:

```ts
import type { Category, Side, Tier, Trick, TrickStatus } from '../domain/types';
```

Then in `filteredAndSorted` (the getter near line 62), inside the inner closure, after the existing destructure block:

```ts
const {
  tier = null,
  category = 'all',
  search = '',
  sort = 'name',
  practicedOnly = false,
  status = null,
} = opts;
let list = state.tricks.slice();
if (tier != null) list = list.filter((t) => t.tier === tier);
if (category && category !== 'all')
  list = list.filter((t) => t.category === category);
if (search) list = list.filter((t) => matchesQuery(t, search));
if (practicedOnly) list = list.filter((t) => hasRate(t));
if (status != null) list = list.filter((t) => t.status === status);
list.sort(sorters[sort]);
return list;
```

- [ ] **Step 4: Run tests + typecheck**

```bash
npm test -- src/stores/__tests__/tricks.test.ts
npm run build
```

Expected: tests pass; build succeeds (no TS errors anywhere else from the broadened `FilterOpts`).

- [ ] **Step 5: Commit**

```bash
git add src/stores/tricks.ts src/stores/__tests__/tricks.test.ts
git commit -m "Phase 4a: tricks store accepts status filter"
```

---

## Task 4: Pure compute helpers — `src/composables/homeDataCompute.ts`

**Files:**
- Create: `src/composables/homeDataCompute.ts`
- Test: `src/composables/__tests__/homeDataCompute.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/composables/__tests__/homeDataCompute.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  selectWorkingOn,
  buildHeatmap14,
  joinActivityRows,
  pickCurrentSequence,
  type ActivityRow,
  type Heatmap14Cell,
} from '../homeDataCompute'
import type { Trick, Sequence, Transition, PracticeLog } from '../../domain/types'

afterEach(() => {
  vi.useRealTimers()
})
const setNow = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

const mkTrick = (over: Partial<Trick>): Trick => ({
  id: 't', name: 'Trick', tier: 1, category: 'forward', entry: '2/f', exit: '2/f',
  lr: false, rate: null, rateL: null, rateR: null, last: null,
  status: 'Not Started', aliases: [], video: null, icon: null, tags: [], fav: false,
  ...over,
})

describe('selectWorkingOn', () => {
  it('includes In Progress tricks even with null `last`', () => {
    setNow('2026-06-26T10:00:00')
    const out = selectWorkingOn([
      mkTrick({ id: 'a', status: 'In Progress', last: null }),
      mkTrick({ id: 'b', status: 'Not Started', last: null }),
    ])
    expect(out.map((x) => x.id)).toEqual(['a'])
  })

  it('includes recently-rated even when status is Complete', () => {
    setNow('2026-06-26T10:00:00')
    const out = selectWorkingOn([
      mkTrick({ id: 'a', status: 'Complete', last: '2026-06-25' }),
      mkTrick({ id: 'b', status: 'Complete', last: '2026-06-18' }),  // 8d ago → excluded
    ])
    expect(out.map((x) => x.id)).toEqual(['a'])
  })

  it('sorts by last DESC, then name ASC', () => {
    setNow('2026-06-26T10:00:00')
    const out = selectWorkingOn([
      mkTrick({ id: 'a', name: 'Zebra', status: 'In Progress', last: '2026-06-25' }),
      mkTrick({ id: 'b', name: 'Alpha', status: 'In Progress', last: '2026-06-25' }),
      mkTrick({ id: 'c', name: 'Mid',   status: 'In Progress', last: '2026-06-26' }),
    ])
    expect(out.map((x) => x.id)).toEqual(['c', 'b', 'a'])
  })

  it('caps at 5 rows but returns the full match count', () => {
    setNow('2026-06-26T10:00:00')
    const tricks: Trick[] = []
    for (let i = 0; i < 8; i++) {
      tricks.push(mkTrick({ id: `t${i}`, name: `T${i}`, status: 'In Progress' }))
    }
    const out = selectWorkingOn(tricks)
    expect(out).toHaveLength(5)
  })
})

describe('buildHeatmap14', () => {
  it('produces 14 cells, oldest first, today last with isToday=true', () => {
    setNow('2026-06-26T10:00:00')
    const cells = buildHeatmap14([])
    expect(cells).toHaveLength(14)
    expect(cells[0].dateLocal).toBe('2026-06-13')
    expect(cells[13].dateLocal).toBe('2026-06-26')
    expect(cells[13].isToday).toBe(true)
    expect(cells.filter((c) => c.isToday)).toHaveLength(1)
  })

  it('buckets counts into level 0/1/2/3', () => {
    setNow('2026-06-26T10:00:00')
    const logs = (counts: Record<string, number>): PracticeLog[] =>
      Object.entries(counts).flatMap(([date, n]) =>
        Array.from({ length: n }, (_, i) => ({
          id: `${date}-${i}`,
          entityType: 'trick' as const,
          entityId: 't',
          side: null,
          score: 5,
          at: `${date}T10:0${i}:00`,
        })),
      )
    const cells = buildHeatmap14(logs({
      '2026-06-26': 0,
      '2026-06-25': 1,
      '2026-06-24': 2,
      '2026-06-23': 3,
      '2026-06-22': 5,
      '2026-06-21': 6,
      '2026-06-20': 12,
    }))
    const byDate = new Map(cells.map((c) => [c.dateLocal, c]))
    expect(byDate.get('2026-06-26')!.level).toBe(0)
    expect(byDate.get('2026-06-25')!.level).toBe(1)
    expect(byDate.get('2026-06-24')!.level).toBe(1)
    expect(byDate.get('2026-06-23')!.level).toBe(2)
    expect(byDate.get('2026-06-22')!.level).toBe(2)
    expect(byDate.get('2026-06-21')!.level).toBe(3)
    expect(byDate.get('2026-06-20')!.level).toBe(3)
  })

  it('omits logs outside the 14-day window from cell counts', () => {
    setNow('2026-06-26T10:00:00')
    const logs: PracticeLog[] = [
      { id: '1', entityType: 'trick', entityId: 't', side: null, score: 5, at: '2026-06-12T10:00:00' },
    ]
    const cells = buildHeatmap14(logs)
    expect(cells.every((c) => c.count === 0)).toBe(true)
  })
})

describe('joinActivityRows', () => {
  it('joins entity names + icons for trick events', () => {
    const tricks = [
      mkTrick({ id: 't1', name: 'Backward Half-Lemon', icon: '🍋' }),
    ]
    const logs: PracticeLog[] = [
      { id: 'p1', entityType: 'trick', entityId: 't1', side: 'L', score: 5, at: '2026-06-26T10:00:00' },
    ]
    const out = joinActivityRows(logs, tricks, [], [])
    expect(out).toEqual<ActivityRow[]>([
      {
        id: 'p1',
        entityType: 'trick',
        entityId: 't1',
        displayName: 'Backward Half-Lemon',
        icon: '🍋',
        side: 'L',
        score: 5,
        at: '2026-06-26T10:00:00',
      },
    ])
  })

  it('joins sequences too', () => {
    const seqs: Sequence[] = [
      { id: 's1', name: 'Warm-up loop', created: '2026-06-01', rate: null, last: '2026-06-26', steps: [] },
    ]
    const logs: PracticeLog[] = [
      { id: 'p1', entityType: 'sequence', entityId: 's1', side: null, score: 4, at: '2026-06-26T11:00:00' },
    ]
    const out = joinActivityRows(logs, [], seqs, [])
    expect(out[0].displayName).toBe('Warm-up loop')
    expect(out[0].icon).toBeNull()
  })

  it('falls back to entityType label when entity missing', () => {
    const logs: PracticeLog[] = [
      { id: 'p1', entityType: 'trick', entityId: 'missing', side: null, score: 3, at: '2026-06-26T11:00:00' },
    ]
    const out = joinActivityRows(logs, [], [], [])
    expect(out[0].displayName).toBe('Trick')
    expect(out[0].icon).toBeNull()
  })
})

describe('pickCurrentSequence', () => {
  it('picks the most recently rated sequence within 14d', () => {
    setNow('2026-06-26T10:00:00')
    const seqs: Sequence[] = [
      { id: 's1', name: 'A', created: '2026-06-01', rate: 3, last: '2026-06-25', steps: [] },
      { id: 's2', name: 'B', created: '2026-06-01', rate: 3, last: '2026-06-22', steps: [] },
      { id: 's3', name: 'C', created: '2026-06-01', rate: 3, last: '2026-06-11', steps: [] },  // outside window
    ]
    expect(pickCurrentSequence(seqs)?.id).toBe('s1')
  })

  it('returns null when no sequence is within 14d', () => {
    setNow('2026-06-26T10:00:00')
    expect(pickCurrentSequence([
      { id: 's1', name: 'A', created: '2026-06-01', rate: null, last: null, steps: [] },
      { id: 's2', name: 'B', created: '2026-06-01', rate: 3, last: '2026-06-10', steps: [] },
    ])).toBeNull()
  })

  it('returns null on empty input', () => {
    setNow('2026-06-26T10:00:00')
    expect(pickCurrentSequence([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/composables/__tests__/homeDataCompute.test.ts
```

Expected: fails — `Cannot find module '../homeDataCompute'`.

- [ ] **Step 3: Implement**

Create `src/composables/homeDataCompute.ts`:

```ts
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
  const cutoff = daysAgoLocalIso(days - 1) // inclusive window starting `days-1` days back
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
  if (rounded <= 0) return 1
  if (rounded === 1) return 3
  if (rounded === 2) return 3
  if (rounded === 3) return 5
  if (rounded === 4) return 5
  return 1 // 5 wraps back to 1
}
```

- [ ] **Step 4: Run tests + typecheck**

```bash
npm test -- src/composables/__tests__/homeDataCompute.test.ts
npm run build
```

Expected: all tests pass; build clean.

- [ ] **Step 5: Commit**

```bash
git add src/composables/homeDataCompute.ts src/composables/__tests__/homeDataCompute.test.ts
git commit -m "Phase 4a: pure compute helpers for Home data"
```

---

## Task 5: `useHomeData` composable — reactive wrapper

**Files:**
- Create: `src/composables/useHomeData.ts`

No unit tests — this file is pure plumbing over the (already-tested) helpers and `liveQuery`. Manual verification once `Home.vue` consumes it.

- [ ] **Step 1: Implement**

Create `src/composables/useHomeData.ts`:

```ts
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

  // Ensure all three stores are loaded. Each `.load()` is idempotent in
  // existing code: it re-fetches from Dexie but doesn't double-mount.
  tricksStore.load()
  sequencesStore.load()
  transitionsStore.load()

  // Cover 28 days so we can compute the previous-period delta in addition
  // to the current 14d window.
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
    // Previous 14d window = days 14..27 ago.
    const olderCutoff = daysAgoLocalIso(2 * HEATMAP_WINDOW_DAYS - 1) + 'T00:00:00'
    const newerCutoff = daysAgoLocalIso(HEATMAP_WINDOW_DAYS - 1) + 'T00:00:00'
    const prior = recentLogs.value.filter((l) => l.at >= olderCutoff && l.at < newerCutoff).length
    if (prior === 0 && sessionsTotal14.value === 0) return null
    if (prior === 0) return null // first-ever data; no honest delta
    return sessionsTotal14.value - prior
  })
  const streakDaysRef = computed(() => streakFromLogs(recentLogs.value))

  const activityRows = computed(() =>
    joinActivityRows(
      logs7.value,
      tricksStore.tricks,
      sequencesStore.sequences,
      transitionsStore.transitions,
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
```

> **Note for the implementer:** if `useTransitionsStore` doesn't yet expose a `transitions` ref / `load()` action that mirrors the tricks store, mirror the `useTricksStore` shape (a `state.transitions: Transition[]` + a `load()` action that calls `getAllTransitions()`). Check `src/stores/transitions.ts` first — if it's already wired this way (it is in the existing graph page), no change needed.

- [ ] **Step 2: Verify the build still compiles**

```bash
npm run build
```

Expected: clean build. (Any TS errors here mean a store shape mismatch — fix at the call site, not in the store.)

- [ ] **Step 3: Commit**

```bash
git add src/composables/useHomeData.ts
git commit -m "Phase 4a: useHomeData reactive composable"
```

---

## Task 6: `Heatmap14.vue` component

**Files:**
- Create: `src/components/Heatmap14.vue`

- [ ] **Step 1: Implement**

Create `src/components/Heatmap14.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { Heatmap14Cell } from '../composables/homeDataCompute'

type Props = {
  cells: Heatmap14Cell[]
  sessionsTotal: number
  sessionsDelta: number | null
  streakDays: number
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), { isLoading: false })

const deltaLabel = computed(() => {
  if (props.sessionsDelta == null) return null
  if (props.sessionsDelta > 0) return `↗ +${props.sessionsDelta}`
  if (props.sessionsDelta < 0) return `↘ ${props.sessionsDelta}`
  return '→ 0'
})

const deltaColor = computed(() => {
  if (props.sessionsDelta == null) return 'var(--color-g-fg-muted)'
  if (props.sessionsDelta > 0) return 'var(--color-g-leg-r)' // teal up
  if (props.sessionsDelta < 0) return 'var(--color-g-leg-l)' // peach down
  return 'var(--color-g-fg-muted)'
})

const cellBg = (level: 0 | 1 | 2 | 3): string => {
  if (level === 0) return 'rgba(255,255,255,0.03)'
  if (level === 1) return 'rgba(181, 168, 255, 0.18)'
  if (level === 2) return 'rgba(181, 168, 255, 0.40)'
  return 'rgba(181, 168, 255, 0.75)'
}
const cellFg = (level: 0 | 1 | 2 | 3): string => {
  if (level === 0) return 'var(--color-g-fg-muted)'
  if (level === 1) return 'var(--color-g-fg)'
  return 'var(--color-g-base)'
}
</script>

<template>
  <section
    class="gw-glass p-4 flex flex-col gap-3"
    :style="{ borderRadius: 'var(--radius-g-panel)' }"
    aria-label="Last 14 days activity"
  >
    <header class="flex items-baseline justify-between px-1">
      <div class="flex items-baseline gap-4">
        <div class="flex flex-col">
          <span
            class="font-semibold"
            :style="{ fontSize: '22px', color: 'var(--color-g-fg)', lineHeight: 1 }"
            data-testid="sessions-total"
          >{{ sessionsTotal }}</span>
          <span
            :style="{ fontSize: '10px', letterSpacing: '0.06em', color: 'var(--color-g-fg-muted)', textTransform: 'uppercase' }"
          >Sessions <span v-if="deltaLabel" :style="{ color: deltaColor, fontWeight: 600 }">{{ deltaLabel }}</span></span>
        </div>
        <div class="flex flex-col">
          <span
            class="font-semibold"
            :style="{ fontSize: '22px', color: 'var(--color-g-fg)', lineHeight: 1 }"
            data-testid="streak-days"
          >{{ streakDays }}</span>
          <span
            :style="{ fontSize: '10px', letterSpacing: '0.06em', color: 'var(--color-g-fg-muted)', textTransform: 'uppercase' }"
          >Day streak</span>
        </div>
      </div>
      <span
        :style="{ fontSize: '11px', color: 'var(--color-g-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }"
      >14 days</span>
    </header>

    <div
      v-if="!isLoading"
      class="grid grid-cols-7 gap-1.5"
    >
      <div
        v-for="c in cells"
        :key="c.dateLocal"
        class="aspect-square flex items-center justify-center text-[11px]"
        :style="{
          background: cellBg(c.level),
          color: cellFg(c.level),
          borderRadius: 'var(--radius-g-micro)',
          fontWeight: c.level >= 2 ? 600 : 400,
          border: c.isToday ? '1.5px solid var(--color-g-brand)' : '1.5px solid transparent',
        }"
        :aria-label="`${c.dateLocal}: ${c.count} sessions`"
      >{{ c.dayOfMonth }}</div>
    </div>
    <div v-else class="grid grid-cols-7 gap-1.5">
      <div
        v-for="i in 14"
        :key="i"
        class="aspect-square gw-hatch"
        :style="{ borderRadius: 'var(--radius-g-micro)' }"
      />
    </div>

    <div class="flex items-center gap-1.5 justify-end px-1">
      <span :style="{ fontSize: '10px', color: 'var(--color-g-fg-muted)' }">less</span>
      <span class="w-3 h-3" :style="{ background: cellBg(0), borderRadius: '3px' }" />
      <span class="w-3 h-3" :style="{ background: cellBg(1), borderRadius: '3px' }" />
      <span class="w-3 h-3" :style="{ background: cellBg(2), borderRadius: '3px' }" />
      <span class="w-3 h-3" :style="{ background: cellBg(3), borderRadius: '3px' }" />
      <span :style="{ fontSize: '10px', color: 'var(--color-g-fg-muted)' }">more</span>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/Heatmap14.vue
git commit -m "Phase 4a: Heatmap14 component"
```

---

## Task 7: `WorkingOnList.vue` component

**Files:**
- Create: `src/components/WorkingOnList.vue`

**v1 cycle policy** (decided here): the dots area is a single tap target. For LR tricks, tap cycles the L-side rate; the R-side rate is editable from `TrickSheet` only. Per-side cycle on Home is deferred to Phase 4b. This keeps the row's hit-target large and avoids ambiguous tap-zone splitting on a small row.

- [ ] **Step 1: Implement**

Create `src/components/WorkingOnList.vue`:

```vue
<script setup lang="ts">
import RateDots from './RateDots.vue'
import { nextCycleScore } from '../composables/homeDataCompute'
import { useTricksStore } from '../stores/tricks'
import type { Trick } from '../domain/types'

type Props = {
  tricks: Trick[]
  totalCount: number
  isLoading?: boolean
}
withDefaults(defineProps<Props>(), { isLoading: false })

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'see-all'): void
}>()

const tricksStore = useTricksStore()

function iconFor(t: Trick): string {
  if (t.icon) return t.icon
  // Mirror the graph W6 fallback: uppercase first letters of name words.
  return t.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase()
}

function cycle(t: Trick, event: Event) {
  event.stopPropagation()
  if (!t.id) return
  const side: 'L' | null = t.lr ? 'L' : null
  const currentRate = t.lr ? t.rateL : t.rate
  const next = nextCycleScore(currentRate)
  void tricksStore.report(t.id, side, next)
}

function openSheet(t: Trick) {
  if (t.id) emit('open', t.id)
}
</script>

<template>
  <section class="flex flex-col gap-2">
    <header class="flex items-center justify-between px-2">
      <h2
        class="font-semibold"
        :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)' }"
      >
        Working on <span :style="{ color: 'var(--color-g-fg-muted)', fontWeight: 400, fontSize: 'var(--text-g-body)' }">· {{ totalCount }}</span>
      </h2>
      <button
        v-if="totalCount > tricks.length"
        type="button"
        class="active:opacity-60"
        :style="{ color: 'var(--color-g-brand)', fontSize: 'var(--text-g-body)' }"
        @click="emit('see-all')"
      >See all ›</button>
    </header>

    <template v-if="isLoading">
      <div
        v-for="i in 3"
        :key="i"
        class="gw-glass gw-hatch h-12"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
      />
    </template>

    <template v-else-if="tricks.length === 0">
      <div
        class="px-3 py-2 gw-hatch"
        :style="{
          borderRadius: 'var(--radius-g-chip)',
          color: 'var(--color-g-fg-muted)',
          fontSize: 'var(--text-g-body)',
        }"
      >Nothing in progress — rate something to start.</div>
    </template>

    <template v-else>
      <button
        v-for="t in tricks"
        :key="t.id"
        type="button"
        class="gw-glass flex items-center gap-3 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
        :style="{ borderRadius: 'var(--radius-g-chip)' }"
        @click="openSheet(t)"
      >
        <span
          class="flex items-center justify-center font-semibold w-7 h-7"
          :style="{
            color: 'var(--color-g-fg)',
            fontSize: t.icon ? '18px' : '12px',
            letterSpacing: t.icon ? '0' : '0.04em',
          }"
        >{{ iconFor(t) }}</span>
        <span
          class="flex-1 truncate"
          :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
        >{{ t.name }}</span>
        <span
          class="px-2 py-1 -m-1"
          role="button"
          tabindex="0"
          :aria-label="`Cycle rate for ${t.name}`"
          @click="cycle(t, $event)"
        >
          <RateDots
            :rate="t.rate"
            :rate-l="t.rateL"
            :rate-r="t.rateR"
            :lr="t.lr"
          />
        </span>
      </button>
    </template>
  </section>
</template>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/WorkingOnList.vue
git commit -m "Phase 4a: WorkingOnList component"
```

---

## Task 8: `ActivityFeed.vue` component

**Files:**
- Create: `src/components/ActivityFeed.vue`

- [ ] **Step 1: Implement**

Create `src/components/ActivityFeed.vue`:

```vue
<script setup lang="ts">
import type { ActivityRow } from '../composables/homeDataCompute'

type Props = {
  rows: ActivityRow[]
  isLoading?: boolean
}
const props = withDefaults(defineProps<Props>(), { isLoading: false })

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const mins = Math.floor((now - then) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yest.'
  return `${days}d`
}

function sideColor(side: ActivityRow['side']): string {
  if (side === 'L') return 'var(--color-g-leg-l)'
  if (side === 'R') return 'var(--color-g-leg-r)'
  return 'var(--color-g-fg)'
}
</script>

<template>
  <section class="flex flex-col gap-2">
    <header class="px-2">
      <h2
        class="font-semibold"
        :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)' }"
      >Recent activity</h2>
    </header>

    <div
      class="flex flex-col gap-1.5 overflow-y-auto"
      style="max-height: 360px;"
    >
      <template v-if="isLoading">
        <div
          v-for="i in 3"
          :key="i"
          class="gw-glass gw-hatch h-10"
          :style="{ borderRadius: 'var(--radius-g-chip)' }"
        />
      </template>

      <template v-else-if="rows.length === 0">
        <div
          class="px-3 py-2 gw-hatch"
          :style="{
            borderRadius: 'var(--radius-g-chip)',
            color: 'var(--color-g-fg-muted)',
            fontSize: 'var(--text-g-body)',
          }"
        >No sessions in the last 7 days.</div>
      </template>

      <template v-else>
        <div
          v-for="r in rows"
          :key="r.id"
          class="gw-glass flex items-center gap-3 px-3 py-2"
          :style="{ borderRadius: 'var(--radius-g-chip)' }"
        >
          <span
            class="flex items-center justify-center w-6 h-6"
            :style="{ color: 'var(--color-g-fg-muted)', fontSize: '15px' }"
          >{{ r.icon ?? '·' }}</span>
          <span
            class="flex-1 truncate"
            :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg)' }"
          >{{ r.displayName }}</span>
          <span
            :style="{
              fontSize: 'var(--text-g-body)',
              color: sideColor(r.side),
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }"
          ><span v-if="r.side">{{ r.side }} </span>{{ r.score }}</span>
          <span
            :style="{
              fontSize: 'var(--text-g-micro)',
              color: 'var(--color-g-fg-muted)',
              minWidth: '38px',
              textAlign: 'right',
            }"
          >{{ timeAgo(r.at) }}</span>
        </div>
      </template>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ActivityFeed.vue
git commit -m "Phase 4a: ActivityFeed component"
```

---

## Task 9: `QuickJumps.vue` component

**Files:**
- Create: `src/components/QuickJumps.vue`

- [ ] **Step 1: Implement**

Create `src/components/QuickJumps.vue`:

```vue
<script setup lang="ts">
import type { Sequence } from '../domain/types'

type Props = {
  currentSequence: Sequence | null
}
defineProps<Props>()

const emit = defineEmits<{
  (e: 'open-graph'): void
  (e: 'open-sequence', id: string): void
  (e: 'new-sequence'): void
}>()
</script>

<template>
  <div class="flex gap-2">
    <button
      type="button"
      class="flex-1 px-3 py-3 font-semibold text-left flex flex-col gap-0.5 active:scale-[0.98] transition-transform"
      :style="{
        background: 'var(--color-g-brand)',
        color: 'var(--color-g-base)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('open-graph')"
    >
      <span>Open Graph</span>
      <span :style="{ fontSize: '11px', opacity: 0.7 }">Trick map</span>
    </button>

    <button
      v-if="currentSequence"
      type="button"
      class="gw-glass flex-1 px-3 py-3 font-semibold text-left flex flex-col gap-0.5 active:scale-[0.98] transition-transform"
      :style="{
        color: 'var(--color-g-fg)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('open-sequence', currentSequence.id!)"
    >
      <span>Current Sequence</span>
      <span :style="{ fontSize: '11px', color: 'var(--color-g-fg-muted)' }" class="truncate">{{ currentSequence.name }}</span>
    </button>

    <button
      v-else
      type="button"
      class="gw-glass flex-1 px-3 py-3 font-semibold text-left flex flex-col gap-0.5 active:scale-[0.98] transition-transform"
      :style="{
        color: 'var(--color-g-fg)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('new-sequence')"
    >
      <span>New sequence</span>
      <span :style="{ fontSize: '11px', color: 'var(--color-g-fg-muted)' }">Start fresh</span>
    </button>
  </div>
</template>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/QuickJumps.vue
git commit -m "Phase 4a: QuickJumps component"
```

---

## Task 10: `HomeEmpty.vue` component

**Files:**
- Create: `src/components/HomeEmpty.vue`

- [ ] **Step 1: Implement**

Create `src/components/HomeEmpty.vue`:

```vue
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'cta'): void
}>()
</script>

<template>
  <section
    class="gw-glass p-6 flex flex-col gap-4 items-start"
    :style="{ borderRadius: 'var(--radius-g-panel)' }"
  >
    <p
      :style="{ fontSize: 'var(--text-g-h2)', color: 'var(--color-g-fg)', lineHeight: 1.3 }"
      class="font-semibold"
    >Rate a trick to get started.</p>
    <p
      :style="{ fontSize: 'var(--text-g-body)', color: 'var(--color-g-fg-muted)' }"
    >Your Working-on list, recent activity, and 2-week heatmap all live here. They fill in as you tap.</p>
    <button
      type="button"
      class="px-4 py-2.5 font-semibold active:scale-95 transition-transform"
      :style="{
        background: 'var(--color-g-brand)',
        color: 'var(--color-g-base)',
        borderRadius: 'var(--radius-g-chip)',
        fontSize: 'var(--text-g-body)',
      }"
      @click="emit('cta')"
    >Open Tricks</button>
  </section>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HomeEmpty.vue
git commit -m "Phase 4a: HomeEmpty component"
```

---

## Task 11: Rewrite `Home.vue` page

**Files:**
- Modify: `src/pages/Home.vue` (full rewrite)

- [ ] **Step 1: Implement**

**Sheet wiring context (read before implementing):** in this app, `TrickSheet` and `SequenceSheet` are mounted ONCE globally in `App.vue` and read their target id from `useUiStore` (`openSheet(id)` and `openSequence(id)`). Do NOT mount them locally in Home.vue. `GeneratorSheet`, by contrast, is mounted per-page with a `visible: boolean` prop and a `@save` handler (mirrors `Sequences.vue:84`).

Replace `src/pages/Home.vue` entirely with:

```vue
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
  <div class="gw-aurora-bg-lg min-h-screen px-4 pt-6 pb-24 flex flex-col gap-4">
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

    <GeneratorSheet
      :visible="showGenerator"
      @close="showGenerator = false"
      @save="onGeneratorSave"
    />
  </div>
</template>
```

The `onGeneratorSave` handler mirrors `Sequences.vue:27-30` — same `sequencesStore.create({ name, steps })` call — and then opens the freshly-saved sequence in `SequenceSheet` via the UI store, so the "New sequence" CTA lands the user in the rehearsal sheet rather than the list view.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Start dev server + smoke-test**

```bash
npm run dev
```

In the browser at the dev URL, navigate to `/#/`. Verify:
- Quick-jumps row visible.
- Heatmap renders 14 cells (likely sparse depending on local data).
- Working-on shows current In-Progress tricks; tap-to-cycle on a row's dots updates the dots immediately.
- Activity feed shows last 7d events; if you cycle a Working-on row, a new row appears at the top of the feed within a tick.
- Tap a Working-on row body (not dots) → TrickSheet opens.
- Tap Current Sequence (if present) → SequenceSheet opens. Otherwise tap "New sequence" → GeneratorSheet opens.
- Tap "See all" on Working-on → routes to `/#/tricks?status=in-progress`.

If any sheet wiring is wrong, fix the prop names per the existing component signatures and re-verify.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.vue
git commit -m "Phase 4a: Home page composes data + sections"
```

---

## Task 12: `/tricks?status=in-progress` bridge in `AllTricks.vue`

**Files:**
- Modify: `src/pages/AllTricks.vue`

- [ ] **Step 1: Read the current page**

```bash
cat src/pages/AllTricks.vue
```

Identify where `filteredAndSorted({...})` (or equivalent computed) is called.

- [ ] **Step 2: Implement**

Add to the `<script setup>` block (near the existing route / filter wiring):

```ts
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TrickStatus } from '../domain/types'

const route = useRoute()
const router = useRouter()

const VALID_STATUSES: Record<string, TrickStatus> = {
  'in-progress': 'In Progress',
  'complete': 'Complete',
  'not-started': 'Not Started',
}

const statusFilter = computed<TrickStatus | null>(() => {
  const raw = route.query.status
  if (typeof raw !== 'string') return null
  return VALID_STATUSES[raw] ?? null
})

function clearStatusFilter() {
  const next = { ...route.query }
  delete next.status
  router.replace({ path: route.path, query: next })
}
```

Pass `statusFilter.value` into the call to `tricksStore.filteredAndSorted({...})` by adding `status: statusFilter.value` to the options object.

Add a chip above the existing tier-tabs container in the `<template>`:

```vue
<div
  v-if="statusFilter"
  class="flex justify-start px-4"
>
  <button
    type="button"
    class="gw-glass-strong flex items-center gap-2 px-3 py-1.5 active:scale-95 transition-transform"
    :style="{
      borderRadius: 'var(--radius-g-chip)',
      color: 'var(--color-g-fg)',
      fontSize: 'var(--text-g-micro)',
    }"
    @click="clearStatusFilter"
  >
    <span>{{ statusFilter }}</span>
    <span :style="{ color: 'var(--color-g-fg-muted)', fontSize: '14px', lineHeight: 1 }">×</span>
  </button>
</div>
```

Place it as the first child of the page container, before the existing tier tabs row.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Smoke-test**

```bash
npm run dev
```

Navigate to `/#/tricks?status=in-progress`. Verify:
- Only In Progress tricks render.
- Chip "In Progress ×" visible above tier tabs.
- Tap × → chip disappears; full catalog returns; URL no longer has `?status=…`.
- Tier tab selection still works on top of the status filter (combination filtering).

- [ ] **Step 5: Commit**

```bash
git add src/pages/AllTricks.vue
git commit -m "Phase 4a: AllTricks honours ?status= query param + dismissible chip"
```

---

## Task 13: Final integration verification

**Files:** None modified. Verification only.

- [ ] **Step 1: Full test suite**

```bash
npm test
```

Expected: all 100+ tests pass, including the new `dates`, `tricks`, and `homeDataCompute` files.

- [ ] **Step 2: Full build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Dev preview — full flow**

```bash
npm run dev
```

Verify these flows in a browser:
1. Cold load `/#/`: Heatmap loads after a tick (no layout shift between skeleton and real data — verify by reloading).
2. Tap Working-on row → TrickSheet opens; close → returns to Home.
3. Tap rate dots on a Working-on row → score updates in the dots AND a new row appears at the top of Activity feed AND today's heatmap cell brightens within one liveQuery emission tick.
4. Tap Quick-jump "Open Graph" → routes to /#/graph.
5. With at least one sequence rated in the last 14d: Quick-jumps slot 2 says "Current Sequence" + that name; tap opens SequenceSheet.
6. Wipe (or temporarily clear) sequences: Quick-jumps slot 2 says "New sequence"; tap opens GeneratorSheet.
7. Working-on "See all" navigates to `/#/tricks?status=in-progress`; chip dismisses cleanly.
8. Activity feed inner-scrolls without scrolling the page chrome.

- [ ] **Step 4: Document the phase as shipped**

Update `spec/SESSION-HANDOFF.md`:
- In "What's shipped (Glasswork)" add a "### Phase 4a — Home" section listing what landed.
- In "What's NOT done", remove the Phase 4a entry.
- Move Phase 4a row in the status table in the roadmap (`spec/2026-06-24-redesign-glasswork-roadmap.md`) from Phase 4 catch-all into its own row marked Shipped with today's date.

Commit:

```bash
git add spec/SESSION-HANDOFF.md spec/2026-06-24-redesign-glasswork-roadmap.md
git commit -m "Phase 4a: docs — mark Home shipped"
```

---

## Task 14: Manual iOS Safari smoke-test (ship gate per roadmap)

**Files:** None.

- [ ] **Step 1: Build + serve a tunnel** (or push to a preview deploy)

```bash
npm run build && npm run preview
```

Expose with `ngrok http 4173` (or equivalent) and open on a real iPhone.

- [ ] **Step 2: Verify on hardware**

Check, in order:
1. Cold load on real iPhone: no layout shift between skeleton and live data.
2. Activity feed inner-scroll holds 60fps when seeded with a heavy day (40+ events). Use Dexie devtools or temporary seed code to inject events if your real data is sparse.
3. Heatmap blur/glass holds smooth — no scroll stutter on the panel.
4. Tap-to-cycle on a Working-on row updates dots without dropping frames in feed + heatmap reactivity.
5. The three open bugs from the prior session also remain fixed:
   - Home avatar menu opens on tap.
   - Graph linking banner reads cleanly.
   - TabBar doesn't drift on keyboard dismiss after opening a sheet from Home.

If any check fails, fix the underlying cause before declaring Phase 4a shipped. Do not commit "shipped" docs in Task 13 step 4 until this step is clean.

---

## What this plan deliberately does not do

- Does not introduce per-side cycle on LR Working-on rows (deferred to Phase 4b filter-sheet pass).
- Does not animate streak counter or heatmap cell transitions (Phase 5 motion).
- Does not add component-level unit tests — the project convention is data-layer tests + manual + iOS smoke. Following the convention.
- Does not rename `AllTricks.vue` → `Tricks.vue` (Phase 4b).
- Does not surface social activity or notifications on Home (out of scope; M4 territory).
