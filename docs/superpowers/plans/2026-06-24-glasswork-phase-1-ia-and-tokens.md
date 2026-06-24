# Glasswork Phase 1 — IA + Tokens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the foundation for the Glasswork redesign — final IA decisions (tab map, route map, Settings split) and a new token system (color/material/type/pattern) that coexists with the current tokens. After this phase, the app continues to render exactly as today; the new tokens exist but are not yet consumed by any production screen.

**Architecture:** Two-part phase. Part A is an IA decision document committed to `spec/`. Part B introduces a `src/design/` module that exports tokens programmatically (TS), declares the same tokens in CSS (via Tailwind v4 `@theme` or legacy `tailwind.config.js`), and ships a `/spec/tokens` dev-only preview route. New tokens live under a `g-` (Glasswork) namespace; old tokens are untouched and continue working.

**Tech Stack:** Vue 3 + Vite + Tailwind v4 + Pinia + Vue Router (hash) + Vitest. No new runtime dependencies introduced in this phase.

**Companion docs:**
- Design direction: `spec/2026-06-24-redesign-glasswork-design.md`
- Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`

---

## File structure

**Created:**
- `spec/2026-06-24-glasswork-ia-decisions.md` — IA decisions doc (Part A).
- `src/design/color.ts` — color math utilities (hex ↔ RGB, RGB → Lab, ΔE2000, WCAG contrast).
- `src/design/color.test.ts` — unit tests for color math.
- `src/design/tokens.ts` — single source of truth for token *values* (hexes, sizes, radii, blurs, durations). TS export consumed by tests, SVG/d3 code, and any JS that needs tokens.
- `src/design/tokens.test.ts` — assertions on contrast ratios + ΔE distances + completeness.
- `src/design/glasswork.css` — `@theme` extension declaring the same tokens as CSS custom properties, plus utility classes (`.gw-glass`, `.gw-glass-strong`, `.gw-aurora-bg-sm`, `.gw-aurora-bg-lg`, `.gw-hatch`, `.gw-halftone`).
- `src/pages/spec/Tokens.vue` — dev-only preview route rendering every swatch, type size, surface, and pattern.

**Modified:**
- `src/style.css` — `@import` the new `glasswork.css`. No existing rules touched.
- `src/router.ts` — add `/spec/tokens` route gated on `import.meta.env.DEV`.
- `tailwind.config.js` — leave existing tokens; document that tokens are now declared in `glasswork.css` via `@theme`.

**Touched but not changed:**
- Everything else. Phase 1 does not modify any existing component, page, or store.

---

## Part A — IA decisions

This part produces one document: `spec/2026-06-24-glasswork-ia-decisions.md`. It's not TDD-shaped — it's a decision-and-commit step. The recommendation below is grounded in the brainstorming interview (audience, top jobs, social = side trip, Graph stays prominent, quick-search-first).

### Task A1: Read inputs, present IA proposals to the user

**Files:** none (interactive).

- [ ] **Step 1: Re-read the direction spec, the roadmap, and the current `src/router.ts` to confirm the route set.**

Run: `cat spec/2026-06-24-redesign-glasswork-design.md spec/2026-06-24-redesign-glasswork-roadmap.md src/router.ts`

- [ ] **Step 2: Present the IA recommendation below to the user for approval / amendment.**

Recommendation: **4 bottom tabs + header.**

```
Bottom tabs:    Home  |  Tricks  |  Graph  |  Sequences
Header (top):   [app mark]                        [avatar → menu]
```

| Tab | Route | Purpose | Replaces |
|---|---|---|---|
| Home | `/` | "What should I do right now?" — currently-being-drilled tricks (tap-to-cycle here), recent activity, quick-jump to Graph or current Sequence | New surface. Today's `/` (All Tricks) moves to `/tricks`. |
| Tricks | `/tricks` | Catalog browse. Search-first (search box always visible at top; tier tabs collapse into a filter sheet). | Today's `/` |
| Graph | `/graph` | The signature surface. Fibonacci anchor-dot substrate. Sequence-mode entry. Transitions reachable as a "list" view from inside Graph. | Today's `/graph` + (subsumes) `/transitions` |
| Sequences | `/sequences` | List + 🎲 Generator + SequenceSheet as rehearsal script + rate-after-run. | Today's `/sequences` |

Demoted / moved:
- **Learning** (`/learning`) → no longer a tab; surfaced inside Home (Practiced section) and as a sort/filter mode on Tricks.
- **Transitions** (`/transitions`) → no longer a tab; reachable as a list view from Graph (the data is graph edges anyway).
- **People** (`/people`) → no longer a tab; reachable from `HeaderProfileMenu` (already partially the case).
- **Settings** → split. `/settings` is user-facing (profile, visibility, language, install). `/diagnostics` is the engineering surface (build sha, storage, sync state, advisor warnings).

Routes still in the app but not in the tab bar:
- `/learning`, `/transitions`, `/people`, `/u/:nickname`, `/install`, `/onboarding/nickname`, `/settings`, `/diagnostics` (new), `/spec/tokens` (new, dev-only).

Rationale tied to the interview:
- Top jobs: log (Home), build/rehearse (Sequences), discover (Tricks). Each gets a tab.
- Graph: explicitly kept prominent.
- People: "side trip" — demoted from primary nav.
- In-session phone-out-between-attempts: Home is the answer to "current focus is one tap away."

- [ ] **Step 3: Capture the user's response.**

If user accepts: proceed to Task A2.
If user amends: incorporate the amendments into the proposal text and re-present until accepted. Do not move to Task A2 until accepted.

### Task A2: Write the IA decisions doc

**Files:**
- Create: `spec/2026-06-24-glasswork-ia-decisions.md`

- [ ] **Step 1: Write the doc.**

Template (substitute the final tab map from A1):

```markdown
# Glasswork — IA Decisions

