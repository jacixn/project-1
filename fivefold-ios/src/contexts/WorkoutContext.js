import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';

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

  // Load persisted workout state on app start
  useEffect(() => {
    const loadPersistedWorkout = async () => {
      try {
        const savedState = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
        if (savedState) {
          const { workout, startTime } = JSON.parse(savedState);
          console.log('💾 Restored active workout from storage:', workout.name);
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
        setIsLoading(false);
      }
    };

    loadPersistedWorkout();
  }, []);

  // Persist workout state whenever it changes
  useEffect(() => {
    const persistWorkoutState = async () => {
      try {
        if (activeWorkout && workoutStartTimeRef.current) {
          const state = {
            workout: activeWorkout,
            startTime: workoutStartTimeRef.current.toISOString(),
          };
          await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(state));
          console.log('💾 Persisted active workout to storage');
        } else {
          await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY);
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
    console.log('❌ WorkoutContext.endWorkout() called - WORKOUT ENDING');
    console.trace('❌ Stack trace for endWorkout call:');
    notificationService.cancelWorkoutOverdueNotification();
    setActiveWorkout(null);
    setIsWorkoutMinimized(false);
    setElapsedTime(0);
    workoutStartTimeRef.current = null;
    console.log('❌ activeWorkout set to NULL - hasActiveWorkout is now FALSE');
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

