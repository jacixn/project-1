// Node test for src/utils/todoTime.js (pure module, babel-transformed in memory).
// Runs itself under three time zones so the "task alert fired at midnight"
// regression (bare 'YYYY-MM-DD' parsed as UTC) can never come back.
// Run: node scripts/test-todo-time.js
const path = require('path');
const assert = require('assert');
const Module = require('module');
const { spawnSync } = require('child_process');

const ZONES = ['Europe/London', 'America/Los_Angeles', 'Pacific/Auckland'];

if (!process.argv.includes('--child')) {
  let failed = false;
  for (const TZ of ZONES) {
    const r = spawnSync(process.execPath, [__filename, '--child'], {
      env: { ...process.env, TZ },
      stdio: 'inherit',
    });
    if (r.status !== 0) failed = true;
  }
  if (failed) {
    console.error('todoTime: FAILED in at least one zone');
    process.exit(1);
  }
  console.log('todoTime: ALL PASS in', ZONES.join(', '));
  process.exit(0);
}

const zone = process.env.TZ;
const tag = (msg) => `[${zone}] ${msg}`;

const file = path.join(__dirname, '..', 'src', 'utils', 'todoTime.js');
const { code } = require('@babel/core').transformFileSync(file, {
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});
const m = new Module(file, module);
m.filename = file;
m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(code, file);
const {
  parseLocalDate, parseHm, todoStartMs, reminderOffsetMin, todoNotifyPlan, todoAlertText, dateKeyLocal,
} = m.exports;

const HOUR = 3600000;
let n = 0;
const check = (cond, msg) => { assert.ok(cond, tag(msg)); n++; };
const eq = (a, b, msg) => { assert.strictEqual(a, b, tag(`${msg}: got ${a}, want ${b}`)); n++; };

// parseLocalDate / parseHm
assert.deepStrictEqual(parseLocalDate('2026-09-18'), { y: 2026, m: 9, d: 18 }); n++;
assert.deepStrictEqual(parseLocalDate('2026-09-18T18:00:00.000Z'), { y: 2026, m: 9, d: 18 }); n++;
eq(parseLocalDate('nonsense'), null, 'garbage date');
eq(parseLocalDate(null), null, 'null date');
eq(parseLocalDate('2026-13-40'), null, 'out-of-range date');
assert.deepStrictEqual(parseHm('19:00'), { hh: 19, mm: 0 }); n++;
assert.deepStrictEqual(parseHm('9:05'), { hh: 9, mm: 5 }); n++;
eq(parseHm('25:00'), null, 'hour 25');
eq(parseHm('7pm'), null, 'garbage time');

// REGRESSION: "remind me to call her" at 19:00 must fire at 19:00 local, not 00:00.
const start1900 = new Date(2026, 8, 18, 19, 0).getTime();
const morning = new Date(2026, 8, 18, 8, 0).getTime();
const callHer = {
  id: '1', text: 'call her', completed: false,
  scheduledDate: '2026-09-18', scheduledTime: '19:00',
  scheduledDateTime: new Date(2026, 8, 18, 19, 0).toISOString(),
};
const plan1 = todoNotifyPlan(callHer, { nowMs: morning });
check(plan1, 'plan exists');
eq(plan1.notifyMs, start1900, 'notify at 19:00 local');
eq(new Date(plan1.notifyMs).getHours(), 19, 'getHours 19');
eq(plan1.offsetMin, 0, 'offset 0');
eq(plan1.startMs, start1900, 'start 19:00');
eq(plan1.dateKey, '2026-09-18', 'dateKey');
console.log(tag(`call her fires at ${new Date(plan1.notifyMs).toString()}`));

// date-only -> local 09:00 by default, local 18:00 with defaultHm; never UTC midnight.
const dateOnly = { id: '2', text: 'x', scheduledDate: '2026-09-18' };
const s9 = todoStartMs(dateOnly);
eq(s9, new Date(2026, 8, 18, 9, 0).getTime(), 'date-only default 09:00 local');
eq(new Date(s9).getHours(), 9, 'date-only hour 9');
const s18 = todoStartMs(dateOnly, { defaultHm: '18:00' });
eq(s18, new Date(2026, 8, 18, 18, 0).getTime(), 'date-only defaultHm 18:00 local');
eq(new Date(s18).getHours(), 18, 'date-only hour 18');
check(s9 !== Date.parse('2026-09-18'), 'date-only is not UTC midnight');
const planDefault = todoNotifyPlan(dateOnly, { nowMs: new Date(2026, 8, 17, 12, 0).getTime(), defaultHm: '18:00' });
eq(new Date(planDefault.notifyMs).getHours(), 18, 'plan honors defaultHm');

