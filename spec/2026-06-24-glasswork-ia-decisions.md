# Glasswork — IA Decisions

Date: 2026-06-24
Direction spec: `spec/2026-06-24-redesign-glasswork-design.md`
Roadmap: `spec/2026-06-24-redesign-glasswork-roadmap.md`

## Tab map (bottom navigation, 4 tabs)

| Position | Tab | Route | Purpose |
|---|---|---|---|
| 1 | Home | `/` | "What should I do right now?" — Working-on list with tap-to-cycle, recent activity, quick-jumps |
| 2 | Tricks | `/tricks` | Catalog browse, search-first |
| 3 | Graph | `/graph` | Signature surface; Transitions reachable as list view from inside |
| 4 | Sequences | `/sequences` | List + generator + rehearsal sheet |

## Route map

| Route | Page | In tab bar? | New? | Notes |
|---|---|---|---|---|
| `/` | Home | Yes | NEW | Replaces today's `/` |
| `/tricks` | AllTricks | Yes | Yes | AllTricks page, moved here from `/` |
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
- Quick-jump button: "Current Sequence" (if user has any sequence rated in the last 14 days).

That is the entire v1 scope of Home. Anything else is deferred.

## Decisions log

- DECIDED: 4 bottom tabs (Home / Tricks / Graph / Sequences).
- DECIDED: Settings splits into `/settings` + `/diagnostics`. Implementation deferred (see Implications).
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
