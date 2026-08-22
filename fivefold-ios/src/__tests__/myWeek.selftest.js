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
check(/Gesture\.Pan\(\)[\s\S]{0,80}activeOffsetX\(\[-14, 14\]\)/.test(screen) && /goWeek\(1\)/.test(screen) && /goWeek\(-1\)/.test(screen) && /withSpring\(0/.test(screen) && !/styles\.weekNav/.test(screen) && /\.slice\(0, 4\)/.test(screen), 'week strip swipes between weeks with a slide/spring, no chevron tiles, dots capped at four');
check(/it\.movable \? startMove\(it\) : explainExternal\(it\)/.test(screen), 'movable items open Move; others explain where to change them');
check(/NUDGES\.map/.test(screen) && /computeDayFlow\(\{ events: dayList/.test(screen) && /freeSlots\.map/.test(screen) && /<DateTimePicker/.test(screen) && /Set an exact time/.test(screen) && /styles\.backdrop/.test(screen) && /styles\.panelSurface/.test(screen) && /moving\.raw\?\.type === 'one-time'/.test(screen), 'move panel: nudges, free-time chips, explicit exact-time button with inline wheel, dimmed backdrop, own surface, another day for one-time items');
check(/moveItem\(moving, \{ time: minToTime\(draftMin\), date: draftDate \}\)/.test(screen), 'save goes through rescheduleItem');
check(/Linking\.openURL\('calshow:'\)/.test(screen) && /explainExternal/.test(screen) && /it\.movable \? startMove\(it\) : explainExternal\(it\)/.test(screen), 'read-only calendar items explain themselves and can open Calendar; everything movable opens the move panel');
check((screen.match(/numberOfLines/g) || []).length === 1 && /numberOfLines=\{titleLines\}/.test(screen) && !/[—]/.test(screen) && !/[—]/.test(src), 'no truncation except a host title above a nested block (iOS rule), no em dashes');
const move = read('services/rescheduleItem.js');
check(/updatePrayer\(raw\.id/.test(move) && /updateReminder\(raw\.id/.test(move) && /updateScheduledWorkout\(raw\.id/.test(move) && /scheduleWorkoutNotifications\(fresh\)/.test(move), 'moves go through each owner service; workout alerts rescheduled');
check(/name="MyWeek"[\s\S]{0,200}animation: 'slide_from_right'/.test(read('navigation/RootNavigator.js')) && !/presentation: '(modal|fullScreenModal)'[^\n]*\n[^\n]*\n?[^\n]*MyWeek/.test(read('navigation/RootNavigator.js')) && /name="arrow-back"/.test(screen) && !/SheetHeader/.test(screen), 'MyWeek is a normal stack push like Habits, with the tile back button');
for (const f of ['screens/BiblePrayerTab.js', 'screens/TodosTab.js', 'screens/GymTab.js', 'components/RemindersScreen.js']) {
  check(/navigation\.navigate\('MyWeek'\)/.test(read(f)) && /calendar-month/.test(read(f)), `${f}: calendar button opens My Week`);
}
check(/scheduleWorkoutNotifications\(schedule\)/.test(read('components/ScheduleWorkoutModal.js')) && /export const scheduleWorkoutNotifications/.test(read('services/workoutSchedule.js')), 'workout notifications extracted to a service');

// ---- calendar-sourced items are movable too ------------------------------
const resrc = read('services/rescheduleItem.js');
const repure = resrc.split('\n').filter((l) => !/^import /.test(l) && !/^export default /.test(l)).join('\n')
  .replace(/export const (\w+) =/g, 'const $1 = exports.$1 =');
const re = {};
new Function('exports', 'Calendar', 'DeviceEventEmitter', 'updatePrayer', 'updateReminder', 'WorkoutService', 'scheduleWorkoutNotifications', repure)(re, {}, {}, null, null, {}, null);
const { calendarMoveDates, calendarMoveOptions, calendarMoveDetails } = re;
const local = (y, mo, d, h, m) => new Date(y, mo - 1, d, h, m, 0, 0);
const ev = { calendar: true, eventId: 'E1', startDate: local(2026, 8, 24, 20, 0).toISOString(), endDate: local(2026, 8, 24, 21, 0).toISOString(), recurring: false, type: 'one-time' };
let md = calendarMoveDates(ev, { time: '21:30' });
check(md.startDate.getTime() === local(2026, 8, 24, 21, 30).getTime() && md.endDate.getTime() === local(2026, 8, 24, 22, 30).getTime(), 'calendar move keeps the event length');
md = calendarMoveDates(ev, { time: '09:00', date: '2026-08-26' });
check(md.startDate.getTime() === local(2026, 8, 26, 9, 0).getTime() && md.endDate.getTime() === local(2026, 8, 26, 10, 0).getTime(), 'one-time calendar event can change day');
md = calendarMoveDates({ ...ev, recurring: true, type: 'recurring' }, { time: '19:00', date: '2026-08-26' });
check(md.startDate.getTime() === local(2026, 8, 24, 19, 0).getTime(), 'repeating event ignores a day change, only the time moves');
check(calendarMoveOptions('eyecandy', ev) === undefined, 'one-time: plain update');
check(JSON.stringify(calendarMoveOptions('eyecandy', { ...ev, recurring: true })) === '{"futureEvents":true}', 'EyeCandy weekly slot: whole series moves (one rule in EyeCandy)');
const co = calendarMoveOptions('calendar', { ...ev, recurring: true });
check(co && co.futureEvents === false && co.instanceStartDate instanceof Date && co.instanceStartDate.getTime() === local(2026, 8, 24, 20, 0).getTime(), 'other calendars: this occurrence only');
const readEv = { title: 'Love Next Door', notes: 'Added by EyeCandy', alarms: [{ relativeOffset: -10 }], allDay: false, availability: 'busy', timeZone: 'Europe/London', recurrenceRule: { frequency: 'weekly', interval: 1 }, location: '', url: null };
const dd = calendarMoveDetails(readEv, { startDate: local(2026, 8, 24, 21, 0), endDate: local(2026, 8, 24, 22, 0) }, false);
check(dd.title === 'Love Next Door' && dd.notes === 'Added by EyeCandy' && dd.alarms[0].relativeOffset === -10 && dd.allDay === false && dd.availability === 'busy' && dd.timeZone === 'Europe/London' && !('recurrenceRule' in dd) && !('location' in dd) && !('url' in dd) && dd.startDate.getHours() === 21, 'full details carried across so the native update does not blank title/notes/alarms; rule untouched for single moves');
check('recurrenceRule' in calendarMoveDetails(readEv, dd, true) && calendarMoveDetails(readEv, dd, true).recurrenceRule.frequency === 'weekly', 'series move re-sends the weekly rule');
check(JSON.stringify(calendarMoveDetails(null, { startDate: 1, endDate: 2 }, false)) === '{"title":"","alarms":[],"allDay":false,"startDate":1,"endDate":2}', 'missing event read degrades safely');
check(/Calendar\.getEventAsync\(raw\.eventId/.test(resrc) && /calendarMoveDetails\(ev, dates, series\)/.test(resrc) && /Calendar\.updateEventAsync\(raw\.eventId, details, options\)/.test(resrc) && /no longer in your Calendar/.test(resrc), 'moveItem reads the event, then writes full details through expo-calendar');
check(/movable: !!cal\.allowsModifications/.test(src) && /recurring: !!e\.recurrenceRule/.test(src) && /type: e\.recurrenceRule \? 'recurring' : 'one-time'/.test(src) && /startDate: s\.toISOString\(\)/.test(src), 'writable calendars are movable; raw carries event id, dates and repeat flag');
const ecItem = { kind: 'eyecandy', movable: true, raw: { calendar: true, recurring: false, calendarTitle: 'EyeCandy' } };
check(moveScope(ecItem) === 'Only this one. EyeCandy picks it up when you next open it.', `EyeCandy one-time scope (${moveScope(ecItem)})`);
check(moveScope({ ...ecItem, raw: { ...ecItem.raw, recurring: true } }) === 'Every week at the new time. EyeCandy picks it up when you next open it.', 'EyeCandy weekly scope');
check(moveScope({ kind: 'calendar', movable: true, raw: { calendar: true, recurring: true, calendarTitle: 'Work' } }) === 'Only this one, not the repeats. Changes it in your Work calendar.', 'other calendar scope names the calendar');
check(!/Move it in EyeCandy/.test(screen) && /read-only on this iPhone/.test(screen) && !/'eyecandy:\/\/'/.test(screen), 'no more "open EyeCandy" detour; only read-only calendars explain themselves');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
