# Trick Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split tricks into canonical (creator-supplied, shared) + per-user overlay (aliases / tags / node_pos / video / icon / fav / progress — all per-user). Add `My Tricks | Library` sub-tabs to the Tricks page. Ship adoption flow and per-user data isolation in one coordinated migration.

**Architecture:** `Trick` (the in-memory shape consumed by Vue components) is computed by merging the canonical `tricks` row with the user's `user_trick_progress` overlay row. Adoption = overlay row existence. Canonical creator owns visibility/publish toggle; adopters can't mutate canonical. Library uses server-side pagination + virtual scroll + debounced search.

**Tech Stack:** Vue 3 + Pinia + Dexie (IndexedDB) + Supabase + Vitest + `vue-virtual-scroller` (NEW dep). Same Phase 5 motion tokens, Phase 6 polish R2 sheet pattern.

**Spec:** `spec/2026-06-28-trick-library-design.md`

**Coordinated-ship note:** The Supabase migration drops old columns. There is a ~30-second window between applying the migration and deploying the new code where live is broken (old code reads dropped columns, or new code reads from a not-yet-migrated DB). Apply the migration immediately before pushing the cutover commit. Acceptable for a personal-app deployment.

---

## Task 0: Pre-flight

**Files:** none modified.

- [ ] **Step 1: Verify baseline**

```bash
npm test
npm run build
```
Expected: 156/156 pass, build clean.

- [ ] **Step 2: Confirm spec committed**

```bash
git log -1 --oneline -- spec/2026-06-28-trick-library-design.md
```
Expected: commit `3f28d57`.

- [ ] **Step 3: Install vue-virtual-scroller**

```bash
npm install vue-virtual-scroller@2.0.0-beta.8
```

(v2 beta is the Vue 3 line; check current latest.)

- [ ] **Step 4: Commit dep**

```bash
git add package.json package-lock.json
git commit -m "Trick Library: add vue-virtual-scroller dep

For the Library sub-tab's infinite-scroll list. ~10KB gzip, MIT.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 1: Domain types — `CanonicalTrick`, `TrickOverlay`, `mergeTrick`

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/domain/mergeTrick.ts`
- Create: `src/domain/__tests__/mergeTrick.test.ts`

- [ ] **Step 1: Add new types to `src/domain/types.ts`**

After the existing `Trick` interface, add:

```ts
export type Visibility = 'private' | 'public'

export interface CanonicalTrick {
  id?: string
  createdBy: string | null  // null = seeded canonical
  visibility: Visibility    // 'public' for seeded; default 'private' for new
  name: string
  tier: Tier
  category: Category
  entry: Stance
  exit: Stance
  lr: boolean
  defaultAliases: string[]  // creator's suggested aliases
  defaultTags: string[]     // creator's suggested tags
  defaultIcon: string | null  // creator's suggested icon
  defaultVideo: string | null // creator's suggested video URL
}

export interface TrickOverlay {
  userId: string
  trickId: string
  rate: number | null
  rateL: number | null
  rateR: number | null
  last: string | null
  status: TrickStatus
  aliases: string[]       // overrides defaults when non-empty
  tags: string[]
  mainAlias: string | null
  iconOverride: string | null
  videoOverride: string | null
  nodeX: number | null
  nodeY: number | null
  fav: boolean
}
```

Update the existing `Trick` interface to add the two new fields exposed via merge:

```ts
export interface Trick {
  id?: string
  createdBy: string | null    // NEW — from canonical
  visibility: Visibility      // NEW — from canonical
  name: string
  tier: Tier
  category: Category
  entry: Stance
  exit: Stance
  lr: boolean
  rate: number | null
  rateL: number | null
  rateR: number | null
  last: string | null
  status: TrickStatus
  aliases: string[]
  mainAlias?: string | null
  video: string | null
  icon: string | null
  tags: string[]
  fav: boolean
  node_x?: number | null
  node_y?: number | null
}
```

- [ ] **Step 2: Create the merge utility + failing tests first**

Create `src/domain/__tests__/mergeTrick.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mergeTrick } from '../mergeTrick'
import type { CanonicalTrick, TrickOverlay } from '../types'

const canonical = (overrides: Partial<CanonicalTrick> = {}): CanonicalTrick => ({
  id: 'trick-1',
  createdBy: null,
  visibility: 'public',
  name: 'Cross',
  tier: 2,
  category: 'cross',
  entry: '2/f',
  exit: '2/f',
  lr: true,
  defaultAliases: ['x-step'],
  defaultTags: ['fundamental'],
  defaultIcon: '🔀',
  defaultVideo: 'https://example/video',
  ...overrides,
})

const overlay = (overrides: Partial<TrickOverlay> = {}): TrickOverlay => ({
  userId: 'u1',
  trickId: 'trick-1',
  rate: null,
  rateL: null,
  rateR: null,
  last: null,
  status: 'Not Started',
  aliases: [],
  tags: [],
  mainAlias: null,
  iconOverride: null,
  videoOverride: null,
  nodeX: null,
  nodeY: null,
  fav: false,
  ...overrides,
})

describe('mergeTrick', () => {
  it('returns canonical defaults when overlay is null', () => {
    const m = mergeTrick(canonical(), null)
    expect(m.name).toBe('Cross')
    expect(m.aliases).toEqual(['x-step'])
    expect(m.tags).toEqual(['fundamental'])
    expect(m.icon).toBe('🔀')
    expect(m.video).toBe('https://example/video')
    expect(m.fav).toBe(false)
    expect(m.rate).toBeNull()
    expect(m.status).toBe('Not Started')
  })

  it('returns canonical defaults when overlay has empty arrays / null overrides', () => {
    const m = mergeTrick(canonical(), overlay())
    expect(m.aliases).toEqual(['x-step'])  // overlay empty → canonical
    expect(m.tags).toEqual(['fundamental'])
    expect(m.icon).toBe('🔀')
    expect(m.video).toBe('https://example/video')
  })

  it('overlay aliases (non-empty) override canonical defaultAliases', () => {
    const m = mergeTrick(canonical(), overlay({ aliases: ['my-x'] }))
    expect(m.aliases).toEqual(['my-x'])
  })

  it('overlay tags (non-empty) override canonical defaultTags', () => {
    const m = mergeTrick(canonical(), overlay({ tags: ['my-tag'] }))
    expect(m.tags).toEqual(['my-tag'])
  })

  it('overlay icon/video override canonical defaults', () => {
    const m = mergeTrick(canonical(), overlay({ iconOverride: '⭐', videoOverride: 'https://my' }))
    expect(m.icon).toBe('⭐')
    expect(m.video).toBe('https://my')
  })

  it('progress fields come from overlay only', () => {
    const m = mergeTrick(canonical(), overlay({ rate: 3.5, rateL: 4, rateR: 3, last: '2026-06-28', status: 'In Progress' }))
    expect(m.rate).toBe(3.5)
    expect(m.rateL).toBe(4)
    expect(m.rateR).toBe(3)
    expect(m.last).toBe('2026-06-28')
    expect(m.status).toBe('In Progress')
  })

  it('fav, mainAlias, node_x/y are per-user (overlay only)', () => {
    const m = mergeTrick(canonical(), overlay({ fav: true, mainAlias: 'x-step', nodeX: 100, nodeY: 50 }))
    expect(m.fav).toBe(true)
    expect(m.mainAlias).toBe('x-step')
    expect(m.node_x).toBe(100)
    expect(m.node_y).toBe(50)
  })

  it('preserves canonical createdBy + visibility in merged shape', () => {
    const m = mergeTrick(canonical({ createdBy: 'user-abc', visibility: 'private' }), null)
    expect(m.createdBy).toBe('user-abc')
    expect(m.visibility).toBe('private')
  })
})
```

