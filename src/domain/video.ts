import type { Trick } from './types';

const YT = (id: string): string => 'https://www.youtube.com/watch?v=' + id;

export const KNOWN_VIDEOS: Record<string, string> = {
  'Fish': YT('CoTcgVYeyd4'),
  'Snake': YT('eeGshwLWtug'),
  'Backwards Snake': YT('mxcttRftOCo'),
  'Criss-Cross': YT('YL05Pt2RULs'),
  'Backwards Criss-Cross': YT('_qSGLlFQEP4'),
  'Grapevine': YT('43HgxtE7cj0'),
  'Nelson': YT('EpZ8RxamiKY'),
  'Backwards Nelson': YT('xhSrIHI1ZqE'),
  'Sun': YT('vsXG_tiIABk'),
  'Crazy': YT('oBfMkUDIj5I'),
  'Mabrouk': YT('ijBs6QEjGm0'),
  'Stroll': YT('STm1g4XDq-8'),
  'Backwards Stroll': YT('5QcUa_HSBx4'),
  'Crab': YT('YaxhnnAOhT4'),
  'One Foot': YT('xXvWL161TYU'),
  'Backwards One Foot': YT('o7CPngmmgZw'),
  'Italian': YT('EHuRAmKa0HY'),
  'Mexican': YT('3_cAoCHX8lk'),
  'Crazy Sun': YT('I6NzxEl8gyo'),
  'Eight': YT('pRtlW6gllEU'),
  'Backwards Eight': YT('i9avmxMW4qw'),
  'X': YT('7_kvlyyI6vE'),
  'X Jump (Crab Cross)': YT('rkKoSyIk88o'),
  'Toe-Toe Snake': YT('jCq_sXclFdw'),
  'Volt': YT('4JjXjBnUG2Q'),
  'Eagle': YT('ujs5Vx7v7AQ'),
  'Eagle Cross (Independent)': YT('ujs5Vx7v7AQ'),
  'Small Car': YT('22JgQVHr_U8'),
  'J-Turn': YT('mwfYY6lK5hg'),
  'Backwards J-Turn': YT('xdUrxYkJj74'),
  'Brush': YT('Nge57TIXvRo'),
  'Special': YT('ull2hjPNdyA'),
  'Backwards Heel-Toe Snake': YT('k1H5RDDkMas'),
  'Crazy One Cone': YT('PtkZR08drhg'),
  'Wiper': YT('kOHNJi4ABMQ'),
  'Fan Volt': YT('aA5fNwxhidY'),
  'Total Cross': YT('3HVjvocKEBY'),
  'Swan': YT('xIMtd8hN6eQ'),
  'Screw': YT('pRVtgFYL4lY'),
  'Toe Wheeling': YT('VfCNoPNBU6Y'),
  'Heel Wheeling': YT('VfCNoPNBU6Y'),
  'Crazy Leg': YT('0pAMncgkyMM'),
  'Footgun': YT('MnECrRC12Y0'),
  'Backwards Footgun': YT('WQ1afjHr6II'),
  'Kasakchok': YT('i7rQVwqFy_E'),
  'Backwards Kasakchok': YT('G8hJmvWbHDo'),
  'Christie': YT('AMkFs6tMexM'),
  'Backwards Christie': YT('hfY5cHQ5fi8'),
  'Toe Christie': YT('yioZcT3SFaM'),
  'Deckchair (Corvo)': YT('JJTg1feKYos'),
  'B To F Wheeling': YT('ksd6a3eHi3A'),
  'Sewing Machine': YT('U7C-bHw51nE'),
  'Cobra': YT('3qMxCTHOtJU'),
  'Backwards Cobra': YT('rFZh55-LYww'),
  'Chicken Leg': YT('8n_EeawdHMc'),
  'Toe Reverse Eagle': YT('fVWPldGByyE'),
  'Butterfly': YT('rrrOLa3UOjs'),
};

export interface ResolvedVideo {
  url: string;
  concrete: boolean;
}

export function resolveVideoUrl(t: Trick): ResolvedVideo {
  if (t.video) return { url: t.video, concrete: true };
  const known = KNOWN_VIDEOS[t.name];
  if (known) return { url: known, concrete: true };
  const q = encodeURIComponent(`freestyle slalom skating ${t.name} tutorial`);
  return { url: `https://www.youtube.com/results?search_query=${q}`, concrete: false };
}
