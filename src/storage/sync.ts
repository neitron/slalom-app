import { getSb, reportSyncError } from './supabase';
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
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;
const CHUNK = 500;

async function signedInClient(): Promise<SupabaseClient | null> {
  const sb = await getSb();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ? sb : null;
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
async function fetchAll<T>(sb: SupabaseClient, table: OutboxTable): Promise<T[]> {
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
  const sb = await signedInClient();
  if (!sb) {
    return { tricks: 0, transitions: 0, sequences: 0, practice_log: 0 };
  }

  const pending = await collectPendingIds();

  const [trickRows, transitionRows, sequenceRows, logRows] = await Promise.all([
    fetchAll<TrickRow>(sb, 'tricks'),
    fetchAll<TransitionRow>(sb, 'transitions'),
    fetchAll<SequenceRow>(sb, 'sequences'),
    fetchAll<PracticeLogRow>(sb, 'practice_log'),
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
        if (tricks.length) {
          // Reconcile by natural key (name) — local seed assigns its own UUIDs.
          // Server is authoritative: delete any local trick whose name matches
          // a server trick with a different id, then bulkPut server rows.
          const incomingNames = new Set(tricks.map((t) => t.name));
          const incomingIds = new Set(tricks.map((t) => t.id!));
          const localByName = await db.tricks.where('name').anyOf([...incomingNames]).toArray();
          const toDelete = localByName
            .map((t) => t.id)
            .filter((id): id is string => !!id && !incomingIds.has(id));
          if (toDelete.length) await db.tricks.bulkDelete(toDelete);
          await db.tricks.bulkPut(tricks);
        }
        if (transitions.length) {
          // Reconcile by natural key (from+to+fromSide+toSide).
          const incomingIds = new Set(transitions.map((t) => t.id!));
          const key = (e: { from: string; to: string; fromSide: string | null; toSide: string | null }): string =>
            `${e.from}|${e.to}|${e.fromSide ?? ''}|${e.toSide ?? ''}`;
          const incomingKeys = new Set(transitions.map(key));
          const localEdges = await db.transitions.toArray();
          const toDelete = localEdges
            .filter((e) => e.id && !incomingIds.has(e.id) && incomingKeys.has(key(e)))
            .map((e) => e.id as string);
          if (toDelete.length) await db.transitions.bulkDelete(toDelete);
          await db.transitions.bulkPut(transitions);
        }
        if (sequences.length) await db.sequences.bulkPut(sequences);
        if (logs.length) await db.practice_log.bulkPut(logs);
      },
    );
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('slalom:pulled'));
  }

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
  const sb = await signedInClient();
  if (!sb) return { flushed: 0, failed: 0 };

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
          reportSyncError(`Push ${row.table}: ${error.message}`);
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
          reportSyncError(`Delete ${row.table}: ${error.message}`);
          failed++;
          break;
        }
      }
      await removeOutbox(row.id);
      flushed++;
    } catch (e) {
      console.warn('[sync] flush exception', e);
      reportSyncError(`Sync error: ${(e as Error).message}`);
      failed++;
      break;
    }
  }

  return { flushed, failed };
}

async function bulkUpsert<T>(
  sb: SupabaseClient,
  table: OutboxTable,
  rows: T[],
  map: (row: T) => Record<string, unknown>,
): Promise<number> {
  if (rows.length === 0) return 0;
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
  const sb = await signedInClient();
  if (!sb) {
    return { pushed: { tricks: 0, transitions: 0, sequences: 0, practice_log: 0 } };
  }

  const [tricks, transitions, sequences, logs] = await Promise.all([
    db.tricks.toArray(),
    db.transitions.toArray(),
    db.sequences.toArray(),
    db.practice_log.toArray(),
  ]);

  const pushed: Record<string, number> = {
    tricks: await bulkUpsert(sb, 'tricks', tricks, (t) => mapTrickToServer(t) as unknown as Record<string, unknown>),
    transitions: await bulkUpsert(sb, 'transitions', transitions, (t) =>
      mapTransitionToServer(t) as unknown as Record<string, unknown>,
    ),
    sequences: await bulkUpsert(sb, 'sequences', sequences, (s) =>
      mapSequenceToServer(s) as unknown as Record<string, unknown>,
    ),
    practice_log: await bulkUpsert(sb, 'practice_log', logs, (p) =>
      mapPracticeLogToServer(p) as unknown as Record<string, unknown>,
    ),
  };

  return { pushed };
}

