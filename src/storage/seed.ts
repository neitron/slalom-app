import { db } from './dexie';
import type { Sequence, SequenceStep, Transition, Trick } from '../domain/types';

interface SeedTrick extends Omit<Trick, 'id'> {}
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
  const tricks: Trick[] = seed.tricks.map((t) => {
    const id = newId();
    idByName.set(t.name, id);
    return { ...t, id };
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
