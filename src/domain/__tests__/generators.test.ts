import { describe, expect, it } from 'vitest';
import { graphWalk, knownShuffle, passesFilter, sample, totallyRandom } from '../generators';
import type { GenFilter, Rng, Transition, Trick } from '../types';

const mkTrick = (overrides: Partial<Trick> = {}): Trick => ({
  name: overrides.name ?? 'T',
  tier: 1,
  category: 'forward',
  entry: '2/f',
  exit: '2/f',
  lr: false,
  rate: null,
  rateL: null,
  rateR: null,
  last: null,
  status: 'Not Started',
  aliases: [],
  video: null,
  icon: null,
  tags: [],
  fav: false,
  ...overrides,
});

// Deterministic RNG: cycles through provided values
const seqRng = (values: number[]): Rng => {
  let i = 0;
  return () => values[i++ % values.length];
};

const defaultFilter: GenFilter = { tier: 0, exCats: [], exTags: [] };

describe('passesFilter', () => {
  it('allows everything with empty filter', () => {
    expect(passesFilter(mkTrick(), defaultFilter)).toBe(true);
  });

  it('rejects when tier exceeds max', () => {
    expect(passesFilter(mkTrick({ tier: 4 }), { ...defaultFilter, tier: 3 })).toBe(false);
    expect(passesFilter(mkTrick({ tier: 3 }), { ...defaultFilter, tier: 3 })).toBe(true);
  });

  it('rejects excluded categories', () => {
    expect(passesFilter(mkTrick({ category: 'spin' }), { ...defaultFilter, exCats: ['spin'] })).toBe(false);
  });

  it('rejects when any tag is excluded', () => {
    expect(passesFilter(mkTrick({ tags: ['toe', 'jump'] }), { ...defaultFilter, exTags: ['jump'] })).toBe(false);
  });
});

describe('sample', () => {
  it('returns at most n items', () => {
    const out = sample([1, 2, 3, 4, 5], 3, seqRng([0, 0, 0, 0, 0]));
    expect(out).toHaveLength(3);
  });

  it('preserves source array (no mutation)', () => {
    const src = [1, 2, 3];
    sample(src, 2, seqRng([0.5]));
    expect(src).toEqual([1, 2, 3]);
  });
});

describe('totallyRandom', () => {
  const pool = [
    mkTrick({ name: 'A' }),
    mkTrick({ name: 'B' }),
    mkTrick({ name: 'C' }),
    mkTrick({ name: 'D' }),
    mkTrick({ name: 'E' }),
    mkTrick({ name: 'F' }),
    mkTrick({ name: 'G' }),
    mkTrick({ name: 'H' }),
    mkTrick({ name: 'I' }),
    mkTrick({ name: 'J' }),
  ];

  it('enforces hard cap N ≤ 8', () => {
    const out = totallyRandom({ n: 100, tricks: pool, filter: defaultFilter, rng: seqRng([0]) });
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(8);
  });

  it('returns null when pool too small', () => {
    const out = totallyRandom({ n: 4, tricks: [mkTrick({ name: 'only' })], filter: defaultFilter });
    expect(out).toBeNull();
  });

  it('all sides start null', () => {
    const out = totallyRandom({ n: 3, tricks: pool, filter: defaultFilter, rng: seqRng([0]) });
    expect(out!.every((s) => s.side === null)).toBe(true);
  });

  it('stance mode prefers matching entry to previous exit', () => {
    const tricks = [
      mkTrick({ name: 'fwd1', entry: '2/f', exit: '2/f' }),
      mkTrick({ name: 'fwd2', entry: '2/f', exit: '2/f' }),
      mkTrick({ name: 'back1', entry: '2/b', exit: '2/b' }),
    ];
    // rng=0 picks first element every time → starts with fwd1, then fwd2 matches
    const out = totallyRandom({
      n: 3,
      tricks,
      filter: { ...defaultFilter, stance: true },
      rng: seqRng([0]),
    });
    expect(out).not.toBeNull();
    expect(out![0].name).toBe('fwd1');
    expect(out![1].name).toBe('fwd2');
  });
});

describe('knownShuffle', () => {
  it('returns null when fewer than 2 practiced', () => {
    const out = knownShuffle({ n: 3, tricks: [mkTrick({ rate: 3 })], filter: defaultFilter });
    expect(out).toBeNull();
  });

  it('only includes practiced tricks', () => {
    const tricks = [
      mkTrick({ name: 'A', rate: 3 }),
      mkTrick({ name: 'B', rate: 4 }),
      mkTrick({ name: 'C' }), // unrated
    ];
    const out = knownShuffle({ n: 3, tricks, filter: defaultFilter, rng: seqRng([0]) });
    expect(out!.length).toBe(2);
    expect(out!.every((s) => s.name === 'A' || s.name === 'B')).toBe(true);
  });
});

describe('graphWalk', () => {
  const tricks = [
    mkTrick({ name: 'A' }),
    mkTrick({ name: 'B' }),
    mkTrick({ name: 'C' }),
  ];

  const mkEdge = (o: Partial<Transition>): Transition => ({
    from: 'A',
    to: 'B',
    fromSide: null,
    toSide: null,
    bidi: false,
    rate: null,
    last: null,
    ...o,
  });

  it('returns null when no edges exist among pool', () => {
    const out = graphWalk({ n: 4, pool: tricks, edges: [], filter: defaultFilter });
    expect(out).toBeNull();
  });

  it('returns ≥ 2 step sequence', () => {
    const edges = [mkEdge({ from: 'A', to: 'B' }), mkEdge({ from: 'B', to: 'C' })];
    const out = graphWalk({ n: 4, pool: tricks, edges, filter: defaultFilter, rng: seqRng([0]) });
    expect(out).not.toBeNull();
    expect(out!.length).toBeGreaterThanOrEqual(2);
  });

  it('walks bidi edges in both directions', () => {
    const edges = [mkEdge({ from: 'A', to: 'B', bidi: true })];
    // Start at index 0 → 'A' (or 'B' depending on Object.keys order). Either way reach the other.
    const out = graphWalk({ n: 2, pool: tricks, edges, filter: defaultFilter, rng: seqRng([0]) });
    expect(out).not.toBeNull();
    expect(out!.length).toBe(2);
    const names = out!.map((s) => s.name).sort();
    expect(names).toEqual(['A', 'B']);
  });

  it('respects leg constraints on subsequent steps', () => {
    // A(L)->B(R) edge; walk from A should set side to L then arrive at B with side R.
    const edges = [mkEdge({ from: 'A', to: 'B', fromSide: 'L', toSide: 'R' })];
    const out = graphWalk({ n: 2, pool: [tricks[0], tricks[1]], edges, filter: defaultFilter, rng: seqRng([0]) });
    expect(out).not.toBeNull();
    expect(out![0]).toEqual({ name: 'A', side: 'L' });
    expect(out![1]).toEqual({ name: 'B', side: 'R' });
  });

  it('filters out tricks via shared filter', () => {
    const edges = [mkEdge({ from: 'A', to: 'B' })];
    const filter: GenFilter = { tier: 0, exCats: ['forward'], exTags: [] };
    const out = graphWalk({ n: 4, pool: tricks, edges, filter });
    expect(out).toBeNull();
  });
});
