// Schedule Workout editor: design invariants after the editorial pass.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'components');
const modal = fs.readFileSync(path.join(root, 'ScheduleWorkoutModal.js'), 'utf8');
const field = fs.readFileSync(path.join(root, 'DurationField.js'), 'utf8');
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

check(!/borderRadius: 22/.test(modal) && !/dayButton/.test(modal), 'no circular day buttons');
check(!/textTransform: 'uppercase'/.test(modal) && !/textTransform: 'uppercase'/.test(field), 'no caps-tracked section labels or hints');
check(!/typeButton\b/.test(modal) && /label: 'Repeats weekly'/.test(modal) && /label: 'One date'/.test(modal), 'schedule type is text tabs, not tinted cards');
check(/Every day/.test(modal) && /Weekdays/.test(modal) && /Weekends/.test(modal) && /sameDays\(q\.days\)/.test(modal), 'Every day / Weekdays / Weekends shortcuts');
check(/daysSentence/.test(modal) && /Repeats \$\{daysSorted/.test(modal), 'selected days read as a sentence');
check(!/numberOfLines/.test(modal), 'nothing truncates');
check(/Step 1 of 2/.test(modal) && /progressFill/.test(modal), 'step label + thin progress line');
check(/fmtHM\(time\.hour, time\.minute\)/.test(modal) && /bigValue/.test(modal) && /until \$\{fmtHM/.test(modal), 'step 2 shows the chosen time large with its end time');
check(/<StartTimePicker/.test(modal) && /<MultiDateCalendar/.test(modal) && /handleSave/.test(modal) && /repeatValid/.test(modal), 'start-time picker, calendar, save and validation wiring kept');
check(/Tap to set exactly/.test(field) && /chipLabel\(m\)/.test(field) && /\$\{m\} min/.test(field), 'duration: sentence-case hint, quick picks spelled out');
check(!/[—]/.test(modal) && !/[—]/.test(field), 'no em dashes');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
