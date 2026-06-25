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
