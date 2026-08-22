// Make it fit: when something new lands on a busy day, make room for IT and
// touch nothing else. Scope is the thing just added (the anchor) plus what
// it collides with, plus whatever those moves then collide with. The rest
// of the day, however messy, is none of the planner's business.
//
// Matches (EyeCandy Sports) are ignored entirely: they never block, never
// count as overlaps. Short things (a 5-minute prayer) likewise.
//
// Tiers for what IS in scope:
//   fixed  read-only calendars, repeating workouts/prayers, weekly shows
//   life   tasks, reminders (this day only for repeats), one-time workouts,
//          your own calendar events: they must happen, they move at most
//          2 hours, only for fixed or other life items, never for a show
//   fun    one-time EyeCandy shows and games: they give way. End early,
//          start late, move a little, or skip today.
// Life items are placed by a small search for the smallest total change.
// The AI may propose a plan, but only one this file accepts, and never one
// worse than the rules' own plan. Import-free so the selftest runs in node.

export const SOFT_MAX_MIN = 15;
export const OVERLAP_MIN = 10;     // overlaps shorter than this are life, not conflicts
export const WAKE_START = 5 * 60;
export const EARLY_FLOOR = 8 * 60; // nothing is planned earlier than 8 AM
export const DAY_LIMIT = 24 * 60;
export const MAX_LIFE_SHIFT = 120; // a life item moves at most 2 h
export const MAX_FUN_SHIFT = 180;  // a show moves at most 3 h, else it is cut or skipped
export const FUN_PENALTY = 0.5;    // cost per minute a life item sits on a show
export const TRIM_KEEP = 0.5;      // a show must keep at least half of itself
export const TRIM_MIN = 20;        // and at least 20 minutes
export const SLACK = 30;           // AI plans may cost at most this much more than the rules' plan

const r5up = (m) => Math.ceil(m / 5) * 5;
const r5dn = (m) => Math.floor(m / 5) * 5;
const overlapMin = (a, b) => Math.min(a.endMin, b.endMin) - Math.max(a.startMin, b.startMin);
const conflicts = (a, b) => overlapMin(a, b) >= OVERLAP_MIN;
export const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const fromHm = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]); const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
};
const msOf = (v) => { if (v == null) return null; const t = typeof v === 'number' ? v : Date.parse(v); return Number.isFinite(t) ? t : null; };

export const tierOf = (it) => {
  const raw = it.raw || {};
  const oneTime = raw.type === 'one-time';
  if (it.kind === 'eyecandySports' || !it.movable) return 'fixed';
  if (it.kind === 'eyecandy') return oneTime ? 'fun' : 'fixed';
  if (it.kind === 'prayer') return 'fixed';
  if (it.kind === 'gym') return oneTime ? 'life' : 'fixed';
  if (it.kind === 'reminder' || it.kind === 'task') return 'life';
  if (it.kind === 'calendar') return oneTime ? 'life' : 'fixed';
  return 'fixed';
};

export const toModel = (items) => (items || []).map((it, i) => {
  const raw = it.raw || {};
  const oneTime = raw.type === 'one-time';
  const tier = tierOf(it);
  const durationMin = Math.max(5, (it.endMin || 0) - (it.startMin || 0));
  const days = Array.isArray(raw.days) ? raw.days : [];
  const daily = !days.length || days.length === 7;
  const todayOnly = tier === 'life' && it.kind === 'reminder' && !oneTime;
  const why = it.kind === 'eyecandySports' ? 'match'
    : !it.movable ? 'read-only'
    : tier === 'fixed' ? (it.kind === 'prayer' ? 'daily prayer' : it.kind === 'gym' && daily ? 'repeats every day' : 'repeats every week')
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
    sport: it.kind === 'eyecandySports',
    show: it.kind === 'eyecandy',
    tier,
    movable: tier !== 'fixed',
    todayOnly,
    droppable: tier === 'fun',
    createdAt: msOf(raw.createdAt) ?? (typeof raw.id === 'number' && raw.id > 1e12 ? raw.id : null),
    why,
  };
});

const ignored = (m) => m.soft || m.sport;
const blockingOf = (model, anchorId) => model.filter((m) => !ignored(m) || m.id === anchorId);
const isLocked = (m, anchorId) => m.tier === 'fixed' || m.id === anchorId;

