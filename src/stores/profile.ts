import { defineStore } from 'pinia';
import { db } from '../storage/dexie';
import {
  NicknameTakenError,
  SocialUnavailableError,
  checkNicknameAvailable,
  getOwnProfile,
  upsertOwnProfile,
} from '../storage/social';
import { useAuthStore } from './auth';
import type { Profile, ProfileVisibility } from '../domain/types';
import { useUiStore } from './ui';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  nicknameAvailable: boolean | null;
  checkingNickname: boolean;
  lastSyncedAt: number | null;
}

let nickCheckTimer: number | null = null;

function shouldToastSocialError(): boolean {
  return true;
}

export const useProfileStore = defineStore('profile', {
  state: (): ProfileState => ({
    profile: null,
    loading: false,
    saving: false,
    error: null,
    nicknameAvailable: null,
    checkingNickname: false,
    lastSyncedAt: null,
  }),
  getters: {
    hasNickname(state): boolean {
      return !!state.profile?.nickname;
    },
  },
  actions: {
    async load(): Promise<void> {
      const auth = useAuthStore();
      if (!auth.currentUserId) return;
      this.loading = true;
      this.error = null;
      try {
        const local = await db.profiles.get(auth.currentUserId);
        if (local) this.profile = local;
        try {
          const remote = await getOwnProfile();
          if (remote) {
            this.profile = remote;
            await db.profiles.put(remote);
            this.lastSyncedAt = Date.now();
          }
        } catch (e) {
          if (e instanceof SocialUnavailableError) {
            if (shouldToastSocialError()) {
              useUiStore().showError('Profiles unavailable. Run M3.5 migration.');
            }
          } else {
            this.error = (e as Error).message;
          }
        }
      } finally {
        this.loading = false;
      }
    },

    async updateField(patch: Partial<Profile>): Promise<void> {
      const auth = useAuthStore();
      if (!auth.currentUserId) return;
      const id = auth.currentUserId;
      this.saving = true;
      this.error = null;
      try {
        const next = await upsertOwnProfile({ id, ...patch });
        this.profile = next;
        await db.profiles.put(next);
        this.lastSyncedAt = Date.now();
      } catch (e) {
        if (e instanceof NicknameTakenError) {
          this.error = 'Nickname taken.';
        } else if (e instanceof SocialUnavailableError) {
          this.error = 'Profile table missing. Run the M3.5 migration.';
        } else {
          this.error = (e as Error).message;
        }
        throw e;
      } finally {
        this.saving = false;
      }
    },

    async upsertNickname(nickname: string): Promise<void> {
      await this.updateField({ nickname });
    },

    async updateVisibility(v: ProfileVisibility): Promise<void> {
      await this.updateField({ visibility: v });
    },

    async updateDisplayName(name: string | null): Promise<void> {
      await this.updateField({ displayName: name?.trim() || null });
    },

    async updateBio(bio: string | null): Promise<void> {
      await this.updateField({ bio: bio?.trim() || null });
    },

    async updateAvatarEmoji(emoji: string | null): Promise<void> {
      await this.updateField({ avatarEmoji: emoji?.trim() || null });
    },

    async checkNicknameAvailable(nickname: string): Promise<void> {
      this.checkingNickname = true;
      this.nicknameAvailable = null;
      if (nickCheckTimer != null) window.clearTimeout(nickCheckTimer);
      await new Promise<void>((resolve) => {
        nickCheckTimer = window.setTimeout(resolve, 300);
      });
      try {
        const ok = await checkNicknameAvailable(nickname);
        this.nicknameAvailable = ok;
      } catch {
        this.nicknameAvailable = null;
      } finally {
        this.checkingNickname = false;
      }
    },
  },
});
