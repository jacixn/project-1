#!/usr/bin/env node
// Run: node scripts/test-points.js        (or: npm run test:points)
//
// Exercises the real services/pointsService.js, with its React Native and
// Firebase dependencies replaced by fakes, so the behaviour is tested rather
// than the wiring described. The bug that prompted it: ticking a day-template
// block such as "Work Remote" off the reminders screen awarded nothing, while
// ticking a plain reminder awarded 10 to 20 points.

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'src', 'services', 'pointsService.js');

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

// ── Load the real module with fakes in place of its imports ──────────
const build = () => {
  const store = new Map();
  const seasonal = [];
  const cloud = [];

  const userStorage = {
    getRaw: async (k) => (store.has(k) ? store.get(k) : null),
    setRaw: async (k, v) => { store.set(k, v); },
  };
  const AchievementService = { getLevelFromPoints: (p) => Math.floor(p / 300) + 1 };
  const addSeasonalPoints = async (p) => { seasonal.push(p); };
  const auth = { currentUser: { uid: 'u1' } };
  const db = {};
  const doc = (...a) => a;
  const setDoc = async (_ref, data) => { cloud.push(data); };
  const serverTimestamp = () => 'ts';

  const src = fs.readFileSync(SOURCE, 'utf8')
    .replace(/^import[^\n]*;\n/gm, '')
    .replace(/^export default[\s\S]*$/m, '')
    .replace(/^export /gm, '');

  // eslint-disable-next-line no-new-func
  const mod = new Function(
    'userStorage', 'AchievementService', 'addSeasonalPoints', 'db', 'auth', 'doc', 'setDoc', 'serverTimestamp', '__DEV__',
    `${src}\nreturn { awardOnce, wasAwarded, pointsForCompletion, reminderKey, blockKey, POINTS_MIN, POINTS_MAX };`
  )(userStorage, AchievementService, addSeasonalPoints, db, auth, doc, setDoc, serverTimestamp, false);

  const stats = () => JSON.parse(store.get('userStats') || '{}');
  const ledger = () => JSON.parse(store.get('points_awarded_v1') || '{}');
  return { mod, store, stats, ledger, seasonal, cloud };
};

const DAY = '2026-09-19';

(async () => {
  // ── A block pays, exactly like a reminder ──────────────────────────
  {
    const { mod, stats, seasonal, cloud } = build();
    const pts = await mod.awardOnce(mod.blockKey('work-remote-1', DAY));
    ok(pts >= mod.POINTS_MIN && pts <= mod.POINTS_MAX, `ticking a day-template block pays 10 to 20 points (paid ${pts})`);
    ok(stats().totalPoints === pts && stats().points === pts, 'the total goes up by exactly what was paid');
    ok(stats().level === 1, 'and the level is recomputed from the new total');
    ok(seasonal.length === 1 && seasonal[0] === pts, 'the points reach the season, which the reminders screen never did before');
    ok(cloud.length === 1 && cloud[0].totalPoints === pts, 'and the cloud');
  }

  // ── The same tick cannot pay twice ─────────────────────────────────
  {
    const { mod, stats, seasonal } = build();
    const first = await mod.awardOnce(mod.blockKey('b1', DAY));
    const second = await mod.awardOnce(mod.blockKey('b1', DAY));
    ok(first > 0 && second === 0, 'unticking and reticking the same block does not pay again');
    ok(stats().totalPoints === first, 'so the total is untouched by the second tick');
    ok(seasonal.length === 1, 'and the season is not paid twice either');
    ok(await mod.wasAwarded(mod.blockKey('b1', DAY)) === true, 'the award is on record');
    ok(await mod.wasAwarded(mod.blockKey('b1', '2026-09-20')) === false, 'and tomorrow is a different record');
  }

  // ── Tomorrow is a new day ──────────────────────────────────────────
  {
    const { mod, stats } = build();
    const a = await mod.awardOnce(mod.blockKey('b1', DAY));
    const b = await mod.awardOnce(mod.blockKey('b1', '2026-09-20'));
    ok(a > 0 && b > 0, 'the same block on a later day pays again, because it is a repeating plan');
    ok(stats().totalPoints === a + b, 'and both are counted');
  }

  // ── Reminders and blocks are separate records ──────────────────────
  {
    const { mod, ledger } = build();
    await mod.awardOnce(mod.reminderKey('r1', DAY));
    await mod.awardOnce(mod.blockKey('r1', DAY));
    ok(Object.keys(ledger()).length === 2, 'a reminder and a block that share an id are still two different things');
  }

  // ── Two completions at once must not lose one ──────────────────────
  {
    const { mod, stats } = build();
    const paid = await Promise.all([
      mod.awardOnce(mod.blockKey('b1', DAY)),
      mod.awardOnce(mod.blockKey('b2', DAY)),
      mod.awardOnce(mod.blockKey('b3', DAY)),
    ]);
    const sum = paid.reduce((a, b) => a + b, 0);
    ok(paid.every((p) => p > 0), 'three blocks ticked at once all pay');
    ok(stats().totalPoints === sum, `and none is lost to the other two writing at the same time (${stats().totalPoints} of ${sum})`);
  }

  // ── The same tick from two screens pays once ───────────────────────
  {
    const { mod, stats } = build();
    const [a, b] = await Promise.all([
      mod.awardOnce(mod.blockKey('b1', DAY)),
      mod.awardOnce(mod.blockKey('b1', DAY)),
    ]);
    ok((a > 0) !== (b > 0), 'ticking the same block on the Focus card and the reminders screen pays once, not twice');
    ok(stats().totalPoints === Math.max(a, b), 'and the total reflects a single payment');
  }

  // ── The stores the profile reads are kept together ─────────────────
  {
    const { mod, store, stats } = build();
    const pts = await mod.awardOnce(mod.reminderKey('r1', DAY));
    ok(Number(store.get('total_points')) === pts && stats().totalPoints === pts,
      'both places the profile looks for a total agree, since it takes the highest it finds');
  }

  // ── The ledger does not grow forever ───────────────────────────────
  {
    const { mod, store, ledger } = build();
    const old = new Date();
    old.setDate(old.getDate() - 400);
    const oldKey = `block:ancient:${old.toISOString().slice(0, 10)}`;
    store.set('points_awarded_v1', JSON.stringify({ [oldKey]: 12 }));
    const today = new Date().toISOString().slice(0, 10);
    await mod.awardOnce(mod.blockKey('b1', today));
    ok(!ledger()[oldKey], 'records older than the keep window are dropped');
    ok(!!ledger()[mod.blockKey('b1', today)], 'and the new one is kept');
  }

  // ── Bad input is not an award ──────────────────────────────────────
  {
    const { mod, stats } = build();
    ok(await mod.awardOnce('', 15) === 0 && await mod.awardOnce(null) === 0, 'no key, no points');
    ok(await mod.awardOnce(mod.blockKey('b', DAY), 0) === 0, 'nor zero points');
    ok(!stats().totalPoints, 'and nothing was written');
  }

  if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
  console.log('\nAll points checks passed');
})();
