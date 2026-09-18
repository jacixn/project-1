// Node test for src/utils/adminAnalytics.js (pure module, babel-transformed in memory).
// Run: node scripts/test-admin-analytics.js
const path = require('path');
const assert = require('assert');
const Module = require('module');

const file = path.join(__dirname, '..', 'src', 'utils', 'adminAnalytics.js');
const { code } = require('@babel/core').transformFileSync(file, {
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});
const m = new Module(file, module);
m.filename = file;
m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(code, file);
const {
  toMillis, normalizeUser, computeAnalytics, relativeTime, formatDate, formatClock,
  ATTRIBUTION_LABELS, ATTRIBUTION_COLORS,
} = m.exports;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// Fixed "now": 2026-09-18 18:22 local.
const NOW = new Date(2026, 8, 18, 18, 22, 0).getTime();
const SEASON = 'autumn_2026';

const ts = (ms) => ({ toMillis: () => ms, seconds: Math.floor(ms / 1000) });
const secs = (ms) => ({ seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6 });

// toMillis
assert.strictEqual(toMillis(ts(1234)), 1234);
assert.strictEqual(toMillis(secs(1500)), 1500);
assert.strictEqual(toMillis(new Date(5000)), 5000);
assert.strictEqual(toMillis(7000), 7000);
assert.strictEqual(toMillis('2026-09-18T00:00:00.000Z'), Date.parse('2026-09-18T00:00:00.000Z'));
assert.strictEqual(toMillis(null), null);
assert.strictEqual(toMillis(undefined), null);
assert.strictEqual(toMillis('nope'), null);
assert.strictEqual(toMillis(NaN), null);
assert.strictEqual(toMillis({}), null);

// Users
const raw = [
  // a: created 2h ago via Timestamp-like toMillis, active 30m ago. Season points valid.
  ['a', { displayName: 'Anna', username: 'anna', createdAt: ts(NOW - 2 * HOUR), lastActive: ts(NOW - 30 * 60 * 1000),
    totalPoints: 500, seasonalPoints: 120, currentSeason: SEASON, level: 4, currentStreak: 3, attribution: 'tiktok' }],
  // b: created 3 days ago via {seconds,nanoseconds}; lastSeen = lastStreakUpdate 2 days ago (later than lastActive 5 days ago)
  ['b', { displayName: 'Ben', username: 'ben', createdAt: secs(NOW - 3 * DAY), lastActive: secs(NOW - 5 * DAY),
    lastStreakUpdate: secs(NOW - 2 * DAY), totalPoints: 900, seasonalPoints: 120, currentSeason: SEASON, level: 6, currentStreak: 0, attribution: 'tiktok' }],
  // c: created 25 days ago as Date; pushTokenUpdatedAt 20 days ago is the latest signal. Stale season: 0 seasonal.
  ['c', { displayName: 'Cara', username: 'cara', createdAt: new Date(NOW - 25 * DAY), lastActive: new Date(NOW - 25 * DAY),
    pushTokenUpdatedAt: new Date(NOW - 20 * DAY), totalPoints: 900, seasonalPoints: 999, currentSeason: 'summer_2026', level: 9, attribution: 'instagram' }],
  // d: created 40 days ago as number; lastActive 31 days ago (outside month). No attribution.
  ['d', { displayName: 'Dan', username: 'dan', createdAt: NOW - 40 * DAY, lastActive: NOW - 31 * DAY,
    totalPoints: 50, seasonalPoints: 50, currentSeason: SEASON, level: 1, currentStreak: 1 }],
  // e: no createdAt but joinedDate as ISO string 6 days ago; lastActive exactly 7 days ago (boundary, counts in week).
  ['e', { displayName: 'Eve', username: 'eve', joinedDate: new Date(NOW - 6 * DAY).toISOString(), lastActive: NOW - 7 * DAY,
    totalPoints: 0, seasonalPoints: 0, currentSeason: SEASON, attribution: 'friend' }],
  // f: neither createdAt nor joinedDate; lastActive exactly 24h ago (boundary, counts in day). No displayName -> username.
  ['f', { username: 'frank', lastActive: NOW - DAY, totalPoints: 300, seasonalPoints: 300, currentSeason: SEASON, level: 3, attribution: 'other' }],
  // g: no name at all, no timestamps at all, totalPoints as string.
  ['g', { totalPoints: '10', seasonalPoints: 10, currentSeason: SEASON }],
  // h: created exactly 30 days ago (boundary, counts in month, not week), lastActive 30 days + 1ms ago (out of month).
  ['h', { displayName: 'Hana', username: 'hana', createdAt: NOW - 30 * DAY, lastActive: NOW - 30 * DAY - 1,
    totalPoints: 900, seasonalPoints: 200, currentSeason: SEASON, level: 7, attribution: 'tiktok' }],
];
const users = raw.map(([id, d]) => normalizeUser(id, d, SEASON));
const byId = Object.fromEntries(users.map((u) => [u.uid, u]));

