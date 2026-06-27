import { db } from './dexie';
import { applyReport, blend, isoToday } from '../domain/rating';
import { applyEdgeReport } from '../domain/edges';
import { enqueue, type OutboxTable } from './outbox';
import { uuidv4 } from './uuid';
import { getCurrentUserId } from './social';
import { getSb } from './supabase';
import { mapCanonicalTrickFromServer } from './fieldMap';
import { mergeTrick } from '../domain/mergeTrick';
import type {
  CanonicalTrick,
  PracticeEntityType,
  PracticeLog,
  Side,
  Sequence,
  Transition,
  Trick,
  TrickOverlay,
  UserTrickProgress,
} from '../domain/types';

const newId = (): string => uuidv4();

let skipOutbox = false;

export async function withoutOutbox<T>(fn: () => Promise<T>): Promise<T> {
  const prev = skipOutbox;
  skipOutbox = true;
  try {
    return await fn();
  } finally {
    skipOutbox = prev;
  }
}

async function enq(
  op: 'upsert' | 'delete',
  table: OutboxTable,
  payload: Record<string, unknown>,
): Promise<void> {
  if (skipOutbox) return;
  await enqueue(op, table, payload);
}

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// ---------------------------------------------------------------------------
// Canonical trick helpers (T4 split)
// ---------------------------------------------------------------------------

export async function upsertCanonicalTrick(t: CanonicalTrick): Promise<string> {
  if (!t.id) t.id = newId();
  const plain = toPlain(t);
  await db.tricks.put(plain);
  await enq('upsert', 'tricks', plain as unknown as Record<string, unknown>);
  return t.id!;
}

export async function getCanonicalTrick(id: string): Promise<CanonicalTrick | undefined> {
  return db.tricks.get(id) as Promise<CanonicalTrick | undefined>;
}

// ---------------------------------------------------------------------------
// TrickOverlay helpers (T4 split)
// ---------------------------------------------------------------------------

export async function upsertTrickOverlay(o: TrickOverlay): Promise<void> {
  const plain = toPlain(o);
  await db.user_trick_progress.put(plain);
  await enq('upsert', 'user_trick_progress', plain as unknown as Record<string, unknown>);
}

export async function getTrickOverlay(userId: string, trickId: string): Promise<TrickOverlay | null> {
  const row = await db.user_trick_progress.get([userId, trickId]) as TrickOverlay | undefined;
  return row ?? null;
}

