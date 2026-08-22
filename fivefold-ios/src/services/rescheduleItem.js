// Move a prayer, reminder or scheduled workout to a new time (and, for
// one-time items, a new date) through the service that owns it, so storage,
// notifications, cloud and the iPhone Calendar mirror all follow.
import { DeviceEventEmitter } from 'react-native';
import { updatePrayer } from './simplePrayersService';
import { updateReminder } from './reminderService';
import WorkoutService from './workoutService';
import { scheduleWorkoutNotifications } from './workoutSchedule';

// item: from utils/dayItems; to: { time: 'HH:MM', date?: 'YYYY-MM-DD' }
export const moveItem = async (item, to) => {
  if (!item || !item.movable || !to?.time) return false;
  const raw = item.raw || {};
  const oneTime = raw.type === 'one-time';
  if (item.kind === 'prayer') {
    await updatePrayer(raw.id, { ...raw, time: to.time, date: oneTime ? (to.date || raw.date) : null });
    return true;
  }
  if (item.kind === 'reminder') {
    await updateReminder(raw.id, { time: to.time, ...(oneTime && to.date ? { date: to.date } : {}) });
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
