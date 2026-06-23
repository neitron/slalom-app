import { describe, expect, it } from 'vitest';
import { computeFriendButtonState } from '../friendship';
import type { Friendship, UserBlock } from '../types';

const me = 'u-me';
const them = 'u-them';

function base() {
  return {
    viewerId: me,
    targetId: them,
    ownNicknameClaimed: true,
    friendships: [] as Friendship[],
    blocks: [] as UserBlock[],
  };
}

describe('computeFriendButtonState', () => {
  it('self when viewer == target', () => {
    expect(computeFriendButtonState({ ...base(), targetId: me })).toBe('self');
  });

  it('no_nickname when viewer unauthenticated', () => {
    expect(computeFriendButtonState({ ...base(), viewerId: null })).toBe('no_nickname');
  });

  it('none when ready to send', () => {
    expect(computeFriendButtonState(base())).toBe('none');
  });

  it('no_nickname when own nickname is unclaimed and not already related', () => {
    expect(computeFriendButtonState({ ...base(), ownNicknameClaimed: false })).toBe('no_nickname');
  });

  it('pending_outgoing when I sent the request', () => {
    const fs: Friendship[] = [
      { id: 'f1', requesterId: me, addresseeId: them, status: 'pending', createdAt: null, respondedAt: null },
    ];
    expect(computeFriendButtonState({ ...base(), friendships: fs })).toBe('pending_outgoing');
  });

  it('pending_incoming when they sent the request', () => {
    const fs: Friendship[] = [
      { id: 'f1', requesterId: them, addresseeId: me, status: 'pending', createdAt: null, respondedAt: null },
    ];
    expect(computeFriendButtonState({ ...base(), friendships: fs })).toBe('pending_incoming');
  });

  it('friends when accepted', () => {
    const fs: Friendship[] = [
      { id: 'f1', requesterId: them, addresseeId: me, status: 'accepted', createdAt: null, respondedAt: null },
    ];
    expect(computeFriendButtonState({ ...base(), friendships: fs })).toBe('friends');
  });

  it('blocked_by_me overrides everything', () => {
    const fs: Friendship[] = [
      { id: 'f1', requesterId: them, addresseeId: me, status: 'accepted', createdAt: null, respondedAt: null },
    ];
    const blocks: UserBlock[] = [{ blockerId: me, blockedId: them, createdAt: null }];
    expect(computeFriendButtonState({ ...base(), friendships: fs, blocks })).toBe('blocked_by_me');
  });

  it('blocked_by_them rendered when they blocked me', () => {
    const blocks: UserBlock[] = [{ blockerId: them, blockedId: me, createdAt: null }];
    expect(computeFriendButtonState({ ...base(), blocks })).toBe('blocked_by_them');
  });
});