Date: 2026-06-24
Direction spec: `spec/2026-06-24-redesign-glasswork-design.md`
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`

## Tab map

[4 tabs as agreed]

## Route map

| Route | Page | In tab bar? | New? | Notes |
|---|---|---|---|---|
| `/` | Home | Yes | NEW | Replaces today's `/` |
| `/tricks` | AllTricks | Yes | Renamed | Today's `/` |
| `/graph` | Graph | Yes | No | — |
| `/sequences` | Sequences | Yes | No | — |
| `/learning` | Learning | No | No | Reachable via Home |
| `/transitions` | Transitions | No | No | Reachable via Graph |
| `/people` | People | No | No | Reachable via HeaderProfileMenu |
| `/u/:nick` | ForeignProfile | No | No | Unchanged |
| `/onboarding/nickname` | NicknameOnboarding | No | No | hideTabs |
| `/install` | Install | No | No | hideTabs |
| `/settings` | Settings | No | Refactored | User-facing only |
| `/diagnostics` | Diagnostics | No | NEW | Engineering surface |
| `/spec/tokens` | Tokens | No | NEW | Dev-only |

## Settings split

- `/settings`: profile, visibility, language, install link.
- `/diagnostics`: build sha (+ commit link), storage usage, sync state, advisor warnings.

## Home surface — v1 content list

- "Working on" — list of tricks with status "Working" or recent rate edits; tap-to-cycle here.
- "Recent activity" — last 7 days of rate changes / sequence runs.
- Quick-jump button: "Open Graph."
- Quick-jump button: "Current Sequence" (if user has any sequence rated in the last N days).

That's the entire v1 scope of Home. Anything else is deferred.

## Decisions log

- DECIDED: 4 bottom tabs (Home / Tricks / Graph / Sequences).
- DECIDED: Settings splits at this phase; the implementation of the split happens in Phase 4h.
- DECIDED: People moves to the avatar menu, not a tab.
- DECIDED: Transitions and Learning are subsumed; no separate tabs.
- DEFERRED: Whether Home has a session-timer / practice-log feature (M4 territory).
- DEFERRED: Whether the header has an app mark / wordmark or just the avatar (Phase 2 decision).

## Implications for later phases

- **Phase 2 (shell)** implements the 4-tab bar and the new header. Must build header + avatar menu including People link.
- **Phase 4a (Home)** implements the new Home surface using the v1 content list above. New page component.
- **Phase 4b (Tricks)** renames `/` → `/tricks` and drops tier tabs in favor of a filter sheet.
- **Phase 4c (Graph)** adds a "Transitions list" entry point inside Graph.
- **Phase 4h (Settings)** implements the split.

## Router redirects

To preserve existing PWA installs and shared links:
- `/` → continues to resolve, but now routes to Home (not All Tricks). All Tricks is at `/tricks`.
- No `/learning`, `/transitions`, `/people` redirects needed — those routes still exist.
```

