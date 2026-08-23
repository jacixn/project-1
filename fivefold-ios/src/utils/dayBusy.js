// Everything already on a given day, as busy intervals for the day flow and
// the timeline: Biblely's own prayers, reminders and scheduled workouts
// (from app data, so this works with calendar sync off) plus events from
// the phone's other calendars. Biblely's own mirrored calendar is skipped so
// nothing shows twice. Each entry: { title, startMin, endMin, source }.
import * as Calendar from 'expo-calendar';
import WorkoutService from '../services/workoutService';
import { getPrayers } from '../services/simplePrayersService';
import { loadReminders, getRemindersForDay } from '../services/reminderService';
import { isPrayerDayEnabled } from './prayerDays';
import { getStoredData } from './localStorage';
import { workoutsOnDay } from './workoutDays';

const BIBLELY_CAL = 'Biblely';
const DAY_MIN = 24 * 60;

export const minutesOf = (t) => {
  if (t == null) return null;
  const s = String(t).trim();
  let h; let m;
  if (s.includes(':')) [h, m] = s.split(':').map((n) => parseInt(n, 10));
  else { const p = s.padStart(4, '0'); h = parseInt(p.slice(0, 2), 10); m = parseInt(p.slice(2, 4), 10); }
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const pad2 = (n) => String(n).padStart(2, '0');
export const dateKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const push = (out, title, startMin, minutes, source) => {
  if (startMin == null) return;
  const dur = Math.max(1, Number(minutes) || 0);
  out.push({ title: title || 'Busy', startMin, endMin: clamp(startMin + dur, startMin + 1, DAY_MIN), source });
};

export const loadBusyForDate = async (date, { excludeGymId = null, excludeReminderId = null, excludePrayerId = null, excludeTaskId = null } = {}) => {
  const out = [];
  const key = dateKeyOf(date);
  const dow = date.getDay();

  try {
    for (const p of await getPrayers()) {
      if (!p || !p.time) continue;
      if (excludePrayerId != null && String(p.id) === String(excludePrayerId)) continue;
      const on = p.type === 'one-time' ? p.date === key : isPrayerDayEnabled(p, date);
      if (!on) continue;
      push(out, p.name || 'Prayer', minutesOf(p.time), Number(p.duration) > 0 ? p.duration : 5, 'prayer');
    }
  } catch {}

  try {
    for (const r of getRemindersForDay(await loadReminders(), dow, key)) {
      if (excludeReminderId != null && String(r.id) === String(excludeReminderId)) continue;
      push(out, r.title || 'Reminder', minutesOf(r.time), Number(r.duration) > 0 ? r.duration : 30, 'reminder');
    }
  } catch {}

  try {
    for (const t of (await getStoredData('todos')) || []) {
      if (!t || t.completed || t.scheduledDate !== key || !t.scheduledTime) continue;
      if (excludeTaskId != null && String(t.id) === String(excludeTaskId)) continue;
      push(out, t.text || 'Task', minutesOf(t.scheduledTime), 30, 'task');
    }
  } catch {}

  try {
    for (const s of workoutsOnDay(await WorkoutService.getScheduledWorkouts(), key, dow)) {
      if (excludeGymId != null && String(s.id) === String(excludeGymId)) continue;
      push(out, s.templateName || 'Workout', minutesOf(s.time), Number(s.duration) > 0 ? s.duration : 60, 'gym');
    }
  } catch {}

  try {
    let perm = await Calendar.getCalendarPermissionsAsync();
    if (!perm.granted && perm.status === 'undetermined') perm = await Calendar.requestCalendarPermissionsAsync();
    if (perm.granted) {
      const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const ids = (cals || []).filter((c) => c.title !== BIBLELY_CAL).map((c) => c.id);
      if (ids.length) {
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        const raw = await Calendar.getEventsAsync(ids, dayStart, dayEnd);
        for (const e of raw || []) {
          if (!e || e.allDay) continue;
          const s = new Date(e.startDate);
          const en = new Date(e.endDate);
          const startMin = clamp(s < dayStart ? 0 : s.getHours() * 60 + s.getMinutes(), 0, DAY_MIN);
          const endMin = clamp(en > dayEnd ? DAY_MIN : en.getHours() * 60 + en.getMinutes(), startMin + 1, DAY_MIN);
          out.push({ title: e.title || 'Busy', startMin, endMin, source: 'calendar' });
        }
      }
    }
  } catch {}

  return out.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
};
