import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTricksStore } from '../tricks'
import type { CanonicalTrick, TrickOverlay } from '../../domain/types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let _idCounter = 0
let _mockUserId: string | null = null
let _mockOverlays: Map<string, TrickOverlay> = new Map()
let _mockCanonicals: Map<string, CanonicalTrick> = new Map()

vi.mock('../../storage/repo', () => ({
  getAllTricksMerged: vi.fn(async () => []),
  getTrickMerged: vi.fn(async () => undefined),
  upsertCanonicalTrick: vi.fn(async (c: CanonicalTrick) => {
    if (!c.id) c.id = `mock-id-${++_idCounter}`
    _mockCanonicals.set(c.id!, c)
    return c.id!
  }),
  upsertTrickOverlay: vi.fn(async (o: TrickOverlay) => {
    _mockOverlays.set(o.trickId, o)
  }),
  getTrickOverlay: vi.fn(async (_userId: string, trickId: string) => {
    return _mockOverlays.get(trickId) ?? null
  }),
  getCanonicalTrick: vi.fn(async (id: string) => {
    return _mockCanonicals.get(id) ?? undefined
  }),
  deleteTrickOverlay: vi.fn(async (_userId: string, trickId: string) => {
    _mockOverlays.delete(trickId)
  }),
  reportTrick: vi.fn(async () => { throw new Error('not implemented in tests') }),
  loadLibraryPage: vi.fn(async () => ({ items: [], hasMore: false })),
}))
vi.mock('../../storage/seed', () => ({
  ensureSeeded: vi.fn(async () => {}),
}))
vi.mock('../../storage/dexie', () => ({
  db: {
    tricks: {
      toArray: vi.fn(async () => []),
    },
    user_trick_progress: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(async () => []),
        })),
      })),
    },
  },
}))
vi.mock('../../storage/social', () => ({
  getCurrentUserId: vi.fn(async () => _mockUserId),
}))

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const mkCanonical = (overrides: Partial<CanonicalTrick> = {}): CanonicalTrick => ({
  id: 'c1',
  createdBy: null,
  visibility: 'public',
  name: 'Test Trick',
  tier: 1,
  category: 'forward',
  entry: '2/f',
  exit: '2/f',
  lr: false,
  defaultAliases: [],
  defaultTags: [],
  defaultIcon: null,
  defaultVideo: null,
  ...overrides,
})

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('tricks store — filteredAndSorted', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _mockUserId = null
    _mockOverlays = new Map()
    _mockCanonicals = new Map()
    _idCounter = 0
  })

  it('omitting status returns all tricks (no behavior change)', () => {
    const store = useTricksStore()
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A', createdBy: null, visibility: 'public' }),
      mkCanonical({ id: '2', name: 'B', createdBy: null, visibility: 'public' }),
    ]
    expect(store.filteredAndSorted({}).map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  // Plural multi-select fields (Phase 4b)
  it('filteredAndSorted({ tiers: [2, 3] }) returns only tier 2 and 3', () => {
    const store = useTricksStore()
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A', tier: 1 }),
      mkCanonical({ id: '2', name: 'B', tier: 2 }),
      mkCanonical({ id: '3', name: 'C', tier: 3 }),
      mkCanonical({ id: '4', name: 'D', tier: 4 }),
    ]
    const result = store.filteredAndSorted({ tiers: [2, 3] })
    expect(result.map((x) => x.id).sort()).toEqual(['2', '3'])
  })

  it('filteredAndSorted({ tiers: [] }) is unconstrained on tier', () => {
    const store = useTricksStore()
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A', tier: 1 }),
      mkCanonical({ id: '2', name: 'B', tier: 2 }),
    ]
    const result = store.filteredAndSorted({ tiers: [] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ categories: ["forward", "backward"] }) returns only those', () => {
    const store = useTricksStore()
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A', category: 'forward' }),
      mkCanonical({ id: '2', name: 'B', category: 'backward' }),
      mkCanonical({ id: '3', name: 'C', category: 'cross' }),
    ]
    const result = store.filteredAndSorted({ categories: ['forward', 'backward'] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ statuses: ["In Progress", "Complete"] }) returns both', () => {
    const store = useTricksStore()
    // We need overlays to have statuses
    const userId = 'u1'
    _mockUserId = userId
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A' }),
      mkCanonical({ id: '2', name: 'B' }),
      mkCanonical({ id: '3', name: 'C' }),
    ]
    store.overlaysByTrickId = new Map([
      ['1', { userId, trickId: '1', rate: 3, rateL: null, rateR: null, last: null, status: 'In Progress', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: false }],
      ['2', { userId, trickId: '2', rate: 5, rateL: null, rateR: null, last: null, status: 'Complete', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: false }],
    ])
    const result = store.filteredAndSorted({ statuses: ['In Progress', 'Complete'] })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('filteredAndSorted({ favOnly: true }) returns only favs', () => {
    const store = useTricksStore()
    const userId = 'u1'
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A' }),
      mkCanonical({ id: '2', name: 'B' }),
      mkCanonical({ id: '3', name: 'C' }),
    ]
    store.overlaysByTrickId = new Map([
      ['1', { userId, trickId: '1', rate: null, rateL: null, rateR: null, last: null, status: 'Not Started', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: true }],
      ['3', { userId, trickId: '3', rate: null, rateL: null, rateR: null, last: null, status: 'Not Started', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: true }],
    ])
    const result = store.filteredAndSorted({ favOnly: true })
    expect(result.map((x) => x.id).sort()).toEqual(['1', '3'])
  })

  it('AND across dimensions, OR within: tiers + statuses + favOnly compose correctly', () => {
    const store = useTricksStore()
    const userId = 'u1'
    store.canonicals = [
      mkCanonical({ id: '1', name: 'A', tier: 2 }),
      mkCanonical({ id: '2', name: 'B', tier: 2 }),
      mkCanonical({ id: '3', name: 'C', tier: 3 }),
      mkCanonical({ id: '4', name: 'D', tier: 2 }),
      mkCanonical({ id: '5', name: 'E', tier: 5 }),
    ]
    store.overlaysByTrickId = new Map([
      ['1', { userId, trickId: '1', rate: 3, rateL: null, rateR: null, last: null, status: 'In Progress', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: true }],
      ['2', { userId, trickId: '2', rate: 3, rateL: null, rateR: null, last: null, status: 'In Progress', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: false }],
      ['3', { userId, trickId: '3', rate: 5, rateL: null, rateR: null, last: null, status: 'Complete', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: true }],
      ['4', { userId, trickId: '4', rate: null, rateL: null, rateR: null, last: null, status: 'Not Started', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: true }],
      ['5', { userId, trickId: '5', rate: 3, rateL: null, rateR: null, last: null, status: 'In Progress', aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null, nodeX: null, nodeY: null, fav: true }],
    ])
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
    _mockUserId = null
    _mockOverlays = new Map()
    _mockCanonicals = new Map()
    _idCounter = 0
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
    const trick = store.byId(id)!
    expect(trick.icon).toBe('🔥')
    expect(trick.aliases).toEqual(['flame'])
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
    const trick = store.byId(id)!
    expect(trick.icon).toBeNull()
    expect(trick.aliases).toEqual([])
  })

  it('appends the new trick to the local list', async () => {
    const store = useTricksStore()
    const before = store.tricks.length
    await store.create({ name: 'New One', tier: 2, category: 'forward', lr: false })
    expect(store.tricks.length).toBe(before + 1)
  })

  it('create defaults createdBy from auth (anonymous → null)', async () => {
    _mockUserId = null
    const store = useTricksStore()
    const id = await store.create({ name: 'Anon Trick', tier: 1, category: 'forward', lr: false })
    const canonical = store.canonicals.find((c) => c.id === id)
    expect(canonical).toBeDefined()
    expect(canonical!.createdBy).toBeNull()
  })

  it('create defaults createdBy from auth (signed-in → user id)', async () => {
    _mockUserId = 'user-abc-123'
    const store = useTricksStore()
    const id = await store.create({ name: 'Signed-in Trick', tier: 1, category: 'forward', lr: false })
    const canonical = store.canonicals.find((c) => c.id === id)
    expect(canonical).toBeDefined()
    expect(canonical!.createdBy).toBe('user-abc-123')
  })

  it('create defaults visibility to "private"', async () => {
    _mockUserId = 'user-xyz'
    const store = useTricksStore()
    const id = await store.create({ name: 'Private Trick', tier: 2, category: 'cross', lr: false })
    const canonical = store.canonicals.find((c) => c.id === id)
    expect(canonical).toBeDefined()
    expect(canonical!.visibility).toBe('private')
  })
})

