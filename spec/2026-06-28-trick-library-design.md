# Trick Library — design

Date: 2026-06-28
Predecessors: Phase 6 polish R2 (sticky top bar + sub-tab pattern from Sequences), add-new-trick (`spec/2026-06-27-add-new-trick-design.md`), Phase 5 (sheet choreography + motion tokens)

## Purpose

Turn the single shared "tricks catalog" into a per-user library with a discoverable community pool. Currently every trick lives in one global `tricks` table, conflating creator-supplied schema (name/tier/category) with per-user customizations (aliases, tags, graph node position, video override, fav, icon override, and progress). This is incompatible with multi-user sync (user A's rate overwrites user B's) and with the just-shipped add-new-trick feature (user A's custom "Double Nelson" leaks into user B's catalog).

After this ships:
- Tricks page becomes an umbrella with two sub-tabs: **My Tricks** and **Library**.
- Tricks have a clean **canonical / per-user-overlay** split. Canonical = creator-supplied schema. Overlay = each user's personal customizations and progress.
- Users can create private tricks (default) or publish them to the Library.
- Other users can **adopt** Library tricks — adoption is a *reference* (not a copy), so the creator's canonical edits propagate.
- Library is built for scale: server-side search/pagination + virtual list + lazy load on tab activation.

This document is the spec. The implementation plan lives in `docs/superpowers/plans/2026-06-28-trick-library.md` (written after this is approved).

## Scope summary

**In scope:**
- IA: add `My Tricks | Library` sub-tabs to the Tricks page.
- Data model: canonical/overlay split. Dexie v4 → v5 schema migration. Supabase migration. RLS rules. Outbox payload shape update.
- View merge rule: `Trick` objects in the store are computed by merging the canonical row + the current user's overlay row.
- `tricksStore` actions: `create` (with `createdBy` + `visibility`), `publish` / `unpublish` (toggle visibility), `adopt` (insert overlay row), `unadopt` (delete overlay row if no progress).
- Library sub-tab UI: virtual list of public, not-mine, not-already-adopted tricks. Server-side search (debounced 300ms, `ilike` on name) + client-passable filters (tier, category, by-creator). Adoption button per row. Lazy-loaded on tab activation.
- Per-trick "Share with library" toggle in `TrickSheet` (only visible when `createdBy === me`).
- Migration of currently-shipped per-user data (aliases / tags / node positions / video / icon / fav) into the new overlay table for the signed-in user, leaving canonical defaults intact.
- Update of `add-new-trick`'s `tricksStore.create` to set `createdBy` from current auth + default `visibility: 'private'`.

