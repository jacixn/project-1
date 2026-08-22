// Make it fit: the pure planner rules (model, conflicts, cascade, validation
// of AI plans, prompt, parsing) plus the wiring in My Week.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('utils/fitPlan.js');
const pure = src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 =');
const mod = {};
new Function('exports', pure)(mod);
const { toModel, fixableOverlaps, allowedIds, cascadePlan, validatePlan, buildMessages, parsePlanText, describePlan, staysFor, freeGaps, hm } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const it = (id, kind, title, s, e, movable, type, color = '#000') => ({ id, kind, title, startMin: s, endMin: e, movable, color, raw: { type } });

// The Sunday from the screenshots, plus an urgent errand dropped on 4 PM.
const day = [
  it('cal:t', 'eyecandy', 'Trinity Seven', 540, 615, true, 'recurring'),
  it('reminder:e', 'reminder', 'Errand', 960, 1005, true, 'one-time'),
  it('gym:p', 'gym', 'Pull', 960, 1020, true, 'one-time'),
  it('cal:n', 'eyecandySports', 'Newcastle United vs Liverpool', 990, 1110, false, 'one-time'),
  it('prayer:4', 'prayer', '4th Prayer', 1050, 1055, true, 'recurring'),
  it('cal:s', 'eyecandy', 'Solo Leveling', 1065, 1165, true, 'one-time'),
  it('reminder:d', 'reminder', 'eat dinner', 1165, 1185, true, 'recurring'),
  it('reminder:sh', 'reminder', 'take shower', 1185, 1215, true, 'one-time'),
];
const ANCHOR = 'reminder:e';
const model = toModel(day);
const byId = Object.fromEntries(model.map((m) => [m.id, m]));

check(byId['cal:n'].movable === false && byId['cal:n'].why === 'kick-off is fixed', 'fixture is fixed, with the reason');
check(byId['cal:t'].movable === false && byId['cal:t'].why === 'repeats every week', 'weekly EyeCandy slot is fixed for a one-day plan');
check(byId['prayer:4'].movable === false && byId['prayer:4'].why === 'daily prayer' && byId['prayer:4'].soft, 'daily prayer is fixed and short');
check(byId['gym:p'].movable && byId['cal:s'].movable && byId['reminder:sh'].movable, 'one-time things can move');
check(model.every((m, i) => m.key === `k${i + 1}`) && byId['reminder:d'].why === 'repeats every week', 'short keys for the prompt; weekly reminder fixed');

const pairs = fixableOverlaps(model, ANCHOR);
const pk = pairs.map(([a, b]) => `${a.id}+${b.id}`).sort();
check(pk.join(' ') === 'cal:n+cal:s gym:p+cal:n reminder:e+gym:p', `fixable overlaps found (${pk.join(' ')})`);
check(fixableOverlaps(model, ANCHOR).every(([a, b]) => a.id !== 'prayer:4' && b.id !== 'prayer:4'), 'a 5-minute prayer inside a match is not a problem to fix');
const allowed = [...allowedIds(model, ANCHOR)].sort();
check(allowed.join(' ') === 'cal:s gym:p', `only items in the overlap cluster may move (${allowed.join(' ')}), the shower is left alone`);

const plan = cascadePlan(model, ANCHOR);
const mv = Object.fromEntries(plan.moves.map((m) => [m.id, m.startMin]));
check(mv['gym:p'] === 1215 && mv['cal:s'] === 1275 && plan.moves.length === 2 && !plan.overflow.length, `cascade flows around the match, dinner and shower (Pull ${hm(mv['gym:p'] || 0)}, Solo ${hm(mv['cal:s'] || 0)})`);
check(validatePlan(model, plan, ANCHOR).ok, 'cascade output passes validation');
check(cascadePlan(toModel([it('a', 'reminder', 'A', 600, 660, true, 'one-time'), it('b', 'reminder', 'B', 700, 760, true, 'one-time')])).moves.length === 0, 'a clean day needs no moves');