// normalizeUser
assert.strictEqual(byId.a.createdAt, NOW - 2 * HOUR);
assert.strictEqual(byId.b.lastSeen, NOW - 2 * DAY, 'lastSeen = max of signals');
assert.strictEqual(byId.c.lastSeen, NOW - 20 * DAY, 'pushTokenUpdatedAt counts');
assert.strictEqual(byId.c.seasonalPoints, 0, 'stale season -> 0');
assert.strictEqual(byId.e.createdAt, Date.parse(new Date(NOW - 6 * DAY).toISOString()), 'joinedDate fallback');
assert.strictEqual(byId.f.createdAt, null);
assert.strictEqual(byId.f.displayName, 'frank');
assert.strictEqual(byId.g.displayName, 'Someone');
assert.strictEqual(byId.g.createdAt, null);
assert.strictEqual(byId.g.lastSeen, null);
assert.strictEqual(byId.g.totalPoints, 10);
assert.strictEqual(byId.d.attribution, null);
// lastSeen falls back to createdAt when no activity signal
const only = normalizeUser('x', { createdAt: 123 }, SEASON);
assert.strictEqual(only.lastSeen, 123);

// computeAnalytics
const r = computeAnalytics(users, { now: NOW });
assert.strictEqual(r.total, 8);
assert.strictEqual(r.newToday, 1, 'a only');
assert.strictEqual(r.newThisWeek, 3, 'a, b, e');
assert.strictEqual(r.newThisMonth, 5, 'a, b, c, e, h (h exactly on boundary)');
assert.deepStrictEqual(r.active, { day: 2, week: 4, month: 6 }, 'day: a,f(24h boundary); week: +b,e(7d boundary); month: +c, +h (lastSeen falls back to createdAt exactly 30d); d out, g null');

assert.deepStrictEqual(r.recent.map((u) => u.uid), ['a', 'b', 'e', 'c', 'h', 'd', 'f', 'g'], 'recent: createdAt desc, then no-createdAt by lastSeen desc');
assert.deepStrictEqual(r.lastSeen.map((u) => u.uid), ['a', 'f', 'b', 'e', 'c', 'h', 'd'], 'lastSeen desc, g excluded');
assert.deepStrictEqual(r.topSeason.map((u) => u.uid), ['f', 'h', 'b', 'a', 'd', 'g'], 'season: tie a/b broken by totalPoints; c stale excluded');
assert.deepStrictEqual(r.topAllTime.map((u) => u.uid), ['h', 'b', 'c', 'a', 'f', 'd', 'g'], 'all time: 900 tie broken by seasonalPoints');

assert.strictEqual(r.answered, 6);
assert.strictEqual(r.notAnswered, 2);
assert.deepStrictEqual(r.attribution.map((x) => [x.id, x.label, x.color, x.count, x.pctOfAnswered, x.pctOfTotal]), [
  ['tiktok', 'TikTok', '#000000', 3, 50, 38],
  ['friend', 'Friend / Family', '#FF7043', 1, 17, 13],
  ['instagram', 'Instagram', '#E1306C', 1, 17, 13],
  ['other', 'Other', '#78909C', 1, 17, 13],
]);
assert.strictEqual(Object.keys(ATTRIBUTION_LABELS).length, 9);
assert.strictEqual(Object.keys(ATTRIBUTION_COLORS).length, 9);