// No anchor given: the newest life item that is in a conflict is what the
// user just added, so it stays and the plan is built around it.
export const pickAnchor = (model, explicit = null) => {
  if (explicit && model.some((m) => m.id === explicit)) return explicit;
  const list = blockingOf(model, null);
  let best = null;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (!conflicts(a, b) || (a.tier === 'fixed' && b.tier === 'fixed')) continue;
      for (const m of [a, b]) if (m.tier === 'life' && m.createdAt != null && (!best || m.createdAt > best.createdAt)) best = m;
    }
  }
  return best ? best.id : null;
};

// The anchor's cluster over life + fixed items (shows excluded): everything
// reachable through conflicts. Only these may be asked to move.
const lifeComponent = (model, anchorId) => {
  const out = new Set();
  if (!anchorId) return out;
  const list = blockingOf(model, anchorId).filter((m) => !m.show);
  const byId = new Map(list.map((m) => [m.id, m]));
  if (!byId.has(anchorId)) return out;
  const queue = [anchorId];
  out.add(anchorId);
  while (queue.length) {
    const cur = byId.get(queue.shift());
    for (const m of list) {
      if (out.has(m.id) || !conflicts(cur, m)) continue;
      if (cur.tier === 'fixed' && m.tier === 'fixed') continue;
      out.add(m.id);
      if (m.tier === 'life') queue.push(m.id); // fixed things end the chain
    }
  }
  return out;
};

export const lifeMovers = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const comp = lifeComponent(model, anchorId);
  const byId = new Map(model.map((m) => [m.id, m]));
  return new Set([...comp].filter((id) => id !== anchorId && byId.get(id).tier === 'life'));
};

// Shows in the way of the scope life items (at the given positions).
const showsInWay = (model, anchorId, lifeMoves, scopeLifeIds) => {
  const moved = new Map((lifeMoves || []).map((mv) => [mv.id, mv.startMin]));
  const life = model.filter((m) => scopeLifeIds.has(m.id)).map((m) => {
    const s = moved.has(m.id) ? moved.get(m.id) : m.startMin;
    return { startMin: s, endMin: s + m.durationMin };
  });
  const out = new Set();
  for (const f of model) {
    if (!f.show || f.soft) continue;
    if (life.some((l) => conflicts(f, l))) out.add(f.id);
  }
  return out;
};

// Conflicts a plan is allowed to care about: inside the anchor's scope.
export const fixableOverlaps = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  if (!anchorId) return [];
  const comp = lifeComponent(model, anchorId);
  const shows = showsInWay(model, anchorId, [], comp);
  const scope = new Set([...comp, ...shows]);
  const list = blockingOf(model, anchorId).filter((m) => scope.has(m.id));
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (!conflicts(a, b) || (isLocked(a, anchorId) && isLocked(b, anchorId))) continue;
      if (a.show && b.show) continue;
      out.push([a, b]);
    }
  }
  return out;
};

// Kept for callers: every id a plan may touch.
export const allowedIds = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const out = lifeMovers(model, anchorId);
  for (const id of showsInWay(model, anchorId, [], lifeComponent(model, anchorId))) if (model.find((m) => m.id === id).tier === 'fun') out.add(id);
  return out;
};

const clearAgainst = (ivs, s, dur) => ivs.every((o) => !(s < o.endMin && s + dur > o.startMin));

const candidatesFor = (m, edges) => {
  const set = new Set([m.startMin]);
  for (const o of edges) {
    const after = r5up(o.endMin); const before = r5dn(o.startMin - m.durationMin);
    if (after + m.durationMin <= DAY_LIMIT) set.add(after);
    if (before >= EARLY_FLOOR) set.add(before);
  }
  return [...set]
    .filter((s) => s >= (s < m.startMin ? EARLY_FLOOR : WAKE_START) && s + m.durationMin <= DAY_LIMIT && Math.abs(s - m.startMin) <= MAX_LIFE_SHIFT)
    .sort((a, b) => Math.abs(a - m.startMin) - Math.abs(b - m.startMin) || a - b)
    .slice(0, 24);
};

