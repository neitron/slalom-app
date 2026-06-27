import { defineStore } from 'pinia';
import {
  upsertCanonicalTrick,
  upsertTrickOverlay,
  getTrickOverlay,
  getCanonicalTrick,
  deleteTrickOverlay,
  getTrickMerged,
  loadLibraryPage,
  reportTrick,
  type LibraryPageOpts,
  type LibraryPageResult,
} from '../storage/repo';
import { ensureSeeded } from '../storage/seed';
import { getCurrentUserId } from '../storage/social';
import { mergeTrick } from '../domain/mergeTrick';
import {
  effectiveRate,
  toggleLrOff,
} from '../domain/rating';
import type {
  CanonicalTrick,
  Category,
  Side,
  Tier,
  Trick,
  TrickOverlay,
  TrickStatus,
} from '../domain/types';

export type SortKey = 'name' | 'best' | 'worst';

export interface FilterOpts {
  // Multi-select (Phase 4b)
  tiers?:      Tier[]        | null;
  categories?: Category[]    | null;
  statuses?:   TrickStatus[] | null;
  favOnly?:    boolean;

  // Existing — kept
  search?: string;
  sort?:   SortKey;
}

const sorters: Record<SortKey, (a: Trick, b: Trick) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  best: (a, b) =>
    (effectiveRate(b) ?? 0) - (effectiveRate(a) ?? 0) ||
    a.name.localeCompare(b.name),
  worst: (a, b) =>
    (effectiveRate(a) ?? 0) - (effectiveRate(b) ?? 0) ||
    a.name.localeCompare(b.name),
};

const matchesQuery = (t: Trick, q: string): boolean => {
  if (!q) return true;
  const ql = q.toLowerCase();
  return (
    t.name.toLowerCase().includes(ql) ||
    t.aliases.some((a) => a.toLowerCase().includes(ql))
  );
};

function blankOverlay(userId: string, trickId: string): TrickOverlay {
  return {
    userId,
    trickId,
    rate: null,
    rateL: null,
    rateR: null,
    last: null,
    status: 'Not Started' as TrickStatus,
    aliases: [],
    tags: [],
    mainAlias: null,
    iconOverride: null,
    videoOverride: null,
    nodeX: null,
    nodeY: null,
    fav: false,
  };
}

