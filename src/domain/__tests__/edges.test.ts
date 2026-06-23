import { describe, expect, it } from 'vitest';
import { edgeMatches, hasEdgeStep, isDuplicateEdge, sideOk } from '../edges';
import type { Transition } from '../types';

const edge = (overrides: Partial<Transition> = {}): Transition => ({
  from: 'A',
  to: 'B',
  fromSide: null,
  toSide: null,
  bidi: false,
  rate: null,
  last: null,
  ...overrides,
});

describe('sideOk truth table', () => {
  it('null edgeSide matches anything', () => {
    expect(sideOk(null, 'L')).toBe(true);
    expect(sideOk(null, 'R')).toBe(true);
    expect(sideOk(null, null)).toBe(true);
  });

  it('null step side matches any edge', () => {
    expect(sideOk('L', null)).toBe(true);
    expect(sideOk('R', null)).toBe(true);
  });

  it('matches when sides are equal', () => {
    expect(sideOk('L', 'L')).toBe(true);
    expect(sideOk('R', 'R')).toBe(true);
  });

  it('rejects when sides differ', () => {
    expect(sideOk('L', 'R')).toBe(false);
    expect(sideOk('R', 'L')).toBe(false);
  });
});

describe('edgeMatches', () => {
  it('matches forward direction', () => {
    const e = edge({ from: 'A', to: 'B', fromSide: 'L', toSide: 'R' });
    expect(edgeMatches(e, 'A', 'L', 'B', 'R')).toBe(true);
    expect(edgeMatches(e, 'A', 'L', 'B', null)).toBe(true);
  });

  it('rejects wrong direction when not bidi', () => {
    const e = edge({ from: 'A', to: 'B', bidi: false });
    expect(edgeMatches(e, 'B', null, 'A', null)).toBe(false);
  });

  it('bidi matches reversed with swapped sides', () => {
    const e = edge({ from: 'A', to: 'B', fromSide: 'L', toSide: 'R', bidi: true });
    // reverse: walking B(R) -> A(L) corresponds to swapping endpoints AND swapping sides
    expect(edgeMatches(e, 'B', 'R', 'A', 'L')).toBe(true);
    // reversed with side mismatch
    expect(edgeMatches(e, 'B', 'L', 'A', 'R')).toBe(false);
  });

  it('bidi does not match if names wrong', () => {
    const e = edge({ from: 'A', to: 'B', bidi: true });
    expect(edgeMatches(e, 'C', null, 'A', null)).toBe(false);
  });

  it('self-loop matches on same trick', () => {
    const e = edge({ from: 'A', to: 'A', fromSide: 'L', toSide: 'R' });
    expect(edgeMatches(e, 'A', 'L', 'A', 'R')).toBe(true);
    expect(edgeMatches(e, 'A', 'R', 'A', 'L')).toBe(false);
  });

  it('bidi self-loop matches both ways', () => {
    const e = edge({ from: 'A', to: 'A', fromSide: 'L', toSide: 'R', bidi: true });
    expect(edgeMatches(e, 'A', 'L', 'A', 'R')).toBe(true);
    expect(edgeMatches(e, 'A', 'R', 'A', 'L')).toBe(true);
  });
});

describe('hasEdgeStep', () => {
  it('finds match via any edge in list', () => {
    const edges = [
      edge({ from: 'A', to: 'B' }),
      edge({ from: 'B', to: 'C', bidi: true }),
    ];
    expect(hasEdgeStep(edges, { name: 'A', side: null }, { name: 'B', side: null })).toBe(true);
    expect(hasEdgeStep(edges, { name: 'C', side: null }, { name: 'B', side: null })).toBe(true);
    expect(hasEdgeStep(edges, { name: 'A', side: null }, { name: 'C', side: null })).toBe(false);
  });
});

describe('isDuplicateEdge', () => {
  it('detects exact (from,to,fromSide,toSide) duplicates', () => {
    const edges = [edge({ from: 'A', to: 'B', fromSide: 'L', toSide: 'R' })];
    expect(isDuplicateEdge(edges, 'A', 'B', 'L', 'R')).toBe(true);
    expect(isDuplicateEdge(edges, 'A', 'B', 'R', 'L')).toBe(false);
    expect(isDuplicateEdge(edges, 'A', 'B', null, null)).toBe(false);
  });
});
