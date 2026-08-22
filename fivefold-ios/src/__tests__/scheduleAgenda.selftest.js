// Scheduled Workouts agenda maths + screen invariants.
// Run: node src/__tests__/scheduleAgenda.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'utils', 'scheduleAgenda.js'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'screens', 'AllWorkoutsScreen.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 ='))(mod);
const { nextOccurrence, whenLabel, sortByNext, patternLabel, reminderLabel, durationLabel, weekLoad, weeklySummary, hoursLabel, scheduledOn } = mod;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// Saturday 22 Aug 2026, 16:37 (matches the screenshot clock)
const now = new Date(2026, 7, 22, 16, 37);
const abs = { id: 'a', templateName: 'abs', time: '07:10', duration: 60, type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], notifyBefore: -1 };
const pullSun = { id: 'b', templateName: 'Pull', time: '16:00', duration: 105, type: 'recurring', days: [0], notifyBefore: 0 };
const push = { id: 'c', templateName: 'Push', time: '17:35', duration: 105, type: 'recurring', days: [1, 5], notifyBefore: 10 };
const pullThu = { id: 'd', templateName: 'Pull', time: '17:35', duration: 90, type: 'recurring', days: [4], notifyBefore: 60 };
const legs = { id: 'e', templateName: 'Legs', time: '17:35', duration: 75, type: 'recurring', days: [2], notifyBefore: 15 };
const oneTimePast = { id: 'f', templateName: 'Test', time: '09:00', duration: 30, type: 'one-time', date: '2026-08-20', notifyBefore: 0 };
const oneTimeSoon = { id: 'g', templateName: 'Trial', time: '20:00', duration: 45, type: 'one-time', date: '2026-08-22', notifyBefore: 0 };
const list = [abs, pullSun, push, pullThu, legs, oneTimePast, oneTimeSoon];

check(whenLabel(nextOccurrence(abs, now), now) === 'Tomorrow', 'every-day 7:10 AM at 16:37 -> Tomorrow (today already passed)');
check(whenLabel(nextOccurrence(oneTimeSoon, now), now) === 'Today', 'one-time tonight -> Today');
check(whenLabel(nextOccurrence(pullSun, now), now) === 'Tomorrow', 'Sunday schedule on a Saturday -> Tomorrow');
check(whenLabel(nextOccurrence(push, now), now) === 'Mon', 'Mon/Fri schedule -> Mon');
check(whenLabel(nextOccurrence(oneTimePast, now), now) === 'Passed', 'past one-time -> Passed');
check(nextOccurrence({ type: 'recurring', days: [], time: '10:00' }, now) === null, 'no days -> never');
const far = new Date(2026, 8, 5, 9, 0);
check(whenLabel(far, now) === 'Sat 5 Sep', 'beyond a week shows the date');

const order = sortByNext(list, now).map((s) => s.id).join('');
check(order === 'gabcedf', `Today, Tomorrow, Tomorrow, Mon, Tue, Thu, Passed (got ${order})`);

check(patternLabel(abs) === 'Every day' && patternLabel(push) === 'Mon, Fri' && patternLabel({ type: 'recurring', days: [1, 2, 3, 4, 5] }) === 'Weekdays' && patternLabel({ type: 'recurring', days: [6, 0] }) === 'Weekends', 'pattern wording');
check(patternLabel(oneTimePast) === 'Thu 20 Aug 2026', `one-time pattern is the full date, day first (${patternLabel(oneTimePast)})`);
check(reminderLabel(-1) === 'no reminder' && reminderLabel(0) === 'reminder at start' && reminderLabel(10) === 'reminder 10 min before' && reminderLabel(60) === 'reminder 1 hr before', 'reminder wording');
check(durationLabel(105) === '1 hr 45 min' && durationLabel(60) === '1 hr' && durationLabel(45) === '45 min' && durationLabel(0) === '', 'duration wording, never "1h45"');

const load = weekLoad(list, now); // Mon..Sun
check(load.join() === [60 + 105, 60 + 75, 60, 60 + 90, 60 + 105, 60 + 45, 60 + 105].join(), `week load Mon..Sun (got ${load.join()})`);
const sum = weeklySummary(list, now);
check(sum.sessionsPerWeek === 7 + 1 + 2 + 1 + 1 + 1 && sum.minutesPerWeek === load.reduce((a, b) => a + b, 0), `weekly sessions ${sum.sessionsPerWeek}, minutes ${sum.minutesPerWeek}`);
check(sum.workouts === 7, 'workout count');
check(hoursLabel(90) === '1.5 hrs' && hoursLabel(60) === '1 hr' && hoursLabel(45) === '45 min' && hoursLabel(855) === '14.5 hrs', 'hours wording');
check(weekLoad(null).every((v) => v === 0) && sortByNext(null).length === 0, 'null-safe');

const today = scheduledOn(list, now).map((s) => s.id).join('');
check(today === 'ag', `Saturday 22 Aug: abs (every day) then the one-time Trial, in time order (got ${today})`);
check(scheduledOn(list, new Date(2026, 7, 24)).map((s) => s.templateName).join(',') === 'abs,Push', 'Monday: abs 7:10 then Push 5:35');
check(scheduledOn(null).length === 0, 'scheduledOn null-safe');

// screen invariants
check(!/numberOfLines/.test(screen), 'nothing truncates');
check(!/iconBubble|fitness-center/.test(screen), 'no icon bubble column');
check(!/editHint|>Edit</.test(screen), 'no Edit pill; whole row opens the editor');
check(/WEEK_LETTERS\[i\]/.test(screen) && /weekLoad\(scheduled, now\)/.test(screen), 'week bars + per-row day strip');
check(/sortByNext\(scheduled, now\)/.test(screen) && /whenLabel\(next, now\)/.test(screen), 'agenda order with Today / Tomorrow labels');
check(/navigation\.navigate\('ScheduleWorkout', \{ editingSchedule: s \}\)/.test(screen) && /deleteScheduledWorkout\(s\.id\)/.test(screen), 'edit + delete wiring kept');
check(!/[—]/.test(screen) && !/[—]/.test(src), 'no em dashes');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