- [ ] **Step 2: Self-review the doc for placeholders, contradictions, ambiguities. Fix inline.**

- [ ] **Step 3: Commit.**

```bash
git add spec/2026-06-24-glasswork-ia-decisions.md
git commit -m "$(cat <<'EOF'
Glasswork Phase 1A: IA decisions

4 bottom tabs (Home / Tricks / Graph / Sequences). People demoted to
header menu. Transitions/Learning subsumed. Settings splits into
user-facing + Diagnostics. New Home surface in scope.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: clean commit, no other files staged.

---

## Part B — Token system

This part is TDD-shaped. Math utilities first, then tokens, then assertions on the tokens, then CSS plumbing, then preview route.

### Task B1: Stub the design module + color utilities (test scaffolding)

**Files:**
- Create: `src/design/color.ts`
- Create: `src/design/color.test.ts`

- [ ] **Step 1: Write the failing test for `hexToRgb`.**

Create `src/design/color.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `npx vitest run src/design/color.test.ts`
Expected: FAIL with "Cannot find module './color'" or similar import error.

- [ ] **Step 3: Implement minimal `hexToRgb`.**

Create `src/design/color.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes.**

Run: `npx vitest run src/design/color.test.ts`
Expected: PASS, 3 tests green.

- [ ] **Step 5: Commit.**

```bash
git add src/design/color.ts src/design/color.test.ts
git commit -m "Add hexToRgb utility for design tokens"
```

### Task B2: Add WCAG contrast ratio computation

**Files:**
- Modify: `src/design/color.ts`
- Modify: `src/design/color.test.ts`

- [ ] **Step 1: Write failing tests for `contrastRatio`.**

Append to `src/design/color.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/design/color.test.ts`
Expected: FAIL with "contrastRatio is not exported" or similar.

- [ ] **Step 3: Implement relative luminance + contrast ratio.**

Append to `src/design/color.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/design/color.test.ts`
Expected: PASS, 7 tests green.

- [ ] **Step 5: Commit.**

```bash
git add src/design/color.ts src/design/color.test.ts
git commit -m "Add WCAG contrast ratio utility for design tokens"
```

### Task B3: Add perceptual color distance (ΔE2000)

**Files:**
- Modify: `src/design/color.ts`
- Modify: `src/design/color.test.ts`

- [ ] **Step 1: Write failing tests for `deltaE`.**

Append to `src/design/color.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `npx vitest run src/design/color.test.ts`
Expected: FAIL with "deltaE is not exported."

- [ ] **Step 3: Implement Lab conversion + ΔE2000.**

Append to `src/design/color.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `npx vitest run src/design/color.test.ts`
Expected: PASS, 11 tests green.

- [ ] **Step 5: Commit.**

```bash
git add src/design/color.ts src/design/color.test.ts
git commit -m "Add CIE Lab + ΔE2000 perceptual distance"
```

### Task B4: Define the token module (initial hex values)

**Files:**
- Create: `src/design/tokens.ts`

- [ ] **Step 1: Write the tokens module with proposed hex values.**

Create `src/design/tokens.ts`:

```ts
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
    l: '#FF9C7C',          // warm coral — perceptually distant from brandLilac
    r: '#5FD8C9',          // cool teal
    both: '#F0E2C0',       // cream / warm sand
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
  danger: '#E05A5A',       // destructive only

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
```

- [ ] **Step 2: Verify it compiles.**

Run: `npx vue-tsc --noEmit`
Expected: no errors. If there are errors elsewhere in the codebase, ignore (this step only checks the new file compiles).

- [ ] **Step 3: Commit.**

```bash
git add src/design/tokens.ts
git commit -m "Add Glasswork token module with proposed hex values"
```

### Task B5: Test contrast + ΔE invariants on the token system

**Files:**
- Create: `src/design/tokens.test.ts`

- [ ] **Step 1: Write the failing invariant tests.**

Create `src/design/tokens.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to see which invariants the proposed hexes satisfy.**