export const useTricksStore = defineStore('tricks', {
  state: () => ({
    canonicals: [] as CanonicalTrick[],
    overlaysByTrickId: new Map<string, TrickOverlay>(),
    loaded: false,
  }),

  getters: {
    tricks(state): Trick[] {
      return state.canonicals.map((c) =>
        mergeTrick(c, c.id ? state.overlaysByTrickId.get(c.id) ?? null : null),
      );
    },

    byId(): (id: string) => Trick | undefined {
      return (id: string) => this.tricks.find((t) => t.id === id);
    },

    byTier(): (tier: Tier) => Trick[] {
      return (tier: Tier) => this.tricks.filter((t) => t.tier === tier);
    },

    filteredAndSorted(): (opts?: FilterOpts) => Trick[] {
      return (opts: FilterOpts = {}): Trick[] => {
        const {
          search = '',
          sort = 'name',
          tiers = null,
          categories = null,
          statuses = null,
          favOnly = false,
        } = opts;
        let list = this.tricks.slice();

        if (tiers != null && tiers.length > 0) {
          const setT = new Set(tiers);
          list = list.filter((t) => setT.has(t.tier));
        }

        if (categories != null && categories.length > 0) {
          const setC = new Set(categories);
          list = list.filter((t) => setC.has(t.category));
        }

        if (search) list = list.filter((t) => matchesQuery(t, search));

        if (statuses != null && statuses.length > 0) {
          const setS = new Set(statuses);
          list = list.filter((t) => setS.has(t.status));
        }

        if (favOnly) list = list.filter((t) => t.fav);

        list.sort(sorters[sort]);
        return list;
      };
    },
  },

  actions: {
    async load(): Promise<void> {
      await ensureSeeded();
      const userId = await getCurrentUserId();
      const uid = userId ?? null;

      // Load canonicals from Dexie
      const { db } = await import('../storage/dexie');
      this.canonicals = (await db.tricks.toArray()) as CanonicalTrick[];

      if (uid) {
        const overlays = (await db.user_trick_progress
          .where('userId')
          .equals(uid)
          .toArray()) as TrickOverlay[];
        this.overlaysByTrickId = new Map(overlays.map((o) => [o.trickId, o]));
      } else {
        this.overlaysByTrickId = new Map();
      }
      this.loaded = true;
    },

    async report(id: string, side: Side, score: number): Promise<void> {
      const updated = await reportTrick(id, side, score);
      this.replaceLocal(updated);
      // Sync the overlay in state too
      const userId = await getCurrentUserId();
      if (userId) {
        const overlay = await getTrickOverlay(userId, id);
        if (overlay) {
          this.overlaysByTrickId.set(id, overlay);
          this.overlaysByTrickId = new Map(this.overlaysByTrickId);
        }
      }
    },

    async create(input: {
      name: string;
      tier: Tier;
      category: Category;
      lr: boolean;
      icon?: string | null;
      firstAlias?: string | null;
    }): Promise<string> {
      const name = input.name.trim();
      if (!name) throw new Error('Trick name required');
      const alias = input.firstAlias?.trim();
      const aliasArr: string[] = alias ? [alias] : [];
      const userId = await getCurrentUserId();
      const canonical: CanonicalTrick = {
        name,
        tier: input.tier,
        category: input.category,
        entry: '2/f',
        exit: '2/f',
        lr: input.lr,
        createdBy: userId,
        visibility: 'private',
        defaultAliases: aliasArr,
        defaultTags: [],
        defaultIcon: input.icon?.trim() || null,
        defaultVideo: null,
      };
      const id = await upsertCanonicalTrick(canonical);
      canonical.id = id;
      this.canonicals = [...this.canonicals, canonical];
      return id;
    },

    async refresh(id: string): Promise<void> {
      const userId = await getCurrentUserId();
      const fresh = await getTrickMerged(id, userId ?? null);
      if (fresh) this.replaceLocal(fresh);
    },

    // ---------------------------------------------------------------------------
    // Overlay patch helper
    // ---------------------------------------------------------------------------

    async _patchOverlay(id: string, patch: Partial<TrickOverlay>): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to customize tricks');
      const existing = await getTrickOverlay(userId, id);
      const next: TrickOverlay = { ...(existing ?? blankOverlay(userId, id)), ...patch };
      await upsertTrickOverlay(next);
      this.overlaysByTrickId.set(id, next);
      // Trigger Pinia reactivity (Map mutation is not tracked, reassign to new Map)
      this.overlaysByTrickId = new Map(this.overlaysByTrickId);
    },

    // ---------------------------------------------------------------------------
    // Patch actions — all write to overlay now
    // ---------------------------------------------------------------------------

    async toggleFav(id: string): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to favorite tricks');
      const existing = await getTrickOverlay(userId, id);
      const current = existing ?? blankOverlay(userId, id);
      await this._patchOverlay(id, { fav: !current.fav });
    },

    async toggleLr(id: string): Promise<void> {
      // lr is a canonical field — only the creator (or best-effort) can toggle
      const canonical = await getCanonicalTrick(id);
      if (!canonical) return;
      if (canonical.lr) {
        toggleLrOff({ lr: canonical.lr, rate: null, rateL: null, rateR: null } as Trick);
        canonical.lr = false;
      } else {
        canonical.lr = true;
      }
      await upsertCanonicalTrick(canonical);
      // Update local canonicals list
      const idx = this.canonicals.findIndex((c) => c.id === id);
      if (idx >= 0) {
        this.canonicals = [
          ...this.canonicals.slice(0, idx),
          { ...canonical },
          ...this.canonicals.slice(idx + 1),
        ];
      }
    },

    async resetProgress(id: string): Promise<void> {
      await this._patchOverlay(id, {
        rate: null,
        rateL: null,
        rateR: null,
        last: null,
        status: 'Not Started',
      });
    },

    async resetTrickSide(id: string, side: Side): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) return;
      const existing = await getTrickOverlay(userId, id);
      const current = existing ?? blankOverlay(userId, id);
      const patch: Partial<TrickOverlay> = {};
      if (side === 'L') patch.rateL = null;
      else if (side === 'R') patch.rateR = null;
      else patch.rate = null;

      // Recompute aggregate state from what remains
      const canonical = await getCanonicalTrick(id);
      const afterL = side === 'L' ? null : current.rateL;
      const afterR = side === 'R' ? null : current.rateR;
      const afterRate = side === null ? null : current.rate;
      const stillRated = canonical?.lr
        ? afterL != null || afterR != null
        : afterRate != null;
      if (!stillRated) {
        patch.last = null;
        patch.status = 'Not Started';
      }
      await this._patchOverlay(id, patch);
    },

    async updateAliases(id: string, aliases: string[]): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to customize tricks');
      const existing = await getTrickOverlay(userId, id);
      const patch: Partial<TrickOverlay> = { aliases };
      // Clear mainAlias if it's no longer in the alias list
      const currentMainAlias = existing?.mainAlias ?? null;
      if (currentMainAlias && !aliases.includes(currentMainAlias)) {
        patch.mainAlias = null;
      }
      await this._patchOverlay(id, patch);
    },

    async setMainAlias(id: string, alias: string | null): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to customize tricks');
      const existing = await getTrickOverlay(userId, id);
      const currentAliases = existing?.aliases ?? [];
      const canonical = await getCanonicalTrick(id);
      const effectiveAliases = currentAliases.length > 0
        ? currentAliases
        : (canonical?.defaultAliases ?? []);
      const next = alias && effectiveAliases.includes(alias) ? alias : null;
      await this._patchOverlay(id, { mainAlias: next });
    },

    async updateTags(id: string, tags: string[]): Promise<void> {
      await this._patchOverlay(id, { tags });
    },

    async updateVideo(id: string, video: string | null): Promise<void> {
      await this._patchOverlay(id, { videoOverride: video });
    },

    async updateEmoji(id: string, icon: string | null): Promise<void> {
      await this._patchOverlay(id, { iconOverride: icon });
    },

    // ---------------------------------------------------------------------------
    // New actions: publish / unpublish / adopt / unadopt / loadLibraryPage
    // ---------------------------------------------------------------------------

    async publish(id: string): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to publish');
      const canonical = await getCanonicalTrick(id);
      if (!canonical) throw new Error('Trick not found');
      if (canonical.createdBy !== userId) throw new Error('Only the creator can publish');
      canonical.visibility = 'public';
      await upsertCanonicalTrick(canonical);
      // Update local canonical
      const idx = this.canonicals.findIndex((c) => c.id === id);
      if (idx >= 0) {
        this.canonicals = [
          ...this.canonicals.slice(0, idx),
          { ...canonical },
          ...this.canonicals.slice(idx + 1),
        ];
      }
    },

    async unpublish(id: string): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to unpublish');
      const canonical = await getCanonicalTrick(id);
      if (!canonical) throw new Error('Trick not found');
      if (canonical.createdBy !== userId) throw new Error('Only the creator can unpublish');
      canonical.visibility = 'private';
      await upsertCanonicalTrick(canonical);
      // Update local canonical
      const idx = this.canonicals.findIndex((c) => c.id === id);
      if (idx >= 0) {
        this.canonicals = [
          ...this.canonicals.slice(0, idx),
          { ...canonical },
          ...this.canonicals.slice(idx + 1),
        ];
      }
    },

    async adopt(id: string): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Sign in to adopt');
      const existing = await getTrickOverlay(userId, id);
      if (existing) return; // already adopted — idempotent
      const empty = blankOverlay(userId, id);
      await upsertTrickOverlay(empty);
      // Add overlay to state
      this.overlaysByTrickId.set(id, empty);
      this.overlaysByTrickId = new Map(this.overlaysByTrickId);
      // Add canonical to state if not already present
      const alreadyInState = this.canonicals.some((c) => c.id === id);
      if (!alreadyInState) {
        const canonical = await getCanonicalTrick(id);
        if (canonical) {
          this.canonicals = [...this.canonicals, canonical];
        }
      }
    },

    async unadopt(id: string): Promise<void> {
      const userId = await getCurrentUserId();
      if (!userId) return;
      const existing = await getTrickOverlay(userId, id);
      if (!existing) return;
      // Guard: fail if overlay has any non-default data
      const hasData =
        existing.rate != null ||
        existing.rateL != null ||
        existing.rateR != null ||
        existing.aliases.length > 0 ||
        existing.tags.length > 0 ||
        existing.fav ||
        existing.iconOverride != null ||
        existing.videoOverride != null ||
        existing.nodeX != null ||
        existing.nodeY != null;
      if (hasData) {
        throw new Error('Trick has progress or customizations — clear them first');
      }
      await deleteTrickOverlay(userId, id);
      this.overlaysByTrickId.delete(id);
      this.overlaysByTrickId = new Map(this.overlaysByTrickId);
      // Remove from canonicals if it was adopted (not seeded / not own)
      const canonical = this.canonicals.find((c) => c.id === id);
      if (canonical && canonical.createdBy !== null && canonical.createdBy !== userId) {
        this.canonicals = this.canonicals.filter((c) => c.id !== id);
      }
    },

    async loadLibraryPage(opts: LibraryPageOpts): Promise<LibraryPageResult> {
      const userId = await getCurrentUserId();
      return loadLibraryPage(opts, userId ?? null);
    },

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    replaceLocal(t: Trick): void {
      if (!t.id) return;
      // Update overlay in state if the trick has overlay fields
      // For simplicity, update the merged list by manipulating canonicals
      // (canonical is unchanged for report; overlay is updated separately)
      // This is a passthrough for compatibility — report() updates overlay separately
      const idx = this.canonicals.findIndex((c) => c.id === t.id);
      if (idx === -1) {
        // New trick — shouldn't happen via replaceLocal but handle gracefully
        return;
      }
      // canonical doesn't change in a report; the overlay update triggers re-merge via getter
    },
  },
});
