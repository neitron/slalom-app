import { getSb } from './supabase';
import {
  mapFriendshipFromServer,
  mapProfileFromServer,
  mapProfileToServer,
  mapUserBlockFromServer,
  mapUserTrickProgressFromServer,
  type FriendshipRow,
  type ProfileRow,
  type SequenceRow,
  type TransitionRow,
  type TrickRow,
  type UserBlockRow,
  type UserTrickProgressRow,
} from './fieldMap';
import type {
  Friendship,
  Profile,
  Sequence,
  Transition,
  Trick,
  UserBlock,
  UserTrickProgress,
} from '../domain/types';
import { mapSequenceFromServer, mapTransitionFromServer, mapTrickFromServer } from './fieldMap';

export class NicknameTakenError extends Error {
  code = 'NICKNAME_TAKEN' as const;
  constructor() {
    super('nickname taken');
  }
}

export class SocialUnavailableError extends Error {
  code = 'SOCIAL_UNAVAILABLE' as const;
  constructor(message = 'Social tables unavailable. Run the M3.5 migration.') {
    super(message);
  }
}

function isMissingTable(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    (m.includes('relation') && m.includes('not found')) ||
    m.includes('not find the table')
  );
}

function isUniqueViolationOnNickname(err: { code?: string; message?: string }): boolean {
  if (err.code !== '23505') return false;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('nickname');
}

async function client() {
  const sb = await getSb();
  if (!sb) throw new SocialUnavailableError('Supabase not configured');
  return sb;
}

export async function getCurrentUserId(): Promise<string | null> {
  const sb = await getSb();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function getOwnProfile(): Promise<Profile | null> {
  const sb = await client();
  const uid = await getCurrentUserId();
  if (!uid) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`getOwnProfile: ${error.message}`);
  }
  return data ? mapProfileFromServer(data as ProfileRow) : null;
}

export async function upsertOwnProfile(
  patch: Partial<Profile> & { id: string },
): Promise<Profile> {
  const sb = await client();
  const row = mapProfileToServer(patch);
  const { data, error } = await sb
    .from('profiles')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    if (isUniqueViolationOnNickname(error)) throw new NicknameTakenError();
    throw new Error(`upsertOwnProfile: ${error.message}`);
  }
  if (!data) throw new Error('upsertOwnProfile: empty result');
  return mapProfileFromServer(data as ProfileRow);
}

export async function getProfileByNickname(nickname: string): Promise<Profile | null> {
  const sb = await client();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .ilike('nickname', nickname)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`getProfileByNickname: ${error.message}`);
  }
  return data ? mapProfileFromServer(data as ProfileRow) : null;
}

export async function searchProfiles(prefix: string, limit = 20): Promise<Profile[]> {
  const sb = await client();
  const q = prefix.replace(/[%_]/g, '');
  if (!q) return [];
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .ilike('nickname', `${q}%`)
    .order('nickname', { ascending: true })
    .limit(limit);
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`searchProfiles: ${error.message}`);
  }
  return (data ?? []).map((r) => mapProfileFromServer(r as ProfileRow));
}

export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const sb = await client();
  const { data, error } = await sb
    .from('profiles')
    .select('id')
    .ilike('nickname', nickname)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`checkNicknameAvailable: ${error.message}`);
  }
  if (!data) return true;
  const uid = await getCurrentUserId();
  return (data as { id: string }).id === uid;
}

export async function listFriendships(): Promise<Friendship[]> {
  const sb = await client();
  const { data, error } = await sb.from('friendships').select('*');
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`listFriendships: ${error.message}`);
  }
  return (data ?? []).map((r) => mapFriendshipFromServer(r as FriendshipRow));
}

