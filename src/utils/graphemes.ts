/**
 * Grapheme-aware string utilities. Emojis are often multi-codepoint
 * (e.g. 👨‍👩‍👧‍👦 is 7 code points), so `.length` doesn't equal "what the
 * user perceives as one character." Intl.Segmenter is supported in
 * iOS Safari 16.4+ and all modern engines.
 *
 * Used by the multi-emoji-per-trick feature: display sites scale font
 * size by grapheme count so 1/2/3 emojis fit a fixed-size slot.
 */

const segmenter: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

export function splitGraphemes(s: string): string[] {
  if (!s) return []
  if (segmenter) return Array.from(segmenter.segment(s), (seg) => seg.segment)
  // Fallback for ancient runtimes: treat each codepoint as a grapheme.
  return Array.from(s)
}

export function countGraphemes(s: string): number {
  return splitGraphemes(s).length
}

export function takeGraphemes(s: string, n: number): string {
  if (n <= 0) return ''
  return splitGraphemes(s).slice(0, n).join('')
}

/**
 * Gentle font shrink for inline emoji positions where the slot can
 * flex (trick card name row, sheet header). 1→base, 2→0.9×, 3→0.82×.
 */
export function autosizeIcon(
  iconStr: string | null | undefined,
  base: number,
): number {
  if (!iconStr) return base
  const count = countGraphemes(iconStr)
  if (count <= 1) return base
  if (count === 2) return Math.round(base * 0.9)
  return Math.round(base * 0.82)
}

/**
 * Aggressive font shrink for tight fixed-size slots (graph node circle)
 * where emojis must fit a constrained area. 1→base, 2→0.75×, 3→0.6×.
 */
export function autosizeIconTight(
  iconStr: string | null | undefined,
  base: number,
): number {
  if (!iconStr) return base
  const count = countGraphemes(iconStr)
  if (count <= 1) return base
  if (count === 2) return Math.round(base * 0.75)
  return Math.round(base * 0.6)
}

export interface IconSlotSizing {
  fontSize: number
  slotWidth: number
  letterSpacing: number
}

/**
 * Grow-slot sizing for row-based fixed slots (WorkingOnList rows,
 * ActivityFeed rows). Slot widens as emoji count grows; font shrinks
 * slightly; letter-spacing adds breathing room.
 *
 * 1 emoji → base slot, base font, 0 letter-spacing
 * 2 emojis → 1.43× slot, 0.89× font, 0.5px letter-spacing
 * 3 emojis → 1.93× slot, 0.78× font, 1px letter-spacing
 */
export function autosizeIconSlot(
  iconStr: string | null | undefined,
  baseSlotPx: number,
  baseFontPx: number,
): IconSlotSizing {
  const n = iconStr ? countGraphemes(iconStr) : 0
  if (n <= 1) {
    return { fontSize: baseFontPx, slotWidth: baseSlotPx, letterSpacing: 0 }
  }
  if (n === 2) {
    return {
      fontSize: Math.round(baseFontPx * 0.89),
      slotWidth: Math.round(baseSlotPx * 1.43),
      letterSpacing: 0.5,
    }
  }
  return {
    fontSize: Math.round(baseFontPx * 0.78),
    slotWidth: Math.round(baseSlotPx * 1.93),
    letterSpacing: 1,
  }
}

export const MAX_TRICK_EMOJIS = 3
