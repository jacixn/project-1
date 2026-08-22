// Make it fit: planning for a day where things overlap. The AI proposes a
// plan in words and JSON; this file is the part that never trusts it. It
// builds the model the AI sees, validates what comes back (only movable
// items, lengths kept, no overlaps left, nothing unrelated touched) and
// carries a deterministic cascade as the fallback and the offline path.
// Import-free so the selftest can evaluate it under plain node.

export const SOFT_MAX_MIN = 15;   // things this short sit inside longer ones (a 5-min prayer in a show)
export const OVERLAP_MIN = 10;    // overlaps shorter than this are life, not conflicts (a game ending 5 min late)
export const WAKE_START = 5 * 60; // never plan anything before 5 AM
export const EARLY_FLOOR = 8 * 60; // when the evening is full, slide earlier, but not before 8 AM
export const DAY_LIMIT = 24 * 60;

const roundUp5 = (m) => Math.ceil(m / 5) * 5;
const roundDown5 = (m) => Math.floor(m / 5) * 5;
const overlapMin = (a, b) => Math.min(a.endMin, b.endMin) - Math.max(a.startMin, b.startMin);
const overlap = (a, b) => overlapMin(a, b) > 0;              // strict: used when placing
const conflicts = (a, b) => overlapMin(a, b) >= OVERLAP_MIN; // tolerant: used when judging
export const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const fromHm = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]); const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
};

// My Week items -> planner model. Movable here is stricter than the Move
// panel: only one-time things move, because sliding a weekly workout or a
// daily prayer would change every week, not today.
export const toModel = (items) => (items || []).map((it, i) => {
  const raw = it.raw || {};
  const oneTime = raw.type === 'one-time';
  const sports = it.kind === 'eyecandySports';
  const durationMin = Math.max(5, (it.endMin || 0) - (it.startMin || 0));
  const days = Array.isArray(raw.days) ? raw.days : [];
  const daily = !days.length || days.length === 7;
  const why = sports ? 'kick-off is fixed'
    : !it.movable ? 'read-only'
    : !oneTime ? (it.kind === 'prayer' ? 'daily prayer' : daily && (it.kind === 'reminder' || it.kind === 'gym') ? 'repeats every day' : 'repeats every week')
    : null;
  return {
    id: it.id,
    key: `k${i + 1}`,
    title: it.title || 'Untitled',
    kind: it.kind,
    color: it.color,
    startMin: it.startMin,
    endMin: it.endMin,
    durationMin,
    soft: durationMin <= SOFT_MAX_MIN,
    movable: !!it.movable && oneTime && !sports,
    why,
  };
});

const blockingOf = (model, anchorId) => model.filter((m) => !m.soft || m.id === anchorId);

// Overlapping pairs among blocking items where at least one side can move.
export const fixableOverlaps = (model, anchorId = null) => {
  const list = blockingOf(model, anchorId);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (!conflicts(a, b)) continue;
      const aCan = a.movable && a.id !== anchorId;
      const bCan = b.movable && b.id !== anchorId;
      if (aCan || bCan) out.push([a, b]);
    }
  }
  return out;
};

// Items allowed to move: movable members of any overlap cluster (connected
// through overlaps). Anything outside a cluster is none of the planner's
// business, however "good" a reshuffle might look.
export const allowedIds = (model, anchorId = null) => {
  const list = blockingOf(model, anchorId);
  const parent = new Map(list.map((m) => [m.id, m.id]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const union = (a, b) => parent.set(find(a), find(b));
  const inConflict = new Set();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (conflicts(list[i], list[j])) { union(list[i].id, list[j].id); inConflict.add(list[i].id); inConflict.add(list[j].id); }
    }
  }
  const roots = new Set([...inConflict].map(find));
  const out = new Set();
  for (const m of list) {
    if (m.movable && m.id !== anchorId && roots.has(find(m.id))) out.add(m.id);
  }
  return out;
};

const clearOf = (obstacles, start, dur) => {
  let s = roundUp5(Math.max(start, WAKE_START));
  let moved = true;
  while (moved) {
    moved = false;
    for (const o of obstacles) {
      if (s < o.endMin && s + dur > o.startMin) { s = roundUp5(o.endMin); moved = true; }
    }
  }
  return s;
};