Run: `npx vitest run src/domain/__tests__/mergeTrick.test.ts`
Expected: all fail (module not found).

- [ ] **Step 3: Create `src/domain/mergeTrick.ts`**

```ts
import type { CanonicalTrick, Trick, TrickOverlay } from './types'

/**
 * Merge a canonical trick (catalog row) with an optional per-user overlay row
 * into the single `Trick` shape consumed by Vue components.
 *
 * Rules:
 * - Canonical fields (name, tier, category, entry, exit, lr, createdBy, visibility)
 *   always come from canonical.
 * - aliases/tags: overlay value wins if non-empty array; otherwise canonical defaults.
 * - icon/video: overlay value wins if non-null; otherwise canonical defaults.
 * - mainAlias, fav, node_x/y, rate/rateL/rateR/last/status: overlay-only (no
 *   canonical fallback — these are pure per-user fields).
 */
export function mergeTrick(canonical: CanonicalTrick, overlay: TrickOverlay | null): Trick {
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
    aliases: overlay && overlay.aliases.length > 0 ? overlay.aliases : canonical.defaultAliases,
    tags: overlay && overlay.tags.length > 0 ? overlay.tags : canonical.defaultTags,
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

- [ ] **Step 4: Run tests + type-check**

```bash
npx vitest run src/domain/__tests__/mergeTrick.test.ts
npm test
npx vue-tsc -b --noEmit
```
Expected: 8/8 new tests pass, full suite passes (will report breakages elsewhere because of `Trick` shape changes — fine, those come in later tasks).

If full suite breaks because of `Trick.createdBy` / `Trick.visibility` being required in seed/storage code: skip — those fix in T2 + T3.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/mergeTrick.ts src/domain/__tests__/mergeTrick.test.ts
git commit -m "Trick Library T1: domain types + mergeTrick utility

Adds CanonicalTrick (catalog row) + TrickOverlay (per-user row)
interfaces. Updates Trick (the merged view consumed by components)
to expose createdBy + visibility from canonical. Adds mergeTrick(canonical,
overlay) with 8 unit tests covering: canonical-only, overlay-empty-arrays
fall through, overlay overrides, progress-from-overlay, per-user-only
fields, createdBy/visibility preservation.

Test suite will report breakage in storage/seed code (Trick now requires
createdBy + visibility); fixes land in subsequent tasks (T2, T3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Supabase migration

**Files:**
- Apply: SQL migration via Supabase MCP (or `supabase migrations new` if CLI available).

This task is **out-of-band** — it changes the production Supabase schema. Do this immediately before T15 (the cutover commit) to minimize the broken-window. Documented here for ordering; the actual application happens at the end of the plan.

**Migration SQL** (apply via Supabase MCP `apply_migration`):

```sql
-- Trick Library migration: canonical + per-user-overlay split.

-- 1. Add new canonical columns
ALTER TABLE tricks
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public')),
  ADD COLUMN default_aliases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN default_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN default_icon text,
  ADD COLUMN default_video text;

-- 2. Copy existing canonical fields into the new default_* columns (preserves seed schema)
UPDATE tricks SET
  default_aliases = COALESCE(aliases, '{}'::text[]),
  default_tags    = COALESCE(tags, '{}'::text[]),
  default_icon    = icon,
  default_video   = video;

-- 3. Drop old per-user fields from canonical
ALTER TABLE tricks
  DROP COLUMN IF EXISTS aliases,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS icon,
  DROP COLUMN IF EXISTS video,
  DROP COLUMN IF EXISTS main_alias,
  DROP COLUMN IF EXISTS fav,
  DROP COLUMN IF EXISTS node_x,
  DROP COLUMN IF EXISTS node_y,
  DROP COLUMN IF EXISTS rate,
  DROP COLUMN IF EXISTS rate_l,
  DROP COLUMN IF EXISTS rate_r,
  DROP COLUMN IF EXISTS last,
  DROP COLUMN IF EXISTS status;

-- 4. Extend user_trick_progress with new overlay columns
ALTER TABLE user_trick_progress
  ADD COLUMN aliases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN main_alias text,
  ADD COLUMN icon_override text,
  ADD COLUMN video_override text,
  ADD COLUMN node_x double precision,
  ADD COLUMN node_y double precision,
  ADD COLUMN fav boolean NOT NULL DEFAULT false;

-- 5. RLS on tricks
DROP POLICY IF EXISTS tricks_select ON tricks;
CREATE POLICY tricks_select ON tricks FOR SELECT TO authenticated
  USING (
    created_by IS NULL
    OR created_by = auth.uid()
    OR visibility = 'public'
  );

DROP POLICY IF EXISTS tricks_insert ON tricks;
CREATE POLICY tricks_insert ON tricks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS tricks_update ON tricks;
CREATE POLICY tricks_update ON tricks FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS tricks_delete ON tricks;
CREATE POLICY tricks_delete ON tricks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 6. Indexes for library performance
CREATE INDEX IF NOT EXISTS tricks_library_idx
  ON tricks (visibility, created_by)
  WHERE visibility = 'public' AND created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS tricks_name_search_idx
  ON tricks USING gin (to_tsvector('english', name));
