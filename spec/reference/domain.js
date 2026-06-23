/**
 * domain.js — pure domain logic for the Slalom Tricks app.
 * Ported from the Cowork artifact (cowork-artifact.html). No framework deps.
 * Port to src/domain/ (TS welcome) and unit-test this module.
 */

// ---------- constants ----------
export const ALPHA = 0.4; // weight of today's report in the EWMA rating

export const TIER_NAMES = {
  1: "Basics", 2: "Beginner", 3: "Intermediate",
  4: "Advanced", 5: "Challenging", 6: "Master",
};
export const CAT_ORDER = [
  "forward", "backward", "cross", "eagle", "one-foot",
  "sitting", "spin", "seven", "wheeling",
];
export const SCORE_HINTS = { 1: "bad", 2: "rough", 3: "ok", 4: "good", 5: "excellent" };

// rate → traffic-light color
export const rateColor = (r) =>
  r >= 4 ? "#3fbf75" : r >= 2.5 ? "#e0a93e" : "#d95757";
export const RATE_NONE = "#565764";

// portal leg colors — use EVERYWHERE an L/R appears (labels, buttons, chips, graph)
export const SIDE_L_COLOR = "#ffb36b"; // left  = light orange
export const SIDE_R_COLOR = "#7cc5ff"; // right = light blue
export const EDGE_NEUTRAL = "#cbb3e6"; // leg not specified = light lily
export const sideColor = (s) =>
  s === "L" ? SIDE_L_COLOR : s === "R" ? SIDE_R_COLOR : EDGE_NEUTRAL;

// ---------- ratings ----------
export const blend = (old, score) =>
  old == null ? score : Math.round(((1 - ALPHA) * old + ALPHA * score) * 100) / 100;

export const hasRate = (t) => (t.lr ? t.rateL != null || t.rateR != null : t.rate != null);

