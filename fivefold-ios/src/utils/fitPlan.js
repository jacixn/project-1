// Make it fit: planning for a day where things overlap. Three tiers:
//   fixed  fixtures, read-only calendars, repeating workouts/prayers/shows
//   life   tasks, reminders (this day only for repeats), one-time workouts,
//          your own calendar events: they must happen, they only move for
//          other life items or fixed things, never for a show or a game
//   fun    EyeCandy shows and games: they give way. End early, start late,
//          move a little, or skip today.
// The thing just added stays (explicit anchor, else the newest life item in
// a conflict). Life items are placed by a small search for the smallest
// total change; fun items are resolved after. The AI may propose a plan,
// but only one the validator here accepts, and it cannot be worse than the
// rules' plan. Import-free so the selftest evaluates it under plain node.

export const SOFT_MAX_MIN = 15;    // things this short sit inside longer ones (a 5-min prayer in a show)
export const OVERLAP_MIN = 10;     // overlaps shorter than this are life, not conflicts
export const WAKE_START = 5 * 60;
export const EARLY_FLOOR = 8 * 60; // nothing is planned earlier than 8 AM
export const DAY_LIMIT = 24 * 60;
export const MAX_LIFE_SHIFT = 120; // a life item moves at most 2 h; further is not a fix, it is a different day
export const MAX_FUN_SHIFT = 180;  // a show moves at most 3 h, else it is cut or skipped
export const FUN_PENALTY = 0.5;    // cost per minute a life item sits on a show
export const TRIM_KEEP = 0.5;      // a show must keep at least half of itself
export const TRIM_MIN = 20;        // and at least 20 minutes
export const SLACK = 30;           // AI plans may cost at most this much more than the rules' plan

const r5up = (m) => Math.ceil(m / 5) * 5;
const r5dn = (m) => Math.floor(m / 5) * 5;
const overlapMin = (a, b) => Math.min(a.endMin, b.endMin) - Math.max(a.startMin, b.startMin);
const overlap = (a, b) => overlapMin(a, b) > 0;
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

// My Week items -> planner model.
export const toModel = (items) => (items || []).map((it, i) => {
  const raw = it.raw || {};
  const oneTime = raw.type === 'one-time';
  const tier = tierOf(it);
  const durationMin = Math.max(5, (it.endMin || 0) - (it.startMin || 0));
  const days = Array.isArray(raw.days) ? raw.days : [];
  const daily = !days.length || days.length === 7;
  const todayOnly = tier === 'life' && it.kind === 'reminder' && !oneTime;
  const why = it.kind === 'eyecandySports' ? 'kick-off is fixed'
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
    tier,
    movable: tier !== 'fixed',
    todayOnly,
    droppable: tier === 'fun',
    createdAt: msOf(raw.createdAt) ?? (typeof raw.id === 'number' && raw.id > 1e12 ? raw.id : null),
    why,
  };
});

const blockingOf = (model, anchorId) => model.filter((m) => !m.soft || m.id === anchorId);
const isLocked = (m, anchorId) => m.tier === 'fixed' || m.id === anchorId;

// Every conflicting pair among blocking items, fixed-vs-fixed excluded.
const allConflicts = (model, anchorId) => {
  const list = blockingOf(model, anchorId);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (!conflicts(a, b)) continue;
      if (isLocked(a, anchorId) && isLocked(b, anchorId)) continue;
      out.push([a, b]);
    }
  }
  return out;
};

// Conflicts a plan could do something about (same thing, exported name kept).
export const fixableOverlaps = (model, anchorId = null) => allConflicts(model, anchorId);

// No anchor given: the newest life item that is in a conflict is what the
// user just added, so it stays.
export const pickAnchor = (model, explicit = null) => {
  if (explicit && model.some((m) => m.id === explicit)) return explicit;
  let best = null;
  for (const [a, b] of allConflicts(model, null)) {
    for (const m of [a, b]) {
      if (m.tier !== 'life' || m.createdAt == null) continue;
      if (!best || m.createdAt > best.createdAt) best = m;
    }
  }
  return best ? best.id : null;
};