export async function deleteTrickOverlay(userId: string, trickId: string): Promise<void> {
  await db.user_trick_progress.delete([userId, trickId]);
  await enq('delete', 'user_trick_progress', { userId, trickId } as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Merged trick queries (canonical + overlay → Trick)
// ---------------------------------------------------------------------------

export async function getAllTricksMerged(userId: string | null): Promise<Trick[]> {
  const canonicals = await db.tricks.toArray() as CanonicalTrick[];
  if (!userId) {
    return canonicals.map((c) => mergeTrick(c, null));
  }
  const overlays = await db.user_trick_progress
    .where('userId')
    .equals(userId)
    .toArray() as TrickOverlay[];
  const overlayByTrickId = new Map(overlays.map((o) => [o.trickId, o]));
  return canonicals.map((c) => mergeTrick(c, overlayByTrickId.get(c.id!) ?? null));
}

export async function getTrickMerged(id: string, userId: string | null): Promise<Trick | undefined> {
  const c = await db.tricks.get(id) as CanonicalTrick | undefined;
  if (!c) return undefined;
  if (!userId) return mergeTrick(c, null);
  const o = await db.user_trick_progress.get([userId, id]) as TrickOverlay | undefined;
  return mergeTrick(c, o ?? null);
}

// ---------------------------------------------------------------------------
// Deprecated wrappers — kept so tricks store / App.vue compile until T5
// ---------------------------------------------------------------------------

/** @deprecated Use getAllTricksMerged instead (T5). */
export async function getAllTricks(): Promise<Trick[]> {
  const uid = (await getCurrentUserId()) ?? null;
  return getAllTricksMerged(uid);
}

/** @deprecated Use getTrickMerged instead (T5). */
export async function getTrick(id: string): Promise<Trick | undefined> {
  const uid = (await getCurrentUserId()) ?? null;
  return getTrickMerged(id, uid);
}

/** @deprecated Callers must split into upsertCanonicalTrick + upsertTrickOverlay (T5). */
export async function upsertTrick(t: Trick): Promise<string> {
  if (!t.id) t.id = newId();
  // Best-effort: write what we can to the canonical row; per-user fields are
  // dropped because the canonical table no longer has them (after T2 migration).
  const canonical: CanonicalTrick = {
    id: t.id,
    createdBy: t.createdBy ?? null,
    visibility: t.visibility ?? 'public',
    name: t.name,
    tier: t.tier,
    category: t.category,
    entry: t.entry,
    exit: t.exit,
    lr: t.lr,
    defaultAliases: t.aliases ?? [],
    defaultTags: t.tags ?? [],
    defaultIcon: t.icon ?? null,
    defaultVideo: t.video ?? null,
  };
  await upsertCanonicalTrick(canonical);
  return t.id;
}

export async function reportTrick(id: string, side: Side, score: number): Promise<Trick> {
  const today = isoToday();
  const uid = (await getCurrentUserId()) ?? null;
  const { merged, log, overlay } = await db.transaction(
    'rw',
    db.tricks,
    db.practice_log,
    db.user_trick_progress,
    async () => {
      // Read canonical (never mutated for rate fields)
      const canonical = await db.tricks.get(id) as CanonicalTrick | undefined;
      if (!canonical) throw new Error(`trick not found: ${id}`);

      // Read existing overlay (or build blank)
      const existingOverlay = uid
        ? (await db.user_trick_progress.get([uid, id]) as TrickOverlay | undefined) ?? null
        : null;

      const blankOverlay: TrickOverlay = {
        userId: uid ?? '',
        trickId: id,
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
      };

      // Merge into a Trick-like object so applyReport can mutate it
      const workingMerged = mergeTrick(canonical, existingOverlay ?? (uid ? blankOverlay : null));
      applyReport(workingMerged, score, side, today);

      let overlay: TrickOverlay | null = null;
      if (uid) {
        const nextOverlay: TrickOverlay = {
          ...(existingOverlay ?? blankOverlay),
          rate: canonical.lr ? null : workingMerged.rate,
          rateL: canonical.lr ? workingMerged.rateL : null,
          rateR: canonical.lr ? workingMerged.rateR : null,
          last: workingMerged.last,
          status: workingMerged.status,
        };
        await db.user_trick_progress.put(nextOverlay);
        overlay = nextOverlay;
      }

      const log: PracticeLog = {
        id: newId(),
        entityType: 'trick',
        entityId: id,
        side,
        score,
        at: new Date().toISOString(),
        userId: uid,
      };
      await db.practice_log.add(log);
      // Return re-merged Trick for the store
      const merged = overlay ? mergeTrick(canonical, overlay) : workingMerged;
      return { merged, log, overlay };
    },
  );
  if (overlay) {
    await enq('upsert', 'user_trick_progress', toPlain(overlay) as unknown as Record<string, unknown>);
  }
  await enq('upsert', 'practice_log', toPlain(log) as unknown as Record<string, unknown>);
  return merged;
}

export async function listPracticeLog(
  entityId: string,
  entityType: PracticeEntityType = 'trick',
): Promise<PracticeLog[]> {
  return db.practice_log
    .where('[entityType+entityId]')
    .equals([entityType, entityId])
    .reverse()
    .sortBy('at');
}

export async function getAllTransitions(): Promise<Transition[]> {
  return db.transitions.toArray();
}

export async function upsertTransition(e: Transition): Promise<string> {
  if (!e.id) e.id = newId();
  const plain = toPlain(e);
  await db.transitions.put(plain);
  await enq('upsert', 'transitions', plain as unknown as Record<string, unknown>);
  return e.id;
}

export async function deleteTransition(id: string): Promise<void> {
  await db.transitions.delete(id);
  await enq('delete', 'transitions', { id });
}

export async function reportTransition(id: string, score: number): Promise<Transition> {
  const today = isoToday();
  const uid = (await getCurrentUserId()) ?? null;
  const { edge, log } = await db.transaction(
    'rw',
    db.transitions,
    db.practice_log,
    async () => {
      const e = await db.transitions.get(id);
      if (!e) throw new Error(`transition not found: ${id}`);
      applyEdgeReport(e, score, today);
      const plain = toPlain(e);
      await db.transitions.put(plain);

      const log: PracticeLog = {
        id: newId(),
        entityType: 'transition',
        entityId: id,
        side: null,
        score,
        at: new Date().toISOString(),
        userId: uid,
      };
      await db.practice_log.add(log);
      return { edge: plain, log };
    },
  );
  await enq('upsert', 'transitions', edge as unknown as Record<string, unknown>);
  await enq('upsert', 'practice_log', toPlain(log) as unknown as Record<string, unknown>);
  return edge;
}

export async function getAllSequences(): Promise<Sequence[]> {
  return db.sequences.toArray();
}

export async function upsertSequence(s: Sequence): Promise<string> {
  if (!s.id) s.id = newId();
  if (!s.created) s.created = isoToday();
  const plain = toPlain(s);
  await db.sequences.put(plain);
  await enq('upsert', 'sequences', plain as unknown as Record<string, unknown>);
  return s.id;
}

export async function deleteSequence(id: string): Promise<void> {
  await db.sequences.delete(id);
  await enq('delete', 'sequences', { id });
}

export async function reportSequence(id: string, score: number): Promise<Sequence> {
  const today = isoToday();
  const uid = (await getCurrentUserId()) ?? null;
  const { seq, log } = await db.transaction(
    'rw',
    db.sequences,
    db.practice_log,
    async () => {
      const s = await db.sequences.get(id);
      if (!s) throw new Error(`sequence not found: ${id}`);
      s.rate = blend(s.rate, score);
      s.last = today;
      const plain = toPlain(s);
      await db.sequences.put(plain);

      const log: PracticeLog = {
        id: newId(),
        entityType: 'sequence',
        entityId: id,
        side: null,
        score,
        at: new Date().toISOString(),
        userId: uid,
      };
      await db.practice_log.add(log);
      return { seq: plain, log };
    },
  );
  await enq('upsert', 'sequences', seq as unknown as Record<string, unknown>);
  await enq('upsert', 'practice_log', toPlain(log) as unknown as Record<string, unknown>);
  return seq;
}

/** @deprecated Used by sync.ts until T14 replaces it with upsertTrickOverlay. */
export async function upsertOwnTrickProgress(p: UserTrickProgress): Promise<void> {
  // Cast: user_trick_progress stores TrickOverlay rows, but UserTrickProgress rows
  // written here are structurally compatible at the DB level. T14 replaces this.
  await db.user_trick_progress.put(p as unknown as TrickOverlay);
  await enq('upsert', 'user_trick_progress', toPlain(p) as unknown as Record<string, unknown>);
}

/** Helper: load overlay row as TrickOverlay if it exists. */
async function loadOverlay(uid: string, trickId: string): Promise<TrickOverlay | null> {
  const row = await db.user_trick_progress.get([uid, trickId]) as TrickOverlay | undefined;
  return row ?? null;
}

export async function toggleOwnTrickFav(trickId: string, fav: boolean): Promise<void> {
  const uid = await getCurrentUserId();
  if (!uid) {
    // Anonymous: best-effort write fav to overlay if an overlay row exists,
    // otherwise nothing to do (no canonical fav column in new schema).
    return;
  }
  const existing = await loadOverlay(uid, trickId);
  const canonical = await db.tricks.get(trickId) as CanonicalTrick | undefined;
  const next: TrickOverlay = existing
    ? { ...existing, fav }
    : {
        userId: uid,
        trickId,
        rate: null,
        rateL: null,
        rateR: null,
        last: null,
        status: 'Not Started',
        aliases: [],
        tags: [],
        mainAlias: null,
        iconOverride: null,
        videoOverride: canonical?.defaultVideo ?? null,
        nodeX: null,
        nodeY: null,
        fav,
      };
  await upsertTrickOverlay(next);
}

export async function setOwnTrickLrEnabled(trickId: string, lrEnabled: boolean): Promise<void> {
  // lrEnabled is now a canonical-level property (canonical.lr). This function is kept
  // for backward compat; T5 store rewrite will replace the calling pattern.
  // If signed in, update canonical lr field. Otherwise no-op.
  const uid = await getCurrentUserId();
  if (!uid) return;
  const canonical = await db.tricks.get(trickId) as CanonicalTrick | undefined;
  if (!canonical) return;
  canonical.lr = lrEnabled;
  await upsertCanonicalTrick(canonical);
}

export async function resetOwnTrickProgress(trickId: string): Promise<void> {
  const uid = await getCurrentUserId();
  if (!uid) return;
  const existing = await loadOverlay(uid, trickId);
  const next: TrickOverlay = {
    ...(existing ?? {
      userId: uid,
      trickId,
      aliases: [],
      tags: [],
      mainAlias: null,
      iconOverride: null,
      videoOverride: null,
      nodeX: null,
      nodeY: null,
      fav: false,
    }),
    userId: uid,
    trickId,
    rate: null,
    rateL: null,
    rateR: null,
    last: null,
    status: 'Not Started',
  };
  await upsertTrickOverlay(next);
}

export interface ExportPayload {
  exportedAt: string;
  tricks: CanonicalTrick[];
  transitions: Transition[];
  sequences: Sequence[];
  practice_log: PracticeLog[];
}

export async function exportJson(): Promise<string> {
  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    tricks: await db.tricks.toArray(),
    transitions: await db.transitions.toArray(),
    sequences: await db.sequences.toArray(),
    practice_log: await db.practice_log.toArray(),
  };
  return JSON.stringify(payload, null, 2);
}

export async function importJson(text: string): Promise<void> {
  const data = JSON.parse(text) as Partial<ExportPayload>;
  await withoutOutbox(async () => {
    await db.transaction(
      'rw',
      db.tricks,
      db.transitions,
      db.sequences,
      db.practice_log,
      async () => {
        await db.tricks.clear();
        await db.transitions.clear();
        await db.sequences.clear();
        await db.practice_log.clear();
        if (data.tricks?.length) await db.tricks.bulkAdd(data.tricks);
        if (data.transitions?.length) await db.transitions.bulkAdd(data.transitions);
        if (data.sequences?.length) await db.sequences.bulkAdd(data.sequences);
        if (data.practice_log?.length) await db.practice_log.bulkAdd(data.practice_log);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Library page query — server-side, paginated
// ---------------------------------------------------------------------------

export interface LibraryPageOpts {
  search: string;
  tiers: number[];
  categories: string[];
  cursor: number;   // offset
  pageSize: number;
}

export interface LibraryPageResult {
  items: CanonicalTrick[];
  hasMore: boolean;
}

/**
 * Fetch public, not-mine, not-already-adopted tricks via Supabase.
 * Server-side only — requires an active Supabase session.
 */
export async function loadLibraryPage(
  opts: LibraryPageOpts,
  currentUserId: string | null,
): Promise<LibraryPageResult> {
  const sb = await getSb();
  if (!sb) throw new Error('Supabase not available');

  let q = sb
    .from('tricks')
    .select('*')
    .eq('visibility', 'public')
    .not('created_by', 'is', null);

  if (currentUserId) q = q.neq('created_by', currentUserId);
  if (opts.search.trim()) q = q.ilike('name', `%${opts.search.trim()}%`);
  if (opts.tiers.length) q = q.in('tier', opts.tiers);
  if (opts.categories.length) q = q.in('category', opts.categories);

  // Fetch one extra row to detect hasMore
  q = q
    .order('created_at', { ascending: false })
    .range(opts.cursor, opts.cursor + opts.pageSize);

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > opts.pageSize;
  const items = rows.slice(0, opts.pageSize).map(mapCanonicalTrickFromServer);

  // Filter out tricks already adopted (overlay row exists locally)
  if (currentUserId && items.length > 0) {
    const ids = items.map((c) => c.id!).filter(Boolean);
    const overlays = await db.user_trick_progress
      .where('[userId+trickId]')
      .anyOf(ids.map((i) => [currentUserId, i]))
      .toArray() as TrickOverlay[];
    const adoptedIds = new Set(overlays.map((o) => o.trickId));
    return { items: items.filter((c) => !adoptedIds.has(c.id!)), hasMore };
  }

  return { items, hasMore };
}
