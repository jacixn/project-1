import userStorage from '../utils/userStorage';
import AchievementService from './achievementService';
import { addSeasonalPoints } from './seasonService';
import { db, auth } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// One way to award points for finishing something.
//
// There were three, and they did different amounts of work. The Focus tab
// wrote the total, the season and Firestore; the reminders screen and the
// habits screen each had a local copy that wrote only the total, so points
// earned there never reached the season or the cloud. And a day-template
// block, ticked off on the reminders screen, awarded nothing at all, which is
// the bug that started this.
//
// Awards are recorded against a key so the same thing cannot pay twice. That
// matters more than it sounds: a reminder or a block can be ticked and
// unticked as many times as you like, and without a record each tick would
// pay again. Undoing does NOT refund, and cannot: the profile reads the total
// as the maximum across every place points are stored, on the stated
// assumption that points only ever go up, so a subtraction would simply be
// ignored by the maximum and leave the stores disagreeing.

const LEDGER_KEY = 'points_awarded_v1';
// A day key is part of every award key, so the ledger is pruned by date and
// cannot grow without limit.
const LEDGER_KEEP_DAYS = 60;

export const POINTS_MIN = 10;
export const POINTS_MAX = 20;

/** The 10 to 20 points a completion is worth, matching what was there before. */
export const pointsForCompletion = () =>
  POINTS_MIN + Math.floor(Math.random() * (POINTS_MAX - POINTS_MIN + 1));

/** Stable award keys. The date is part of the key: the same reminder tomorrow pays again. */
export const reminderKey = (id, dateStr) => `reminder:${id}:${dateStr}`;
export const blockKey = (blockId, dateStr) => `block:${blockId}:${dateStr}`;

const dateOf = (key) => {
  const m = String(key).match(/(\d{4}-\d{2}-\d{2})$/);
  return m ? m[1] : null;
};

const prune = (ledger, todayStr) => {
  const cutoff = new Date(`${todayStr}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - LEDGER_KEEP_DAYS);
  const out = {};
  for (const [k, v] of Object.entries(ledger || {})) {
    const d = dateOf(k);
    // An entry with no readable date is kept: dropping it would let its award
    // happen a second time.
    if (!d || new Date(`${d}T00:00:00`) >= cutoff) out[k] = v;
  }
  return out;
};

// Every award is a read-modify-write of the same two keys, so two completions
// in quick succession would otherwise race and one would be lost.
let chain = Promise.resolve();
const serialise = (fn) => {
  const run = chain.then(fn, fn);
  chain = run.then(() => {}, () => {});
  return run;
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Award points for `key` unless it has already been awarded.
 * Returns the points actually added, so the caller can animate exactly what
 * was earned, and 0 when this completion had already paid.
 */
export const awardOnce = async (key, points = pointsForCompletion()) =>
  serialise(async () => {
    if (!key || !points || points <= 0) return 0;
    try {
      const rawLedger = await userStorage.getRaw(LEDGER_KEY);
      const ledger = rawLedger ? JSON.parse(rawLedger) : {};
      if (ledger[key]) return 0;

      const rawStats = await userStorage.getRaw('userStats');
      const stats = rawStats ? JSON.parse(rawStats) : {};
      const oldTotal = stats.totalPoints || stats.points || 0;
      const newTotal = oldTotal + points;
      const updated = {
        ...stats,
        totalPoints: newTotal,
        points: newTotal,
        level: AchievementService.getLevelFromPoints(newTotal),
      };

      await userStorage.setRaw('userStats', JSON.stringify(updated));
      // The profile takes the maximum across the stores, so this one is kept
      // level rather than left behind.
      await userStorage.setRaw('total_points', String(newTotal));
      await userStorage.setRaw(LEDGER_KEY, JSON.stringify({ ...prune(ledger, todayKey()), [key]: points }));

      addSeasonalPoints(points).catch(() => {});
      const uid = auth?.currentUser?.uid;
      if (uid) {
        setDoc(
          doc(db, 'users', uid),
          { totalPoints: newTotal, level: updated.level, lastActive: serverTimestamp() },
          { merge: true }
        ).catch(() => {});
      }
      return points;
    } catch (e) {
      if (__DEV__) console.warn('[Points] award failed for', key, e?.message);
      return 0;
    }
  });

/** Whether `key` has already paid. Used to decide if an animation is due. */
export const wasAwarded = async (key) => {
  try {
    const raw = await userStorage.getRaw(LEDGER_KEY);
    return !!(raw ? JSON.parse(raw) : {})[key];
  } catch {
    return false;
  }
};

export default { awardOnce, wasAwarded, pointsForCompletion, reminderKey, blockKey, POINTS_MIN, POINTS_MAX };