// scheduledDate + scheduledTime without scheduledDateTime -> local time
const dt = { id: '3', text: 'x', scheduledDate: '2026-09-18', scheduledTime: '7:45' };
eq(todoStartMs(dt), new Date(2026, 8, 18, 7, 45).getTime(), 'date+time local');
eq(new Date(todoStartMs(dt)).getHours(), 7, 'date+time hour');
eq(new Date(todoStartMs(dt)).getMinutes(), 45, 'date+time minute');

// scheduledDateTime wins over date/time fields
const iso = new Date(2026, 8, 20, 13, 30).toISOString();
eq(todoStartMs({ scheduledDateTime: iso, scheduledDate: '2026-09-18', scheduledTime: '19:00' }), Date.parse(iso), 'ISO wins');
// broken ISO falls back to local date+time
eq(todoStartMs({ scheduledDateTime: 'not a date', scheduledDate: '2026-09-18', scheduledTime: '19:00' }), start1900, 'bad ISO falls back');

// reminderBefore
eq(reminderOffsetMin({ reminderBefore: 60 }), 60, 'reminderBefore 60');
eq(reminderOffsetMin({ reminderBefore: 360 }), 360, 'reminderBefore 360');
eq(reminderOffsetMin({ reminderBefore: 'abc' }), 0, 'reminderBefore abc');
eq(reminderOffsetMin({ reminderBefore: -5 }), 0, 'reminderBefore -5');
eq(reminderOffsetMin({ reminderBefore: null }), 0, 'reminderBefore null');
eq(reminderOffsetMin({}), 0, 'reminderBefore missing');
eq(todoNotifyPlan({ ...callHer, reminderBefore: 60 }, { nowMs: morning }).notifyMs, start1900 - HOUR, '60 -> 1h before');
eq(todoNotifyPlan({ ...callHer, reminderBefore: 360 }, { nowMs: morning }).notifyMs, start1900 - 6 * HOUR, '360 -> 6h before');
eq(todoNotifyPlan({ ...callHer, reminderBefore: 'abc' }, { nowMs: morning }).notifyMs, start1900, 'abc -> at time');
eq(todoNotifyPlan({ ...callHer, reminderBefore: -5 }, { nowMs: morning }).notifyMs, start1900, '-5 -> at time');
eq(todoNotifyPlan({ ...callHer, reminderBefore: null }, { nowMs: morning }).notifyMs, start1900, 'null -> at time');

// null cases
eq(todoNotifyPlan({ ...callHer, completed: true }, { nowMs: morning }), null, 'completed');
eq(todoNotifyPlan(callHer, { nowMs: start1900 + 1 }), null, 'in the past');
eq(todoNotifyPlan(callHer, { nowMs: start1900 }), null, 'exactly now');
eq(todoNotifyPlan({ id: '9', text: 'x', scheduledDate: 'nonsense' }, { nowMs: morning }), null, 'nonsense');
eq(todoNotifyPlan({ id: '9', text: 'x' }, { nowMs: morning }), null, 'unscheduled');
eq(todoNotifyPlan(null, { nowMs: morning }), null, 'falsy task');
eq(todoNotifyPlan({ ...callHer, reminderBefore: 60 }, { nowMs: start1900 - 30 * 60000 }), null, 'reminder moment already passed');

// alert text
const bad = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2014}]/u;
const t = (off, dur) => todoAlertText({ text: 'call her' }, off, dur);
eq(t(0).title, 'Task Reminder', 'title');
eq(t(0).body, '"call her" is due now.', 'offset 0');
eq(t(30).body, '"call her" is due in 30 minutes.', 'offset 30');
eq(t(60).body, '"call her" is due in 1 hour.', 'offset 60');
eq(t(120).body, '"call her" is due in 2 hours.', 'offset 120');
eq(t(360).body, '"call her" is due in 6 hours.', 'offset 360');
eq(t(0, 45).body, '"call her" is due now. About 45 min.', 'dur 45');
eq(t(0, 60).body, '"call her" is due now. About 1 hr.', 'dur 60');
eq(t(60, 90).body, '"call her" is due in 1 hour. About 1 hr 30 min.', 'dur 90');
eq(t(0, 0).body, '"call her" is due now.', 'dur 0 no suffix');
eq(t(0, 'abc').body, '"call her" is due now.', 'dur garbage no suffix');
for (const b of [t(0).body, t(30).body, t(60).body, t(120).body, t(0, 45).body, t(60, 90).body]) {
  check(!bad.test(b), `no em dash / emoji in "${b}"`);
}

