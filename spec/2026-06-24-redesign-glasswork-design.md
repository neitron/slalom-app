# Redesign — "Glasswork" design direction

Date: 2026-06-24
Status: Direction approved. Scope = visual / material / motion language.
Companion docs:
- `spec/SESSION-HANDOFF.md` — locked decisions from M3.5 (auth, data model, sheets pattern, postponed iOS keyboard bug).
- Implementation plan: to be written next via `superpowers:writing-plans`.

---

## 1. Summary

Slalom-app is a niche PWA for inline-skating Slalom. The M3.5 backend (auth, data, sync, social RLS) is settled. The current UI is generic Tailwind-default chrome on top of that backend, and the user has chosen to redesign the visual/UX layer from scratch.

This document defines the **visual direction only** — color, material, typography, iconography, motion, signature moves. **Information architecture, screen-by-screen UX, and component spec live in the follow-on implementation plan**, not here.

The direction has a name: **Glasswork**.

---

## 2. Inputs that produced this direction

Brainstorming interview (2026-06-24) established:

| Dimension | Locked value |
|---|---|
| Audience | Wider Slalom community, beginners → advanced |
| Top jobs | (1) Log tricks I'm learning · (2) Build & rehearse sequences · (3) Discover + reference tricks |
| Frequency | In-session at the cones, between attempts |
| Physical context | Phone in hand, bare hands, dry |
| Worst failure modes | Friction to log progress · Losing logged data |
| Social | Side trip — not top-level, not shaping home |
| Discovery model | Quick-search-first; behaves like a tool, not a feed |
| Logging gesture | Tap-to-cycle on the card, no sheets, no modals |
| Sequence build | Generator-first stays; sheet is a read-while-skating script + rate-after-run |
| Offline | Full offline read + write (current Dexie + outbox stays) |
| i18n | Multi-locale eventually; English-only ships; architecture must accommodate |
| Monetization | Out of scope for this redesign |
| PWA install | Critical — most active users are installed |
| Motion language | Kinetic + expressive |
| Tone bucket | Playful / kinetic — refined into "Glasswork" after reference review |

Reference review (Phase 2):

- Rejected: A (Skate-Zine) and C (Display-Editorial).
- Lean: B (Sport-Instrument), but **with three sharp corrections**:
  1. Anti-toxic-green. The Strava/Nike/AllTrails neon-green axis is out.
  2. Pro-frost. Apple-style frosted glass + visible gradient bleed is the material thesis. The chrome carries visual energy because the app lacks photographic content.
  3. Pro-bespoke-iconography. Lucide/Feather defaults are dropped.
- Anchor reference: the Fitonist dashboard screenshot (pastel-on-near-black, lilac lead, big rounded cards, white-pill active states, halftone/hatch patterns, big tabular numerals).
- Calibration references: Strava + AllTrails (used to sanity-check "not generic fitness," not as patterns to copy).
- User-volunteered signature idea: **fibonacci-spiral anchor dots** as the Graph's background grid.

---

## 3. Direction definition — Glasswork

Sport-instrument *structure* rendered in **glass and pastel light on near-black**. Material does the work that photography would do in another app. The Graph is the signature surface; the rest of the app shares its visual family.

Mood: calibrated, calm, kinetic. Energy lives in **material (frost, depth, gradient bleed)** and **motion (springs, view transitions)** — not in shouting color.

The app should feel made *for* the Slalom community by someone who actually skates. Niche-confident, not generic.

---

## 4. Color system

### 4.1 Base

- **Near-black warm-cool base.** Slight purple pull so lilac wash sits well. Working target: `~#0E0D12` (final hex set in Phase 3 token work).
- **Lilac / lavender as the lead brand hue.** Pastel-saturated (~70% sat, mid-high lightness on dark). Used for primary actions, brand accents, focused-card halos, the aurora gradient.
- **Single white pill** as the universal "active" affordance for tab and toggle controls (Fitonist-style). Replaces the current `bg-accent text-bg` solid-blue active state.

### 4.2 Gradient policy ("mixed by screen")

- **Home / session / Graph**: visible aurora gradient (lilac → soft peach, fading toward the base color in a slow diagonal). The glass panels translate this wash.
- **Dense list views** (Tricks catalog, Transitions, Sequences list): subtle near-edge gradient only. Data density takes priority; the wash is decorative noise here.
- Rule of thumb: the more *data* on the screen, the *less* gradient. The more *focal* the screen, the *more* gradient.