// Empty input: no division by zero
const empty = computeAnalytics([], { now: NOW });
assert.strictEqual(empty.total, 0);
assert.deepStrictEqual(empty.active, { day: 0, week: 0, month: 0 });
assert.deepStrictEqual(empty.attribution, []);
assert.strictEqual(empty.answered, 0);
assert.strictEqual(empty.notAnswered, 0);
assert.deepStrictEqual(empty.recent, []);

// Future clock skew: a client-written timestamp minutes ahead of the admin's clock
// counts as active now (and new now), and stays consistent with the lastSeen list.
const skew = computeAnalytics([
  normalizeUser('s1', { displayName: 'Skew', createdAt: NOW + 3 * 60 * 1000, lastActive: NOW - 5 * 60 * 1000,
    pushTokenUpdatedAt: new Date(NOW + 3 * 60 * 1000), totalPoints: 1, seasonalPoints: 1, currentSeason: SEASON }, SEASON),
  normalizeUser('s2', { displayName: 'Old', createdAt: NOW - 3 * DAY, lastActive: NOW - 3 * DAY,
    totalPoints: 2, seasonalPoints: 2, currentSeason: SEASON }, SEASON),
], { now: NOW });
assert.strictEqual(skew.lastSeen[0].uid, 's1', 'future-skewed user sorts first in lastSeen');
assert.deepStrictEqual(skew.active, { day: 1, week: 2, month: 2 }, 'future-skewed lastSeen counts as active today');
assert.strictEqual(skew.newToday, 1, 'future-skewed createdAt counts as new today');
assert.strictEqual(skew.newThisWeek, 2);
assert.strictEqual(skew.newThisMonth, 2);
assert.strictEqual(relativeTime(skew.lastSeen[0].lastSeen, NOW), 'just now');

// Take limits
const many = [];
for (let i = 0; i < 20; i++) {
  many.push(normalizeUser(`u${i}`, { displayName: `U${i}`, createdAt: NOW - i * HOUR, lastActive: NOW - i * HOUR, totalPoints: 100 + i, seasonalPoints: 100 + i, currentSeason: SEASON }, SEASON));
}
const big = computeAnalytics(many, { now: NOW });
assert.strictEqual(big.recent.length, 12);
assert.strictEqual(big.lastSeen.length, 10);
assert.strictEqual(big.topSeason.length, 10);
assert.strictEqual(big.topAllTime.length, 10);
assert.strictEqual(big.topSeason[0].uid, 'u19');

// relativeTime
assert.strictEqual(relativeTime(null, NOW), 'unknown');
assert.strictEqual(relativeTime(undefined, NOW), 'unknown');
assert.strictEqual(relativeTime(NOW - 30 * 1000, NOW), 'just now');
assert.strictEqual(relativeTime(NOW - 5 * 60 * 1000, NOW), '5m ago');
assert.strictEqual(relativeTime(NOW - 59 * 60 * 1000, NOW), '59m ago');
assert.strictEqual(relativeTime(NOW - 3 * HOUR, NOW), '3h ago');
assert.strictEqual(relativeTime(NOW - 23 * HOUR, NOW), '23h ago');
assert.strictEqual(relativeTime(NOW - 2 * DAY, NOW), '2d ago');
assert.strictEqual(relativeTime(NOW - 6 * DAY, NOW), '6d ago');
assert.strictEqual(relativeTime(NOW - 13 * DAY, NOW), '1w ago');
assert.strictEqual(relativeTime(NOW - 34 * DAY, NOW), '4w ago');
assert.strictEqual(relativeTime(NOW - 35 * DAY, NOW), 'Aug 14');
assert.strictEqual(relativeTime(NOW - 400 * DAY, NOW), 'Aug 14, 2025');
assert.strictEqual(relativeTime(NOW + 5000, NOW), 'just now', 'small future skew');

// formatDate / formatClock
assert.strictEqual(formatDate(NOW), 'Sep 18, 2026');
assert.strictEqual(formatDate(null), '');
assert.strictEqual(formatClock(NOW), '6:22 PM');
assert.strictEqual(formatClock(new Date(2026, 8, 18, 0, 5).getTime()), '12:05 AM');