// AI plans: accept the good, refuse the rest
const K = (id) => byId[id].key;
const good = parsePlanText('Here you go:\n```json\n{"moves":[{"id":"' + K('gym:p') + '","start":"20:15"},{"id":"' + K('cal:s') + '","start":"21:15"}],"note":"Pull and Solo Leveling move after the shower."}\n```', model);
check(good && good.moves.length === 2 && good.moves[0].id === 'gym:p' && good.moves[0].startMin === 1215 && good.note.startsWith('Pull and'), 'parses fenced JSON and maps keys back to ids');
check(validatePlan(model, good, ANCHOR).ok, 'a sound AI plan is accepted');
const earlier = parsePlanText('{"moves":[{"id":"gym:p","start":"14:30"},{"id":"' + K('cal:s') + '","start":"20:15"}],"note":"x"}', model);
check(validatePlan(model, earlier, ANCHOR).ok, 'moving into a free gap earlier in the day is fine (raw ids accepted too)');
check(!validatePlan(model, { moves: [{ id: 'cal:n', startMin: 1200 }] }, ANCHOR).ok, 'refuses to move the fixture');
check(!validatePlan(model, { moves: [{ id: ANCHOR, startMin: 1200 }] }, ANCHOR).ok, 'refuses to move the thing just added');
check(!validatePlan(model, { moves: [{ id: 'reminder:sh', startMin: 1300 }, { id: 'gym:p', startMin: 1215 }, { id: 'cal:s', startMin: 1275 }] }, ANCHOR).ok, 'refuses to touch something outside the conflict');
check(!validatePlan(model, { moves: [{ id: 'gym:p', startMin: 1217 }, { id: 'cal:s', startMin: 1275 }] }, ANCHOR).ok, 'refuses times off the 5-minute grid');
check(!validatePlan(model, { moves: [{ id: 'gym:p', startMin: 1020 }, { id: 'cal:s', startMin: 1275 }] }, ANCHOR).ok, 'refuses a plan that still overlaps the match');
check(!validatePlan(model, { moves: [{ id: 'gym:p', startMin: 1215 }] }, ANCHOR).ok, 'refuses a half plan (Solo Leveling still on the match)');
check(!validatePlan(model, { moves: [{ id: 'gym:p', startMin: 1215 }, { id: 'cal:s', startMin: 1400 }] }, ANCHOR).ok, 'refuses running past midnight');
check(parsePlanText('no json here', model) === null && parsePlanText('{"moves":[{"id":"zzz","start":"10:00"}]}', model) === null && parsePlanText('{"moves":[{"id":"gym:p","start":"25:00"}]}', model) === null, 'garbage, unknown ids and bad times are rejected at parse');

const gaps = freeGaps(model, ANCHOR).map((g) => `${hm(g.startMin)}-${hm(g.endMin)}`).join(' ');
check(gaps === '05:00-09:00 10:15-16:00 18:30-19:25 20:15-24:00', `free gaps around everything that stays (${gaps})`);
const msgs = buildMessages(model, ANCHOR, 'today');
const u = msgs[1].content;
check(msgs[0].role === 'system' && /ONE JSON object/.test(msgs[0].content) && /5-minute steps/.test(msgs[0].content) && /plan that already works/.test(msgs[0].content), 'system prompt demands JSON on the grid and offers a working baseline');
check(/Errand \| 16:00-16:45 \| 45 min \| JUST ADDED, must stay/.test(u) && /Newcastle United vs Liverpool \| 16:30-18:30 \| 120 min \| FIXED \(kick-off is fixed\)/.test(u) && /Pull \| 16:00-17:00 \| 60 min \| movable/.test(u) && /take shower \| .* \| not involved, leave it/.test(u) && /4th Prayer \| .* \| short, ignore/.test(u) && /eat dinner \| .* \| FIXED \(repeats every week\)/.test(u), 'every item is labelled honestly for the model');
check(/Overlaps to solve: Errand \(k2\) with Pull \(k3\); Pull \(k3\) with Newcastle United vs Liverpool \(k4\); Newcastle United vs Liverpool \(k4\) with Solo Leveling \(k6\)\./.test(u) && /Free gaps you may use \(nothing else is free\): 05:00-09:00, 10:15-16:00, 18:30-19:25, 20:15-24:00\./.test(u) && /A plan that already works: k3 -> 20:15, k6 -> 21:15\./.test(u), 'the model gets the conflicts, the real free gaps and the cascade as a baseline');

const lines = describePlan(model, plan);
check(lines.length === 2 && lines[0].title === 'Pull' && lines[0].from === 960 && lines[0].to === 1215 && lines[0].color === '#000', 'preview rows carry title, colour, from and to');
const stays = staysFor(model, ANCHOR).map((s) => `${s.title}:${s.why}`).sort();
check(stays.join('|') === 'Errand:just added|Newcastle United vs Liverpool:kick-off is fixed', `stays-put list explains itself (${stays.join('|')})`);

// wiring
const planner = read('services/schedulePlanner.js');
check(/validatePlan\(model, parsed, anchorId\)\.ok/.test(planner) && /cascadePlan\(model, anchorId\)/.test(planner) && /source: 'ai'/.test(planner) && /source: 'rules'/.test(planner), 'planner: AI plan only when it validates, cascade otherwise');
check(/rawChat\(messages, \{ temperature: 0\.2/.test(planner) && /async rawChat\(messages, \{ temperature = 0\.2/.test(read('services/productionAiService.js')), 'planner runs the app AI chain at low temperature');
const screen = read('screens/MyWeekScreen.js');
check(/fixableOverlaps\(toModel\(dayItems\), lastMovedRef\.current\)/.test(screen) && /fixableCount > 0 \?/.test(screen) && /'Make it fit'/.test(screen), 'My Week shows Make it fit only when something fixable overlaps');
check(/lastMovedRef\.current = moving\.id;/.test(screen) && /planDay\(dayItems, \{ anchorId: lastMovedRef\.current/.test(screen), 'the thing just moved is the anchor that stays put');
check(/const applyFit = async/.test(screen) && /await moveItem\(it, \{ time: minToTime\(mv\.startMin\) \}\)/.test(screen) && /Apply \$\{fitPlan\.lines\.length\} moves/.test(screen) && /Stays put/.test(screen), 'plan is shown first and applied through moveItem on Apply');
check(!/numberOfLines/.test(screen.slice(screen.indexOf('Make it fit: the plan in words'), screen.indexOf('Move panel: dims'))), 'plan rows never truncate titles');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
