// "Today's Verses" rotation rules + wiring. Run: node src/__tests__/prayerVerses.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'utils', 'prayerVerses.js'), 'utf8');
const svc = fs.readFileSync(path.join(root, 'services', 'simplePrayersService.js'), 'utf8');
const card = fs.readFileSync(path.join(root, 'components', 'SimplePrayerCard.js'), 'utf8');
const sync = fs.readFileSync(path.join(root, 'services', 'userSyncService.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 ='))(mod);
const { dayKey, versesStale, applyVerses, mergePrayerFromCloud, isPlaceholderVerse } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

const today = dayKey(new Date(2026, 7, 22));
const v = (ref) => ({ id: 1, reference: ref, text: 'text' });
const yesterday = { id: 'a', type: 'persistent', verses: [v('Psalm 92:14'), v('John 3:16')], versesDate: '2026-08-21', versesAt: '2026-08-21T07:00:00.000Z' };
check(versesStale(yesterday, today) === true, "yesterday's verses are stale today");
check(versesStale({ ...yesterday, versesDate: today }, today) === false, "today's verses are not stale");
check(versesStale({ id: 'b', type: 'persistent', verses: [v('Psalm 1:1'), v('Psalm 1:2')] }, today) === true, 'verses with no date (pre-fix prayers) are stale');
check(versesStale({ id: 'c', type: 'persistent', verses: [{ reference: 'Loading...', text: 'Selecting your verses...' }, v('Psalm 1:2')], versesDate: today }, today) === true, 'placeholder verses are stale even if stamped today');
check(versesStale({ id: 'd', type: 'one-time', verses: [v('Psalm 1:1'), v('Psalm 1:2')], versesDate: '2026-01-01' }, today) === false, 'one-time prayers keep their verses');
check(versesStale(null) === false, 'null safe');
const applied = applyVerses(yesterday, [v('Romans 8:28'), v('Isaiah 41:10')], new Date(2026, 7, 22, 9, 0));
check(applied.versesDate === today && applied.verses[0].reference === 'Romans 8:28' && typeof applied.versesAt === 'string', 'applyVerses stamps the day and time');
check(isPlaceholderVerse({ reference: 'Loading...' }) && !isPlaceholderVerse(v('John 1:1')), 'placeholder detection');

const cloud = { id: 'a', name: 'x', verses: [v('Psalm 92:14'), v('John 3:16')], versesAt: '2026-08-21T07:00:00.000Z', versesDate: '2026-08-21' };
const local = { id: 'a', name: 'x', verses: [v('Romans 8:28'), v('Isaiah 41:10')], versesAt: '2026-08-22T07:00:00.000Z', versesDate: today };
check(mergePrayerFromCloud(cloud, local).verses[0].reference === 'Romans 8:28', "newer local verses survive a cloud pull");
check(mergePrayerFromCloud(local, cloud).verses[0].reference === 'Romans 8:28', 'newer cloud verses win when cloud is newer');
check(mergePrayerFromCloud(cloud, null) === cloud && mergePrayerFromCloud(cloud, { id: 'a' }) === cloud, 'missing local -> cloud');
check(mergePrayerFromCloud({ ...cloud, versesAt: undefined }, local).verses[0].reference === 'Romans 8:28', 'cloud without a stamp never overwrites stamped local verses');

check(/export const refreshDailyVerses = async/.test(svc) && /versesStale\(p, today\)/.test(svc) && /applyVerses\(q, verses\)/.test(svc), 'service refreshes stale verses');
check(/slice\(-200\)/.test(svc), 'no-repeat window widened to 200');
check(/applyVerses\(stored\[idx\], randomVerses\)/.test(svc), 'new prayers get stamped verses');
check(/refreshDailyVerses\(\)\.catch/.test(card) && (card.match(/refreshDailyVerses\(\)\.catch/g) || []).length >= 3, 'card refreshes on mount, midnight and foreground');
check(/AppState\.addEventListener\('change'/.test(card), 'foreground listener present');
check(/applyVerses\(prayersToUpdate\[prayerIndex\], randomVerses\)/.test(card), 'post-completion verses are stamped');
check(/mergePrayerFromCloud\(cloudPrayer, localById\[cloudPrayer\.id\]\)/.test(sync), 'cloud merge keeps newer local verses');
check(!/[—]/.test(src), 'no em dashes');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