```

- [ ] **Step 1: Hold this task** until T14 completes; apply at T15 cutover. No code change here. This step is a marker.

---

## Task 3: Dexie v5 schema + migration upgrade

**Files:**
- Modify: `src/storage/dexie.ts` (or wherever Dexie config lives; search if unsure)

- [ ] **Step 1: Locate the Dexie config**

```bash
grep -l "this.version" /Users/kzubenko/Projects/slalom-app/src/storage/*.ts
```

Expected: one or two files. Read the highest-numbered `version()` call to know the current schema.

- [ ] **Step 2: Add the v5 upgrade**

In the file containing `this.version(4)`, add v5:

```ts
this.version(5).stores({
  // index keys unchanged from v4 — only column shape changes
}).upgrade(async tx => {
  const tricksTable = tx.table('tricks')
  const progressTable = tx.table('user_trick_progress')

  // Best-effort: get current user id from local auth state. If not present, anonymous.
  let currentUserId: string | null = null
  try {
    const authRaw = localStorage.getItem('slalom.sb.auth')
    if (authRaw) {
      const auth = JSON.parse(authRaw)
      currentUserId = auth?.user?.id ?? auth?.session?.user?.id ?? null
    }
  } catch { /* ignore */ }

  const allTricks = await tricksTable.toArray()
  for (const t of allTricks) {
    const canonical = {
      id: t.id,
      name: t.name,
      tier: t.tier,
      category: t.category,
      entry: t.entry,
      exit: t.exit,
      lr: t.lr,
      createdBy: null,            // existing tricks treated as seeded canonical
      visibility: 'public' as const,  // existing tricks remain discoverable
      defaultAliases: t.aliases ?? [],
      defaultTags: t.tags ?? [],
      defaultIcon: t.icon ?? null,
      defaultVideo: t.video ?? null,
    }
    await tricksTable.put(canonical)

    if (!currentUserId) continue

    const overlayKey: [string, string] = [currentUserId, t.id]
    const existing = (await progressTable.get(overlayKey)) ?? {
      userId: currentUserId,
      trickId: t.id,
      rate: null,
      rateL: null,
      rateR: null,
      last: null,
      status: 'Not Started',
    }
    const overlay = {
      ...existing,
      aliases: (existing.aliases?.length ? existing.aliases : t.aliases) ?? [],
      tags: (existing.tags?.length ? existing.tags : t.tags) ?? [],
      mainAlias: existing.mainAlias ?? t.mainAlias ?? null,
      iconOverride: existing.iconOverride ?? t.icon ?? null,
      videoOverride: existing.videoOverride ?? t.video ?? null,
      nodeX: existing.nodeX ?? t.node_x ?? null,
      nodeY: existing.nodeY ?? t.node_y ?? null,
      fav: existing.fav ?? t.fav ?? false,
    }
    await progressTable.put(overlay)
  }
})
```

- [ ] **Step 3: Verify the existing seed loader doesn't break under v5**

Open `src/storage/seed.ts`. The seed loads `seed-data.json` and writes rows into `db.tricks`. The seed file currently has the old shape (`aliases`, `tags`, `icon`, `video` on each trick). After v5, those fields are removed from canonical. Either:

(a) Update the seed loader to map old → new shape on insert.
(b) Update `seed-data.json` itself to the new shape.

Pick (a) — keeps the seed file as the existing community-facing shape. In `seed.ts`:

```ts
// In the loop that builds the canonical trick from a seed row:
const canonical = {
  ...trickFromSeed,
  createdBy: null,
  visibility: 'public' as const,
  defaultAliases: trickFromSeed.aliases ?? [],
  defaultTags: trickFromSeed.tags ?? [],
  defaultIcon: trickFromSeed.icon ?? null,
  defaultVideo: trickFromSeed.video ?? null,
}
// strip old fields before put
delete canonical.aliases
delete canonical.tags
delete canonical.icon
delete canonical.video
delete canonical.mainAlias
delete canonical.fav
delete canonical.node_x
delete canonical.node_y
delete canonical.rate
delete canonical.rateL
delete canonical.rateR
delete canonical.last
delete canonical.status
await db.tricks.add(canonical)
```

(Exact edit depends on existing seed code; read the file first.)

- [ ] **Step 4: Type-check + tests**

```bash
npx vue-tsc -b --noEmit && npm test
```
Expected: many existing tests in `tricks.test.ts` will still fail because the store hasn't been rewritten yet (T4 / T5). Type-check should be clean for the Dexie + seed changes themselves.

- [ ] **Step 5: Commit**

```bash
git add src/storage/dexie.ts src/storage/seed.ts
git commit -m "Trick Library T3: Dexie v5 + seed loader migration

Bumps Dexie to v5. Upgrade callback rewrites every existing canonical
row to the new shape (defaults moved from aliases/tags/icon/video into
default_*, createdBy=null, visibility=public) and, for the currently
signed-in user only (best-effort from localStorage), migrates the
per-user fields into the user_trick_progress overlay table.

Seed loader updated to write canonical rows in the new shape, stripping
old per-user fields from seed data on insert (seed-data.json itself
retains its old shape for back-compat with anyone reading the file
directly).

Anonymous users lose previously-set favs/aliases/tags during migration
(no overlay row destination). Documented in spec risks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Storage layer split — `upsertCanonicalTrick`, `upsertTrickOverlay`, `getAllTricksMerged`, `loadLibraryPage`

**Files:**
- Modify: `src/storage/repo.ts`

- [ ] **Step 1: Replace `upsertTrick` + `getAllTricks`**

Read `src/storage/repo.ts` to find `upsertTrick` (around line 52) and `getAllTricks` (around line 40). Replace them with:

