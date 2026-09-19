import * as Notifications from 'expo-notifications';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import userStorage from '../utils/userStorage';
import { getStoredData } from '../utils/localStorage';
import { isAdminEmail } from '../config/admin';
import { normalizeUser } from '../utils/adminAnalytics';
import { pickNewSignups, highWaterMark, summariseSignups } from '../utils/newSignups';

// Tells the owner accounts when somebody new joins Biblely.
//
// Owner only. isAdminEmail is the same gate the analytics screen and the
// sign-in passphrase use, and it is checked here before anything is read, so
// no ordinary account ever queries the user list or sees the setting.
//
// This is a local notification raised by the app, not a push. It fires when
// an owner opens Biblely or brings it back to the foreground, so it says
// "somebody joined since you last looked" rather than arriving the instant
// they sign up. A real push would need a Cloud Function on user creation.

const SETTING_KEY = 'newSignupAlerts';
const LAST_SEEN_KEY = 'admin_new_signups_last_seen';
// The newest few accounts are all that can be new; reading the whole
// collection on every foreground would be wasteful.
const FETCH_LIMIT = 25;
// Coming back to the app repeatedly should not re-query every time.
const MIN_GAP_MS = 5 * 60 * 1000;

let lastRunAt = 0;
let running = false;

/** Whether this account may use the feature at all. */
export const canSeeSignupAlerts = (email) => isAdminEmail(email);

export const isEnabled = async () => {
  try {
    const s = await getStoredData('notificationSettings');
    // On for the owner by default; it is the point of the feature.
    return s?.[SETTING_KEY] !== false;
  } catch {
    return true;
  }
};

const readLastSeen = async () => {
  try {
    const raw = await userStorage.getRaw(LAST_SEEN_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

const writeLastSeen = async (ts) => {
  try { await userStorage.setRaw(LAST_SEEN_KEY, String(ts)); } catch {}
};

/**
 * Look for accounts created since the last look and, if there are any, raise
 * one notification about them.
 *
 * Returns what it did, so the caller and the tests can tell the difference
 * between "not allowed", "nothing new" and "told them about 3".
 */
export const checkForNewSignups = async (email, { force = false } = {}) => {
  if (!canSeeSignupAlerts(email)) return { ran: false, reason: 'not an owner account' };
  if (!(await isEnabled())) return { ran: false, reason: 'turned off' };
  if (running) return { ran: false, reason: 'already running' };
  const now = Date.now();
  if (!force && now - lastRunAt < MIN_GAP_MS) return { ran: false, reason: 'checked recently' };

  running = true;
  lastRunAt = now;
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(FETCH_LIMIT))
    );
    const users = [];
    snap.forEach((d) => users.push(normalizeUser(d.id, d.data({ serverTimestamps: 'estimate' }), null)));

    const since = await readLastSeen();
    const mark = highWaterMark(users, since, now);

    // First run on this device: we cannot tell who is new, so remember where
    // we are and announce nothing. Announcing the whole user base once would
    // be a spectacular way to introduce a feature.
    if (since == null) {
      await writeLastSeen(mark);
      return { ran: true, notified: 0, reason: 'first look' };
    }

    const fresh = pickNewSignups(users, since, now);
    await writeLastSeen(mark);
    if (!fresh.length) return { ran: true, notified: 0 };

    const summary = summariseSignups(fresh);
    if (!summary) return { ran: true, notified: 0 };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: summary.title,
        body: summary.body,
        data: { type: 'admin_new_signup', count: summary.count },
      },
      trigger: null,
    });
    return { ran: true, notified: summary.count };
  } catch (e) {
    if (__DEV__) console.warn('[NewSignups] check failed:', e?.message);
    return { ran: false, reason: 'lookup failed' };
  } finally {
    running = false;
  }
};

export default { checkForNewSignups, canSeeSignupAlerts, isEnabled };
