import { describe, expect, it } from 'vitest'
import { hexToRgb } from './color'

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#7cc5ff')).toEqual({ r: 124, g: 197, b: 255 })
  })

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc })
  })

  it('throws on invalid hex', () => {
    expect(() => hexToRgb('not-a-hex')).toThrow()
    expect(() => hexToRgb('#ggg')).toThrow()
  })
})

import { contrastRatio } from './color'

describe('contrastRatio', () => {
  it('returns 21 for black vs white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#7cc5ff', '#7cc5ff')).toBeCloseTo(1, 2)
  })

  it('is symmetric', () => {
    const a = contrastRatio('#0E0D12', '#e6e6ec')
    const b = contrastRatio('#e6e6ec', '#0E0D12')
    expect(a).toBeCloseTo(b, 5)
  })

  it('classifies fg/bg pairs against WCAG AA (4.5:1)', () => {
    expect(contrastRatio('#0E0D12', '#e6e6ec')).toBeGreaterThan(4.5)
  })
})

import { deltaE } from './color'

describe('deltaE', () => {
  it('returns 0 for identical colors', () => {
    expect(deltaE('#7cc5ff', '#7cc5ff')).toBeCloseTo(0, 2)
  })

  it('is symmetric', () => {
    const a = deltaE('#ffb36b', '#7cc5ff')
    const b = deltaE('#7cc5ff', '#ffb36b')
    expect(a).toBeCloseTo(b, 2)
  })

  it('returns a large distance for highly different colors', () => {
    // orange vs cyan — wildly different hues, similar luminance
    expect(deltaE('#ffb36b', '#7cc5ff')).toBeGreaterThan(30)
  })

  it('returns a small distance for near-identical colors', () => {
    // two adjacent oranges
    expect(deltaE('#ffb36b', '#ffb578')).toBeLessThan(5)
  })
})
