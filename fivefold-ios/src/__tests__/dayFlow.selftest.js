// Day-flow maths + StartTimePicker invariants. Run: node src/__tests__/dayFlow.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'utils', 'dayFlow.js'), 'utf8');
const busySrc = fs.readFileSync(path.join(root, 'utils', 'dayBusy.js'), 'utf8');
const picker = fs.readFileSync(path.join(root, 'components', 'StartTimePicker.js'), 'utf8');
const timeline = fs.readFileSync(path.join(root, 'components', 'DayTimeline.js'), 'utf8');
const modal = fs.readFileSync(path.join(root, 'components', 'ScheduleWorkoutModal.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 =').replace(/export function (\w+)/g, 'function $1') + '\nexports.computeDayFlow = computeDayFlow;')(mod);
const { computeDayFlow, mergeClusters, clashFor, fmtFlowTime } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// The screenshot day: abs 7:10-8:10, breakfast 8:10-8:30, 1st prayer 8:25-8:30, 2nd prayer 11:00-11:05, lunch 13:00-14:00
const day = [
  { title: 'Eat breakfast', startMin: 490, endMin: 510 },
  { title: '1st Prayer', startMin: 505, endMin: 510 },
  { title: '2nd Prayer', startMin: 660, endMin: 665 },
  { title: 'Lunch', startMin: 780, endMin: 840 },
];
const rows = computeDayFlow({ events: day, durationMinutes: 60 });
const types = rows.map((r) => r.type[0]).join('');
check(types === 'fbfbfbf', `rows alternate free/busy (${types})`);
check(rows[0].rangeLabel === '5 AM to 8:10 AM' && rows[0].fits && rows[0].fitLabel === 'Free, fits your 1 hr', `first gap reads plainly (${rows[0].rangeLabel} / ${rows[0].fitLabel})`);
check(rows[1].label === 'Eat breakfast and 1st Prayer' && rows[1].rangeLabel === '8:10 AM to 8:30 AM', `overlapping breakfast + prayer merge into one busy bar (${rows[1].label})`);
check(rows[2].fits && rows[2].startMin === 510 && rows[2].endMin === 660, 'gap between breakfast and 2nd prayer fits');
check(rows[3].type === 'busy' && rows[3].label === '2nd Prayer', '5-min prayer stays visible as busy');
check(rows[4].fits && rows[4].startMin === 665, 'after the prayer the gap resumes at 11:05');
check(rows[6].type === 'free' && rows[6].fits && rows[6].endMin === 23 * 60, 'evening gap runs to 11 PM');

// too short + forcible: 7:00-7:20 free, 7:20-7:25 tiny prayer, then free until 9:00 lunch
const tight = [{ title: 'Prayer', startMin: 440, endMin: 445 }, { title: 'Lunch', startMin: 540, endMin: 600 }];
const r2 = computeDayFlow({ events: tight, durationMinutes: 60, isToday: true, nowMin: 415 });
check(r2[0].type === 'free' && !r2[0].fits && r2[0].forcible && r2[0].forceSpan === 540 - 420 && /Hold to use anyway/.test(r2[0].fitLabel), `too-short gap before a tiny prayer is forcible (${r2[0].fitLabel})`);
check(r2[0].startMin === 420, 'today: the past is cut and the window starts 5 min ahead, rounded');
const r3 = computeDayFlow({ events: [{ title: 'Work', startMin: 540, endMin: 1020 }], durationMinutes: 90 });
check(r3[0].fits && r3[1].type === 'busy' && r3[2].fits && r3[2].startMin === 1020, 'a long block splits the day cleanly');
check(computeDayFlow({ events: [], durationMinutes: 60, isToday: true, nowMin: 23 * 60 }).length === 0, 'nothing left today -> no rows');
check(computeDayFlow({ events: [], durationMinutes: 45 })[0].fitLabel === 'Free, fits your 45 min', 'empty day is one big free row');

check(clashFor(500, 60, day) === 'Overlaps Eat breakfast and 1st Prayer', `clash sentence (${clashFor(500, 60, day)})`);
check(clashFor(600, 30, day) === null, 'no clash when clear');
check(clashFor(480, 400, day) === 'Overlaps Eat breakfast, 1st Prayer and 2 more', `many clashes summarise (${clashFor(480, 400, day)})`);
check(mergeClusters([{ title: 'a', startMin: 0, endMin: 10 }, { title: 'b', startMin: 10, endMin: 20 }]).length === 1, 'touching intervals merge');
check(fmtFlowTime(0) === '12 AM' && fmtFlowTime(12 * 60 + 5) === '12:05 PM', 'time wording');

// dayBusy
check(/c\.title !== BIBLELY_CAL/.test(busySrc) && /getPrayers\(\)/.test(busySrc) && /getRemindersForDay\(/.test(busySrc) && /getScheduledWorkouts\(\)/.test(busySrc), 'busy list = app prayers + reminders + workouts + other calendars, never the Biblely mirror');
check(/String\(s\.id\) === String\(excludeGymId\)/.test(busySrc), 'the workout being edited is excluded');

// picker + timeline + modal
check(!/TIME_PRESETS|Quick pick|DayTimeline|Back to free times/.test(picker) && /Set an exact time/.test(picker), 'no quick picks, no drag timeline; free-time list plus exact wheel');
check(/hapticFeedback\.error\(\); shake\(\)/.test(picker) && /onLongPress=\{longPress\}/.test(picker), 'too-short gaps refuse with haptic + shake; hold forces past tiny blockers');
check(/clashFor\(selMin, durationMinutes, busy\)/.test(picker), 'picker warns about overlaps for the chosen time');
check(!/numberOfLines/.test(picker), 'nothing truncates');
check(/extraEvents = null, exclude = null/.test(timeline) && /withExtras\(timed\)/.test(timeline) && /\[dayKey, extraKey, excludeKey\]/.test(timeline), 'timeline merges app items and drops the edited one');
check(/<StartTimePicker/.test(modal) && /excludeGymId=\{editingSchedule\?\.id \?\? null\}/.test(modal) && /excludeEvent=\{editingSchedule \?/.test(modal), 'modal step 2 uses the picker with the edited schedule excluded');
check(!/[—]/.test(src) && !/[—]/.test(busySrc) && !/[—]/.test(picker), 'no em dashes');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
