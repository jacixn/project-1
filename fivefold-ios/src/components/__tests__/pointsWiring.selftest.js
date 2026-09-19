// Every place a completion can be ticked must pay through the one service, so
// a day-template block pays like a reminder and nothing pays twice.
// Run: node src/components/__tests__/pointsWiring.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const screen = read('components/RemindersScreen.js');
const card = read('components/RemindersCard.js');
const tab = read('screens/TodosTab.js');
const svc = read('services/pointsService.js');

// The reported bug: the block branch returned before any award.
ok(/if \(done\) await award\(blockKey\(reminder\.blockId, dateStr\), /.test(screen),
  'the reminders screen pays for a day-template block, which is the bug that was reported');
ok(/await award\(reminderKey\(reminder\.id, dateStr\)/.test(screen),
  'and still pays for a plain reminder');
ok(!/const pts = 10 \+ Math\.floor\(Math\.random\(\) \* 11\)/.test(screen) && !/const pts = 10 \+ Math\.floor\(Math\.random\(\) \* 11\)/.test(card),
  'neither surface rolls its own points any more');
ok(!/const awardPoints = useCallback/.test(screen),
  'the reminders screen no longer keeps a private copy of the award logic');

// Both surfaces can tick the same row, so both must go through the ledger.
ok(/awardOnce\(key\)/.test(card) && /blockKey\(reminder\.blockId, dateStr\)/.test(card),
  'the Focus card pays through the same record, so the two screens cannot both pay');
ok(/onPointsEarned\?\.\(pts, \{ persisted: true \}\)/.test(card) && /persisted = false/.test(tab),
  'and the Focus tab only refreshes the display for an award already written');

// What the service itself must guarantee.
ok(/const rawLedger = await userStorage\.getRaw\(LEDGER_KEY\)/.test(svc) && /if \(ledger\[key\]\) return 0;/.test(svc),
  'an award is recorded and checked, so one tick pays once');
ok(/let chain = Promise\.resolve\(\)/.test(svc) && /serialise/.test(svc),
  'awards are serialised, so two completions at once do not lose one');
ok(/addSeasonalPoints\(points\)/.test(svc) && /setDoc\(/.test(svc) && /setRaw\('total_points'/.test(svc),
  'an award reaches the season, the cloud and both local totals');
// Look at the code, not the prose: the file explains why there is no refund,
// so matching the word would match the explanation.
const code = svc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/export const revoke|oldTotal - |newTotal - |-= *points/.test(code),
  'undoing does not refund: the profile reads the maximum across stores, so a subtraction would be ignored anyway');
ok(!/[\u{1F300}-\u{1FAFF}]/u.test(svc + screen.slice(0, 4000)) , 'no emojis');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll points wiring checks passed');
