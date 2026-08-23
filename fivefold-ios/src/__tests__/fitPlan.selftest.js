// Make it fit: tiers, anchor, the life optimiser, fun-item actions, the
// validator for AI plans, prompt and parsing, and the wiring in My Week.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('utils/fitPlan.js');
const pure = src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 =');
const mod = {};
new Function('exports', pure)(mod);
const { toModel, tierOf, pickAnchor, fixableOverlaps, lifeMovers, allowedIds, cascadePlan, validatePlan, buildMessages, parsePlanText, describePlan, staysFor, freeGaps, hm } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const it = (id, kind, title, s, e, movable, type, extra = {}) => ({ id, kind, title, startMin: s, endMin: e, movable, color: '#000', raw: { type, ...extra } });
const T = (h, m = 0) => h * 60 + m;

// The real Sunday from the screenshots, haircut just added at 2 PM.
const day = [
  it('reminder:bf', 'reminder', 'Eat breakfast', T(8, 10), T(8, 30), true, 'recurring', { createdAt: '2026-06-01T00:00:00Z' }),
  it('prayer:1', 'prayer', '1st Prayer', T(8, 25), T(8, 30), true, 'recurring'),
  it('cal:tr', 'eyecandy', 'Trinity Seven', T(9), T(10, 15), true, 'recurring'),
  it('prayer:2', 'prayer', '2nd Prayer', T(11), T(11, 5), true, 'recurring'),
  it('cal:lnd', 'eyecandy', 'Love Next Door', T(11, 5), T(12, 5), true, 'one-time'),
  it('cal:fc', 'eyecandy', 'EA SPORTS FC 26', T(12, 5), T(14, 5), true, 'one-time'),
  it('prayer:3', 'prayer', '3rd Prayer', T(13), T(13, 5), true, 'recurring'),
  it('reminder:hc', 'reminder', 'Haircut', T(14), T(15), true, 'one-time', { createdAt: '2026-08-23T11:50:00Z' }),
  it('reminder:l', 'reminder', 'eat lunch', T(14), T(14, 20), true, 'recurring', { createdAt: '2026-06-01T00:00:00Z' }),
  it('cal:mc', 'eyecandySports', 'Manchester City vs AFC Bournemouth', T(14), T(16), false, 'one-time'),
  it('cal:fp', 'eyecandy', 'FragPunk', T(14, 20), T(15, 50), true, 'one-time'),
  it('gym:p', 'gym', 'Pull', T(16), T(17), true, 'one-time', { createdAt: '2026-08-20T00:00:00Z' }),
  it('cal:nl', 'eyecandySports', 'Newcastle United vs Liverpool', T(16, 30), T(18, 30), false, 'one-time'),
  it('prayer:4', 'prayer', '4th Prayer', T(17, 30), T(17, 35), true, 'recurring'),
  it('cal:sl', 'eyecandy', 'Solo Leveling', T(17, 45), T(19, 25), true, 'one-time'),
  it('reminder:d', 'reminder', 'eat dinner', T(19, 25), T(19, 45), true, 'recurring', { createdAt: '2026-06-01T00:00:00Z' }),
  it('cal:st', 'eyecandySports', 'Stade Rennais vs Paris Saint-Germain', T(19, 45), T(21, 45), false, 'one-time'),
  it('cal:to', 'eyecandySports', 'Torino vs AC Milan', T(19, 45), T(21, 45), false, 'one-time'),
  it('reminder:sh', 'reminder', 'take shower', T(19, 45), T(20, 15), true, 'one-time', { createdAt: '2026-08-21T00:00:00Z' }),
  it('reminder:sm', 'reminder', 'Social Media time', T(20), T(21), true, 'one-time', { createdAt: '2026-08-21T00:00:00Z' }),
  it('cal:cj', 'eyecandy', 'Candy Jar', T(20, 15), T(21, 50), true, 'one-time'),
  it('cal:el', 'eyecandySports', 'Elche vs Barcelona', T(20, 30), T(22, 30), false, 'one-time'),
  it('prayer:5', 'prayer', '5th Prayer', T(22), T(22, 5), true, 'recurring'),
];
const model = toModel(day);
const byId = Object.fromEntries(model.map((m) => [m.id, m]));
const tiers = (ids) => ids.map((id) => byId[id].tier).join(',');

