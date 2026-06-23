import { sb } from './supabase';
import { db } from './dexie';
import { listOutbox, removeOutbox, type OutboxTable } from './outbox';
import { withoutOutbox } from './repo';
import { useAuthStore } from '../stores/auth';
import {
  mapTrickToServer,
  mapTrickFromServer,
  mapTransitionToServer,
  mapTransitionFromServer,
  mapSequenceToServer,
  mapSequenceFromServer,
  mapPracticeLogToServer,
  mapPracticeLogFromServer,
  type TrickRow,
  type TransitionRow,
  type SequenceRow,
  type PracticeLogRow,
} from './fieldMap';
import type { PracticeLog, Sequence, Transition, Trick } from '../domain/types';

const PAGE = 1000;
const CHUNK = 500;

async function isSignedIn(): Promise<boolean> {
  if (!sb) return false;
  const { data } = await sb.auth.getSession();
  return !!data.session;
}

// ---- pending id sets (so pullAll skips entities with queued local ops) ----
interface PendingIds {
  tricks: Set<string>;
  transitions: Set<string>;
  sequences: Set<string>;
  practice_log: Set<string>;
}

async function collectPendingIds(): Promise<PendingIds> {
  const rows = await listOutbox();
  const out: PendingIds = {
    tricks: new Set(),
    transitions: new Set(),
    sequences: new Set(),
    practice_log: new Set(),
  };
  for (const r of rows) {
    const id = typeof r.payload.id === 'string' ? r.payload.id : null;
    if (!id) continue;
    out[r.table].add(id);
  }
  return out;
}

