import Dexie, { type Table } from 'dexie';
import type { PracticeLog, Sequence, Transition, Trick } from '../domain/types';
import type { OutboxRow } from './outbox';

export class SlalomDB extends Dexie {
  tricks!: Table<Trick, string>;
  transitions!: Table<Transition, string>;
  sequences!: Table<Sequence, string>;
  practice_log!: Table<PracticeLog, string>;
  outbox!: Table<OutboxRow, string>;

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
  }
}

export const db = new SlalomDB();
