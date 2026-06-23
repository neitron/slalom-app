import { describe, expect, it } from 'vitest';
import {
  mapProfileToServer,
  mapSequenceToServer,
  mapTransitionToServer,
  mapTrickToServer,
} from '../fieldMap';
import type { Sequence, Transition, Trick } from '../../domain/types';

describe('catalog mappers exclude per-user fields', () => {
  it('mapTrickToServer drops rate/rate_l/rate_r/last_practiced/status/fav', () => {
    const t: Trick = {
      id: 't1',
      name: 'Heel-Toe',
      tier: 1,
      category: 'forward',
      entry: '2/f',
      exit: '2/f',
      lr: false,
      rate: 3,
      rateL: 4,
      rateR: 2,
      last: '2024-01-01',
      status: 'In Progress',
      aliases: ['ht'],
      mainAlias: 'ht',
      video: null,
      icon: null,
      tags: [],
      fav: true,
    };
    const r = mapTrickToServer(t) as unknown as Record<string, unknown>;
    expect(r).not.toHaveProperty('rate');
    expect(r).not.toHaveProperty('rate_l');
    expect(r).not.toHaveProperty('rate_r');
    expect(r).not.toHaveProperty('last_practiced');
    expect(r).not.toHaveProperty('status');
    expect(r).not.toHaveProperty('fav');
    expect(r.name).toBe('Heel-Toe');
  });

  it('mapTransitionToServer drops rate/last_practiced', () => {
    const e: Transition = {
      id: 'e1',
      from: 't1',
      to: 't2',
      fromSide: 'L',
      toSide: 'R',
      bidi: false,
      rate: 3,
      last: '2024-01-01',
    };
    const r = mapTransitionToServer(e) as unknown as Record<string, unknown>;
    expect(r).not.toHaveProperty('rate');
    expect(r).not.toHaveProperty('last_practiced');
  });

  it('mapSequenceToServer drops rate/last_practiced', () => {
    const s: Sequence = {
      id: 's1',
      name: 'combo',
      created: '2024-01-01',
      rate: 4,
      last: '2024-01-02',
      steps: [],
    };
    const r = mapSequenceToServer(s) as unknown as Record<string, unknown>;
    expect(r).not.toHaveProperty('rate');
    expect(r).not.toHaveProperty('last_practiced');
  });
});

describe('mapProfileToServer is truly partial', () => {
  it('updateVisibility patch only emits visibility (no nickname/display_name/bio/avatar_emoji)', () => {
    const row = mapProfileToServer({ id: 'u1', visibility: 'friends' }) as Record<string, unknown>;
    expect(row.id).toBe('u1');
    expect(row.visibility).toBe('friends');
    expect(row).not.toHaveProperty('nickname');
    expect(row).not.toHaveProperty('display_name');
    expect(row).not.toHaveProperty('bio');
    expect(row).not.toHaveProperty('avatar_emoji');
  });

  it('updateBio patch only emits bio', () => {
    const row = mapProfileToServer({ id: 'u1', bio: 'hi' }) as Record<string, unknown>;
    expect(row.bio).toBe('hi');
    expect(row).not.toHaveProperty('nickname');
    expect(row).not.toHaveProperty('display_name');
    expect(row).not.toHaveProperty('visibility');
    expect(row).not.toHaveProperty('avatar_emoji');
  });

  it('updateAvatarEmoji patch only emits avatar_emoji (preserves explicit null)', () => {
    const row = mapProfileToServer({ id: 'u1', avatarEmoji: null }) as Record<string, unknown>;
    expect(row.avatar_emoji).toBeNull();
    expect(row).not.toHaveProperty('nickname');
    expect(row).not.toHaveProperty('bio');
    expect(row).not.toHaveProperty('visibility');
  });

  it('multi-field patch emits all explicitly set keys', () => {
    const row = mapProfileToServer({
      id: 'u1',
      nickname: 'foo',
      displayName: 'Foo',
      visibility: 'public',
    }) as Record<string, unknown>;
    expect(row.nickname).toBe('foo');
    expect(row.display_name).toBe('Foo');
    expect(row.visibility).toBe('public');
    expect(row).not.toHaveProperty('bio');
    expect(row).not.toHaveProperty('avatar_emoji');
  });
});
