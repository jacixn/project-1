// Everything on one day, from every source, as one list:
//   prayers, reminders, tasks, scheduled workouts (Biblely's own data),
//   EyeCandy's calendars and any other iPhone calendar (read through
//   expo-calendar; Biblely's own mirror calendar is skipped so nothing
//   shows twice). Each item: { id, kind, title, startMin, endMin, color,
//   icon, movable, raw }. The agenda builder below is pure.
import * as Calendar from 'expo-calendar';
import WorkoutService from '../services/workoutService';
import { getPrayers } from '../services/simplePrayersService';
import { loadReminders, getRemindersForDay } from '../services/reminderService';
import { isPrayerDayEnabled } from './prayerDays';
import { minutesOf, dateKeyOf } from './dayBusy';
import { getStoredData } from './localStorage';
import { workoutsOnDay } from './workoutDays';
import { applyCalendarPins } from '../services/pins';
import { getBlocksForDay } from '../services/dayTemplates';

// Colour = where it comes from, matching how the iPhone Calendar shows the
// same items: Biblely green (three close shades so the legend still tells
// prayers, reminders and workouts apart), EyeCandy purple, EyeCandy sports
// orange, and every other iPhone calendar keeps its own colour.
export const KINDS = {
  prayer: { label: 'Prayer', color: '#34C759', icon: 'favorite' },
  reminder: { label: 'Reminder', color: '#30D158', icon: 'notifications' },
  task: { label: 'Task', color: '#2DC46B', icon: 'check-circle' },
  gym: { label: 'Workout', color: '#4CD964', icon: 'fitness-center' },
  block: { label: 'Day plan', color: '#5AC8FA', icon: 'schedule' },
  eyecandy: { label: 'EyeCandy', color: '#7C5CFF', icon: 'movie' },
  eyecandySports: { label: 'EyeCandy Sports', color: '#FF9500', icon: 'sports-soccer' },
  calendar: { label: 'Calendar', color: '#D946EF', icon: 'event' },
};
export const KIND_ORDER = ['block', 'prayer', 'reminder', 'task', 'gym', 'eyecandy', 'eyecandySports', 'calendar'];
// Tasks have no length of their own; 30 min matches the Calendar mirror.
export const TASK_MINUTES = 30;

const BIBLELY_CAL = 'Biblely';
const DAY_MIN = 24 * 60;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const fmtClock = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};
export const fmtDur = (min) => {
  const n = Math.max(0, Math.round(min));
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};
export const minToTime = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// 'every day' | 'weekdays' | 'Mon, Fri' | 'one-time'
export const patternOf = (raw) => {
  if (!raw) return '';
  if (raw.type === 'one-time') return 'one-time';
  const days = [...new Set(Array.isArray(raw.days) ? raw.days : [])].sort((a, b) => a - b);
  if (!days.length || days.length === 7) return 'every day';
  if (days.join() === '1,2,3,4,5') return 'weekdays';
  if (days.join() === '0,6') return 'weekends';
  return days.map((d) => DAY_SHORT[d]).join(', ');
};

const mk = (kind, id, title, startMin, minutes, raw, extra = {}) => {
  if (startMin == null) return null;
  const dur = Math.max(1, Number(minutes) || 0);
  return {
    id: `${kind}:${id}`,
    kind,
    title: title || KINDS[kind].label,
    startMin,
    endMin: clamp(startMin + dur, startMin + 1, DAY_MIN),
    color: extra.color || KINDS[kind].color,
    icon: extra.icon || KINDS[kind].icon,
    movable: kind === 'prayer' || kind === 'reminder' || kind === 'task' || kind === 'gym' || kind === 'block',
    subtitle: extra.subtitle || '',
    raw,
  };
};

