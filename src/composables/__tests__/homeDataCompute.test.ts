import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  selectWorkingOn,
  buildHeatmap14,
  joinActivityRows,
  pickCurrentSequence,
  nextCycleScore,
  type ActivityRow,
} from '../homeDataCompute'
import type { Trick, Sequence, PracticeLog } from '../../domain/types'

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
      mkTrick({ id: 'b', status: 'Complete', last: '2026-06-18' }),
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
      { id: 's3', name: 'C', created: '2026-06-01', rate: 3, last: '2026-06-11', steps: [] },
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

describe('nextCycleScore', () => {
  it('null and 0 both cycle to 1 (Bad)', () => {
    expect(nextCycleScore(null)).toBe(1)
    expect(nextCycleScore(0)).toBe(1)
  })

  it('1 and 2 cycle to 3 (Mid)', () => {
    expect(nextCycleScore(1)).toBe(3)
    expect(nextCycleScore(2)).toBe(3)
  })

  it('3 and 4 cycle to 5 (Good)', () => {
    expect(nextCycleScore(3)).toBe(5)
    expect(nextCycleScore(4)).toBe(5)
  })

  it('5 wraps back to 1', () => {
    expect(nextCycleScore(5)).toBe(1)
  })

  it('rounds non-integer rates before mapping (blended rates are decimals)', () => {
    expect(nextCycleScore(2.4)).toBe(3) // rounds to 2 → 3
    expect(nextCycleScore(2.6)).toBe(5) // rounds to 3 → 5
    expect(nextCycleScore(0.4)).toBe(1) // rounds to 0 → 1
  })
})
