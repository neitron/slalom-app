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

const tWithFav = (id: string, name: string, status: Trick['status'], fav: boolean, tier: 1 | 2 | 3 | 4 | 5 | 6 = 1): Trick => ({
  id, name, tier, category: 'forward', entry: '2/f', exit: '2/f',
  lr: false, rate: null, rateL: null, rateR: null, last: null,
  status, aliases: [], video: null, icon: null, tags: [], fav,
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

  // Plural multi-select fields (Phase 4b)
  it('filteredAndSorted({ tiers: [2, 3] }) returns only tier 2 and 3', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
      tWithFav('3', 'C', 'Not Started', false, 3),
      tWithFav('4', 'D', 'Not Started', false, 4),
    ]
    const result = store.filteredAndSorted({ tiers: [2, 3] })
    expect(result.map((x) => x.id).sort()).toEqual(['2', '3'])
  })

  it('filteredAndSorted({ tiers: [] }) is unconstrained on tier', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
    ]
    const result = store.filteredAndSorted({ tiers: [] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ categories: ["forward", "backward"] }) returns only those', () => {
    const store = useTricksStore()
    const forward = tWithFav('1', 'A', 'Not Started', false)
    const backward = { ...tWithFav('2', 'B', 'Not Started', false), category: 'backward' as const }
    const cross = { ...tWithFav('3', 'C', 'Not Started', false), category: 'cross' as const }
    store.tricks = [forward, backward, cross]
    const result = store.filteredAndSorted({ categories: ['forward', 'backward'] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ statuses: ["In Progress", "Complete"] }) returns both', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'In Progress', false),
      tWithFav('2', 'B', 'Complete', false),
      tWithFav('3', 'C', 'Not Started', false),
    ]
    const result = store.filteredAndSorted({ statuses: ['In Progress', 'Complete'] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ favOnly: true }) returns only favs', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', true),
      tWithFav('2', 'B', 'Not Started', false),
      tWithFav('3', 'C', 'Not Started', true),
    ]
    const result = store.filteredAndSorted({ favOnly: true })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })

  it('AND across dimensions, OR within: tiers + statuses + favOnly compose correctly', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'In Progress', true, 2),
      tWithFav('2', 'B', 'In Progress', false, 2),
      tWithFav('3', 'C', 'Complete', true, 3),
      tWithFav('4', 'D', 'Not Started', true, 2),
      tWithFav('5', 'E', 'In Progress', true, 5),
    ]
    const result = store.filteredAndSorted({
      tiers: [2, 3],
      statuses: ['In Progress', 'Complete'],
      favOnly: true,
    })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })

  it('deprecated singular `tier: 2` still narrows to tier 2', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
      tWithFav('3', 'C', 'Not Started', false, 3),
    ]
    const result = store.filteredAndSorted({ tier: 2 })
    expect(result.map((x) => x.id)).toEqual(['2'])
  })

  it('plural wins when both singular and plural passed', () => {
    const store = useTricksStore()
    store.tricks = [
      tWithFav('1', 'A', 'Not Started', false, 1),
      tWithFav('2', 'B', 'Not Started', false, 2),
      tWithFav('3', 'C', 'Not Started', false, 3),
    ]
    const result = store.filteredAndSorted({ tier: 2, tiers: [1, 3] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })
})
