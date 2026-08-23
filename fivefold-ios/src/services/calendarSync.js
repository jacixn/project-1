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
import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from '../utils/userStorage';

const ENABLED_KEY = 'biblely_calendar_sync_enabled';
const CAL_ID_KEY = 'biblely_calendar_id';
const EVENTS_KEY = 'biblely_calendar_events'; // { `${ns}__...`: { id, recurring } }
// DEFAULT calendar-app alert lead time (minutes before). -1 = no alert,
// 0 = at start, N = N minutes before. Applies only to events whose item has no
// reminder lead time of its own (per-item notifyBefore always wins). Settable
// from Profile; default 10.
const ALARM_KEY = 'biblely_cal_alarm_min';
const CAL_NAME = 'Biblely';
const CAL_COLOR = '#32C372';

// Event length per domain (minutes).
const DURATION = { prayer: 30, reminder: 30, gym: 60, todo: 30 };

// Calendar alarm offsets from an item's reminder lead time (notifyBefore):
// negative -> no alarm (None), 0 -> at start, N -> N minutes before. Undefined
// (legacy items with no reminder field) returns undefined so reconcile keeps its
// 10-min-before default.
const alarmsFromNotify = (nb) => {
  const n = Number(nb);
  if (!Number.isFinite(n)) return undefined;
  if (n < 0) return [];
  return [{ relativeOffset: n === 0 ? 0 : -n }];
};

const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ENABLED_MIRROR_KEY = 'biblely_calendar_sync_enabled_global';
// Scoped flag first; if the scoped store isn't ready yet (cold start before
// the uid lands) fall back to the device-global mirror written on enable/
// disable, so the Settings toggle never shows Off for an enabled sync.
export const isEnabled = async () => {
  const scoped = await userStorage.getRaw(ENABLED_KEY);
  if (scoped === 'true' || scoped === 'false') return scoped === 'true';
  try { return (await AsyncStorage.getItem(ENABLED_MIRROR_KEY)) === 'true'; } catch { return false; }
};

export const getDefaultAlarmMinutes = async () => {
  const n = Number(await userStorage.getRaw(ALARM_KEY));
  return Number.isFinite(n) ? n : 10;
};

// Persist the new default and re-sync every domain so EXISTING calendar events
// without a per-item lead time pick up the change too.
export const setDefaultAlarmMinutes = async (minutes) => {
  await userStorage.setRaw(ALARM_KEY, String(minutes));
  await syncAll({ force: true });
};

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

// Prayers: simplePrayers array. Persistent prayers repeat DAILY (or one
// WEEKLY series per selected weekday when limited via days[]); one-time
// prayers are a single event today (skipped if already passed). Skip prayers
// with no/invalid time.
// Event notes carry what EyeCandy's My Week cannot see otherwise: the kind,
// and whether plans must leave it alone (pinned; fixed for template blocks).
const notesFor = (kind, pinned) => `Added by Biblely · ${kind}${pinned ? ' · pinned' : ''}`;

