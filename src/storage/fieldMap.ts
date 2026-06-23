import type {
  Friendship,
  FriendshipStatus,
  PracticeEntityType,
  PracticeLog,
  Profile,
  ProfileVisibility,
  Sequence,
  SequenceStep,
  Side,
  Stance,
  Transition,
  Trick,
  TrickStatus,
  UserBlock,
  UserSequenceProgress,
  UserTrickProgress,
  UserTransitionProgress,
  Category,
  Tier,
} from '../domain/types';

export interface TrickRow {
  id?: string;
  name: string;
  tier: Tier;
  category: Category;
  entry: Stance;
  exit: Stance;
  lr: boolean;
  aliases: string[];
  main_alias: string | null;
  video: string | null;
  icon: string | null;
  tags: string[];
  node_x: number | null;
  node_y: number | null;
}

export interface TransitionRow {
  id?: string;
  from_trick: string;
  to_trick: string;
  from_side: Side;
  to_side: Side;
  bidi: boolean;
}

export interface SequenceRow {
  id?: string;
  name: string;
  steps: SequenceStep[];
  created: string;
  created_by?: string | null;
}

export interface PracticeLogRow {
  id?: string;
  entity_type: PracticeEntityType;
  entity_id: string;
  side: Side;
  score: number;
  at: string;
  user_id?: string | null;
}

export interface ProfileRow {
  id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_emoji: string | null;
  bio: string | null;
  visibility: ProfileVisibility;
  nickname_changed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string | null;
  responded_at: string | null;
}

export interface UserBlockRow {
  blocker_id: string;
  blocked_id: string;
  created_at: string | null;
}

export interface UserTrickProgressRow {
  user_id: string;
  trick_id: string;
  rate: number | null;
  rate_l: number | null;
  rate_r: number | null;
  last_practiced: string | null;
  status: TrickStatus;
  fav: boolean;
  lr_enabled: boolean;
  updated_at?: string | null;
}

export interface UserTransitionProgressRow {
  user_id: string;
  transition_id: string;
  rate: number | null;
  last_practiced: string | null;
  updated_at?: string | null;
}

export interface UserSequenceProgressRow {
  user_id: string;
  sequence_id: string;
  rate: number | null;
  last_practiced: string | null;
  updated_at?: string | null;
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
};

export function mapTrickToServer(t: Trick): TrickRow {
  return stripUndefined({
    id: t.id,
    name: t.name,
    tier: t.tier,
    category: t.category,
    entry: t.entry,
    exit: t.exit,
    lr: t.lr,
    aliases: t.aliases,
    main_alias: t.mainAlias ?? null,
    video: t.video,
    icon: t.icon,
    tags: t.tags,
    node_x: t.node_x ?? null,
    node_y: t.node_y ?? null,
  });
}

export function mapTrickFromServer(r: TrickRow): Trick {
  return {
    id: r.id,
    name: r.name,
    tier: r.tier,
    category: r.category,
    entry: r.entry,
    exit: r.exit,
    lr: r.lr,
    rate: null,
    rateL: null,
    rateR: null,
    last: null,
    status: 'Not Started',
    aliases: r.aliases ?? [],
    mainAlias: r.main_alias ?? null,
    video: r.video,
    icon: r.icon,
    tags: r.tags ?? [],
    fav: false,
    node_x: r.node_x ?? null,
    node_y: r.node_y ?? null,
  };
}

export function mapTransitionToServer(t: Transition): TransitionRow {
  return stripUndefined({
    id: t.id,
    from_trick: t.from,
    to_trick: t.to,
    from_side: t.fromSide,
    to_side: t.toSide,
    bidi: t.bidi,
  });
}

export function mapTransitionFromServer(r: TransitionRow): Transition {
  return {
    id: r.id,
    from: r.from_trick,
    to: r.to_trick,
    fromSide: r.from_side,
    toSide: r.to_side,
    bidi: r.bidi,
    rate: null,
    last: null,
  };
}

export function mapSequenceToServer(s: Sequence): SequenceRow {
  return stripUndefined({
    id: s.id,
    name: s.name,
    steps: s.steps,
    created: s.created,
  });
}

