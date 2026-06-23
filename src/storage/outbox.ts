import { db } from './dexie';
import { uuidv4 } from './uuid';

export type OutboxOp = 'upsert' | 'delete';
export type OutboxTable =
  | 'tricks'
  | 'transitions'
  | 'sequences'
  | 'practice_log'
  | 'user_trick_progress'
  | 'user_transition_progress'
  | 'user_sequence_progress'
  | 'profiles'
  | 'friendships'
  | 'user_blocks';

export interface OutboxRow {
  id: string;
  op: OutboxOp;
  table: OutboxTable;
  payload: Record<string, unknown>;
  ts: number;
}

const newOutboxId = (): string => uuidv4();

export async function enqueue(
  op: OutboxOp,
  table: OutboxTable,
  payload: Record<string, unknown>,
): Promise<void> {
  const row: OutboxRow = {
    id: newOutboxId(),
    op,
    table,
    payload,
    ts: Date.now(),
  };
  await db.outbox.put(row);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('slalom:outbox-changed'));
  }
}

export async function listOutbox(): Promise<OutboxRow[]> {
  return db.outbox.orderBy('ts').toArray();
}

export async function removeOutbox(id: string): Promise<void> {
  await db.outbox.delete(id);
}

export async function clearOutbox(): Promise<void> {
  await db.outbox.clear();
}
