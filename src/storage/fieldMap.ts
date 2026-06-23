import type {
  PracticeEntityType,
  PracticeLog,
  Sequence,
  SequenceStep,
  Side,
  Stance,
  Transition,
  Trick,
  TrickStatus,
  Category,
  Tier,
} from '../domain/types';

export interface TrickRow {
  id?: string;
  name: string;
  tier: Tier;
  category: Category;
  entry: Stance;
  exit: Stance;
  lr: boolean;
  rate: number | null;
  rate_l: number | null;
  rate_r: number | null;
  last_practiced: string | null;
  status: TrickStatus;
  aliases: string[];
  main_alias: string | null;
  video: string | null;
  icon: string | null;
  tags: string[];
  fav: boolean;
  node_x: number | null;
  node_y: number | null;
}

export interface TransitionRow {
  id?: string;
  from_trick: string;
  to_trick: string;
  from_side: Side;
  to_side: Side;
  bidi: boolean;
  rate: number | null;
  last_practiced: string | null;
}

export interface SequenceRow {
  id?: string;
  name: string;
  steps: SequenceStep[];
  created: string;
  rate: number | null;
  last_practiced: string | null;
}

export interface PracticeLogRow {
  id?: string;
  entity_type: PracticeEntityType;
  entity_id: string;
  side: Side;
  score: number;
  at: string;
}

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
};

export function mapTrickToServer(t: Trick): TrickRow {
  return stripUndefined({
    id: t.id,
    name: t.name,
    tier: t.tier,
    category: t.category,
    entry: t.entry,
    exit: t.exit,
    lr: t.lr,
    rate: t.rate,
    rate_l: t.rateL,
    rate_r: t.rateR,
    last_practiced: t.last,
    status: t.status,
    aliases: t.aliases,
    main_alias: t.mainAlias ?? null,
    video: t.video,
    icon: t.icon,
    tags: t.tags,
    fav: t.fav,
    node_x: t.node_x ?? null,
    node_y: t.node_y ?? null,
  });
}

export function mapTrickFromServer(r: TrickRow): Trick {
  return {
    id: r.id,
    name: r.name,
    tier: r.tier,
    category: r.category,
    entry: r.entry,
    exit: r.exit,
    lr: r.lr,
    rate: r.rate,
    rateL: r.rate_l,
    rateR: r.rate_r,
    last: r.last_practiced,
    status: r.status,
    aliases: r.aliases ?? [],
    mainAlias: r.main_alias ?? null,
    video: r.video,
    icon: r.icon,
    tags: r.tags ?? [],
    fav: r.fav,
    node_x: r.node_x ?? null,
    node_y: r.node_y ?? null,
  };
}

export function mapTransitionToServer(t: Transition): TransitionRow {
  return stripUndefined({
    id: t.id,
    from_trick: t.from,
    to_trick: t.to,
    from_side: t.fromSide,
    to_side: t.toSide,
    bidi: t.bidi,
    rate: t.rate,
    last_practiced: t.last,
  });
}

export function mapTransitionFromServer(r: TransitionRow): Transition {
  return {
    id: r.id,
    from: r.from_trick,
    to: r.to_trick,
    fromSide: r.from_side,
    toSide: r.to_side,
    bidi: r.bidi,
    rate: r.rate,
    last: r.last_practiced,
  };
}

export function mapSequenceToServer(s: Sequence): SequenceRow {
  return stripUndefined({
    id: s.id,
    name: s.name,
    steps: s.steps,
    created: s.created,
    rate: s.rate,
    last_practiced: s.last,
  });
}

export function mapSequenceFromServer(r: SequenceRow): Sequence {
  return {
    id: r.id,
    name: r.name,
    created: r.created,
    rate: r.rate,
    last: r.last_practiced,
    steps: Array.isArray(r.steps) ? r.steps : [],
  };
}

export function mapPracticeLogToServer(p: PracticeLog): PracticeLogRow {
  return stripUndefined({
    id: p.id,
    entity_type: p.entityType,
    entity_id: p.entityId,
    side: p.side,
    score: p.score,
    at: p.at,
  });
}

export function mapPracticeLogFromServer(r: PracticeLogRow): PracticeLog {
  return {
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    side: r.side,
    score: r.score,
    at: r.at,
  };
}
