export type Side = 'L' | 'R' | null;

export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

export type Category =
  | 'forward'
  | 'backward'
  | 'cross'
  | 'eagle'
  | 'one-foot'
  | 'sitting'
  | 'spin'
  | 'seven'
  | 'wheeling';

export type Stance =
  | '2/f' | '2/b'
  | '1/f' | '1/b'
  | 'toe/f' | 'toe/b'
  | 'heel/f' | 'heel/b'
  | 'wheel/f' | 'wheel/b'
  | string;

export type TrickStatus = 'Not Started' | 'In Progress' | 'Complete';

export interface Trick {
  id?: string;
  name: string;
  tier: Tier;
  category: Category;
  entry: Stance;
  exit: Stance;
  lr: boolean;
  rate: number | null;
  rateL: number | null;
  rateR: number | null;
  last: string | null;
  status: TrickStatus;
  aliases: string[];
  mainAlias?: string | null;
  video: string | null;
  icon: string | null;
  tags: string[];
  fav: boolean;
  node_x?: number | null;
  node_y?: number | null;
}

export interface Transition {
  id?: string;
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  bidi: boolean;
  rate: number | null;
  last: string | null;
}

export interface SequenceStep {
  name: string;
  side: Side;
}

export interface Sequence {
  id?: string;
  name: string;
  created: string;
  rate: number | null;
  last: string | null;
  steps: SequenceStep[];
}

export type PracticeEntityType = 'trick' | 'transition' | 'sequence';

export interface PracticeLog {
  id?: string;
  entityType: PracticeEntityType;
  entityId: string;
  side: Side;
  score: number;
  at: string;
}

export interface GenFilter {
  tier: number;
  exCats: string[];
  exTags: string[];
  stance?: boolean;
}

export type Rng = () => number;
