import type {
  CanonicalTrick,
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
  TrickOverlay,
  TrickStatus,
  UserBlock,
  UserTrickProgress,
  Category,
  Tier,
  Visibility,
} from '../domain/types';

/** Canonical tricks table row — new schema (after T2 migration). */
export interface TrickRow {
  id?: string;
  created_by: string | null;
  visibility: Visibility;
  name: string;
  tier: Tier;
  category: Category;
  entry: Stance;
  exit: Stance;
  lr: boolean;
  default_aliases: string[];
  default_tags: string[];
  default_icon: string | null;
  default_video: string | null;
}

export interface TransitionRow {
  id?: string;
  user_id?: string;
  from_trick: string;
  to_trick: string;
  from_side: Side;
  to_side: Side;
  bidi: boolean;
  rate: number | null;
  last_practiced: string | null;
}

export interface SequenceRow {
  id?: string;
  user_id?: string;
  name: string;
  steps: SequenceStep[];
  created: string;
  created_by?: string | null;
  rate: number | null;
  last_practiced: string | null;
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
  // Overlay columns (added in T2 migration)
  aliases?: string[];
  tags?: string[];
  main_alias?: string | null;
  icon_override?: string | null;
  video_override?: string | null;
  node_x?: number | null;
  node_y?: number | null;
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
};

// ---------------------------------------------------------------------------
// Canonical trick mappers (new schema: default_* columns)
// ---------------------------------------------------------------------------

export function mapCanonicalTrickToServer(t: CanonicalTrick): Record<string, unknown> {
  return stripUndefined({
    id: t.id,
    created_by: t.createdBy,
    visibility: t.visibility,
    name: t.name,
    tier: t.tier,
    category: t.category,
    entry: t.entry,
    exit: t.exit,
    lr: t.lr,
    default_aliases: t.defaultAliases,
    default_tags: t.defaultTags,
    default_icon: t.defaultIcon,
    default_video: t.defaultVideo,
  }) as Record<string, unknown>;
}

export function mapCanonicalTrickFromServer(r: TrickRow): CanonicalTrick {
  return {
    id: r.id,
    createdBy: r.created_by,
    visibility: r.visibility,
    name: r.name,
    tier: r.tier,
    category: r.category,
    entry: r.entry,
    exit: r.exit,
    lr: r.lr,
    defaultAliases: r.default_aliases ?? [],
    defaultTags: r.default_tags ?? [],
    defaultIcon: r.default_icon ?? null,
    defaultVideo: r.default_video ?? null,
  };
}

/**
 * @deprecated Use mapCanonicalTrickToServer instead.
 * Kept for sync.ts / social.ts compatibility until T14.
 */
export function mapTrickToServer(t: Trick): Record<string, unknown> {
  // Best-effort: map the merged Trick shape to the canonical server row.
  // Per-user fields (rate, rateL, aliases, tags, icon, video, fav, etc.) are dropped
  // because the canonical table no longer stores them (after T2 migration).
  return stripUndefined({
    id: t.id,
    created_by: t.createdBy ?? null,
    visibility: t.visibility ?? 'public',
    name: t.name,
    tier: t.tier,
    category: t.category,
    entry: t.entry,
    exit: t.exit,
    lr: t.lr,
    default_aliases: t.aliases ?? [],
    default_tags: t.tags ?? [],
    default_icon: t.icon ?? null,
    default_video: t.video ?? null,
  }) as Record<string, unknown>;
}

/**
 * @deprecated Use mapCanonicalTrickFromServer instead.
 * Kept for sync.ts / social.ts compatibility until T14.
 */
export function mapTrickFromServer(r: TrickRow): CanonicalTrick {
  return mapCanonicalTrickFromServer(r);
}

// ---------------------------------------------------------------------------
// TrickOverlay mappers (user_trick_progress overlay columns)
// ---------------------------------------------------------------------------

export function mapTrickOverlayToServer(o: TrickOverlay): Record<string, unknown> {
  return stripUndefined({
    user_id: o.userId,
    trick_id: o.trickId,
    rate: o.rate,
    rate_l: o.rateL,
    rate_r: o.rateR,
    last_practiced: o.last,
    status: o.status,
    aliases: o.aliases,
    tags: o.tags,
    main_alias: o.mainAlias,
    icon_override: o.iconOverride,
    video_override: o.videoOverride,
    node_x: o.nodeX,
    node_y: o.nodeY,
    fav: o.fav,
  }) as Record<string, unknown>;
}

export function mapTrickOverlayFromServer(r: UserTrickProgressRow): TrickOverlay {
  return {
    userId: r.user_id,
    trickId: r.trick_id,
    rate: r.rate,
    rateL: r.rate_l,
    rateR: r.rate_r,
    last: r.last_practiced ?? null,
    status: r.status ?? 'Not Started',
    aliases: r.aliases ?? [],
    tags: r.tags ?? [],
    mainAlias: r.main_alias ?? null,
    iconOverride: r.icon_override ?? null,
    videoOverride: r.video_override ?? null,
    nodeX: r.node_x ?? null,
    nodeY: r.node_y ?? null,
    fav: r.fav ?? false,
  };
}

export function mapTransitionToServer(t: Transition & { userId?: string }): TransitionRow {
  return stripUndefined({
    id: t.id,
    user_id: t.userId,
    from_trick: t.from,
    to_trick: t.to,
    from_side: t.fromSide,
    to_side: t.toSide,
    bidi: t.bidi,
    rate: t.rate,
    last_practiced: t.last,
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
    rate: r.rate ?? null,
    last: r.last_practiced ?? null,
  };
}

export function mapSequenceToServer(s: Sequence & { userId?: string }): SequenceRow {
  return stripUndefined({
    id: s.id,
    user_id: s.userId,
    name: s.name,
    steps: s.steps,
    created: s.created,
    rate: s.rate,
    last_practiced: s.last,
  });
}

export function mapSequenceFromServer(r: SequenceRow): Sequence {
  return {
    id: r.id,
    name: r.name,
    created: r.created,
    rate: r.rate ?? null,
    last: r.last_practiced ?? null,
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

