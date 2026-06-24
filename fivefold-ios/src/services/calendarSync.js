// One-way mirror of Biblely's prayers, reminders, and scheduled workouts into
// the user's iPhone Calendar. Modeled on EyeCandy's calendarSync: a single
// dedicated "Biblely" calendar, a Settings toggle, and a reconciliation map so
// edits/deletes propagate. Each domain hooks its own storage setter and calls
// the matching sync entry point; everything no-ops unless the user turned the
// feature on in Settings and granted calendar access.
//
// All sync-state keys are UID-scoped via userStorage and namespaced biblely_*
// (never share keys across apps). The three domains share ONE calendar and ONE
// events map, keyed by namespaced stableKeys, so they reconcile independently
// without clobbering each other.
import * as Calendar from 'expo-calendar';
import userStorage from '../utils/userStorage';

const ENABLED_KEY = 'biblely_calendar_sync_enabled';
const CAL_ID_KEY = 'biblely_calendar_id';
const EVENTS_KEY = 'biblely_calendar_events'; // { `${ns}__...`: { id, recurring } }
const CAL_NAME = 'Biblely';
const CAL_COLOR = '#32C372';

// Event length per domain (minutes).
const DURATION = { prayer: 30, reminder: 30, gym: 60 };

const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isEnabled = async () => (await userStorage.getRaw(ENABLED_KEY)) === 'true';

export const requestPermission = async () => {
  try {
    const res = await Calendar.requestCalendarPermissionsAsync();
    console.log('[calSync] requestCalendarPermissionsAsync ->', JSON.stringify(res));
    return !!res.granted;
  } catch (e) {
    console.log('[calSync] requestPermission error:', e?.message || e);
    return false;
  }
};

// ── time helpers ──────────────────────────────────────────────────────────────

// Parse "HH:mm" (e.g. "08:00", "7:30") or padded "HHMM". Mirrors the tolerant
// parsing in notificationService.normalizePrayerTime. Returns {h,m} or null.
const parseTime = (t) => {
  if (!t || typeof t !== 'string') return null;
  const trimmed = t.trim();
  let h, m;
  if (trimmed.includes(':')) {
    [h, m] = trimmed.split(':').map((n) => parseInt(n, 10));
  } else {
    const p = trimmed.padStart(4, '0');
    h = parseInt(p.slice(0, 2), 10);
    m = parseInt(p.slice(2, 4), 10);
  }
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
};

// Today at h:m local; if already passed, the same time tomorrow.
const todayOrTomorrowAt = (h, m) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
};

// Next date (today or later) that falls on weekdayIdx (0=Sun), at h:m local.
const nextWeekdayDate = (weekdayIdx, h, m) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  let add = (weekdayIdx - d.getDay() + 7) % 7;
  if (add === 0 && d.getTime() < now.getTime()) add = 7; // today but already passed
  d.setDate(d.getDate() + add);
  return d;
};

// Parse "YYYY-MM-DD" with the LOCAL constructor (NOT Date.parse, which treats it
// as UTC and causes an off-by-one for users behind UTC).
const localDateAt = (dateStr, h, m) => {
  if (!ISO_DATE_RE.test(dateStr || '')) return null;
  const [y, mo, dd] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, dd, h, m, 0, 0);
};

// ── desired-event builders (one per domain) ─────────────────────────────────────

// Prayers: simplePrayers array. Persistent prayers repeat DAILY; one-time
// prayers are a single event today (skipped if already passed). Skip prayers
// with no/invalid time.
const buildPrayers = (list) => {
  const now = Date.now();
  const out = [];
  for (const p of list || []) {
    const t = parseTime(p && p.time);
    if (!t) continue;
    if (p.id == null) continue;
    const recurring = p.type !== 'one-time';
    const start = recurring ? todayOrTomorrowAt(t.h, t.m) : new Date(new Date().setHours(t.h, t.m, 0, 0));
    if (!recurring && start.getTime() + DURATION.prayer * 60000 < now) continue;
    out.push({
      stableKey: `prayer__${p.id}`,
      title: p.name || 'Prayer',
      start,
      end: new Date(start.getTime() + DURATION.prayer * 60000),
      recurring,
      frequency: recurring ? Calendar.Frequency.DAILY : null,
    });
  }
  return out;
};