// Life items that may move: members of conflict clusters built over life and
// fixed items only (a show sitting on a meal is the show's problem).
export const lifeMovers = (model, anchorId) => {
  const list = blockingOf(model, anchorId).filter((m) => m.tier !== 'fun');
  const parent = new Map(list.map((m) => [m.id, m.id]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const inConflict = new Set();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (!conflicts(a, b) || (isLocked(a, anchorId) && isLocked(b, anchorId))) continue;
      parent.set(find(a.id), find(b.id)); inConflict.add(a.id); inConflict.add(b.id);
    }
  }
  const roots = new Set([...inConflict].map(find));
  return new Set(list.filter((m) => m.tier === 'life' && m.id !== anchorId && roots.has(find(m.id))).map((m) => m.id));
};

// Kept for callers/tests: every id a plan may touch (life movers + every fun item in a conflict).
export const allowedIds = (model, anchorId = null) => {
  const out = lifeMovers(model, anchorId);
  for (const [a, b] of allConflicts(model, anchorId)) for (const m of [a, b]) if (m.tier === 'fun') out.add(m.id);
  return out;
};

const clearAgainst = (ivs, s, dur) => ivs.every((o) => !(s < o.endMin && s + dur > o.startMin));

// Candidate starts for a life item: its own start plus the edges of every
// obstacle, nearest first, within the day (never before 8 AM).
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

// Conflict clusters over life + fixed items (shows ignored): each is solved
// on its own, so one impossible corner of the day does not freeze the rest.
const lifeClusters = (model, anchorId) => {
  const list = blockingOf(model, anchorId).filter((m) => m.tier !== 'fun');
  const parent = new Map(list.map((m) => [m.id, m.id]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const inConflict = new Set();
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (!conflicts(a, b) || (isLocked(a, anchorId) && isLocked(b, anchorId))) continue;
      parent.set(find(a.id), find(b.id)); inConflict.add(a.id); inConflict.add(b.id);
    }
  }
  const groups = new Map();
  for (const m of list) {
    if (m.tier !== 'life' || m.id === anchorId) continue;
    const r = find(m.id);
    if (![...inConflict].some((id) => find(id) === r)) continue;
    if (!groups.has(r)) groups.set(r, new Set());
    groups.get(r).add(m.id);
  }
  return [...groups.values()];
};

