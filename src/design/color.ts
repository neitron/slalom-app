export type Rgb = { r: number; g: number; b: number }

export function hexToRgb(hex: string): Rgb {
  const s = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    throw new Error(`Invalid hex: ${hex}`)
  }
  let r: number, g: number, b: number
  if (s.length === 3) {
    r = parseInt(s[0] + s[0], 16)
    g = parseInt(s[1] + s[1], 16)
    b = parseInt(s[2] + s[2], 16)
  } else if (s.length === 6) {
    r = parseInt(s.slice(0, 2), 16)
    g = parseInt(s.slice(2, 4), 16)
    b = parseInt(s.slice(4, 6), 16)
  } else {
    throw new Error(`Invalid hex length: ${hex}`)
  }
  return { r, g, b }
}

function srgbToLinear(c: number): number {
  const x = c / 255
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function contrastRatio(a: string, b: string): number {
  const lumA = relativeLuminance(a)
  const lumB = relativeLuminance(b)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

// sRGB → linear → XYZ (D65) → Lab (CIE 1976). Then ΔE2000.
// Reference: http://www.brucelindbloom.com/index.html?Equations.html

function rgbToXyz(hex: string): { x: number; y: number; z: number } {
  const { r, g, b } = hexToRgb(hex)
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  // sRGB D65
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  const z = R * 0.0193339 + G * 0.119192 + B * 0.9503041
  return { x, y, z }
}

const D65 = { x: 0.95047, y: 1.0, z: 1.08883 }

function pivot(t: number): number {
  return t > 216 / 24389
    ? Math.cbrt(t)
    : (24389 / 27 * t + 16) / 116
}

export function hexToLab(hex: string): { L: number; a: number; b: number } {
  const { x, y, z } = rgbToXyz(hex)
  const fx = pivot(x / D65.x)
  const fy = pivot(y / D65.y)
  const fz = pivot(z / D65.z)
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

// ΔE2000 — standard implementation. See https://en.wikipedia.org/wiki/Color_difference#CIEDE2000
export function deltaE(hexA: string, hexB: string): number {
  const a = hexToLab(hexA)
  const b = hexToLab(hexB)
  const kL = 1, kC = 1, kH = 1
  const C1 = Math.sqrt(a.a * a.a + a.b * a.b)
  const C2 = Math.sqrt(b.a * b.a + b.b * b.b)
  const Cbar = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))))
  const a1p = (1 + G) * a.a
  const a2p = (1 + G) * b.a
  const C1p = Math.sqrt(a1p * a1p + a.b * a.b)
  const C2p = Math.sqrt(a2p * a2p + b.b * b.b)
  const h1p = Math.atan2(a.b, a1p) * 180 / Math.PI
  const h2p = Math.atan2(b.b, a2p) * 180 / Math.PI
  const h1pN = h1p < 0 ? h1p + 360 : h1p
  const h2pN = h2p < 0 ? h2p + 360 : h2p
  const dLp = b.L - a.L
  const dCp = C2p - C1p
  let dhp = h2pN - h1pN
  if (Math.abs(dhp) > 180) {
    dhp = dhp > 0 ? dhp - 360 : dhp + 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * Math.PI / 180)
  const Lpbar = (a.L + b.L) / 2
  const Cpbar = (C1p + C2p) / 2
  let hpbar = h1pN + h2pN
  if (Math.abs(h1pN - h2pN) > 180) hpbar += 360
  hpbar /= 2
  const T =
    1 -
    0.17 * Math.cos((hpbar - 30) * Math.PI / 180) +
    0.24 * Math.cos((2 * hpbar) * Math.PI / 180) +
    0.32 * Math.cos((3 * hpbar + 6) * Math.PI / 180) -
    0.20 * Math.cos((4 * hpbar - 63) * Math.PI / 180)
  const dTheta = 30 * Math.exp(-Math.pow((hpbar - 275) / 25, 2))
  const Rc = 2 * Math.sqrt(Math.pow(Cpbar, 7) / (Math.pow(Cpbar, 7) + Math.pow(25, 7)))
  const Sl = 1 + (0.015 * Math.pow(Lpbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lpbar - 50, 2))
  const Sc = 1 + 0.045 * Cpbar
  const Sh = 1 + 0.015 * Cpbar * T
  const Rt = -Math.sin(2 * dTheta * Math.PI / 180) * Rc
  const dE = Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)),
  )
  return dE
}