// Referrals: who referred who
// Base fixtures carry no referral fields at all.
assert.strictEqual(byId.a.referredBy, null);
assert.strictEqual(byId.a.referredByUsername, '');
assert.strictEqual(byId.a.referredByDisplayName, '');
assert.strictEqual(byId.a.referralDate, null);
assert.strictEqual(byId.a.referralCount, 0);
assert.deepStrictEqual(r.referrals, {
  totalReferred: 0, pctOfTotal: 0, referrerCount: 0, topReferrers: [], recent: [],
});

const refRaw = [
  // Referrer A: 3 referred users (two dated, one null), referralCount field drifted to 5.
  ['ra', { displayName: 'Ada', username: 'ada', createdAt: NOW - 90 * DAY, referralCount: 5 }],
  ['a1', { displayName: 'Ana', username: 'ana', createdAt: NOW - 10 * DAY,
    referredBy: 'ra', referredByUsername: 'ada', referredByDisplayName: 'Ada', referralDate: ts(NOW - 10 * DAY) }],
  ['a2', { displayName: 'Abe', username: 'abe', createdAt: NOW - 2 * DAY,
    referredBy: 'ra', referredByUsername: 'ada', referredByDisplayName: 'Ada', referralDate: secs(NOW - 2 * DAY) }],
  ['a3', { displayName: 'Amy', username: 'amy', createdAt: NOW - 1 * DAY,
    referredBy: 'ra', referredByUsername: 'ada', referredByDisplayName: 'Ada' }],
  // Referrer B: 1 referred user, counter matches.
  ['rb', { displayName: 'Bo', username: 'bo', createdAt: NOW - 80 * DAY, referralCount: 1 }],
  ['b1', { displayName: 'Bea', username: 'bea', createdAt: NOW - 5 * DAY,
    referredBy: 'rb', referredByUsername: 'bo', referredByDisplayName: 'Bo', referralDate: NOW - 5 * DAY }],
  // Referrer C: 1 referred user with an earlier first referral than B, so C ranks above B on the tie.
  ['rc', { displayName: 'Cy', username: 'cy', createdAt: NOW - 70 * DAY, referralCount: 1 }],
  ['c1', { displayName: 'Cal', username: 'cal', createdAt: NOW - 20 * DAY,
    referredBy: 'rc', referredByUsername: 'cy', referredByDisplayName: 'Cy', referralDate: NOW - 20 * DAY }],
  // Referrer gone: uid 'gone' is not in the list, name comes from the referred user's record.
  ['g1', { displayName: 'Gil', username: 'gil', createdAt: NOW - 3 * DAY,
    referredBy: 'gone', referredByUsername: 'ghost', referredByDisplayName: 'Ghost', referralDate: NOW - 3 * DAY }],
  // Referrer N: one referred user with no referralDate at all, so firstReferral is null and N sorts last on the count tie.
  ['rn', { displayName: 'Ned', username: 'ned', createdAt: NOW - 65 * DAY, referralCount: 1 }],
  ['n1', { displayName: 'Nell', username: 'nell', createdAt: NOW - 4 * DAY,
    referredBy: 'rn', referredByUsername: 'ned', referredByDisplayName: 'Ned' }],
  // Counter says 2 but nobody links to them: not a referrer.
  ['rz', { displayName: 'Zed', username: 'zed', createdAt: NOW - 60 * DAY, referralCount: 2 }],
  // Plain user, no referral anywhere.
  ['p1', { displayName: 'Pat', username: 'pat', createdAt: NOW - 50 * DAY }],
];
const refUsers = refRaw.map(([id, d]) => normalizeUser(id, d, SEASON));
const refById = Object.fromEntries(refUsers.map((u) => [u.uid, u]));
assert.strictEqual(refById.a1.referredBy, 'ra');
assert.strictEqual(refById.a1.referredByUsername, 'ada');
assert.strictEqual(refById.a1.referredByDisplayName, 'Ada');
assert.strictEqual(refById.a1.referralDate, NOW - 10 * DAY, 'referralDate via Timestamp-like');
assert.strictEqual(refById.a2.referralDate, NOW - 2 * DAY, 'referralDate via {seconds,nanoseconds}');
assert.strictEqual(refById.a3.referralDate, null);
assert.strictEqual(refById.ra.referralCount, 5);

