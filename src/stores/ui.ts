import { defineStore } from 'pinia';
import type { Category, Side, Tier } from '../domain/types';
import type { SortKey } from './tricks';

export type Tab = 'tricks' | 'learning' | 'graph' | 'transitions' | 'sequences' | 'settings';

export type RateContext = 'trick' | 'transition' | 'sequence';
export interface FeedbackReport {
  score: 1 | 2 | 3 | 4 | 5;
  side: Side;
  context: RateContext;
  label?: string;
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    openSheetTrickId: null as string | null,
    openTransitionId: null as string | null,
    openSequenceId: null as string | null,
    currentTab: 'tricks' as Tab,
    tier: 1 as Tier,
    category: 'all' as Category | 'all',
    search: '',
    sort: 'name' as SortKey,
    feedback: null as FeedbackReport | null,
  }),

  actions: {
    openSheet(id: string): void {
      this.openSheetTrickId = id;
    },
    closeSheet(): void {
      this.openSheetTrickId = null;
    },
    openTransition(id: string): void {
      this.openTransitionId = id;
    },
    closeTransition(): void {
      this.openTransitionId = null;
    },
    openSequence(id: string): void {
      this.openSequenceId = id;
    },
    closeSequence(): void {
      this.openSequenceId = null;
    },
    setTab(tab: Tab): void {
      this.currentTab = tab;
    },
    setTier(tier: Tier): void {
      this.tier = tier;
    },
    setCategory(category: Category | 'all'): void {
      this.category = category;
    },
    setSearch(search: string): void {
      this.search = search;
    },
    setSort(sort: SortKey): void {
      this.sort = sort;
    },
    triggerFeedback(report: FeedbackReport): void {
      this.feedback = { ...report };
    },
    clearFeedback(): void {
      this.feedback = null;
    },
  },
});