export async function sendFriendRequest(addresseeId: string): Promise<Friendship> {
  const sb = await client();
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('not signed in');
  const { data, error } = await sb
    .from('friendships')
    .insert({ requester_id: uid, addressee_id: addresseeId, status: 'pending' })
    .select('*')
    .maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`sendFriendRequest: ${error.message}`);
  }
  if (!data) throw new Error('sendFriendRequest: empty result');
  return mapFriendshipFromServer(data as FriendshipRow);
}

export async function acceptFriendship(id: string): Promise<Friendship> {
  const sb = await client();
  const { data, error } = await sb
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`acceptFriendship: ${error.message}`);
  }
  if (!data) throw new Error('acceptFriendship: empty result');
  return mapFriendshipFromServer(data as FriendshipRow);
}

export async function deleteFriendship(id: string): Promise<void> {
  const sb = await client();
  const { error } = await sb.from('friendships').delete().eq('id', id);
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`deleteFriendship: ${error.message}`);
  }
}

export async function listBlocks(): Promise<UserBlock[]> {
  const sb = await client();
  const { data, error } = await sb.from('user_blocks').select('*');
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`listBlocks: ${error.message}`);
  }
  return (data ?? []).map((r) => mapUserBlockFromServer(r as UserBlockRow));
}

export async function blockUser(blockedId: string): Promise<UserBlock> {
  const sb = await client();
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('not signed in');
  const { data, error } = await sb
    .from('user_blocks')
    .insert({ blocker_id: uid, blocked_id: blockedId })
    .select('*')
    .maybeSingle();
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`blockUser: ${error.message}`);
  }
  if (!data) throw new Error('blockUser: empty result');
  return mapUserBlockFromServer(data as UserBlockRow);
}

export async function unblockUser(blockedId: string): Promise<void> {
  const sb = await client();
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('not signed in');
  const { error } = await sb
    .from('user_blocks')
    .delete()
    .eq('blocker_id', uid)
    .eq('blocked_id', blockedId);
  if (error) {
    if (isMissingTable(error.message)) throw new SocialUnavailableError();
    throw new Error(`unblockUser: ${error.message}`);
  }
}

export interface ForeignProgressResult {
  profile: Profile;
  tricks: UserTrickProgress[];
  transitions: Transition[];
  sequences: Sequence[];
  missingTrickIds: string[];
}

export async function loadForeignProgress(
  userId: string,
  profile: Profile,
  knownTrickIds: Set<string>,
): Promise<ForeignProgressResult> {
  const sb = await client();
  const [tp, xp, sp] = await Promise.all([
    sb.from('user_trick_progress').select('*').eq('user_id', userId),
    sb.from('transitions').select('*').eq('user_id', userId),
    sb.from('sequences').select('*').eq('user_id', userId),
  ]);
  for (const r of [tp, xp, sp]) {
    if (r.error) {
      if (isMissingTable(r.error.message)) throw new SocialUnavailableError();
      throw new Error(`loadForeignProgress: ${r.error.message}`);
    }
  }
  const tricks = (tp.data ?? []).map((r) =>
    mapUserTrickProgressFromServer(r as UserTrickProgressRow),
  );
  const transitions = (xp.data ?? []).map((r) => mapTransitionFromServer(r as TransitionRow));
  const sequences = (sp.data ?? []).map((r) => mapSequenceFromServer(r as SequenceRow));
  const missingTrickIds = tricks.map((t) => t.trickId).filter((id) => !knownTrickIds.has(id));
  return {
    profile,
    tricks,
    transitions,
    sequences,
    missingTrickIds,
  };
}

const IN_CHUNK = 200;

export async function fetchCatalogTricksByIds(ids: string[]): Promise<Trick[]> {
  if (!ids.length) return [];
  const sb = await client();
  const out: Trick[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    const { data, error } = await sb.from('tricks').select('*').in('id', chunk);
    if (error) throw new Error(`fetchCatalogTricksByIds: ${error.message}`);
    for (const r of (data ?? []) as TrickRow[]) out.push(mapTrickFromServer(r));
  }
  return out;
}

