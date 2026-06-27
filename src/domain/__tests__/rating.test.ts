import { describe, expect, it } from 'vitest';
import {
  applyReport,
  blend,
  effectiveRate,
  hasRate,
  rateColor,
  resetTrick,
  statusOf,
  toggleLrOff,
  toggleLrOn,
} from '../rating';
import { RATE_BAD, RATE_GOOD, RATE_MID, RATE_NONE } from '../constants';
import type { Trick } from '../types';

const baseTrick = (overrides: Partial<Trick> = {}): Trick => ({
  name: 'Test',
  createdBy: null,
  visibility: 'public',
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

describe('blend (EWMA)', () => {
  it('returns score when old is null (first report)', () => {
    expect(blend(null, 4)).toBe(4);
    expect(blend(undefined, 2)).toBe(2);
  });

  it('applies 0.6*old + 0.4*score, rounded to 2 decimals', () => {
    expect(blend(3, 5)).toBe(3.8);
    expect(blend(2, 4)).toBe(2.8);
    expect(blend(4, 4)).toBe(4);
  });

  it('rounds to 2 decimal places', () => {
    const result = blend(3.33, 4);
    expect(result).toBe(Math.round(((0.6 * 3.33 + 0.4 * 4)) * 100) / 100);
  });
});

describe('applyReport', () => {
  it('first report sets single-mode rate to score', () => {
    const t = baseTrick();
    applyReport(t, 3, null, '2026-06-21');
    expect(t.rate).toBe(3);
    expect(t.last).toBe('2026-06-21');
    expect(t.status).toBe('In Progress');
  });

  it('subsequent report blends EWMA', () => {
    const t = baseTrick({ rate: 3 });
    applyReport(t, 5, null, '2026-06-21');
    expect(t.rate).toBe(3.8);
  });

  it('writes to rateL when lr+L', () => {
    const t = baseTrick({ lr: true });
    applyReport(t, 4, 'L', '2026-06-21');
    expect(t.rateL).toBe(4);
    expect(t.rateR).toBeNull();
    expect(t.rate).toBeNull();
  });

  it('writes to rateR when lr+R', () => {
    const t = baseTrick({ lr: true });
    applyReport(t, 5, 'R', '2026-06-21');
    expect(t.rateR).toBe(5);
  });

  it('moves status to Complete when effective rate ≥ 4.5', () => {
    const t = baseTrick({ rate: 4.5 });
    applyReport(t, 5, null);
    expect(t.status).toBe('Complete');
  });
});

describe('effectiveRate / hasRate / statusOf', () => {
  it('effective rate averages L+R when lr', () => {
    const t = baseTrick({ lr: true, rateL: 2, rateR: 4 });
    expect(effectiveRate(t)).toBe(3);
  });

  it('effective rate ignores null sides', () => {
    const t = baseTrick({ lr: true, rateL: 3, rateR: null });
    expect(effectiveRate(t)).toBe(3);
  });

  it('returns null when no sides rated', () => {
    const t = baseTrick({ lr: true });
    expect(effectiveRate(t)).toBeNull();
    expect(hasRate(t)).toBe(false);
    expect(statusOf(t)).toBe('Not Started');
  });

  it('Complete at 4.5', () => {
    expect(statusOf(baseTrick({ rate: 4.5 }))).toBe('Complete');
    expect(statusOf(baseTrick({ rate: 4.49 }))).toBe('In Progress');
  });
});

describe('lr toggle helpers', () => {
  it('toggleLrOn copies rate into both sides', () => {
    const t = baseTrick({ rate: 3 });
    toggleLrOn(t);
    expect(t.lr).toBe(true);
    expect(t.rateL).toBe(3);
    expect(t.rateR).toBe(3);
    expect(t.rate).toBeNull();
  });

  it('toggleLrOn from unrated keeps sides null', () => {
    const t = baseTrick();
    toggleLrOn(t);
    expect(t.lr).toBe(true);
    expect(t.rateL).toBeNull();
    expect(t.rateR).toBeNull();
  });

  it('toggleLrOff collapses to average', () => {
    const t = baseTrick({ lr: true, rateL: 2, rateR: 4 });
    toggleLrOff(t);
    expect(t.lr).toBe(false);
    expect(t.rate).toBe(3);
    expect(t.rateL).toBeNull();
    expect(t.rateR).toBeNull();
  });

  it('toggleLrOff with only one side keeps that value', () => {
    const t = baseTrick({ lr: true, rateL: 4, rateR: null });
    toggleLrOff(t);
    expect(t.rate).toBe(4);
  });

  it('toggleLrOn is idempotent when already lr', () => {
    const t = baseTrick({ lr: true, rateL: 2, rateR: 4 });
    toggleLrOn(t);
    expect(t.rateL).toBe(2);
    expect(t.rateR).toBe(4);
  });
});

describe('resetTrick', () => {
  it('clears all rates + last; preserves lr/tags/aliases', () => {
    const t = baseTrick({ lr: true, rateL: 3, rateR: 4, rate: null, last: '2026-06-20', tags: ['toe'], aliases: ['alt'] });
    resetTrick(t);
    expect(t.rate).toBeNull();
    expect(t.rateL).toBeNull();
    expect(t.rateR).toBeNull();
    expect(t.last).toBeNull();
    expect(t.status).toBe('Not Started');
    expect(t.lr).toBe(true);
    expect(t.tags).toEqual(['toe']);
    expect(t.aliases).toEqual(['alt']);
  });
});

describe('rateColor', () => {
  it('maps rate to traffic-light colors', () => {
    expect(rateColor(null)).toBe(RATE_NONE);
    expect(rateColor(undefined)).toBe(RATE_NONE);
    expect(rateColor(1)).toBe(RATE_BAD);
    expect(rateColor(2.49)).toBe(RATE_BAD);
    expect(rateColor(2.5)).toBe(RATE_MID);
    expect(rateColor(3.99)).toBe(RATE_MID);
    expect(rateColor(4)).toBe(RATE_GOOD);
    expect(rateColor(5)).toBe(RATE_GOOD);
  });
});
