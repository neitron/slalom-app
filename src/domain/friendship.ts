import type { Friendship, FriendshipStatus, UserBlock } from './types';

export type FriendButtonState =
  | 'self'
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'friends'
  | 'blocked_by_me'
  | 'blocked_by_them'
  | 'no_nickname';

export interface RelationshipInputs {
  viewerId: string | null;
  targetId: string;
  ownNicknameClaimed: boolean;
  friendships: Friendship[];
  blocks: UserBlock[];
}

export function computeFriendButtonState(inputs: RelationshipInputs): FriendButtonState {
  const { viewerId, targetId, ownNicknameClaimed, friendships, blocks } = inputs;
  if (!viewerId) return 'no_nickname';
  if (viewerId === targetId) return 'self';

  const blockedByMe = blocks.some((b) => b.blockerId === viewerId && b.blockedId === targetId);
  if (blockedByMe) return 'blocked_by_me';
  const blockedByThem = blocks.some((b) => b.blockerId === targetId && b.blockedId === viewerId);
  if (blockedByThem) return 'blocked_by_them';

  const rel = friendships.find(
    (f) =>
      (f.requesterId === viewerId && f.addresseeId === targetId) ||
      (f.requesterId === targetId && f.addresseeId === viewerId),
  );
  if (rel) {
    if (rel.status === 'accepted') return 'friends';
    return rel.requesterId === viewerId ? 'pending_outgoing' : 'pending_incoming';
  }
  if (!ownNicknameClaimed) return 'no_nickname';
  return 'none';
}

export function canTransition(
  from: FriendshipStatus | 'none',
  to: FriendshipStatus,
): boolean {
  if (from === 'none' && to === 'pending') return true;
  if (from === 'pending' && to === 'accepted') return true;
  return false;
}