```ts
import type { CanonicalTrick, TrickOverlay, Trick } from '../domain/types'
import { mergeTrick } from '../domain/mergeTrick'

export async function upsertCanonicalTrick(t: CanonicalTrick): Promise<string> {
  if (!t.id) t.id = newId()
  const plain = toPlain(t)
  await db.tricks.put(plain)
  await enq('upsert', 'tricks', plain as unknown as Record<string, unknown>)
  return t.id
}

export async function upsertTrickOverlay(o: TrickOverlay): Promise<void> {
  const plain = toPlain(o)
  await db.user_trick_progress.put(plain)
  await enq('upsert', 'user_trick_progress', plain as unknown as Record<string, unknown>)
}

export async function getAllTricksMerged(userId: string | null): Promise<Trick[]> {
  const canonicals = await db.tricks.toArray() as CanonicalTrick[]
  if (!userId) {
    return canonicals.map(c => mergeTrick(c, null))
  }
  const overlays = await db.user_trick_progress.where('userId').equals(userId).toArray() as TrickOverlay[]
  const overlayByTrickId = new Map(overlays.map(o => [o.trickId, o]))
  return canonicals.map(c => mergeTrick(c, overlayByTrickId.get(c.id!) ?? null))
}

export async function getTrickMerged(id: string, userId: string | null): Promise<Trick | undefined> {
  const c = await db.tricks.get(id) as CanonicalTrick | undefined
  if (!c) return undefined
  if (!userId) return mergeTrick(c, null)
  const o = await db.user_trick_progress.get([userId, id]) as TrickOverlay | undefined
  return mergeTrick(c, o ?? null)
}

export async function getCanonicalTrick(id: string): Promise<CanonicalTrick | undefined> {
  return await db.tricks.get(id) as CanonicalTrick | undefined
}

export async function getTrickOverlay(userId: string, trickId: string): Promise<TrickOverlay | null> {
  const row = await db.user_trick_progress.get([userId, trickId]) as TrickOverlay | undefined
  return row ?? null
}

export async function deleteTrickOverlay(userId: string, trickId: string): Promise<void> {
  await db.user_trick_progress.delete([userId, trickId])
  await enq('delete', 'user_trick_progress', { userId, trickId } as Record<string, unknown>)
}
```

Remove the old `getAllTricks` and `getTrick` exports (or keep them as deprecated wrappers if other code depends on them — check via grep). The old `upsertTrick(t: Trick)` signature goes away entirely; all callers must migrate to `upsertCanonicalTrick` (canonical fields only) + `upsertTrickOverlay` (per-user fields) as appropriate.

- [ ] **Step 2: Add `loadLibraryPage` server-query helper**

Append to `src/storage/repo.ts`:

```ts
import { getSb } from './supabase'
import { mapTrickFromServer } from './fieldMap'

export interface LibraryPageOpts {
  search: string
  tiers: number[]
  categories: string[]
  cursor: number  // offset
  pageSize: number
}

export interface LibraryPageResult {
  items: CanonicalTrick[]
  hasMore: boolean
}

/** Fetch public, not-mine, not-already-adopted tricks via Supabase. Server-side. */
export async function loadLibraryPage(opts: LibraryPageOpts, currentUserId: string | null): Promise<LibraryPageResult> {
  const sb = await getSb()
  if (!sb) throw new Error('Supabase not available')
  let q = sb.from('tricks')
    .select('*')
    .eq('visibility', 'public')
    .not('created_by', 'is', null)
  if (currentUserId) q = q.neq('created_by', currentUserId)
  if (opts.search.trim()) q = q.ilike('name', `%${opts.search.trim()}%`)
  if (opts.tiers.length) q = q.in('tier', opts.tiers)
  if (opts.categories.length) q = q.in('category', opts.categories)
  q = q.order('created_at', { ascending: false })
       .range(opts.cursor, opts.cursor + opts.pageSize)
  const { data, error } = await q
  if (error) throw error
  const items = (data ?? []).slice(0, opts.pageSize).map(mapTrickFromServer) as CanonicalTrick[]
  const hasMore = (data ?? []).length > opts.pageSize
  // also filter out already-adopted (overlay exists)
  if (currentUserId && items.length > 0) {
    const ids = items.map(c => c.id!).filter(Boolean)
    const overlays = await db.user_trick_progress
      .where(['userId', 'trickId']).anyOf(ids.map(i => [currentUserId, i]))
      .toArray() as TrickOverlay[]
    const adoptedIds = new Set(overlays.map(o => o.trickId))
    return { items: items.filter(c => !adoptedIds.has(c.id!)), hasMore }
  }
  return { items, hasMore }
}
```

Note: `mapTrickFromServer` exists in `src/storage/fieldMap.ts`. May need to update it to the new shape (`default_*` columns instead of `aliases`/`tags`/etc.). Inspect + adjust.

- [ ] **Step 3: Update `fieldMap.ts`**

Find existing `mapTrickToServer` and `mapTrickFromServer`. Update them to map the new schema:

```ts
// to server
export function mapCanonicalTrickToServer(t: CanonicalTrick): Record<string, unknown> {
  return {
    id: t.id,
    created_by: t.createdBy,
    visibility: t.visibility,
    name: t.name,
    tier: t.tier,
    category: t.category,
    entry: t.entry,
    exit: t.exit,
    lr: t.lr,
    default_aliases: t.defaultAliases,
    default_tags: t.defaultTags,
    default_icon: t.defaultIcon,
    default_video: t.defaultVideo,
  }
}

// from server
export function mapCanonicalTrickFromServer(r: TrickRow): CanonicalTrick {
  return {
    id: r.id,
    createdBy: r.created_by,
    visibility: r.visibility,
    name: r.name,
    tier: r.tier,
    category: r.category,
    entry: r.entry,
    exit: r.exit,
    lr: r.lr,
    defaultAliases: r.default_aliases ?? [],
    defaultTags: r.default_tags ?? [],
    defaultIcon: r.default_icon ?? null,
    defaultVideo: r.default_video ?? null,
  }
}

// Overlay (user_trick_progress)
export function mapTrickOverlayToServer(o: TrickOverlay): Record<string, unknown> {
  return {
    user_id: o.userId,
    trick_id: o.trickId,
    rate: o.rate,
    rate_l: o.rateL,
    rate_r: o.rateR,
    last: o.last,
    status: o.status,
    aliases: o.aliases,
    tags: o.tags,
    main_alias: o.mainAlias,
    icon_override: o.iconOverride,
    video_override: o.videoOverride,
    node_x: o.nodeX,
    node_y: o.nodeY,
    fav: o.fav,
  }
}

export function mapTrickOverlayFromServer(r: UserTrickProgressRow): TrickOverlay {
  return {
    userId: r.user_id,
    trickId: r.trick_id,
    rate: r.rate,
    rateL: r.rate_l,
    rateR: r.rate_r,
    last: r.last,
    status: r.status,
    aliases: r.aliases ?? [],
    tags: r.tags ?? [],
    mainAlias: r.main_alias,
    iconOverride: r.icon_override,
    videoOverride: r.video_override,
    nodeX: r.node_x,
    nodeY: r.node_y,
    fav: r.fav ?? false,
  }
}
```

Update existing exports (rename `mapTrickToServer` → `mapCanonicalTrickToServer`, etc.) and adjust all callers (`sync.ts`).

- [ ] **Step 4: Type-check**

```bash
npx vue-tsc -b --noEmit
```
Expected: errors in any callers of removed/renamed functions. Address in T5+.

