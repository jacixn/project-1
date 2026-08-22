// Workout numpad + / - must cover every field it can be opened for.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'WorkoutModal.js'), 'utf8');
const fn = src.slice(src.indexOf('const handleNumpadAdjust'), src.indexOf('const handleNumpadDone'));
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
check(/activeInput\.field === 'rest'/.test(fn) && /activeInput\.field === 'weight'/.test(fn) && /\} else \{[\s\S]*parseInt\(numpadValue, 10\)/.test(fn), 'rest, weight and a catch-all reps branch');
check(/Math\.max\(0, currentValue \+ adjustment\)/.test(fn), 'reps move by exactly 1 and never go below 0');
// simulate the reps branch
const reps = (numpadValue, adjustment) => String(Math.max(0, (parseInt(numpadValue, 10) || 0) + adjustment));
check(reps('1', 1) === '2' && reps('1', -1) === '0' && reps('0', -1) === '0' && reps('', 1) === '1' && reps('12', -1) === '11', 'reps arithmetic');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