export function effRate(t) {
  if (!t.lr) return t.rate;
  const v = [t.rateL, t.rateR].filter((x) => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100 : null;
}

export const statusFor = (t) =>
  !hasRate(t) ? "Not Started" : (effRate(t) ?? 0) >= 4.5 ? "Complete" : "In Progress";

/** Report today's run. side: "L" | "R" | null. Mutates and returns the trick. */
export function reportTrick(t, score, side, today = isoToday()) {
  if (t.lr && side === "L") t.rateL = blend(t.rateL, score);
  else if (t.lr && side === "R") t.rateR = blend(t.rateR, score);
  else t.rate = blend(t.rate, score);
  t.last = today;
  t.status = statusFor(t);
  return t;
}

export function resetTrick(t) {
  t.rate = t.rateL = t.rateR = null;
  t.last = null;
  t.status = "Not Started";
  return t; // keeps lr, tags, aliases, icon, fav, video
}

/** Toggle L/R tracking. On: seed both sides with the single rate. Off: collapse to avg. */
export function toggleLR(t) {
  if (!t.lr) { t.lr = true; t.rateL = t.rate; t.rateR = t.rate; t.rate = null; }
  else { t.rate = effRate(t); t.lr = false; t.rateL = null; t.rateR = null; }
  return t;
}

export const isoToday = () => new Date().toISOString().slice(0, 10);

// ---------- edges (transitions) ----------
export const sideOk = (edgeSide, side) =>
  edgeSide == null || side == null || edgeSide === side;

/** step: { name (or trickId), side: "L"|"R"|null } */
export function hasEdgeStep(edges, a, b) {
  return edges.some(
    (e) =>
      (e.from === a.name && e.to === b.name &&
        sideOk(e.fromSide, a.side) && sideOk(e.toSide, b.side)) ||
      (e.bidi && e.from === b.name && e.to === a.name &&
        sideOk(e.fromSide, b.side) && sideOk(e.toSide, a.side)),
  );
}

export const reportEdge = (e, score, today = isoToday()) => {
  e.rate = blend(e.rate, score);
  e.last = today;
  return e;
};

export const duplicateEdge = (edges, from, to, fromSide, toSide) =>
  edges.some((e) => e.from === from && e.to === to &&
    e.fromSide === (fromSide ?? null) && e.toSide === (toSide ?? null));

// ---------- sequence steps serialization (if you keep text export) ----------
export const SEQ_SEP = " > ";
export const parseStep = (s) => {
  const m = s.match(/^(.*?)(?:\s*~\s*([LR]))?$/);
  return { name: (m ? m[1] : s).trim(), side: m && m[2] ? m[2] : null };
};
export const stepToStr = (st) => (st.side ? `${st.name} ~${st.side}` : st.name);

// ---------- generators ----------
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function sample(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Shared generator filters: { tier: 0|1..6 (max, 0 = any), exCats: [], exTags: [] } */
export const genFilter = (t, st) =>
  !(st.tier && t.tier > st.tier) &&
  !st.exCats.includes(t.category) &&
  !t.tags.some((tag) => st.exTags.includes(tag));

export const GEN_LIMITS = { graph: 12, known: 12, random: 8 }; // hard caps

/**
 * Mode 1: leg-aware random walk over the transition graph.
 * pool: tricks shown on the graph (practiced or referenced by an edge), pre-filtered.
 * Returns steps [{name, side}] (>= 2) or null.
 */
export function genGraphWalk(n, pool, edges, st) {
  const candidates = pool.filter((t) => genFilter(t, st));
  const names = new Set(candidates.map((t) => t.name));
  const opts = {};
  edges.forEach((e) => {
    if (!names.has(e.from) || !names.has(e.to)) return;
    (opts[e.from] = opts[e.from] || []).push({ to: e.to, fromSide: e.fromSide, toSide: e.toSide });
    if (e.bidi)
      (opts[e.to] = opts[e.to] || []).push({ to: e.from, fromSide: e.toSide, toSide: e.fromSide });
  });
  const starts = Object.keys(opts);
  if (!starts.length) return null;
  let cur = { name: rnd(starts), side: null };
  const steps = [cur];
  while (steps.length < n) {
    const cand = (opts[cur.name] || []).filter((o) => sideOk(o.fromSide, cur.side));
    if (!cand.length) break;
    const fresh = cand.filter((o) => !steps.some((s) => s.name === o.to));
    const pick = rnd(fresh.length ? fresh : cand);
    if (pick.fromSide && !cur.side) cur.side = pick.fromSide; // refine departing leg
    cur = { name: pick.to, side: pick.toSide || null };
    steps.push(cur);
  }
  return steps.length >= 2 ? steps : null;
}

/** Mode 2: shuffle of practiced tricks; edges ignored. */
export function genKnownShuffle(n, tricks, st) {
  const pool = tricks.filter((t) => hasRate(t) && genFilter(t, st));
  if (pool.length < 2) return null;
  return sample(pool, n).map((t) => ({ name: t.name, side: null }));
}

/**
 * Mode 3: totally random tricks (known or not). HARD CAP n <= GEN_LIMITS.random.
 * stance=true: prefer next trick whose entry === previous exit; fallback to any unused.
 */
export function genTotallyRandom(n, tricks, st) {
  n = Math.min(n, GEN_LIMITS.random);
  const pool = tricks.filter((t) => genFilter(t, st));
  if (pool.length < 2) return null;
  if (!st.stance) return sample(pool, n).map((t) => ({ name: t.name, side: null }));
  let cur = rnd(pool);
  const used = new Set([cur.name]);
  const steps = [{ name: cur.name, side: null }];
  while (steps.length < n) {
    const unused = pool.filter((t) => !used.has(t.name));
    if (!unused.length) break;
    const matching = unused.filter((t) => t.entry === cur.exit);
    cur = rnd(matching.length ? matching : unused);
    used.add(cur.name);
    steps.push({ name: cur.name, side: null });
  }
  return steps.length >= 2 ? steps : null;
}

// ---------- video links ----------
const YT = (id) => "https://www.youtube.com/watch?v=" + id;
/** Verified tutorial links (pagophilia.com USARS slalom grades; YouTube). */
export const KNOWN_VIDEOS = {
  "Fish": YT("CoTcgVYeyd4"), "Snake": YT("eeGshwLWtug"), "Backwards Snake": YT("mxcttRftOCo"),
  "Criss-Cross": YT("YL05Pt2RULs"), "Backwards Criss-Cross": YT("_qSGLlFQEP4"),
  "Grapevine": YT("43HgxtE7cj0"), "Nelson": YT("EpZ8RxamiKY"), "Backwards Nelson": YT("xhSrIHI1ZqE"),
  "Sun": YT("vsXG_tiIABk"), "Crazy": YT("oBfMkUDIj5I"), "Mabrouk": YT("ijBs6QEjGm0"),
  "Stroll": YT("STm1g4XDq-8"), "Backwards Stroll": YT("5QcUa_HSBx4"), "Crab": YT("YaxhnnAOhT4"),
  "One Foot": YT("xXvWL161TYU"), "Backwards One Foot": YT("o7CPngmmgZw"), "Italian": YT("EHuRAmKa0HY"),
  "Mexican": YT("3_cAoCHX8lk"), "Crazy Sun": YT("I6NzxEl8gyo"), "Eight": YT("pRtlW6gllEU"),
  "Backwards Eight": YT("i9avmxMW4qw"), "X": YT("7_kvlyyI6vE"), "X Jump (Crab Cross)": YT("rkKoSyIk88o"),
  "Toe-Toe Snake": YT("jCq_sXclFdw"), "Volt": YT("4JjXjBnUG2Q"), "Eagle": YT("ujs5Vx7v7AQ"),
  "Eagle Cross (Independent)": YT("ujs5Vx7v7AQ"), "Small Car": YT("22JgQVHr_U8"),
  "J-Turn": YT("mwfYY6lK5hg"), "Backwards J-Turn": YT("xdUrxYkJj74"), "Brush": YT("Nge57TIXvRo"),
  "Special": YT("ull2hjPNdyA"), "Backwards Heel-Toe Snake": YT("k1H5RDDkMas"),
  "Crazy One Cone": YT("PtkZR08drhg"), "Wiper": YT("kOHNJi4ABMQ"), "Fan Volt": YT("aA5fNwxhidY"),
  "Total Cross": YT("3HVjvocKEBY"), "Swan": YT("xIMtd8hN6eQ"), "Screw": YT("pRVtgFYL4lY"),
  "Toe Wheeling": YT("VfCNoPNBU6Y"), "Heel Wheeling": YT("VfCNoPNBU6Y"), "Crazy Leg": YT("0pAMncgkyMM"),
  "Footgun": YT("MnECrRC12Y0"), "Backwards Footgun": YT("WQ1afjHr6II"), "Kasakchok": YT("i7rQVwqFy_E"),
  "Backwards Kasakchok": YT("G8hJmvWbHDo"), "Christie": YT("AMkFs6tMexM"),
  "Backwards Christie": YT("hfY5cHQ5fi8"), "Toe Christie": YT("yioZcT3SFaM"),
  "Deckchair (Corvo)": YT("JJTg1feKYos"), "B To F Wheeling": YT("ksd6a3eHi3A"),
  "Sewing Machine": YT("U7C-bHw51nE"), "Cobra": YT("3qMxCTHOtJU"), "Backwards Cobra": YT("rFZh55-LYww"),
  "Chicken Leg": YT("8n_EeawdHMc"), "Toe Reverse Eagle": YT("fVWPldGByyE"), "Butterfly": YT("rrrOLa3UOjs"),
};

export function videoUrl(t) {
  if (t.video) return { url: t.video, concrete: true };
  if (KNOWN_VIDEOS[t.name]) return { url: KNOWN_VIDEOS[t.name], concrete: true };
  const q = encodeURIComponent(`freestyle slalom skating ${t.name} tutorial`);
  return { url: `https://www.youtube.com/results?search_query=${q}`, concrete: false };
}

// ---------- search / sort helpers ----------
export const matchesQuery = (t, q) =>
  t.name.toLowerCase().includes(q) ||
  t.aliases.some((a) => a.toLowerCase().includes(q));

export const sorters = {
  name: (a, b) => a.name.localeCompare(b.name),
  best: (a, b) => (effRate(b) ?? 0) - (effRate(a) ?? 0) || a.name.localeCompare(b.name),
  worst: (a, b) => (effRate(a) ?? 0) - (effRate(b) ?? 0) || a.name.localeCompare(b.name),
};