- [ ] **Step 5: Commit**

```bash
git add src/storage/repo.ts src/storage/fieldMap.ts
git commit -m "Trick Library T4: storage layer split + library page query

Replaces upsertTrick/getAllTricks with upsertCanonicalTrick +
upsertTrickOverlay + getAllTricksMerged + getTrickMerged. Adds
loadLibraryPage(opts, currentUserId) for paginated server query
via Supabase (ilike search + tier/category filters + cursor +
'not mine' + 'not already adopted' guards).

fieldMap.ts updated: mapTrickToServer/From renamed to Canonical
variants; new mapTrickOverlayToServer/From for the user_trick_progress
overlay shape. Callers in sync.ts will break — fixed in T5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `tricksStore` rewrite — actions + new publish/adopt/unadopt + loadLibraryPage

**Files:**
- Modify: `src/stores/tricks.ts`
- Modify: `src/stores/__tests__/tricks.test.ts`

This is the biggest single task. Read the existing `src/stores/tricks.ts` end-to-end before editing.

- [ ] **Step 1: Update existing `create` action**

Find the existing `async create(input: ...)`. Update to:

```ts
async create(input: {
  name: string
  tier: Tier
  category: Category
  lr: boolean
  icon?: string | null
  firstAlias?: string | null
}): Promise<string> {
  const name = input.name.trim()
  if (!name) throw new Error('Trick name required')
  const alias = input.firstAlias?.trim()
  const aliasArr: string[] = alias ? [alias] : []
  const userId = await getCurrentUserId() // null if anonymous
  const canonical: CanonicalTrick = {
    name,
    tier: input.tier,
    category: input.category,
    entry: '2/f',
    exit: '2/f',
    lr: input.lr,
    createdBy: userId,
    visibility: 'private',
    defaultAliases: aliasArr,
    defaultTags: [],
    defaultIcon: input.icon?.trim() || null,
    defaultVideo: null,
  }
  const id = await upsertCanonicalTrick(canonical)
  canonical.id = id
  const merged = mergeTrick(canonical, null)
  this.tricks = [...this.tricks, merged]
  return id
},
```

Import `mergeTrick` from `'../domain/mergeTrick'`, `upsertCanonicalTrick` from `'../storage/repo'`, `getCurrentUserId` from wherever auth helpers live (find via grep). Drop the old `import upsertTrick`.

- [ ] **Step 2: Rewrite `updateTrick` / `toggleFav` / `updateAliases` / `setMainAlias` / `updateTags` / `updateVideo` / `updateEmoji` / `toggleLr` / `resetProgress` / `resetTrickSide`**

These all now write to the overlay (per-user) instead of the canonical row. Pattern:

```ts
async updateAliases(id: string, aliases: string[]): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Sign in to customize tricks')  // or: store locally only — TBD
  const existing = await getTrickOverlay(userId, id)
  const next: TrickOverlay = existing ?? {
    userId, trickId: id,
    rate: null, rateL: null, rateR: null, last: null, status: 'Not Started',
    aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null,
    nodeX: null, nodeY: null, fav: false,
  }
  next.aliases = aliases
  if (next.mainAlias && !aliases.includes(next.mainAlias)) next.mainAlias = null
  await upsertTrickOverlay(next)
  this.replaceLocalFromOverlay(id, next)
},

async toggleFav(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Sign in to favorite tricks')
  const existing = await getTrickOverlay(userId, id)
  const next: TrickOverlay = existing ?? blankOverlay(userId, id)
  next.fav = !next.fav
  await upsertTrickOverlay(next)
  this.replaceLocalFromOverlay(id, next)
},

// Helper at store level
function replaceLocalFromOverlay(this: ..., trickId: string, overlay: TrickOverlay): void {
  const idx = this.tricks.findIndex(t => t.id === trickId)
  if (idx < 0) return
  const canonical = ??? // need to re-fetch or cache
  this.tricks[idx] = mergeTrick(canonical, overlay)
}
```

(Note: `replaceLocalFromOverlay` needs access to the canonical row for re-merge. Either keep a separate `canonicalsById` map in state, or re-fetch from `db.tricks` synchronously. Probably easier to cache canonicals in state alongside the merged view.)

Refactor: change state shape to `state: () => ({ canonicals: [] as CanonicalTrick[], overlaysByTrickId: new Map() as Map<string, TrickOverlay>, ..., tricks: [] as Trick[] })`, computed from canonicals + overlays. Then mutations update one or both, and `tricks` is a getter.

Going further would consume more lines than this plan allows; the implementing engineer must:
- Hold canonicals + overlays separately in state.
- Have a getter `tricks` that returns the merged view.
- Each patch action updates the right source then triggers re-merge of the affected entry.

- [ ] **Step 3: Add new actions: `publish`, `unpublish`, `adopt`, `unadopt`, `loadLibraryPage`**

```ts
async publish(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Sign in to publish')
  const canonical = await getCanonicalTrick(id)
  if (!canonical) throw new Error('Trick not found')
  if (canonical.createdBy !== userId) throw new Error('Only the creator can publish')
  canonical.visibility = 'public'
  await upsertCanonicalTrick(canonical)
  // re-merge local
  const overlay = await getTrickOverlay(userId, id)
  this.replaceLocal(mergeTrick(canonical, overlay))
},

async unpublish(id: string): Promise<void> {
  /* symmetric to publish — sets visibility 'private' */
},

async adopt(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Sign in to adopt')
  const existing = await getTrickOverlay(userId, id)
  if (existing) return  // already adopted
  const empty: TrickOverlay = {
    userId, trickId: id,
    rate: null, rateL: null, rateR: null, last: null, status: 'Not Started',
    aliases: [], tags: [], mainAlias: null, iconOverride: null, videoOverride: null,
    nodeX: null, nodeY: null, fav: false,
  }
  await upsertTrickOverlay(empty)
  const canonical = await getCanonicalTrick(id)
  if (canonical) this.tricks = [...this.tricks, mergeTrick(canonical, empty)]
},

async unadopt(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) return
  const existing = await getTrickOverlay(userId, id)
  if (!existing) return
  // Guard: warn if overlay has any non-default data
  const hasData =
    existing.rate != null || existing.rateL != null || existing.rateR != null ||
    existing.aliases.length || existing.tags.length || existing.fav ||
    existing.iconOverride || existing.videoOverride || existing.nodeX != null || existing.nodeY != null
  if (hasData) throw new Error('Trick has progress or customizations — clear them first')
  await deleteTrickOverlay(userId, id)
  this.tricks = this.tricks.filter(t => t.id !== id)
},

