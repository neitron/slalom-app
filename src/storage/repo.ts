import { db } from './dexie';
import { applyReport, blend, isoToday } from '../domain/rating';
import { applyEdgeReport } from '../domain/edges';
import { enqueue } from './outbox';
import { uuidv4 } from './uuid';
import type { PracticeEntityType, PracticeLog, Side, Sequence, Transition, Trick } from '../domain/types';

const newId = (): string => uuidv4();

// ---- outbox guard ----
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
  table: 'tricks' | 'transitions' | 'sequences' | 'practice_log',
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

export async function reportTrick(id: string, side: Side, score: number): Promise<Trick> {
  const today = isoToday();
  const { trick, log } = await db.transaction('rw', db.tricks, db.practice_log, async () => {
    const t = await db.tricks.get(id);
    if (!t) throw new Error(`trick not found: ${id}`);
    applyReport(t, score, side, today);
    await db.tricks.put(t);
    const log: PracticeLog = {
      id: newId(),
      entityType: 'trick',
      entityId: id,
      side,
      score,
      at: new Date().toISOString(),
    };
    await db.practice_log.add(log);
    return { trick: t, log };
  });
  await enq('upsert', 'tricks', toPlain(trick) as unknown as Record<string, unknown>);
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
  const { edge, log } = await db.transaction('rw', db.transitions, db.practice_log, async () => {
    const e = await db.transitions.get(id);
    if (!e) throw new Error(`transition not found: ${id}`);
    applyEdgeReport(e, score, today);
    await db.transitions.put(toPlain(e));
    const log: PracticeLog = {
      id: newId(),
      entityType: 'transition',
      entityId: id,
      side: null,
      score,
      at: new Date().toISOString(),
    };
    await db.practice_log.add(log);
    return { edge: e, log };
  });
  await enq('upsert', 'transitions', toPlain(edge) as unknown as Record<string, unknown>);
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
  const { seq, log } = await db.transaction('rw', db.sequences, db.practice_log, async () => {
    const s = await db.sequences.get(id);
    if (!s) throw new Error(`sequence not found: ${id}`);
    s.rate = blend(s.rate, score);
    s.last = today;
    await db.sequences.put(toPlain(s));
    const log: PracticeLog = {
      id: newId(),
      entityType: 'sequence',
      entityId: id,
      side: null,
      score,
      at: new Date().toISOString(),
    };
    await db.practice_log.add(log);
    return { seq: s, log };
  });
  await enq('upsert', 'sequences', toPlain(seq) as unknown as Record<string, unknown>);
  await enq('upsert', 'practice_log', toPlain(log) as unknown as Record<string, unknown>);
  return seq;
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