// Smallest total change that places every mover clear of the anchor, fixed
// things and untouched life items. Shows are not walls, but sitting on one
// costs a little, so a real gap wins when there is one nearby.
const placeLife = (model, anchorId) => {
  const movers = blockingOf(model, anchorId).filter((m) => lifeMovers(model, anchorId).has(m.id)).sort((a, b) => a.startMin - b.startMin);
  const moverIds = new Set(movers.map((m) => m.id));
  const hard = blockingOf(model, anchorId).filter((m) => !m.show && !moverIds.has(m.id)).map(({ startMin, endMin }) => ({ startMin, endMin }));
  const shows = model.filter((m) => m.show && !m.soft).map(({ startMin, endMin }) => ({ startMin, endMin }));
  const funCostOf = (iv) => { let c = 0; for (const f of shows) c += Math.max(0, overlapMin(iv, f)); return FUN_PENALTY * c; };
  const edges = [...hard, ...shows, ...movers.map(({ startMin, endMin }) => ({ startMin, endMin }))];
  const cands = movers.map((m) => candidatesFor(m, edges));
  let best = null; let bestCost = Infinity;
  const placed = [];
  const dfs = (i, cost) => {
    if (cost >= bestCost) return;
    if (i === movers.length) { bestCost = cost; best = placed.map((p) => ({ ...p })); return; }
    const m = movers[i];
    for (const s of cands[i]) {
      if (!clearAgainst(hard, s, m.durationMin) || !clearAgainst(placed, s, m.durationMin)) continue;
      const iv = { startMin: s, endMin: s + m.durationMin };
      placed.push({ id: m.id, startMin: s, endMin: iv.endMin });
      dfs(i + 1, cost + Math.abs(s - m.startMin) + funCostOf(iv));
      placed.pop();
    }
  };
  dfs(0, 0);
  const moves = []; const stuck = []; let total = 0;
  if (best) {
    for (const p of best) { const m = movers.find((x) => x.id === p.id); if (p.startMin !== m.startMin) moves.push({ id: m.id, startMin: p.startMin }); }
    total = bestCost;
  } else {
    // No arrangement clears everything within 2 hours: place what can be
    // placed one by one, and say which stay put.
    const placedAll = [];
    movers.forEach((m, i) => {
      const opts = cands[i].filter((s) => clearAgainst(hard, s, m.durationMin) && clearAgainst(placedAll, s, m.durationMin));
      if (!opts.length) { stuck.push(m.title); return; }
      const s = opts.sort((a, b) => (Math.abs(a - m.startMin) + funCostOf({ startMin: a, endMin: a + m.durationMin })) - (Math.abs(b - m.startMin) + funCostOf({ startMin: b, endMin: b + m.durationMin })))[0];
      if (s !== m.startMin) moves.push({ id: m.id, startMin: s });
      placedAll.push({ id: m.id, startMin: s, endMin: s + m.durationMin });
      total += Math.abs(s - m.startMin);
    });
  }
  return { moves, stuck, cost: total };
};

const clearMiddle = (s, e, obstacles) => {
  let segs = [[s, e]];
  for (const o of obstacles) {
    const next = [];
    for (const [a, b] of segs) {
      if (o.endMin <= a || o.startMin >= b) { next.push([a, b]); continue; }
      if (o.startMin > a) next.push([a, o.startMin]);
      if (o.endMin < b) next.push([o.endMin, b]);
    }
    segs = next;
  }
  let bestSeg = null;
  for (const [a, b] of segs) if (!bestSeg || b - a > bestSeg[1] - bestSeg[0]) bestSeg = [a, b];
  return bestSeg;
};

const nearestGap = (m, obstacles, maxShift) => {
  const set = new Set();
  for (const o of obstacles) { set.add(r5up(o.endMin)); set.add(r5dn(o.startMin - m.durationMin)); }
  const opts = [...set]
    .filter((s) => s >= EARLY_FLOOR && s + m.durationMin <= DAY_LIMIT && Math.abs(s - m.startMin) <= maxShift && clearAgainst(obstacles, s, m.durationMin))
    .sort((a, b) => Math.abs(a - m.startMin) - Math.abs(b - m.startMin) || b - a);
  return opts.length ? opts[0] : null;
};