export async function isServerEmpty(): Promise<boolean> {
  const sb = await getSb();
  if (!sb) return false;
  const { count, error } = await sb
    .from('tricks')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(`server probe: ${error.message}`);
  return (count ?? 0) === 0;
}

export async function runStartupSync(): Promise<void> {
  const sb = await signedInClient();
  if (!sb) return;

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
    reportSyncError(`Sync failed: ${(e as Error).message}`);
  } finally {
    auth.markSyncEnd();
  }
}

// ---- auto-flush wiring (idempotent across HMR) ----
let autoWired = false;
let flushTimer: number | null = null;
let pullTimer: number | null = null;

function scheduleFlush(delayMs = 600): void {
  if (typeof window === 'undefined') return;
  if (flushTimer != null) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushOutbox().catch((e) => {
      console.warn('[sync] auto flush failed', e);
      reportSyncError(`Auto-sync failed: ${(e as Error).message}`);
    });
  }, delayMs);
}

function schedulePull(delayMs = 400): void {
  if (typeof window === 'undefined') return;
  if (pullTimer != null) window.clearTimeout(pullTimer);
  pullTimer = window.setTimeout(() => {
    pullTimer = null;
    void pullAll().catch((e) => {
      console.warn('[sync] auto pull failed', e);
      reportSyncError(`Auto-pull failed: ${(e as Error).message}`);
    });
  }, delayMs);
}

// ---- realtime subscription (one channel per signed-in session) ----
type Channel = ReturnType<SupabaseClient['channel']>;
let realtimeChannel: Channel | null = null;

async function teardownRealtime(): Promise<void> {
  const sb = await getSb();
  if (realtimeChannel && sb) {
    await sb.removeChannel(realtimeChannel);
  }
  realtimeChannel = null;
}

async function startRealtime(): Promise<void> {
  const sb = await getSb();
  if (!sb) return;
  if (realtimeChannel) return;
  realtimeChannel = sb.channel('slalom-changes');
  for (const table of ['tricks', 'transitions', 'sequences', 'practice_log'] as const) {
    realtimeChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      () => schedulePull(),
    );
  }
  realtimeChannel.subscribe();
}

async function ensureRealtimeHealthy(): Promise<void> {
  const sb = await signedInClient();
  if (!sb) return;
  const state = realtimeChannel?.state;
  if (!realtimeChannel || state === 'closed' || state === 'errored') {
    await teardownRealtime();
    await startRealtime();
  }
}

export async function setupAutoFlush(): Promise<void> {
  const sb = await getSb();
  if (!sb) return;
  if (autoWired) return;
  autoWired = true;

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      void runStartupSync().catch((e) => {
        console.warn('[sync] auto startup sync failed', e);
        reportSyncError(`Sync failed: ${(e as Error).message}`);
      });
      void startRealtime().catch((e) => console.warn('[sync] realtime start failed', e));
    }
    if (event === 'SIGNED_OUT') {
      void teardownRealtime();
    }
  });

  // If already signed in at boot (refresh), kick realtime on.
  void signedInClient().then((ok) => { if (ok) void startRealtime(); });

  if (typeof window !== 'undefined') {
    const onResume = () => {
      scheduleFlush(50);
      schedulePull(50);
      void ensureRealtimeHealthy();
    };
    window.addEventListener('online', () => {
      void flushOutbox().catch((e) => {
        console.warn('[sync] online flush failed', e);
        reportSyncError(`Online sync failed: ${(e as Error).message}`);
      });
      schedulePull(50);
      void ensureRealtimeHealthy();
    });
    window.addEventListener('slalom:outbox-changed', () => scheduleFlush(400));
    window.addEventListener('focus', onResume);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onResume();
      });
    }
  }
}
