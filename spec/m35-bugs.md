# M3.5 open bugs (post-deploy, commit 643ee7e)

## A. UX: visibility_requires_nickname blocks Save profile
Settings → Profile form defaults visibility to "Friends only" and Save button is enabled even before a nickname is claimed. The DB CHECK constraint `visibility_requires_nickname` then rejects the upsert with the raw error surfaced to the user. Fix path: either auto-switch visibility to 'private' until nickname exists, or disable Save with inline hint "Claim a nickname first to share with friends".
Files likely involved: src/pages/Profile.vue or src/pages/ProfileSettings.vue, src/stores/profile.ts.

## B. CRITICAL — Friend can interact with my graph as if it were mine
Reported behavior: when viewing my profile, the friend's session showed MY graph, was able to DRAG nodes, and was able to RATE tricks. Unknown whether writes hit my row or theirs.
Investigation needed (blocked on Supabase MCP):
- Verify RLS on user_trick_progress / user_transition_progress / user_sequence_progress UPDATE policies — should only allow `auth.uid() = user_id`.
- Verify ForeignProfile.vue is actually mounted on /u/:nickname instead of reusing the owner's Learning/Graph routes.
- Check if RateButtons / RateDots are rendered in read-only mode on foreign view.
- Check if graph node drag writes to localStorage (per-device) or to a Supabase column (would leak across users).