// Shows in the way of the anchor or of a life item that moved give way:
// end early / start late when most survives, move a little when a gap is
// near, else skip today. Weekly shows cannot change and are just reported.
const placeFun = (model, anchorId, lifeMoves) => {
  const scopeLife = new Set([anchorId, ...lifeMoves.map((mv) => mv.id)]);
  const inWay = showsInWay(model, anchorId, lifeMoves, scopeLife);
  const moved = new Map(lifeMoves.map((mv) => [mv.id, mv.startMin]));
  const hard = blockingOf(model, anchorId).filter((m) => !m.show).map((m) => {
    const s = moved.has(m.id) ? moved.get(m.id) : m.startMin;
    return { startMin: s, endMin: s + m.durationMin };
  });
  const shows = model.filter((m) => m.show && !m.soft).sort((a, b) => a.startMin - b.startMin);
  const settled = new Map(shows.map((f) => [f.id, { startMin: f.startMin, endMin: f.endMin }]));
  const moves = []; const trims = []; const drops = []; const stuck = [];
  for (const f of shows) {
    if (!inWay.has(f.id)) continue;
    if (f.tier !== 'fun') { stuck.push(f.title); continue; }
    const obstacles = [...hard, ...shows.filter((o) => o.id !== f.id && settled.has(o.id)).map((o) => settled.get(o.id))];
    const mid = clearMiddle(f.startMin, f.endMin, obstacles);
    const cs = mid ? r5up(mid[0]) : 0; const ce = mid ? r5dn(mid[1]) : 0;
    const keep = Math.max(0, ce - cs);
    const lost = 1 - keep / f.durationMin;
    if (keep >= TRIM_MIN && lost <= 0.34) { trims.push({ id: f.id, startMin: cs, endMin: ce }); settled.set(f.id, { startMin: cs, endMin: ce }); continue; }
    const s = nearestGap(f, obstacles, MAX_FUN_SHIFT);
    if (s != null) { moves.push({ id: f.id, startMin: s }); settled.set(f.id, { startMin: s, endMin: s + f.durationMin }); continue; }
    if (keep >= Math.max(TRIM_MIN, f.durationMin * TRIM_KEEP)) { trims.push({ id: f.id, startMin: cs, endMin: ce }); settled.set(f.id, { startMin: cs, endMin: ce }); continue; }
    drops.push(f.id); settled.delete(f.id);
  }
  return { moves, trims, drops, stuck };
};

// The rules' plan. { moves, trims, drops, overflow, anchorId, lifeCost }
export const cascadePlan = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  if (!anchorId) return { anchorId: null, moves: [], trims: [], drops: [], overflow: [], lifeCost: 0 };
  const life = placeLife(model, anchorId);
  const fun = placeFun(model, anchorId, life.moves);
  return {
    anchorId,
    moves: [...life.moves, ...fun.moves],
    trims: fun.trims,
    drops: fun.drops,
    overflow: [...life.stuck, ...fun.stuck],
    lifeCost: life.cost,
  };
};

const applyTo = (model, plan, anchorId) => {
  const dropped = new Set(plan.drops || []);
  return blockingOf(model, anchorId).filter((m) => !dropped.has(m.id)).map((m) => {
    const mv = (plan.moves || []).find((x) => x.id === m.id);
    const tr = (plan.trims || []).find((x) => x.id === m.id);
    if (tr) return { ...m, startMin: tr.startMin, endMin: tr.endMin };
    if (mv) return { ...m, startMin: mv.startMin, endMin: mv.startMin + m.durationMin };
    return m;
  });
};

// Conflicts still standing after a plan, inside its scope (the anchor, the
// life movers and the shows they touch). Pairs elsewhere are not ours.
const remainingInScope = (model, plan, anchorId) => {
  const byId = new Map(model.map((m) => [m.id, m]));
  const lifeMoves = (plan.moves || []).filter((mv) => byId.get(mv.id)?.tier === 'life');
  const scope = new Set([anchorId, ...lifeMovers(model, anchorId), ...showsInWay(model, anchorId, lifeMoves, new Set([anchorId, ...lifeMoves.map((mv) => mv.id)]))]);
  for (const mv of plan.moves || []) scope.add(mv.id);
  for (const tr of plan.trims || []) scope.add(tr.id);
  const after = applyTo(model, plan, anchorId);
  const out = [];
  for (let i = 0; i < after.length; i++) {
    for (let j = i + 1; j < after.length; j++) {
      const a = after[i]; const b = after[j];
      if (!scope.has(a.id) && !scope.has(b.id)) continue;
      if (!conflicts(a, b) || (isLocked(a, anchorId) && isLocked(b, anchorId))) continue;
      if (a.show && b.show) continue;
      out.push({ key: `${a.id}|${b.id}`, a, b });
    }
  }
  return out;
};

