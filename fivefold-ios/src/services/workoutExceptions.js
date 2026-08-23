// Per-day exceptions for repeating workouts: skip one day, or move one day
// (the series skips it, a one-time copy takes the new time). Mirrors what
// reminders do in reminderService.moveReminderForDay.
import { DeviceEventEmitter } from 'react-native';
import WorkoutService from './workoutService';
import { scheduleWorkoutNotifications } from './workoutSchedule';

const weekdayOf = (dateKey) => { const [y, m, d] = dateKey.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0, 0).getDay(); };

// Skip ONE day of a repeating workout. One-time workouts are deleted.
export const skipWorkoutDay = async (id, dateKey) => {
  if (!dateKey) return false;
  const list = await WorkoutService.getScheduledWorkouts();
  const idx = list.findIndex((s) => String(s.id) === String(id));
  if (idx < 0) return false;
  const s = list[idx];
  if (s.type === 'one-time') { await WorkoutService.deleteScheduledWorkout(id); try { DeviceEventEmitter.emit('workoutScheduled', null); } catch {} return true; }
  list[idx] = { ...s, skipDates: Array.from(new Set([...(s.skipDates || []), dateKey])) };
  await WorkoutService.saveScheduledWorkouts(list);
  try { await scheduleWorkoutNotifications(list[idx]); } catch {}
  try { DeviceEventEmitter.emit('workoutScheduled', list[idx]); } catch {}
  return true;
};

// Move ONE day of a repeating workout: `from` is skipped on the series and a
// one-time copy lands on `to` (same day by default) at `time`. Returns the copy.
export const moveWorkoutForDay = async (id, { from, to, time }) => {
  if (!from || !time) return null;
  const list = await WorkoutService.getScheduledWorkouts();
  const idx = list.findIndex((s) => String(s.id) === String(id));
  if (idx < 0) return null;
  const parent = list[idx];
  if (parent.type === 'one-time') {
    const saved = await WorkoutService.updateScheduledWorkout(id, { time, date: to || from });
    try { if (saved) await scheduleWorkoutNotifications(saved); } catch {}
    try { DeviceEventEmitter.emit('workoutScheduled', saved); } catch {}
    return saved;
  }
  const date = to || from;
  const copy = {
    ...parent,
    id: `${Date.now()}`,
    type: 'one-time',
    date,
    time,
    days: [weekdayOf(date)],
    parentId: parent.id,
    createdAt: new Date().toISOString(),
  };
  delete copy.skipDates;
  list[idx] = { ...parent, skipDates: Array.from(new Set([...(parent.skipDates || []), from])) };
  list.push(copy);
  await WorkoutService.saveScheduledWorkouts(list);
  try { await scheduleWorkoutNotifications(list[idx]); } catch {}
  try { await scheduleWorkoutNotifications(copy); } catch {}
  try { DeviceEventEmitter.emit('workoutScheduled', copy); } catch {}
  return copy;
};