async loadLibraryPage(opts: LibraryPageOpts): Promise<LibraryPageResult> {
  const userId = await getCurrentUserId()
  return await loadLibraryPage(opts, userId)
},
```

- [ ] **Step 4: Update tests in `tricks.test.ts`**

Tests for `create` (6 existing) need adjustment for the new `createdBy` + `visibility` defaults. Add new tests:

- `create defaults createdBy from auth (mock currentUserId)` × 2 (anonymous → null; signed-in → user id)
- `create defaults visibility to 'private'`
- `publish requires creator`
- `unpublish requires creator`
- `adopt creates overlay row`
- `unadopt removes overlay row when empty`
- `unadopt throws when overlay has data`

Mock the new `getCurrentUserId` / Supabase calls as needed.

- [ ] **Step 5: Run tests**

```bash
npm test
```
Expected: full suite passes (~165 tests).

- [ ] **Step 6: Commit**

```bash
git add src/stores/tricks.ts src/stores/__tests__/tricks.test.ts
git commit -m "Trick Library T5: tricksStore rewrite — overlay actions + library + publish

State shape changes to hold canonicals + overlays separately; merged
\`tricks\` view computed from both. All patch actions (updateAliases,
updateTags, toggleFav, setMainAlias, updateVideo, updateEmoji,
toggleLr, resetProgress, resetTrickSide) now write to the per-user
overlay table. New actions: publish/unpublish (creator-only; sets
visibility), adopt/unadopt (creates/removes overlay row for current
user), loadLibraryPage (delegates to storage helper).

create now sets createdBy from auth (null when anonymous) and defaults
visibility to 'private'. Existing 6 create tests adjusted for new
defaults; ~8 new tests for the new actions.

Test suite ~165.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `ui` store — sub-tab + library state

**Files:**
- Modify: `src/stores/ui.ts`
- Modify: `src/stores/__tests__/ui.test.ts`

- [ ] **Step 1: Add types + state + actions**

```ts
// in src/stores/ui.ts — alongside existing SequencesSubTab/etc.
export type TricksSubTab = 'my-tricks' | 'library'
export type LibrarySortKey = 'newest' | 'name'

// in state():
tricksSubTab: 'my-tricks' as TricksSubTab,
librarySearch: '',
librarySort: 'newest' as LibrarySortKey,
libraryTiers: [] as Tier[],
libraryCategories: [] as Category[],

// in actions:
setTricksSubTab(v: TricksSubTab): void { this.tricksSubTab = v },
setLibrarySearch(v: string): void { this.librarySearch = v },
setLibrarySort(v: LibrarySortKey): void { this.librarySort = v },
setLibraryTiers(v: Tier[]): void { this.libraryTiers = v },
setLibraryCategories(v: Category[]): void { this.libraryCategories = v },
```

- [ ] **Step 2: Add 5 new tests in `ui.test.ts`** mirroring the existing pattern for `sequencesSubTab`.

- [ ] **Step 3: Tests + commit**

```bash
npm test
git add src/stores/ui.ts src/stores/__tests__/ui.test.ts
git commit -m "Trick Library T6: ui store — tricksSubTab + library state

Adds TricksSubTab ('my-tricks' | 'library'), LibrarySortKey
('newest' | 'name'), state fields (tricksSubTab, librarySearch,
librarySort, libraryTiers, libraryCategories), and setters. Five
new tests mirroring the existing sequencesSubTab pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Router — `/tricks/library` sub-route

**Files:** `src/router.ts`

- [ ] **Step 1: Add the sub-route**

Find the existing `/tricks` route. After it, add:

```ts
{ path: '/tricks/library', name: 'tricks-library', component: Tricks, meta: { subTab: 'library' } },
```

(Same component, meta.subTab = 'library' — mirrors the Sequences pattern.)

- [ ] **Step 2: Type-check + tests + commit**

```bash
npx vue-tsc -b --noEmit && npm test
git add src/router.ts
git commit -m "Trick Library T7: router — /tricks/library sub-route

Mirrors the Sequences pattern. Same component as /tricks with
route.meta.subTab = 'library' driving the active sub-tab in the
component.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `LibraryTrickCard` component

**Files:** Create `src/components/LibraryTrickCard.vue`

- [ ] **Step 1: Create the card**

Simple, flat — name, tier badge, category, creator nickname-or-anonymous, aliases preview (first one), and an Adopt button. Similar visual to TrickCard but no progress / no rate dots / no video button.

```vue
<script setup lang="ts">
import type { Trick } from '../domain/types'
import { IconPlus, IconCheck } from '../icons'

type Props = { trick: Trick; adopted?: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'adopt', id: string): void }>()

function onAdopt() {
  if (props.trick.id && !props.adopted) emit('adopt', props.trick.id)
}
</script>

<template>
  <div
    class="gw-glass-strong flex items-center gap-3 p-3"
    :style="{ borderRadius: 'var(--radius-g-chip)' }"
  >
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm font-semibold truncate">{{ trick.name }}</span>
        <span class="text-[10px] uppercase tracking-wide text-muted">T{{ trick.tier }}</span>
        <span class="text-[10px] text-muted">{{ trick.category }}</span>
      </div>
      <div v-if="trick.aliases.length" class="text-xs text-muted truncate">
        a.k.a. {{ trick.aliases[0] }}
      </div>
    </div>
    <button
      type="button"
      class="shrink-0 flex items-center gap-1 px-3 py-1.5 transition-colors"
      :class="adopted ? '' : 'gw-glass-strong'"
      :style="adopted
        ? { color: 'var(--color-g-fg-muted)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)' }
        : { background: 'var(--color-g-brand)', color: 'var(--color-g-base)', borderRadius: 'var(--radius-g-chip)', fontSize: 'var(--text-g-micro)', fontWeight: 600 }"
      :disabled="adopted"
      @click="onAdopt"
    >
      <IconCheck v-if="adopted" :size="14" stroke="1.75" />
      <IconPlus v-else :size="14" stroke="1.75" />
      <span>{{ adopted ? 'Adopted' : 'Add' }}</span>
    </button>
  </div>
</template>
```

(`IconCheck` already exists in `src/icons/index.ts`.)

- [ ] **Step 2: Type-check + commit**

```bash
npx vue-tsc -b --noEmit
git add src/components/LibraryTrickCard.vue
git commit -m "Trick Library T8: LibraryTrickCard component