// Check a plan (AI or otherwise) against the rules. `baseline` = the rules'
// plan: an AI plan may not cost life items more than baseline + SLACK, may
// not skip more shows, and may not leave a scope conflict the baseline
// solved. Without a baseline, leftovers are allowed only around items the
// plan itself reports as left as is (plan.overflow).
export const validatePlan = (model, plan, anchorArg = null, baseline = null) => {
  if (!plan || !Array.isArray(plan.moves)) return { ok: false, reason: 'no moves array' };
  const anchorId = pickAnchor(model, anchorArg);
  if (!anchorId) return { ok: false, reason: 'nothing to plan around' };
  const byId = new Map(model.map((m) => [m.id, m]));
  const lifeOk = lifeMovers(model, anchorId);
  const touched = new Set();
  const seen = (m) => { if (touched.has(m.id)) return `${m.title} changed twice`; touched.add(m.id); return null; };
  const grid = (v) => Number.isInteger(v) && v % 5 === 0;

  let lifeCost = 0;
  for (const mv of plan.moves) {
    const m = byId.get(mv.id);
    if (!m) return { ok: false, reason: `unknown item ${mv.id}` };
    if (m.tier !== 'life') continue;
    const dup = seen(m); if (dup) return { ok: false, reason: dup };
    if (isLocked(m, anchorId) || !lifeOk.has(m.id)) return { ok: false, reason: `${m.title} must not move` };
    const s = mv.startMin;
    if (!grid(s)) return { ok: false, reason: `${m.title}: time not in 5-minute steps` };
    if (s + m.durationMin > DAY_LIMIT || s < WAKE_START || (s < m.startMin && s < EARLY_FLOOR)) return { ok: false, reason: `${m.title}: outside the day` };
    if (Math.abs(s - m.startMin) > MAX_LIFE_SHIFT) return { ok: false, reason: `${m.title}: moved too far` };
    lifeCost += Math.abs(s - m.startMin);
  }

  const lifeMoves = plan.moves.filter((mv) => byId.get(mv.id)?.tier === 'life');
  const funOk = showsInWay(model, anchorId, lifeMoves, new Set([anchorId, ...lifeMoves.map((mv) => mv.id)]));
  const funTouch = (id, what) => {
    const m = byId.get(id);
    if (!m) return `unknown item ${id}`;
    if (m.tier === 'fixed' || m.id === anchorId) return `${m.title} must not move`;
    if (m.tier === 'life') return `${m.title} must not ${what === 'trim' ? 'be cut' : what === 'drop' ? 'be skipped' : 'move'}`;
    if (!funOk.has(id)) return `${m.title} is not in the way`;
    return seen(m);
  };
  for (const mv of plan.moves) {
    const m = byId.get(mv.id);
    if (!m || m.tier === 'life') continue;
    const bad = funTouch(mv.id, 'move'); if (bad) return { ok: false, reason: bad };
    if (!grid(mv.startMin)) return { ok: false, reason: `${m.title}: time not in 5-minute steps` };
    if (mv.startMin + m.durationMin > DAY_LIMIT || mv.startMin < EARLY_FLOOR) return { ok: false, reason: `${m.title}: outside the day` };
    if (Math.abs(mv.startMin - m.startMin) > MAX_FUN_SHIFT) return { ok: false, reason: `${m.title}: moved too far for a show` };
  }
  for (const tr of plan.trims || []) {
    const bad = funTouch(tr.id, 'trim'); if (bad) return { ok: false, reason: bad };
    const m = byId.get(tr.id);
    if (!grid(tr.startMin) || !grid(tr.endMin)) return { ok: false, reason: `${m.title}: cut not in 5-minute steps` };
    if (tr.startMin < m.startMin || tr.endMin > m.endMin || tr.endMin - tr.startMin < Math.max(TRIM_MIN, m.durationMin * TRIM_KEEP)) return { ok: false, reason: `${m.title}: cut too much` };
  }
  for (const id of plan.drops || []) {
    const bad = funTouch(id, 'drop'); if (bad) return { ok: false, reason: bad };
    if (!byId.get(id).droppable) return { ok: false, reason: `${byId.get(id).title} cannot be skipped` };
  }

  if (baseline) {
    if (lifeCost > (baseline.lifeCost || 0) + SLACK) return { ok: false, reason: 'moves life items more than needed' };
    if ((plan.drops || []).length > (baseline.drops || []).length) return { ok: false, reason: 'skips more than needed' };
  }
  const allowedLeft = baseline ? new Set(remainingInScope(model, baseline, anchorId).map((c) => c.key)) : null;
  const leftTitles = new Set(plan.overflow || []);
  for (const c of remainingInScope(model, plan, anchorId)) {
    if (allowedLeft ? allowedLeft.has(c.key) : (leftTitles.has(c.a.title) || leftTitles.has(c.b.title))) continue;
    return { ok: false, reason: `${c.a.title} still overlaps ${c.b.title}` };
  }
  return { ok: true };
};

