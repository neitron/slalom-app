import { getSb, reportSyncError } from './supabase';
import { db, clearAllUserProgress, clearCatalogRateFields } from './dexie';
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
  mapUserTrickProgressFromServer,
  mapUserTrickProgressToServer,
  mapProfileToServer,
  type TrickRow,
  type TransitionRow,
  type SequenceRow,
  type PracticeLogRow,
  type UserTrickProgressRow,
} from './fieldMap';
import { mergeTrick } from './progressMap';
import type {
  PracticeLog,
  Profile,
  Sequence,
  Transition,
  Trick,
  UserTrickProgress,
} from '../domain/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;
const CHUNK = 500;

async function signedInClient(): Promise<SupabaseClient | null> {
  const sb = await getSb();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ? sb : null;
}

async function currentUserId(): Promise<string | null> {
  const sb = await getSb();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

interface PendingIds {
  tricks: Set<string>;
  transitions: Set<string>;
  sequences: Set<string>;
  practice_log: Set<string>;
  user_trick_progress: Set<string>;
}

async function collectPendingIds(): Promise<PendingIds> {
  const rows = await listOutbox();
  const out: PendingIds = {
    tricks: new Set(),
    transitions: new Set(),
    sequences: new Set(),
    practice_log: new Set(),
    user_trick_progress: new Set(),
  };
  for (const r of rows) {
    if (r.table === 'user_trick_progress') {
      const k = (r.payload.trickId as string) ?? (r.payload.trick_id as string);
      if (k) out.user_trick_progress.add(k);
      continue;
    }
    const id = typeof r.payload.id === 'string' ? r.payload.id : null;
    if (!id) continue;
    if (
      r.table === 'tricks' ||
      r.table === 'transitions' ||
      r.table === 'sequences' ||
      r.table === 'practice_log'
    ) {
      out[r.table].add(id);
    }
  }
  return out;
}

async function fetchAll<T>(
  sb: SupabaseClient,
  table: string,
  filter?: { column: string; value: string },
): Promise<T[]> {
  const acc: T[] = [];
  let from = 0;
  while (true) {
    const to = from + PAGE - 1;
    let q = sb.from(table).select('*').range(from, to);
    if (filter) q = q.eq(filter.column, filter.value);
    const { data, error } = await q;
    if (error) throw new Error(`pull ${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    acc.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return acc;
}

function isMissingTable(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    (m.includes('relation') && m.includes('not found')) ||
    m.includes('not find the table')
  );
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
  const uid = await currentUserId();
  if (!uid) {
    return { tricks: 0, transitions: 0, sequences: 0, practice_log: 0 };
  }

  const pending = await collectPendingIds();

  let trickProgressRows: UserTrickProgressRow[] = [];
  let progressTablesMissing = false;

  try {
    trickProgressRows = await fetchAll<UserTrickProgressRow>(sb, 'user_trick_progress', {
      column: 'user_id',
      value: uid,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (isMissingTable(msg)) {
      progressTablesMissing = true;
      reportSyncError('Progress tables missing — run M3.5 migration in Supabase.');
    } else {
      throw e;
    }
  }

  const [trickRows, transitionRows, sequenceRows, logRows] = await Promise.all([
    fetchAll<TrickRow>(sb, 'tricks'),
    fetchAll<TransitionRow>(sb, 'transitions', { column: 'user_id', value: uid }),
    fetchAll<SequenceRow>(sb, 'sequences', { column: 'user_id', value: uid }),
    fetchAll<PracticeLogRow>(sb, 'practice_log'),
  ]);

  const trickProgressByTrickId = new Map<string, UserTrickProgress>();
  for (const r of trickProgressRows) {
    const p = mapUserTrickProgressFromServer(r);
    trickProgressByTrickId.set(p.trickId, p);
  }

  const catalogTricks = trickRows.map(mapTrickFromServer);
  const tricks: Trick[] = catalogTricks
    .map((t) => mergeTrick(t, t.id ? trickProgressByTrickId.get(t.id) : null))
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

  const serverTransitionIds = new Set(transitions.map((t) => t.id!));
  const serverSequenceIds = new Set(sequences.map((s) => s.id!));
  const serverLogIds = new Set(logs.map((l) => l.id!));
  const serverTrickProgressIds = new Set(
    [...trickProgressByTrickId.values()].map((p) => p.trickId),
  );

  const serverTrickIds = new Set(tricks.map((t) => t.id!));
  const serverTrickNamesLc = new Set(tricks.map((t) => t.name.toLowerCase()));

  await withoutOutbox(async () => {
    await db.transaction(
      'rw',
      [db.tricks, db.transitions, db.sequences, db.practice_log, db.user_trick_progress],
      async () => {
        if (tricks.length) {
          const localTricks = await db.tricks.toArray();
          const tricksToDrop = localTricks
            .filter((t) => t.id && !pending.tricks.has(t.id))
            .filter(
              (t) =>
                !serverTrickIds.has(t.id!) &&
                serverTrickNamesLc.has(t.name.toLowerCase()),
            )
            .map((t) => t.id!);
          if (tricksToDrop.length) await db.tricks.bulkDelete(tricksToDrop);
          await db.tricks.bulkPut(tricks);
        }

        const localTransitionIds = await db.transitions.toCollection().primaryKeys();
        const transitionsToDrop = (localTransitionIds as string[]).filter(
          (id) => !serverTransitionIds.has(id) && !pending.transitions.has(id),
        );
        if (transitionsToDrop.length) await db.transitions.bulkDelete(transitionsToDrop);
        if (transitions.length) await db.transitions.bulkPut(transitions);

        const localSequenceIds = await db.sequences.toCollection().primaryKeys();
        const sequencesToDrop = (localSequenceIds as string[]).filter(
          (id) => !serverSequenceIds.has(id) && !pending.sequences.has(id),
        );
        if (sequencesToDrop.length) await db.sequences.bulkDelete(sequencesToDrop);
        if (sequences.length) await db.sequences.bulkPut(sequences);

        const localLogIds = await db.practice_log.toCollection().primaryKeys();
        const logsToDrop = (localLogIds as string[]).filter(
          (id) => !serverLogIds.has(id) && !pending.practice_log.has(id),
        );
        if (logsToDrop.length) await db.practice_log.bulkDelete(logsToDrop);
        if (logs.length) await db.practice_log.bulkPut(logs);

        if (!progressTablesMissing) {
          const localProgressKeys = (await db.user_trick_progress
            .toCollection()
            .primaryKeys()) as Array<[string, string]>;
          const progressToDrop = localProgressKeys.filter(
            ([userId, trickId]) =>
              userId !== uid ||
              (!serverTrickProgressIds.has(trickId) &&
                !pending.user_trick_progress.has(trickId)),
          );
          if (progressToDrop.length) await db.user_trick_progress.bulkDelete(progressToDrop);

          const progressTricks: UserTrickProgress[] = [];
          for (const p of trickProgressByTrickId.values()) {
            if (!pending.user_trick_progress.has(p.trickId)) progressTricks.push(p);
          }
          if (progressTricks.length) await db.user_trick_progress.bulkPut(progressTricks);
        }
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
    case 'user_trick_progress':
      return mapUserTrickProgressToServer(
        payload as unknown as UserTrickProgress,
      ) as unknown as Record<string, unknown>;
    case 'profiles':
      return mapProfileToServer(
        payload as unknown as Profile,
      ) as unknown as Record<string, unknown>;
    case 'friendships':
    case 'user_blocks':
      return payload;
    default: {
      const _exhaustive: never = table;
      void _exhaustive;
      return payload;
    }
  }
}

function progressConflict(table: OutboxTable): string {
  switch (table) {
    case 'user_trick_progress':
      return 'user_id,trick_id';
    default:
      return 'id';
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
        const { error } = await sb
          .from(row.table)
          .upsert(serverRow, { onConflict: progressConflict(row.table) });
        if (error) {
          console.warn('[sync] upsert failed', row.table, error.message);
          if (isMissingTable(error.message)) {
            reportSyncError(`${row.table} not migrated yet — run M3.5 SQL.`);
          } else {
            reportSyncError(`Push ${row.table}: ${error.message}`);
          }
          failed++;
          break;
        }
      } else {
        if (row.table === 'user_trick_progress' || row.table === 'user_blocks') {
          await removeOutbox(row.id);
          continue;
        }
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
  onConflict = 'id',
): Promise<number> {
  if (rows.length === 0) return 0;
  let pushed = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(map);
    const { error } = await sb.from(table).upsert(chunk, { onConflict });
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
    tricks: await bulkUpsert(sb, 'tricks', tricks, (t) =>
      mapTrickToServer(t) as unknown as Record<string, unknown>,
    ),
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

export async function pushOwnProgressFromCatalog(): Promise<void> {
  const sb = await signedInClient();
  if (!sb) return;
  const uid = await currentUserId();
  if (!uid) return;

  const tricks = await db.tricks.toArray();

  const trickProgress: UserTrickProgress[] = tricks
    .filter((t) => t.id && (t.rate != null || t.rateL != null || t.rateR != null || t.last != null || t.fav))
    .map((t) => ({
      userId: uid,
      trickId: t.id!,
      rate: t.lr ? null : t.rate,
      rateL: t.lr ? t.rateL : null,
      rateR: t.lr ? t.rateR : null,
      last: t.last,
      status: t.status,
      fav: t.fav,
      lrEnabled: !!t.lr,
      updatedAt: new Date().toISOString(),
    }));

  try {
    await bulkUpsert(
      sb,
      'user_trick_progress',
      trickProgress,
      (p) => mapUserTrickProgressToServer(p) as unknown as Record<string, unknown>,
      'user_id,trick_id',
    );
    await withoutOutbox(async () => {
      await db.transaction('rw', db.user_trick_progress, async () => {
        if (trickProgress.length) await db.user_trick_progress.bulkPut(trickProgress);
      });
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`slalom.progressPushed.${uid}`, '1');
    }
  } catch (e) {
    console.warn('[sync] pushOwnProgressFromCatalog failed', e);
  }
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

function shouldPushOwnProgress(uid: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return !localStorage.getItem(`slalom.progressPushed.${uid}`);
}

export async function runStartupSync(): Promise<void> {
  const sb = await signedInClient();
  if (!sb) return;

  const auth = useAuthStore();
  auth.markSyncStart();
  try {
    const uid = await currentUserId();
    if (uid && shouldPushOwnProgress(uid)) {
      await pushOwnProgressFromCatalog();
    }
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

type Channel = ReturnType<SupabaseClient['channel']>;
const channels: Channel[] = [];

export async function teardownRealtime(): Promise<void> {
  const sb = await getSb();
  if (!sb) {
    channels.length = 0;
    return;
  }
  for (const c of channels) {
    try {
      await sb.removeChannel(c);
    } catch {
      /* ignore */
    }
  }
  channels.length = 0;
}

function dispatchMetaRefresh(kind: 'profile' | 'friendship' | 'block'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('slalom:social-changed', { detail: { kind } }));
}

export async function startRealtime(): Promise<void> {
  const sb = await signedInClient();
  if (!sb) return;
  if (channels.length) return;
  const uid = await currentUserId();
  if (!uid) return;

  const c1 = sb.channel('slalom-catalog');
  c1.on('postgres_changes', { event: '*', schema: 'public', table: 'tricks' }, () =>
    schedulePull(),
  );
  c1.subscribe();
  channels.push(c1);

  const c2 = sb.channel('slalom-own');
  for (const table of [
    'transitions',
    'sequences',
    'user_trick_progress',
    'practice_log',
  ] as const) {
    c2.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${uid}` },
      () => schedulePull(),
    );
  }
  c2.subscribe();
  channels.push(c2);

  const c3 = sb.channel('slalom-profile');
  c3.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
    () => dispatchMetaRefresh('profile'),
  );
  c3.subscribe();
  channels.push(c3);

  const c4 = sb.channel('slalom-friendship-req');
  c4.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${uid}` },
    () => dispatchMetaRefresh('friendship'),
  );
  c4.subscribe();
  channels.push(c4);

  const c5 = sb.channel('slalom-friendship-addr');
  c5.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${uid}` },
    () => dispatchMetaRefresh('friendship'),
  );
  c5.subscribe();
  channels.push(c5);

  const c6 = sb.channel('slalom-blocks-er');
  c6.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'user_blocks', filter: `blocker_id=eq.${uid}` },
    () => dispatchMetaRefresh('block'),
  );
  c6.subscribe();
  channels.push(c6);

  const c7 = sb.channel('slalom-blocks-ed');
  c7.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'user_blocks', filter: `blocked_id=eq.${uid}` },
    () => dispatchMetaRefresh('block'),
  );
  c7.subscribe();
  channels.push(c7);
}

async function ensureRealtimeHealthy(): Promise<void> {
  const sb = await signedInClient();
  if (!sb) return;
  const dead = channels.find((c) => c.state === 'closed' || c.state === 'errored');
  if (!channels.length || dead) {
    await teardownRealtime();
    await startRealtime();
  }
}

export async function onSignedOutCleanup(): Promise<void> {
  await teardownRealtime();
  await clearAllUserProgress();
  await clearCatalogRateFields();
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
      void onSignedOutCleanup();
    }
  });

  void signedInClient().then((ok) => {
    if (ok) void startRealtime();
  });

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
