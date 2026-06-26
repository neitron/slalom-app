import type { GenFilter, Rng, Side, SequenceStep, Transition, Trick } from './types';
import { GEN_LIMITS } from './constants';
import { hasRate } from './rating';
import { sideOk } from './edges';

const defaultRng: Rng = Math.random;

function pickOne<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** For LR tricks, pick L or R at random; for non-LR, stay null. */
function pickSide(t: Trick | undefined, rng: Rng): Side {
  if (!t?.lr) return null;
  return rng() < 0.5 ? 'L' : 'R';
}

/** Build a lookup that matches a trick by either its id OR its name. */
function buildTrickKeyMap(tricks: Trick[]): Map<string, Trick> {
  const m = new Map<string, Trick>();
  for (const t of tricks) {
    m.set(t.name, t);
    if (t.id) m.set(t.id, t);
  }
  return m;
}

export function sample<T>(arr: T[], n: number, rng: Rng = defaultRng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function passesFilter(t: Trick, st: GenFilter): boolean {
  if (st.tier && t.tier > st.tier) return false;
  if (st.exCats.includes(t.category)) return false;
  if (t.tags.some((tag) => st.exTags.includes(tag))) return false;
  return true;
}

export interface GraphWalkOpts {
  n: number;
  pool: Trick[];
  edges: Transition[];
  filter: GenFilter;
  rng?: Rng;
}

interface AdjEdge {
  to: string;
  fromSide: Transition['fromSide'];
  toSide: Transition['toSide'];
}

export function graphWalk(opts: GraphWalkOpts): SequenceStep[] | null {
  const rng = opts.rng ?? defaultRng;
  const candidates = opts.pool.filter((t) => passesFilter(t, opts.filter));
  // Edges in storage use trick IDs; tests/seed sometimes use names.
  // Build a map that resolves either to the same trick, then key the
  // adjacency list by the canonical trick *name* (matches SequenceStep
  // expectations downstream).
  const byKey = buildTrickKeyMap(candidates);
  const adj: Record<string, AdjEdge[]> = {};
  for (const e of opts.edges) {
    const fromT = byKey.get(e.from);
    const toT = byKey.get(e.to);
    if (!fromT || !toT) continue;
    (adj[fromT.name] = adj[fromT.name] || []).push({ to: toT.name, fromSide: e.fromSide, toSide: e.toSide });
    if (e.bidi) {
      (adj[toT.name] = adj[toT.name] || []).push({ to: fromT.name, fromSide: e.toSide, toSide: e.fromSide });
    }
  }
  const starts = Object.keys(adj);
  if (!starts.length) return null;
  const firstName = pickOne(starts, rng);
  const firstTrick = byKey.get(firstName);
  const first: SequenceStep = { name: firstName, side: pickSide(firstTrick, rng) };
  const steps: SequenceStep[] = [first];
  let cur = first;
  while (steps.length < opts.n) {
    const cand = (adj[cur.name] || []).filter((o) => sideOk(o.fromSide, cur.side));
    if (!cand.length) break;
    const fresh = cand.filter((o) => !steps.some((s) => s.name === o.to));
    const pick = pickOne(fresh.length ? fresh : cand, rng);
    if (pick.fromSide && !cur.side) cur.side = pick.fromSide;
    const nextTrick = byKey.get(pick.to);
    // Edge's toSide wins if specified; otherwise random L/R if the trick
    // is LR; null for non-LR tricks.
    const side: Side = pick.toSide ?? pickSide(nextTrick, rng);
    const next: SequenceStep = { name: pick.to, side };
    steps.push(next);
    cur = next;
  }
  return steps.length >= 2 ? steps : null;
}

export interface KnownShuffleOpts {
  n: number;
  tricks: Trick[];
  filter: GenFilter;
  rng?: Rng;
}

export function knownShuffle(opts: KnownShuffleOpts): SequenceStep[] | null {
  const rng = opts.rng ?? defaultRng;
  const pool = opts.tricks.filter((t) => hasRate(t) && passesFilter(t, opts.filter));
  if (pool.length < 2) return null;
  const n = Math.min(opts.n, GEN_LIMITS.known);
  return sample(pool, n, rng).map((t) => ({ name: t.name, side: pickSide(t, rng) }));
}

export interface TotallyRandomOpts {
  n: number;
  tricks: Trick[];
  filter: GenFilter;
  rng?: Rng;
}

export function totallyRandom(opts: TotallyRandomOpts): SequenceStep[] | null {
  const rng = opts.rng ?? defaultRng;
  const n = Math.min(opts.n, GEN_LIMITS.random);
  const pool = opts.tricks.filter((t) => passesFilter(t, opts.filter));
  if (pool.length < 2) return null;
  if (!opts.filter.stance) {
    return sample(pool, n, rng).map((t) => ({ name: t.name, side: pickSide(t, rng) }));
  }
  let cur = pickOne(pool, rng);
  const used = new Set<string>([cur.name]);
  const steps: SequenceStep[] = [{ name: cur.name, side: pickSide(cur, rng) }];
  while (steps.length < n) {
    const unused = pool.filter((t) => !used.has(t.name));
    if (!unused.length) break;
    const matching = unused.filter((t) => t.entry === cur.exit);
    cur = pickOne(matching.length ? matching : unused, rng);
    used.add(cur.name);
    steps.push({ name: cur.name, side: pickSide(cur, rng) });
  }
  return steps.length >= 2 ? steps : null;
}
