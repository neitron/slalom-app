import { describe, expect, it } from 'vitest';
import { validateNickname, suggestAlternatives, RESERVED_NICKNAMES } from '../nickname';

describe('validateNickname', () => {
  it('accepts simple valid handles', () => {
    expect(validateNickname('alice')).toBeNull();
    expect(validateNickname('ab_2')).toBeNull();
    expect(validateNickname('a.b-c')).toBeNull();
  });

  it('rejects empties and short/long', () => {
    expect(validateNickname('')).toBe('empty');
    expect(validateNickname('ab')).toBe('too_short');
    expect(validateNickname('a'.repeat(25))).toBe('too_long');
  });

  it('rejects bad edges and charset', () => {
    expect(validateNickname('.alice')).toBe('bad_edges');
    expect(validateNickname('alice.')).toBe('bad_edges');
    expect(validateNickname('alice!')).toBe('bad_charset');
    expect(validateNickname('with space')).toBe('bad_charset');
  });

  it('rejects separator runs', () => {
    expect(validateNickname('a___b')).toBe('separator_run');
    expect(validateNickname('a..-b')).toBe('separator_run');
  });

  it('rejects reserved nicknames case-insensitively', () => {
    expect(validateNickname('admin')).toBe('reserved');
    expect(validateNickname('ROOT')).toBe('reserved');
    expect(RESERVED_NICKNAMES.has('admin')).toBe(true);
  });
});

describe('suggestAlternatives', () => {
  it('appends safe suffixes that pass validation', () => {
    const s = suggestAlternatives('alice');
    expect(s.length).toBeGreaterThan(0);
    for (const cand of s) expect(validateNickname(cand)).toBeNull();
  });
});
