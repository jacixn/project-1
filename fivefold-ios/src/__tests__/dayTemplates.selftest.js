// Day templates: pure rules (utils/dayTemplates.js) + wiring checks.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const load = (rel, deps = []) => {
  const src = [...deps, rel].map((r) => fs.readFileSync(path.join(root, r), 'utf8')).join('\n');
  const pure = src.replace(/^import[^\n]*\n/gm, '').replace(/export const (\w+) =/g, 'const $1 = exports.$1 =');
  const mod = {};
  new Function('exports', pure)(mod);
  return mod;
};
const T = load('utils/dayTemplates.js', ['utils/takeover.js']);
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// Clock helpers
check(T.hmToMin('09:00') === 540 && T.hmToMin('17:30') === 1050, 'hmToMin');
check(T.hmToMin('9:5') === null && T.hmToMin('25:00') === null, 'hmToMin rejects bad input');
check(T.minToHm(1050) === '17:30' && T.minToHm(0) === '00:00', 'minToHm');
check(T.fmtClock(540) === '9 AM' && T.fmtClock(1050) === '5:30 PM' && T.fmtClock(0) === '12 AM', `fmtClock (${T.fmtClock(540)}, ${T.fmtClock(1050)})`);

// Normalize: sorted, invalid dropped, ids kept
const t = T.normalizeTemplate({ id: 'wr', name: ' Work Remote ', blocks: [
  { id: 'lunch', title: 'Lunch', start: '13:00', end: '13:30' },
  { id: 'work', title: 'Work', start: '09:00', end: '17:30', fixed: true },
  { id: 'bad', title: 'Empty', start: '15:00', end: '15:00' },
  { id: 'bf', title: 'Breakfast', start: '08:00', end: '08:30' },
] });
check(t.name === 'Work Remote', 'name trimmed');
check(t.blocks.map((b) => b.id).join() === 'bf,work,lunch', `blocks sorted by start, zero-length one dropped (${t.blocks.map((b) => b.id).join()})`);
check(t.blocks[1].fixed === true && t.blocks[0].fixed === false, 'fixed flag kept / defaulted');
check(T.templateSummary(t) === 'Work 9 AM to 5:30 PM · Breakfast, Lunch', `summary (${T.templateSummary(t)})`);

const withSrc = T.normalizeTemplate({ id: 's', name: 'S', blocks: [{ id: 'w', title: 'Work', start: '09:00', end: '17:30', fixed: true, source: { kind: 'calendar', title: 'Work', calendarTitle: 'Work' } }, { id: 'x', title: 'X', start: '10:00', end: '11:00', source: { kind: 'other' } }] });
check(withSrc.blocks[0].source && withSrc.blocks[0].source.calendarTitle === 'Work' && !withSrc.blocks[1].source, 'calendar source kept on a block, unknown sources dropped');
check(T.blocksForDay([withSrc], { dates: { d: 's' }, weekdays: {}, overrides: {} }, 'd', 1)[0].source.title === 'Work', 'blocksForDay carries the source');

// Presets make valid templates
for (const p of T.PRESET_TEMPLATES) {
  const m = T.makeTemplate(p.name, p.blocks);
  check(m.blocks.length === p.blocks.length && m.blocks.every((b) => b.id), `preset "${p.name}" keeps all ${p.blocks.length} blocks with ids`);
}

// Plan: date beats weekday, null means none on purpose
let plan = T.emptyPlan();
plan = T.withWeekdayTemplate(plan, 3, 'wr'); // Wednesdays
check(T.templateIdForDay(plan, '2026-08-26', 3) === 'wr', 'weekday rule applies');
check(T.templateIdForDay(plan, '2026-08-27', 4) === null, 'other weekday: nothing');
plan = T.withDateTemplate(plan, '2026-08-26', null);
check(T.templateIdForDay(plan, '2026-08-26', 3) === null, 'date says none: beats the weekday rule');
plan = T.withoutDateChoice(plan, '2026-08-26');
check(T.templateIdForDay(plan, '2026-08-26', 3) === 'wr', 'forgetting the date choice restores the weekday rule');
plan = T.withDateTemplate(plan, '2026-08-27', 'off');
check(T.templateIdForDay(plan, '2026-08-27', 4) === 'off', 'date choice on a day with no weekday rule');