check(tiers(['cal:mc', 'cal:tr', 'prayer:1']) === 'fixed,fixed,fixed', 'fixtures, weekly shows and prayers are fixed');
check(tiers(['reminder:hc', 'reminder:l', 'gym:p', 'reminder:sh']) === 'life,life,life,life' && byId['reminder:l'].todayOnly && !byId['reminder:hc'].todayOnly, 'tasks, reminders (repeats this day only) and one-time workouts are life');
check(tiers(['cal:fc', 'cal:fp', 'cal:sl', 'cal:cj']) === 'fun,fun,fun,fun' && byId['cal:fp'].droppable, 'one-time shows and games are fun and can be skipped');
check(tierOf({ kind: 'gym', movable: true, raw: { type: 'recurring' } }) === 'fixed' && tierOf({ kind: 'calendar', movable: true, raw: { type: 'one-time' } }) === 'life', 'weekly workouts fixed, your own calendar events are life');

check(pickAnchor(model) === 'reminder:hc', 'with no anchor given, the newest life item in a conflict (the haircut) is what stays');
check(pickAnchor(model, 'gym:p') === 'gym:p' && pickAnchor(model, 'nope') === 'reminder:hc', 'an explicit anchor wins; an unknown one falls back');

const movers = [...lifeMovers(model, 'reminder:hc')].sort().join(' ');
check(movers === 'reminder:l', `only lunch, the life item under the haircut, may move; shower, Pull and Social are not the haircut's business (${movers})`);
const pairs = fixableOverlaps(model).map(([a, b]) => `${a.title}+${b.title}`).sort().join(' | ');
check(pairs === 'Haircut+FragPunk | Haircut+eat lunch', `scope conflicts: haircut with lunch and FragPunk; the match is ignored (${pairs})`);

const plan = cascadePlan(model);
const rows = describePlan(model, plan);
console.log('  plan:', rows.map((r) => `${r.title}: ${r.action === 'drop' ? 'skip' : r.action === 'trim' ? `${hm(r.to)}-${hm(r.endTo)}` : hm(r.to)}`).join(' | '), '| left:', plan.overflow.join(', ') || 'none');
const act = Object.fromEntries(rows.map((r) => [r.id, r]));
check(plan.anchorId === 'reminder:hc' && !act['reminder:hc'], 'the haircut stays at 2 PM');
check(act['reminder:l'] && act['reminder:l'].action === 'move' && act['reminder:l'].to === T(13, 40) && act['reminder:l'].todayOnly, `lunch slides to 1:40 PM, this day only (${act['reminder:l'] ? hm(act['reminder:l'].to) : 'untouched'})`);
check(act['cal:fc'] && act['cal:fc'].action === 'trim' && act['cal:fc'].to === T(12, 5) && act['cal:fc'].endTo === T(13, 40), `EA Sports FC just ends early for lunch (${act['cal:fc'] ? `${hm(act['cal:fc'].to)}-${hm(act['cal:fc'].endTo)}` : 'untouched'})`);
check(act['cal:fp'] && act['cal:fp'].action === 'trim' && act['cal:fp'].to === T(15) && act['cal:fp'].endTo === T(15, 50), `FragPunk starts when the haircut ends, the match under it is not a reason to drop it (${act['cal:fp'] ? `${hm(act['cal:fp'].to)}-${hm(act['cal:fp'].endTo)}` : 'untouched'})`);
check(rows.length === 3 && !plan.overflow.length, `nothing else on the day is touched: ${rows.length} changes, nothing left over`);
check(!act['cal:sl'] && !act['cal:cj'] && !act['reminder:sh'] && !act['gym:p'] && !act['reminder:sm'] && !act['reminder:d'], 'Solo Leveling, Candy Jar, shower, Pull, Social Media and dinner are untouched');
check(rows.every((r) => r.action !== 'move' || r.tier !== 'life' || r.to >= T(8)), 'no life item lands before 8 AM');
check(validatePlan(model, plan).ok, 'the rules plan passes its own validator');
const stays = staysFor(model).map((s) => `${s.title}:${s.why}`);
check(stays.join('|') === 'Haircut:just added', `stays list names only the haircut; matches are never listed (${stays.join(' | ')})`);

// matches are ignored, full stop
const pullDay = toModel([
  it('gym:p', 'gym', 'Pull', T(16), T(17), true, 'one-time', { createdAt: '2026-08-23T10:00:00Z' }),
  it('cal:nl', 'eyecandySports', 'Newcastle United vs Liverpool', T(16, 30), T(18, 30), false, 'one-time'),
]);
check(fixableOverlaps(pullDay).length === 0 && cascadePlan(pullDay).moves.length === 0 && pickAnchor(pullDay) === null, 'a workout during a match is not an overlap');
const noAnchor = toModel([it('cal:a', 'calendar', 'Work', T(9), T(12), true, 'one-time'), it('cal:b', 'calendar', 'Dentist', T(11), T(12), true, 'one-time')]);
check(pickAnchor(noAnchor) === null && fixableOverlaps(noAnchor).length === 0 && cascadePlan(noAnchor).moves.length === 0, 'nothing just added that we can tell: nothing is planned');

