import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTricksStore } from '../tricks'
import type { Trick } from '../../domain/types'

// Mock the storage layer so tests don't need IndexedDB
let _idCounter = 0
vi.mock('../../storage/repo', () => ({
  getAllTricks: vi.fn(async () => []),
  getTrick: vi.fn(async () => undefined),
  upsertTrick: vi.fn(async (t: Trick) => {
    if (!t.id) t.id = `mock-id-${++_idCounter}`
    return t.id
  }),
  reportTrick: vi.fn(async () => { throw new Error('not implemented in tests') }),
}))
vi.mock('../../storage/seed', () => ({
  ensureSeeded: vi.fn(async () => {}),
}))

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

describe('tricks store — filteredAndSorted', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

})

describe('tricks store — create (Phase add-new-trick)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('throws on empty name', async () => {
    const store = useTricksStore()
    await expect(store.create({ name: '', tier: 2, category: 'forward', lr: false })).rejects.toThrow(/required/i)
    await expect(store.create({ name: '   ', tier: 2, category: 'forward', lr: false })).rejects.toThrow(/required/i)
  })

  it('builds a complete Trick with progress defaults', async () => {
    const store = useTricksStore()
    const id = await store.create({ name: 'Test Trick', tier: 3, category: 'cross', lr: true })
    expect(id).toBeTypeOf('string')
    const created = store.byId(id)
    expect(created).toBeDefined()
    expect(created!.name).toBe('Test Trick')
    expect(created!.tier).toBe(3)
    expect(created!.category).toBe('cross')
    expect(created!.lr).toBe(true)
    expect(created!.status).toBe('Not Started')
    expect(created!.rate).toBeNull()
    expect(created!.rateL).toBeNull()
    expect(created!.rateR).toBeNull()
    expect(created!.last).toBeNull()
    expect(created!.aliases).toEqual([])
    expect(created!.tags).toEqual([])
    expect(created!.fav).toBe(false)
    expect(created!.icon).toBeNull()
    expect(created!.video).toBeNull()
    expect(created!.entry).toBe('2/f')
    expect(created!.exit).toBe('2/f')
  })

  it('trims name and stores trimmed value', async () => {
    const store = useTricksStore()
    const id = await store.create({ name: '  Spacy  ', tier: 1, category: 'forward', lr: false })
    expect(store.byId(id)!.name).toBe('Spacy')
  })

  it('handles optional icon and firstAlias', async () => {
    const store = useTricksStore()
    const id = await store.create({
      name: 'With extras',
      tier: 2,
      category: 'eagle',
      lr: false,
      icon: '🔥',
      firstAlias: 'flame',
    })
    const t = store.byId(id)!
    expect(t.icon).toBe('🔥')
    expect(t.aliases).toEqual(['flame'])
  })

  it('treats empty/whitespace icon and firstAlias as null/empty', async () => {
    const store = useTricksStore()
    const id = await store.create({
      name: 'No extras',
      tier: 2,
      category: 'forward',
      lr: false,
      icon: '   ',
      firstAlias: '',
    })
    const t = store.byId(id)!
    expect(t.icon).toBeNull()
    expect(t.aliases).toEqual([])
  })

  it('appends the new trick to the local list', async () => {
    const store = useTricksStore()
    const before = store.tricks.length
    await store.create({ name: 'New One', tier: 2, category: 'forward', lr: false })
    expect(store.tricks.length).toBe(before + 1)
  })
})