// Blocks for a day + overrides
const templates = [t, T.normalizeTemplate({ id: 'off', name: 'Day off', blocks: [{ id: 'l2', title: 'Lunch', start: '13:00', end: '13:45' }] })];
let day = T.blocksForDay(templates, plan, '2026-08-26', 3);
check(day.map((b) => `${b.title}@${b.startMin}-${b.endMin}`).join() === 'Breakfast@480-510,Work@540-1050,Lunch@780-810', `Wednesday blocks (${day.map((b) => `${b.title}@${b.startMin}-${b.endMin}`).join()})`);
check(day[1].fixed === true && day[1].templateName === 'Work Remote' && day[1].baseStartMin === 540, 'block carries fixed, template name, base start');
plan = T.withOverride(plan, '2026-08-26', 'lunch', { start: '13:30', end: '14:00' });
day = T.blocksForDay(templates, plan, '2026-08-26', 3);
check(day.find((b) => b.blockId === 'lunch').startMin === 810 && day.find((b) => b.blockId === 'lunch').moved === true, 'override moves lunch on that day only');
check(T.blocksForDay(templates, plan, '2026-09-02', 3).find((b) => b.blockId === 'lunch').startMin === 780, 'next Wednesday: lunch back at 1 PM');
plan = T.withOverride(plan, '2026-08-26', 'bf', null);
day = T.blocksForDay(templates, plan, '2026-08-26', 3);
check(!day.some((b) => b.blockId === 'bf'), 'null override skips breakfast that day');
plan = T.withOverride(plan, '2026-08-26', 'bf', undefined);
check(T.blocksForDay(templates, plan, '2026-08-26', 3).some((b) => b.blockId === 'bf'), 'undefined override restores it');
check(T.withOverride(plan, '2026-08-26', 'lunch', { start: '14:00', end: '13:00' }) === T.normalizePlan(plan) || JSON.stringify(T.withOverride(plan, '2026-08-26', 'lunch', { start: '14:00', end: '13:00' })) === JSON.stringify(T.normalizePlan(plan)), 'backwards override ignored');
plan = T.withDateTemplate(plan, '2026-08-26', 'off');
check(!plan.overrides['2026-08-26'], 'picking a new template for the day clears its old moves');
check(T.blocksForDay(templates, plan, '2026-08-26', 3).map((b) => b.title).join() === 'Lunch', 'day now shows the Day off blocks');

// Deleting a template clears its uses; pruning forgets the past
plan = T.withWeekdayTemplate(plan, 0, 'off');
plan = T.withoutTemplate(plan, 'off');
check(!Object.values(plan.dates).includes('off') && !Object.values(plan.weekdays).includes('off'), 'deleted template removed from dates and weekdays');
plan = T.withDateTemplate(plan, '2026-01-01', 'wr');
plan = T.withOverride(plan, '2026-01-01', 'lunch', null);
const pruned = T.prunePlan(plan, '2026-08-23');
check(!pruned.dates['2026-01-01'] && !pruned.overrides['2026-01-01'] && pruned.weekdays['3'] === 'wr', 'prune drops past dates, keeps weekday rules');

// Free time: 7 AM to 11 PM minus merged busy
const free = T.freeMinutes([{ startMin: 480, endMin: 510 }, { startMin: 540, endMin: 1050 }, { startMin: 780, endMin: 810 }]);
check(free === 16 * 60 - 30 - 510, `free minutes merge overlapping work/lunch (${free})`);
check(T.freeMinutes([]) === 16 * 60, 'empty day: whole waking day free');
check(T.iconForTitle('Lunch break') === 'lunch-dining' && T.iconForTitle('Piano') === 'schedule', 'icons by title');