Run: `npx vitest run src/design/tokens.test.ts`
Expected: some PASS, some may FAIL. If all fail or all pass, inspect — both are suspicious.

- [ ] **Step 3: Tune hex values in `src/design/tokens.ts` for any failing tests.**

For each failing test:
- Read which token + which threshold failed.
- Adjust the hex in `src/design/tokens.ts` by a small amount in the direction that should satisfy the test (e.g., for low contrast: increase luminance of the foreground or decrease luminance of base; for low ΔE: shift hue further apart).
- Re-run the test.
- Iterate until green. Do NOT lower the thresholds — they're the spec.

Run: `npx vitest run src/design/tokens.test.ts --watch`

- [ ] **Step 4: When all tests pass, commit.**

Run: `npx vitest run src/design/tokens.test.ts`
Expected: PASS, all green.

```bash
git add src/design/tokens.ts src/design/tokens.test.ts
git commit -m "Verify Glasswork tokens meet contrast + ΔE invariants"
```

### Task B6: Declare tokens as CSS via Tailwind v4 `@theme`

**Files:**
- Create: `src/design/glasswork.css`
- Modify: `src/style.css`

- [ ] **Step 1: Create the CSS theme file mirroring the TS tokens.**

Create `src/design/glasswork.css`:

```css
/* Glasswork design tokens — CSS layer.
   Mirrors src/design/tokens.ts. If you change a hex here, change it there.
   The token module is the source of truth; this file is its CSS surface. */

@theme {
  /* Base */
  --color-g-base: #0E0D12;
  --color-g-base-raised: #16151B;
  --color-g-fg: #EDEAF2;
  --color-g-fg-muted: #8E8B98;
  --color-g-fg-faint: #5A5762;

  /* Brand */
  --color-g-brand: #B5A8FF;
  --color-g-brand-soft: #D8CFFF;
  --color-g-peach: #FFB59E;
  --color-g-mint: #9EE8C7;
  --color-g-sky: #9ECDFF;

  /* Leg (categorical) */
  --color-g-leg-l: #FF9C7C;
  --color-g-leg-r: #5FD8C9;
  --color-g-leg-both: #F0E2C0;
  --color-g-leg-none: #7A7682;

  /* Rate (ordinal — single hue, four weights) */
  --color-g-rate-none: #3C3A45;
  --color-g-rate-bad: #7A6F84;
  --color-g-rate-mid: #B5A8C8;
  --color-g-rate-good: #E0D5FF;

  /* Signals */
  --color-g-danger: #E05A5A;

  /* Radii (px) */
  --radius-g-panel: 26px;
  --radius-g-chip: 14px;
  --radius-g-micro: 6px;

  /* Type (px) */
  --text-g-display: 40px;
  --text-g-h1: 28px;
  --text-g-h2: 22px;
  --text-g-body: 15px;
  --text-g-micro: 12px;

  /* Motion (ms) */
  --duration-g-sheet: 320ms;
  --duration-g-pulse: 180ms;
  --duration-g-route: 240ms;
}

/* Surface utilities — frost glass + aurora gradient. */

.gw-glass {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.gw-glass-strong {
  background: rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Aurora — used as a background layer on focal screens. */

.gw-aurora-bg-sm {
  background:
    radial-gradient(ellipse at 0% 0%, rgba(181, 168, 255, 0.10) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(255, 181, 158, 0.06) 0%, transparent 50%),
    var(--color-g-base);
}

.gw-aurora-bg-lg {
  background:
    radial-gradient(ellipse at 10% 0%, rgba(181, 168, 255, 0.20) 0%, transparent 55%),
    radial-gradient(ellipse at 90% 100%, rgba(255, 181, 158, 0.14) 0%, transparent 55%),
    radial-gradient(ellipse at 50% 50%, rgba(158, 232, 199, 0.06) 0%, transparent 70%),
    var(--color-g-base);
}

/* Pattern fills — used sparingly for inactive/empty states. */

.gw-hatch {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.04) 0 2px,
    transparent 2px 8px
  );
}

.gw-halftone {
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.06) 1px,
    transparent 1.5px
  );
  background-size: 8px 8px;
}
```