// Reminders: user_reminders array. Disabled reminders contribute nothing (so
// toggling one off removes its events). Recurring reminders emit one WEEKLY
// series per selected weekday; one-time reminders use their date.
const buildReminders = (list) => {
  const now = Date.now();
  const out = [];
  for (const r of list || []) {
    if (!r || !r.enabled || r.id == null) continue;
    const t = parseTime(r.time);
    if (!t) continue;
    const title = r.title || 'Reminder';
    if (r.type === 'one-time' && r.date) {
      const start = localDateAt(r.date, t.h, t.m);
      if (!start || start.getTime() + DURATION.reminder * 60000 < now) continue;
      out.push({
        stableKey: `reminder__${r.id}`,
        title,
        start,
        end: new Date(start.getTime() + DURATION.reminder * 60000),
        recurring: false,
        frequency: null,
      });
    } else {
      const days = Array.isArray(r.days) && r.days.length ? r.days : [0, 1, 2, 3, 4, 5, 6];
      for (const dayIdx of days) {
        if (dayIdx == null || dayIdx < 0 || dayIdx > 6) continue;
        const start = nextWeekdayDate(dayIdx, t.h, t.m);
        out.push({
          stableKey: `reminder__${r.id}__${dayIdx}`,
          title,
          start,
          end: new Date(start.getTime() + DURATION.reminder * 60000),
          recurring: true,
          frequency: Calendar.Frequency.WEEKLY,
        });
      }
    }
  }
  return out;
};

// Gym: scheduledWorkouts array. Same shape as reminders (recurring days[] or a
// one-time date), 60-min events titled after the template.
const buildGym = (list) => {
  const now = Date.now();
  const out = [];
  for (const s of list || []) {
    if (!s || s.id == null) continue;
    const t = parseTime(s.time);
    if (!t) continue;
    const title = s.templateName || 'Workout';
    if (s.type === 'one-time' && s.date) {
      const start = localDateAt(s.date, t.h, t.m);
      if (!start || start.getTime() + DURATION.gym * 60000 < now) continue;
      out.push({
        stableKey: `gym__${s.id}`,
        title,
        start,
        end: new Date(start.getTime() + DURATION.gym * 60000),
        recurring: false,
        frequency: null,
      });
    } else {
      const days = Array.isArray(s.days) ? s.days : [];
      for (const dayIdx of days) {
        if (dayIdx == null || dayIdx < 0 || dayIdx > 6) continue;
        const start = nextWeekdayDate(dayIdx, t.h, t.m);
        out.push({
          stableKey: `gym__${s.id}__${dayIdx}`,
          title,
          start,
          end: new Date(start.getTime() + DURATION.gym * 60000),
          recurring: true,
          frequency: Calendar.Frequency.WEEKLY,
        });
      }
    }
  }
  return out;
};

// ── calendar plumbing ───────────────────────────────────────────────────────

// Find or create the dedicated "Biblely" calendar; returns its id (or null).
export const ensureCalendar = async () => {
  let cals = [];
  try { cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT); }
  catch (e) { console.log('[calSync] getCalendarsAsync error:', e?.message || e); return null; }

  const savedId = await userStorage.getRaw(CAL_ID_KEY);
  if (savedId && cals.some((c) => c.id === savedId)) return savedId;

  const byName = cals.find((c) => c.title === CAL_NAME);
  if (byName) { await userStorage.setRaw(CAL_ID_KEY, byName.id); return byName.id; }

  let source;
  try { source = (await Calendar.getDefaultCalendarAsync())?.source; }
  catch (e) { console.log('[calSync] getDefaultCalendarAsync error:', e?.message || e); }
  if (!source) source = (cals.find((c) => c.allowsModifications && c.source) || {}).source;
  console.log('[calSync] ensureCalendar source:', source ? JSON.stringify({ id: source.id, type: source.type, name: source.name }) : 'NONE');

  try {
    const id = await Calendar.createCalendarAsync({
      title: CAL_NAME,
      color: CAL_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      name: CAL_NAME,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
      ...(source ? { sourceId: source.id, source } : {}),
    });
    await userStorage.setRaw(CAL_ID_KEY, id);
    return id;
  } catch (e) {
    console.log('[calSync] createCalendarAsync error:', e?.message || e);
    return null;
  }
};

// Serialize all reconciles: the three domains share one events map, so concurrent
// read-modify-write would clobber it.
let chain = Promise.resolve();
const serialize = (fn) => {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
};