// Smallest total change that places every mover clear of fixed things, the
// anchor, untouched life items and each other. Sitting on a show costs a
// little, so a real gap is preferred but a game is never a wall.
const placeLife = (model, anchorId) => {
  const clusters = lifeClusters(model, anchorId);
  const moverIds = new Set(clusters.flatMap((c) => [...c]));
  const blocking = blockingOf(model, anchorId);
  const hardBase = blocking.filter((m) => m.tier !== 'fun' && !moverIds.has(m.id)).map(({ startMin, endMin }) => ({ startMin, endMin }));
  const fun = model.filter((m) => m.tier === 'fun').map(({ startMin, endMin }) => ({ startMin, endMin }));
  const funCostOf = (iv) => { let c = 0; for (const f of fun) c += Math.max(0, overlapMin(iv, f)); return FUN_PENALTY * c; };
  const placedAll = []; const moves = []; const stuck = []; let total = 0;
  for (const cluster of clusters) {
    const movers = blocking.filter((m) => cluster.has(m.id)).sort((a, b) => a.startMin - b.startMin);
    const hard = [...hardBase, ...placedAll];
    const edges = [...hard, ...fun, ...movers.map(({ startMin, endMin }) => ({ startMin, endMin }))];
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
    if (best) {
      for (const p of best) {
        const m = movers.find((x) => x.id === p.id);
        if (p.startMin !== m.startMin) moves.push({ id: m.id, startMin: p.startMin });
        placedAll.push(p);
      }
      total += bestCost;
      continue;
    }
    // No arrangement clears this corner of the day: place what can be
    // placed, one by one, and say which stay put.
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

// Largest clear stretch of [s,e] once obstacles are cut out.
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

// Shows and games give way: end early / start late when most survives,
// move a little when a gap is near, else skip today.
const placeFun = (model, anchorId, lifeMoves) => {
  const moved = new Map(lifeMoves.map((mv) => [mv.id, mv.startMin]));
  const hard = blockingOf(model, anchorId).filter((m) => m.tier !== 'fun').map((m) => {
    const s = moved.has(m.id) ? moved.get(m.id) : m.startMin;
    return { startMin: s, endMin: s + m.durationMin };
  });
  const funs = model.filter((m) => m.tier === 'fun').sort((a, b) => a.startMin - b.startMin);
  const settled = []; const moves = []; const trims = []; const drops = []; const stuck = [];
  for (const f of funs) {
    const obstacles = [...hard, ...settled];
    const hit = obstacles.some((o) => overlapMin(f, o) >= OVERLAP_MIN);
    if (!hit) { settled.push({ startMin: f.startMin, endMin: f.endMin }); continue; }
    const mid = clearMiddle(f.startMin, f.endMin, obstacles);
    const cs = mid ? r5up(mid[0]) : 0; const ce = mid ? r5dn(mid[1]) : 0;
    const keep = Math.max(0, ce - cs);
    const lost = 1 - keep / f.durationMin;
    if (keep >= TRIM_MIN && lost <= 0.34) { trims.push({ id: f.id, startMin: cs, endMin: ce }); settled.push({ startMin: cs, endMin: ce }); continue; }
    const s = nearestGap(f, obstacles, MAX_FUN_SHIFT);
    if (s != null) { moves.push({ id: f.id, startMin: s }); settled.push({ startMin: s, endMin: s + f.durationMin }); continue; }
    if (keep >= Math.max(TRIM_MIN, f.durationMin * TRIM_KEEP)) { trims.push({ id: f.id, startMin: cs, endMin: ce }); settled.push({ startMin: cs, endMin: ce }); continue; }
    if (f.droppable) { drops.push(f.id); continue; }
    stuck.push(f.title);
  }
  return { moves, trims, drops, stuck };
};

// The rules' plan. { moves, trims, drops, overflow, anchorId, lifeCost }
export const cascadePlan = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const life = placeLife(model, anchorId);
  const fun = placeFun(model, anchorId, life.moves);
  return {
    anchorId,
    moves: [...life.moves, ...fun.moves],
    trims: fun.trims,
    drops: fun.drops,
    overflow: [...life.stuck, ...fun.stuck],
    lifeCost: life.moves.reduce((n, mv) => n + Math.abs(mv.startMin - model.find((m) => m.id === mv.id).startMin), 0),
  };
};

// Apply a plan to a copy of the model (blocking items only).
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

// Conflicts still standing once a plan is applied (pair keys).
const remainingConflicts = (model, plan, anchorId) => {
  const after = applyTo(model, plan, anchorId);
  const out = [];
  for (let i = 0; i < after.length; i++) {
    for (let j = i + 1; j < after.length; j++) {
      const a = after[i]; const b = after[j];
      if (!conflicts(a, b) || (isLocked(a, anchorId) && isLocked(b, anchorId))) continue;
      out.push({ key: `${a.id}|${b.id}`, a, b });
    }
  }
  return out;
};

// Check a plan (AI or otherwise). `baseline` = the rules' plan: an AI plan
// may not cost life items more than baseline + SLACK, may not skip more
// shows, and may not leave a conflict the baseline solved. Without a
// baseline, leftovers are only allowed around items the plan itself
// reports as left as is (plan.overflow).
export const validatePlan = (model, plan, anchorArg = null, baseline = null) => {
  if (!plan || !Array.isArray(plan.moves)) return { ok: false, reason: 'no moves array' };
  const anchorId = pickAnchor(model, anchorArg);
  const byId = new Map(model.map((m) => [m.id, m]));
  const lifeOk = lifeMovers(model, anchorId);
  const touched = new Set();
  const seen = (m) => { if (touched.has(m.id)) return `${m.title} changed twice`; touched.add(m.id); return null; };
  const grid = (v) => Number.isInteger(v) && v % 5 === 0;

  // 1. life moves
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

  // 2. shows and games may only be touched when, after the life moves, they are in the way
  const lifePlan = { moves: plan.moves.filter((mv) => byId.get(mv.id)?.tier === 'life'), trims: [], drops: [] };
  const funOk = new Set();
  for (const c of remainingConflicts(model, lifePlan, anchorId)) for (const m of [c.a, c.b]) if (m.tier === 'fun') funOk.add(m.id);
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

  // 3. no worse than the rules, and nothing solvable left standing
  if (baseline) {
    if (lifeCost > (baseline.lifeCost || 0) + SLACK) return { ok: false, reason: 'moves life items more than needed' };
    if ((plan.drops || []).length > (baseline.drops || []).length) return { ok: false, reason: 'skips more than needed' };
  }
  const allowedLeft = baseline
    ? new Set(remainingConflicts(model, baseline, anchorId).map((c) => c.key))
    : null;
  const leftTitles = new Set(plan.overflow || []);
  for (const c of remainingConflicts(model, plan, anchorId)) {
    if (allowedLeft ? allowedLeft.has(c.key) : (leftTitles.has(c.a.title) || leftTitles.has(c.b.title))) continue;
    return { ok: false, reason: `${c.a.title} still overlaps ${c.b.title}` };
  }
  return { ok: true };
};

// Free room once fixed things, the anchor and untouched life items are in place.
export const freeGaps = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const movers = lifeMovers(model, anchorId);
  const obstacles = blockingOf(model, anchorId).filter((m) => m.tier !== 'fun' && !movers.has(m.id)).map(({ startMin, endMin }) => ({ startMin, endMin })).sort((a, b) => a.startMin - b.startMin);
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

// What the AI is asked.
export const buildMessages = (model, anchorArg = null, dayLabel = 'today') => {
  const anchorId = pickAnchor(model, anchorArg);
  const movers = lifeMovers(model, anchorId);
  const funOk = new Set([...allConflicts(model, anchorId)].flat().filter((m) => m.tier === 'fun').map((m) => m.id));
  const lines = model.slice().sort((a, b) => a.startMin - b.startMin).map((m) => {
    const tag = m.id === anchorId ? 'JUST ADDED, must stay'
      : m.soft ? 'short, ignore'
      : m.tier === 'fixed' ? `FIXED (${m.why || 'cannot move'})`
      : m.tier === 'life' ? (movers.has(m.id) ? `life, movable${m.todayOnly ? ' (this day only)' : ''}` : 'life, leave as is')
      : funOk.has(m.id) ? 'show or game, in the way: move a little, cut, or skip today' : 'show or game, leave as is';
    return `${m.key} | ${m.title} | ${hm(m.startMin)}-${hm(m.endMin)} | ${m.durationMin} min | ${tag}`;
  });
  const base = cascadePlan(model, anchorId);
  const confl = allConflicts(model, anchorId).map(([a, b]) => `${a.title} (${a.key}) with ${b.title} (${b.key})`);
  const gaps = freeGaps(model, anchorId).map((g) => `${hm(g.startMin)}-${hm(g.endMin)}`);
  const system = [
    'You plan one day of a person\'s schedule inside the Biblely app. Some items overlap.',
    'Life items (meals, tasks, workouts, appointments) must happen: move ONLY the ones marked movable, at most 2 hours and only as far as needed, never because of a show or game, and never before 08:00.',
    'Shows and games give way: end early, start late (keep at least half and 20 minutes), move at most 3 hours, or skip today.',
    'Afterwards no two items longer than 15 minutes may overlap by 10 minutes or more (fixed-vs-fixed excepted). Keep every life item\'s length. Times in 5-minute steps.',
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

// JSON out of whatever the model wrote; keys mapped back to ids.
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

// Rows for the preview.
export const describePlan = (model, plan) => {
  const byId = new Map(model.map((m) => [m.id, m]));
  const rows = [];
  for (const mv of plan?.moves || []) { const m = byId.get(mv.id); if (m) rows.push({ id: m.id, title: m.title, color: m.color, kind: m.kind, tier: m.tier, action: 'move', from: m.startMin, to: mv.startMin, durationMin: m.durationMin, todayOnly: !!m.todayOnly }); }
  for (const tr of plan?.trims || []) { const m = byId.get(tr.id); if (m) rows.push({ id: m.id, title: m.title, color: m.color, kind: m.kind, tier: m.tier, action: 'trim', from: m.startMin, to: tr.startMin, endFrom: m.endMin, endTo: tr.endMin, durationMin: m.durationMin, todayOnly: false }); }
  for (const id of plan?.drops || []) { const m = byId.get(id); if (m) rows.push({ id: m.id, title: m.title, color: m.color, kind: m.kind, tier: m.tier, action: 'drop', from: m.startMin, to: null, durationMin: m.durationMin, todayOnly: false }); }
  return rows;
};

// Fixed things in a conflict, so the preview can say why they stay.
export const staysFor = (model, anchorArg = null) => {
  const anchorId = pickAnchor(model, anchorArg);
  const out = []; const seen = new Set();
  for (const [a, b] of allConflicts(model, anchorId)) {
    for (const m of [a, b]) {
      if (!isLocked(m, anchorId) || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ id: m.id, title: m.title, why: m.id === anchorId ? 'just added' : (m.why || 'cannot move') });
    }
  }
  return out;
};