### 4.3 Leg color system — categorical

The leg axis (L / R / both / none) is **categorical**, not ordinal. Three saturated pastel hues with maximum perceptual distance from lilac AND from each other.

- Working draft (final hexes in Phase 3):
  - **L** — warm peach / coral
  - **R** — cool teal / aqua
  - **Both** — cream / warm sand
  - **None** — neutral surface gray, no chroma
- Constraints:
  - Perceptual distance ≥ ΔE 25 between any two of {L, R, both, lilac-lead, accent-rate-warning}.
  - All four must be legible on the near-black base AND inside frosted panels (the gradient bleed-through shifts perceived chroma — verify in both contexts).
  - On the Graph, leg colors are the *only* hue carrier — no rate hue collisions are possible because rate is off-hue (see 4.4).

### 4.4 Rate scale — ordinal, off-hue

The current system collides: `rate-mid` amber + `side-l` orange share the warm-orange family. **Solution: take rate off the hue axis entirely.**

- Rate is expressed as **density / fill weight**, not hue:
  - **No rate** — hollow ring
  - **Bad** — half-filled, low chroma
  - **Mid** — filled, low chroma
  - **Good** — filled + slightly-larger / weight-boosted
- A single tinted hue (a muted gold or mid-luminance lilac variant) carries *all four* rate states; the only thing that varies between them is fill, weight, and chroma.
- Eliminates rate-vs-leg collision permanently. Frees the hue dimension entirely for the leg axis.
- The current `rate-good` green / `rate-bad` red traffic-light is dropped. Rationale: it competed for attention with leg color and dragged the app into "fitness tracker" territory.

### 4.5 Supporting accents

- **Lilac** — primary brand.
- **Soft peach** — warm secondary, paired with leg-L in the wash but distinct in chroma when used as UI accent.
- **Mint / sky** — used sparingly for system signals (sync OK, success microstates).
- **Danger** — preserved as a single saturated red, used only for destructive confirmation (matches current `danger #c44545` purpose, hex TBD).

### 4.6 Token system shape

The Phase 3 token work will produce:

- Surface tokens (`bg-base`, `bg-panel`, `bg-panel-glass`, `bg-panel-glass-2`).
- Brand tokens (`brand-lilac`, `brand-lilac-soft`, `brand-peach`, …).
- Categorical leg tokens (`leg-l`, `leg-r`, `leg-both`, `leg-none`).
- Ordinal rate tokens (`rate-none`, `rate-bad`, `rate-mid`, `rate-good`) — single hue, four weights.
- Signal tokens (`signal-ok`, `signal-warn`, `signal-danger`).
- Pattern tokens (hatch fill, halftone fill, dot grid).

Hex values are not pinned in this spec. They are pinned in Phase 3 after a contrast + ΔE pass.

---

## 5. Material / surface

The material thesis: **frost + bleed.**

- **Frosted glass panels** with iOS-style backdrop blur. The gradient wash bleeds through. Two glass surface tints:
  - `panel-glass` — primary panel surface, ~60% opacity over base, blur ~20px.
  - `panel-glass-2` — nested panels and chips, slightly more opaque, blur ~12px.
- **Corner radius** scale:
  - Top-level cards / sheets: 24–28px.
  - Nested chips / pills / buttons: 12–16px.
  - Micro elements (rate dots, toggles): fully rounded.
- **Pattern as secondary texture.** Used sparingly, *never decoratively*:
  - **Diagonal hatch** fills for "inactive / empty" states (e.g., a sequence card with no run yet, a bar in a chart with no data).
  - **Halftone dot** fills for map-like or terrain-like surfaces (only if/when the redesign introduces such a surface — the Graph is *not* this; see 7.1).

---

## 6. Typography

- **Single grotesque display family** for everything. Eliminates type-family decisions in implementation.
- Final candidate set (pick one in Phase 3 — these are working candidates, not committed):
  - ABC Diatype (Dinamo)
  - Söhne (Klim)
  - Inter Display (Rasmus Andersson, free)
- **Tabular figures.** Required for all numerals (rate scores, step counts, dates).
- **Three+ type sizes** in active use, not the current effective two:
  - Display — 36–48px, screen titles and hero numerals.
  - Body — 14–16px.
  - Micro — 11–12px, system labels and metadata.