export function mapSequenceFromServer(r: SequenceRow): Sequence {
  return {
    id: r.id,
    name: r.name,
    created: r.created,
    rate: null,
    last: null,
    steps: Array.isArray(r.steps) ? r.steps : [],
  };
}

export function mapPracticeLogToServer(p: PracticeLog): PracticeLogRow {
  return stripUndefined({
    id: p.id,
    entity_type: p.entityType,
    entity_id: p.entityId,
    side: p.side,
    score: p.score,
    at: p.at,
    user_id: p.userId ?? null,
  });
}

export function mapPracticeLogFromServer(r: PracticeLogRow): PracticeLog {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    side: r.side,
    score: r.score,
    at: r.at,
    userId: r.user_id ?? null,
  };
}

export function mapProfileToServer(p: Partial<Profile> & { id: string }): Partial<ProfileRow> {
  // Truly partial: only emit keys that were explicitly present in the patch.
  // We must use `in` checks instead of `?? null` so that omitted keys don't
  // wipe other columns when this row is upserted.
  const out: Partial<ProfileRow> = { id: p.id };
  if ('nickname' in p) out.nickname = p.nickname ?? null;
  if ('displayName' in p) out.display_name = p.displayName ?? null;
  if ('avatarEmoji' in p) out.avatar_emoji = p.avatarEmoji ?? null;
  if ('bio' in p) out.bio = p.bio ?? null;
  if ('visibility' in p && p.visibility !== undefined) out.visibility = p.visibility;
  return out;
}

export function mapProfileFromServer(r: ProfileRow): Profile {
  return {
    id: r.id,
    nickname: r.nickname,
    displayName: r.display_name,
    avatarEmoji: r.avatar_emoji,
    bio: r.bio,
    visibility: r.visibility,
    nicknameChangedAt: r.nickname_changed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function mapFriendshipFromServer(r: FriendshipRow): Friendship {
  return {
    id: r.id,
    requesterId: r.requester_id,
    addresseeId: r.addressee_id,
    status: r.status,
    createdAt: r.created_at,
    respondedAt: r.responded_at,
  };
}

export function mapUserBlockFromServer(r: UserBlockRow): UserBlock {
  return {
    blockerId: r.blocker_id,
    blockedId: r.blocked_id,
    createdAt: r.created_at,
  };
}

export function mapUserTrickProgressToServer(p: UserTrickProgress): UserTrickProgressRow {
  return stripUndefined({
    user_id: p.userId,
    trick_id: p.trickId,
    rate: p.rate,
    rate_l: p.rateL,
    rate_r: p.rateR,
    last_practiced: p.last,
    status: p.status,
    fav: p.fav,
    lr_enabled: p.lrEnabled,
  });
}

export function mapUserTrickProgressFromServer(r: UserTrickProgressRow): UserTrickProgress {
  return {
    userId: r.user_id,
    trickId: r.trick_id,
    rate: r.rate,
    rateL: r.rate_l,
    rateR: r.rate_r,
    last: r.last_practiced,
    status: r.status ?? 'Not Started',
    fav: !!r.fav,
    lrEnabled: !!r.lr_enabled,
    updatedAt: r.updated_at ?? null,
  };
}

export function mapUserTransitionProgressToServer(p: UserTransitionProgress): UserTransitionProgressRow {
  return stripUndefined({
    user_id: p.userId,
    transition_id: p.transitionId,
    rate: p.rate,
    last_practiced: p.last,
  });
}

export function mapUserTransitionProgressFromServer(r: UserTransitionProgressRow): UserTransitionProgress {
  return {
    userId: r.user_id,
    transitionId: r.transition_id,
    rate: r.rate,
    last: r.last_practiced,
    updatedAt: r.updated_at ?? null,
  };
}

export function mapUserSequenceProgressToServer(p: UserSequenceProgress): UserSequenceProgressRow {
  return stripUndefined({
    user_id: p.userId,
    sequence_id: p.sequenceId,
    rate: p.rate,
    last_practiced: p.last,
  });
}

export function mapUserSequenceProgressFromServer(r: UserSequenceProgressRow): UserSequenceProgress {
  return {
    userId: r.user_id,
    sequenceId: r.sequence_id,
    rate: r.rate,
    last: r.last_practiced,
    updatedAt: r.updated_at ?? null,
  };
}