- [ ] **Step 2: Import the file from `src/style.css`.**

Edit `src/style.css`. After the existing `@import "tailwindcss";` and `@config` line, add:

```css
@import "./design/glasswork.css";
```

Do NOT modify any existing rule. The new tokens must coexist with the old ones.

- [ ] **Step 3: Build to verify no Tailwind compile errors.**

Run: `npm run build`
Expected: build succeeds. If `@theme` syntax is rejected, fall back to declaring vars on `:root` in a plain CSS block — verify the Tailwind v4 setup first.

- [ ] **Step 4: Run the full test suite to verify nothing else broke.**

Run: `npm test`
Expected: PASS, all 70+ tests still green plus the new color/tokens tests.

- [ ] **Step 5: Commit.**

```bash
git add src/design/glasswork.css src/style.css
git commit -m "Add Glasswork CSS tokens + glass/aurora/pattern utilities"
```

### Task B7: Build the `/spec/tokens` preview route

**Files:**
- Create: `src/pages/spec/Tokens.vue`
- Modify: `src/router.ts`

- [ ] **Step 1: Create the preview page.**

Create `src/pages/spec/Tokens.vue`:

```vue
<script setup lang="ts">
import { gw } from '../../design/tokens'

const swatchGroups = [
  {
    title: 'Base',
    items: [
      { name: 'base', hex: gw.base },
      { name: 'baseRaised', hex: gw.baseRaised },
      { name: 'fg', hex: gw.fg },
      { name: 'fgMuted', hex: gw.fgMuted },
      { name: 'fgFaint', hex: gw.fgFaint },
    ],
  },
  {
    title: 'Brand',
    items: [
      { name: 'brand', hex: gw.brand },
      { name: 'brandSoft', hex: gw.brandSoft },
      { name: 'brandPeach', hex: gw.brandPeach },
      { name: 'brandMint', hex: gw.brandMint },
      { name: 'brandSky', hex: gw.brandSky },
    ],
  },
  {
    title: 'Leg (categorical)',
    items: [
      { name: 'leg.l', hex: gw.leg.l },
      { name: 'leg.r', hex: gw.leg.r },
      { name: 'leg.both', hex: gw.leg.both },
      { name: 'leg.none', hex: gw.leg.none },
    ],
  },
  {
    title: 'Rate (ordinal — single ramp, off-hue)',
    items: [
      { name: 'rate.none', hex: gw.rate.none },
      { name: 'rate.bad', hex: gw.rate.bad },
      { name: 'rate.mid', hex: gw.rate.mid },
      { name: 'rate.good', hex: gw.rate.good },
    ],
  },
  {
    title: 'Signals',
    items: [{ name: 'danger', hex: gw.danger }],
  },
]
</script>

<template>
  <div
    class="gw-aurora-bg-lg min-h-screen px-4 py-6"
    :style="{ color: gw.fg, fontFamily: 'system-ui, -apple-system, sans-serif' }"
  >
    <h1 :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
      Glasswork tokens
    </h1>
    <p :style="{ color: gw.fgMuted, fontSize: gw.type.body + 'px', marginTop: '4px' }">
      Dev-only preview. Mirrors <code>src/design/tokens.ts</code>.
    </p>

    <section
      v-for="group in swatchGroups"
      :key="group.title"
      class="gw-glass"
      :style="{
        marginTop: '24px',
        padding: '16px',
        borderRadius: gw.radius.panel + 'px',
      }"
    >
      <h2 :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">{{ group.title }}</h2>
      <div
        :style="{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }"
      >
        <div
          v-for="item in group.items"
          :key="item.name"
          :style="{
            borderRadius: gw.radius.chip + 'px',
            overflow: 'hidden',
            background: gw.baseRaised,
            border: '1px solid rgba(255,255,255,0.08)',
          }"
        >
          <div :style="{ height: '60px', background: item.hex }" />
          <div :style="{ padding: '8px 10px' }">
            <div :style="{ fontSize: gw.type.micro + 'px', color: gw.fg }">{{ item.name }}</div>
            <div
              :style="{
                fontSize: '11px',
                color: gw.fgMuted,
                fontFamily: 'ui-monospace, monospace',
                marginTop: '2px',
              }"
            >
              {{ item.hex }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="gw-glass"
      :style="{
        marginTop: '24px',
        padding: '16px',
        borderRadius: gw.radius.panel + 'px',
      }"
    >
      <h2 :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">Type scale</h2>
      <div :style="{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }">
        <div :style="{ fontSize: gw.type.display + 'px', fontWeight: 700, letterSpacing: '-0.02em' }">
          Display · {{ gw.type.display }}px
        </div>
        <div :style="{ fontSize: gw.type.h1 + 'px', fontWeight: 600 }">
          Heading 1 · {{ gw.type.h1 }}px
        </div>
        <div :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">
          Heading 2 · {{ gw.type.h2 }}px
        </div>
        <div :style="{ fontSize: gw.type.body + 'px' }">
          Body · {{ gw.type.body }}px — Slalom is a niche freestyle inline-skating discipline.
        </div>
        <div :style="{ fontSize: gw.type.micro + 'px', color: gw.fgMuted }">
          Micro · {{ gw.type.micro }}px — system labels and metadata
        </div>
      </div>
    </section>

    <section
      class="gw-glass"
      :style="{
        marginTop: '24px',
        padding: '16px',
        borderRadius: gw.radius.panel + 'px',
      }"
    >
      <h2 :style="{ fontSize: gw.type.h2 + 'px', fontWeight: 600 }">Surfaces &amp; patterns</h2>
      <div
        :style="{
          marginTop: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
        }"
      >
        <div
          class="gw-glass"
          :style="{ height: '100px', borderRadius: gw.radius.chip + 'px', padding: '10px' }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-glass</div>
        </div>
        <div
          class="gw-glass-strong"
          :style="{ height: '100px', borderRadius: gw.radius.chip + 'px', padding: '10px' }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-glass-strong</div>
        </div>
        <div
          class="gw-hatch"
          :style="{
            height: '100px',
            borderRadius: gw.radius.chip + 'px',
            padding: '10px',
            background: gw.baseRaised,
          }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-hatch</div>
        </div>
        <div
          class="gw-halftone"
          :style="{
            height: '100px',
            borderRadius: gw.radius.chip + 'px',
            padding: '10px',
            background: gw.baseRaised,
          }"
        >
          <div :style="{ fontSize: gw.type.micro + 'px' }">.gw-halftone</div>
        </div>
      </div>
    </section>
  </div>
</template>
```

