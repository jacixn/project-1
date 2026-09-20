// Reminders every two weeks, and every month.
// Run: node src/__tests__/reminderRecurrence.selftest.js
//
// Reminders were weekly and only weekly: a set of weekdays, every week,
// forever. The rules live in one pure module now, and this runs that exact
// module rather than a description of it.

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');
const rel = 'utils/reminderRecurrence.js';
const code = babel.transformSync(fs.readFileSync(path.join(root, rel), 'utf8'), {
  filename: path.join(root, rel),
  presets: [require.resolve('babel-preset-expo')],
  babelrc: false, configFile: false,
}).code;
const mod = { exports: {} };
new Function('module', 'exports', 'require', code)(mod, mod.exports, require);
const { repeatOf, occursOn, nextOccurrences, weekIndex, dateKey, horizonFor } = mod.exports;

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };
const D = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0, 0);

console.log('\nEvery reminder that already exists keeps behaving exactly as it did');
{
  // Not one saved reminder has a `repeat` field. Every one of them must
  // stay weekly, or the upgrade silently rewrites the user's schedule.
  const legacy = { days: [2], time: '09:00', enabled: true };
  ok(repeatOf(legacy) === 'weekly', 'no repeat field means weekly');
  ok(repeatOf({ repeat: 'nonsense' }) === 'weekly', 'and so does a value nobody recognises');
  ok(repeatOf(null) === 'weekly', 'and so does nothing at all');
  ok(occursOn(legacy, D(2026, 9, 22)) === true, 'a Tuesday reminder fires this Tuesday');
  ok(occursOn(legacy, D(2026, 9, 29)) === true, 'and the next one');
  ok(occursOn(legacy, D(2026, 9, 23)) === false, 'and not on the Wednesday');
}

console.log('\nEvery two weeks');
{
  // Anchored to Tuesday 22 Sep 2026. On weeks: 22 Sep, 6 Oct, 20 Oct.
  const r = { repeat: 'biweekly', days: [2], anchor: '2026-09-22', time: '09:00' };
  ok(occursOn(r, D(2026, 9, 22)) === true, 'fires on the anchor week');
  ok(occursOn(r, D(2026, 9, 29)) === false, 'skips the week after');
  ok(occursOn(r, D(2026, 10, 6)) === true, 'fires the week after that');
  ok(occursOn(r, D(2026, 10, 13)) === false, 'and skips again');
  ok(occursOn(r, D(2026, 10, 20)) === true, 'and keeps alternating');
  ok(occursOn(r, D(2026, 9, 23)) === false, 'still only on the chosen weekday');

  // Before the anchor, the parity has to hold going backwards too, or a
  // reminder looked at in a past week shows on the wrong days.
  ok(occursOn(r, D(2026, 9, 8)) === true, 'two weeks before the anchor is an on week');
  ok(occursOn(r, D(2026, 9, 15)) === false, 'one week before is not');

  // More than one weekday in a fortnightly series: both land in the same
  // on week, rather than alternating between themselves.
  const two = { repeat: 'biweekly', days: [1, 4], anchor: '2026-09-21' };
  ok(occursOn(two, D(2026, 9, 21)) === true && occursOn(two, D(2026, 9, 24)) === true,
    'Monday and Thursday both fire in the on week');
  ok(occursOn(two, D(2026, 9, 28)) === false && occursOn(two, D(2026, 10, 1)) === false,
    'and both are quiet the week after');
}

console.log('\nThe fortnight does not drift across daylight saving');
{
  // The clocks change on 25 Oct 2026 in the UK and 1 Nov in the US. A week
  // index worked out by dividing milliseconds gains or loses an hour here
  // and lands in the wrong week, which would make a fortnightly reminder
  // skip or double exactly once a year.
  const r = { repeat: 'biweekly', days: [0], anchor: '2026-10-11' };
  const sundays = ['2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01', '2026-11-08', '2026-11-15'];
  const got = sundays.map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return occursOn(r, D(y, m, d)) ? 'on' : 'off';
  }).join(',');
  ok(got === 'on,off,on,off,on,off', `alternation survives the clock change (${got})`);
  ok(weekIndex(D(2026, 10, 25)) - weekIndex(D(2026, 10, 18)) === 1, 'the week either side of the change is one apart');
}

