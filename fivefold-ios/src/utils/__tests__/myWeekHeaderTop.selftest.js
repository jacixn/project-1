// My Week is pushed, so it is full screen from a tab header and inside a
// sheet when opened from one. The header must clear the notch in the first
// case and must not leave a dead band in the second.
// Run: node src/utils/__tests__/myWeekHeaderTop.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const screen = fs.readFileSync(path.join(root, 'screens', 'MyWeekScreen.js'), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

ok(/import \{ headerTopPadding \} from '\.\.\/utils\/sheetTop'/.test(screen), 'the header clearance comes from the tested rule');
ok(!/paddingTop: insets\.top \+ 8/.test(screen),
  'the header no longer adds the notch unconditionally, which is what left the dead band inside a sheet');
ok(/paddingTop: headerTopPadding\(insets\.top, containerTop\)/.test(screen), 'it asks the rule instead');
ok(/rootRef\.current\?\.measureInWindow/.test(screen) && /ref=\{rootRef\} onLayout=\{measureTop\}/.test(screen),
  'and the screen measures where it actually sits, since the navigator does not say');
ok(/const \[containerTop, setContainerTop\] = useState\(null\)/.test(screen), 'starting unmeasured');

// Hooks must run on every render.
const lines = screen.split('\n');
const insetsAt = lines.findIndex((l) => l.includes('const insets = useSafeAreaInsets();'));
let compAt = -1;
for (let i = insetsAt; i >= 0; i--) { if (/^const [A-Z]\w*\s*=\s*\(/.test(lines[i]) || /^function [A-Z]\w*/.test(lines[i])) { compAt = i; break; } }
const earlyReturns = lines.slice(compAt, insetsAt).filter((l) => /^\s{2}if \(.*\)\s*(return|\{)/.test(l));
ok(insetsAt > 0 && earlyReturns.length === 0, 'the new hooks sit above any early return, so hook order cannot change');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll My Week header checks passed');