**Out of scope (named so they aren't conflated):**
- Search-by-creator-profile (click creator's name → their library). Deferred — needs more People integration.
- Trick rating / quality (likes, downloads count, popularity sort).
- Reporting / moderation flow.
- New categories/tags taxonomy beyond what exists.
- Forking (clone-as-mine for personal canonical edits — adopters always reference).
- Re-categorization of existing seed tricks into the new model — they keep `createdBy: null` and remain canonical for everyone.
- Multi-creator collaboration on a single trick.

## Decisions

### IA — Tricks page sub-tabs

Tricks page mirrors the Sequences umbrella pattern (shipped Phase 6 polish R2):

- **My Tricks** (default) — practice list. Shows canonical seeded tricks + tricks I created + tricks I've adopted. Existing search/sort/filter chrome from Phase 4b applies here.
- **Library** — browse community contributions. Shows public, not-mine, not-already-adopted tricks. Server-side search + scrollable virtual list + per-row adoption button.

Sub-tab state lives in `useUiStore.tricksSubTab: 'my-tricks' | 'library'` (parallel to existing `sequencesSubTab` pattern). URL: `/tricks` defaults to My Tricks; `/tricks/library` activates Library. Legacy `/tricks?status=...` query param still works on My Tricks (existing single-status deep-link from Home).

FAB ("New trick") stays — on My Tricks only. Hidden when Library sub-tab is active. Creating a trick from My Tricks adds it to your own list as private by default; you can publish later via TrickSheet.

### Data model — canonical + overlay split

Today the `Trick` object combines catalog-side fields (name, tier, category, entry, exit, lr, aliases, tags, video, icon, fav, node_x, node_y) and progress fields (rate, rateL, rateR, last, status). Persistence today: all of it in `db.tricks` for cache, with a parallel-but-stale `user_trick_progress` table for progress only.

Target model:

**Canonical (`tricks` table)** — shared, mutated only by creator:
- `id: string`
- `createdBy: string | null` — `null` = seeded canonical (shipped with app, visible to all). Otherwise = Supabase user id of creator.
- `visibility: 'private' | 'public'` — `'private'` (default new) = visible only to creator + adopters; `'public'` = visible in Library to all signed-in users. Seeded tricks ship with `'public'` so they remain discoverable.
- `name: string`
- `tier: Tier`
- `category: Category`
- `entry: Stance`, `exit: Stance`
- `lr: boolean`
- `defaultAliases: string[]` — creator's suggested aliases (renamed from `aliases` to clarify role).
- `defaultTags: string[]` — creator's suggested tags (renamed from `tags`).
- `defaultIcon: string | null` — creator's suggested icon (renamed from `icon`).
- `defaultVideo: string | null` — creator's suggested video URL (renamed from `video`).
- (Removed from canonical: `mainAlias`, `node_x`, `node_y`, `fav`, `rate`, `rateL`, `rateR`, `last`, `status` — all per-user now.)

**Per-user overlay (`user_trick_progress` extended)** — one row per `(userId, trickId)` ever-touched:
- `userId: string`, `trickId: string` — composite key (unchanged).
- `rate: number | null`, `rateL: number | null`, `rateR: number | null` — progress (unchanged).
- `last: string | null` — ISO date of last practice (unchanged).
- `status: TrickStatus` — derived from rates (unchanged).
- **NEW** `aliases: string[]` — user's personal aliases override (replaces canonical's `defaultAliases` entirely when set; empty array = "use canonical default").
- **NEW** `tags: string[]` — user's personal tags override.
- **NEW** `mainAlias: string | null` — user's promoted alias.
- **NEW** `nodeX: number | null`, `nodeY: number | null` — user's graph node position.
- **NEW** `videoOverride: string | null` — user's preferred video URL (null = use canonical's `defaultVideo`).
- **NEW** `iconOverride: string | null` — user's preferred icon (null = use canonical's `defaultIcon`).
- **NEW** `fav: boolean` — user's favorite flag (canonical has none).

**Adoptions implicit in overlay**: existence of an overlay row = the user has touched this trick, ergo it's in their My Tricks. There is no separate `adoptions` table. First interaction (rate / favorite / customize / explicit "Add" tap) creates the overlay row. For seeded canonical tricks, no overlay is created until first touch — they appear in My Tricks unconditionally because all canonical tricks (`createdBy: null` OR `visibility: 'public'`) are visible.

### View merge rule — what the Vue layer sees as a `Trick`

The `Trick` interface (in `src/domain/types.ts`) keeps roughly the same shape for component consumers, but its values come from a merge function:

```ts
function mergeTrick(canonical: CanonicalTrick, overlay: TrickOverlay | null): Trick {
  return {
    id: canonical.id,
    createdBy: canonical.createdBy,
    visibility: canonical.visibility,
    name: canonical.name,
    tier: canonical.tier,
    category: canonical.category,
    entry: canonical.entry,
    exit: canonical.exit,
    lr: canonical.lr,
    aliases: overlay?.aliases?.length ? overlay.aliases : canonical.defaultAliases,
    tags: overlay?.tags?.length ? overlay.tags : canonical.defaultTags,
    mainAlias: overlay?.mainAlias ?? null,
    icon: overlay?.iconOverride ?? canonical.defaultIcon,
    video: overlay?.videoOverride ?? canonical.defaultVideo,
    node_x: overlay?.nodeX ?? null,
    node_y: overlay?.nodeY ?? null,
    fav: overlay?.fav ?? false,
    rate: overlay?.rate ?? null,
    rateL: overlay?.rateL ?? null,
    rateR: overlay?.rateR ?? null,
    last: overlay?.last ?? null,
    status: overlay?.status ?? 'Not Started',
  }
}
```

Component code keeps consuming a single flat `Trick` object — the merge happens in the store layer. Existing components don't need code changes for the shape change.

### Dexie v4 → v5 schema migration

New file path: `src/storage/dexie.ts` (or wherever Dexie config lives). Bump version:

```ts
this.version(5).stores({
  // existing stores unchanged...
  // tricks store unchanged at the index level; row shape changes via migration
}).upgrade(async tx => {
  const tricksTable = tx.table('tricks')
  const progressTable = tx.table('user_trick_progress')
  const currentUserId = await getCurrentUserIdSync() // best-effort; null if not signed in

  const allTricks = await tricksTable.toArray()
  for (const t of allTricks) {
    // Rename aliases → defaultAliases (and similar) on canonical
    const canonicalPatch: Record<string, unknown> = {
      defaultAliases: t.aliases ?? [],
      defaultTags: t.tags ?? [],
      defaultIcon: t.icon ?? null,
      defaultVideo: t.video ?? null,
      createdBy: null, // existing tricks treated as seeded canonical
      visibility: 'public', // existing tricks remain discoverable
    }
    // Wipe per-user fields from canonical (they move to overlay)
    delete t.aliases
    delete t.tags
    delete t.icon
    delete t.video
    delete t.mainAlias
    delete t.fav
    delete t.node_x
    delete t.node_y
    delete t.rate
    delete t.rateL
    delete t.rateR
    delete t.last
    delete t.status
    await tricksTable.put({ ...t, ...canonicalPatch })

    // For the currently signed-in user only (if any), migrate per-user fields into overlay
    if (!currentUserId) continue
    const overlayKey = [currentUserId, t.id]
    const existingOverlay = (await progressTable.get(overlayKey)) ?? {
      userId: currentUserId,
      trickId: t.id,
    }
    const overlayPatch = {
      ...existingOverlay,
      aliases: t.aliases ?? existingOverlay.aliases ?? [],
      tags: t.tags ?? existingOverlay.tags ?? [],
      mainAlias: t.mainAlias ?? existingOverlay.mainAlias ?? null,
      iconOverride: t.icon ?? existingOverlay.iconOverride ?? null,
      videoOverride: t.video ?? existingOverlay.videoOverride ?? null,
      nodeX: t.node_x ?? existingOverlay.nodeX ?? null,
      nodeY: t.node_y ?? existingOverlay.nodeY ?? null,
      fav: t.fav ?? existingOverlay.fav ?? false,
      // rate/rateL/rateR/last/status already migrate naturally — they were in user_trick_progress
    }
    await progressTable.put(overlayPatch)
  }
})
```

Caveat: `currentUserId` at migration time is best-effort. Anonymous (not-signed-in) users get a migration that wipes canonical per-user fields and creates NO overlay rows — so their previous favorites/customizations are lost. Acceptable because anonymous users were always local-only; no one else relied on their state. Documented in the changelog so anonymous users on dev know to favorite/tag again.

### Supabase migration

Single migration SQL file applied via MCP. Mirrors the Dexie shape:

```sql
-- 1. Add new canonical columns
ALTER TABLE tricks
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public')),
  ADD COLUMN default_aliases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN default_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN default_icon text,
  ADD COLUMN default_video text;

-- 2. Copy existing per-user fields into the new canonical-default columns (preserves seed data shape)
UPDATE tricks SET
  default_aliases = COALESCE(aliases, '{}'::text[]),
  default_tags    = COALESCE(tags, '{}'::text[]),
  default_icon    = icon,
  default_video   = video;

-- 3. Drop the old per-user fields from canonical
ALTER TABLE tricks
  DROP COLUMN aliases,
  DROP COLUMN tags,
  DROP COLUMN icon,
  DROP COLUMN video,
  DROP COLUMN main_alias,
  DROP COLUMN fav,
  DROP COLUMN node_x,
  DROP COLUMN node_y,
  DROP COLUMN rate,
  DROP COLUMN rate_l,
  DROP COLUMN rate_r,
  DROP COLUMN last,
  DROP COLUMN status;

-- 4. Extend user_trick_progress with the new overlay columns
ALTER TABLE user_trick_progress
  ADD COLUMN aliases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN main_alias text,
  ADD COLUMN icon_override text,
  ADD COLUMN video_override text,
  ADD COLUMN node_x double precision,
  ADD COLUMN node_y double precision,
  ADD COLUMN fav boolean NOT NULL DEFAULT false;

-- 5. RLS update on tricks
DROP POLICY IF EXISTS "tricks_select" ON tricks;
CREATE POLICY "tricks_select" ON tricks
  FOR SELECT TO authenticated
  USING (
    created_by IS NULL
    OR created_by = auth.uid()
    OR visibility = 'public'
  );

DROP POLICY IF EXISTS "tricks_insert" ON tricks;
CREATE POLICY "tricks_insert" ON tricks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "tricks_update" ON tricks;
CREATE POLICY "tricks_update" ON tricks
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "tricks_delete" ON tricks;
CREATE POLICY "tricks_delete" ON tricks
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 6. Index for library search performance
CREATE INDEX IF NOT EXISTS tricks_library_idx
  ON tricks (visibility, created_by)
  WHERE visibility = 'public' AND created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS tricks_name_search_idx
  ON tricks USING gin (to_tsvector('english', name));
```

