// Run: node src/utils/__tests__/sheetTop.selftest.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'sheetTop.js'), 'utf8').replace(/^export /gm, '');
const m = new Function(`${src}\nreturn { headerTopPadding };`)();

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const NOTCH = 59;

ok(m.headerTopPadding(NOTCH, 0) === NOTCH + 8,
  'a screen at the top of the window clears the notch itself');
ok(m.headerTopPadding(NOTCH, 150) === 8,
  'a screen inside a sheet does not, because the sheet already sits below the status bar');
ok(m.headerTopPadding(NOTCH, null) === NOTCH + 8,
  'before it has been measured it clears the notch, so the title is never under the clock');
ok(m.headerTopPadding(NOTCH, undefined) === NOTCH + 8, 'same when the measurement is missing');
ok(m.headerTopPadding(NOTCH, 0.5) === NOTCH + 8, 'a sub-pixel offset is still the top of the window');
ok(m.headerTopPadding(0, 0) === 8 && m.headerTopPadding(0, 150) === 8,
  'a phone with no notch gets the plain gap either way');
ok(m.headerTopPadding(NOTCH, 150, 20) === 20 && m.headerTopPadding(NOTCH, 0, 20) === NOTCH + 20,
  'the wanted gap is respected in both cases');
ok(m.headerTopPadding(undefined, 150) === 8 && m.headerTopPadding(null, 0) === 8,
  'a missing inset is treated as none, not as NaN');
ok(!Number.isNaN(m.headerTopPadding('x', 'y')), 'rubbish in does not produce NaN padding');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll sheetTop selftests passed');
