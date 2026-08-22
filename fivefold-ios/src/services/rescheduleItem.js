// Move a prayer, reminder, task or scheduled workout to a new time (and, for
// one-time items, a new date) through the service that owns it, so storage,
// notifications, cloud and the iPhone Calendar mirror all follow.
import { DeviceEventEmitter } from 'react-native';
import * as Calendar from 'expo-calendar';
import { updatePrayer } from './simplePrayersService';
import { updateReminder, moveReminderForDay } from './reminderService';
import WorkoutService from './workoutService';
import { scheduleWorkoutNotifications } from './workoutSchedule';
import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from './userSyncService';

// Calendar-sourced items (EyeCandy, other writable iPhone calendars) are
// moved in the iPhone Calendar itself. EyeCandy reads its own events back on
// its next launch (calendarSync.adoptCalendarChanges), so the Calendar is the
// shared truth between the two apps. Sports fixtures are never moved: the
// kick-off comes from the league, not the user.
const CALENDAR_KINDS = new Set(['eyecandy', 'calendar']);

// New start/end for a calendar event moved to `to`, keeping its length. A
// repeating event keeps its date (only the time moves); a one-time one may
// change day. Pure, so it is selftested.
export const calendarMoveDates = (raw, to) => {
  const start = new Date(raw.startDate);
  const end = new Date(raw.endDate);
  const lengthMs = Math.max(60000, end.getTime() - start.getTime());
  const [hh, mm] = String(to.time).split(':').map(Number);
  const next = new Date(start);
  if (to.date && !raw.recurring) {
    const [y, m, d] = to.date.split('-').map(Number);
    next.setFullYear(y, m - 1, d);
  }
  next.setHours(hh, mm, 0, 0);
  return { startDate: next, endDate: new Date(next.getTime() + lengthMs) };
};

// expo-calendar's native update writes title, notes, location, alarms, allDay
// and availability unconditionally, so a bare { startDate, endDate } would
// blank the event. Carry the current values across. The recurrence rule is
// only sent when the whole series moves; leaving it out keeps the rule as is.
export const calendarMoveDetails = (ev, dates, series) => ({
  title: (ev && ev.title) || '',
  ...(ev && ev.notes != null ? { notes: ev.notes } : {}),
  ...(ev && ev.location ? { location: ev.location } : {}),
  ...(ev && ev.url ? { url: ev.url } : {}),
  alarms: Array.isArray(ev && ev.alarms) ? ev.alarms : [],
  allDay: !!(ev && ev.allDay),
  ...(ev && ev.availability ? { availability: ev.availability } : {}),
  ...(ev && ev.timeZone ? { timeZone: ev.timeZone } : {}),
  ...(series && ev && ev.recurrenceRule ? { recurrenceRule: ev.recurrenceRule } : {}),
  startDate: dates.startDate,
  endDate: dates.endDate,
});

// How a repeating calendar event is edited: EyeCandy's weekly slots are one
// rule (weekday + time), so the whole series moves and EyeCandy adopts it.
// Other calendars get the safe default, this occurrence only.
export const calendarMoveOptions = (kind, raw) => {
  if (!raw.recurring) return undefined;
  return kind === 'calendar'
    ? { futureEvents: false, instanceStartDate: new Date(raw.startDate) }
    : { futureEvents: true };
};

// item: from utils/dayItems; to: { time: 'HH:MM', date?: 'YYYY-MM-DD', from?: 'YYYY-MM-DD', todayOnly?: bool }
// Resolves true (or { newId }) when moved, false when it could not be.
export const moveItem = async (item, to) => {
  if (!item || !item.movable || !to?.time || item.kind === 'eyecandySports') return false;
  const raw = item.raw || {};
  if (CALENDAR_KINDS.has(item.kind) && raw.eventId) {
    const dates = calendarMoveDates(raw, to);
    const options = calendarMoveOptions(item.kind, raw);
    const series = !!(options && options.futureEvents);
    let ev = null;
    try {
      ev = await Calendar.getEventAsync(raw.eventId, options && options.instanceStartDate ? { instanceStartDate: options.instanceStartDate } : undefined);
    } catch {}
    if (!ev) throw new Error('That event is no longer in your Calendar.');
    const details = calendarMoveDetails(ev, dates, series);
    try {
      await Calendar.updateEventAsync(raw.eventId, details, options);
    } catch (e) {
      // An unusual time zone id is the one field iOS rejects; retry without it.
      if (!details.timeZone) throw e;
      const { timeZone, ...rest } = details;
      await Calendar.updateEventAsync(raw.eventId, rest, options);
    }
    return true;
  }
  const oneTime = raw.type === 'one-time';
  if (item.kind === 'prayer') {
    await updatePrayer(raw.id, { ...raw, time: to.time, date: oneTime ? (to.date || raw.date) : null });
    return true;
  }
  if (item.kind === 'reminder') {
    // A repeating reminder moved for one day: the series skips `from`, a
    // one-time copy takes `date`. Returns the copy's id so the caller can
    // keep pointing at the thing that moved.
    if (!oneTime && to.todayOnly && (to.from || to.date)) {
      const from = to.from || to.date;
      const copy = await moveReminderForDay(raw.id, { from, to: to.date || from, time: to.time });
      return copy ? { newId: `reminder:${copy.id}` } : false;
    }
    await updateReminder(raw.id, { time: to.time, ...(oneTime && to.date ? { date: to.date } : {}) });
    return true;
  }
  if (item.kind === 'task') {
    // Same write path as the To Do editors: storage, cloud, Calendar mirror,
    // widget, and the 'todosChanged' event the tabs listen for.
    const todos = (await getStoredData('todos')) || [];
    const date = to.date || raw.scheduledDate;
    const [y, m, d] = String(date).split('-').map(Number);
    const [hh, mm] = String(to.time).split(':').map(Number);
    const when = new Date(y, m - 1, d, hh, mm, 0, 0);
    let found = false;
    const updated = todos.map((t) => {
      if (String(t.id) !== String(raw.id)) return t;
      found = true;
      return { ...t, scheduledDate: date, scheduledTime: to.time, scheduledDateTime: when.toISOString() };
    });
    if (!found) return false;
    await saveData('todos', updated);
    try { pushToCloud('todos', updated); } catch {}
    try { require('./calendarSync').syncTodos(updated); } catch {}
    try { require('../utils/widgetBridge').updateTodoWidget().catch(() => {}); } catch {}
    try { DeviceEventEmitter.emit('todosChanged'); } catch {}
    return true;
  }
  if (item.kind === 'gym') {
    await WorkoutService.updateScheduledWorkout(raw.id, { time: to.time, ...(oneTime && to.date ? { date: to.date } : {}) });
    const list = await WorkoutService.getScheduledWorkouts();
    const fresh = list.find((s) => String(s.id) === String(raw.id));
    if (fresh) { try { await scheduleWorkoutNotifications(fresh); } catch {} }
    try { DeviceEventEmitter.emit('workoutScheduled', fresh); } catch {}
    return true;
  }
  return false;
};

export default moveItem;
