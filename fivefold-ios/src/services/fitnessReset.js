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

// What can be cleared, independently. Defaults = "progress" only: history,
// the in-progress workout, the fitness calendar and physique. Templates,
// folders, split plan and custom exercises are kept unless asked.
export const RESET_OPTIONS = [
  { key: 'history', label: 'Workout history', hint: 'Every finished workout and its sets', default: true },
  { key: 'active', label: 'Workout in progress', hint: 'Ends and discards the current workout', default: true },
  { key: 'scheduled', label: 'Fitness calendar', hint: 'Scheduled workouts and their iPhone Calendar events', default: true },
  { key: 'physique', label: 'Physique progress', hint: 'Muscle scores back to untrained', default: true },
  { key: 'templates', label: 'Templates and folders', hint: 'Your saved workout templates', default: false },
  { key: 'split', label: 'Split plan', hint: 'Your weekly training split', default: false },
  { key: 'customExercises', label: 'Custom exercises', hint: 'Exercises you created (the built-in library always stays)', default: false },
];

export const defaultResetPicks = () => Object.fromEntries(RESET_OPTIONS.map((o) => [o.key, o.default]));

// `picks` = { history, active, scheduled, physique, templates, split,
// customExercises } booleans. `endActiveWorkout` is WorkoutContext's
// endWorkout (so the mini player and timer drop immediately).
export const resetFitness = async (picks = defaultResetPicks(), { endActiveWorkout } = {}) => {
  const rm = async (key) => { try { await userStorage.remove(key); } catch {} };
  const cloud = (field, value) => { try { pushToCloud(field, value, 0); } catch {} };

  if (picks.active) {
    try { if (typeof endActiveWorkout === 'function') endActiveWorkout(); } catch {}
    await rm('@active_workout_state');
  }
  if (picks.scheduled) {
    // Empty desired set deletes every mirrored gym event.
    try { await require('./calendarSync').syncGym([]); } catch {}
    await rm('@scheduled_workouts');
    cloud('scheduledWorkouts', []);
    try {
      const ns = require('./notificationService').default || require('./notificationService');
      await ns.cancelNotificationsByType?.('workout_reminder');
      await ns.cancelNotificationsByType?.('workout_overdue');
    } catch {}
  }
  if (picks.history) {
    await rm('@workout_history');
    await rm('@workout_exercise_count');
    cloud('workoutHistory', []);
  }
  if (picks.physique) {
    try { await physiqueService.resetAll(); } catch {}
  }
  if (picks.templates) {
    await rm('@workout_templates');
    await rm('@workout_folders');
    cloud('workoutTemplates', []);
    cloud('workoutFolders', []);
  }
  if (picks.split) {
    await rm('@workout_split_plan');
    cloud('splitPlan', null);
  }
  if (picks.customExercises) {
    await rm('@custom_exercises');
  }

  DeviceEventEmitter.emit(FITNESS_RESET_EVENT, picks);
  DeviceEventEmitter.emit('workoutScheduled'); // GymTab's existing calendar refresh hook
  return true;
};

// Everything at once (kept for callers that want the full wipe).
export const resetAllFitness = (opts) =>
  resetFitness(Object.fromEntries(RESET_OPTIONS.map((o) => [o.key, true])), opts);

export default resetFitness;
