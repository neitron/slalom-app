import { describe, expect, it } from 'vitest'
import { gw } from './tokens'
import { contrastRatio, deltaE } from './color'

describe('Glasswork tokens — text contrast', () => {
  it('fg on base meets WCAG AA Body (4.5:1)', () => {
    expect(contrastRatio(gw.fg, gw.base)).toBeGreaterThanOrEqual(4.5)
  })

  it('fgMuted on base meets WCAG AA Large (3:1)', () => {
    expect(contrastRatio(gw.fgMuted, gw.base)).toBeGreaterThanOrEqual(3)
  })

  it('brand on base meets WCAG AA Large (3:1)', () => {
    expect(contrastRatio(gw.brand, gw.base)).toBeGreaterThanOrEqual(3)
  })
})

describe('Glasswork tokens — leg is categorical', () => {
  // Every pair of leg colors must be perceptually distant.
  // Threshold 25 = "obviously different" in CIEDE2000.
  const LEG_MIN_DELTA_E = 25
  const pairs: Array<[string, string, string]> = [
    ['l-vs-r', gw.leg.l, gw.leg.r],
    ['l-vs-both', gw.leg.l, gw.leg.both],
    ['l-vs-none', gw.leg.l, gw.leg.none],
    ['r-vs-both', gw.leg.r, gw.leg.both],
    ['r-vs-none', gw.leg.r, gw.leg.none],
    ['both-vs-none', gw.leg.both, gw.leg.none],
  ]
  it.each(pairs)('%s ΔE >= 25', (_label, a, b) => {
    expect(deltaE(a, b)).toBeGreaterThanOrEqual(LEG_MIN_DELTA_E)
  })

  it('every leg color is perceptibly distant from brand (>=20)', () => {
    expect(deltaE(gw.leg.l, gw.brand)).toBeGreaterThanOrEqual(20)
    expect(deltaE(gw.leg.r, gw.brand)).toBeGreaterThanOrEqual(20)
    expect(deltaE(gw.leg.both, gw.brand)).toBeGreaterThanOrEqual(20)
  })
})

describe('Glasswork tokens — rate is off-hue (single ramp)', () => {
  // Rate states should be ordinal — luminance increases from none → good.
  it('rate luminance order: none < bad < mid < good', () => {
    // Quick check via contrast ratio against base — higher contrast = more visible.
    const cNone = contrastRatio(gw.rate.none, gw.base)
    const cBad = contrastRatio(gw.rate.bad, gw.base)
    const cMid = contrastRatio(gw.rate.mid, gw.base)
    const cGood = contrastRatio(gw.rate.good, gw.base)
    expect(cBad).toBeGreaterThan(cNone)
    expect(cMid).toBeGreaterThan(cBad)
    expect(cGood).toBeGreaterThan(cMid)
  })

  it('rate.good has sufficient contrast on base (WCAG AA Large)', () => {
    expect(contrastRatio(gw.rate.good, gw.base)).toBeGreaterThanOrEqual(3)
  })
})

describe('Glasswork tokens — danger isolation', () => {
  it('danger is perceptibly distant from every leg color (>=25)', () => {
    expect(deltaE(gw.danger, gw.leg.l)).toBeGreaterThanOrEqual(25)
    expect(deltaE(gw.danger, gw.leg.r)).toBeGreaterThanOrEqual(25)
    expect(deltaE(gw.danger, gw.leg.both)).toBeGreaterThanOrEqual(25)
  })

  it('danger is perceptibly distant from brand (>=25)', () => {
    expect(deltaE(gw.danger, gw.brand)).toBeGreaterThanOrEqual(25)
  })
})
