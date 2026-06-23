import { defineStore } from 'pinia';
import { db } from '../storage/dexie';
import {
  SocialUnavailableError,
  acceptFriendship,
  blockUser,
  deleteFriendship,
  listBlocks,
  listFriendships,
  searchProfiles,
  sendFriendRequest,
  unblockUser,
} from '../storage/social';
import { useAuthStore } from './auth';
import type { Friendship, Profile, UserBlock } from '../domain/types';
import { useUiStore } from './ui';

interface FriendsState {
  friendships: Friendship[];
  blocks: UserBlock[];
  loading: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

export const useFriendsStore = defineStore('friends', {
  state: (): FriendsState => ({
    friendships: [],
    blocks: [],
    loading: false,
    lastSyncedAt: null,
    error: null,
  }),
  getters: {
    incoming(state): Friendship[] {
      const uid = useAuthStore().currentUserId;
      if (!uid) return [];
      return state.friendships.filter((f) => f.addresseeId === uid && f.status === 'pending');
    },
    outgoing(state): Friendship[] {
      const uid = useAuthStore().currentUserId;
      if (!uid) return [];
      return state.friendships.filter((f) => f.requesterId === uid && f.status === 'pending');
    },
    accepted(state): Friendship[] {
      return state.friendships.filter((f) => f.status === 'accepted');
    },
    incomingCount(): number {
      return this.incoming.length;
    },
    isFriend(state) {
      return (otherId: string): boolean => {
        const uid = useAuthStore().currentUserId;
        if (!uid) return false;
        return state.friendships.some(
          (f) =>
            f.status === 'accepted' &&
            ((f.requesterId === uid && f.addresseeId === otherId) ||
              (f.requesterId === otherId && f.addresseeId === uid)),
        );
      };
    },
    isBlockedByMe(state) {
      return (otherId: string): boolean => {
        const uid = useAuthStore().currentUserId;
        if (!uid) return false;
        return state.blocks.some((b) => b.blockerId === uid && b.blockedId === otherId);
      };
    },
  },
  actions: {
    async loadAll(): Promise<void> {
      const auth = useAuthStore();
      if (!auth.currentUserId) return;
      this.loading = true;
      this.error = null;
      try {
        const localF = await db.friendships.toArray();
        const localB = await db.user_blocks.toArray();
        if (localF.length) this.friendships = localF;
        if (localB.length) this.blocks = localB;
        try {
          const [remoteF, remoteB] = await Promise.all([listFriendships(), listBlocks()]);
          this.friendships = remoteF;
          this.blocks = remoteB;
          await db.transaction('rw', db.friendships, db.user_blocks, async () => {
            await db.friendships.clear();
            if (remoteF.length) await db.friendships.bulkPut(remoteF);
            await db.user_blocks.clear();
            if (remoteB.length) await db.user_blocks.bulkPut(remoteB);
          });
          this.lastSyncedAt = Date.now();
        } catch (e) {
          if (e instanceof SocialUnavailableError) {
            useUiStore().showError('Friends table missing. Run M3.5 migration.');
          } else {
            this.error = (e as Error).message;
          }
        }
      } finally {
        this.loading = false;
      }
    },

    async sendRequest(addresseeId: string): Promise<void> {
      try {
        const f = await sendFriendRequest(addresseeId);
        this.friendships = [...this.friendships, f];
        await db.friendships.put(f);
      } catch (e) {
        useUiStore().showError(`Friend request failed: ${(e as Error).message}`);
        throw e;
      }
    },

    async accept(id: string): Promise<void> {
      try {
        const f = await acceptFriendship(id);
        this.friendships = this.friendships.map((x) => (x.id === id ? f : x));
        await db.friendships.put(f);
      } catch (e) {
        useUiStore().showError(`Accept failed: ${(e as Error).message}`);
        throw e;
      }
    },

    async decline(id: string): Promise<void> {
      await this.remove(id);
    },

    async cancel(id: string): Promise<void> {
      await this.remove(id);
    },

    async unfriend(friendId: string): Promise<void> {
      const uid = useAuthStore().currentUserId;
      if (!uid) return;
      const rel = this.friendships.find(
        (f) =>
          (f.requesterId === uid && f.addresseeId === friendId) ||
          (f.requesterId === friendId && f.addresseeId === uid),
      );
      if (rel) await this.remove(rel.id);
    },

    async remove(id: string): Promise<void> {
      try {
        await deleteFriendship(id);
        this.friendships = this.friendships.filter((f) => f.id !== id);
        await db.friendships.delete(id);
      } catch (e) {
        useUiStore().showError(`Friendship update failed: ${(e as Error).message}`);
        throw e;
      }
    },

    async block(otherId: string): Promise<void> {
      try {
        const b = await blockUser(otherId);
        this.blocks = [...this.blocks, b];
        await db.user_blocks.put(b);
        const uid = useAuthStore().currentUserId;
        if (uid) {
          this.friendships = this.friendships.filter(
            (f) => !((f.requesterId === uid && f.addresseeId === otherId) || (f.requesterId === otherId && f.addresseeId === uid)),
          );
        }
      } catch (e) {
        useUiStore().showError(`Block failed: ${(e as Error).message}`);
        throw e;
      }
    },

    async unblock(otherId: string): Promise<void> {
      try {
        await unblockUser(otherId);
        const uid = useAuthStore().currentUserId;
        this.blocks = this.blocks.filter((b) => !(b.blockerId === uid && b.blockedId === otherId));
        if (uid) await db.user_blocks.delete([uid, otherId]);
      } catch (e) {
        useUiStore().showError(`Unblock failed: ${(e as Error).message}`);
        throw e;
      }
    },

    async searchByNickname(prefix: string, limit = 20): Promise<Profile[]> {
      try {
        return await searchProfiles(prefix, limit);
      } catch (e) {
        if (e instanceof SocialUnavailableError) {
          useUiStore().showError('Search unavailable. Run M3.5 migration.');
          return [];
        }
        throw e;
      }
    },
  },
});