// Free room for life items: around the anchor, fixed things and untouched life items (shows and matches are not walls).
export const freeGaps = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const movers = lifeMovers(model, anchorId);
  const obstacles = blockingOf(model, anchorId).filter((m) => !m.show && !movers.has(m.id)).map(({ startMin, endMin }) => ({ startMin, endMin })).sort((a, b) => a.startMin - b.startMin);
  const gaps = []; let cur = WAKE_START;
  for (const o of obstacles) { if (o.startMin > cur) gaps.push({ startMin: cur, endMin: o.startMin }); cur = Math.max(cur, o.endMin); }
  if (cur < DAY_LIMIT) gaps.push({ startMin: cur, endMin: DAY_LIMIT });
  return gaps.filter((g) => g.endMin - g.startMin >= 5);
};

const planLines = (model, plan) => {
  const byId = new Map(model.map((m) => [m.id, m]));
  const out = [];
  for (const mv of plan.moves || []) { const m = byId.get(mv.id); if (m) out.push(`${m.key} -> ${hm(mv.startMin)}`); }
  for (const tr of plan.trims || []) { const m = byId.get(tr.id); if (m) out.push(`${m.key} cut to ${hm(tr.startMin)}-${hm(tr.endMin)}`); }
  for (const id of plan.drops || []) { const m = byId.get(id); if (m) out.push(`${m.key} skipped today`); }
  return out;
};

export const buildMessages = (model, anchorArg = null, dayLabel = 'today') => {
  const anchorId = pickAnchor(model, anchorArg);
  const movers = lifeMovers(model, anchorId);
  const base = cascadePlan(model, anchorId);
  const baseLife = base.moves.filter((mv) => model.find((m) => m.id === mv.id)?.tier === 'life');
  const inWay = showsInWay(model, anchorId, baseLife, new Set([anchorId, ...baseLife.map((mv) => mv.id)]));
  const comp = lifeComponent(model, anchorId);
  const lines = model.slice().sort((a, b) => a.startMin - b.startMin).map((m) => {
    const tag = m.id === anchorId ? 'JUST ADDED, must stay'
      : m.sport ? 'match, ignore'
      : m.soft ? 'short, ignore'
      : m.tier === 'fixed' ? (comp.has(m.id) || inWay.has(m.id) ? `FIXED (${m.why || 'cannot move'})` : 'leave as is')
      : m.tier === 'life' ? (movers.has(m.id) ? `life, movable${m.todayOnly ? ' (this day only)' : ''}` : 'life, leave as is')
      : inWay.has(m.id) ? 'show or game, in the way: move a little, cut, or skip today' : 'show or game, leave as is';
    return `${m.key} | ${m.title} | ${hm(m.startMin)}-${hm(m.endMin)} | ${m.durationMin} min | ${tag}`;
  });
  const confl = fixableOverlaps(model, anchorId).map(([a, b]) => `${a.title} (${a.key}) with ${b.title} (${b.key})`);
  const gaps = freeGaps(model, anchorId).map((g) => `${hm(g.startMin)}-${hm(g.endMin)}`);
  const system = [
    'You plan one day of a person\'s schedule inside the Biblely app. Something was just added and it lands on other things.',
    'Make room for the new thing and touch NOTHING else: only items marked movable or "in the way" may change. Matches are ignored; they never block anything.',
    'Life items (meals, tasks, workouts, appointments) must happen: move them at most 2 hours, only as far as needed, never because of a show or game, never before 08:00.',
    'Shows and games give way: end early, start late (keep at least half and 20 minutes), move at most 3 hours, or skip today.',
    'Afterwards the new thing and whatever moved must not overlap anything longer than 15 minutes by 10 minutes or more. Keep every life item\'s length. Times in 5-minute steps.',
    'You are given a plan that already works; return it in full, or a better one that changes life items no more than it does. Leaving out one of its changes is not a better plan.',
    'Reply with ONE JSON object and nothing else: {"moves":[{"id":"k3","start":"13:40"}],"trims":[{"id":"k5","start":"12:05","end":"13:40"}],"skip":["k6"],"note":"one short plain sentence for the user"}.',
  ].join(' ');
  const user = [
    `Items for ${dayLabel} (key | title | start-end | length | status):`,
    ...lines,
    '',
    `Overlaps to solve: ${confl.join('; ') || 'none'}.`,
    `Free room for life items: ${gaps.join(', ') || 'none'}.`,
    `A plan that already works: ${planLines(model, base).join(', ') || 'no changes needed'}.`,
  ].join('\n');
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
};