describe('tricks store — publish / unpublish', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _mockUserId = 'creator-user'
    _mockOverlays = new Map()
    _mockCanonicals = new Map()
    _idCounter = 0
  })

  it('publish sets visibility to public for own trick', async () => {
    _mockUserId = 'creator-user'
    const canonical = mkCanonical({ id: 'trick-1', createdBy: 'creator-user', visibility: 'private' })
    _mockCanonicals.set('trick-1', canonical)
    const store = useTricksStore()
    store.canonicals = [canonical]
    await store.publish('trick-1')
    expect(store.canonicals.find((c) => c.id === 'trick-1')!.visibility).toBe('public')
  })

  it('publish requires creator — throws for non-creator', async () => {
    _mockUserId = 'other-user'
    const canonical = mkCanonical({ id: 'trick-1', createdBy: 'creator-user', visibility: 'private' })
    _mockCanonicals.set('trick-1', canonical)
    const store = useTricksStore()
    store.canonicals = [canonical]
    await expect(store.publish('trick-1')).rejects.toThrow(/creator/i)
  })

  it('unpublish sets visibility to private for own trick', async () => {
    _mockUserId = 'creator-user'
    const canonical = mkCanonical({ id: 'trick-2', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('trick-2', canonical)
    const store = useTricksStore()
    store.canonicals = [canonical]
    await store.unpublish('trick-2')
    expect(store.canonicals.find((c) => c.id === 'trick-2')!.visibility).toBe('private')
  })

  it('unpublish requires creator — throws for non-creator', async () => {
    _mockUserId = 'other-user'
    const canonical = mkCanonical({ id: 'trick-2', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('trick-2', canonical)
    const store = useTricksStore()
    store.canonicals = [canonical]
    await expect(store.unpublish('trick-2')).rejects.toThrow(/creator/i)
  })
})

describe('tricks store — adopt / unadopt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _mockUserId = 'user-1'
    _mockOverlays = new Map()
    _mockCanonicals = new Map()
    _idCounter = 0
  })

  it('adopt creates overlay row', async () => {
    const canonical = mkCanonical({ id: 'lib-trick', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('lib-trick', canonical)
    const store = useTricksStore()
    store.canonicals = [canonical]

    await store.adopt('lib-trick')

    expect(store.overlaysByTrickId.has('lib-trick')).toBe(true)
    const overlay = store.overlaysByTrickId.get('lib-trick')!
    expect(overlay.userId).toBe('user-1')
    expect(overlay.trickId).toBe('lib-trick')
    expect(overlay.rate).toBeNull()
    expect(overlay.fav).toBe(false)
  })

  it('adopt is idempotent (re-adopting does nothing)', async () => {
    const canonical = mkCanonical({ id: 'lib-trick', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('lib-trick', canonical)
    // Pre-populate overlay as if already adopted
    const existingOverlay: TrickOverlay = {
      userId: 'user-1', trickId: 'lib-trick',
      rate: null, rateL: null, rateR: null, last: null, status: 'Not Started',
      aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null,
      nodeX: null, nodeY: null, fav: false,
    }
    _mockOverlays.set('lib-trick', existingOverlay)
    const store = useTricksStore()
    store.canonicals = [canonical]
    store.overlaysByTrickId = new Map([['lib-trick', existingOverlay]])

    // First adopt should be a no-op since overlay already exists
    const { upsertTrickOverlay } = await import('../../storage/repo')
    const spy = vi.mocked(upsertTrickOverlay)
    spy.mockClear()

    await store.adopt('lib-trick')
    expect(spy).not.toHaveBeenCalled()
  })

  it('unadopt removes empty overlay', async () => {
    const canonical = mkCanonical({ id: 'lib-trick', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('lib-trick', canonical)
    const existingOverlay: TrickOverlay = {
      userId: 'user-1', trickId: 'lib-trick',
      rate: null, rateL: null, rateR: null, last: null, status: 'Not Started',
      aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null,
      nodeX: null, nodeY: null, fav: false,
    }
    _mockOverlays.set('lib-trick', existingOverlay)
    const store = useTricksStore()
    store.canonicals = [canonical]
    store.overlaysByTrickId = new Map([['lib-trick', existingOverlay]])

    await store.unadopt('lib-trick')

    expect(store.overlaysByTrickId.has('lib-trick')).toBe(false)
    // The adopted trick (foreign creator) should be removed from canonicals
    expect(store.canonicals.find((c) => c.id === 'lib-trick')).toBeUndefined()
  })

  it('unadopt throws when overlay has rate', async () => {
    const canonical = mkCanonical({ id: 'lib-trick', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('lib-trick', canonical)
    const overlayWithProgress: TrickOverlay = {
      userId: 'user-1', trickId: 'lib-trick',
      rate: 3.5, rateL: null, rateR: null, last: '2026-06-01', status: 'In Progress',
      aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null,
      nodeX: null, nodeY: null, fav: false,
    }
    _mockOverlays.set('lib-trick', overlayWithProgress)
    const store = useTricksStore()
    store.canonicals = [canonical]
    store.overlaysByTrickId = new Map([['lib-trick', overlayWithProgress]])

    await expect(store.unadopt('lib-trick')).rejects.toThrow(/progress or customizations/i)
  })

  it('unadopt throws when overlay has aliases', async () => {
    const canonical = mkCanonical({ id: 'lib-trick', createdBy: 'creator-user', visibility: 'public' })
    _mockCanonicals.set('lib-trick', canonical)
    const overlayWithAliases: TrickOverlay = {
      userId: 'user-1', trickId: 'lib-trick',
      rate: null, rateL: null, rateR: null, last: null, status: 'Not Started',
      aliases: ['my-alias'], tags: [], mainAlias: null, iconOverride: null, videoOverride: null,
      nodeX: null, nodeY: null, fav: false,
    }
    _mockOverlays.set('lib-trick', overlayWithAliases)
    const store = useTricksStore()
    store.canonicals = [canonical]
    store.overlaysByTrickId = new Map([['lib-trick', overlayWithAliases]])

    await expect(store.unadopt('lib-trick')).rejects.toThrow(/progress or customizations/i)
  })
})