// Latest clear start at or before `start` (5-min grid), or null when the
// only room is before 8 AM.
const clearBefore = (obstacles, start, dur) => {
  let s = roundDown5(start);
  let moved = true;
  while (moved) {
    if (s < EARLY_FLOOR) return null;
    moved = false;
    for (const o of obstacles) {
      if (s < o.endMin && s + dur > o.startMin) { s = roundDown5(o.startMin - dur); moved = true; }
    }
  }
  return s >= EARLY_FLOOR ? s : null;
};

// Deterministic plan: walk the day in start order; anything that collides
// slides forward to the first clear gap, flowing around fixed items. When
// the rest of the day is full it slides earlier instead (not before 8 AM).
// Only items in an overlap cluster are touched.
export const cascadePlan = (model, anchorId = null) => {
  const allowed = allowedIds(model, anchorId);
  const list = blockingOf(model, anchorId);
  const obstacles = list.filter((m) => !allowed.has(m.id)).map(({ startMin, endMin }) => ({ startMin, endMin }));
  const movers = list.filter((m) => allowed.has(m.id)).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const moves = [];
  const overflow = [];
  for (const m of movers) {
    let placed = clearOf(obstacles, m.startMin, m.durationMin);
    if (placed + m.durationMin > DAY_LIMIT) placed = clearBefore(obstacles, m.startMin, m.durationMin);
    if (placed == null) { overflow.push(m.title); continue; }
    if (placed !== m.startMin) moves.push({ id: m.id, startMin: placed });
    obstacles.push({ startMin: placed, endMin: placed + m.durationMin });
  }
  return { moves, overflow };
};

// Free gaps once everything that cannot or need not move is in place: the
// only room a plan may use. [{ startMin, endMin }] from 5 AM to midnight.
export const freeGaps = (model, anchorId = null) => {
  const allowed = allowedIds(model, anchorId);
  const obstacles = blockingOf(model, anchorId)
    .filter((m) => !allowed.has(m.id))
    .map(({ startMin, endMin }) => ({ startMin, endMin }))
    .sort((a, b) => a.startMin - b.startMin);
  const gaps = [];
  let cur = WAKE_START;
  for (const o of obstacles) {
    if (o.startMin > cur) gaps.push({ startMin: cur, endMin: o.startMin });
    cur = Math.max(cur, o.endMin);
  }
  if (cur < DAY_LIMIT) gaps.push({ startMin: cur, endMin: DAY_LIMIT });
  return gaps.filter((g) => g.endMin - g.startMin >= 5);
};

// Check a plan (AI or otherwise) against the rules. { ok, reason }.
export const validatePlan = (model, plan, anchorId = null) => {
  if (!plan || !Array.isArray(plan.moves)) return { ok: false, reason: 'no moves array' };
  const byId = new Map(model.map((m) => [m.id, m]));
  const allowed = allowedIds(model, anchorId);
  const seen = new Set();
  for (const mv of plan.moves) {
    const m = byId.get(mv.id);
    if (!m) return { ok: false, reason: `unknown item ${mv.id}` };
    if (!allowed.has(m.id)) return { ok: false, reason: `${m.title} must not move` };
    if (seen.has(m.id)) return { ok: false, reason: `${m.title} moved twice` };
    seen.add(m.id);
    const s = mv.startMin;
    if (!Number.isInteger(s) || s % 5 !== 0) return { ok: false, reason: `${m.title}: time not in 5-minute steps` };
    if (s < WAKE_START || s + m.durationMin > DAY_LIMIT) return { ok: false, reason: `${m.title}: outside the day` };
  }
  // Apply and look for anything still overlapping among blocking items.
  const after = blockingOf(model, anchorId).map((m) => {
    const mv = plan.moves.find((x) => x.id === m.id);
    return mv ? { ...m, startMin: mv.startMin, endMin: mv.startMin + m.durationMin } : m;
  });
  for (let i = 0; i < after.length; i++) {
    for (let j = i + 1; j < after.length; j++) {
      const a = after[i]; const b = after[j];
      if (!conflicts(a, b)) continue;
      if ((a.movable && a.id !== anchorId) || (b.movable && b.id !== anchorId)) return { ok: false, reason: `${a.title} still overlaps ${b.title}` };
    }
  }
  return { ok: true };
};

