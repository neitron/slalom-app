import type { GenFilter, Rng, SequenceStep, Transition, Trick } from './types';
import { GEN_LIMITS } from './constants';
import { hasRate } from './rating';
import { sideOk } from './edges';

const defaultRng: Rng = Math.random;

function pickOne<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
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
  const names = new Set(candidates.map((t) => t.name));
  const adj: Record<string, AdjEdge[]> = {};
  for (const e of opts.edges) {
    if (!names.has(e.from) || !names.has(e.to)) continue;
    (adj[e.from] = adj[e.from] || []).push({ to: e.to, fromSide: e.fromSide, toSide: e.toSide });
    if (e.bidi) {
      (adj[e.to] = adj[e.to] || []).push({ to: e.from, fromSide: e.toSide, toSide: e.fromSide });
    }
  }
  const starts = Object.keys(adj);
  if (!starts.length) return null;
  const first: SequenceStep = { name: pickOne(starts, rng), side: null };
  const steps: SequenceStep[] = [first];
  let cur = first;
  while (steps.length < opts.n) {
    const cand = (adj[cur.name] || []).filter((o) => sideOk(o.fromSide, cur.side));
    if (!cand.length) break;
    const fresh = cand.filter((o) => !steps.some((s) => s.name === o.to));
    const pick = pickOne(fresh.length ? fresh : cand, rng);
    if (pick.fromSide && !cur.side) cur.side = pick.fromSide;
    const next: SequenceStep = { name: pick.to, side: pick.toSide ?? null };
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
  return sample(pool, n, rng).map((t) => ({ name: t.name, side: null }));
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
    return sample(pool, n, rng).map((t) => ({ name: t.name, side: null }));
  }
  let cur = pickOne(pool, rng);
  const used = new Set<string>([cur.name]);
  const steps: SequenceStep[] = [{ name: cur.name, side: null }];
  while (steps.length < n) {
    const unused = pool.filter((t) => !used.has(t.name));
    if (!unused.length) break;
    const matching = unused.filter((t) => t.entry === cur.exit);
    cur = pickOne(matching.length ? matching : unused, rng);
    used.add(cur.name);
    steps.push({ name: cur.name, side: null });
  }
  return steps.length >= 2 ? steps : null;
}
