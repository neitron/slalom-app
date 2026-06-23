import Dexie, { type Table } from 'dexie';
import type {
  Friendship,
  PracticeLog,
  Profile,
  Sequence,
  Transition,
  Trick,
  UserBlock,
  UserTrickProgress,
} from '../domain/types';
import type { OutboxRow } from './outbox';

export class SlalomDB extends Dexie {
  tricks!: Table<Trick, string>;
  transitions!: Table<Transition, string>;
  sequences!: Table<Sequence, string>;
  practice_log!: Table<PracticeLog, string>;
  outbox!: Table<OutboxRow, string>;
  profiles!: Table<Profile, string>;
  friendships!: Table<Friendship, string>;
  user_blocks!: Table<UserBlock, [string, string]>;
  user_trick_progress!: Table<UserTrickProgress, [string, string]>;

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
  }
}

export const db = new SlalomDB();

export async function clearAllUserProgress(): Promise<void> {
  await db.transaction('rw', db.user_trick_progress, async () => {
    await db.user_trick_progress.clear();
  });
}

export async function clearCatalogRateFields(): Promise<void> {
  await db.transaction('rw', db.tricks, db.transitions, db.sequences, async () => {
    const tricks = await db.tricks.toArray();
    if (tricks.length) {
      await db.tricks.bulkPut(
        tricks.map((t) => ({
          ...t,
          rate: null,
          rateL: null,
          rateR: null,
          last: null,
          status: 'Not Started',
          fav: false,
        })),
      );
    }
    await db.transitions.clear();
    await db.sequences.clear();
  });
}
