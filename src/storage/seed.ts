import { db } from './dexie';
import type { CanonicalTrick, Sequence, SequenceStep, Transition } from '../domain/types';

// SeedTrick mirrors the old (pre-v5) Trick shape as found in seed-data.json.
// The seed file is NOT updated — the loader does the translation to CanonicalTrick.
interface SeedTrick {
  name: string;
  tier: number;
  category: string;
  entry: string;
  exit: string;
  lr: boolean;
  aliases?: string[];
  tags?: string[];
  icon?: string | null;
  video?: string | null;
  // per-user fields present in seed file (ignored on canonical write)
  status?: string;
  rate?: number | null;
  rateL?: number | null;
  rateR?: number | null;
  last?: string | null;
  fav?: boolean;
  mainAlias?: string | null;
  node_x?: number | null;
  node_y?: number | null;
}
interface SeedTransitionRaw {
  from: string;
  to: string;
  fromSide: 'L' | 'R' | null;
  toSide: 'L' | 'R' | null;
  bidi: boolean;
  rate: number | null;
  last: string | null;
}
interface SeedSequenceRaw {
  name: string;
  created: string;
  rate: number | null;
  last: string | null;
  steps: SequenceStep[];
}
interface SeedFile {
  exportedAt?: string;
  tricks: SeedTrick[];
  transitions: SeedTransitionRaw[];
  sequences?: SeedSequenceRaw[];
}

import { uuidv4 } from './uuid';

const newId = (): string => uuidv4();

export async function ensureSeeded(): Promise<void> {
  if (await db.tricks.count()) return;

  const base = import.meta.env.BASE_URL ?? '/';
  const res = await fetch(`${base}seed-data.json`);
  if (!res.ok) throw new Error(`failed to load seed-data.json: ${res.status}`);
  const seed = (await res.json()) as SeedFile;

  const idByName = new Map<string, string>();
  // Map old seed shape → CanonicalTrick (v5). Per-user fields from seed-data.json
  // (aliases, tags, icon, video, status, rate, fav, etc.) are translated into
  // the canonical default_* fields; the per-user fields are dropped.
  const tricks: CanonicalTrick[] = seed.tricks.map((t) => {
    const id = newId();
    idByName.set(t.name, id);
    const canonical: CanonicalTrick = {
      id,
      name: t.name,
      tier: t.tier as CanonicalTrick['tier'],
      category: t.category as CanonicalTrick['category'],
      entry: t.entry as CanonicalTrick['entry'],
      exit: t.exit as CanonicalTrick['exit'],
      lr: t.lr,
      createdBy: null,
      visibility: 'public',
      defaultAliases: t.aliases ?? [],
      defaultTags: t.tags ?? [],
      defaultIcon: t.icon ?? null,
      defaultVideo: t.video ?? null,
    };
    return canonical;
  });

  const transitions: Transition[] = seed.transitions
    .filter((e) => idByName.has(e.from) && idByName.has(e.to))
    .map((e) => ({
      id: newId(),
      from: idByName.get(e.from)!,
      to: idByName.get(e.to)!,
      fromSide: e.fromSide,
      toSide: e.toSide,
      bidi: e.bidi,
      rate: e.rate,
      last: e.last,
    }));

  const sequences: Sequence[] = (seed.sequences ?? []).map((s) => ({
    id: newId(),
    name: s.name,
    created: s.created,
    rate: s.rate,
    last: s.last,
    steps: s.steps,
  }));

  await db.transaction('rw', db.tricks, db.transitions, db.sequences, async () => {
    if (await db.tricks.count()) return;
    await db.tricks.bulkAdd(tricks);
    await db.transitions.bulkAdd(transitions);
    if (sequences.length) await db.sequences.bulkAdd(sequences);
  });
}