Simple flat card: name, tier badge, category, first alias preview,
Adopt button. No progress / no rate / no video — strictly browse-and-adopt.
Button toggles between 'Add' (brand fill) and 'Adopted ✓' (muted, disabled).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `LibraryList` component (virtual scroll + debounced search)

**Files:** Create `src/components/LibraryList.vue`

- [ ] **Step 1: Read `vue-virtual-scroller` API** for `RecycleScroller` (the v3-compatible component).

- [ ] **Step 2: Create the list**

```vue
<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { useTricksStore } from '../stores/tricks'
import { useUiStore } from '../stores/ui'
import type { CanonicalTrick } from '../domain/types'
import LibraryTrickCard from './LibraryTrickCard.vue'

const tricks = useTricksStore()
const ui = useUiStore()

const items = ref<CanonicalTrick[]>([])
const loading = ref(false)
const hasMore = ref(true)
const error = ref<string | null>(null)
const PAGE_SIZE = 50

let debounceHandle: number | null = null

async function loadPage(reset = false): Promise<void> {
  if (loading.value || (!hasMore.value && !reset)) return
  loading.value = true
  error.value = null
  try {
    const cursor = reset ? 0 : items.value.length
    const { items: page, hasMore: more } = await tricks.loadLibraryPage({
      search: ui.librarySearch,
      tiers: ui.libraryTiers,
      categories: ui.libraryCategories,
      cursor,
      pageSize: PAGE_SIZE,
    })
    items.value = reset ? page : [...items.value, ...page]
    hasMore.value = more
  } catch (e) {
    error.value = (e as Error).message || 'Failed to load library'
  } finally {
    loading.value = false
  }
}

onMounted(() => { void loadPage(true) })

watch([() => ui.librarySearch, () => ui.libraryTiers, () => ui.libraryCategories], () => {
  if (debounceHandle != null) clearTimeout(debounceHandle)
  debounceHandle = window.setTimeout(() => { void loadPage(true) }, 300)
})

function onScrollEnd(): void {
  void loadPage(false)
}

function onAdopt(id: string): void {
  void tricks.adopt(id)
  // optimistically remove from list
  items.value = items.value.filter(c => c.id !== id)
}
</script>

<template>
  <div class="flex flex-col gap-3 min-h-[60vh]">
    <div v-if="error" class="text-danger text-sm py-4 text-center">{{ error }}</div>
    <div v-if="!loading && !items.length && !error" class="text-muted text-sm py-8 text-center">
      No tricks match — try clearing filters.
    </div>
    <RecycleScroller
      v-else
      :items="items"
      :item-size="76"
      key-field="id"
      class="flex-1"
      @scroll-end="onScrollEnd"
    >
      <template #default="{ item }">
        <div class="py-1">
          <LibraryTrickCard :trick="item" @adopt="onAdopt" />
        </div>
      </template>
    </RecycleScroller>
    <div v-if="loading" class="text-muted text-xs py-2 text-center">Loading…</div>
  </div>
</template>
```