// New thing on a fixed thing only: nothing can change, and the plan says so by its size.
const onWork = toModel([
  it('cal:w', 'calendar', 'Work', T(9), T(17, 30), true, 'recurring'),
  it('task:c', 'task', 'call bank', T(11), T(11, 30), true, 'one-time', { createdAt: '2026-08-23T10:00:00Z' }),
]);
check(mod.planSize(cascadePlan(onWork)) === 0 && mod.planSize(cascadePlan(model)) === 3, 'a task on a weekly Work block: zero changes possible (no button); the Sunday haircut: three');

// Simple day: an errand on a workout slides the workout next door.
const simple = toModel([
  it('reminder:e', 'reminder', 'Errand', T(16), T(16, 45), true, 'one-time', { createdAt: '2026-08-23T12:00:00Z' }),
  it('gym:w', 'gym', 'Push', T(16), T(17), true, 'one-time', { createdAt: '2026-08-20T00:00:00Z' }),
  it('reminder:d', 'reminder', 'eat dinner', T(19), T(19, 20), true, 'recurring'),
]);
const sp = cascadePlan(simple);
check(sp.anchorId === 'reminder:e' && sp.moves.length === 1 && sp.moves[0].id === 'gym:w' && sp.moves[0].startMin === T(16, 45) && !sp.drops.length, `workout slides to right after the errand (${sp.moves[0] ? hm(sp.moves[0].startMin) : 'none'})`);
check(cascadePlan(toModel([it('a', 'reminder', 'A', T(10), T(11), true, 'one-time'), it('b', 'reminder', 'B', T(12), T(13), true, 'one-time')])).moves.length === 0, 'a clean day needs no moves');
const tail = toModel([it('cal:fc', 'eyecandy', 'Game', T(12), T(14, 5), true, 'one-time'), it('task:h', 'task', 'haircut', T(14), T(15), true, 'one-time', { createdAt: '2026-08-23T12:00:00Z' })]);
check(fixableOverlaps(tail).length === 0 && cascadePlan(tail).drops.length === 0, 'a 5-minute tail is not a conflict');
const cut = toModel([it('cal:g', 'eyecandy', 'Game', T(12), T(14), true, 'one-time'), it('task:h', 'task', 'haircut', T(13, 40), T(14, 40), true, 'one-time', { createdAt: '2026-08-23T12:00:00Z' })]);
const cp = cascadePlan(cut);
check(cp.trims.length === 1 && cp.trims[0].startMin === T(12) && cp.trims[0].endMin === T(13, 40) && !cp.moves.length, 'a game mostly clear of the new thing just ends early');

// AI plans: accept the good, refuse the rest
const K = (id) => byId[id].key;
const good = parsePlanText('```json\n{"moves":[{"id":"' + K('reminder:l') + '","start":"13:40"}],"trims":[{"id":"' + K('cal:fc') + '","start":"12:05","end":"13:40"},{"id":"' + K('cal:fp') + '","start":"15:00","end":"15:50"}],"skip":[],"note":"Lunch a bit earlier, the game ends early, FragPunk starts after the haircut."}\n```', model);
check(good && good.moves.length === 1 && good.trims.length === 2 && good.drops.length === 0 && good.moves[0].id === 'reminder:l', 'parses fenced JSON with moves and trims');
check(parsePlanText('{"moves":[],"skip":["' + K('cal:fp') + '"]}', model).drops[0] === 'cal:fp', 'parses skips');
check(validatePlan(model, good, null, plan).ok, 'the rules plan restated by the AI is accepted');
check(!validatePlan(model, { moves: [{ id: 'reminder:hc', startMin: T(22, 30) }] }, null, plan).ok, 'refuses to move the haircut (the anchor)');
check(validatePlan(model, { moves: [{ id: 'reminder:l', startMin: T(10, 45) }] }, null, plan).reason === 'eat lunch: moved too far', 'refuses lunch at 10:45 AM: more than 2 hours');
check(validatePlan(model, { moves: [{ id: 'reminder:sh', startMin: T(18, 55) }] }, null, plan).reason === 'take shower must not move', 'refuses touching the shower: not the haircut\'s business');
check(!validatePlan(model, { moves: [{ id: 'reminder:d', startMin: T(20) }] }, null, plan).ok, 'refuses moving dinner (its only overlap is a show)');
check(!validatePlan(model, { moves: [], trims: [{ id: 'reminder:l', startMin: T(14), endMin: T(14, 10) }] }, null, plan).ok, 'refuses cutting a meal short');
check(!validatePlan(model, { moves: [], trims: [{ id: 'cal:sl', startMin: T(17, 45), endMin: T(18) }] }, null, plan).ok, 'refuses cutting a show below half');
check(!validatePlan(model, { moves: [], drops: ['cal:lnd'] }, null, plan).ok && validatePlan(model, { moves: [], drops: ['cal:cj'] }, null, plan).reason === 'Candy Jar is not in the way', 'refuses skipping shows that are not in the way (Candy Jar under matches included)');
check(validatePlan(model, { moves: [], drops: ['cal:fp'] }, null, { moves: [], drops: [], lifeCost: 0 }).reason === 'skips more than needed', 'refuses skipping more than the rules would');
check(!validatePlan(model, { moves: [{ id: 'reminder:l', startMin: T(13, 42) }] }, null, plan).ok, 'refuses times off the 5-minute grid');
check(!validatePlan(model, { moves: [{ id: 'reminder:l', startMin: T(13, 40) }] }, null, plan).ok, 'refuses a half plan that leaves FragPunk on the haircut');
check(parsePlanText('no json', model) === null && parsePlanText('{"moves":[{"id":"zzz","start":"10:00"}]}', model) === null && parsePlanText('{"skip":["zzz"]}', model) === null, 'garbage and unknown ids are rejected at parse');