- **Tracking**: tight at display sizes, normal at body, slight positive tracking at micro/uppercase.
- **No serifs.** No second family. No display-italic flourishes.
- **Localization-ready.** The font choice must ship Cyrillic + Latin Extended at minimum (constrains the candidate set above; verified in Phase 3).

---

## 7. Iconography

### 7.1 Stance

**Bespoke. No Lucide / Feather defaults.** This is the most-noticed "templated" tell in the current UI per the audit. The redesign does not ship until the icon set is original.

### 7.2 Required marks

Custom icons required for, at minimum:

- Trick (catalog symbol — likely a stylized cone or skate mark)
- Transition (linkage / chain mark)
- Sequence (chain of three+ nodes)
- Graph (the signature mark — see 7.3)
- Leg-L / Leg-R / Leg-both / Leg-none (compact glyphs)
- Rate dot (the four states from 4.4)
- Sync / cloud
- People (kept generic-ish — not the focal point per "social = side trip")
- Settings, profile, search

### 7.3 Style brief

- Thin-to-medium stroke, geometric, optical-aligned.
- All in one stroke weight family. Fixed icon sizes (16, 20, 24).
- Slalom-specific affordances allowed: a cone glyph, an arc/spiral glyph for the Graph (echoing the fibonacci grid — see 8.1).
- Icons are flat strokes in `currentColor`. No fills, no two-tone in v1.

### 7.4 Deferral

Custom mark *design* is deferred to a dedicated work phase (post tokens + shell). The implementation plan reserves a step for it and flags shell components that hard-depend on it (TabBar, GraphView, sheet headers).

---

## 8. Motion

### 8.1 Posture

Spring physics throughout. Look-and-feel target: iOS-native. The user explicitly chose "kinetic + expressive" — Glasswork interprets that as *silky kinetics*, not *bouncy kinetics*.

- Default spring: medium stiffness, slight overshoot on enter, near-critical damping on exit.
- Default duration band: 220–360ms for sheets; 140–220ms for in-place state changes.
- No straight-line easing on functional motion. Tailwind `transition-colors` defaults are dropped.

### 8.2 Required motion moments

- **Tap-to-cycle on card.** The rate dot animates state with a small pulse + weight bump, not a fade. Microhaptic-flavored.
- **Sheet open / close.** Backdrop blurs in, panel rises with spring + rubber-band. Background content visible-but-blurred while the sheet is up (iOS Maps / Apple Music posture).
- **View transitions between routes.** Cross-fade + small parallax push. The View Transitions API is the implementation target where supported; spring fallback elsewhere.
- **Graph fibonacci grid breathing.** Anchor dots have a slow, near-imperceptible breathing state — implies liveness without distraction. Disabled under `prefers-reduced-motion`.
- **Generator action.** The 🎲 Generate action gets a tactile compose motion when it produces a sequence — steps arrive in a brief stagger, not all at once.

### 8.3 Reduced motion

All motion has a `prefers-reduced-motion: reduce` path that disables spring overshoot, parallax, and breathing. Functional state changes still animate (otherwise tap-to-cycle reads as "not working") but with linear short-duration ease.

---

## 9. Signature visual moves

The five things that make this Glasswork and not a generic-fitness clone:

1. **Fibonacci-spiral anchor-dot grid as the Graph's background substrate.** A golden-spiral radial array of dots emanating from origin, replacing the current implicit XY plane. The dots provide visual rhythm and a sense of structure; tricks (graph nodes) hover above them. The dots are not interactive in v1 — they're substrate.
2. **Frost + aurora gradient** on home / session / Graph screens. Material as the brand carrier.
3. **Lilac-as-lead** in a niche where every competing fitness app is volt-green. Single biggest differentiating decision.
4. **Rate-as-density**, not rate-as-color. Solves the orange-collision permanently and lifts the design out of "traffic light tracker" cliché.
5. **Bespoke iconography** with Slalom-specific marks. The most-noticed templated tell in the current UI is eliminated.

---

## 10. What carries over from the current app

Carried unchanged unless implementation discovers a forcing reason otherwise:

- Dark theme.
- Leg-color semantic mapping (re-keyed to the new palette — see 4.3).
- Full offline read + write via Dexie + outbox.
- Sheets-via-Teleport pattern (re-skinned in frost glass).
- PKCE Supabase auth, hash router, PWA install path.
- Generator-first sequence creation; SequenceSheet as a *rehearsal script + rate-after-run* artifact.
- Per-user transitions/sequences vs shared trick catalog data model.
- People tab continues to exist as a destination (but demoted from the primary bottom row — exact placement in Phase 3).

