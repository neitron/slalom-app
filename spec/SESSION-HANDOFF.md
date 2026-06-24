# Session handoff — 2026-06-24

Picking up next session: paste this into a fresh `claude` invocation at
`/Users/kzubenko/Projects/slalom-app` and say "continue from
SESSION-HANDOFF.md". Or `claude --resume` and choose the recent
slalom-app session.

---

## App state right now

- **Deployed**: `e106d9e` on `main` → https://neitron.github.io/slalom-app/
- Build clean, 70/70 tests pass.
- M3.5 social layer shipped: profiles, friends, blocks, foreign-profile view, per-user transitions/sequences, shared trick catalog.
- Two Supabase users in prod: `kirill.zubenko.neitron@gmail.com` (Neitron), `yuliad446@gmail.com` (Yuliandra). Accepted friendship between them. Yulia visibility=`friends`, Kirill visibility=`private`.
- Supabase MCP is connected (project ref `tdpetpsexwfblrhwunup`). Migrations applied: `m3_5_social`, `m3_5b_per_user_edges`, `drop_visibility_requires_nickname_check`.

## What works

- Auth: Google OAuth via PKCE flow (commit `f0b5da7`), magic link.
- Sync: pull/push outbox, realtime, per-user-progress merge for tricks, direct-row rate for transitions/sequences.
- People tab: search by nickname, send friend request, accept/decline, friend tiles open `/u/<nick>` (fetched via `fetchProfilesByIds`).
- ForeignProfile renders read-only tricks/transitions/sequences for visible friends, gates by `visibility` + `friendship` + `user_blocks` server-side (`is_visible_to()`).
- Install landing page at `#/install` with iOS Safari / iOS Chrome / Android Chrome / in-app browser detection (commit `944ee70`).
- Settings → bottom shows build sha (clickable to commit) for debugging stale PWAs.

## Known open bug

**iOS keyboard drift still moves the TabBar up after open + close.** Latest attempt (commit `e106d9e`, body-scrolled shell + Teleported fixed TabBar + `useIosKeyboardReset` composable with `scrollBy(0,-1); scrollBy(0,1)` post-blur trick) did not eliminate it on the user's device.

User's decision: **postpone**. Complete redesign planned. Don't chase this with band-aids next session — start fresh.

Things tried this session that did NOT fix it (don't re-propose without a new mechanism):
- T1: `position: fixed; bottom: 0` (drifts)
- T2: sticky in flex shell with main overflow-y-auto (kills URL bar collapse + fresh-install gap)
- T3: sticky in body-scroll min-h-svh shell (still drifts)
- T4: visualViewport JS compensation via translateY (wrong sign during rubber-band → bars converged)
- T5: `interactive-widget=resizes-content` meta (iOS ignores it currently)
- T6: Teleport + fixed + useIosKeyboardReset (current — still drifts on user's device)

## What's planned next (per user)

- **Complete redesign** of nav/header/shell layout. Throw out the current architecture.
- Multiple skills now available in the user's Claude that may inform the redesign: `building-native-ui`, `frontend-design`, `webapp-testing`, `accessibility`, `vue`. Start the redesign by invoking `brainstorming` skill and `frontend-design` skill.

## Real follow-ups not blocked by the redesign

- `tricks_update` RLS is wide-open — any authenticated user can rename catalog tricks. User implied they don't want this; add `created_by` column + tighten policy.
- Two `authenticated_security_definer_function_executable` advisor warnings remain (`is_visible_to`, trigger helpers). Cosmetic; can move to private schema.
- Bundle is 671 KB precache; could split Supabase further or migrate to lighter realtime if needed.
- M4 placeholder: practice-log charts, aggregate friends view (`practice_log_summary`), push notifications.

## Recent commit narrative (chronological top to bottom)

| Commit  | What                                                     |
|---------|----------------------------------------------------------|
| 643ee7e | M3.5 social layer (initial workflow output)              |
| 118c857 | M3.5b: per-user transitions/sequences + RLS hardening    |
| 022cab3 | Fix Yulia seeing Kirill's stale data (drop-on-pull)      |
| 32f709c | Fix friend tile "User not found" (fetchProfilesByIds)    |
| e35b765 | Drop visibility_requires_nickname CHECK                  |
| 31fb2ad | Fix iOS status-bar overlap                               |
| f0b5da7 | Switch Supabase auth to PKCE (was: vue-router hash ate access_token) |
| ce74a5e | Sync: dedupe trick names locally before bulkPut          |
| 1135277 | Drive shell height from innerHeight (fresh-install gap)  |
| ec432d0 | Pin app fixed inset:0 (then reverted — killed URL bar collapse) |
| ad64505 | Real fix: fixed TabBar + body-scroll                     |
| ccd822c | TabBar sticky bottom:0 in shell                          |
| 49f0de7 | Drift compensation via translateY (then reverted)        |
| f825e9e | min-h 100vh so short pages scroll                        |
| 8fa76b7 | Revert visualViewport JS comp (rubber-band convergence)  |
| e106d9e | Workflow-generated body-scroll + Teleport + iOS reset    |

## Key files for the redesign

- `src/App.vue` — shell, header, main, TabBar/sheets order, Teleport placeholders
- `src/components/TabBar.vue` — currently Teleported, `.tabbar-fixed` class
- `src/components/HeaderProfileMenu.vue` — avatar+menu, shows when not on /install
- `src/style.css` — base resets, css vars
- `src/composables/useIosKeyboardReset.ts` — current keyboard-drift workaround (drop if redesign)
- `src/composables/useKeyboardOpen.ts` — keyboard-open detection (vv.resize gated)
- `src/composables/useSheetViewport.ts` — sheet height fix when keyboard up
- `src/pages/Graph.vue` — uses `calc(100dvh - --header-h - --tabbar-h - safe-areas)`, depends on CSS vars set by App
- `index.html` — viewport meta, apple-mobile-web-app-* tags, theme-color

## Sheets currently

- Teleported to body, `position: fixed; inset: 0`, panel `max-h-[90dvh]`, drag-to-close, `useSheetViewport` hook for keyboard.

## Things to NOT re-litigate next session

- PKCE flow for auth (works, don't touch).
- Per-user transitions/sequences vs shared tricks catalog (decided).
- Sheets-via-Teleport (works).
- The bug-fix train for `User not found`, "friend sees my data", visibility-CHECK, status-bar overlap, fresh-install icons.

## Pinned reference

- Supabase project ref: `tdpetpsexwfblrhwunup`
- GH Pages base path in prod: `/slalom-app/`
- Hash router. SPA fallback via copying `index.html` → `404.html` in CI.
- Auth storage key: `slalom.sb.auth`
- Dexie name: `slalom`, current version 4