`user_trick_progress` RLS already restricts to `auth.uid()` (per current setup); no change.

### Library sub-tab — UX

#### Top bar
Reuses unified pattern from Phase 6 polish R2. Row 1: search input (placeholder "Search the library…") + sort cycle ("Newest / Popular / Name" — popular = "most adopted" — TBD if popularity ships in v1; for v1 just Newest / Name) + filter button. Row 2: sub-tab strip (My Tricks | Library) — pinned, always visible.

#### Filter sheet
New `LibraryFilterSheet.vue`. Mirrors `TransitionsFilterSheet` shape (drag-to-close, body scroll lock, Glasswork chrome). Sections:
- **Tier** chips (multi-select, 1–6)
- **Category** chips (multi-select, all 9 categories)
- (Future: by-creator filter — deferred)

Filter state in `useUiStore`: `libraryTiers: Tier[]`, `libraryCategories: Category[]`.

#### Content
Virtual list (`vue-virtual-scroller`, new dep). Each row is a `LibraryTrickCard` (new component, simpler than `TrickCard` — no progress, no rating; just name, tier, category, creator nickname or "by anonymous", aliases preview, **Adopt** button).

Pagination: cursor-based via Supabase range queries (`from(N).to(N+PAGE_SIZE)`). PAGE_SIZE = 50. Loads next page when virtual scroller approaches end.

Initial load: first 50 most-recent public not-mine not-adopted tricks. Triggers on Library sub-tab activation (NOT on Tricks page mount — saves bandwidth for users who never visit the library).

Search input: debounced 300ms. On change: reset cursor to 0, refetch first page with search filter. Search is server-side via Supabase `ilike` (could upgrade to full-text via the `tricks_name_search_idx` index later if `ilike` is too slow).

Empty states:
- No tricks in library yet (whole library empty): "No public tricks yet — be the first to share one. Tap **New trick** on the My Tricks tab, then publish."
- No matches for search/filters: "No matches — try clearing filters."
- Library queries failing (offline / not signed in): "Sign in to browse the library." (Anonymous users see a sign-in CTA; otherwise show the error toast.)

#### Adoption button
Per-row `<button>` labeled "Add" (with `IconPlus`). Tap → `tricksStore.adopt(trickId)` → creates an empty overlay row for `(userId, trickId)`. The row in the library list updates to show "Adopted ✓" (visually muted), or optionally the row hides (slide out animation, removes from list — most polished).

Adoption is silent — no toast, no extra dialog. The trick appears in My Tricks next time the user switches tabs. Could later add a quick swipe-to-the-tab confirmation animation.

### My Tricks sub-tab — adoption visibility

`tricksStore.filteredAndSorted({ search, sort, ... })` (existing function) operates on the union of:
- Canonical seeded tricks (`createdBy: null`)
- Tricks I created (`createdBy: currentUserId`)
- Tricks I've adopted (any other `tricks` row where I have an overlay row)

Anonymous users see canonical seeded only.

### Per-trick "Share with library" toggle in TrickSheet

Visible only on tricks where `createdBy === currentUserId` (your own tricks). Section in `TrickSheet`:

```html
<section class="mt-4">
  <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Library</h3>
  <label class="flex items-center justify-between">
    <span class="text-sm">Share with library</span>
    <!-- toggle switch matching TrickCreationSheet's LR toggle pattern -->
  </label>
</section>
```

Toggle on → `tricksStore.publish(id)` → sets `visibility: 'public'` on canonical row. Toggle off → `tricksStore.unpublish(id)` → sets `'private'`. Other users' existing adoptions are preserved (they keep their overlay rows + reference the now-private canonical); but the trick stops appearing in others' Library browse.

Tricks where `createdBy === null` (seeded) don't show this toggle (always public).

