import { db } from './dexie';
import { applyReport, blend, isoToday, statusOf } from '../domain/rating';
import { applyEdgeReport } from '../domain/edges';
import { enqueue, type OutboxTable } from './outbox';
import { uuidv4 } from './uuid';
import { getCurrentUserId } from './social';
import type {
  PracticeEntityType,
  PracticeLog,
  Side,
  Sequence,
  Transition,
  Trick,
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

export async function getAllTricks(): Promise<Trick[]> {
  return db.tricks.toArray();
}

export async function getTrick(id: string): Promise<Trick | undefined> {
  return db.tricks.get(id);
}

function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export async function upsertTrick(t: Trick): Promise<string> {
  if (!t.id) t.id = newId();
  const plain = toPlain(t);
  await db.tricks.put(plain);
  await enq('upsert', 'tricks', plain as unknown as Record<string, unknown>);
  return t.id;
}

async function loadTrickProgress(userId: string, trickId: string): Promise<UserTrickProgress | null> {
  const row = await db.user_trick_progress.get([userId, trickId]);
  return row ?? null;
}

export async function reportTrick(id: string, side: Side, score: number): Promise<Trick> {
  const today = isoToday();
  const uid = (await getCurrentUserId()) ?? null;
  const { trick, log, progress } = await db.transaction(
    'rw',
    db.tricks,
    db.practice_log,
    db.user_trick_progress,
    async () => {
      const t = await db.tricks.get(id);
      if (!t) throw new Error(`trick not found: ${id}`);
      applyReport(t, score, side, today);
      await db.tricks.put(t);

      let progress: UserTrickProgress | null = null;
      if (uid) {
        const existing = await db.user_trick_progress.get([uid, id]);
        const lrEnabled = !!t.lr;
        const next: UserTrickProgress = {
          userId: uid,
          trickId: id,
          rate: lrEnabled ? null : t.rate,
          rateL: lrEnabled ? t.rateL : null,
          rateR: lrEnabled ? t.rateR : null,
          last: t.last,
          status: t.status,
          fav: existing?.fav ?? t.fav,
          lrEnabled,
          updatedAt: new Date().toISOString(),
        };
        await db.user_trick_progress.put(next);
        progress = next;
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
      return { trick: t, log, progress };
    },
  );
  if (progress) {
    await enq('upsert', 'user_trick_progress', toPlain(progress) as unknown as Record<string, unknown>);
  }
  await enq('upsert', 'practice_log', toPlain(log) as unknown as Record<string, unknown>);
  return trick;
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

export async function upsertOwnTrickProgress(p: UserTrickProgress): Promise<void> {
  await db.user_trick_progress.put(p);
  await enq('upsert', 'user_trick_progress', toPlain(p) as unknown as Record<string, unknown>);
}

export async function toggleOwnTrickFav(trickId: string, fav: boolean): Promise<void> {
  const uid = await getCurrentUserId();
  if (!uid) {
    const t = await db.tricks.get(trickId);
    if (t) {
      t.fav = fav;
      await db.tricks.put(t);
    }
    return;
  }
  const existing = await loadTrickProgress(uid, trickId);
  const t = await db.tricks.get(trickId);
  const next: UserTrickProgress = existing
    ? { ...existing, fav, updatedAt: new Date().toISOString() }
    : {
        userId: uid,
        trickId,
        rate: t?.lr ? null : t?.rate ?? null,
        rateL: t?.lr ? t?.rateL ?? null : null,
        rateR: t?.lr ? t?.rateR ?? null : null,
        last: t?.last ?? null,
        status: t ? statusOf(t) : 'Not Started',
        fav,
        lrEnabled: !!t?.lr,
        updatedAt: new Date().toISOString(),
      };
  if (t) {
    t.fav = fav;
    await db.tricks.put(t);
  }
  await upsertOwnTrickProgress(next);
}

export async function setOwnTrickLrEnabled(trickId: string, lrEnabled: boolean): Promise<void> {
  const uid = await getCurrentUserId();
  if (!uid) return;
  const existing = await loadTrickProgress(uid, trickId);
  const t = await db.tricks.get(trickId);
  const next: UserTrickProgress = existing
    ? { ...existing, lrEnabled, updatedAt: new Date().toISOString() }
    : {
        userId: uid,
        trickId,
        rate: lrEnabled ? null : t?.rate ?? null,
        rateL: lrEnabled ? t?.rateL ?? null : null,
        rateR: lrEnabled ? t?.rateR ?? null : null,
        last: t?.last ?? null,
        status: t ? statusOf(t) : 'Not Started',
        fav: t?.fav ?? false,
        lrEnabled,
        updatedAt: new Date().toISOString(),
      };
  await upsertOwnTrickProgress(next);
}

export async function resetOwnTrickProgress(trickId: string): Promise<void> {
  const uid = await getCurrentUserId();
  const t = await db.tricks.get(trickId);
  if (t) {
    t.rate = null;
    t.rateL = null;
    t.rateR = null;
    t.last = null;
    t.status = 'Not Started';
    await db.tricks.put(t);
  }
  if (!uid) return;
  const existing = await loadTrickProgress(uid, trickId);
  const next: UserTrickProgress = {
    userId: uid,
    trickId,
    rate: null,
    rateL: null,
    rateR: null,
    last: null,
    status: 'Not Started',
    fav: existing?.fav ?? false,
    lrEnabled: existing?.lrEnabled ?? !!t?.lr,
    updatedAt: new Date().toISOString(),
  };
  await upsertOwnTrickProgress(next);
}

export interface ExportPayload {
  exportedAt: string;
  tricks: Trick[];
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