// Wiring: the other files know about blocks
const src = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
check(/block: \{ label: 'Day plan'/.test(src('utils/dayItems.js')) && /getBlocksForDay/.test(src('utils/dayItems.js')), 'dayItems loads blocks');
check(/kind === 'block'/.test(src('utils/dayItems.js')) && /'block'/.test(src('utils/dayItems.js').match(/movable: [^\n]*/)[0]), 'blocks are movable in My Week');
check(/getBlocksForDay/.test(src('utils/dayBusy.js')), 'dayBusy counts blocks as busy (free chips, planner offers)');
check(/it\.kind === 'block'\) return raw\.fixed \? 'fixed' : 'life'/.test(src('utils/fitPlan.js')), 'planner: fixed blocks stay, flexible ones are life');
check(/it\.kind === 'block'\)\)/.test(src('utils/fitPlan.js').match(/const todayOnly = [^\n]*/)[0]), 'planner moves a block today only');
check(src('utils/fitPlan.js') === fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'utils', 'fitPlan.js'), 'utf8'), 'fitPlan.js identical in EyeCandy');
const cs = src('services/calendarSync.js');
check(/export const syncBlocks/.test(cs) && /await syncBlocks\(\);/.test(cs) && /stableKey: `block__\$\{key\}~\$\{b\.blockId\}`/.test(cs), 'calendar mirror: block namespace, in syncAll');
check(/if \(ns === 'block'\)/.test(cs) && /moveBlockForDay/.test(cs) && /skipBlockForDay/.test(cs), 'adoption: Calendar moves become that day\'s exception');
check(/k\.ns === 'block' && endChanged/.test(cs), 'adoption: a block shortened in the Calendar is followed');
check(!/syncBlocks = \(\) => serialize/.test(cs), 'syncBlocks does not nest serialize (would deadlock)');
const ri = src('services/rescheduleItem.js');
check(/item\.kind === 'block'/.test(ri.split('export const moveItem')[1].split('export const trimItem')[0]) && /moveBlockForDay/.test(ri), 'moveItem handles blocks');
check(/item\.kind === 'block'/.test(ri.split('export const removeItem')[1].split('export const setPinned')[0]), 'removeItem: skip today / remove from template');
check(/item\.kind === 'block'/.test(ri.split('export const setPinned')[1]), 'setPinned: block pin = fixed on the template');
const mw = src('screens/MyWeekScreen.js');
check(/styles\.planRow/.test(mw) && /visible=\{planOpen\}/.test(mw) && /pickTemplate\(/.test(mw) && /navigate\('DayTemplates'\)/.test(mw), 'My Week: day plan row + sheet + editor link');
check(/moving\.kind === 'block'/.test(mw), 'My Week: Move panel knows blocks');
check(/name="DayTemplates"/.test(src('navigation/RootNavigator.js')), 'DayTemplates route registered');
check(fs.existsSync(path.join(root, 'screens', 'DayTemplatesScreen.js')), 'editor screen exists');
const svc = src('services/dayTemplates.js');
check(/syncBlocks/.test(svc) && /DAY_PLAN_CHANGED/.test(svc) && /prunePlan/.test(svc), 'service mirrors to the calendar, emits, prunes');

// Silence: a templated day mutes repeating reminders the template does not hold
const wr = T.normalizeTemplate({ id: 'wr', name: 'Work Remote', blocks: [{ id: 'w', title: 'Work', start: '09:00', end: '17:30', fixed: true }, { id: 's', title: 'Social Media time', start: '20:00', end: '21:00' }] });
const plan2 = T.withWeekdayTemplate(T.emptyPlan(), 3, 'wr');
check(T.reminderHiddenOn({ title: 'Eat breakfast', type: 'recurring' }, [wr], plan2, '2026-08-26', 3) === true, 'Wednesday (Work Remote): the breakfast reminder is silenced');
check(T.reminderHiddenOn({ title: 'Social Media time', type: 'recurring' }, [wr], plan2, '2026-08-26', 3) === false, 'a reminder the template holds still rings');
check(T.reminderHiddenOn({ title: 'Eat breakfast', type: 'recurring' }, [wr], plan2, '2026-08-27', 4) === false, 'Thursday (no template): rings as usual');
check(T.reminderHiddenOn({ title: 'Dentist', type: 'one-time' }, [wr], plan2, '2026-08-26', 3) === false, 'one-time reminders are never silenced');
const ns = fs.readFileSync(path.join(root, 'services', 'notificationService.js'), 'utf8');
check(/hiddenDatesForReminder\(reminder, 15\)/.test(ns) && /if \(hidden\.has\(candidateKey\)\) continue;/.test(ns), 'reminder notifications skip silenced days');
const svc2 = fs.readFileSync(path.join(root, 'services', 'dayTemplates.js'), 'utf8');
check(/export const hiddenDatesForReminder/.test(svc2) && (svc2.match(/mirror\(\); requiet\(\); emit\(\);/g) || []).length === 2 && !/from '\.\.\/utils\/dayBusy'/.test(svc2), 'plan/template saves reschedule reminders; service no longer pulls dayBusy (no require cycle with notifications)');

check(JSON.stringify(T.normalizeKeeps()) === '{"prayers":true,"workouts":true,"oneOffs":true,"eyecandy":true,"sports":true}' && T.normalizeKeeps({ sports: false }).sports === false && T.normalizeKeeps({ sports: false }).prayers === true, 'keeps default to all on');
const quiet = T.normalizeTemplate({ id: 'q', name: 'Quiet Sunday', blocks: [{ id: 'c', title: 'Church', start: '10:00', end: '12:00', fixed: true }], keeps: { sports: false, eyecandy: false } });
check(T.hideGroupsFor(quiet).join() === 'eyecandy,sports' && T.hideGroupsFor(wr).length === 0, 'hideGroupsFor lists the groups turned off');
const plan3 = T.withWeekdayTemplate(T.emptyPlan(), 0, 'q');
check(T.groupHiddenOn('sports', [quiet], plan3, '2026-08-30', 0) === true && T.groupHiddenOn('prayers', [quiet], plan3, '2026-08-30', 0) === false && T.groupHiddenOn('sports', [quiet], plan3, '2026-08-31', 1) === false, 'groupHiddenOn');
const oo = T.normalizeTemplate({ id: 'o', name: 'O', blocks: [{ id: 'w', title: 'Work', start: '09:00', end: '17:00' }], keeps: { oneOffs: false } });
check(T.reminderHiddenOn({ title: 'Dentist', type: 'one-time' }, [oo], T.withWeekdayTemplate(T.emptyPlan(), 2, 'o'), '2026-08-25', 2) === true, 'one-off reminders go quiet when one-off things are off');

// Overnight blocks: Sleep 10:30 PM to 6:30 AM
const night = T.normalizeTemplate({ id: 'n', name: 'Night', blocks: [{ id: 'sl', title: 'Sleep', start: '22:30', end: '06:30', fixed: true }, { id: 'z', title: 'Zero', start: '09:00', end: '09:00' }] });
check(night.blocks.length === 1 && night.blocks[0].overnight === true && night.blocks[0].end === '06:30', 'an end before the start means past midnight (kept, marked overnight); equal start/end dropped');
const nightDay = T.blocksForDay([night], { dates: { d: 'n' }, weekdays: {}, overrides: {} }, 'd', 1);
check(nightDay.map((b) => `${b.blockId}@${b.startMin}-${b.endMin}`).join() === 'sl_am@0-390,sl@1350-1440', `two pieces on the day: morning till 6:30, evening from 10:30 (${nightDay.map((b) => `${b.blockId}@${b.startMin}-${b.endMin}`).join()})`);
check(nightDay[1].overnight === 'pm' && nightDay[1].overnightEnd === 390 && nightDay[0].overnight === 'am' && nightDay.every((b) => b.fixed && b.title === 'Sleep'), 'pieces carry the overnight end for the calendar event');
const skippedAm = T.withOverride({ dates: { d: 'n' }, weekdays: {}, overrides: {} }, 'd', 'sl_am', null);
check(T.blocksForDay([night], skippedAm, 'd', 1).map((b) => b.blockId).join() === 'sl', 'a piece can be skipped on its own');
check(T.freeMinutes(nightDay) === 16 * 60 - 30, 'free time: only the 10:30 to 11 PM part is inside the waking day');
check(/if \(b\.overnight === 'am'\) continue;/.test(fs.readFileSync(path.join(root, 'services', 'calendarSync.js'), 'utf8')) && /d\.getDate\(\) \+ 1, 0, b\.overnightEnd/.test(fs.readFileSync(path.join(root, 'services', 'calendarSync.js'), 'utf8')), 'calendar: one event from the evening into the next morning');
check(/next morning/.test(fs.readFileSync(path.join(root, 'screens', 'DayTemplatesScreen.js'), 'utf8')) && /hmToMin\(b\.end\) === hmToMin\(b\.start\)/.test(fs.readFileSync(path.join(root, 'screens', 'DayTemplatesScreen.js'), 'utf8')), 'editor shows "next morning", only equal times are an error');
check(/replace\(\/_am\$\/, ''\)/.test(fs.readFileSync(path.join(root, 'services', 'rescheduleItem.js'), 'utf8')), 'removing / fixing the morning piece edits the one template block');

// Blocks ring like reminders
const ringT = T.normalizeTemplate({ id: 'r', name: 'R', blocks: [{ id: 'd', title: 'eat dinner', start: '19:00', end: '19:20' }, { id: 'w', title: 'Work', start: '09:00', end: '17:00', fixed: true }, { id: 'q', title: 'Lunch', start: '13:00', end: '13:30', notify: false }, { id: 'c', title: 'Work', start: '09:00', end: '17:00', source: { kind: 'calendar', title: 'Work' } }] });
check(ringT.blocks.find((b) => b.id === 'd').notify === true && ringT.blocks.find((b) => b.id === 'w').notify === false && ringT.blocks.find((b) => b.id === 'q').notify === false && ringT.blocks.find((b) => b.id === 'c').notify === false, 'notify defaults: flexible blocks ring, fixed and calendar-backed stay quiet, explicit off respected');
check(T.blocksForDay([ringT], { dates: { d: 'r' }, weekdays: {}, overrides: {} }, 'd', 1).find((b) => b.blockId === 'd').notify === true, 'blocksForDay carries notify');
const nsrc2 = fs.readFileSync(path.join(root, 'services', 'notificationService.js'), 'utf8');
check(/async rescheduleBlockNotifications\(\)/.test(nsrc2) && /type: 'block_reminder'/.test(nsrc2) && /if \(b\.notify === false \|\| b\.source \|\| b\.overnight === 'am'\) continue;/.test(nsrc2) && /!scheduledTypes\.has\('block_reminder'\)/.test(nsrc2), 'block reminders armed for 7 days, re-armed when missing');
check(/ns\.rescheduleBlockNotifications\(\)/.test(fs.readFileSync(path.join(root, 'services', 'dayTemplates.js'), 'utf8')), 'plan/template saves re-arm block reminders');
const rs = fs.readFileSync(path.join(root, 'components', 'RemindersScreen.js'), 'utf8');
check(/isBlock: true/.test(rs) && /Day plan · \$\{reminder\.templateName\}/.test(rs) && /dayPlanChanged/.test(rs), 'Reminders screen lists the day\'s ringing blocks');
check(/Rings at \$\{fmtClock\(hmToMin\(b\.start\)\)\}, like a reminder/.test(fs.readFileSync(path.join(root, 'screens', 'DayTemplatesScreen.js'), 'utf8')), 'editor: per-block Remind me toggle');

let doneP = T.withBlockDone(T.emptyPlan(), '2026-08-23', 'd', true);
check(T.isBlockDone(doneP, '2026-08-23', 'd') && !T.isBlockDone(doneP, '2026-08-24', 'd') && !T.isBlockDone(T.withBlockDone(doneP, '2026-08-23', 'd', false), '2026-08-23', 'd'), 'a block can be ticked off for one day and back');
check(T.blocksForDay([ringT], { ...T.withDateTemplate(T.emptyPlan(), 'x', 'r'), done: { x: ['d'] } }, 'x', 1).find((b) => b.blockId === 'd').done === true, 'blocksForDay carries done');
check(!T.prunePlan({ ...T.emptyPlan(), done: { '2026-01-01': ['d'], '2026-09-01': ['d'] } }, '2026-08-23').done['2026-01-01'], 'old ticks pruned');
const rc = fs.readFileSync(path.join(root, 'components', 'RemindersCard.js'), 'utf8');
check(/getBlocksForDay\(new Date\(\)\)/.test(rc) && /isBlock: true/.test(rc) && /setBlockDone\(dateStr, reminder\.blockId, true\)/.test(rc) && /dayPlanChanged/.test(rc), 'Focus card shows today\'s ringing blocks and ticks them off');
check(/setBlockDone\(dateStr, reminder\.blockId, done\)/.test(rs), 'Reminders screen ticks blocks too');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