Tricks where `createdBy !== currentUserId && createdBy !== null` (someone else's that I adopted) don't show this toggle (read-only; only canonical creator can publish/unpublish).

### Anonymous behavior

Pre-auth users (not signed into Supabase):
- See seeded canonical tricks (all `public` after migration).
- Can create new tricks locally — `createdBy: null` (no auth id available). These behave as additional "canonical" tricks in the local Dexie. NOT uploaded to Supabase (outbox push requires auth).
- Cannot see Library sub-tab content — show sign-in CTA.
- Cannot publish (no `createdBy: me` to attach).

On sign-in:
- Pull any server-side tricks they own (likely none, fresh account).
- The migration already created overlay rows from any local customizations (favs, custom aliases, etc.).
- Their previously-created local tricks (`createdBy: null`) stay canonical-local. **Open question**: do we offer a one-shot "claim" flow on first sign-in to assign all `createdBy: null` user-created tricks to their new auth uid? Deferred — out of scope; defaults to no claiming.

### `tricksStore` action signatures

Existing `create` updates:
```ts
async create(input: {
  name: string
  tier: Tier
  category: Category
  lr: boolean
  icon?: string | null
  firstAlias?: string | null
}): Promise<string> {
  // ... existing body unchanged in shape ...
  // New: set createdBy from current auth, visibility default 'private'
  const userId = await getCurrentUserId() // null if anonymous
  const canonical: CanonicalTrick = {
    name: input.name.trim(),
    tier: input.tier,
    category: input.category,
    entry: '2/f',
    exit: '2/f',
    lr: input.lr,
    createdBy: userId,
    visibility: 'private',
    defaultAliases: input.firstAlias?.trim() ? [input.firstAlias.trim()] : [],
    defaultTags: [],
    defaultIcon: input.icon?.trim() || null,
    defaultVideo: null,
  }
  const id = await upsertCanonicalTrick(canonical)
  // ... merge + insert into local list ...
  return id
}
```

New actions:
- `async publish(id: string): Promise<void>` — sets visibility 'public' on canonical (creator only).
- `async unpublish(id: string): Promise<void>` — sets visibility 'private'.
- `async adopt(id: string): Promise<void>` — creates an empty overlay row for current user (no-op if already adopted).
- `async unadopt(id: string): Promise<void>` — deletes overlay row (no-op if user has any non-trivial overlay data — fav, rate, etc. — to prevent accidental data loss; only deletes if overlay is "empty"). Edge case: unadopting a trick the user actively rated should be blocked or warn.

(Existing `updateAliases`, `updateTags`, `toggleFav`, `setMainAlias`, `updateVideo`, `updateEmoji` all change from "patch canonical" to "patch overlay" — they were always per-user-intent, just stored in the wrong table.)

### Components touched

**New:**
- `src/components/LibraryList.vue` — virtual list of `LibraryTrickCard` items with infinite scroll + search debounce.
- `src/components/LibraryTrickCard.vue` — simpler than TrickCard (no progress); shows name + tier badge + category + creator nickname + Adopt button.
- `src/components/LibraryFilterSheet.vue` — Tier + Category multi-select chip filter.

**Modified:**
- `src/pages/Tricks.vue` — full rewrite to umbrella+sub-tabs (mirrors `Sequences.vue` shape). Unified sticky top bar with sub-tab strip. Render `LibraryList` when `libraryTab` active; hide FAB on Library tab.
- `src/stores/tricks.ts` — split into canonical + overlay queries; new `publish` / `unpublish` / `adopt` / `unadopt` actions; rewrite of patch actions (`updateAliases`/`updateTags`/`toggleFav`/etc.) to write overlay; new `loadLibraryPage(opts)` action for paginated server query.
- `src/stores/ui.ts` — add `tricksSubTab: 'my-tricks' | 'library'`, `librarySearch`, `librarySort`, `libraryTiers[]`, `libraryCategories[]`, setters.
- `src/router.ts` — `/tricks/library` route (same component as `/tricks` with meta.subTab = 'library'). `/tricks?status=...` legacy query still works on My Tricks default.
- `src/storage/dexie.ts` (or wherever) — Dexie v5 with the migration.
- `src/storage/repo.ts` — `upsertTrick` split into `upsertCanonicalTrick` (catalog) + `upsertTrickOverlay` (per-user); helper `mergeTrick(canonical, overlay)`; `getAllTricksMerged(userId)` returns merged view for `My Tricks`.
- `src/storage/sync.ts` — push/pull tracks the new column shape; pull strategy for Library page = on-demand (not part of startup sync).
- `src/components/TrickSheet.vue` — add "Library" section with "Share with library" toggle visible only when `createdBy === me`.
- `src/components/TrickCreationSheet.vue` — pass `createdBy` from auth in the payload sent to `tricksStore.create` (no UI change here; the action handles it).
- `src/domain/types.ts` — update `Trick` interface to reflect merged shape (add `createdBy`, `visibility` fields). Add `CanonicalTrick` and `TrickOverlay` interfaces for storage layer.
- Supabase: migration via MCP (one SQL file).

### Outbox / sync impact

Outbox payload shape changes for the `tricks` table: old field names (`aliases`, `tags`, etc.) → new field names (`default_aliases`, `default_tags`, etc.) on canonical; `user_trick_progress` gains new fields.

Migration backwards-compatibility window: nothing — we ship v5 schema, migrate Dexie + Supabase, and update outbox payloads in one coordinated ship. Users running an old version after the migration get the new schema on next app reload (Dexie auto-runs the upgrade). Any in-flight outbox entries from the old shape get migrated by the storage layer's mapping function (or dropped if irreconcilable — log a warning).

### Scale notes

- **My Tricks** list: bounded by canonical seed + own + adopted. Realistically < 500 in v1. Existing in-memory filter+sort holds.
- **Library** list: theoretically unbounded as user base grows. Server-side query with cursor pagination + virtual list. PAGE_SIZE = 50. Search via server-side `ilike`; debounce 300ms. Filter (tier/category) applied server-side via `.in()` clauses.
- **Virtual scroller** library: `vue-virtual-scroller` (well-maintained, ~10KB gzip, MIT). Compatible with our Vue 3 + Vite setup. Adds one runtime dep.
- **Lazy load**: Library content only fetches when Library sub-tab is activated. Switching away cancels pending requests; switching back resumes from cursor.

## Risks and open questions

- **Migration data loss for anonymous users**: anonymous users on dev had favs/aliases/tags stored in `db.tricks` (no `user_trick_progress` row because no auth). Migration wipes these from canonical without a destination. They'll need to re-set after sign-in. Document in changelog + show one-time banner on first post-migration load? Deferred — anonymous flow is rough anyway; banner not v1.
- **In-flight outbox entries with old shape**: when migration runs, outbox may contain entries with `{ aliases: [...] }`. Map function in `sync.ts` needs to translate old shape → new shape (move per-user fields into `user_trick_progress` payload + drop them from `tricks` payload). Implementation detail in the plan.
- **`unadopt` accidental data loss**: if user unadopts a trick they spent hours practicing, they lose their progress. v1 behavior: confirm or block unadopt if any overlay field is non-default. Could add explicit "Remove from my tricks" button in TrickSheet that warns "You'll lose your progress on this trick. Continue?".
- **Adoption row growth**: every interaction creates an overlay row. For canonical seed tricks, this means a ~500-row per-user overlay table per user. Acceptable scale; modest server-side storage.
- **Search performance**: `ilike '%name%'` on the tricks table is O(N). With a few thousand tricks, fine. With millions, switch to the full-text GIN index already provisioned by the migration. Migration ships the index; queries upgrade to `to_tsvector` matching as a follow-up if needed.
- **OAuth bug on dev** (separate issue, surfaced during this brainstorm): the user can't sign in via Google on dev. Treat as a separate small spec to be done before Library can be device-tested in dev. Documented in this risks section; no fix included here.

## Acceptance criteria

- /tricks defaults to My Tricks sub-tab; /tricks/library opens Library sub-tab.
- My Tricks shows: canonical seeded + own-created + adopted tricks. Existing search/sort/filter chrome works.
- Library shows: public, not-mine, not-already-adopted tricks via server-side pagination + virtual scroll + debounced search.
- FAB ("New trick") visible on My Tricks; hidden on Library.
- New tricks created via FAB default to `visibility: 'private'` + `createdBy: currentUserId | null`.
- TrickSheet shows "Share with library" toggle only when the trick's `createdBy` matches current user. Toggle publishes/unpublishes.
- Adopting a library trick adds it to My Tricks; the row updates in the Library list to show adopted state.
- Dexie schema bumped to v5. Migration runs cleanly on existing databases.
- Supabase migration applied; RLS rules updated; index created.
- `mergeTrick(canonical, overlay)` is unit-tested with at least 8 cases (canonical-only, overlay-fully-overrides, overlay-partial, etc.).
- `tricksStore.publish` / `unpublish` / `adopt` / `unadopt` unit-tested.
- `tricksStore.create` updated to set `createdBy` + `visibility: 'private'`; existing 6 tests adjusted for the new defaults; new tests added for createdBy population (3 new tests covering: anonymous → null, signed-in → user id, visibility default).
- `vue-virtual-scroller` added as dep.
- 150 baseline + ~15 new tests = ~165 tests pass.
- Build clean.
- Manual smoke test plan in plan doc.