// prompt
const msgs = buildMessages(model, null, 'today');
const u = msgs[1].content;
check(/ONE JSON object/.test(msgs[0].content) && /"trims"/.test(msgs[0].content) && /"skip"/.test(msgs[0].content) && /at most 2 hours/.test(msgs[0].content) && /Matches are ignored/.test(msgs[0].content) && /touch NOTHING else/.test(msgs[0].content), 'system prompt explains scope, actions and limits');
check(/Haircut \| 14:00-15:00 \| 60 min \| JUST ADDED, must stay/.test(u) && /eat lunch \| 14:00-14:20 \| 20 min \| life, movable \(this day only\)/.test(u) && /FragPunk \| .* \| show or game, in the way: move a little, cut, or skip today/.test(u) && /Candy Jar \| .* \| show or game, leave as is/.test(u) && /take shower \| .* \| life, leave as is/.test(u) && /Manchester City vs AFC Bournemouth \| .* \| match, ignore/.test(u) && /Newcastle United vs Liverpool \| .* \| match, ignore/.test(u) && /3rd Prayer \| .* \| short, ignore/.test(u), 'every item is labelled by role; matches say ignore');
check(/A plan that already works: .*k\d+ -> 13:40/.test(u) && /cut to 12:05-13:40/.test(u) && /cut to 15:00-15:50/.test(u) && /Overlaps to solve: Haircut \(k\d+\) with eat lunch \(k\d+\); Haircut \(k\d+\) with FragPunk \(k\d+\)\./.test(u), 'the baseline plan and only the scope conflicts are spelled out');
const gaps = freeGaps(model).map((g) => `${hm(g.startMin)}-${hm(g.endMin)}`).join(' ');
check(gaps.startsWith('05:00-08:10') && gaps.includes('08:30-14:00') && gaps.includes('17:00-19:25'), `free room ignores shows and matches (${gaps})`);

// wiring
const planner = read('services/schedulePlanner.js');
check(/validatePlan\(model, parsed, anchor, base\)\.ok/.test(planner) && /pickAnchor\(model, anchorId\)/.test(planner) && /source: 'ai'/.test(planner) && /source: 'rules'/.test(planner) && /if \(!planSize\(base\)\) return null;/.test(planner), 'planner: AI plan only when it validates against the rules plan; no plan when nothing can change');
const resrc = read('services/rescheduleItem.js');
check(/export const trimItem/.test(resrc) && /export const dropItem/.test(resrc) && /Calendar\.deleteEventAsync\(raw\.eventId\)/.test(resrc) && /export const applyPlanRow/.test(resrc) && /row\.action === 'drop'/.test(resrc), 'trim and skip write through the Calendar; applyPlanRow routes each row');
const screen = read('screens/MyWeekScreen.js');
check(/if \(await applyPlanRow\(it, line, key\)\) n\+\+;/.test(screen) && /rowText\(l\)/.test(screen) && /Apply \$\{fitCount\} changes/.test(screen) && /Left as is, nothing close enough/.test(screen), 'My Week applies rows by action and shows what was left');
const offer = read('services/fitOffer.js');
check(/export const rowText/.test(offer) && /await applyPlanRow\(it, line, key\)/.test(offer) && /skipped today/.test(offer), 'fitOffer alert lists moves, cuts and skips and applies by action');
const ec = fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'services', 'calendarSync.js'), 'utf8');
check(/const endChanged = entry\.end != null/.test(ec) && /export const removeSlotForKey/.test(ec), 'EyeCandy adopts cut-short shows and skipped ones');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
