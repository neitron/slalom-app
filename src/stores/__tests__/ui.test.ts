import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '../ui'

describe('useUiStore — sequences/transitions sub-tab state (Phase 6 R2)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults sub-tab to "sequences"', () => {
    const ui = useUiStore()
    expect(ui.sequencesSubTab).toBe('sequences')
  })

  it('setSequencesSubTab switches between sub-tabs', () => {
    const ui = useUiStore()
    ui.setSequencesSubTab('transitions')
    expect(ui.sequencesSubTab).toBe('transitions')
    ui.setSequencesSubTab('sequences')
    expect(ui.sequencesSubTab).toBe('sequences')
  })

  it('defaults sequences search/sort to empty/newest', () => {
    const ui = useUiStore()
    expect(ui.sequencesSearch).toBe('')
    expect(ui.sequencesSort).toBe('newest')
  })

  it('defaults transitions search/sort/category', () => {
    const ui = useUiStore()
    expect(ui.transitionsSearch).toBe('')
    expect(ui.transitionsSort).toBe('name')
    expect(ui.transitionsCategory).toBe('all')
  })

  it('setters update sequences fields', () => {
    const ui = useUiStore()
    ui.setSequencesSearch('warm')
    ui.setSequencesSort('best')
    expect(ui.sequencesSearch).toBe('warm')
    expect(ui.sequencesSort).toBe('best')
  })

  it('setters update transitions fields', () => {
    const ui = useUiStore()
    ui.setTransitionsSearch('cross')
    ui.setTransitionsSort('recent')
    ui.setTransitionsCategory('forward')
    expect(ui.transitionsSearch).toBe('cross')
    expect(ui.transitionsSort).toBe('recent')
    expect(ui.transitionsCategory).toBe('forward')
  })
})
