import { describe, it, expect } from 'vitest'
import { mergeTrick } from '../mergeTrick'
import type { CanonicalTrick, TrickOverlay } from '../types'

const canonical = (overrides: Partial<CanonicalTrick> = {}): CanonicalTrick => ({
  id: 'trick-1',
  createdBy: null,
  visibility: 'public',
  name: 'Cross',
  tier: 2,
  category: 'cross',
  entry: '2/f',
  exit: '2/f',
  lr: true,
  defaultAliases: ['x-step'],
  defaultTags: ['fundamental'],
  defaultIcon: '🔀',
  defaultVideo: 'https://example/video',
  ...overrides,
})

const overlay = (overrides: Partial<TrickOverlay> = {}): TrickOverlay => ({
  userId: 'u1',
  trickId: 'trick-1',
  rate: null,
  rateL: null,
  rateR: null,
  last: null,
  status: 'Not Started',
  aliases: [],
  tags: [],
  mainAlias: null,
  iconOverride: null,
  videoOverride: null,
  nodeX: null,
  nodeY: null,
  fav: false,
  ...overrides,
})

describe('mergeTrick', () => {
  it('returns canonical defaults when overlay is null', () => {
    const m = mergeTrick(canonical(), null)
    expect(m.name).toBe('Cross')
    expect(m.aliases).toEqual(['x-step'])
    expect(m.tags).toEqual(['fundamental'])
    expect(m.icon).toBe('🔀')
    expect(m.video).toBe('https://example/video')
    expect(m.fav).toBe(false)
    expect(m.rate).toBeNull()
    expect(m.status).toBe('Not Started')
  })

  it('returns canonical defaults when overlay has empty arrays / null overrides', () => {
    const m = mergeTrick(canonical(), overlay())
    expect(m.aliases).toEqual(['x-step'])  // overlay empty → canonical
    expect(m.tags).toEqual(['fundamental'])
    expect(m.icon).toBe('🔀')
    expect(m.video).toBe('https://example/video')
  })

  it('overlay aliases (non-empty) override canonical defaultAliases', () => {
    const m = mergeTrick(canonical(), overlay({ aliases: ['my-x'] }))
    expect(m.aliases).toEqual(['my-x'])
  })

  it('overlay tags (non-empty) override canonical defaultTags', () => {
    const m = mergeTrick(canonical(), overlay({ tags: ['my-tag'] }))
    expect(m.tags).toEqual(['my-tag'])
  })

  it('overlay icon/video override canonical defaults', () => {
    const m = mergeTrick(canonical(), overlay({ iconOverride: '⭐', videoOverride: 'https://my' }))
    expect(m.icon).toBe('⭐')
    expect(m.video).toBe('https://my')
  })

  it('progress fields come from overlay only', () => {
    const m = mergeTrick(canonical(), overlay({ rate: 3.5, rateL: 4, rateR: 3, last: '2026-06-28', status: 'In Progress' }))
    expect(m.rate).toBe(3.5)
    expect(m.rateL).toBe(4)
    expect(m.rateR).toBe(3)
    expect(m.last).toBe('2026-06-28')
    expect(m.status).toBe('In Progress')
  })

  it('fav, mainAlias, node_x/y are per-user (overlay only)', () => {
    const m = mergeTrick(canonical(), overlay({ fav: true, mainAlias: 'x-step', nodeX: 100, nodeY: 50 }))
    expect(m.fav).toBe(true)
    expect(m.mainAlias).toBe('x-step')
    expect(m.node_x).toBe(100)
    expect(m.node_y).toBe(50)
  })

  it('preserves canonical createdBy + visibility in merged shape', () => {
    const m = mergeTrick(canonical({ createdBy: 'user-abc', visibility: 'private' }), null)
    expect(m.createdBy).toBe('user-abc')
    expect(m.visibility).toBe('private')
  })
})
