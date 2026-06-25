import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePreferencesStore } from '../preferences'

describe('preferences store', () => {
  beforeEach(() => {
    // Always install a fresh localStorage shim (the node env may have a stub
    // without .clear(), so we unconditionally replace it).
    const store: Record<string, string> = {}
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => { store[k] = v },
        removeItem: (k: string) => { delete store[k] },
        clear: () => { for (const k of Object.keys(store)) delete store[k] },
      },
    })
    setActivePinia(createPinia())
  })

  it('defaults rateDotStyle to dots when nothing is persisted', () => {
    const prefs = usePreferencesStore()
    expect(prefs.rateDotStyle).toBe('dots')
  })

  it('updates rateDotStyle via setRateDotStyle', () => {
    const prefs = usePreferencesStore()
    prefs.setRateDotStyle('slashes')
    expect(prefs.rateDotStyle).toBe('slashes')
  })

  it('coerces invalid values to dots', () => {
    const prefs = usePreferencesStore()
    // @ts-expect-error intentionally invalid
    prefs.setRateDotStyle('not-a-style')
    expect(prefs.rateDotStyle).toBe('dots')
  })

  it('persists rateDotStyle to localStorage', async () => {
    const prefs = usePreferencesStore()
    prefs.setRateDotStyle('bars')
    // Pinia's watch fires synchronously enough for this; if test flakes, await nextTick.
    await Promise.resolve()
    const raw = localStorage.getItem('slalom.prefs.v1')
    expect(raw).toContain('bars')
  })

  it('loads persisted value on second store invocation', async () => {
    const first = usePreferencesStore()
    first.setRateDotStyle('slashes')
    await Promise.resolve()
    // Re-create pinia to simulate a fresh app start
    setActivePinia(createPinia())
    const second = usePreferencesStore()
    expect(second.rateDotStyle).toBe('slashes')
  })
})