// dateKeyLocal at local 23:30 stays on the local day (FullCalendarModal off-by-one guard)
const late = new Date(2026, 8, 18, 23, 30);
eq(dateKeyLocal(late.getTime()), '2026-09-18', 'dateKeyLocal 23:30');
const early = new Date(2026, 8, 18, 0, 10);
eq(dateKeyLocal(early.getTime()), '2026-09-18', 'dateKeyLocal 00:10');
const midnightLocal = new Date(2026, 8, 18, 0, 0);
check(midnightLocal.toISOString().slice(0, 10) === '2026-09-18' || dateKeyLocal(midnightLocal.getTime()) === '2026-09-18', 'local midnight keyed locally');


// CalendarView grid cells are local-midnight Dates (new Date(year, month, day)).
// Keying them with dateKeyLocal must give that same local day in every zone;
// the old toISOString().split('T')[0] gives the previous day whenever the zone
// is ahead of UTC (BST, NZST), which is why a tap on Sep 19 saved Sep 18.
const cell = new Date(2026, 8, 19);
eq(dateKeyLocal(cell.getTime()), '2026-09-19', 'grid cell keyed to its own local day');
const utcSlice = cell.toISOString().split('T')[0];
const offsetMin = -cell.getTimezoneOffset();
if (offsetMin > 0) {
  eq(utcSlice, '2026-09-18', 'UTC slice of a local-midnight cell is the previous day when ahead of UTC (the old bug)');
} else {
  eq(utcSlice, '2026-09-19', 'UTC slice matches only when not ahead of UTC');
}
// A task saved from that cell is date-only, so it is due 09:00 local on the tapped day.
eq(todoStartMs({ scheduledDate: dateKeyLocal(cell.getTime()) }), new Date(2026, 8, 19, 9, 0).getTime(), 'date-only task from grid cell is 09:00 local on the tapped day');

// Overview grouping / 7-day filter: parseLocalDate -> new Date(y, m-1, d) is
// local midnight of that calendar day in every zone; new Date('YYYY-MM-DD')
// then setHours(0) lands on the previous day when the zone is behind UTC.
const pg = parseLocalDate('2026-09-18');
const localMidnight = new Date(pg.y, pg.m - 1, pg.d);
eq(localMidnight.getDate(), 18, 'grouping date is the 18th locally');
eq(localMidnight.getHours(), 0, 'grouping date is local midnight');
const legacy = new Date('2026-09-18');
legacy.setHours(0, 0, 0, 0);
if (offsetMin < 0) {
  eq(legacy.getDate(), 17, 'legacy parse + setHours(0) is a day early behind UTC (the old bug)');
} else {
  eq(legacy.getDate(), 18, 'legacy parse only coincides at or ahead of UTC');
}
const today0 = new Date(2026, 8, 18);
eq(Math.ceil((localMidnight - today0) / 86400000), 0, 'same day groups as Today');
const p7 = parseLocalDate('2026-09-25');
eq(Math.ceil((new Date(p7.y, p7.m - 1, p7.d) - today0) / 86400000), 7, 'seven days out is exactly 7');

// Source guard: no caller may parse a bare scheduledDate as UTC again.
const fsMod = require('fs');
const srcRoot = path.join(__dirname, '..', 'src');
const guarded = [
  'components/CalendarView.js',
  'components/FullCalendarModal.js',
  'components/TodoList.js',
  'components/TasksOverviewModal.js',
  'screens/TasksOverviewScreen.js',
  'services/notificationService.js',
  'components/NotificationSettings.js',
];
for (const rel of guarded) {
  const text = fsMod.readFileSync(path.join(srcRoot, rel), 'utf8');
  check(!/new Date\((?:t|todo|task)\.scheduledDate\)/.test(text), `${rel}: no new Date(x.scheduledDate)`);
  check(!/scheduledDate:\s*\w+\.toISOString\(\)\.split\('T'\)\[0\]/.test(text), `${rel}: scheduledDate never written from the UTC slice`);
}
const nsText = fsMod.readFileSync(path.join(srcRoot, 'services/notificationService.js'), 'utf8');
check(/scheduleTaskNotificationsSoon[\s\S]*?taskReminders === false\) return;[\s\S]*?_rescheduleTaskNotifications\(s\.sound !== false\)/.test(nsText), 'debounced todosChanged rebuild is gated on pushNotifications / taskReminders');

console.log(tag(`todoTime: ${n} checks passed`));
