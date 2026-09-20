// Repeating reminders can skip a single day (moved "just today").
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'services', 'reminderService.js'), 'utf8');
const m = /export const getRemindersForDay = ([\s\S]*?\n\});/.exec(src);
if (!m) { console.log('FAIL: getRemindersForDay not found'); process.exit(1); }
// It leans on two helpers now, because "which day of the week" stopped
// being enough once reminders could repeat fortnightly or monthly. Give it
// the REAL ones rather than stubs, so this test still exercises the
// shipping recurrence rules and not a copy of them.
const dm = /const dateFor = ([\s\S]*?\n\};)/.exec(src);
if (!dm) { console.log('FAIL: dateFor not found'); process.exit(1); }
const dateFor = new Function(`return (${dm[1].replace(/;$/, '')})`)();
const babel = require('@babel/core');
const recPath = path.join(__dirname, '..', 'utils', 'reminderRecurrence.js');
const recCode = babel.transformSync(fs.readFileSync(recPath, 'utf8'), {
  filename: recPath, presets: [require.resolve('babel-preset-expo')], babelrc: false, configFile: false,
}).code;
const recMod = { exports: {} };
new Function('module', 'exports', 'require', recCode)(recMod, recMod.exports, require);
const { occursOn } = recMod.exports;
const getRemindersForDay = new Function('dateFor', 'occursOn', `return (${m[1]})`)(dateFor, occursOn);
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const lunch = { id: 'l', title: 'eat lunch', enabled: true, type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], time: '14:00', skipDates: ['2026-08-23'] };
const copy = { id: 'c', title: 'eat lunch', enabled: true, type: 'one-time', date: '2026-08-23', time: '13:30', parentId: 'l' };
const sun = getRemindersForDay([lunch, copy], 0, '2026-08-23').map((r) => `${r.id}@${r.time}`);
check(sun.join() === 'c@13:30', `Sunday shows only the moved copy at 1:30 (${sun.join()})`);
const mon = getRemindersForDay([lunch, copy], 1, '2026-08-24').map((r) => `${r.id}@${r.time}`);
check(mon.join() === 'l@14:00', `Monday keeps the series at 2 PM (${mon.join()})`);
check(getRemindersForDay([lunch], 0).length === 1, 'no date given: series shows (back-compat)');
const lost = { ...lunch, skipDates: [] };
check(getRemindersForDay([lost, copy], 0, '2026-08-23').map((r) => r.id).join() === 'c', 'a day with a moved copy never shows the series, even if skipDates got lost');
check(getRemindersForDay([lost, copy], 1, '2026-08-24').map((r) => r.id).join() === 'l', 'other days untouched by the copy rule');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
