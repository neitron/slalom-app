import type { Side, Trick, TrickStatus } from './types';
import { ALPHA, RATE_BAD, RATE_GOOD, RATE_MID, RATE_NONE, SIDE_L_COLOR, SIDE_R_COLOR, EDGE_NEUTRAL } from './constants';

export const isoToday = (): string => new Date().toISOString().slice(0, 10);

export function blend(old: number | null | undefined, score: number): number {
  if (old == null) return score;
  return Math.round(((1 - ALPHA) * old + ALPHA * score) * 100) / 100;
}

export function hasRate(t: Trick): boolean {
  return t.lr ? t.rateL != null || t.rateR != null : t.rate != null;
}

export function effectiveRate(t: Trick): number | null {
  if (!t.lr) return t.rate;
  const v = [t.rateL, t.rateR].filter((x): x is number => x != null);
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
}

export function statusOf(t: Trick): TrickStatus {
  if (!hasRate(t)) return 'Not Started';
  return (effectiveRate(t) ?? 0) >= 4.5 ? 'Complete' : 'In Progress';
}

export function applyReport(t: Trick, score: number, side: Side, today: string = isoToday()): Trick {
  if (t.lr && side === 'L') t.rateL = blend(t.rateL, score);
  else if (t.lr && side === 'R') t.rateR = blend(t.rateR, score);
  else t.rate = blend(t.rate, score);
  t.last = today;
  t.status = statusOf(t);
  return t;
}

export function resetTrick(t: Trick): Trick {
  t.rate = null;
  t.rateL = null;
  t.rateR = null;
  t.last = null;
  t.status = 'Not Started';
  return t;
}

export function toggleLrOn(t: Trick): Trick {
  if (t.lr) return t;
  t.lr = true;
  t.rateL = t.rate;
  t.rateR = t.rate;
  t.rate = null;
  t.status = statusOf(t);
  return t;
}

export function toggleLrOff(t: Trick): Trick {
  if (!t.lr) return t;
  t.rate = effectiveRate(t);
  t.lr = false;
  t.rateL = null;
  t.rateR = null;
  t.status = statusOf(t);
  return t;
}

export function rateColor(rate: number | null | undefined): string {
  if (rate == null) return RATE_NONE;
  if (rate >= 4) return RATE_GOOD;
  if (rate >= 2.5) return RATE_MID;
  return RATE_BAD;
}

export function sideColor(s: Side): string {
  return s === 'L' ? SIDE_L_COLOR : s === 'R' ? SIDE_R_COLOR : EDGE_NEUTRAL;
}