console.log('\nEvery month');
{
  const r = { repeat: 'monthly', monthDay: 3, time: '09:00' };
  ok(occursOn(r, D(2026, 9, 3)) === true, 'fires on the 3rd');
  ok(occursOn(r, D(2026, 10, 3)) === true, 'and the next 3rd');
  ok(occursOn(r, D(2026, 9, 4)) === false, 'and not on the 4th');
  ok(occursOn(r, D(2026, 9, 10)) === false, 'nor a week later');

  // Weekdays are not part of monthly. A reminder switched from weekly to
  // monthly keeps its old days[] in storage, and it must be ignored rather
  // than silently narrowing the series to nothing.
  const switched = { repeat: 'monthly', monthDay: 3, days: [2] };
  ok(occursOn(switched, D(2026, 9, 3)) === true, 'a leftover days[] does not stop a monthly reminder');

  // Short months: never skip, never spill into the next month.
  const last = { repeat: 'monthly', monthDay: 31 };
  ok(occursOn(last, D(2026, 1, 31)) === true, 'the 31st in a long month');
  ok(occursOn(last, D(2026, 2, 28)) === true, 'the 28th in February 2026, which has 28 days');
  ok(occursOn(last, D(2026, 2, 27)) === false, 'and not the day before');
  ok(occursOn(last, D(2024, 2, 29)) === true, 'the 29th in a leap February');
  ok(occursOn(last, D(2024, 2, 28)) === false, 'and not the 28th that year');
  ok(occursOn(last, D(2026, 4, 30)) === true, 'the 30th in April');
  ok(occursOn(last, D(2026, 3, 1)) === false, 'never spilling into the next month');

  const thirtieth = { repeat: 'monthly', monthDay: 30 };
  ok(occursOn(thirtieth, D(2026, 2, 28)) === true, 'the 30th also clamps to the end of February');
  ok(occursOn(thirtieth, D(2026, 3, 30)) === true, 'and is back on the 30th in March');

  // Anchored rather than given a day number.
  const anchored = { repeat: 'monthly', anchor: '2026-09-15' };
  ok(occursOn(anchored, D(2026, 10, 15)) === true, 'an anchor supplies the day of the month');
  ok(occursOn(anchored, D(2026, 10, 16)) === false, 'and only that day');
}

console.log('\nThe next occurrence is found, however far away');
{
  // The notification scan used to look fourteen days ahead. A monthly
  // reminder is up to sixty-two days away in the worst case, so a
  // fourteen-day scan would find nothing and schedule nothing: the
  // reminder would simply never ring.
  const monthly = { repeat: 'monthly', monthDay: 31 };
  const from = D(2026, 4, 1);
  const next = nextOccurrences(monthly, from, { count: 3 });
  ok(next.length === 3, 'three occurrences found for a monthly reminder');
  ok(dateKey(next[0]) === '2026-04-30', `first is the clamped end of April (${dateKey(next[0])})`);
  ok(dateKey(next[1]) === '2026-05-31', 'then the 31st of May');
  ok(dateKey(next[2]) === '2026-06-30', 'then the clamped end of June');

  const fortnight = nextOccurrences({ repeat: 'biweekly', days: [2], anchor: '2026-09-22' }, D(2026, 9, 23), { count: 2 });
  ok(dateKey(fortnight[0]) === '2026-10-06' && dateKey(fortnight[1]) === '2026-10-20',
    'and a fortnightly one skips the off week');

  // Skips are honoured, so a reminder moved "just today" lands on the one
  // after, exactly as the weekly behaviour already did.
  const skipped = nextOccurrences({ repeat: 'weekly', days: [2] }, D(2026, 9, 22), {
    count: 1, skip: (k) => k === '2026-09-22',
  });
  ok(dateKey(skipped[0]) === '2026-09-29', 'a skipped date is passed over');

  ok(nextOccurrences(null, D(2026, 9, 22)).length === 0, 'nothing in, nothing out');
  ok(nextOccurrences({ repeat: 'weekly', days: [] }, D(2026, 9, 22), { count: 1 }).length === 0,
    'a reminder with no days selected never fires, rather than firing every day');

  // A fixed horizon silently returns fewer than asked, which is how a
  // reminder quietly stops ringing. It scales with count instead.
  ok(horizonFor(1) >= 62, `one occurrence has room for the worst monthly gap (${horizonFor(1)} days)`);
  ok(horizonFor(3) >= 3 * 31, 'and three have room for three months');
  const asked = nextOccurrences({ repeat: 'monthly', monthDay: 31 }, D(2026, 4, 1), { count: 6 });
  ok(asked.length === 6, `asking for six monthly occurrences returns six (${asked.length})`);
}

console.log('\nToday counts as an on week for something made today');
{
  // Somebody setting up a fortnightly reminder today means starting today,
  // not in a week's time.
  const madeToday = { repeat: 'biweekly', days: [1], createdAt: new Date(2026, 8, 21, 10, 0, 0).toISOString() };
  ok(occursOn(madeToday, D(2026, 9, 21)) === true, 'the creation date anchors the series');
  ok(occursOn(madeToday, D(2026, 9, 28)) === false, 'and the week after is off');
}

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll reminder recurrence checks passed');