- [ ] **Step 2: Add the dev-only route.**

Edit `src/router.ts`. Add to the `routes` array, after the `/install` entry:

```ts
  ...(import.meta.env.DEV
    ? [
        {
          path: '/spec/tokens',
          name: 'spec-tokens',
          component: () => import('./pages/spec/Tokens.vue'),
          meta: { hideTabs: true },
        } as RouteRecordRaw,
      ]
    : []),
```

- [ ] **Step 3: Run dev server and verify the route loads.**

Run: `npm run dev`
Then open `http://localhost:5173/#/spec/tokens` in a browser.
Expected: page renders with all swatches, type sizes, and surface samples. Glass panels show the aurora background bleeding through.

- [ ] **Step 4: iOS Safari perf checkpoint (the user must do this on a real device, not the dev simulator).**

Open the deployed Vite preview or `npm run preview` over LAN, hit the route on a real iPhone in Safari. Confirm:
- Frost panels render with visible blur (not solid).
- Aurora gradient is smooth, no banding.
- Scrolling the page sustains 60fps (no jank).

If any of these fails: tune `backdrop-filter` blur radius in `glasswork.css` (try 16px or 12px), or reduce gradient opacity. Re-deploy + re-check.

- [ ] **Step 5: Commit.**

```bash
git add src/pages/spec/Tokens.vue src/router.ts
git commit -m "Add /spec/tokens dev-only preview route"
```

### Task B8: User aesthetic review of the token preview