export const parsePlanText = (text, model) => {
  if (typeof text !== 'string') return null;
  const a = text.indexOf('{'); const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let obj = null;
  try { obj = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const byKey = new Map(model.map((m) => [m.key, m.id]));
  const ids = new Set(model.map((m) => m.id));
  const idOf = (k) => byKey.get(String(k)) || (ids.has(k) ? k : null);
  const moves = []; const trims = []; const drops = [];
  for (const mv of Array.isArray(obj.moves) ? obj.moves : []) {
    const id = mv && idOf(mv.id); const startMin = mv && fromHm(mv.start);
    if (!id || startMin == null) return null;
    moves.push({ id, startMin });
  }
  for (const tr of Array.isArray(obj.trims) ? obj.trims : []) {
    const id = tr && idOf(tr.id); const startMin = tr && fromHm(tr.start); const endMin = tr && fromHm(tr.end);
    if (!id || startMin == null || endMin == null) return null;
    trims.push({ id, startMin, endMin });
  }
  for (const k of Array.isArray(obj.skip) ? obj.skip : []) {
    const id = idOf(k); if (!id) return null;
    drops.push(id);
  }
  const note = typeof obj.note === 'string' ? obj.note.trim().slice(0, 160) : '';
  return { moves, trims, drops, note };
};

export const describePlan = (model, plan) => {
  const byId = new Map(model.map((m) => [m.id, m]));
  const rows = [];
  for (const mv of plan?.moves || []) { const m = byId.get(mv.id); if (m) rows.push({ id: m.id, title: m.title, color: m.color, kind: m.kind, tier: m.tier, action: 'move', from: m.startMin, to: mv.startMin, durationMin: m.durationMin, todayOnly: !!m.todayOnly }); }
  for (const tr of plan?.trims || []) { const m = byId.get(tr.id); if (m) rows.push({ id: m.id, title: m.title, color: m.color, kind: m.kind, tier: m.tier, action: 'trim', from: m.startMin, to: tr.startMin, endFrom: m.endMin, endTo: tr.endMin, durationMin: m.durationMin, todayOnly: false }); }
  for (const id of plan?.drops || []) { const m = byId.get(id); if (m) rows.push({ id: m.id, title: m.title, color: m.color, kind: m.kind, tier: m.tier, action: 'drop', from: m.startMin, to: null, durationMin: m.durationMin, todayOnly: false }); }
  return rows;
};

// What stays and why: the anchor, and fixed things it (or a mover) sits on.
export const staysFor = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const out = []; const seen = new Set();
  for (const [a, b] of fixableOverlaps(model, anchorId)) {
    for (const m of [a, b]) {
      if (!isLocked(m, anchorId) || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ id: m.id, title: m.title, why: m.id === anchorId ? 'just added' : (m.why || 'cannot move') });
    }
  }
  return out;
};
