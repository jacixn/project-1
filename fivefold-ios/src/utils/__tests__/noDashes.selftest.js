// Run: node src/utils/__tests__/noDashes.selftest.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'noDashes.js'), 'utf8').replace(/^export /gm, '');
const m = new Function(`${src}\nreturn { deDash, hasDash, DASHES };`)();

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const EM = '—';

ok(m.deDash(`Starting point of the story ${EM} God's call launched it`) === "Starting point of the story. God's call launched it",
  'a dash before a new sentence becomes a full stop');
ok(m.deDash(`a burial site for Sarah ${EM} the first piece of the land`) === 'a burial site for Sarah, the first piece of the land',
  'a dash before an expansion becomes a comma');
ok(m.deDash(`Abraham, Sarah and Leah ${EM} and David's first capital`) === "Abraham, Sarah and Leah, and David's first capital",
  'a dash before "and" becomes a comma, never a full stop');
ok(!m.deDash(`ten plagues ${EM} blood, frogs, hail ${EM} before Pharaoh relented`).includes(EM),
  'a parenthetical pair is cleared too');
ok(m.deDash(`the hills ${EM} where fire burned`) === 'the hills, where fire burned', 'spacing around the dash is absorbed');
ok(m.deDash(`no spaces${EM}here`) === 'no spaces, here', 'a dash with no spaces still goes');
ok(m.deDash('an en dash – like this') === 'an en dash, like this', 'en dashes go as well');
ok(m.deDash('a double hyphen -- like this') === 'a double hyphen, like this', 'and a double hyphen');

ok(m.deDash('nothing to do here') === 'nothing to do here', 'text without a dash is returned untouched');
ok(m.deDash('') === '' && m.deDash(null) === null && m.deDash(undefined) === undefined, 'empty and missing input are safe');
ok(m.deDash('hyphenated words like well-known stay') === 'hyphenated words like well-known stay', 'ordinary hyphens are left alone');
ok(m.deDash('Genesis 12:1-3 stays') === 'Genesis 12:1-3 stays', 'scripture ranges are left alone');

ok(m.hasDash(`a ${EM} b`) && m.hasDash('a – b') && !m.hasDash('a - b') && !m.hasDash('well-known'),
  'the detector finds dashes and ignores hyphens');
ok(m.DASHES.length === 3, 'the dash characters are listed for other tests to use');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll noDashes selftests passed');
