import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import userStorage from '../utils/userStorage';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

const WorkoutContext = createContext();

const WORKOUT_STORAGE_KEY = '@active_workout_state';

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};

export const WorkoutProvider = ({ children }) => {
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [isWorkoutMinimized, setIsWorkoutMinimized] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const workoutStartTimeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, initializing } = useAuth();
  const loadedUidRef = useRef(null);

  // Load the persisted in-progress workout once the user's storage is ready.
  //
  // CRITICAL: userStorage is UID-scoped — getRaw returns null until initUser()
  // has set the active uid, and initUser only runs after Firebase auth resolves
  // (after this provider mounts). The old code read on mount with [] deps, got
  // null, and never retried — so a workout interrupted by an app kill was never
  // restored even though it was safely on disk. We now key on the resolved uid
  // AND wait until userStorage is actually initialized for it (AuthContext sets
  // `user` slightly before it awaits initUser, so user?.uid alone is not enough).
  useEffect(() => {
    const uid = user?.uid || null;

    // Signed out: nothing UID-scoped to restore. Resolve loading once auth settles.
    if (!uid) {
      if (!initializing) setIsLoading(false);
      return;
    }
    if (loadedUidRef.current === uid) return; // already restored for this user

    let cancelled = false;
    const loadPersistedWorkout = async () => {
      // Wait (up to ~3s) for userStorage to be initialized for this uid.
      for (let i = 0; i < 60 && userStorage.getCurrentUid() !== uid; i++) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (cancelled) return;
      if (userStorage.getCurrentUid() !== uid) {
        // Storage never became ready; leave unmarked so a later trigger retries.
        setIsLoading(false);
        return;
      }
      loadedUidRef.current = uid;
      try {
        const savedState = await userStorage.getRaw(WORKOUT_STORAGE_KEY);
        if (savedState && !cancelled) {
          const { workout, startTime } = JSON.parse(savedState);
          console.log('💾 Restored active workout from storage:', workout?.name);
          setActiveWorkout(workout);
          workoutStartTimeRef.current = new Date(startTime);

          // Calculate elapsed time since start
          const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
          setElapsedTime(elapsed);
          setIsWorkoutMinimized(true); // Keep minimized when restoring

          // Schedule overdue reminder based on the restored start time
          notificationService.scheduleWorkoutOverdueNotification(new Date(startTime));
        }
      } catch (error) {
        console.error('Failed to load persisted workout:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPersistedWorkout();
    return () => { cancelled = true; };
  }, [user?.uid, initializing]);

  // Persist workout state whenever it changes
  useEffect(() => {
    const persistWorkoutState = async () => {
      try {
        // Never touch storage before userStorage is initialized — a stray
        // remove() during the cold-start window must never wipe a saved workout.
        if (!userStorage.getCurrentUid()) return;
        if (activeWorkout && workoutStartTimeRef.current) {
          const state = {
            workout: activeWorkout,
            startTime: workoutStartTimeRef.current.toISOString(),
          };
          await userStorage.setRaw(WORKOUT_STORAGE_KEY, JSON.stringify(state));
          console.log('💾 Persisted active workout to storage');
        } else {
          await userStorage.remove(WORKOUT_STORAGE_KEY);
          console.log('💾 Removed workout from storage');
        }
      } catch (error) {
        console.error('Failed to persist workout state:', error);
      }
    };

    if (!isLoading) {
      persistWorkoutState();
    }
  }, [activeWorkout, isLoading]);

  // Start a new workout
  const startWorkout = (workoutData) => {
    console.log('✅ WorkoutContext.startWorkout() called with:', workoutData);
    setActiveWorkout(workoutData);
    workoutStartTimeRef.current = new Date();
    setElapsedTime(0);
    setIsWorkoutMinimized(false);
    notificationService.scheduleWorkoutOverdueNotification(workoutStartTimeRef.current);
    console.log('✅ activeWorkout state updated - hasActiveWorkout should be true');
  };

  // Minimize the workout (keep it running in background)
  const minimizeWorkout = () => {
    console.log('📦 WorkoutContext.minimizeWorkout() called');
    setIsWorkoutMinimized(true);
    console.log('📦 isWorkoutMinimized set to TRUE - workout should stay active');
  };

  // Maximize/restore the workout
  const maximizeWorkout = () => {
    console.log('📦 WorkoutContext.maximizeWorkout() called');
    setIsWorkoutMinimized(false);
    console.log('📦 isWorkoutMinimized set to FALSE');
  };

  // End/finish the workout
  const endWorkout = () => {
    console.log('[Workout] endWorkout called');
    notificationService.cancelWorkoutOverdueNotification();
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
    setElapsedTime(0);
    workoutStartTimeRef.current = null;
  };

  // Update workout data (exercises, sets, etc.)
  const updateWorkout = (updates) => {
    setActiveWorkout(prev => prev ? { ...prev, ...updates } : null);
  };

  // Timer for tracking elapsed time
  useEffect(() => {
    if (!activeWorkout || !workoutStartTimeRef.current) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - workoutStartTimeRef.current.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  const value = {
    activeWorkout,
    isWorkoutMinimized,
    elapsedTime,
    startWorkout,
    minimizeWorkout,
    maximizeWorkout,
    endWorkout,
    updateWorkout,
    hasActiveWorkout: !!activeWorkout,
    isLoading,
  };

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
};

export default WorkoutContext;

