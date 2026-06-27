import Dexie, { type Table } from 'dexie';
import type {
  CanonicalTrick,
  Friendship,
  PracticeLog,
  Profile,
  Sequence,
  Transition,
  TrickOverlay,
  UserBlock,
} from '../domain/types';
import type { OutboxRow } from './outbox';

export class SlalomDB extends Dexie {
  tricks!: Table<CanonicalTrick, string>;
  transitions!: Table<Transition, string>;
  sequences!: Table<Sequence, string>;
  practice_log!: Table<PracticeLog, string>;
  outbox!: Table<OutboxRow, string>;
  profiles!: Table<Profile, string>;
  friendships!: Table<Friendship, string>;
  user_blocks!: Table<UserBlock, [string, string]>;
  user_trick_progress!: Table<TrickOverlay, [string, string]>;

  constructor() {
    super('slalom');
    this.version(1).stores({
      tricks: 'id, &name, tier, category, status, fav, last',
      transitions: 'id, from, to, [from+to]',
      sequences: 'id, name, created, last',
      practice_log: 'id, entityId, entityType, at, [entityType+entityId]',
    });
    this.version(2).stores({
      tricks: 'id, &name, tier, category, status, fav, last',
      transitions: 'id, from, to, [from+to]',
      sequences: 'id, name, created, last',
      practice_log: 'id, entityId, entityType, at, [entityType+entityId]',
      outbox: 'id, ts',
    });
    this.version(3).stores({
      tricks: 'id, &name, tier, category, status, fav, last',
      transitions: 'id, from, to, [from+to]',
      sequences: 'id, name, created, last',
      practice_log: 'id, entityId, entityType, at, [entityType+entityId], userId',
      outbox: 'id, ts',
      profiles: 'id, &nickname',
      friendships: 'id, [requesterId+addresseeId], requesterId, addresseeId, status',
      user_blocks: '[blockerId+blockedId], blockerId, blockedId',
      user_trick_progress: '[userId+trickId], userId, trickId, fav, last',
      user_transition_progress: '[userId+transitionId], userId, transitionId, last',
      user_sequence_progress: '[userId+sequenceId], userId, sequenceId, last',
    });
    this.version(4).stores({
      tricks: 'id, &name, tier, category, status, fav, last',
      transitions: 'id, from, to, [from+to]',
      sequences: 'id, name, created, last',
      practice_log: 'id, entityId, entityType, at, [entityType+entityId], userId',
      outbox: 'id, ts',
      profiles: 'id, &nickname',
      friendships: 'id, [requesterId+addresseeId], requesterId, addresseeId, status',
      user_blocks: '[blockerId+blockedId], blockerId, blockedId',
      user_trick_progress: '[userId+trickId], userId, trickId, fav, last',
      user_transition_progress: null,
      user_sequence_progress: null,
    });
    this.version(5).stores({
      // Index keys for tricks trimmed: status/fav are no longer canonical fields
      tricks: 'id, &name, tier, category',
      transitions: 'id, from, to, [from+to]',
      sequences: 'id, name, created, last',
      practice_log: 'id, entityId, entityType, at, [entityType+entityId], userId',
      outbox: 'id, ts',
      profiles: 'id, &nickname',
      friendships: 'id, [requesterId+addresseeId], requesterId, addresseeId, status',
      user_blocks: '[blockerId+blockedId], blockerId, blockedId',
      user_trick_progress: '[userId+trickId], userId, trickId, fav, last',
    }).upgrade(async (tx) => {
      const tricksTable = tx.table('tricks');
      const progressTable = tx.table('user_trick_progress');

      // Best-effort: get current user id from local auth state.
      let currentUserId: string | null = null;
      try {
        const authRaw = localStorage.getItem('slalom.sb.auth');
        if (authRaw) {
          const auth = JSON.parse(authRaw);
          currentUserId = auth?.user?.id ?? auth?.session?.user?.id ?? null;
        }
      } catch { /* ignore */ }

      const allTricks = await tricksTable.toArray();
      for (const t of allTricks) {
        const canonical: CanonicalTrick = {
          id: t.id,
          name: t.name,
          tier: t.tier,
          category: t.category,
          entry: t.entry,
          exit: t.exit,
          lr: t.lr,
          createdBy: null,             // existing tricks treated as seeded canonical
          visibility: 'public' as const, // existing tricks remain discoverable
          defaultAliases: t.aliases ?? [],
          defaultTags: t.tags ?? [],
          defaultIcon: t.icon ?? null,
          defaultVideo: t.video ?? null,
        };
        await tricksTable.put(canonical);

        if (!currentUserId) continue;

        const overlayKey: [string, string] = [currentUserId, t.id];
        const existing = (await progressTable.get(overlayKey)) ?? {
          userId: currentUserId,
          trickId: t.id,
          rate: null,
          rateL: null,
          rateR: null,
          last: null,
          status: 'Not Started' as const,
        };
        const overlay: TrickOverlay = {
          userId: existing.userId ?? currentUserId,
          trickId: existing.trickId ?? t.id,
          rate: existing.rate ?? null,
          rateL: existing.rateL ?? null,
          rateR: existing.rateR ?? null,
          last: existing.last ?? null,
          status: existing.status ?? 'Not Started',
          aliases: (existing.aliases?.length ? existing.aliases : t.aliases) ?? [],
          tags: (existing.tags?.length ? existing.tags : t.tags) ?? [],
          mainAlias: existing.mainAlias ?? t.mainAlias ?? null,
          iconOverride: existing.iconOverride ?? t.icon ?? null,
          videoOverride: existing.videoOverride ?? t.video ?? null,
          nodeX: existing.nodeX ?? t.node_x ?? null,
          nodeY: existing.nodeY ?? t.node_y ?? null,
          fav: existing.fav ?? t.fav ?? false,
        };
        await progressTable.put(overlay);
      }
    });
  }
}

export const db = new SlalomDB();

export async function clearAllUserProgress(): Promise<void> {
  await db.transaction('rw', db.user_trick_progress, async () => {
    await db.user_trick_progress.clear();
  });
}

export async function clearCatalogRateFields(): Promise<void> {
  // After T4 the canonical tricks table no longer has rate/rateL/rateR/last/status/fav.
  // On sign-out we clear the user_trick_progress overlay instead (done in clearAllUserProgress).
  // Transitions and sequences still have their own rate/last fields.
  await db.transaction('rw', db.transitions, db.sequences, async () => {
    await db.transitions.clear();
    await db.sequences.clear();
  });
}