// What the AI is asked. Items go in by short key, times as HH:MM, with the
// rules spelled out; the answer must be one JSON object.
export const buildMessages = (model, anchorId = null, dayLabel = 'today') => {
  const allowed = allowedIds(model, anchorId);
  const byId = new Map(model.map((m) => [m.id, m]));
  const lines = model
    .slice()
    .sort((a, b) => a.startMin - b.startMin)
    .map((m) => {
      const tag = m.id === anchorId ? 'JUST ADDED, must stay'
        : allowed.has(m.id) ? 'movable'
        : m.soft ? 'short, ignore'
        : m.movable ? 'not involved, leave it'
        : `FIXED (${m.why || 'cannot move'})`;
      return `${m.key} | ${m.title} | ${hm(m.startMin)}-${hm(m.endMin)} | ${m.durationMin} min | ${tag}`;
    });
  const conflicts = fixableOverlaps(model, anchorId).map(([a, b]) => `${a.title} (${a.key}) with ${b.title} (${b.key})`);
  const gaps = freeGaps(model, anchorId).map((g) => `${hm(g.startMin)}-${hm(g.endMin)}`);
  const base = cascadePlan(model, anchorId);
  const baseline = base.moves.map((mv) => `${byId.get(mv.id).key} -> ${hm(mv.startMin)}`);
  const system = [
    'You plan one day of a person\'s schedule inside the Biblely app.',
    'Some items overlap. Move ONLY the items marked "movable" so that, afterwards, no two items longer than 15 minutes overlap by 10 minutes or more. Every listed overlap must be solved; overlaps under 10 minutes are fine.',
    'Rules: keep every item\'s length; never move FIXED or "must stay" items; every moved item must sit entirely inside ONE of the free gaps given, and moved items must not overlap each other;',
    'times in 5-minute steps, between 05:00 and 23:30; prefer the smallest change, and an earlier free gap is fine when the whole item fits in it (when the rest of the day is full, earlier beats dropping it, but not before 08:00).',
    'You are given a plan that already works. Return it unchanged, or a better one that obeys every rule.',
    'Reply with ONE JSON object and nothing else: {"moves":[{"id":"k3","start":"18:30"}],"note":"one short plain sentence for the user, no jargon"}.',
  ].join(' ');
  const user = [
    `Items for ${dayLabel} (key | title | start-end | length | status):`,
    ...lines,
    '',
    `Overlaps to solve: ${conflicts.join('; ') || 'none'}.`,
    `Free gaps you may use (nothing else is free): ${gaps.join(', ') || 'none'}.`,
    `A plan that already works: ${baseline.join(', ') || 'no moves needed'}.`,
  ].join('\n');
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
};

// Pull the JSON out of whatever the model wrote (fences, prose) and map keys
// back to item ids. Returns { moves:[{id,startMin}], note } or null.
export const parsePlanText = (text, model) => {
  if (typeof text !== 'string') return null;
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let obj = null;
  try { obj = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const byKey = new Map(model.map((m) => [m.key, m.id]));
  const ids = new Set(model.map((m) => m.id));
  const moves = [];
  for (const mv of Array.isArray(obj.moves) ? obj.moves : []) {
    if (!mv) continue;
    const id = byKey.get(String(mv.id)) || (ids.has(mv.id) ? mv.id : null);
    const startMin = fromHm(mv.start);
    if (!id || startMin == null) return null;
    moves.push({ id, startMin });
  }
  const note = typeof obj.note === 'string' ? obj.note.trim().slice(0, 160) : '';
  return { moves, note };
};

// Rows for the preview: what moves, from when to when.
export const describePlan = (model, plan) => {
  const byId = new Map(model.map((m) => [m.id, m]));
  return (plan?.moves || []).map((mv) => {
    const m = byId.get(mv.id);
    return m ? { id: m.id, title: m.title, color: m.color, kind: m.kind, from: m.startMin, to: mv.startMin, durationMin: m.durationMin } : null;
  }).filter(Boolean);
};

// Fixed items that sit in a conflict, so the preview can say why they stay.
export const staysFor = (model, anchorId = null) => {
  const out = [];
  const seen = new Set();
  for (const [a, b] of fixableOverlaps(model, anchorId)) {
    for (const m of [a, b]) {
      const can = m.movable && m.id !== anchorId;
      if (can || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ id: m.id, title: m.title, why: m.id === anchorId ? 'just added' : (m.why || 'cannot move') });
    }
  }
  return out;
};
