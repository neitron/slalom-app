/**
 * storage.js — offline-first storage skeleton: Dexie (IndexedDB) cache + Supabase sync.
 * Phase 0 can run with SUPABASE_URL unset → pure local mode (seed + export/import).
 */
import Dexie from "dexie";
import { createClient } from "@supabase/supabase-js";

// ---------- local cache ----------
export const db = new Dexie("slalom");
db.version(1).stores({
  tricks: "id, name, tier, category",
  transitions: "id, from_trick, to_trick",
  sequences: "id, created",
  practice_log: "id, at",
  outbox: "++seq",           // queued mutations awaiting sync
  meta: "key",               // lastSyncAt, seeded flag, etc.
});

// ---------- seed (first run, or "re-seed" in Settings) ----------
export async function seedIfEmpty() {
  if (await db.tricks.count()) return;
  const seed = await fetch(import.meta.env.BASE_URL + "seed-data.json").then(r => r.json());
  const idByName = {};
  const tricks = seed.tricks.map(t => {
    const id = crypto.randomUUID();
    idByName[t.name] = id;
    return {
      id, name: t.name, tier: t.tier, category: t.category,
      entry: t.entry, exit: t.exit, lr: t.lr,
      rate: t.rate, rate_l: t.rateL, rate_r: t.rateR,
      last_practiced: t.last, status: t.status,
      aliases: t.aliases, video: t.video, icon: t.icon, tags: t.tags, fav: t.fav,
    };
  });
  const transitions = seed.transitions
    .filter(e => idByName[e.from] && idByName[e.to])
    .map(e => ({
      id: crypto.randomUUID(),
      from_trick: idByName[e.from], to_trick: idByName[e.to],
      from_side: e.fromSide, to_side: e.toSide, bidi: e.bidi,
      rate: e.rate, last_practiced: e.last,
    }));
  await db.transaction("rw", db.tricks, db.transitions, async () => {
    await db.tricks.bulkAdd(tricks);
    await db.transitions.bulkAdd(transitions);
  });
}

// ---------- mutations: local write + outbox ----------
/** op: { table, type: 'upsert'|'delete', row } */
export async function mutate(op) {
  await db.transaction("rw", db[op.table], db.outbox, async () => {
    if (op.type === "upsert") await db[op.table].put(op.row);
    else await db[op.table].delete(op.row.id);
    await db.outbox.add({ ...op, at: Date.now() });
  });
  void flushOutbox(); // fire and forget; retried on next start/online event
}

// ---------- supabase sync ----------
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = SUPABASE_URL ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;
export const cloudEnabled = () => !!supabase;

export async function flushOutbox() {
  if (!supabase || !navigator.onLine) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const ops = await db.outbox.orderBy("seq").toArray();
  for (const op of ops) {
    const q = op.type === "upsert"
      ? supabase.from(op.table).upsert(stripLocal(op.row))
      : supabase.from(op.table).delete().eq("id", op.row.id);
    const { error } = await q;
    if (error) { console.warn("sync stalled:", error.message); return; } // keep op, retry later
    await db.outbox.delete(op.seq);
  }
  await pullAll();
}

/** Server is source of truth once outbox is empty. */
export async function pullAll() {
  if (!supabase) return;
  for (const table of ["tricks", "transitions", "sequences", "practice_log"]) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) { console.warn(error.message); continue; }
    await db.transaction("rw", db[table], async () => {
      await db[table].clear();
      await db[table].bulkAdd(data);
    });
  }
  await db.meta.put({ key: "lastSyncAt", value: Date.now() });
}

const stripLocal = (row) => row; // placeholder if local-only fields appear later

// ---------- lifecycle ----------
export async function initStorage() {
  await seedIfEmpty();
  if (supabase) {
    window.addEventListener("online", () => void flushOutbox());
    void flushOutbox();
  }
}

// ---------- export / import (Settings; also the local-mode backup story) ----------
export async function exportJson() {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    tricks: await db.tricks.toArray(),
    transitions: await db.transitions.toArray(),
    sequences: await db.sequences.toArray(),
    practice_log: await db.practice_log.toArray(),
  }, null, 2);
}

export async function importJson(text) {
  const data = JSON.parse(text);
  await db.transaction("rw", db.tricks, db.transitions, db.sequences, db.practice_log, async () => {
    for (const t of ["tricks", "transitions", "sequences", "practice_log"]) {
      await db[t].clear();
      await db[t].bulkAdd(data[t] || []);
    }
  });
}