// Reconcile only one namespace's events against `desired`, leaving the other
// domains' entries in the shared map untouched.
const reconcile = (namespace, desired) => serialize(async () => {
  if (!userStorage.getCurrentUid()) return;
  if (!(await isEnabled())) return;
  try {
    const perm = await Calendar.getCalendarPermissionsAsync();
    if (!perm.granted) return;
  } catch { return; }

  const calId = await ensureCalendar();
  if (!calId) return;

  const prefix = `${namespace}__`;
  const desiredByKey = new Map(desired.map((d) => [d.stableKey, d]));
  const map = (await userStorage.get(EVENTS_KEY)) || {};

  const idOf = (e) => (typeof e === 'string' ? e : e && e.id);
  const isRecurring = (e) => (typeof e === 'object' && e ? !!e.recurring : false);

  // Remove events in this namespace that are no longer desired. Recurring events
  // need futureEvents:true to drop the whole series. Keep the map entry if the
  // delete fails so we retry next sync rather than orphaning it.
  for (const key of Object.keys(map)) {
    if (!key.startsWith(prefix)) continue;
    if (!desiredByKey.has(key)) {
      try {
        await Calendar.deleteEventAsync(idOf(map[key]), isRecurring(map[key]) ? { futureEvents: true } : undefined);
        delete map[key];
      } catch {}
    }
  }

  // Create or update the rest.
  for (const d of desired) {
    const details = {
      title: d.title,
      startDate: d.start,
      endDate: d.end,
      alarms: [{ relativeOffset: -10 }],
      notes: 'Added by Biblely',
      ...(d.recurring ? { recurrenceRule: { frequency: d.frequency } } : {}),
    };
    const existingId = idOf(map[d.stableKey]);
    if (existingId) {
      try {
        await Calendar.updateEventAsync(existingId, details, d.recurring ? { futureEvents: true } : undefined);
        map[d.stableKey] = { id: existingId, recurring: d.recurring };
        continue;
      } catch {
        // Event was deleted out from under us; fall through to recreate.
      }
    }
    try {
      const newId = await Calendar.createEventAsync(calId, details);
      map[d.stableKey] = { id: newId, recurring: d.recurring };
    } catch {}
  }

  await userStorage.set(EVENTS_KEY, map);
});

// ── per-domain entry points (called from each domain's storage setter) ──────────

export const syncPrayers = (list) => reconcile('prayer', buildPrayers(list || []));
export const syncReminders = (list) => reconcile('reminder', buildReminders(list || []));
export const syncGym = (list) => reconcile('gym', buildGym(list || []));

// Backfill every domain from its current stored data (used on enable + cloud pull).
export const syncAll = async () => {
  try {
    const { getStoredData } = require('../utils/localStorage');
    const reminderService = require('./reminderService');
    const WorkoutService = require('./workoutService').default;

    const prayers = (await getStoredData('simplePrayers')) || [];
    const reminders = await reminderService.loadReminders();
    const scheduled = await WorkoutService.getScheduledWorkouts();

    await syncPrayers(prayers);
    await syncReminders(reminders);
    await syncGym(scheduled);
  } catch {}
};

// Turn the feature on: ask permission, make the calendar, backfill everything.
export const enable = async () => {
  const uid = userStorage.getCurrentUid();
  console.log('[calSync] enable: uid =', uid);
  if (!uid) return false;
  const granted = await requestPermission();
  console.log('[calSync] enable: granted =', granted);
  if (!granted) return false;
  await userStorage.setRaw(ENABLED_KEY, 'true');
  const calId = await ensureCalendar();
  console.log('[calSync] enable: calId =', calId);
  if (!calId) { await userStorage.setRaw(ENABLED_KEY, 'false'); return false; }
  await syncAll();
  console.log('[calSync] enable: success');
  return true;
};

// Turn it off: delete every event we created (and the calendar itself).
export const disable = async () => {
  await userStorage.setRaw(ENABLED_KEY, 'false');
  const map = (await userStorage.get(EVENTS_KEY)) || {};
  for (const key of Object.keys(map)) {
    const entry = map[key];
    const id = typeof entry === 'string' ? entry : entry && entry.id;
    const recurring = typeof entry === 'object' && entry && entry.recurring;
    try { await Calendar.deleteEventAsync(id, recurring ? { futureEvents: true } : undefined); } catch {}
  }
  await userStorage.set(EVENTS_KEY, {});
  try {
    const calId = await userStorage.getRaw(CAL_ID_KEY);
    if (calId) await Calendar.deleteCalendarAsync(calId);
  } catch {}
  await userStorage.setRaw(CAL_ID_KEY, '');
};

export default {
  isEnabled,
  enable,
  disable,
  requestPermission,
  ensureCalendar,
  syncPrayers,
  syncReminders,
  syncGym,
  syncAll,
};
