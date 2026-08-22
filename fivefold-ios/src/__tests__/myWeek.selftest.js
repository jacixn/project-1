// My Week: agenda maths + wiring.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const src = read('utils/dayItems.js');
// strip native imports; keep the pure part
const pure = src.split('\n').filter((l) => !/^import /.test(l)).join('\n')
  .replace(/export const (\w+) =/g, 'const $1 = exports.$1 =');
const mod = {};
new Function('exports', 'minutesOf', 'dateKeyOf', pure)(mod, () => 0, () => '');
const { buildAgenda, countByKind, busyMinutes, daySummary, weekOf, patternOf, moveScope, fmtClock, minToTime } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

const it = (kind, s, e, extra = {}) => ({ id: `${kind}:${s}`, kind, title: kind, startMin: s, endMin: e, movable: ['prayer', 'reminder', 'gym'].includes(kind), raw: {}, ...extra });
const day = [it('prayer', 430, 435), it('reminder', 490, 510), it('gym', 1055, 1160), it('eyecandy', 1200, 1320), it('calendar', 540, 600)];
const rows = buildAgenda(day);
check(rows.map((r) => r.type[0]).join('') === 'ififififif', `free stretches between items and after the last, none before the first (${rows.map((r) => r.type[0]).join('')})`);
check(rows[1].label === '55 min free' && rows[3].label === '30 min free' && rows[5].label === '7 hr 35 min free' && rows[9].label === '1 hr free', 'gap labels in plain words');
check(countByKind(day).eyecandy === 1 && countByKind(day).calendar === 1 && countByKind(day).prayer === 1, 'counts per kind');
const K = mod.KINDS;
check([K.prayer, K.reminder, K.gym].every((k) => /^#(34C759|30D158|4CD964)$/.test(k.color)) && K.eyecandy.color === '#7C5CFF' && K.eyecandySports.color === '#FF9500', 'colours by source: Biblely greens, EyeCandy purple, EyeCandy sports orange');
check(/isSports \? 'eyecandySports' : isEyeCandy \? 'eyecandy' : 'calendar'/.test(src) && /kind === 'calendar' \? \(cal\.color \|\| KINDS\.calendar\.color\) : KINDS\[kind\]\.color/.test(src), 'EyeCandy calendars take the source colour; other calendars keep their own, like iOS');
check(busyMinutes([it('a', 0, 60), it('b', 30, 90), it('c', 200, 230)]) === 120, 'overlaps do not double count busy minutes');
check(daySummary(day) === '5 things  ·  5 hr 10 min busy  ·  first at 7:10 AM', `day summary (${daySummary(day)})`);
check(daySummary([]) === 'Nothing scheduled', 'empty summary');
const w = weekOf(new Date(2026, 7, 22)); // Saturday
check(w[0].getDay() === 1 && w[0].getDate() === 17 && w[6].getDate() === 23, 'Monday-first week around a Saturday');
check(patternOf({ type: 'recurring', days: [1, 5] }) === 'Mon, Fri' && patternOf({ days: [0, 1, 2, 3, 4, 5, 6] }) === 'every day' && patternOf({ type: 'one-time' }) === 'one-time', 'pattern words');
check(moveScope(it('prayer', 0, 5, { raw: { type: 'one-time' } })) === 'Only this one' && /Every day at the new time/.test(moveScope(it('gym', 0, 5, { raw: { days: [0,1,2,3,4,5,6] } }))) && moveScope(it('eyecandy', 0, 5)) === null, 'move scope wording');
check(fmtClock(430) === '7:10 AM' && minToTime(430) === '07:10', 'clock helpers');

const screen = read('screens/MyWeekScreen.js');
check(/loadDayItems\(d\)/.test(screen) && /week\.map/.test(screen) && /KIND_ORDER\.filter/.test(screen), 'week strip loads all 7 days with per-kind dots');
check(/it\.movable \? startMove\(it\) : explainExternal\(it\)/.test(screen), 'movable items open Move; others explain where to change them');
check(/NUDGES\.map/.test(screen) && /computeDayFlow\(\{ events: dayList/.test(screen) && /freeSlots\.map/.test(screen) && /<DateTimePicker/.test(screen) && /Set an exact time/.test(screen) && /styles\.backdrop/.test(screen) && /styles\.panelSurface/.test(screen) && /moving\.raw\?\.type === 'one-time'/.test(screen), 'move panel: nudges, free-time chips, explicit exact-time button with inline wheel, dimmed backdrop, own surface, another day for one-time items');
check(/moveItem\(moving, \{ time: minToTime\(draftMin\), date: draftDate \}\)/.test(screen), 'save goes through rescheduleItem');
check(/'eyecandy:\/\/'/.test(screen) && /'calshow:'/.test(screen), 'external items can open EyeCandy or Calendar');
check((screen.match(/numberOfLines/g) || []).length === 1 && /numberOfLines=\{titleLines\}/.test(screen) && !/[—]/.test(screen) && !/[—]/.test(src), 'no truncation except a host title above a nested block (iOS rule), no em dashes');
const move = read('services/rescheduleItem.js');
check(/updatePrayer\(raw\.id/.test(move) && /updateReminder\(raw\.id/.test(move) && /updateScheduledWorkout\(raw\.id/.test(move) && /scheduleWorkoutNotifications\(fresh\)/.test(move), 'moves go through each owner service; workout alerts rescheduled');
check(/name="MyWeek"[\s\S]{0,200}animation: 'slide_from_right'/.test(read('navigation/RootNavigator.js')) && !/presentation: '(modal|fullScreenModal)'[^\n]*\n[^\n]*\n?[^\n]*MyWeek/.test(read('navigation/RootNavigator.js')) && /name="arrow-back"/.test(screen) && !/SheetHeader/.test(screen), 'MyWeek is a normal stack push like Habits, with the tile back button');
for (const f of ['screens/BiblePrayerTab.js', 'screens/TodosTab.js', 'screens/GymTab.js', 'components/RemindersScreen.js']) {
  check(/navigation\.navigate\('MyWeek'\)/.test(read(f)) && /calendar-month/.test(read(f)), `${f}: calendar button opens My Week`);
}
check(/scheduleWorkoutNotifications\(schedule\)/.test(read('components/ScheduleWorkoutModal.js')) && /export const scheduleWorkoutNotifications/.test(read('services/workoutSchedule.js')), 'workout notifications extracted to a service');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
