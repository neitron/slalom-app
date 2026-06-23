import { defineStore } from 'pinia';
import { fetchCatalogTricksByIds, loadForeignProgress } from '../storage/social';
import { mergeTrick } from '../storage/progressMap';
import type { Profile, Sequence, Transition, Trick } from '../domain/types';
import { useTricksStore } from './tricks';
import { useAuthStore } from './auth';
import { useFriendsStore } from './friends';

export type ForeignReason = 'private' | 'friends_only' | 'blocked' | 'ok';

export interface ForeignEntry {
  profile: Profile;
  tricks: Trick[];
  transitions: Transition[];
  sequences: Sequence[];
  cachedAt: number;
  reason: ForeignReason;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

interface State {
  byUser: Record<string, ForeignEntry>;
}

export const useForeignProgressStore = defineStore('foreignProgress', {
  state: (): State => ({
    byUser: {},
  }),
  actions: {
    get(userId: string): ForeignEntry | null {
      return this.byUser[userId] ?? null;
    },

    initEntry(profile: Profile, reason: ForeignReason): ForeignEntry {
      const entry: ForeignEntry = {
        profile,
        tricks: [],
        transitions: [],
        sequences: [],
        cachedAt: Date.now(),
        reason,
        loaded: reason !== 'ok',
        loading: false,
        error: null,
      };
      this.byUser = { ...this.byUser, [profile.id]: entry };
      return entry;
    },

    determineVisibility(profile: Profile): ForeignReason {
      const auth = useAuthStore();
      const friends = useFriendsStore();
      const viewer = auth.currentUserId;
      if (!viewer) return 'private';
      if (viewer === profile.id) return 'ok';
      if (friends.isBlockedByMe(profile.id)) return 'blocked';
      if (profile.visibility === 'public') return 'ok';
      if (profile.visibility === 'private') return 'private';
      if (profile.visibility === 'friends') {
        return friends.isFriend(profile.id) ? 'ok' : 'friends_only';
      }
      return 'private';
    },

    async load(profile: Profile, opts: { force?: boolean } = {}): Promise<ForeignEntry> {
      const existing = this.byUser[profile.id];
      if (existing && !opts.force && existing.loaded) return existing;
      const reason = this.determineVisibility(profile);
      if (reason !== 'ok') {
        return this.initEntry(profile, reason);
      }
      const entry: ForeignEntry = existing
        ? { ...existing, loading: true, error: null, profile }
        : {
            profile,
            tricks: [],
            transitions: [],
            sequences: [],
            cachedAt: Date.now(),
            reason: 'ok',
            loaded: false,
            loading: true,
            error: null,
          };
      this.byUser = { ...this.byUser, [profile.id]: entry };

      try {
        const tricksStore = useTricksStore();
        const knownTrickIds = new Set(
          tricksStore.tricks.map((t) => t.id).filter((x): x is string => !!x),
        );

        const res = await loadForeignProgress(profile.id, profile, knownTrickIds);

        if (res.missingTrickIds.length) {
          const fetched = await fetchCatalogTricksByIds(res.missingTrickIds);
          for (const t of fetched) tricksStore.replaceLocal(t);
        }

        const catalogTrickById = new Map<string, Trick>(
          tricksStore.tricks.map((t) => [t.id ?? '', t]),
        );

        const tricks: Trick[] = [];
        for (const p of res.tricks) {
          const cat = catalogTrickById.get(p.trickId);
          if (!cat) continue;
          tricks.push(mergeTrick(cat, p));
        }
        const transitions: Transition[] = res.transitions;
        const sequences: Sequence[] = res.sequences;

        const next: ForeignEntry = {
          profile,
          tricks,
          transitions,
          sequences,
          cachedAt: Date.now(),
          reason: 'ok',
          loaded: true,
          loading: false,
          error: null,
        };
        this.byUser = { ...this.byUser, [profile.id]: next };
        return next;
      } catch (e) {
        const next: ForeignEntry = {
          ...entry,
          loading: false,
          loaded: false,
          error: (e as Error).message,
        };
        this.byUser = { ...this.byUser, [profile.id]: next };
        return next;
      }
    },

    clear(): void {
      this.byUser = {};
    },
  },
});
