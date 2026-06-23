import { defineStore } from 'pinia';
import {
  deleteSequence,
  getAllSequences,
  reportSequence,
  upsertSequence,
} from '../storage/repo';
import { isoToday } from '../domain/rating';
import type { Sequence, SequenceStep } from '../domain/types';

export type SequenceSortKey = 'newest' | 'best' | 'worst';

export const useSequencesStore = defineStore('sequences', {
  state: () => ({
    sequences: [] as Sequence[],
    loaded: false,
  }),

  getters: {
    byId(state) {
      return (id: string): Sequence | undefined =>
        state.sequences.find((s) => s.id === id);
    },
    sortedBy(state) {
      return (key: SequenceSortKey): Sequence[] => {
        const list = state.sequences.slice();
        switch (key) {
          case 'newest':
            list.sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
            break;
          case 'best':
            list.sort(
              (a, b) =>
                (b.rate ?? 0) - (a.rate ?? 0) || a.name.localeCompare(b.name),
            );
            break;
          case 'worst':
            list.sort(
              (a, b) =>
                (a.rate ?? 0) - (b.rate ?? 0) || a.name.localeCompare(b.name),
            );
            break;
        }
        return list;
      };
    },
  },

  actions: {
    async load(): Promise<void> {
      this.sequences = await getAllSequences();
      this.loaded = true;
    },

    async create(input: { name: string; steps: SequenceStep[] }): Promise<Sequence> {
      const draft: Sequence = {
        name: input.name,
        created: isoToday(),
        rate: null,
        last: null,
        steps: input.steps,
      };
      const id = await upsertSequence(draft);
      const saved: Sequence = { ...draft, id };
      this.replaceLocal(saved);
      return saved;
    },

    async rename(id: string, name: string): Promise<void> {
      const existing = this.byId(id);
      if (!existing) return;
      const next: Sequence = { ...existing, name };
      this.replaceLocal(next);
      await upsertSequence(next);
    },

    async remove(id: string): Promise<void> {
      await deleteSequence(id);
      const idx = this.sequences.findIndex((s) => s.id === id);
      if (idx !== -1) this.sequences.splice(idx, 1);
    },

    async report(id: string, score: number): Promise<void> {
      const updated = await reportSequence(id, score);
      this.replaceLocal(updated);
    },

    replaceLocal(s: Sequence): void {
      if (!s.id) return;
      const next: Sequence = { ...s };
      const idx = this.sequences.findIndex((x) => x.id === next.id);
      if (idx === -1) this.sequences.push(next);
      else this.sequences.splice(idx, 1, next);
    },
  },
});
