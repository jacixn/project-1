// Reset Fitness: wipe every piece of fitness data back to a fresh-install
// state — and nothing else (prayers, Bible, todos, nutrition, account and
// preferences like units/equipment/training style are untouched).
//
// Cleared: workout history, templates + folders, the fitness calendar
// (scheduled workouts AND their mirrored iPhone Calendar events), the split
// plan, the exercise counter, custom exercises (the built-in library stays),
// physique muscle scores, any in-progress workout, and workout
// notifications. Each store's cloud copy is emptied too so a later restore
// can't bring the data back.
import { DeviceEventEmitter } from 'react-native';
import userStorage from '../utils/userStorage';
import { pushToCloud } from './userSyncService';
import physiqueService from './physiqueService';

export const FITNESS_RESET_EVENT = 'fitnessReset';

const LOCAL_KEYS = [
  '@workout_history',
  '@workout_templates',
  '@workout_folders',
  '@scheduled_workouts',
  '@workout_split_plan',
  '@workout_exercise_count',
  '@custom_exercises',
  '@active_workout_state',
];

const CLOUD_EMPTIES = [
  ['workoutHistory', []],
  ['workoutTemplates', []],
  ['workoutFolders', []],
  ['scheduledWorkouts', []],
  ['splitPlan', null],
];

// `endActiveWorkout` is WorkoutContext's endWorkout (so the mini player and
// timer drop immediately, not just the persisted state).
export const resetAllFitness = async ({ endActiveWorkout } = {}) => {
  // 1. Live workout first — it would otherwise re-persist itself.
  try { if (typeof endActiveWorkout === 'function') endActiveWorkout(); } catch {}

  // 2. Mirrored calendar events (must run while the scheduled list is known
  //    to the sync — an empty desired set deletes every gym event).
  try { await require('./calendarSync').syncGym([]); } catch {}

  // 3. Local stores.
  for (const key of LOCAL_KEYS) {
    try { await userStorage.remove(key); } catch {}
  }

  // 4. Physique (memory + storage + cloud).
  try { await physiqueService.resetAll(); } catch {}

  // 5. Cloud copies.
  for (const [field, value] of CLOUD_EMPTIES) {
    try { pushToCloud(field, value, 0); } catch {}
  }

  // 6. Workout notifications.
  try {
    const ns = require('./notificationService').default || require('./notificationService');
    await ns.cancelNotificationsByType?.('workout_reminder');
    await ns.cancelNotificationsByType?.('workout_overdue');
  } catch {}

  // 7. Tell every fitness screen to reload.
  DeviceEventEmitter.emit(FITNESS_RESET_EVENT);
  DeviceEventEmitter.emit('workoutScheduled'); // GymTab's existing calendar refresh hook
  return true;
};

export default resetAllFitness;