const rr = computeAnalytics(refUsers, { now: NOW }).referrals;
assert.strictEqual(rr.totalReferred, 7, 'a1 a2 a3 b1 c1 g1 n1');
assert.strictEqual(rr.pctOfTotal, 54, '7 of 13');
assert.strictEqual(rr.referrerCount, 5, 'ra, rc, rb, gone, rn (rz has no links)');

assert.deepStrictEqual(rr.topReferrers.map((t) => [t.uid, t.displayName, t.username, t.count, t.storedCount, t.resolved]), [
  ['ra', 'Ada', 'ada', 3, 5, true],
  ['rc', 'Cy', 'cy', 1, 1, true],
  ['rb', 'Bo', 'bo', 1, 1, true],
  ['gone', 'Ghost', 'ghost', 1, 0, false],
  ['rn', 'Ned', 'ned', 1, 1, true],
], 'count desc, then earliest first referral asc (rc 20d, rb 5d, gone 3d), null first referral last (rn)');
assert.deepStrictEqual(rr.topReferrers[0].referred.map((x) => [x.uid, x.displayName, x.username, x.referralDate]), [
  ['a2', 'Abe', 'abe', NOW - 2 * DAY],
  ['a1', 'Ana', 'ana', NOW - 10 * DAY],
  ['a3', 'Amy', 'amy', null],
], 'referred sub-list: referralDate desc, null last');
assert.deepStrictEqual(rr.topReferrers[3].referred.map((x) => x.uid), ['g1']);
assert.deepStrictEqual(rr.topReferrers[4].referred.map((x) => [x.uid, x.referralDate]), [['n1', null]]);

assert.deepStrictEqual(rr.recent.map((x) => [x.uid, x.referrerUid, x.referrerName, x.referralDate]), [
  ['a2', 'ra', 'Ada', NOW - 2 * DAY],
  ['g1', 'gone', 'Ghost', NOW - 3 * DAY],
  ['b1', 'rb', 'Bo', NOW - 5 * DAY],
  ['a1', 'ra', 'Ada', NOW - 10 * DAY],
  ['c1', 'rc', 'Cy', NOW - 20 * DAY],
  ['a3', 'ra', 'Ada', null],
  ['n1', 'rn', 'Ned', null],
], 'recent: referralDate desc, null last, name order among nulls (Amy before Nell)');
assert.deepStrictEqual(Object.keys(rr.recent[0]).sort(), ['displayName', 'referralDate', 'referrerName', 'referrerUid', 'uid', 'username']);

// Tie on count AND first referral date falls back to displayName.
const tie = computeAnalytics([
  normalizeUser('t1', { displayName: 'Zoe', username: 'zoe', referralCount: 1 }, SEASON),
  normalizeUser('t2', { displayName: 'Max', username: 'max', referralCount: 1 }, SEASON),
  normalizeUser('x1', { displayName: 'X1', referredBy: 't1', referralDate: NOW - DAY }, SEASON),
  normalizeUser('x2', { displayName: 'X2', referredBy: 't2', referralDate: NOW - DAY }, SEASON),
], { now: NOW }).referrals;
assert.deepStrictEqual(tie.topReferrers.map((t) => t.uid), ['t2', 't1'], 'Max before Zoe');
assert.strictEqual(tie.pctOfTotal, 50);

// Two referrers whose referred users all lack a referralDate: both firstReferral null, falls back to displayName.
const nullTie = computeAnalytics([
  normalizeUser('u1', { displayName: 'Yara', username: 'yara', referralCount: 1 }, SEASON),
  normalizeUser('u2', { displayName: 'Ben', username: 'ben', referralCount: 1 }, SEASON),
  normalizeUser('y1', { displayName: 'Y1', referredBy: 'u1' }, SEASON),
  normalizeUser('y2', { displayName: 'Y2', referredBy: 'u2' }, SEASON),
], { now: NOW }).referrals;
assert.deepStrictEqual(nullTie.topReferrers.map((t) => t.uid), ['u2', 'u1'], 'all-null first referral on both sides: Ben before Yara');

