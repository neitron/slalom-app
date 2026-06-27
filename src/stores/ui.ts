import { defineStore } from 'pinia';
import type { Category, Side, Tier, TrickStatus } from '../domain/types';
import type { SortKey } from './tricks';

export type Tab = 'tricks' | 'learning' | 'graph' | 'transitions' | 'sequences' | 'settings';

export type SequencesSubTab = 'sequences' | 'transitions';
export type SequencesSortKey = 'newest' | 'best' | 'worst';
export type TransitionsSortKey = 'name' | 'best' | 'worst' | 'recent';
export type TricksSubTab = 'my-tricks' | 'library';
export type LibrarySortKey = 'newest' | 'name';

export type RateContext = 'trick' | 'transition' | 'sequence';
export interface FeedbackReport {
  score: 1 | 2 | 3 | 4 | 5;
  side: Side;
  context: RateContext;
  label?: string;
}

export type ToastKind = 'error' | 'info';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
let toastCounter = 0;

export const useUiStore = defineStore('ui', {
  state: () => ({
    openSheetTrickId: null as string | null,
    openTransitionId: null as string | null,
    openSequenceId: null as string | null,
    currentTab: 'tricks' as Tab,
    // Phase 4b — plural fields
    tricksTiers: [] as Tier[],
    tricksCategories: [] as Category[],
    tricksStatuses: [] as TrickStatus[],
    tricksFavOnly: false,
    tricksSearch: '',
    tricksSort: 'name' as SortKey,
    // Phase 6 R2 — Sequences/Transitions sub-tab state
    sequencesSubTab: 'sequences' as SequencesSubTab,
    sequencesSearch: '',
    sequencesSort: 'newest' as SequencesSortKey,
    transitionsSearch: '',
    transitionsSort: 'name' as TransitionsSortKey,
    transitionsCategory: 'all' as Category | 'all',
    // Trick Library — Tricks page sub-tab + library browse state
    tricksSubTab: 'my-tricks' as TricksSubTab,
    librarySearch: '',
    librarySort: 'newest' as LibrarySortKey,
    libraryTiers: [] as Tier[],
    libraryCategories: [] as Category[],
    feedback: null as FeedbackReport | null,
    toasts: [] as Toast[],
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
    setTricksTiers(v: Tier[]): void {
      this.tricksTiers = v;
    },
    setTricksCategories(v: Category[]): void {
      this.tricksCategories = v;
    },
    setTricksStatuses(v: TrickStatus[]): void {
      this.tricksStatuses = v;
    },
    setTricksFavOnly(v: boolean): void {
      this.tricksFavOnly = v;
    },
    setTricksSearch(v: string): void {
      this.tricksSearch = v;
    },
    setTricksSort(v: SortKey): void {
      this.tricksSort = v;
    },
    setSequencesSubTab(v: SequencesSubTab): void {
      this.sequencesSubTab = v;
    },
    setSequencesSearch(v: string): void {
      this.sequencesSearch = v;
    },
    setSequencesSort(v: SequencesSortKey): void {
      this.sequencesSort = v;
    },
    setTransitionsSearch(v: string): void {
      this.transitionsSearch = v;
    },
    setTransitionsSort(v: TransitionsSortKey): void {
      this.transitionsSort = v;
    },
    setTransitionsCategory(v: Category | 'all'): void {
      this.transitionsCategory = v;
    },
    setTricksSubTab(v: TricksSubTab): void {
      this.tricksSubTab = v;
    },
    setLibrarySearch(v: string): void {
      this.librarySearch = v;
    },
    setLibrarySort(v: LibrarySortKey): void {
      this.librarySort = v;
    },
    setLibraryTiers(v: Tier[]): void {
      this.libraryTiers = v;
    },
    setLibraryCategories(v: Category[]): void {
      this.libraryCategories = v;
    },
    resetTricksFilters(): void {
      this.tricksTiers = [];
      this.tricksCategories = [];
      this.tricksStatuses = [];
      this.tricksFavOnly = false;
      // search + sort intentionally NOT reset by this action
    },
    triggerFeedback(report: FeedbackReport): void {
      this.feedback = { ...report };
    },
    clearFeedback(): void {
      this.feedback = null;
    },
    pushToast(kind: ToastKind, message: string): number {
      const id = ++toastCounter;
      this.toasts.push({ id, kind, message });
      return id;
    },
    dismissToast(id: number): void {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },
    showError(message: string): void {
      const id = this.pushToast('error', message);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => this.dismissToast(id), 5000);
      }
    },
    closeAllSheets(): void {
      this.openSheetTrickId = null;
      this.openTransitionId = null;
      this.openSequenceId = null;
    },
  },
});
