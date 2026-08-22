// Repeating reminders can skip a single day (moved "just today").
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'services', 'reminderService.js'), 'utf8');
const m = /export const getRemindersForDay = ([\s\S]*?\n\});/.exec(src);
if (!m) { console.log('FAIL: getRemindersForDay not found'); process.exit(1); }
const getRemindersForDay = new Function(`return (${m[1]})`)();
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const lunch = { id: 'l', title: 'eat lunch', enabled: true, type: 'recurring', days: [0, 1, 2, 3, 4, 5, 6], time: '14:00', skipDates: ['2026-08-23'] };
const copy = { id: 'c', title: 'eat lunch', enabled: true, type: 'one-time', date: '2026-08-23', time: '13:30', parentId: 'l' };
const sun = getRemindersForDay([lunch, copy], 0, '2026-08-23').map((r) => `${r.id}@${r.time}`);
check(sun.join() === 'c@13:30', `Sunday shows only the moved copy at 1:30 (${sun.join()})`);
const mon = getRemindersForDay([lunch, copy], 1, '2026-08-24').map((r) => `${r.id}@${r.time}`);
check(mon.join() === 'l@14:00', `Monday keeps the series at 2 PM (${mon.join()})`);
check(getRemindersForDay([lunch], 0).length === 1, 'no date given: series shows (back-compat)');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
