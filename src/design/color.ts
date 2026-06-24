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