export const loadDayItems = async (date) => {
  const out = [];
  const key = dateKeyOf(date);
  const dow = date.getDay();

  try {
    for (const p of await getPrayers()) {
      if (!p || !p.time) continue;
      const on = p.type === 'one-time' ? p.date === key : isPrayerDayEnabled(p, date);
      if (!on) continue;
      out.push(mk('prayer', p.id, p.name || 'Prayer', minutesOf(p.time), Number(p.duration) > 0 ? p.duration : 5, { ...p, pinned: p.pinned != null ? !!p.pinned : true }, { subtitle: patternOf(p) }));
    }
  } catch {}

  try {
    for (const r of getRemindersForDay(await loadReminders(), dow, key)) {
      out.push(mk('reminder', r.id, r.title || 'Reminder', minutesOf(r.time), Number(r.duration) > 0 ? r.duration : 30, r, { icon: r.icon || KINDS.reminder.icon, subtitle: patternOf(r) }));
    }
  } catch {}

  try {
    for (const s of workoutsOnDay(await WorkoutService.getScheduledWorkouts(), key, dow)) {
      out.push(mk('gym', s.id, s.templateName || 'Workout', minutesOf(s.time), Number(s.duration) > 0 ? s.duration : 60, s, { subtitle: patternOf(s) }));
    }
  } catch {}

  // Day template blocks (Work, Lunch...). Fixed blocks never move in a
  // plan; the rest may give way for one day.
  try {
    for (const b of await getBlocksForDay(date)) {
      out.push(mk('block', `${key}~${b.blockId}`, b.title, b.startMin, b.endMin - b.startMin, { ...b, dateKey: key, pinned: !!b.fixed }, { icon: b.icon, subtitle: b.moved ? `${b.templateName} · moved today` : b.templateName }));
    }
  } catch {}

  // To-do tasks with a date and time (To Do tab). Done ones drop off.
  try {
    for (const t of (await getStoredData('todos')) || []) {
      if (!t || t.completed || t.scheduledDate !== key || !t.scheduledTime) continue;
      out.push(mk('task', t.id, t.text || 'Task', minutesOf(t.scheduledTime), Number(t.durationMinutes) > 0 ? t.durationMinutes : TASK_MINUTES, { ...t, type: 'one-time', date: t.scheduledDate, time: t.scheduledTime }, { subtitle: 'Task' }));
    }
  } catch {}

  try {
    let perm = await Calendar.getCalendarPermissionsAsync();
    if (!perm.granted && perm.status === 'undetermined') perm = await Calendar.requestCalendarPermissionsAsync();
    if (perm.granted) {
      const cals = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)) || [];
      const byId = {};
      for (const c of cals) byId[c.id] = c;
      const ids = cals.filter((c) => c.title !== BIBLELY_CAL).map((c) => c.id);
      if (ids.length) {
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        const raw = await Calendar.getEventsAsync(ids, dayStart, dayEnd);
        for (const e of raw || []) {
          if (!e || e.allDay) continue;
          const cal = byId[e.calendarId] || {};
          const isEyeCandy = /^eyecandy/i.test(cal.title || '');
          const isSports = isEyeCandy && /sport/i.test(cal.title || '');
          // A tracked release pinned to its official time (EyeCandy writes it
          // into the event notes): shown, never moved, like a kick-off.
          const isOfficial = isEyeCandy && /official release time/i.test(e.notes || '');
          const mediaType = isEyeCandy ? ((/type:(movie|tv|anime|game|music|manga|book|comic|sports)\b/i.exec(e.notes || '') || [])[1] || '').toLowerCase() : '';
          const kind = isSports ? 'eyecandySports' : isEyeCandy ? 'eyecandy' : 'calendar';
          const s = new Date(e.startDate);
          const en = new Date(e.endDate);
          const startMin = clamp(s < dayStart ? 0 : s.getHours() * 60 + s.getMinutes(), 0, DAY_MIN);
          const endMin = clamp(en > dayEnd ? DAY_MIN : en.getHours() * 60 + en.getMinutes(), startMin + 1, DAY_MIN);
          out.push({
            id: `cal:${e.id}`,
            kind,
            title: e.title || 'Busy',
            startMin,
            endMin,
            // Other calendars keep their own colour (Work magenta, etc.), like iOS
            color: kind === 'calendar' ? (cal.color || KINDS.calendar.color) : KINDS[kind].color,
            icon: KINDS[kind].icon,
            // Writable calendars (EyeCandy's, your own) can be moved right here:
            // the event is changed in the iPhone Calendar and EyeCandy adopts
            // the new time when it next opens. Subscribed/read-only ones cannot,
            // and neither can sports fixtures: kick-off is set by the league.
            movable: !!cal.allowsModifications && !isSports && !isOfficial,
            subtitle: isEyeCandy ? (cal.title || 'EyeCandy') : (cal.title || 'Calendar'),
            raw: {
              calendar: true,
              official: isOfficial,
              mediaType,
              eventId: e.id,
              calendarTitle: cal.title,
              startDate: s.toISOString(),
              endDate: en.toISOString(),
              recurring: !!e.recurrenceRule,
              type: e.recurrenceRule ? 'recurring' : 'one-time',
            },
          });
        }
      }
    }
  } catch {}

  // Pins for things Biblely does not own (other calendars, EyeCandy slots).
  try { await applyCalendarPins(out); } catch {}
  return out.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
};

