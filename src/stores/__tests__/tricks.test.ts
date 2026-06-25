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
