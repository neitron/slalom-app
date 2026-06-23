import { defineStore } from 'pinia';
import {
  getAllTricks,
  getTrick,
  reportTrick,
  upsertTrick,
} from '../storage/repo';
import { ensureSeeded } from '../storage/seed';
import {
  effectiveRate,
  hasRate,
  resetTrick,
  toggleLrOff,
  toggleLrOn,
} from '../domain/rating';
import type { Category, Side, Tier, Trick } from '../domain/types';

export type SortKey = 'name' | 'best' | 'worst';

export interface FilterOpts {
  tier?: Tier | null;
  category?: Category | 'all';
  search?: string;
  sort?: SortKey;
  practicedOnly?: boolean;
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

export const useTricksStore = defineStore('tricks', {
  state: () => ({
    tricks: [] as Trick[],
    loaded: false,
  }),

  getters: {
    byId(state) {
      return (id: string): Trick | undefined =>
        state.tricks.find((t) => t.id === id);
    },
    byTier(state) {
      return (tier: Tier): Trick[] =>
        state.tricks.filter((t) => t.tier === tier);
    },
    filteredAndSorted(state) {
      return (opts: FilterOpts = {}): Trick[] => {
        const {
          tier = null,
          category = 'all',
          search = '',
          sort = 'name',
          practicedOnly = false,
        } = opts;
        let list = state.tricks.slice();
        if (tier != null) list = list.filter((t) => t.tier === tier);
        if (category && category !== 'all')
          list = list.filter((t) => t.category === category);
        if (search) list = list.filter((t) => matchesQuery(t, search));
        if (practicedOnly) list = list.filter((t) => hasRate(t));
        list.sort(sorters[sort]);
        return list;
      };
    },
  },

  actions: {
    async load(): Promise<void> {
      await ensureSeeded();
      this.tricks = await getAllTricks();
      this.loaded = true;
    },

    async report(id: string, side: Side, score: number): Promise<void> {
      const updated = await reportTrick(id, side, score);
      this.replaceLocal(updated);
    },

    async updateTrick(patch: Partial<Trick> & { id: string }): Promise<void> {
      const existing = this.byId(patch.id);
      if (!existing) return;
      const next: Trick = { ...existing, ...patch };
      this.replaceLocal(next);
      await upsertTrick(next);
    },

    async toggleFav(id: string): Promise<void> {
      const t = this.byId(id);
      if (!t) return;
      const next: Trick = { ...t, fav: !t.fav };
      this.replaceLocal(next);
      await upsertTrick(next);
    },

    async toggleLr(id: string): Promise<void> {
      const t = this.byId(id);
      if (!t) return;
      const next: Trick = { ...t };
      if (next.lr) toggleLrOff(next);
      else toggleLrOn(next);
      this.replaceLocal(next);
      await upsertTrick(next);
    },

    async resetProgress(id: string): Promise<void> {
      const t = this.byId(id);
      if (!t) return;
      const next: Trick = { ...t };
      resetTrick(next);
      this.replaceLocal(next);
      await upsertTrick(next);
    },

    async updateAliases(id: string, aliases: string[]): Promise<void> {
      const t = this.byId(id);
      const patch: Partial<Trick> & { id: string } = { id, aliases };
      if (t?.mainAlias && !aliases.includes(t.mainAlias)) patch.mainAlias = null;
      await this.updateTrick(patch);
    },

    async setMainAlias(id: string, alias: string | null): Promise<void> {
      const t = this.byId(id);
      if (!t) return;
      const next = alias && t.aliases.includes(alias) ? alias : null;
      await this.updateTrick({ id, mainAlias: next });
    },

    async updateTags(id: string, tags: string[]): Promise<void> {
      await this.updateTrick({ id, tags });
    },

    async updateVideo(id: string, video: string | null): Promise<void> {
      await this.updateTrick({ id, video });
    },

    async updateEmoji(id: string, icon: string | null): Promise<void> {
      await this.updateTrick({ id, icon });
    },

    async refresh(id: string): Promise<void> {
      const fresh = await getTrick(id);
      if (fresh) this.replaceLocal(fresh);
    },

    replaceLocal(t: Trick): void {
      if (!t.id) return;
      const next: Trick = { ...t };
      const idx = this.tricks.findIndex((x) => x.id === next.id);
      if (idx === -1) this.tricks.push(next);
      else this.tricks.splice(idx, 1, next);
    },
  },
});