---

## 11. What is dropped

- Cornflower-blue accent (`#6f8cff`). Replaced by lilac.
- The current `rate-good` green / `rate-mid` amber / `rate-bad` red traffic-light. Rate goes off-hue (see 4.4).
- All Lucide / Feather default icons. Replaced by bespoke set (see 7).
- Flat-on-flat-on-flat dark card stacking. Replaced by frost glass with gradient bleed.
- Identical-looking list pages. Each top-job screen gets its own posture within a family resemblance (defined in Phase 3 alongside IA).
- `useIosKeyboardReset` composable. (The postponed iOS keyboard drift bug is intentionally out of scope; the new shell is architected without the workaround. Re-attempt of the bug is a separate post-redesign task.)
- Current dual-ResizeObserver `--header-h` / `--tabbar-h` shell architecture. Replaced by whatever the new shell makes natural (defined in Phase 3 alongside nav/shell).
- Solid-blue `bg-accent` active states. Replaced by white-pill active states.
- Build SHA surfaced inside Settings as a footer. (Diagnostic info moves to a separate diagnostics surface; user-facing Settings is split — see 12.)

---

## 12. Out of scope for this spec (in scope for the implementation plan)

The Phase 3 implementation plan, written via `superpowers:writing-plans`, owns:

- **Information architecture.** Tab count, tab identity, presence/absence of a home/session surface, demotion of People, split of Settings into user-facing vs diagnostics, the role and entry path of the Graph.
- **Concrete hex values** for every token (with ΔE + contrast verification).
- **Component-by-component spec.** TabBar, header (if any), TrickCard, SequenceSheet, GeneratorSheet, GraphView, RateDots, RateButtons, sheets, chips, search/sort, etc.
- **Custom iconography design** as a work phase.
- **Per-screen design** for each top-job destination.
- **Motion specs** (curve parameters, durations, choreography per route transition).
- **PWA polish**: icons, splash, install funnel, iOS safe-area handling, theme-color.
- **Migration plan.** How the new design lands incrementally without a big-bang rewrite. Each phase independently shippable.
- **Postponed iOS keyboard drift bug.** Out of scope for the redesign itself; the new shell will be architected without the workaround and the bug will be re-evaluated as a separate task.

---

## 13. Open questions deliberately deferred to Phase 3

These are decisions the user has not made yet AND that do not need to be made to commit to the direction:

1. Exact font pick (Diatype vs Söhne vs Inter Display) — depends on Cyrillic coverage + licensing.
2. Exact hex values for lilac, base, leg-L, leg-R, leg-both, danger.
3. Whether "hero numerals" find a meaningful home (Sequence step count? Rate score in detail? Session timer that doesn't exist today?). Fitonist hero-numeral pattern is *aspirational*, not yet *applicable*.
4. IA: number of bottom tabs, whether to introduce a home/session surface, where People + Settings live.
5. Whether the icon set is built in-house, contracted, or sourced from a paid bespoke set with custom additions.

---

## 14. Risks and trade-offs

- **Frost + blur is expensive on iOS Safari when stacked.** Backdrop blur over animated gradients in a PWA shell can cost frame budget. Phase 3 must include a perf budget check on real iOS hardware before committing the gradient policy across every screen.
- **Bespoke iconography is real work.** The redesign cannot ship without it. The plan must include a credible icon-set work phase and ship-blocking gate.
- **Lilac-as-lead is a bold brand choice.** It is the right *differentiation*, but if the Slalom community reads it as "not serious," the lead hue is the cheapest thing to re-key. (The token system makes this a one-file change.)
- **Rate-as-density is correct but unfamiliar.** Users coming from the current traffic-light may read "filled dot" as "good" by default. Phase 3 should consider a brief in-app explanation or onboarding hint for the first encounter.
- **Fibonacci grid breathing motion must be tasteful.** If too active, it becomes a distraction on a focal screen. Spec the breathing as near-imperceptible and gate behind reduced-motion.

---

## 15. Acceptance criteria for this spec

This spec is "done" when:

- The user has reviewed it and approved the visual direction.
- The implementation plan can be written from it without re-litigating direction.
- Subsequent design decisions in Phase 3 can defer back to this document for "did we already decide?"

This spec is **not** trying to define what the app looks like. It is trying to define what the app *feels* like and what the design system is *made of*. Layout, screens, and hexes come next.
