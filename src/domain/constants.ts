import type { Category, Tier } from './types';

export const ALPHA = 0.4;

export const TIERS: Record<Tier, string> = {
  1: 'Basics',
  2: 'Beginner',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Challenging',
  6: 'Master',
};

export const TIER_NAMES = ['Basics', 'Beginner', 'Intermediate', 'Advanced', 'Challenging', 'Master'] as const;

export const CATEGORIES: Category[] = [
  'forward',
  'backward',
  'cross',
  'eagle',
  'one-foot',
  'sitting',
  'spin',
  'seven',
  'wheeling',
];

export const SCORE_HINTS: Record<number, string> = {
  1: 'bad',
  2: 'rough',
  3: 'ok',
  4: 'good',
  5: 'excellent',
};

export const RATE_GOOD = '#3fbf75';
export const RATE_MID = '#e0a93e';
export const RATE_BAD = '#d95757';
export const RATE_NONE = '#565764';

export const SIDE_L_COLOR = '#ffb36b';
export const SIDE_R_COLOR = '#7cc5ff';
export const EDGE_NEUTRAL = '#cbb3e6';

export const GEN_LIMITS = { graph: 12, known: 12, random: 8 } as const;