const buildPrayers = (list) => {
  const now = Date.now();
  const out = [];
  for (const p of list || []) {
    const t = parseTime(p && p.time);
    if (!t) continue;
    if (p.id == null) continue;
    const recurring = p.type !== 'one-time';
    // The prayer's own length (from the duration picker), falling back to the
    // domain default for legacy prayers that never had one.
    const durMs = (Number(p.duration) > 0 ? Number(p.duration) : DURATION.prayer) * 60000;
    // Weekday-limited recurring prayers mirror as one WEEKLY series per
    // selected day (same scheme as reminders); full-week prayers stay DAILY.
    const dayList = recurring && Array.isArray(p.days) && p.days.length > 0 && p.days.length < 7
      ? p.days
      : null;
    if (dayList) {
      for (const dayIdx of dayList) {
        if (dayIdx == null || dayIdx < 0 || dayIdx > 6) continue;
        const start = nextWeekdayDate(dayIdx, t.h, t.m);
        out.push({
          stableKey: `prayer__${p.id}__${dayIdx}`,
          title: p.name || 'Prayer',
          start,
          end: new Date(start.getTime() + durMs),
          recurring: true,
          frequency: Calendar.Frequency.WEEKLY,
          alarms: alarmsFromNotify(p.notifyBefore),
          notes: notesFor('prayer', p.pinned != null ? !!p.pinned : true),
        });
      }
      continue;
    }
    let start;
    if (recurring) {
      start = todayOrTomorrowAt(t.h, t.m);
    } else if (p.date) {
      const [y, mo, d] = String(p.date).split('-').map(Number);
      if (!y || !mo || !d) continue;
      start = new Date(y, mo - 1, d, t.h, t.m, 0, 0);
    } else {
      start = new Date(new Date().setHours(t.h, t.m, 0, 0));
    }
    if (!recurring && start.getTime() + durMs < now) continue;
    out.push({
      stableKey: `prayer__${p.id}`,
      title: p.name || 'Prayer',
      start,
      end: new Date(start.getTime() + durMs),
      recurring,
      frequency: recurring ? Calendar.Frequency.DAILY : null,
      alarms: alarmsFromNotify(p.notifyBefore),
      notes: notesFor('prayer', p.pinned != null ? !!p.pinned : true),
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
    // The reminder's own length (set by dragging), falling back to the domain
    // default for legacy reminders that never had a duration.
    const durMs = (Number(r.duration) > 0 ? Number(r.duration) : DURATION.reminder) * 60000;
    if (r.type === 'one-time' && r.date) {
      const start = localDateAt(r.date, t.h, t.m);
      if (!start || start.getTime() + durMs < now) continue;
      out.push({
        stableKey: `reminder__${r.id}`,
        title,
        start,
        end: new Date(start.getTime() + durMs),
        recurring: false,
        frequency: null,
        notes: notesFor('reminder', !!r.pinned),
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
          end: new Date(start.getTime() + durMs),
          recurring: true,
          frequency: Calendar.Frequency.WEEKLY,
          notes: notesFor('reminder', !!r.pinned),
          skipDates: Array.isArray(r.skipDates) ? r.skipDates : [],
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
    // The workout's own length (set when scheduling), falling back to 60 min.
    const durMs = (Number(s.duration) > 0 ? Number(s.duration) : DURATION.gym) * 60000;
    if (s.type === 'one-time' && s.date) {
      const start = localDateAt(s.date, t.h, t.m);
      if (!start || start.getTime() + durMs < now) continue;
      out.push({
        stableKey: `gym__${s.id}`,
        title,
        start,
        end: new Date(start.getTime() + durMs),
        recurring: false,
        frequency: null,
        alarms: alarmsFromNotify(s.notifyBefore),
        notes: notesFor('gym', !!s.pinned),
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
          end: new Date(start.getTime() + durMs),
          skipDates: Array.isArray(s.skipDates) ? s.skipDates : [],
          recurring: true,
          frequency: Calendar.Frequency.WEEKLY,
          alarms: alarmsFromNotify(s.notifyBefore),
          notes: notesFor('gym', !!s.pinned),
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

  // Setting-driven default for events with no per-item lead time. When the
  // user sets Calendar Alert to OFF, that is the whole story: no calendar
  // alarm on ANY event, per-item lead or not — otherwise Biblely's own
  // notification and the Calendar app's alert both fire (double ping).
  const defaultMin = await getDefaultAlarmMinutes();
  const calendarAlertsOff = Number.isFinite(defaultMin) && defaultMin < 0;
  const defaultAlarms = alarmsFromNotify(defaultMin) || [{ relativeOffset: -10 }];

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
      // Honor a per-event alarm (from the item's reminder lead time); domains
      // that don't specify one use the user's DEFAULT from Profile. An empty
      // array means no calendar alert fires.
      alarms: calendarAlertsOff ? [] : (d.alarms !== undefined ? d.alarms : defaultAlarms),
      notes: d.notes || 'Added by Biblely',
      ...(d.allDay ? { allDay: true } : {}),
      ...(d.recurring ? { recurrenceRule: { frequency: d.frequency } } : {}),
    };
    const entry = map[d.stableKey];
    const existingId = idOf(entry);
    const skips = (d.skipDates || []).slice().sort().join(',');
    const stamp = (id) => ({ id, recurring: d.recurring, start: d.start.getTime(), end: d.end.getTime(), title: d.title, skips, alarmsOff: calendarAlertsOff, notes: details.notes });
    if (existingId) {
      // Unchanged since we last wrote it: leave the event alone. Rewriting a
      // series would also wipe one-day edits made in the Calendar (EyeCandy's
      // My Week moving tonight's dinner).
      const same = !FORCE && entry && typeof entry === 'object' && entry.start === d.start.getTime() && entry.end === d.end.getTime() && entry.title === d.title && entry.skips === skips && (entry.notes || 'Added by Biblely') === details.notes && !!entry.alarmsOff === calendarAlertsOff;
      if (same) continue;
      try {
        await Calendar.updateEventAsync(existingId, details, d.recurring ? { futureEvents: true } : undefined);
        map[d.stableKey] = stamp(existingId);
        await dropSkippedInstances(existingId, d);
        continue;
      } catch {
        // Event was deleted out from under us; fall through to recreate.
      }
    }
    try {
      const newId = await Calendar.createEventAsync(calId, details);
      map[d.stableKey] = stamp(newId);
      await dropSkippedInstances(newId, d);
    } catch {}
  }

  await userStorage.set(EVENTS_KEY, map);
});

// A repeating reminder/workout moved or removed "just today" skips that date:
// take the matching occurrence out of the Calendar series too (the one-time
// copy, if any, is its own event). Dates within the next 90 days only.
const dropSkippedInstances = async (eventId, d) => {
  if (!d.recurring || !d.skipDates || !d.skipDates.length) return;
  const wd = d.start.getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const limit = today.getTime() + 90 * 86400000;
  for (const key of d.skipDates) {
    const inst = localDateAt(key, d.start.getHours(), d.start.getMinutes());
    if (!inst || inst.getDay() !== wd || inst.getTime() < today.getTime() || inst.getTime() > limit) continue;
    try { await Calendar.deleteEventAsync(eventId, { instanceStartDate: inst, futureEvents: false }); } catch {}
  }
};

// Force every event to be rewritten on the next sync (alarm setting changed).
let FORCE = false;

// ── per-domain entry points (called from each domain's storage setter) ──────────

// To-dos: only SCHEDULED ones (with a date+time) can be placed. Quick dateless
// to-dos and completed ones contribute nothing. 30-min timed block each.
const buildTodos = (list) => {
  const now = Date.now();
  const out = [];
  for (const t of list || []) {
    if (!t || t.id == null || t.completed) continue;
    let start = null;
    if (t.scheduledDateTime) {
      const d = new Date(t.scheduledDateTime); // ISO -> correct local instant
      if (!isNaN(d.getTime())) start = d;
    } else if (t.scheduledDate) {
      const [y, mo, dd] = String(t.scheduledDate).split('-').map(Number);
      if (y) start = new Date(y, mo - 1, dd, 9, 0, 0, 0); // date-only -> 9am default
    }
    if (!start) continue;
    const todoMs = (Number(t.durationMinutes) > 0 ? Number(t.durationMinutes) : DURATION.todo) * 60000;
    if (start.getTime() + todoMs < now) continue; // skip past
    out.push({
      stableKey: `todo__${t.id}`,
      notes: notesFor('todo', !!t.pinned),
      title: t.text || 'Task',
      start,
      end: new Date(start.getTime() + todoMs),
      recurring: false,
      frequency: null,
    });
  }
  return out;
};

export const syncPrayers = (list) => reconcile('prayer', buildPrayers(list || []));
export const syncReminders = (list) => reconcile('reminder', buildReminders(list || []));
export const syncGym = (list) => reconcile('gym', buildGym(list || []));
export const syncTodos = (list) => reconcile('todo', buildTodos(list || []));

// Day templates: the day's blocks (Work, Lunch...) as one-time events for the
// next three weeks, so EyeCandy and the Calendar app see the busy time and
// the free time. No alarms: a work block is not something to be pinged about.
// Key = date + block id, so a moved block on one day is adopted as that day's
// exception and a template edit rewrites every day cleanly.
export const BLOCK_HORIZON_DAYS = 21;
const buildBlocks = (templates, plan) => {
  const { blocksForDay } = require('../utils/dayTemplates');
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const now = Date.now();
  const { templateForDay } = require('../utils/dayTemplates');
  const { keepNotes } = require('../utils/takeover');
  for (let i = 0; i < BLOCK_HORIZON_DAYS; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const blocks = blocksForDay(templates, plan, key, d.getDay());
    // The day's name at the top of the Calendar day, and EyeCandy's way of
    // knowing the day is templated and what the template keeps.
    const t = templateForDay(templates, plan, key, d.getDay());
    if (t) {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
      out.push({ stableKey: `block__${key}~day`, title: `${t.name} day`, start, end, recurring: false, frequency: null, alarms: [], allDay: true, notes: keepNotes(blocks.map((b) => b.title)) });
    }
    for (const b of blocks) {
      if (b.source) continue; // the user's own calendar event already is this block
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, b.startMin, 0, 0);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, b.endMin, 0, 0);
      if (end.getTime() < now) continue;
      // "fixed" in the notes tells EyeCandy's planner to leave work alone too
      out.push({ stableKey: `block__${key}~${b.blockId}`, title: b.title, start, end, recurring: false, frequency: null, alarms: [], notes: b.fixed ? 'Added by Biblely · block · fixed' : 'Added by Biblely · block' });
    }
  }
  return out;
};
export const syncBlocks = async () => {
  try {
    const dt = require('./dayTemplates');
    const [templates, plan] = await Promise.all([dt.getTemplates(), dt.getPlan()]);
    await reconcile('block', buildBlocks(templates, plan));
  } catch {}
};

// Backfill every domain from its current stored data (used on enable + cloud pull).
export const syncAll = async ({ force = false } = {}) => {
  FORCE = !!force;
  try {
    const { getStoredData } = require('../utils/localStorage');
    const reminderService = require('./reminderService');
    const WorkoutService = require('./workoutService').default;

    const prayers = (await getStoredData('simplePrayers')) || [];
    const reminders = await reminderService.loadReminders();
    const scheduled = await WorkoutService.getScheduledWorkouts();
    const todos = (await getStoredData('todos')) || [];

    await syncPrayers(prayers);
    await syncReminders(reminders);
    await syncGym(scheduled);
    await syncTodos(todos);
    await syncBlocks();
  } catch {}
  FORCE = false;
};

// ── Two-way: adopt what EyeCandy's My Week (or the Calendar app) did to our
// events. Each map entry remembers the start/end we wrote; an event whose
// start or end differs, or an occurrence that moved or vanished, was changed
// elsewhere, so the prayer/reminder/workout/task follows instead of the
// next sync snapping the event back.
const parseKey = (key) => {
  const parts = String(key).split('__');
  if (parts.length < 2) return null;
  return { ns: parts[0], id: parts[1], dayIdx: parts.length > 2 ? Number(parts[2]) : null };
};
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const keyOfDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Apply one change to the thing that owns it. { ns, id, dayIdx } + what.
const applyAdoption = async ({ ns, id }, change) => {
  const { getStoredData, saveData } = require('../utils/localStorage');
  if (ns === 'reminder') {
    const rs = require('./reminderService');
    if (change.kind === 'series') return !!(await rs.updateReminder(id, { time: change.time, ...(change.date ? { date: change.date } : {}) }));
    if (change.kind === 'today') return !!(await rs.moveReminderForDay(id, { from: change.from, to: change.to || change.from, time: change.time }));
    if (change.kind === 'skip') return !!(await rs.skipReminderDay(id, change.from));
    if (change.kind === 'gone') { await rs.deleteReminder(id); return true; }
  }
  if (ns === 'gym') {
    const WorkoutService = require('./workoutService').default;
    const wx = require('./workoutExceptions');
    if (change.kind === 'series') { const saved = await WorkoutService.updateScheduledWorkout(id, { time: change.time, ...(change.date ? { date: change.date } : {}) }); try { await require('./workoutSchedule').scheduleWorkoutNotifications(saved); } catch {} return !!saved; }
    if (change.kind === 'today') return !!(await wx.moveWorkoutForDay(id, { from: change.from, to: change.to || change.from, time: change.time }));
    if (change.kind === 'skip') return !!(await wx.skipWorkoutDay(id, change.from));
    if (change.kind === 'gone') { await WorkoutService.deleteScheduledWorkout(id); return true; }
  }
  if (ns === 'prayer') {
    const ps = require('./simplePrayersService');
    if (change.kind === 'series') { await ps.updatePrayer(id, { time: change.time, ...(change.date ? { date: change.date } : {}) }); return true; }
    if (change.kind === 'gone') { await ps.deletePrayerById(id); return true; }
    return false; // no per-day exceptions for prayers
  }
  if (ns === 'block') {
    // id = "<date>~<blockId>": a block moved in the Calendar (or EyeCandy's
    // My Week) becomes that day's exception; deleted = skipped that day.
    const [dateKey, blockId] = String(id).split('~');
    if (!dateKey || !blockId) return false;
    if (blockId === 'day') return false; // the day's name marker: not a block, the next sync restores it
    const dt = require('./dayTemplates');
    if (change.kind === 'gone') { await dt.skipBlockForDay(dateKey, blockId); return true; }
    if (change.kind === 'series' || change.kind === 'today') {
      const [hh, mm] = String(change.time).split(':').map(Number);
      const startMin = hh * 60 + mm;
      const [eh, em] = String(change.end || '').split(':').map(Number);
      const endMin = Number.isFinite(eh) && Number.isFinite(em) && eh * 60 + em > startMin ? eh * 60 + em : startMin + (change.minutes > 0 ? change.minutes : 30);
      if (change.date && change.date !== dateKey) {
        // Dragged to another day: skip it here, nothing to move it onto there.
        await dt.skipBlockForDay(dateKey, blockId);
        return true;
      }
      await dt.moveBlockForDay(dateKey, blockId, { startMin, endMin });
      return true;
    }
    return false;
  }
  if (ns === 'todo') {
    const todos = (await getStoredData('todos')) || [];
    const idx = todos.findIndex((t) => String(t.id) === String(id));
    if (idx < 0) return false;
    if (change.kind === 'gone') todos.splice(idx, 1);
    else {
      const date = change.date || todos[idx].scheduledDate;
      const [y, m, d] = String(date).split('-').map(Number); const [hh, mm] = change.time.split(':').map(Number);
      todos[idx] = { ...todos[idx], scheduledDate: date, scheduledTime: change.time, scheduledDateTime: new Date(y, m - 1, d, hh, mm, 0, 0).toISOString() };
    }
    await saveData('todos', todos);
    try { require('./userSyncService').pushToCloud('todos', todos); } catch {}
    try { require('react-native').DeviceEventEmitter.emit('todosChanged'); } catch {}
    return true;
  }
  return false;
};

let adopting = null;
// Resolves to the list of adopted changes [{ title, kind, time, date }].
export const adoptCalendarChanges = () => {
  if (adopting) return adopting;
  adopting = (async () => {
    if (!userStorage.getCurrentUid()) return [];
    if (!(await isEnabled())) return [];
    try { const perm = await Calendar.getCalendarPermissionsAsync(); if (!perm.granted) return []; } catch { return []; }
    const calId = await ensureCalendar();
    if (!calId) return [];
    const map = (await userStorage.get(EVENTS_KEY)) || {};
    const adopted = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 14 * 86400000);
    let instances = null; // occurrences in the next two weeks, by master id
    const occurrencesOf = async (id) => {
      if (!instances) {
        instances = new Map();
        try {
          for (const e of (await Calendar.getEventsAsync([calId], today, horizon)) || []) {
            if (!e || !e.id) continue;
            if (!instances.has(e.id)) instances.set(e.id, []);
            instances.get(e.id).push(e);
          }
        } catch {}
      }
      return instances.get(id) || [];
    };
    // Items whose skipDates we already know about (our own just-today moves).
    const skipsOf = (entry) => new Set(String(entry.skips || '').split(',').filter(Boolean));

    for (const [key, entry] of Object.entries(map)) {
      if (!entry || typeof entry !== 'object' || !entry.id || entry.start == null) continue;
      const k = parseKey(key);
      if (!k) continue;
      let ev = null;
      try { ev = await Calendar.getEventAsync(entry.id); } catch { ev = null; }
      if (!ev || !ev.startDate) {
        // The whole event is gone from a calendar that still exists: removed elsewhere.
        if (entry.recurring) continue; // a series vanishing is not a user action we can read
        if (await applyAdoption(k, { kind: 'gone' })) { adopted.push({ title: entry.title, kind: 'gone' }); delete map[key]; }
        continue;
      }
      const evStart = new Date(ev.startDate);
      const startChanged = Math.abs(evStart.getTime() - entry.start) >= 60000;
      const evEnd = ev.endDate ? new Date(ev.endDate) : null;
      const endChanged = !!(evEnd && entry.end != null && Math.abs(evEnd.getTime() - entry.end) >= 60000);
      if (!entry.recurring) {
        // Blocks also follow a length change (work shortened in the Calendar).
        if (!startChanged && !(k.ns === 'block' && endChanged)) continue;
        const change = { kind: 'series', time: hhmm(evStart), date: keyOfDate(evStart), ...(evEnd ? { end: hhmm(evEnd), minutes: Math.round((evEnd.getTime() - evStart.getTime()) / 60000) } : {}) };
        if (await applyAdoption(k, change)) { adopted.push({ title: entry.title, kind: 'moved', time: change.time, date: change.date }); map[key] = { ...entry, start: evStart.getTime(), end: ev.endDate ? new Date(ev.endDate).getTime() : entry.end }; }
        continue;
      }
      // Repeating: the master moved = every week; an occurrence that moved or
      // vanished = this day only.
      if (startChanged) {
        const change = { kind: 'series', time: hhmm(evStart) };
        if (await applyAdoption(k, change)) { adopted.push({ title: entry.title, kind: 'moved', time: change.time, every: true }); map[key] = { ...entry, start: evStart.getTime(), end: ev.endDate ? new Date(ev.endDate).getTime() : entry.end }; }
        continue;
      }
      const expectTime = hhmm(new Date(entry.start));
      const known = skipsOf(entry);
      const occ = await occurrencesOf(entry.id);
      // Moved occurrences (detached in the Calendar): the original date is
      // skipped on the series, a one-time copy takes the new day and time.
      const present = new Set();
      for (const o of occ) {
        const os = new Date(o.startDate);
        const orig = o.originalStartDate ? new Date(o.originalStartDate) : os;
        const fromKey = keyOfDate(orig); const toKey = keyOfDate(os);
        present.add(fromKey);
        if (hhmm(os) === expectTime && fromKey === toKey) continue;
        if (known.has(fromKey)) continue;
        const change = { kind: 'today', from: fromKey, to: toKey, time: hhmm(os) };
        // Take the detached occurrence out first; our sync recreates the day as a one-time copy.
        try { await Calendar.deleteEventAsync(entry.id, { instanceStartDate: os, futureEvents: false }); }
        catch { try { await Calendar.deleteEventAsync(entry.id, { instanceStartDate: orig, futureEvents: false }); } catch {} }
        if (await applyAdoption(k, change)) adopted.push({ title: entry.title, kind: 'moved', time: change.time, date: toKey, today: true });
      }
      // Missing occurrences on expected weekdays = removed for that day.
      for (let i = 0; i < 14; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        if (d.getDay() !== k.dayIdx) continue;
        const dateKey = keyOfDate(d);
        if (d.getTime() < new Date(entry.start).setHours(0, 0, 0, 0)) continue; // before the series began
        if (present.has(dateKey) || known.has(dateKey)) continue;
        if (await applyAdoption(k, { kind: 'skip', from: dateKey })) adopted.push({ title: entry.title, kind: 'skipped', date: dateKey });
      }
    }
    if (adopted.length) {
      await userStorage.set(EVENTS_KEY, map);
      try { require('react-native').DeviceEventEmitter.emit('calendarAdopted', adopted); } catch {}
    }
    return adopted;
  })().catch(() => []).finally(() => { adopting = null; });
  return adopting;
};

// The event notes format changed (kind + pin for EyeCandy). One full pass
// per device rewrites the events whose notes differ; later runs are no-ops.
const NOTES_VERSION_KEY = 'biblely_calendar_notes_v2';
export const ensureNotesVersion = async () => {
  try {
    if (!userStorage.getCurrentUid()) return;
    if (await userStorage.get(NOTES_VERSION_KEY)) return;
    if (!(await isEnabled())) return;
    await syncAll();
    await userStorage.set(NOTES_VERSION_KEY, Date.now());
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
  try { await AsyncStorage.setItem(ENABLED_MIRROR_KEY, 'true'); } catch {}
  const calId = await ensureCalendar();
  console.log('[calSync] enable: calId =', calId);
  if (!calId) { await userStorage.setRaw(ENABLED_KEY, 'false'); try { await AsyncStorage.setItem(ENABLED_MIRROR_KEY, 'false'); } catch {} return false; }
  await syncAll();
  console.log('[calSync] enable: success');
  return true;
};

// Turn it off: delete every event we created (and the calendar itself).
export const disable = async () => {
  await userStorage.setRaw(ENABLED_KEY, 'false');
  try { await AsyncStorage.setItem(ENABLED_MIRROR_KEY, 'false'); } catch {}
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
  syncTodos,
  syncAll,
  adoptCalendarChanges,
  getDefaultAlarmMinutes,
  setDefaultAlarmMinutes,
};
