import { db } from './dexie';
import { isUuid, uuidv4 } from './uuid';
import { clearOutbox } from './outbox';

export interface IdMigrationReport {
  tricks: number;
  transitions: number;
  sequences: number;
  practice_log: number;
  orphans_dropped: number;
}

export async function migrateNonUuidIds(): Promise<IdMigrationReport> {
  const remap = new Map<string, string>();
  const report: IdMigrationReport = {
    tricks: 0,
    transitions: 0,
    sequences: 0,
    practice_log: 0,
    orphans_dropped: 0,
  };

  await db.transaction('rw', db.tricks, db.transitions, db.sequences, db.practice_log, db.outbox, async () => {
    const tricks = await db.tricks.toArray();
    for (const t of tricks) {
      if (t.id && !isUuid(t.id)) {
        const newId = uuidv4();
        remap.set(t.id, newId);
        await db.tricks.delete(t.id);
        t.id = newId;
        await db.tricks.put(t);
        report.tricks += 1;
      }
    }

    const sequences = await db.sequences.toArray();
    for (const s of sequences) {
      let touched = false;
      if (s.id && !isUuid(s.id)) {
        const newId = uuidv4();
        remap.set(s.id, newId);
        await db.sequences.delete(s.id);
        s.id = newId;
        touched = true;
      }
      const fixedSteps = s.steps.map((step) => {
        const m = remap.get(step.name);
        return m ? { ...step, name: m } : step;
      });
      if (fixedSteps.some((step, i) => step !== s.steps[i])) {
        s.steps = fixedSteps;
        touched = true;
      }
      // Note: sequence.steps[].name can still hold a trick NAME (legacy) or non-UUID id;
      // the server stores steps as opaque jsonb so this is fine — only top-level row ids matter.
      if (touched) {
        await db.sequences.put(s);
        report.sequences += 1;
      }
    }

    const liveTrickIds = new Set((await db.tricks.toArray()).map((t) => t.id).filter(Boolean) as string[]);
    const liveSequenceIds = new Set((await db.sequences.toArray()).map((s) => s.id).filter(Boolean) as string[]);

    const transitions = await db.transitions.toArray();
    for (const e of transitions) {
      let touched = false;
      const fromRemap = remap.get(e.from);
      if (fromRemap) { e.from = fromRemap; touched = true; }
      const toRemap = remap.get(e.to);
      if (toRemap) { e.to = toRemap; touched = true; }
      const orphan = !isUuid(e.from) || !isUuid(e.to) || !liveTrickIds.has(e.from) || !liveTrickIds.has(e.to);
      if (orphan) {
        if (e.id) await db.transitions.delete(e.id);
        report.orphans_dropped += 1;
        continue;
      }
      if (e.id && !isUuid(e.id)) {
        const newId = uuidv4();
        await db.transitions.delete(e.id);
        e.id = newId;
        touched = true;
      }
      if (touched) {
        await db.transitions.put(e);
        report.transitions += 1;
      }
    }

    const logs = await db.practice_log.toArray();
    for (const l of logs) {
      let touched = false;
      const entityRemap = remap.get(l.entityId);
      if (entityRemap) { l.entityId = entityRemap; touched = true; }
      const entitySet = l.entityType === 'sequence' ? liveSequenceIds
        : l.entityType === 'trick' ? liveTrickIds
        : null;
      const entityValid = isUuid(l.entityId) && (entitySet === null || entitySet.has(l.entityId));
      if (!entityValid) {
        if (l.id) await db.practice_log.delete(l.id);
        report.orphans_dropped += 1;
        continue;
      }
      if (l.id && !isUuid(l.id)) {
        const newId = uuidv4();
        await db.practice_log.delete(l.id);
        l.id = newId;
        touched = true;
      }
      if (touched) {
        await db.practice_log.put(l);
        report.practice_log += 1;
      }
    }
  });

  if (
    report.tricks + report.transitions + report.sequences + report.practice_log + report.orphans_dropped > 0
  ) {
    await clearOutbox();
  }

  return report;
}
