import { defineStore } from 'pinia';
import {
  deleteTransition,
  getAllTransitions,
  reportTransition,
  upsertTransition,
} from '../storage/repo';
import type { Transition } from '../domain/types';

export const useTransitionsStore = defineStore('transitions', {
  state: () => ({
    edges: [] as Transition[],
    loaded: false,
  }),

  getters: {
    byId(state) {
      return (id: string): Transition | undefined =>
        state.edges.find((e) => e.id === id);
    },
    between(state) {
      return (fromId: string, toId: string): Transition[] =>
        state.edges.filter(
          (e) =>
            (e.from === fromId && e.to === toId) ||
            (e.bidi && e.from === toId && e.to === fromId),
        );
    },
  },

  actions: {
    async load(): Promise<void> {
      this.edges = await getAllTransitions();
      this.loaded = true;
    },

    async add(e: Transition): Promise<string> {
      const id = await upsertTransition(e);
      const saved: Transition = { ...e, id };
      this.replaceLocal(saved);
      return id;
    },

    async update(patch: Partial<Transition> & { id: string }): Promise<void> {
      const existing = this.byId(patch.id);
      if (!existing) return;
      const next: Transition = { ...existing, ...patch };
      this.replaceLocal(next);
      await upsertTransition(next);
    },

    async remove(id: string): Promise<void> {
      await deleteTransition(id);
      const idx = this.edges.findIndex((e) => e.id === id);
      if (idx !== -1) this.edges.splice(idx, 1);
    },

    async report(id: string, score: number): Promise<void> {
      const updated = await reportTransition(id, score);
      this.replaceLocal(updated);
    },

    replaceLocal(e: Transition): void {
      if (!e.id) return;
      const next: Transition = { ...e };
      const idx = this.edges.findIndex((x) => x.id === next.id);
      if (idx === -1) this.edges.push(next);
      else this.edges.splice(idx, 1, next);
    },
  },
});