(Adjust import path if `vue-virtual-scroller`'s v2-beta uses different component names — verify post-install. Some versions expose `<DynamicScroller>` for variable-height items.)

- [ ] **Step 3: Type-check + commit**

```bash
npx vue-tsc -b --noEmit
git add src/components/LibraryList.vue
git commit -m "Trick Library T9: LibraryList — virtual scroll + debounced search

Loads first 50 public not-mine not-adopted tricks on mount. Debounced
300ms watcher on search/filters resets the page. Scroll-end triggers
next page fetch. Optimistically removes adopted items from the visible
list. Uses vue-virtual-scroller's RecycleScroller for performance at
scale.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `LibraryFilterSheet` component

**Files:** Create `src/components/LibraryFilterSheet.vue`

- [ ] **Step 1: Create the sheet**

Pattern matches `TransitionsFilterSheet.vue` exactly (drag-to-close, body scroll lock, two-layer sheet enter animation). Sections: Tier (chips multi-select, 1-6) + Category (chips multi-select).

Reads/writes `ui.libraryTiers` + `ui.libraryCategories` via setters.

(Plan engineer should read `TransitionsFilterSheet.vue` and clone-with-substitutions.)

- [ ] **Step 2: Commit**

```bash
git add src/components/LibraryFilterSheet.vue
git commit -m "Trick Library T10: LibraryFilterSheet component

Mirrors TransitionsFilterSheet (two-layer sheet pattern + drag-to-close +
body scroll lock + motion tokens + reduced-motion fallback). Two sections:
Tier (multi-select chips 1-6) + Category (multi-select chips). Reads/writes
ui.libraryTiers + ui.libraryCategories.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `Tricks.vue` umbrella rewrite

**Files:** `src/pages/Tricks.vue` (large rewrite)

- [ ] **Step 1: Restructure to umbrella + sub-tabs**

Pattern matches `Sequences.vue` (umbrella with sub-tabs). Read current `Tricks.vue` end-to-end, then restructure:

- Add sub-tab strip (`My Tricks` | `Library`) to the sticky top bar — pinned, never collapses.
- Move existing My Tricks rendering (search/sort/filter chrome, chip row, list) into a `v-if="ui.tricksSubTab === 'my-tricks'"` block.
- Add `v-else` block for Library: renders `<LibraryList />`.
- Wire `route.meta.subTab` sync (mirrors Sequences pattern).
- FAB visible only when `ui.tricksSubTab === 'my-tricks'`.
- Filter button on top bar opens `TricksFilterSheet` (My Tricks) or `LibraryFilterSheet` (Library), based on active sub-tab.
- Sort cycle button cycles `tricksSort` (My Tricks) or `librarySort` (Library).

This is ~200 lines. Engineer should:
1. Read `Sequences.vue` for the umbrella pattern.
2. Read existing `Tricks.vue` end-to-end.
3. Compose the new structure preserving all existing My Tricks behavior (search/sort/filter/URL/scroll-direction sticky/etc.).
4. Add the Library branch.

- [ ] **Step 2: Type-check + tests + build**

```bash
npx vue-tsc -b --noEmit && npm test && npm run build
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Tricks.vue
git commit -m "Trick Library T11: Tricks page umbrella + sub-tabs

Mirrors Sequences umbrella pattern. Adds sub-tab strip (My Tricks |
Library) to the sticky top bar. My Tricks branch preserves all existing
behavior (search/sort/filter sheet/chip row/URL status sync/scroll-
direction sticky). Library branch renders LibraryList. FAB visible
only on My Tricks. Filter button + sort cycle swap targets per sub-tab.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: `TrickSheet` — "Share with library" toggle

**Files:** `src/components/TrickSheet.vue`

- [ ] **Step 1: Add a Library section in the sheet**

Visible only when `trick.createdBy === currentUserId`. Toggle bound to a computed `published` that calls `tricks.publish(id)` / `tricks.unpublish(id)`.

```vue
<section v-if="trick && isOwnTrick" class="mt-4">
  <h3 class="text-xs uppercase tracking-wide text-muted mb-1.5">Library</h3>
  <label class="flex items-center justify-between gap-3 cursor-pointer">
    <span class="text-sm">Share with library</span>
    <!-- toggle switch matching TrickCreationSheet's LR toggle -->
  </label>
</section>
```

Add to script: `const isOwnTrick = computed(() => trick.value?.createdBy === currentUserId.value)` — needs current user id reactive.

- [ ] **Step 2: Commit**

```bash
git add src/components/TrickSheet.vue
git commit -m "Trick Library T12: TrickSheet — Share-with-library toggle

Section visible only when the trick was created by the current user.
Toggle publishes/unpublishes via tricks.publish / tricks.unpublish.
Seeded tricks (createdBy=null) and adopted tricks (createdBy≠me) hide
the section.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: `TrickCreationSheet` adjustment

**Files:** `src/components/TrickCreationSheet.vue`

- [ ] **Step 1: No template change needed** — the store's `create` handles `createdBy` + visibility. But add a note in the script comment that `visibility: 'private'` is the new default.

- [ ] **Step 2: Optionally add a "Share with library on create" toggle**

OPTIONAL: a third toggle next to LR for "Publish to library now?" — defaults off. If on, after create succeeds, also call `tricks.publish(id)` before opening TrickSheet. Skipping for v1 keeps the spec scope tight; deferring to "publish via TrickSheet after creation" is the recommended flow.

- [ ] **Step 3: No commit needed if no changes; otherwise small commit.**

---

## Task 14: Outbox mapping update + sync.ts

**Files:** `src/storage/sync.ts`

- [ ] **Step 1: Audit `sync.ts`** for use of `mapTrickToServer` / `mapTrickFromServer` (now renamed in T4). Update to `mapCanonicalTrickToServer` / `mapCanonicalTrickFromServer` and the new overlay map functions.

- [ ] **Step 2: Verify outbox upload of any in-flight `tricks` entries**

If outbox contains entries with old shape (`{ aliases: [...], etc. }`), translate them to the new shape on upload. The pattern:

```ts
function migrateOutboxTrickPayload(payload: any): { canonical: any, overlay: any | null } {
  // Split old shape: canonical fields + user-side fields → canonical row + overlay row (if signed in)
  // Implementation per actual outbox entry shape
}
```

Edge: anonymous outbox entries (no signed-in user when queued) can't be turned into overlay rows. Drop the user-side fields and queue only the canonical part.

- [ ] **Step 3: Type-check + tests + commit**

```bash
npx vue-tsc -b --noEmit && npm test
git add src/storage/sync.ts
git commit -m "Trick Library T14: sync.ts — new mapping fns + outbox migration

Updates push/pull paths to use mapCanonicalTrick* + mapTrickOverlay*
(renamed/added in T4). In-flight outbox entries with the old combined
shape are split on upload: canonical fields → canonical row, user-side
fields → overlay row (dropped if no signed-in user).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Apply Supabase migration + verification + SESSION-HANDOFF + cutover push

**Files:** `spec/SESSION-HANDOFF.md`

This is the cutover. Order matters tightly.

- [ ] **Step 1: Final tests + build locally**

```bash
npm test && npm run build
```
Expected: ~165 tests pass + clean build.

- [ ] **Step 2: Apply Supabase migration via MCP**

Use the Supabase MCP `apply_migration` tool with the SQL from Task 2. **Do this BEFORE the next git push.** The migration is non-reversible (drops columns); double-check Supabase project ref `tdpetpsexwfblrhwunup` is correct.

- [ ] **Step 3: Verify migration applied**

Use MCP `list_tables` or `execute_sql` to confirm:
- `tricks` has the new columns (`created_by`, `visibility`, `default_*`) and lost the old ones.
- `user_trick_progress` has the new overlay columns.
- RLS policies are in place.

- [ ] **Step 4: Manual smoke test on dev**

Run dev server, sign in (note: OAuth bug on dev is a separate issue — may need to test on live after push if dev auth doesn't work).

- /tricks defaults to My Tricks sub-tab.
- Tap Library sub-tab → loads first 50 public tricks via Supabase.
- Search debounces (300ms) and refetches.
- Tier/Category filters apply.
- Scroll to bottom → next page loads.
- Tap Add on a library trick → row disappears, trick appears in My Tricks tab.
- Open a self-created trick → "Share with library" toggle visible.
- Open an adopted trick (or seeded) → toggle hidden.
- TrickCreationSheet still works; new tricks default to private.

- [ ] **Step 5: Update `spec/SESSION-HANDOFF.md`**

Add "Trick Library" subsection at top of "What's shipped". Update state HEAD + commit count + test count. Add decisions log entry covering the canonical/overlay split, adoption-as-overlay-existence, privacy default private, library scale model. Document the OAuth bug status (still open, separate spec needed). Update "Prompt for new session" with new HEAD.

- [ ] **Step 6: Final commit + push**

```bash
git add spec/SESSION-HANDOFF.md
git commit -m "SESSION-HANDOFF: Trick Library shipped

Major IA + data model change. Canonical/overlay split, My Tricks |
Library sub-tabs, adoption flow. Supabase migration applied; Dexie v5;
RLS rules in place. Privacy default = private on create; toggle to
public in TrickSheet's new Library section. Library uses server-side
pagination + virtual scroll + debounced search.

OAuth bug on dev still open — separate spec needed to fix Supabase
provider redirect URIs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push origin main
```

Live redeploys via GH Pages. Window between Supabase migration apply (Step 2) and push complete is the broken-window — should be < 60s.

---

## Self-review checklist

- [ ] Every spec section is addressed by at least one task.
- [ ] No placeholders.
- [ ] `mergeTrick` consumers (T4 storage, T5 store) use the shape introduced in T1.
- [ ] Supabase migration (T2) and Dexie v5 (T3) shape-match.
- [ ] `mapCanonicalTrickToServer` / `From` renames are consistently used across T4/T14.
- [ ] All commit messages include `Co-Authored-By`.
- [ ] T15 step order: tests → migration → push (not migration first then tests).