**Files:** none (interactive).

- [ ] **Step 1: Show the deployed token preview to the user.**

Deploy to whatever staging the user prefers, or run `npm run dev` and have them hit it on their phone via LAN.

- [ ] **Step 2: Collect feedback.**

Specifically ask:
- Lilac lead — too purple? too cold?
- Leg colors — are L (coral) and R (teal) clearly distinct on the actual phone screen?
- Rate ramp — does the off-hue density treatment read as "this is the same scale" or do the four states look unrelated?
- Aurora gradient — too strong, too weak, just right?
- Glass blur — visibly different from `gw-glass-strong`?

- [ ] **Step 3: Tune any hex values per feedback.**

Edit `src/design/tokens.ts` AND `src/design/glasswork.css` together — they MUST stay in sync. After each tune:
- Re-run `npx vitest run src/design/tokens.test.ts` — invariants must still hold. Do NOT lower thresholds.
- Re-deploy / re-check on phone.

- [ ] **Step 4: When user signs off, commit the final tuned values.**

```bash
git add src/design/tokens.ts src/design/glasswork.css
git commit -m "Tune Glasswork token hex values after user review"
```

### Task B9: Final phase commit + update roadmap status

**Files:**
- Modify: `spec/2026-06-24-redesign-glasswork-roadmap.md`

- [ ] **Step 1: Update the roadmap status table.**

Edit `spec/2026-06-24-redesign-glasswork-roadmap.md`. In the status table at the bottom, change the row for Phase 1 from `Plan written / —` to `Shipped / <commit-sha>`.

- [ ] **Step 2: Commit.**

```bash
git add spec/2026-06-24-redesign-glasswork-roadmap.md
git commit -m "Glasswork Phase 1 shipped — IA + tokens"
```

- [ ] **Step 3: Run full test suite + build to confirm no regressions.**

Run: `npm test && npm run build`
Expected: PASS + clean build.

- [ ] **Step 4: Final sanity check on the running app.**

Run: `npm run dev`
Visit existing routes (`/`, `/learning`, `/graph`, `/sequences`, etc.). Confirm they render identically to before this phase. (They use old tokens; new tokens have not been wired into any existing screen yet.)

---

## Self-review notes (built into the plan, not appended)

- **Spec coverage**: every item in the design spec §4 (color), §5 (material), §6 (typography), §7 (iconography stance only — not the marks themselves), §8 (motion duration constants only) is covered by a token in `src/design/tokens.ts`. Layout / per-screen / per-component implementation is correctly deferred to later phases.
- **IA**: the spec explicitly says IA is in scope for Phase 3 (per user's Phase 3 instruction); the IA decisions doc captures the decisions without implementing the routes/tabs.
- **Bridging**: old tokens (in `tailwind.config.js`) and old `:root` vars (in `src/style.css`) are not touched. New tokens live under the `g-` prefix in CSS and a single `gw` export in TS.
- **No new dependencies introduced.** Color utilities are hand-written, ~70 lines total.
- **iOS perf checkpoint** is included as Task B7 step 4.
- **User aesthetic review** is Task B8 — explicit, not silent.

---

## Decisions made (to append to closing commit message)

After Phase 1 ships, append the following to a commit message or to a `DECISIONS.md` log:

- DECIDED: 4 bottom tabs (Home / Tricks / Graph / Sequences).
- DECIDED: Settings splits into `/settings` + `/diagnostics`.
- DECIDED: People + Learning + Transitions are no longer tabs.
- DECIDED: Tokens namespaced `g-` (CSS) and `gw` (TS).
- DECIDED: Rate is off-hue — a single 4-step ordinal ramp via fill/chroma.
- DECIDED: Leg colors enforce ΔE ≥ 25 against each other and ≥ 20 against the brand lead.
- DECIDED: Aurora background as `.gw-aurora-bg-sm` (subtle) + `.gw-aurora-bg-lg` (pronounced), policy applied per screen in later phases.
- DEFERRED: Custom typeface (still using system stack in Phase 1; selection in Phase 3 or earlier if user has a preference).
- DEFERRED: Bespoke iconography (Phase 6 SHIP GATE).