// Missing referrer with no recorded name falls back to 'Deleted account'.
const nameless = computeAnalytics([
  normalizeUser('n1', { displayName: 'Nia', referredBy: 'vanished' }, SEASON),
], { now: NOW }).referrals;
assert.strictEqual(nameless.topReferrers[0].displayName, 'Deleted account');
assert.strictEqual(nameless.topReferrers[0].resolved, false);
assert.strictEqual(nameless.recent[0].referrerName, 'Deleted account');
assert.strictEqual(nameless.pctOfTotal, 100);

// Self-referral cannot exist, but must not crash and must still count once.
const selfRef = computeAnalytics([
  normalizeUser('s', { displayName: 'Self', username: 'self', referredBy: 's', referralDate: NOW, referralCount: 1 }, SEASON),
], { now: NOW }).referrals;
assert.strictEqual(selfRef.totalReferred, 1);
assert.strictEqual(selfRef.topReferrers[0].uid, 's');
assert.strictEqual(selfRef.topReferrers[0].count, 1);
assert.strictEqual(selfRef.topReferrers[0].resolved, true);

// Recent cap at 20, topReferrers not capped.
const crowd = [];
for (let i = 0; i < 25; i++) {
  crowd.push(normalizeUser(`ref${i}`, { displayName: `Ref${i}`, username: `ref${i}` }, SEASON));
  crowd.push(normalizeUser(`kid${i}`, { displayName: `Kid${i}`, referredBy: `ref${i}`, referralDate: NOW - i * HOUR }, SEASON));
}
const crowdRef = computeAnalytics(crowd, { now: NOW }).referrals;
assert.strictEqual(crowdRef.totalReferred, 25);
assert.strictEqual(crowdRef.referrerCount, 25);
assert.strictEqual(crowdRef.topReferrers.length, 25, 'all referrers listed');
assert.strictEqual(crowdRef.recent.length, 20, 'recent capped');
assert.strictEqual(crowdRef.recent[0].uid, 'kid0');
assert.strictEqual(crowdRef.recent[19].uid, 'kid19');
assert.strictEqual(crowdRef.topReferrers[0].uid, 'ref24', 'all count 1: earliest first referral wins');

// Empty list.
assert.deepStrictEqual(empty.referrals, {
  totalReferred: 0, pctOfTotal: 0, referrerCount: 0, topReferrers: [], recent: [],
});

// Referrer stored under a uid that no longer exists, but the recorded username
// matches a live account (re-created account). Must resolve and merge by username.
const remade = computeAnalytics([
  normalizeUser('j2', { username: 'Jason', displayName: 'Jason', referralCount: 0 }, SEASON),
  normalizeUser('adm', { username: 'admin', displayName: 'Admin', referredBy: 'old-j1', referredByUsername: 'jason', referredByDisplayName: 'jason', referralDate: NOW - 5 * DAY }, SEASON),
  normalizeUser('k1', { username: 'kim', displayName: 'Kim', referredBy: 'j2', referredByUsername: 'jason', referralDate: NOW - DAY }, SEASON),
  normalizeUser('m1', { username: 'mo', displayName: 'Mo', referredBy: 'jason', referralDate: NOW - 2 * DAY }, SEASON),
], { now: NOW }).referrals;
assert.strictEqual(remade.referrerCount, 1, 'uid, username-record and username-as-id all merge onto one referrer');
assert.strictEqual(remade.topReferrers.length, 1);
assert.deepStrictEqual(
  [remade.topReferrers[0].uid, remade.topReferrers[0].displayName, remade.topReferrers[0].username, remade.topReferrers[0].count, remade.topReferrers[0].resolved],
  ['j2', 'Jason', 'Jason', 3, true],
);
assert.deepStrictEqual(remade.topReferrers[0].referred.map((r) => r.uid), ['k1', 'm1', 'adm']);
assert.ok(remade.recent.every((r) => r.referrerUid === 'j2' && r.referrerName === 'Jason'));

console.log('adminAnalytics tests passed');