// ---- pure ----------------------------------------------------------------

// Chronological rows with the free stretches between items called out:
//   { type: 'item', item } | { type: 'free', startMin, endMin, label }
export const buildAgenda = (items, { minGap = 30, dayStart = 5 * 60, dayEnd = 23 * 60 } = {}) => {
  const list = (items || []).slice().sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const rows = [];
  let cursor = dayStart;
  for (const it of list) {
    // Gaps only between items and after the last one; the morning before the
    // first thing is not a "free stretch" anyone plans around.
    if (rows.length && it.startMin - cursor >= minGap) {
      rows.push({ type: 'free', startMin: cursor, endMin: it.startMin, label: `${fmtDur(it.startMin - cursor)} free` });
    }
    rows.push({ type: 'item', item: it });
    cursor = Math.max(cursor, it.endMin);
  }
  if (list.length && dayEnd - cursor >= minGap) rows.push({ type: 'free', startMin: cursor, endMin: dayEnd, label: `${fmtDur(dayEnd - cursor)} free` });
  return rows;
};

export const countByKind = (items) => {
  const out = {};
  for (const k of KIND_ORDER) out[k] = 0;
  for (const it of items || []) out[it.kind] = (out[it.kind] || 0) + 1;
  return out;
};

export const busyMinutes = (items) => {
  const spans = (items || []).map((i) => [i.startMin, i.endMin]).sort((a, b) => a[0] - b[0]);
  let total = 0; let cur = null;
  for (const [s, e] of spans) {
    if (!cur || s > cur[1]) { if (cur) total += cur[1] - cur[0]; cur = [s, e]; }
    else cur[1] = Math.max(cur[1], e);
  }
  if (cur) total += cur[1] - cur[0];
  return total;
};

export const daySummary = (items) => {
  const n = (items || []).length;
  if (!n) return 'Nothing scheduled';
  const first = items.slice().sort((a, b) => a.startMin - b.startMin)[0];
  return `${n} ${n === 1 ? 'thing' : 'things'}  ·  ${fmtDur(busyMinutes(items))} busy  ·  first at ${fmtClock(first.startMin)}`;
};

// Sunday-first week containing `date` (like the iPhone Calendar)
export const weekOf = (date) => {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const back = d.getDay();
  d.setDate(d.getDate() - back);
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return x; });
};

const hmOf = (raw) => (raw.baseStartMin != null ? raw.baseStartMin : raw.startMin);

// What a move does to a recurring item, in words
export const moveScope = (item) => {
  if (!item?.movable) return null;
  const raw = item.raw || {};
  if (raw.calendar) {
    const fromEyeCandy = item.kind === 'eyecandy' || item.kind === 'eyecandySports';
    if (fromEyeCandy) {
      return `${raw.recurring ? 'Every week at the new time' : 'Only this one'}. EyeCandy picks it up when you next open it.`;
    }
    const where = raw.calendarTitle ? `your ${raw.calendarTitle} calendar` : 'your Calendar';
    return `${raw.recurring ? 'Only this one, not the repeats' : 'Only this one'}. Changes it in ${where}.`;
  }
  if (item.kind === 'block') return `Just this day. ${raw.templateName || 'The template'} keeps ${fmtClock(hmOf(raw))} on other days.`;
  if (raw.type === 'one-time') return 'Only this one';
  return `Every ${patternOf(raw) === 'every day' ? 'day' : patternOf(raw)} at the new time`;
};
