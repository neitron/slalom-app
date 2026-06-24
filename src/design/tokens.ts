// Glasswork design tokens — single source of truth.
// CSS variables in src/design/glasswork.css mirror these values.
// Tests in src/design/tokens.test.ts assert contrast + ΔE invariants.

export const gw = {
  // Base
  base: '#0E0D12',          // near-black warm-cool, slight purple pull
  baseRaised: '#16151B',    // raised surface (no glass)
  fg: '#EDEAF2',            // primary text
  fgMuted: '#8E8B98',       // secondary text
  fgFaint: '#5A5762',       // tertiary / disabled

  // Brand
  brand: '#B5A8FF',         // lead (lilac/lavender)
  brandSoft: '#D8CFFF',     // hover / soft variant
  brandPeach: '#FFB59E',    // warm secondary accent (UI, NOT leg-L; see leg.l)
  brandMint: '#9EE8C7',     // success / sync-ok
  brandSky: '#9ECDFF',      // info

  // Categorical: leg
  leg: {
    l: '#FF9C7C',          // warm coral — perceptually distant from brand
    r: '#5FD8C9',          // cool teal
    both: '#EBE5D5',       // cream / warm sand (tuned from #F0E2C0 to satisfy ΔE ≥ 25 vs leg.l)
    none: '#7A7682',       // neutral
  },

  // Ordinal: rate — single hue, four weights/chromas. NOT a hue ramp.
  // Base hue: a muted gold-lilac. The four states differ in fill + chroma.
  rate: {
    none: '#3C3A45',       // hollow ring color
    bad: '#7A6F84',        // low chroma fill
    mid: '#B5A8C8',        // mid chroma fill
    good: '#E0D5FF',       // bright fill
  },

  // Signals
  danger: '#C83030',       // destructive only (tuned from #E05A5A to satisfy ΔE ≥ 25 vs leg.l)

  // Surfaces (alpha + blur — declared here as recipes for the CSS layer)
  surface: {
    glass: { tint: '#FFFFFF', alpha: 0.06, blur: 20 },
    glassStrong: { tint: '#FFFFFF', alpha: 0.10, blur: 12 },
  },

  // Radii
  radius: {
    panel: 26,   // top-level cards / sheets
    chip: 14,    // chips / pills / buttons
    micro: 6,    // small inputs
  },

  // Typography (px)
  type: {
    display: 40,
    h1: 28,
    h2: 22,
    body: 15,
    micro: 12,
  },

  // Motion (ms)
  motion: {
    sheet: 320,
    pulse: 180,
    route: 240,
  },
} as const

export type GlassworkTokens = typeof gw
