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
