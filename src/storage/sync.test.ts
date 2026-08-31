import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Supabase boundary. The real module reads import.meta.env and lazily
// imports @supabase/supabase-js; here we hand sync.ts a fully in-memory fake so
// we can drive push/pull deterministically.
// ---------------------------------------------------------------------------

const UID = 'user-1';

interface TableBehavior {
  // Rows returned by SELECT (used by pullAll's fetchAll).
  select?: () => Promise<Record<string, unknown>[]>;
  // Error returned by UPSERT / DELETE (null = success).
  upsertError?: { message: string } | null;
  deleteError?: { message: string } | null;
}

const behaviors: Record<string, TableBehavior> = {};
const upserts: Array<{ table: string; row: Record<string, unknown> }> = [];

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = { _table: table, _op: 'select' };
  const chain = () => builder;
  builder.select = chain;
  builder.range = chain;
  builder.eq = chain;
  builder.not = chain;
  builder.upsert = (row: Record<string, unknown>) => {
    builder._op = 'upsert';
    upserts.push({ table, row });
    return builder;
  };
  builder.delete = () => {
    builder._op = 'delete';
    return builder;
  };
  builder.then = (
    onF: (v: { data: unknown; error: unknown }) => unknown,
    onR?: (e: unknown) => unknown,
  ) => {
    const b = behaviors[table] ?? {};
    let p: Promise<{ data: unknown; error: unknown }>;
    if (builder._op === 'upsert') {
      p = Promise.resolve({ data: null, error: b.upsertError ?? null });
    } else if (builder._op === 'delete') {
      p = Promise.resolve({ data: null, error: b.deleteError ?? null });
    } else {
      p = (b.select ? b.select() : Promise.resolve([])).then((rows) => ({
        data: rows,
        error: null,
      }));
    }
    return p.then(onF, onR);
  };
  return builder;
}

const fakeSb = {
  auth: {
    getSession: () =>
      Promise.resolve({ data: { session: { user: { id: UID } } } }),
  },
  from: (table: string) => makeBuilder(table),
};

vi.mock('./supabase', () => ({
  getSb: () => Promise.resolve(fakeSb),
  reportSyncError: () => {},
  supabaseConfigured: () => true,
}));

// Imported AFTER the mock is registered.
import { db } from './dexie';
import { enqueue, listOutbox } from './outbox';
import { flushOutbox, pullAll } from './sync';

beforeEach(async () => {
  upserts.length = 0;
  for (const k of Object.keys(behaviors)) delete behaviors[k];
  await Promise.all([
    db.tricks.clear(),
    db.transitions.clear(),
    db.sequences.clear(),
    db.practice_log.clear(),
    db.user_trick_progress.clear(),
    db.outbox.clear(),
  ]);
});

describe('flushOutbox — one poisoned entry must not block the queue', () => {
  it('syncs the emoji edit that sits behind a failing trick push', async () => {
    // A transition push that the server rejects (e.g. RLS/FK) — this is the poison.
    await enqueue('upsert', 'transitions', {
      id: 'tr-bad',
      from: 'a',
      to: 'b',
      fromSide: null,
      toSide: null,
      bidi: false,
      rate: null,
      last: null,
    });
    // An overlay edit (emoji) queued AFTER the poison.
    await enqueue('upsert', 'user_trick_progress', {
      userId: UID,
      trickId: 't-ok',
      iconOverride: '∞',
      aliases: [],
      tags: [],
      mainAlias: null,
    });
    // A sequence queued after that too.
    await enqueue('upsert', 'sequences', { id: 's-ok', name: 'Seq', steps: [] });

    behaviors.transitions = { upsertError: { message: 'row-level security violation' } };
    behaviors.user_trick_progress = { upsertError: null };
    behaviors.sequences = { upsertError: null };

    const res = await flushOutbox();

    // The two good rows synced; the poison stayed queued for retry.
    expect(res.flushed).toBe(2);
    expect(res.failed).toBe(1);

    const overlayPush = upserts.find((u) => u.table === 'user_trick_progress');
    expect(overlayPush?.row).toMatchObject({ icon_override: '∞' });

    const remaining = await listOutbox();
    expect(remaining.map((r) => r.table)).toEqual(['transitions']);
  });
});

describe('pullAll — a local write during the fetch window must survive', () => {
  it('keeps a sequence that was saved while the pull was in flight', async () => {
    // A sequence the user just generated: present in Dexie, and its outbox
    // entry is created *during* the pull's network fetch (simulated below).
    const seq = { id: 's-live', name: 'Fresh', created: '2026-07-07', rate: null, last: null, steps: [] };
    await db.sequences.put(seq);

    let enqueued = false;
    behaviors.sequences = {
      select: async () => {
        // Server has no record of this brand-new sequence yet...
        if (!enqueued) {
          enqueued = true;
          // ...and the user's save lands mid-fetch, queuing an outbox entry.
          await enqueue('upsert', 'sequences', seq);
        }
        return [];
      },
    };

    await pullAll();

    // Reconcile must treat the mid-fetch write as pending and NOT drop it.
    const still = await db.sequences.get('s-live');
    expect(still).toBeTruthy();
  });
});

const CANONICAL_NO_LR = {
  id: 't-nolr',
  createdBy: null,
  visibility: 'public',
  name: 'Backwards Nelson Reverse',
  tier: 2,
  category: 'cross',
  entry: '2/f',
  exit: '2/f',
  lr: false,
  defaultAliases: [],
  defaultTags: [],
  defaultIcon: null,
  defaultVideo: null,
};

const STALE_SIDE_ENTRY = {
  userId: UID,
  trickId: 't-nolr',
  rate: 3,
  rateL: 4,
  rateR: 2,
  last: null,
  status: 'In Progress',
  fav: false,
};

describe('flushOutbox — pending side rates are reconciled with per-user L/R', () => {
  it('drops sides queued for a trick whose L/R the user has since turned off', async () => {
    await db.tricks.put(CANONICAL_NO_LR as never);
    await enqueue('upsert', 'user_trick_progress', STALE_SIDE_ENTRY);
    behaviors.user_trick_progress = { upsertError: null };

    const res = await flushOutbox();

    expect(res.failed).toBe(0);
    const push = upserts.find((u) => u.table === 'user_trick_progress');
    expect(push?.row).toMatchObject({
      trick_id: 't-nolr',
      rate: 3,
      rate_l: null,
      rate_r: null,
      lr_enabled: false,
    });
    expect(await listOutbox()).toEqual([]);
  });

  it('keeps sides — and declares lr_enabled — when the user enabled L/R locally', async () => {
    // The catalog row still says lr = false and the user cannot change it
    // (tricks_update RLS); the overlay is what makes the sides legal.
    await db.tricks.put(CANONICAL_NO_LR as never);
    await db.user_trick_progress.put({
      ...STALE_SIDE_ENTRY,
      rate: null,
      lrEnabled: true,
      aliases: [],
      tags: [],
      mainAlias: null,
      iconOverride: null,
      videoOverride: null,
      nodeX: null,
      nodeY: null,
    } as never);
    await enqueue('upsert', 'user_trick_progress', STALE_SIDE_ENTRY);
    behaviors.user_trick_progress = { upsertError: null };

    const res = await flushOutbox();

    expect(res.failed).toBe(0);
    const push = upserts.find((u) => u.table === 'user_trick_progress');
    expect(push?.row).toMatchObject({
      trick_id: 't-nolr',
      rate: null,
      rate_l: 4,
      rate_r: 2,
      lr_enabled: true,
    });
    expect(await listOutbox()).toEqual([]);
  });
});
