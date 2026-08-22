// Exercise library list invariants.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'ExercisesModal.js'), 'utf8');
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
check(/arr\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name\)\)/.test(src), 'items sorted alphabetically inside each letter');
check(/bodyParts\.map\(\(bp\)/.test(src) && /bp === 'Any Body Part' \? 'All' : bp/.test(src), 'body part chips with All');
check(/setHeaderH\(e\.nativeEvent\.layout\.height\)/.test(src) && /\{ top: headerH, backgroundColor: tileColor \}/.test(src), 'index strip anchored to the measured header');
const row = src.slice(src.indexOf('const renderExercise'), src.indexOf('const content = ('));
check(!/chevron-right/.test(row) && /backgroundColor: tileColor/.test(row), 'rows are tiles without chevrons');
check(/\[exercise\.bodyPart, exercise\.equipment\]\.filter\(Boolean\)\.join/.test(row), 'row meta shows body part and equipment');
check(/selectionMode \? \(/.test(row) && /styles\.addPill/.test(row), 'selection mode shows a solid add pill');
check(/marginRight: 40,/.test(src), 'rows stay clear of the index strip');
check(!/numberOfLines/.test(row), 'names never truncate');
check(/Pick an exercise/.test(src), 'selection title reads plainly');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
