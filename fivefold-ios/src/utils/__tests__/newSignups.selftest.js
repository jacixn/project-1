// Run: node src/utils/__tests__/newSignups.selftest.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'newSignups.js'), 'utf8').replace(/^export /gm, '');
const m = new Function(`${src}\nreturn { pickNewSignups, highWaterMark, summariseSignups, MAX_NAMED };`)();

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const NOW = 1_700_000_000_000;
const u = (name, createdAt) => ({ displayName: name, createdAt });

// ── Who counts as new ────────────────────────────────────────────────
const users = [u('Ada', NOW - 1000), u('Grace', NOW - 2000), u('Alan', NOW - 900000)];
ok(m.pickNewSignups(users, NOW - 5000, NOW).map((x) => x.displayName).join(',') === 'Ada,Grace',
  'only accounts created since the last look count, newest first');
ok(m.pickNewSignups(users, NOW - 1500, NOW).length === 1, 'and the boundary is exclusive, so nobody is announced twice');

// The first run has no idea what is new. Announcing everyone would be a
// spectacular way to introduce the feature.
ok(m.pickNewSignups(users, null, NOW).length === 0, 'the first ever look announces nobody');
ok(m.pickNewSignups(null, NOW - 5000).length === 0 && m.pickNewSignups([], NOW - 5000).length === 0, 'no users, nothing to say');

// A clock skewed into the future must not poison the mark.
ok(m.pickNewSignups([u('Future', NOW + 600000)], NOW - 5000, NOW).length === 0,
  'an account stamped in the future is ignored rather than announced');

// ── Remembering where we got to ──────────────────────────────────────
ok(m.highWaterMark(users, NOW - 5000, NOW) === NOW - 1000, 'the mark moves to the newest account seen');
ok(m.highWaterMark([], NOW - 5000, NOW) === NOW - 5000, 'and stays put when there is nothing');
ok(m.highWaterMark([], null, NOW) === NOW, 'a first look with no users still records where we are');
ok(m.highWaterMark([u('Old', NOW - 90000)], NOW - 1000, NOW) === NOW - 1000,
  'it never goes backwards, so an older account cannot re-announce newer ones');
ok(m.highWaterMark([u('Future', NOW + 600000)], NOW - 1000, NOW) === NOW - 1000,
  'and a future stamp cannot skip the mark past real accounts');

// ── What it says ─────────────────────────────────────────────────────
const one = m.summariseSignups([u('Ada', NOW)]);
ok(one.title === 'Someone joined Biblely' && one.body === 'Ada just created an account.' && one.count === 1,
  'one person is named');
const two = m.summariseSignups([u('Ada', NOW), u('Grace', NOW)]);
ok(two.title === '2 people joined Biblely' && two.body === 'Ada and Grace created accounts.', 'two are joined with "and"');
const three = m.summariseSignups([u('Ada', NOW), u('Grace', NOW), u('Alan', NOW)]);
ok(three.body === 'Ada, Grace and Alan created accounts.', 'three read as a list');
const many = m.summariseSignups([u('Ada', NOW), u('Grace', NOW), u('Alan', NOW), u('Edsger', NOW), u('Barbara', NOW)]);
ok(many.title === '5 people joined Biblely' && many.body === 'Ada, Grace and Alan and 2 more created accounts.',
  'a crowd is summarised rather than listed in full');
ok(m.summariseSignups([{ username: 'ada99', createdAt: NOW }]).body === 'ada99 just created an account.',
  'a username stands in when there is no display name');
ok(m.summariseSignups([{ createdAt: NOW }]).body === 'Someone just created an account.', 'and a nameless account is still announced');
ok(m.summariseSignups([]) === null && m.summariseSignups(null) === null, 'nothing new, nothing posted');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll new-signup checks passed');