// ---- paginated full-table fetch ----
async function fetchAll<T>(table: OutboxTable): Promise<T[]> {
  if (!sb) return [];
  const acc: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const to = from + PAGE - 1;
    const { data, error } = await sb.from(table).select('*').range(from, to);
    if (error) throw new Error(`pull ${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    acc.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return acc;
}

export async function pullAll(): Promise<{
  tricks: number;
  transitions: number;
  sequences: number;
  practice_log: number;
}> {
  if (!sb || !(await isSignedIn())) {
    return { tricks: 0, transitions: 0, sequences: 0, practice_log: 0 };
  }

  const pending = await collectPendingIds();

  const [trickRows, transitionRows, sequenceRows, logRows] = await Promise.all([
    fetchAll<TrickRow>('tricks'),
    fetchAll<TransitionRow>('transitions'),
    fetchAll<SequenceRow>('sequences'),
    fetchAll<PracticeLogRow>('practice_log'),
  ]);

  const tricks: Trick[] = trickRows
    .map(mapTrickFromServer)
    .filter((t) => t.id && !pending.tricks.has(t.id));
  const transitions: Transition[] = transitionRows
    .map(mapTransitionFromServer)
    .filter((t) => t.id && !pending.transitions.has(t.id));
  const sequences: Sequence[] = sequenceRows
    .map(mapSequenceFromServer)
    .filter((s) => s.id && !pending.sequences.has(s.id));
  const logs: PracticeLog[] = logRows
    .map(mapPracticeLogFromServer)
    .filter((p) => p.id && !pending.practice_log.has(p.id));

  await withoutOutbox(async () => {
    await db.transaction(
      'rw',
      db.tricks,
      db.transitions,
      db.sequences,
      db.practice_log,
      async () => {
        if (tricks.length) await db.tricks.bulkPut(tricks);
        if (transitions.length) await db.transitions.bulkPut(transitions);
        if (sequences.length) await db.sequences.bulkPut(sequences);
        if (logs.length) await db.practice_log.bulkPut(logs);
      },
    );
  });

  return {
    tricks: tricks.length,
    transitions: transitions.length,
    sequences: sequences.length,
    practice_log: logs.length,
  };
}

function mapPayloadToServer(
  table: OutboxTable,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  switch (table) {
    case 'tricks':
      return mapTrickToServer(payload as unknown as Trick) as unknown as Record<string, unknown>;
    case 'transitions':
      return mapTransitionToServer(
        payload as unknown as Transition,
      ) as unknown as Record<string, unknown>;
    case 'sequences':
      return mapSequenceToServer(
        payload as unknown as Sequence,
      ) as unknown as Record<string, unknown>;
    case 'practice_log':
      return mapPracticeLogToServer(
        payload as unknown as PracticeLog,
      ) as unknown as Record<string, unknown>;
  }
}

export async function flushOutbox(): Promise<{ flushed: number; failed: number }> {
  if (!sb || !(await isSignedIn())) return { flushed: 0, failed: 0 };

  const rows = await listOutbox();
  let flushed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      if (row.op === 'upsert') {
        const serverRow = mapPayloadToServer(row.table, row.payload);
        const { error } = await sb.from(row.table).upsert(serverRow, { onConflict: 'id' });
        if (error) {
          console.warn('[sync] upsert failed', row.table, error.message);
          failed++;
          break;
        }
      } else {
        const id = typeof row.payload.id === 'string' ? row.payload.id : null;
        if (!id) {
          await removeOutbox(row.id);
          continue;
        }
        const { error } = await sb.from(row.table).delete().eq('id', id);
        if (error) {
          console.warn('[sync] delete failed', row.table, error.message);
          failed++;
          break;
        }
      }
      await removeOutbox(row.id);
      flushed++;
    } catch (e) {
      console.warn('[sync] flush exception', e);
      failed++;
      break;
    }
  }

  return { flushed, failed };
}

async function bulkUpsert<T>(
  table: OutboxTable,
  rows: T[],
  map: (row: T) => Record<string, unknown>,
): Promise<number> {
  if (!sb || rows.length === 0) return 0;
  let pushed = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(map);
    const { error } = await sb.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`push ${table}: ${error.message}`);
    pushed += chunk.length;
  }
  return pushed;
}

export async function pushLocalAll(): Promise<{ pushed: Record<string, number> }> {
  if (!sb || !(await isSignedIn())) {
    return { pushed: { tricks: 0, transitions: 0, sequences: 0, practice_log: 0 } };
  }

  const [tricks, transitions, sequences, logs] = await Promise.all([
    db.tricks.toArray(),
    db.transitions.toArray(),
    db.sequences.toArray(),
    db.practice_log.toArray(),
  ]);

  const pushed: Record<string, number> = {
    tricks: await bulkUpsert('tricks', tricks, (t) => mapTrickToServer(t) as unknown as Record<string, unknown>),
    transitions: await bulkUpsert('transitions', transitions, (t) =>
      mapTransitionToServer(t) as unknown as Record<string, unknown>,
    ),
    sequences: await bulkUpsert('sequences', sequences, (s) =>
      mapSequenceToServer(s) as unknown as Record<string, unknown>,
    ),
    practice_log: await bulkUpsert('practice_log', logs, (p) =>
      mapPracticeLogToServer(p) as unknown as Record<string, unknown>,
    ),
  };

  return { pushed };
}

export async function isServerEmpty(): Promise<boolean> {
  if (!sb) return false;
  const { count, error } = await sb
    .from('tricks')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(`server probe: ${error.message}`);
  return (count ?? 0) === 0;
}

export async function runStartupSync(): Promise<void> {
  if (!sb) return;
  if (!(await isSignedIn())) return;

  const auth = useAuthStore();
  auth.markSyncStart();
  try {
    const empty = await isServerEmpty();
    if (empty) {
      await pushLocalAll();
    } else {
      await pullAll();
      await flushOutbox();
    }
  } catch (e) {
    console.error('[sync]', e);
  } finally {
    auth.markSyncEnd();
  }
}

// ---- auto-flush wiring (idempotent across HMR) ----
let autoWired = false;

export function setupAutoFlush(): void {
  if (!sb) return;
  if (autoWired) return;
  autoWired = true;

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      void runStartupSync().catch((e) => console.warn('[sync] auto startup sync failed', e));
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      void flushOutbox().catch((e) => console.warn('[sync] online flush failed', e));
    });
  }
}
