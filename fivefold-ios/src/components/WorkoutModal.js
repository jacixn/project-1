import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Image,
  Alert,
  AppState,
  InteractionManager,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { hapticFeedback } from '../utils/haptics';
import ExercisesModal from './ExercisesModal';
import WorkoutExercisePicker from './WorkoutExercisePicker';
import WorkoutService from '../services/workoutService';
import WorkoutCompletionModal from './WorkoutCompletionModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const WorkoutModal = ({ visible, onClose, templateData = null }) => {
  const { theme, isDark } = useTheme();
  const {
    activeWorkout,
    startWorkout,
    minimizeWorkout,
    maximizeWorkout,
    endWorkout,
    updateWorkout,
    hasActiveWorkout,
    elapsedTime: contextElapsedTime, // Use context's elapsed time for accurate tracking
  } = useWorkout();
  
  const [workoutName, setWorkoutName] = useState('Workout 1');
  const [workoutStartTime, setWorkoutStartTime] = useState(new Date());
  const [exercises, setExercises] = useState([]);
  const [previousWorkout, setPreviousWorkout] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showWorkoutExercisePicker, setShowWorkoutExercisePicker] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameText, setEditingNameText] = useState('');
  const [workoutNote, setWorkoutNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [workoutPhoto, setWorkoutPhoto] = useState(null);
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadMode, setNumpadMode] = useState('weight'); // 'weight' or 'reps'
  const [activeInput, setActiveInput] = useState(null); // { exerciseId, setIndex, field }
  const [numpadValue, setNumpadValue] = useState('');
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTimerDuration, setRestTimerDuration] = useState(120); // in seconds
  const [restTimerRemaining, setRestTimerRemaining] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimerPicker, setShowTimerPicker] = useState(true);
  const [showRestComplete, setShowRestComplete] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedWorkoutData, setCompletedWorkoutData] = useState(null);
  const [totalWorkoutCount, setTotalWorkoutCount] = useState(0);
  const [showEmptyWorkoutAlert, setShowEmptyWorkoutAlert] = useState(false);
  const [showNoSetsAlert, setShowNoSetsAlert] = useState(false);
  const [isWorkoutFinished, setIsWorkoutFinished] = useState(false);
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'lbs'
  const [isInitializing, setIsInitializing] = useState(false); // Track if workout is being initialized
  const timerInterval = useRef(null);
  const timerEndTime = useRef(null); // Absolute timestamp when rest ends
  const restNotificationId = useRef(null); // ID for scheduled rest-complete notification
  const isTimerRunningRef = useRef(false); // Mirror of isTimerRunning for AppState listener (avoids stale closures)
  const scrollViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const [isAtTop, setIsAtTop] = useState(true);
  const panGestureStarted = useRef(false); // Track if user actually started the gesture
  const isRestoring = useRef(false); // Track if we're currently restoring data
  const hasInitializedForSession = useRef(false); // Prevent double init when hasActiveWorkout changes

  // Pan responder for pull-to-dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isAtTop && gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        console.log('👆 PanResponder: Gesture STARTED (user touched)');
        panGestureStarted.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('👆 PanResponder released - dy:', gestureState.dy);
        console.log('👆 PanResponder released - panGestureStarted:', panGestureStarted.current);
        
        // ONLY close if user actually started the gesture AND swiped far enough
        if (panGestureStarted.current && gestureState.dy > 150) {
          console.log('👆 PanResponder: VALID swipe down, calling handleCloseModal');
          panGestureStarted.current = false; // Reset
          handleCloseModal();
        } else {
          console.log('👆 PanResponder: Invalid or short swipe, bouncing back');
          panGestureStarted.current = false; // Reset
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  /** Stop all infinite pulse animations on completed sets to prevent CPU leak */
  const stopAllSetAnimations = () => {
    exercises.forEach(ex => {
      (ex.sets || []).forEach(set => {
        if (set.pulseAnim && typeof set.pulseAnim.stopAnimation === 'function') {
          set.pulseAnim.stopAnimation();
        }
        if (set.glowAnim && typeof set.glowAnim.stopAnimation === 'function') {
          set.glowAnim.stopAnimation();
        }
        if (set.scaleAnim && typeof set.scaleAnim.stopAnimation === 'function') {
          set.scaleAnim.stopAnimation();
        }
      });
    });
  };

  const handleCloseModal = () => {
    // CRITICAL: Stop all infinite set pulse loops before closing
    stopAllSetAnimations();

    // ANIMATION FIRST — start the dismiss animation immediately so the user
    // sees the modal slide away without any pause.  All state updates (sync,
    // minimize) are deferred to AFTER the animation finishes.  This prevents
    // expensive React re-renders from blocking the animation start.
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation is done — modal is visually gone.
      // Now safely sync and minimize without any visible jank.
      if (hasActiveWorkout) {
        updateWorkout({
          name: workoutName,
          exercises: cleanExercisesForSync(exercises),
          note: workoutNote,
          photo: workoutPhoto,
          weightUnit: weightUnit,
          startTime: workoutStartTime.toISOString(),
        });
      }
      minimizeWorkout();
      onClose();
    });
  };

  // Reset timer when modal opens
  useEffect(() => {
    const initializeWorkout = async () => {
      if (visible) {
        console.log('🏋️ WorkoutModal opened - hasActiveWorkout:', hasActiveWorkout);
        console.log('🏋️ activeWorkout data:', JSON.stringify(activeWorkout));
        
        setIsInitializing(true); // Start initializing
        
        // Only initialize a NEW workout if there isn't one active already
        if (!hasActiveWorkout) {
          console.log('🏋️ Starting NEW workout in context');
          console.log('🏋️ Template data:', templateData);
          
          // Prevent sync during initial setup
          isRestoring.current = true;
          
          const now = new Date();
          setWorkoutStartTime(now);
          setIsWorkoutFinished(false);
          
          // If starting from a template, use template data
          let initialName = 'Workout 1';
          let initialExercises = [];
          
          if (templateData) {
            console.log('🏋️ Using template:', templateData.name);
            initialName = templateData.name;
            
            // FIRST: Convert template exercises to workout format SYNCHRONOUSLY (no previous data yet)
            initialExercises = templateData.exercises.map((exercise, index) => ({
              id: Date.now() + Math.random() + index,
              name: exercise.name,
              bodyPart: exercise.bodyPart,
              equipment: exercise.equipment || 'Machine',
              target: exercise.target,
              sets: Array.from({ length: exercise.sets || 3 }, (_, setIndex) => ({
                id: Date.now() + Math.random() + setIndex,
                weight: exercise.weight || '',
                reps: exercise.reps || '',
                rest: exercise.restTime || 120,
                completed: false,
                previous: null // Will be filled in later if previous data exists
              })),
              restTime: exercise.restTime || 120,
            }));
            
            console.log('🏋️ Template exercises converted:', initialExercises.length);
          }
          
          // Set local state IMMEDIATELY (synchronously) so content renders right away
          setWorkoutName(initialName);
          setExercises(initialExercises);
          
          // Start workout in context immediately
          startWorkout({
            name: initialName,
            exercises: initialExercises,
            startTime: now,
          });
          console.log('🏋️ startWorkout() called with name:', initialName, 'exercises:', initialExercises.length);
          
          setIsInitializing(false); // Done initializing - content is ready to render
          
          // THEN: Load previous workout data in background and update exercises
          if (templateData?.id) {
            try {
              const previousData = await WorkoutService.getPreviousWorkout(templateData.id);
              if (previousData) {
                console.log('🏋️ Loaded previous workout data for template');
                setPreviousWorkout(previousData);
                
                // Update exercises with previous data
                const updatedExercises = initialExercises.map(exercise => {
                  const previousExercise = previousData?.exercises?.find(ex => ex.name === exercise.name);
                  if (previousExercise) {
                    return {
                      ...exercise,
                      sets: exercise.sets.map((set, setIndex) => ({
                        ...set,
                        weight: previousExercise.sets?.[setIndex]?.weight || set.weight,
                        reps: previousExercise.sets?.[setIndex]?.reps || set.reps,
                        previous: previousExercise.sets?.[setIndex] ? {
                          weight: previousExercise.sets[setIndex].weight,
                          reps: previousExercise.sets[setIndex].reps
                        } : null
                      }))
                    };
                  }
                  return exercise;
                });
                
                setExercises(updatedExercises);
                console.log('🏋️ Updated exercises with previous workout data');
              }
            } catch (error) {
              console.error('Error loading previous workout:', error);
            }
          }
          
          // Allow sync after state updates complete
          setTimeout(() => {
            isRestoring.current = false;
            console.log('🏋️ Initial setup complete, sync re-enabled');
          }, 300);
        } else {
          console.log('[WorkoutModal] Reopening EXISTING workout - restoring data from context');
          // User is reopening an existing workout - restore data from context
          isRestoring.current = true; // Prevent sync during restoration
          maximizeWorkout();
          
          // Restore ALL fields from context
          if (activeWorkout?.name) {
            setWorkoutName(activeWorkout.name);
          }
          if (activeWorkout?.exercises) {
            // Re-create animation values for completed sets
            // (they were stripped by cleanExercisesForSync when minimizing)
            const restoredExercises = activeWorkout.exercises.map(ex => ({
              ...ex,
              sets: ex.sets.map(set => {
                if (set.completed) {
                  // Re-add animation values so completed sets look correct
                  return {
                    ...set,
                    scaleAnim: new Animated.Value(1),   // Already at final value
                    glowAnim: new Animated.Value(1),    // Already at final value
                    pulseAnim: new Animated.Value(1),   // No pulse needed on restore
                  };
                }
                return set;
              }),
            }));
            setExercises(restoredExercises);
          } else {
            console.warn('[WorkoutModal] No exercises found in activeWorkout');
            setExercises([]);
          }
          // Restore the start time so the date display is correct
          if (activeWorkout?.startTime) {
            setWorkoutStartTime(new Date(activeWorkout.startTime));
          }
          // Restore note and photo (may have been set before minimize)
          if (activeWorkout?.note !== undefined) {
            setWorkoutNote(activeWorkout.note || '');
          }
          if (activeWorkout?.photo !== undefined) {
            setWorkoutPhoto(activeWorkout.photo || null);
          }
          // Restore weight unit from context (fallback to AsyncStorage in separate loader)
          if (activeWorkout?.weightUnit) {
            setWeightUnit(activeWorkout.weightUnit);
          }
          
          setIsInitializing(false); // Done initializing
          
          // Allow sync after a brief delay to ensure state updates complete
          setTimeout(() => {
            isRestoring.current = false;
          }, 150);
        }
        
        // Reset alert states
        setShowEmptyWorkoutAlert(false);
        setShowNoSetsAlert(false);
        setShowFinishConfirm(false);
        
        // Load weight unit preference
        AsyncStorage.getItem('weightUnit').then(unit => {
          if (unit) {
            setWeightUnit(unit);
          }
        });
      } else {
        // Modal is closing
        setIsInitializing(false);
      }
    };
    
    initializeWorkout();
  }, [visible, hasActiveWorkout]);

  // Strip Animated.Value objects from exercises before syncing to context
  // (Animated.Values are non-serializable and cause AsyncStorage persistence to fail)
  const cleanExercisesForSync = (exs) => {
    return exs.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => {
        const { scaleAnim, glowAnim, pulseAnim, ...cleanSet } = set;
        return cleanSet;
      }),
    }));
  };

  // Sync workout data to context whenever it changes
  useEffect(() => {
    // Don't sync if no active workout
    if (!hasActiveWorkout) {
      return;
    }
    
    // Don't sync during restoration (prevents overwriting context with stale local state)
    if (isRestoring.current) {
      return;
    }
    
    // Don't sync on initial mount when exercises are empty and name is default
    // This prevents overwriting the template data from startWorkout()
    if (exercises.length === 0 && workoutName === 'Workout 1') {
      return;
    }
    
    updateWorkout({
      name: workoutName,
      exercises: cleanExercisesForSync(exercises),
      note: workoutNote,
      photo: workoutPhoto,
      weightUnit: weightUnit,
      startTime: workoutStartTime.toISOString(),
    });
  }, [workoutName, exercises, workoutNote, workoutPhoto, weightUnit, hasActiveWorkout]);

  // Animate modal in/out
  useEffect(() => {
    console.log('🎬 Animation effect - visible changed to:', visible);
    if (visible) {
      console.log('🎬 Animating modal IN');
      slideAnim.setValue(0);
      fadeAnim.setValue(1); // Start visible instead of invisible to prevent black screen
      panY.setValue(0); // Reset pan gesture value
      
      requestAnimationFrame(() => {
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 100,
          friction: 20,
          useNativeDriver: true,
        }).start(() => {
          console.log('🎬 Modal animation IN complete');
        });
      });
    } else {
      console.log('🎬 Animating modal OUT (visible=false)');
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      panY.setValue(0); // Reset pan gesture value
    }
  }, [visible]);

  // Timer is now handled by WorkoutContext - no local timer needed
  // The contextElapsedTime from useWorkout() is used for display

  // NOTE: Template initialization is now handled in the main useEffect above (line 163-265)
  // This effect was removed to prevent duplicate initialization that was causing the black screen bug

  // Format elapsed time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleAddExercise = (exercise) => {
    hapticFeedback.light();
    const newExercise = {
      ...exercise,
      sets: [{ weight: '', reps: '', rest: 120, completed: false }],
      id: Date.now().toString(),
      restTime: 120, // default rest time 2:00
    };
    setExercises([...exercises, newExercise]);
    setShowExercisePicker(false);
  };

  const handleAddSet = (exerciseId) => {
    hapticFeedback.medium();
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSet = { weight: '', reps: '', rest: ex.restTime, completed: false };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    }));
  };

  const handleInputPress = (exerciseId, setIndex, field) => {
    hapticFeedback.light();
    setActiveInput({ exerciseId, setIndex, field });
    setNumpadMode(field);
    
    // Get current value
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (field === 'rest') {
      // For rest, start with current value as 4 digits (MMSS format)
      const currentValueInSeconds = exercise?.sets[setIndex]?.[field] || 120;
      const minutes = Math.floor(currentValueInSeconds / 60);
      const seconds = currentValueInSeconds % 60;
      const mmss = minutes.toString().padStart(2, '0') + seconds.toString().padStart(2, '0');
      setNumpadValue(mmss);
    } else {
      const currentValue = exercise?.sets[setIndex]?.[field] || '';
      setNumpadValue(currentValue.toString());
    }
    setShowNumpad(true);
  };

  const handleNumpadPress = (value) => {
    hapticFeedback.light();
    let newValue = numpadValue;
    
    if (activeInput?.field === 'rest' || (numpadMode === 'rest' && !activeInput)) {
      // Rest time uses clock-style digit flow (MM:SS)
      if (value === 'backspace') {
        // Shift right and add 0 on the left
        newValue = '0' + numpadValue.slice(0, 3);
      } else if (value >= '0' && value <= '9') {
        // Shift left and add new digit on the right
        newValue = numpadValue.slice(1) + value;
      } else {
        return; // Ignore decimal and other keys for rest
      }
      
      setNumpadValue(newValue);
      
      // If we're editing a set's rest time, update it immediately
      if (activeInput && activeInput.exerciseId) {
        // Convert MMSS to seconds
        const minutes = parseInt(newValue.slice(0, 2), 10);
        const seconds = parseInt(newValue.slice(2, 4), 10);
        const totalSeconds = minutes * 60 + seconds;
        
        setExercises(exercises.map(ex => {
          if (ex.id === activeInput.exerciseId) {
            const updatedSets = [...ex.sets];
            updatedSets[activeInput.setIndex] = {
              ...updatedSets[activeInput.setIndex],
              rest: totalSeconds
            };
            return { ...ex, sets: updatedSets, restTime: totalSeconds };
          }
          return ex;
        }));
      }
    } else {
      // Weight and reps use normal number input
      if (value === 'backspace') {
        newValue = numpadValue.slice(0, -1);
      } else if (value === '.') {
        if (!numpadValue.includes('.')) {
          newValue = numpadValue + '.';
        } else {
          return;
        }
      } else {
        newValue = numpadValue + value;
      }
      
      setNumpadValue(newValue);
      
      // Update immediately
      if (!activeInput) return;
      setExercises(exercises.map(ex => {
        if (ex.id === activeInput.exerciseId) {
          const updatedSets = [...ex.sets];
          updatedSets[activeInput.setIndex] = {
            ...updatedSets[activeInput.setIndex],
            [activeInput.field]: newValue
          };
          return { ...ex, sets: updatedSets };
        }
        return ex;
      }));
    }
  };

  const handleNumpadAdjust = (adjustment) => {
    hapticFeedback.medium();
    if (!activeInput) return;

    if (activeInput.field === 'rest') {
      // For rest time with clock input, adjust by 30 seconds
      const minutes = parseInt(numpadValue.slice(0, 2), 10);
      const seconds = parseInt(numpadValue.slice(2, 4), 10);
      let totalSeconds = minutes * 60 + seconds;
      
      totalSeconds = Math.max(0, totalSeconds + (adjustment * 30));
      totalSeconds = Math.min(totalSeconds, 5999); // Cap at 99:59
      
      const newMinutes = Math.floor(totalSeconds / 60);
      const newSeconds = totalSeconds % 60;
      const newValue = newMinutes.toString().padStart(2, '0') + newSeconds.toString().padStart(2, '0');
      
      setNumpadValue(newValue);
      
      // Update immediately
      setExercises(exercises.map(ex => {
        if (ex.id === activeInput.exerciseId) {
          const updatedSets = [...ex.sets];
          updatedSets[activeInput.setIndex] = {
            ...updatedSets[activeInput.setIndex],
            rest: totalSeconds
          };
          return { ...ex, sets: updatedSets, restTime: totalSeconds };
        }
        return ex;
      }));
    } else if (activeInput.field === 'weight') {
      const currentValue = parseFloat(numpadValue) || 0;
      const exercise = exercises.find(ex => ex.id === activeInput.exerciseId);
      
      // Determine sensible increment based on exercise
      let increment = 5; // default 5kg
      const exerciseName = exercise?.name?.toLowerCase() || '';
      
      // Smaller increments for isolation exercises
      if (exerciseName.includes('curl') || exerciseName.includes('raise') || 
          exerciseName.includes('fly') || exerciseName.includes('tricep')) {
        increment = 2.5;
      }
      // Larger increments for compound exercises
      else if (exerciseName.includes('deadlift') || exerciseName.includes('squat') || 
               exerciseName.includes('leg press')) {
        increment = 10;
      }

      const newValue = Math.max(0, currentValue + (adjustment * increment));
      const newValueStr = newValue.toString();
      
      setNumpadValue(newValueStr);
      
      // Update immediately
      setExercises(exercises.map(ex => {
        if (ex.id === activeInput.exerciseId) {
          const updatedSets = [...ex.sets];
          updatedSets[activeInput.setIndex] = {
            ...updatedSets[activeInput.setIndex],
            [activeInput.field]: newValueStr
          };
          return { ...ex, sets: updatedSets };
        }
        return ex;
      }));
    }
  };

  const handleNumpadDone = () => {
    hapticFeedback.medium();
    
    // If we're setting a custom rest timer from the timer modal
    if (numpadMode === 'rest' && !activeInput) {
      const minutes = parseInt(numpadValue.slice(0, 2) || '0');
      const seconds = parseInt(numpadValue.slice(2, 4) || '0');
      const totalSeconds = (minutes * 60) + seconds;
      
      if (totalSeconds > 0 && totalSeconds <= 5999) {
        handleStartRestTimer(totalSeconds);
      }
    }
    
    setShowNumpad(false);
    setNumpadValue('');
    setActiveInput(null);
  };

  const handleToggleSetComplete = (exerciseId, setIndex) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const updatedSets = [...ex.sets];
        const currentSet = updatedSets[setIndex];
        const isCompleting = !currentSet.completed;
        
        // VALIDATION: Prevent marking as complete if weight OR reps is empty
        if (isCompleting) {
          const hasWeight = currentSet.weight && currentSet.weight.trim() !== '';
          const hasReps = currentSet.reps && currentSet.reps.trim() !== '';
          
          if (!hasWeight || !hasReps) {
            hapticFeedback.warning();
            // Just shake - no alert popup
            return ex; // Return unchanged exercise
          }
        }
        
        hapticFeedback.success();
        
        // If completing the set, start the rest timer ONLY if rest time > 0
        if (isCompleting) {
          // Use ?? instead of || to avoid treating 0 as falsy
          const restSeconds = updatedSets[setIndex].rest ?? 120; // Default to 2 minutes if not set
          
          // Only show timer if rest time is greater than 0
          if (restSeconds > 0) {
            startTimerWithTimestamp(restSeconds);
            setShowRestTimer(true);
            setShowTimerPicker(false);
          }
          
          // Initialize animation values
          updatedSets[setIndex].scaleAnim = new Animated.Value(0);
          updatedSets[setIndex].glowAnim = new Animated.Value(0);
          updatedSets[setIndex].pulseAnim = new Animated.Value(1);
        }
        
        updatedSets[setIndex] = {
          ...updatedSets[setIndex],
          completed: isCompleting
        };
        
        // Trigger amazing animation sequence
        if (isCompleting) {
          const set = updatedSets[setIndex];
          
          // Main scale pop
          Animated.spring(set.scaleAnim, {
            toValue: 1,
            tension: 40,
            friction: 5,
            useNativeDriver: true,
          }).start();
          
          // Glow fade in
          Animated.timing(set.glowAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }).start();
          
          // Continuous subtle pulse
          Animated.loop(
            Animated.sequence([
              Animated.timing(set.pulseAnim, {
                toValue: 1.02,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(set.pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ).start();
        }
        
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  const handleFinish = () => {
    console.log('🔥 handleFinish called!');
    hapticFeedback.medium();
    
    // Check if there are ANY completed sets at all
    const hasAnyCompletedSets = exercises.some(ex => 
      ex.sets.some(set => set.completed === true)
    );
    
    if (!hasAnyCompletedSets) {
      console.log('⚠️ No completed sets found');
      hapticFeedback.warning();
      
      const hasExercises = exercises.length > 0;
      const hasAnyData = exercises.some(ex => 
        ex.sets.some(set => (set.weight && set.weight !== '') || (set.reps && set.reps !== ''))
      );
      
      if (!hasExercises || !hasAnyData) {
        setShowEmptyWorkoutAlert(true);
      } else {
        setShowNoSetsAlert(true);
      }
      return;
    }
    
    // Check if there are any incomplete sets with valid data
    const hasIncompleteSets = exercises.some(ex => 
      ex.sets.some(set => {
        const hasData = (set.weight && set.weight !== '') || (set.reps && set.reps !== '');
        const isIncomplete = !set.completed;
        return hasData && isIncomplete;
      })
    );
    
    if (hasIncompleteSets) {
      setShowFinishConfirm(true);
    } else {
      saveWorkout(exercises);
    }
  };
  
  const handleCompleteUnfinishedSets = () => {
    // Mark all sets with data as complete
    const updatedExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(set => ({
        ...set,
        completed: set.weight || set.reps ? true : set.completed
      }))
    }));
    setExercises(updatedExercises);
    setShowFinishConfirm(false);
    
    // Wait a moment for state to update, then save
    setTimeout(() => {
      saveWorkout(updatedExercises);
    }, 100);
  };
  
  const handleDiscardUnfinishedSets = () => {
    // Remove sets that have data but aren't completed, keep only completed sets
    const updatedExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.filter(set => set.completed)
    })).filter(ex => ex.sets.length > 0); // Remove exercises with no completed sets
    
    setShowFinishConfirm(false);
    
    // Wait a moment for state to update, then save
    setTimeout(() => {
      saveWorkout(updatedExercises);
    }, 100);
  };
  
  const handleCancelWorkout = () => {
    setShowFinishConfirm(false);
    hapticFeedback.light();
    stopAllSetAnimations(); // Stop infinite pulse loops
    endWorkout(); // End workout when user cancels
    onClose(); // Close without saving
  };
  
  const saveWorkout = async (exercisesToSave) => {
    try {
      console.log('💾 Starting to save workout...');
      
      // STOP THE TIMER IMMEDIATELY
      setIsWorkoutFinished(true);
      
      // Safety check for workoutStartTime
      const startTime = workoutStartTime ? workoutStartTime.toISOString() : new Date().toISOString();
      
      // Prepare workout data for saving
      const workoutData = {
        name: workoutName,
        templateId: templateData?.id || null, // Link to template if started from one
        startTime: startTime,
        endTime: new Date().toISOString(),
        duration: contextElapsedTime,
        exercises: exercisesToSave.map(ex => ({
          name: ex.name,
          bodyPart: ex.bodyPart,
          equipment: ex.equipment,
          sets: ex.sets.map(set => ({
            weight: set.weight,
            reps: set.reps,
            rest: set.rest,
            completed: set.completed
          }))
        })),
        note: workoutNote,
        photo: workoutPhoto,
      };
      
      console.log('📦 Workout data prepared:', JSON.stringify(workoutData, null, 2));
      
      // Save workout to history
      await WorkoutService.saveWorkout(workoutData);
      console.log('✅ Workout saved to history');
      
      // Get total workout count (don't fail if this fails)
      let workoutCount = 1;
      try {
        const history = await WorkoutService.getWorkoutHistory();
        workoutCount = history.length;
        console.log('📊 Total workouts:', workoutCount);
      } catch (error) {
        console.warn('⚠️ Could not get workout count:', error);
      }
      
      console.log('🎉 Showing completion modal');
      hapticFeedback.success();
      
      // Set the data and show completion modal (DON'T close main modal yet)
      setCompletedWorkoutData(workoutData);
      setTotalWorkoutCount(workoutCount);
      setShowCompletionModal(true);
    } catch (error) {
      console.error('❌ Error saving workout:', error);
      console.error('Error details:', error.message, error.stack);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleCancel = () => {
    hapticFeedback.light();
    
    // Show confirmation dialog
    Alert.alert(
      "Cancel Workout?",
      "Are you sure you want to cancel this workout? All progress will be lost.",
      [
        {
          text: "Keep Workout",
          style: "cancel",
          onPress: () => {
            hapticFeedback.light();
          }
        },
        {
          text: "Cancel Workout",
          style: "destructive",
          onPress: () => {
            console.log('🏋️ User confirmed cancel - ending workout');
            hapticFeedback.success();
            stopAllSetAnimations();
            endWorkout();
            onClose();
          }
        }
      ]
    );
  };

  // Schedule a local push notification for when rest ends
  const scheduleRestNotification = async (durationSeconds) => {
    try {
      // Ensure we have notification permissions before scheduling
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('[RestTimer] Notification permission not granted');
          return;
        }
      }
      // Cancel any existing rest notification first
      await cancelRestNotification();
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rest Complete',
          body: 'Time to start your next set!',
          sound: 'default',
        },
        trigger: { seconds: Math.max(1, Math.round(durationSeconds)), type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
      });
      restNotificationId.current = id;
    } catch (e) {
      console.warn('[RestTimer] Could not schedule notification:', e.message);
    }
  };

  const cancelRestNotification = async () => {
    if (restNotificationId.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(restNotificationId.current);
      } catch (e) { /* ignore */ }
      restNotificationId.current = null;
    }
  };

  // Start the rest timer using an absolute end timestamp
  const startTimerWithTimestamp = (duration) => {
    timerEndTime.current = Date.now() + duration * 1000;
    setRestTimerDuration(duration);
    setRestTimerRemaining(duration);
    setIsTimerRunning(true);
    scheduleRestNotification(duration);
  };

  const handleStartRestTimer = (duration) => {
    startTimerWithTimestamp(duration);
    setShowTimerPicker(false);
    hapticFeedback.success();
  };

  const handleStopRestTimer = () => {
    setIsTimerRunning(false);
    timerEndTime.current = null;
    cancelRestNotification();
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    hapticFeedback.light();
  };

  const handleSkipRestTimer = () => {
    setIsTimerRunning(false);
    setShowRestTimer(false);
    setShowTimerPicker(true);
    setRestTimerRemaining(restTimerDuration);
    timerEndTime.current = null;
    cancelRestNotification();
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    hapticFeedback.medium();
  };

  const handleAdjustTimer = (seconds) => {
    const newRemaining = Math.max(0, Math.min(5999, restTimerRemaining + seconds));
    setRestTimerRemaining(newRemaining);
    setRestTimerDuration(newRemaining);
    // Recalculate end time and reschedule notification
    timerEndTime.current = Date.now() + newRemaining * 1000;
    scheduleRestNotification(newRemaining);
    hapticFeedback.light();
  };

  const handleCreateCustomTimer = () => {
    setShowTimerPicker(false);
    setNumpadMode('rest');
    setNumpadValue('0000'); // Start at 00:00
    setActiveInput(null); // Make sure activeInput is null so we know it's for the timer
    hapticFeedback.light();
  };

  // Keep the ref in sync with the state so AppState listener always reads the latest value
  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning;
  }, [isTimerRunning]);

  // Helper: complete the timer (shared by interval tick & AppState handler)
  const completeRestTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    timerEndTime.current = null;
    setIsTimerRunning(false);
    setShowRestTimer(false);
    setShowTimerPicker(true);
    setRestTimerRemaining(0);
    setShowRestComplete(true);
    cancelRestNotification();
    hapticFeedback.success();
  };

  // Helper: start (or restart) the countdown interval
  const startCountdownInterval = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    timerInterval.current = setInterval(() => {
      // Guard: if timerEndTime was already cleared, bail out
      if (!timerEndTime.current) {
        if (timerInterval.current) {
          clearInterval(timerInterval.current);
          timerInterval.current = null;
        }
        return;
      }
      const remaining = Math.round((timerEndTime.current - Date.now()) / 1000);
      if (remaining <= 0) {
        completeRestTimer();
      } else {
        setRestTimerRemaining(remaining);
      }
    }, 500); // Check every 500ms for responsive updates
  };

  // Timer countdown effect – uses absolute end timestamp so background time is counted
  useEffect(() => {
    if (isTimerRunning && timerEndTime.current) {
      startCountdownInterval();
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [isTimerRunning]);

  // AppState listener – recalculate timer immediately when app returns to foreground.
  // Uses isTimerRunningRef (not the state variable) to avoid stale-closure issues,
  // and restarts the interval so ticks are accurate after an iOS suspend/resume.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isTimerRunningRef.current && timerEndTime.current) {
        const remaining = Math.round((timerEndTime.current - Date.now()) / 1000);
        if (remaining <= 0) {
          // Timer finished while the app was in the background
          completeRestTimer();
        } else {
          // Timer still running – immediately update the displayed time …
          setRestTimerRemaining(remaining);
          // … and restart the interval so it ticks accurately from now on
          startCountdownInterval();
        }
      }
    });

    return () => subscription.remove();
  }, []); // empty deps – relies on refs, not closure state

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to add them to your workout.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setWorkoutPhoto(result.assets[0].uri);
      hapticFeedback.success();
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 50);
  };

  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1000, 0],
  });

  const combinedTranslateY = Animated.add(modalTranslateY, panY);

  return (
    <>
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleCloseModal}
    >
      <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
        {/* Backdrop - always visible when modal is open */}
        <View style={{ ...StyleSheet.absoluteFillObject }}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={0.7}
            onPress={handleCloseModal}
          />
        </View>

        {/* Modal Content */}
        <Animated.View 
          style={[
            styles.container, 
            { 
              backgroundColor: theme.background,
              transform: [{ translateY: combinedTranslateY }],
            }
          ]}
        >
          {/* Empty Workout Alert Overlay */}
          {showEmptyWorkoutAlert && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999999,
              elevation: 999999,
            }}>
              <View style={{ 
                backgroundColor: theme.card,
                padding: 32,
                borderRadius: 24,
                width: '85%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
              }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 16, textAlign: 'center' }}>
                  Empty Workout
                </Text>
                
                <Text style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 32, textAlign: 'center', lineHeight: 24 }}>
                  This workout is empty. Do you want to cancel?
                </Text>
                
                <TouchableOpacity
                  style={{ backgroundColor: theme.error || '#EF4444', padding: 18, borderRadius: 16, marginBottom: 12 }}
                  onPress={() => {
                    hapticFeedback.success();
                    stopAllSetAnimations();
                    setShowEmptyWorkoutAlert(false);
                    endWorkout(); // End workout to remove mini player
                    onClose();
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                    Cancel Workout
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 18, borderRadius: 16 }}
                  onPress={() => {
                    hapticFeedback.light();
                    setShowEmptyWorkoutAlert(false);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                    Keep Workout
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* No Completed Sets Alert Overlay */}
          {showNoSetsAlert && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 999999,
              elevation: 999999,
            }}>
              <View style={{ 
                backgroundColor: theme.card,
                padding: 32,
                borderRadius: 24,
                width: '85%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
              }}>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 16, textAlign: 'center' }}>
                  No Completed Sets
                </Text>
                
                <Text style={{ fontSize: 16, color: theme.textSecondary, marginBottom: 32, textAlign: 'center', lineHeight: 24 }}>
                  You haven't completed any sets yet. Do you want to cancel this workout?
                </Text>
                
                <TouchableOpacity
                  style={{ backgroundColor: theme.error || '#EF4444', padding: 18, borderRadius: 16, marginBottom: 12 }}
                  onPress={() => {
                    hapticFeedback.success();
                    stopAllSetAnimations();
                    setShowNoSetsAlert(false);
                    endWorkout(); // End workout to remove mini player and discard everything
                    onClose();
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                    Cancel Workout
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: 18, borderRadius: 16 }}
                  onPress={() => {
                    hapticFeedback.light();
                    setShowNoSetsAlert(false);
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>
                    Keep Working Out
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Workout Completion Overlay */}
          {showCompletionModal && completedWorkoutData && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999999,
              elevation: 9999999,
            }}>
              <WorkoutCompletionModal
                visible={true}
                onClose={() => {
                  console.log('Completion modal closing');
                  // Stop all set pulse loops before clearing exercises
                  stopAllSetAnimations();
                  setShowCompletionModal(false);
                  setWorkoutName('Workout 1');
                  setExercises([]);
                  setPreviousWorkout(null);
                  setWorkoutNote('');
                  setWorkoutPhoto(null);
                  endWorkout(); // End the workout in context
                  onClose();
                }}
                workoutData={completedWorkoutData}
                workoutCount={totalWorkoutCount}
              />
            </View>
          )}

          {/* Pull Indicator */}
          <View {...panResponder.panHandlers} style={styles.pullIndicatorContainer}>
            <View style={[styles.pullIndicator, { backgroundColor: theme.textSecondary }]} />
          </View>

          {/* Loading Indicator - Show while initializing */}
          {isInitializing ? (
            <View style={styles.loadingContainer}>
              <View style={[styles.loadingContent, { backgroundColor: theme.card }]}>
                <MaterialIcons name="fitness-center" size={48} color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Preparing Workout...</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.light();
                      setShowRestTimer(true);
                      // If timer is running, show the countdown directly
                      if (isTimerRunning) {
                        setShowTimerPicker(false);
                      } else {
                        setShowTimerPicker(true);
                      }
                    }}
                    style={styles.headerButton}
                  >
                    <MaterialIcons name="timer" size={28} color={isTimerRunning ? theme.primary : theme.textSecondary} />
                  </TouchableOpacity>

                  <View style={styles.headerCenter}>
                    <Text style={[styles.headerTimer, { color: theme.text }]}>
                      {formatTime(contextElapsedTime)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleFinish}
                    style={[styles.finishButton, { backgroundColor: theme.success || '#4CAF50' }]}
                  >
                    <Text style={styles.finishButtonText}>Finish</Text>
                  </TouchableOpacity>
                </View>
              </View>

        {/* Main Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const offsetY = event.nativeEvent.contentOffset.y;
            setIsScrolled(offsetY > 50);
            setIsAtTop(offsetY <= 0);
          }}
          scrollEventThrottle={16}
        >
          {/* Workout Info */}
          <View style={styles.workoutInfo}>
            <View style={styles.workoutTitleRow}>
              {isEditingName ? (
                <TextInput
                  style={[styles.workoutTitleInput, { color: theme.text, borderColor: theme.primary }]}
                  value={editingNameText}
                  onChangeText={setEditingNameText}
                  onBlur={() => {
                    if (editingNameText.trim()) {
                      setWorkoutName(editingNameText.trim());
                    }
                    setIsEditingName(false);
                  }}
                  autoFocus
                  placeholder="Workout name"
                  placeholderTextColor={theme.textSecondary}
                />
              ) : (
                <Text style={[styles.workoutTitle, { color: theme.text }]}>
                  {workoutName}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  setShowMenu(!showMenu);
                }}
                style={styles.menuButton}
              >
                <View style={styles.threeDots}>
                  <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                  <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                  <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.workoutMeta}>
              <MaterialIcons name="calendar-today" size={16} color={theme.textSecondary} />
              <Text style={[styles.workoutMetaText, { color: theme.textSecondary }]}>
                {formatDate(workoutStartTime)}
              </Text>
            </View>
            
            <View style={[styles.workoutMeta, { marginTop: 4 }]}>
              <MaterialIcons name="access-time" size={16} color={theme.textSecondary} />
              <Text style={[styles.workoutMetaText, { color: theme.textSecondary }]}>
                {formatTime(contextElapsedTime)}
              </Text>
            </View>
          </View>

          {/* Three Dot Menu */}
          {showMenu && (
            <View style={[styles.menu, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5' }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  hapticFeedback.light();
                  setShowMenu(false);
                  setEditingNameText(workoutName);
                  setIsEditingName(true);
                }}
              >
                <MaterialIcons name="edit" size={20} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Edit Workout Name
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  hapticFeedback.light();
                  setShowMenu(false);
                  handlePickPhoto();
                }}
              >
                <MaterialIcons name="photo-camera" size={20} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Add Photo
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  hapticFeedback.light();
                  setShowMenu(false);
                  setShowNoteInput(true);
                }}
              >
                <MaterialIcons name="note" size={20} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Add Note
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Note Input */}
          {showNoteInput && (
            <View style={[styles.noteContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5' }]}>
              <TextInput
                style={[styles.noteInput, { color: theme.text, borderColor: theme.border }]}
                value={workoutNote}
                onChangeText={setWorkoutNote}
                placeholder="Add a note about this workout..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.saveNoteButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  hapticFeedback.medium();
                  setShowNoteInput(false);
                }}
              >
                <Text style={styles.saveNoteButtonText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Display Saved Note */}
          {workoutNote && !showNoteInput && (
            <View style={[styles.savedNote, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <View style={styles.savedNoteHeader}>
                <MaterialIcons name="note" size={18} color={theme.primary} />
                <Text style={[styles.savedNoteTitle, { color: theme.text }]}>Note</Text>
              </View>
              <Text style={[styles.savedNoteText, { color: theme.textSecondary }]}>
                {workoutNote}
              </Text>
            </View>
          )}

          {/* Display Workout Photo */}
          {workoutPhoto && (
            <View style={styles.photoContainer}>
              <View style={styles.photoHeader}>
                <MaterialIcons name="photo" size={18} color={theme.primary} />
                <Text style={[styles.photoTitle, { color: theme.text }]}>Workout Photo</Text>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.light();
                    setWorkoutPhoto(null);
                  }}
                  style={styles.removePhotoButton}
                >
                  <MaterialIcons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Image
                source={{ uri: workoutPhoto }}
                style={styles.workoutImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Exercise Cards */}
          {exercises.map((exercise) => (
            <View key={exercise.id} style={[styles.exerciseCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              {/* Exercise Header */}
              <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseName, { color: theme.primary }]}>
                  {exercise.name}
                </Text>
              </View>

              {/* Sets Table Header */}
              <View style={styles.setsHeader}>
                <Text style={[styles.headerText, { color: theme.text, width: 40 }]}>Set</Text>
                <Text style={[styles.headerText, { color: theme.text, flex: 1 }]}>Previous</Text>
                <Text style={[styles.headerText, { color: theme.text, flex: 1 }]}>+{weightUnit}</Text>
                <Text style={[styles.headerText, { color: theme.text, flex: 1 }]}>Reps</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Sets */}
              {exercise.sets.map((set, setIndex) => {
                // Safely handle animation values - use plain number 1 if animations not initialized
                const hasAnimations = set.scaleAnim && typeof set.scaleAnim.interpolate === 'function';
                const glowOpacity = set.completed && set.glowAnim ? set.glowAnim : 0;
                
                return (
                  <Animated.View 
                    key={setIndex}
                    style={[
                      {
                        transform: [
                          { scale: set.completed && hasAnimations && set.pulseAnim 
                            ? Animated.multiply(
                                set.scaleAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.95, 1]
                                }), 
                                set.pulseAnim
                              ) 
                            : 1 
                          }
                        ],
                        marginVertical: set.completed ? 3 : 0,
                      }
                    ]}
                  >
                    {set.completed ? (
                      <LinearGradient
                        colors={['#10B981', '#059669', '#047857']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.setRow,
                          {
                            borderRadius: 16,
                            paddingVertical: 18,
                            paddingHorizontal: 12,
                            shadowColor: '#10B981',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.5,
                            shadowRadius: 16,
                            elevation: 12,
                          }
                        ]}
                      >
                        {/* Animated glow overlay */}
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            opacity: glowOpacity,
                          }}
                        />
                        
                        {/* Set Number */}
                        <View style={[styles.setNumber, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                          <Text style={[styles.setNumberText, { color: '#FFFFFF', fontWeight: '700' }]}>
                            {setIndex + 1}
                          </Text>
                        </View>

                        {/* Previous */}
                        <View style={styles.previousCell}>
                          <Text style={[styles.previousText, { color: 'rgba(255,255,255,0.8)', fontWeight: '600' }]}>
                            {set.previous ? `${set.previous.weight || '—'} × ${set.previous.reps || '—'}` : '—'}
                          </Text>
                        </View>

                        {/* Weight */}
                        <View
                          style={[
                            styles.inputCell,
                            { backgroundColor: 'rgba(255,255,255,0.25)' }
                          ]}
                        >
                          <Text style={[styles.inputText, { color: '#FFFFFF', fontWeight: '700' }]}>
                            {set.weight || ''}
                          </Text>
                        </View>

                        {/* Reps */}
                        <View
                          style={[
                            styles.inputCell,
                            { backgroundColor: 'rgba(255,255,255,0.25)' }
                          ]}
                        >
                          <Text style={[styles.inputText, { color: '#FFFFFF', fontWeight: '700' }]}>
                            {set.reps || ''}
                          </Text>
                        </View>

                        {/* Checkmark */}
                        <TouchableOpacity
                          style={[styles.checkmarkButton, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }]}
                          onPress={() => handleToggleSetComplete(exercise.id, setIndex)}
                        >
                          <MaterialIcons name="check-circle" size={34} color="#FFFFFF" />
                        </TouchableOpacity>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.setRow, { paddingVertical: 8 }]}>
                        {/* Set Number */}
                        <View style={[styles.setNumber, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.setNumberText, { color: theme.text }]}>
                            {setIndex + 1}
                          </Text>
                        </View>

                        {/* Previous */}
                        <View style={styles.previousCell}>
                          <Text style={[styles.previousText, { color: theme.textSecondary }]}>
                            {set.previous ? `${set.previous.weight || '—'} × ${set.previous.reps || '—'}` : '—'}
                          </Text>
                        </View>

                        {/* Weight Input */}
                        <TouchableOpacity
                          style={[
                            styles.inputCell,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                              borderColor: activeInput?.exerciseId === exercise.id && activeInput?.setIndex === setIndex && activeInput?.field === 'weight' ? theme.primary : 'transparent',
                              borderWidth: 2,
                            }
                          ]}
                          onPress={() => handleInputPress(exercise.id, setIndex, 'weight')}
                        >
                          <Text style={[styles.inputText, { color: set.weight ? theme.text : theme.textSecondary }]}>
                            {set.weight || ''}
                          </Text>
                        </TouchableOpacity>

                        {/* Reps Input */}
                        <TouchableOpacity
                          style={[
                            styles.inputCell,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                              borderColor: activeInput?.exerciseId === exercise.id && activeInput?.setIndex === setIndex && activeInput?.field === 'reps' ? theme.primary : 'transparent',
                              borderWidth: 2,
                            }
                          ]}
                          onPress={() => handleInputPress(exercise.id, setIndex, 'reps')}
                        >
                          <Text style={[styles.inputText, { color: set.reps ? theme.text : theme.textSecondary }]}>
                            {set.reps || ''}
                          </Text>
                        </TouchableOpacity>

                        {/* Checkmark */}
                        <TouchableOpacity
                          style={styles.checkmarkButton}
                          onPress={() => handleToggleSetComplete(exercise.id, setIndex)}
                        >
                          <MaterialIcons name="radio-button-unchecked" size={32} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Rest Timer - only show for incomplete sets */}
                    {!set.completed && (
                      <View style={[styles.restTimerRow, { paddingTop: 4 }]}>
                        <TouchableOpacity onPress={() => handleInputPress(exercise.id, setIndex, 'rest')}>
                          <Text style={[styles.restTimerText, { color: theme.primary }]}>
                            {Math.floor(set.rest / 60)}:{(set.rest % 60).toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Animated.View>
                );
              })}

              {/* Add Set Button */}
              <TouchableOpacity
                style={[styles.addSetButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                onPress={() => handleAddSet(exercise.id)}
              >
                <Text style={[styles.addSetButtonText, { color: theme.textSecondary }]}>
                  + Add Set ({Math.floor(exercise.restTime / 60)}:{(exercise.restTime % 60).toString().padStart(2, '0')})
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Exercises Button */}
          <TouchableOpacity
            style={[styles.addExercisesButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
            onPress={() => {
              hapticFeedback.medium();
              setShowWorkoutExercisePicker(true);
            }}
          >
            <Text style={[styles.addExercisesButtonText, { color: theme.primary }]}>
              Add Exercises
            </Text>
          </TouchableOpacity>

          {/* Cancel Workout Button */}
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.1)' : 'rgba(255,59,48,0.05)' }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: '#FF3B30' }]}>
              Cancel Workout
            </Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Exercise Picker Modal */}
        <ExercisesModal
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          onSelectExercise={handleAddExercise}
          selectionMode={true}
        />

        {/* Workout Exercise Picker - New Sheet Style */}
        <WorkoutExercisePicker
          visible={showWorkoutExercisePicker}
          onClose={() => setShowWorkoutExercisePicker(false)}
          onSelectExercise={(exercise) => {
            handleAddExercise(exercise);
          }}
        />

        {/* Custom Numpad */}
        {showNumpad && (
          <View style={[styles.numpadContainer, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
            <View style={styles.numpadGrid}>
              <View style={styles.numpadNumbersColumn}>
                {/* Row 1 */}
                <View style={styles.numpadRow}>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('1')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('2')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('3')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>3</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2 */}
                <View style={styles.numpadRow}>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('4')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('5')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('6')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>6</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 3 */}
                <View style={styles.numpadRow}>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('7')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>7</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('8')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>8</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('9')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>9</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 4 */}
                <View style={styles.numpadRow}>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('.')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('0')}>
                    <Text style={[styles.numpadText, { color: theme.text }]}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.numpadNumberButton} onPress={() => handleNumpadPress('backspace')}>
                    <MaterialIcons name="backspace" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Side Buttons Column */}
              <View style={styles.numpadSideColumn}>
                <TouchableOpacity 
                  style={[styles.numpadSideButton, { backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6' }]}
                  onPress={() => handleNumpadAdjust(-1)}
                >
                  <Text style={[styles.numpadText, { color: theme.text }]}>−</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.numpadSideButton, { backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6' }]}
                  onPress={() => handleNumpadAdjust(1)}
                >
                  <Text style={[styles.numpadText, { color: theme.text }]}>+</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.numpadDoneButtonSide, { backgroundColor: theme.primary }]} 
                  onPress={handleNumpadDone}
                >
                  <Text style={[styles.numpadDoneText, { color: '#FFFFFF' }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Rest Timer Modal */}
        <Modal
          visible={showRestTimer}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowRestTimer(false);
            setShowTimerPicker(true);
          }}
        >
          <View style={styles.timerModalOverlay}>
            <TouchableOpacity 
              style={styles.timerModalBackdrop} 
              activeOpacity={0.7}
              onPress={() => {
                setShowRestTimer(false);
                setShowTimerPicker(true);
              }}
            />
            
            <View style={[styles.timerModalContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              {/* Close Button */}
              <TouchableOpacity
                style={[styles.timerCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => {
                  setShowRestTimer(false);
                  setShowTimerPicker(true);
                }}
              >
                <MaterialIcons name="close" size={20} color={theme.text} />
              </TouchableOpacity>

              {/* Title */}
              <Text style={[styles.timerModalTitle, { color: theme.text }]}>Rest Timer</Text>

              {showTimerPicker ? (
                <>
                  {/* Subtitle */}
                  <Text style={[styles.timerModalSubtitle, { color: theme.textSecondary }]}>
                    Choose a duration below or set your own.{'\n'}Custom durations are saved for next time.
                  </Text>

                  {/* Circular Timer Options */}
                  <View style={styles.timerCircleContainer}>
                    <View style={styles.timerCircle}>
                      {/* 0:30 - Top */}
                      <TouchableOpacity
                        onPress={() => handleStartRestTimer(30)}
                        style={[styles.timerOption, { top: 15 }]}
                      >
                        <Text style={styles.timerOptionText}>0:30</Text>
                      </TouchableOpacity>

                      {/* 1:00 - Center Top */}
                      <TouchableOpacity
                        onPress={() => handleStartRestTimer(60)}
                        style={[styles.timerOption, { top: 55 }]}
                      >
                        <Text style={styles.timerOptionText}>1:00</Text>
                      </TouchableOpacity>

                      {/* 2:00 - Center Bottom */}
                      <TouchableOpacity
                        onPress={() => handleStartRestTimer(120)}
                        style={[styles.timerOption, { top: 95 }]}
                      >
                        <Text style={styles.timerOptionText}>2:00</Text>
                      </TouchableOpacity>

                      {/* 3:00 - Bottom */}
                      <TouchableOpacity
                        onPress={() => handleStartRestTimer(180)}
                        style={[styles.timerOption, { top: 135 }]}
                      >
                        <Text style={styles.timerOptionText}>3:00</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Custom Timer Button */}
                  <TouchableOpacity
                    style={[styles.customTimerButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}
                    onPress={handleCreateCustomTimer}
                  >
                    <Text style={[styles.customTimerButtonText, { color: theme.text }]}>
                      Create Custom Timer
                    </Text>
                  </TouchableOpacity>
                </>
              ) : !isTimerRunning ? (
                <>
                  {/* Custom Timer Input */}
                  <Text style={[styles.timerModalSubtitle, { color: theme.textSecondary }]}>
                    Enter your custom rest time.
                  </Text>

                  {/* Display the time being entered */}
                  <View style={styles.timerCircleContainer}>
                    <View style={styles.timerCircle}>
                      <Text style={[styles.timerMainTime, { color: theme.text }]}>
                        {numpadValue.slice(0, 2) || '00'}:{numpadValue.slice(2, 4) || '00'}
                      </Text>
                    </View>
                  </View>

                  {/* Numpad for custom timer */}
                  <View style={[styles.timerNumpadContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <View style={styles.timerNumpadGrid}>
                      {/* Row 1 */}
                      <View style={styles.timerNumpadRow}>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('1')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('2')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>2</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('3')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>3</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Row 2 */}
                      <View style={styles.timerNumpadRow}>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('4')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>4</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('5')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('6')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>6</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Row 3 */}
                      <View style={styles.timerNumpadRow}>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('7')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>7</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('8')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>8</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('9')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>9</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Row 4 */}
                      <View style={styles.timerNumpadRow}>
                        <TouchableOpacity 
                          style={styles.timerNumpadButton} 
                          onPress={() => {
                            setShowTimerPicker(true);
                            setNumpadValue('0200');
                          }}
                        >
                          <Text style={[styles.timerNumpadText, { color: theme.textSecondary }]}>←</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.timerNumpadButton} onPress={() => handleNumpadPress('0')}>
                          <Text style={[styles.timerNumpadText, { color: theme.text }]}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.timerNumpadButton, { backgroundColor: theme.primary }]} 
                          onPress={handleNumpadDone}
                        >
                          <Text style={[styles.timerNumpadText, { color: '#FFFFFF' }]}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Running Timer Display */}
                  <Text style={[styles.timerModalSubtitle, { color: theme.textSecondary }]}>
                    Adjust duration via the +/− buttons.
                  </Text>

                  {/* Circular Progress Timer */}
                  <View style={styles.timerCircleContainer}>
                    <View style={styles.timerCircle}>
                      {/* Progress Ring */}
                      <View style={styles.timerProgressRing}>
                        <View
                          style={[
                            styles.timerProgressCircle,
                            {
                              borderColor: theme.primary,
                              borderWidth: 10,
                              width: 230,
                              height: 230,
                              borderRadius: 115,
                              transform: [
                                {
                                  rotate: `${((restTimerDuration - restTimerRemaining) / restTimerDuration) * 360}deg`
                                }
                              ],
                              borderTopColor: 'transparent',
                              borderRightColor: 'transparent',
                            }
                          ]}
                        />
                      </View>

                      {/* Time Display */}
                      <View style={styles.timerDisplay}>
                        <Text style={[styles.timerMainTime, { color: theme.text }]}>
                          {Math.floor(restTimerRemaining / 60)}:{(restTimerRemaining % 60).toString().padStart(2, '0')}
                        </Text>
                        <Text style={[styles.timerOriginalTime, { color: theme.textSecondary }]}>
                          {Math.floor(restTimerDuration / 60)}:{(restTimerDuration % 60).toString().padStart(2, '0')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Timer Controls */}
                  <View style={styles.timerControls}>
                    <TouchableOpacity
                      style={[styles.timerAdjustButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}
                      onPress={() => handleAdjustTimer(-10)}
                    >
                      <Text style={[styles.timerAdjustText, { color: theme.text }]}>-10s</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timerAdjustButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' }]}
                      onPress={() => handleAdjustTimer(10)}
                    >
                      <Text style={[styles.timerAdjustText, { color: theme.text }]}>+10s</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.timerSkipButton, { backgroundColor: theme.primary }]}
                      onPress={handleSkipRestTimer}
                    >
                      <Text style={[styles.timerSkipText, { color: '#FFFFFF' }]}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Rest Complete Modal */}
        <Modal
          visible={showRestComplete}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRestComplete(false)}
        >
          <View style={styles.restCompleteOverlay}>
            <TouchableOpacity 
              style={styles.restCompleteBackdrop} 
              activeOpacity={0.7}
              onPress={() => setShowRestComplete(false)}
            />
            
            <View style={[styles.restCompleteContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              {/* Success Icon */}
              <View style={[styles.restCompleteIconContainer, { backgroundColor: theme.success || '#10B981' }]}>
                <MaterialIcons name="check" size={48} color="#FFFFFF" />
              </View>

              {/* Title */}
              <Text style={[styles.restCompleteTitle, { color: theme.text }]}>
                Rest Complete
              </Text>

              {/* Message */}
              <Text style={[styles.restCompleteMessage, { color: theme.textSecondary }]}>
                Time to crush your next set
              </Text>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.restCompleteButton, { backgroundColor: theme.success || '#10B981' }]}
                onPress={() => setShowRestComplete(false)}
              >
                <Text style={styles.restCompleteButtonText}>Let's Go</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Finish Confirmation Modal */}
        <Modal
          visible={showFinishConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFinishConfirm(false)}
        >
          <View style={styles.restCompleteOverlay}>
            <TouchableOpacity 
              style={styles.restCompleteBackdrop} 
              activeOpacity={0.7}
              onPress={() => setShowFinishConfirm(false)}
            />
            
            <View style={[styles.finishConfirmContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              {/* Logo Icon */}
              <View style={styles.finishConfirmIconContainer}>
                <Image 
                  source={require('../../assets/logo.png')}
                  style={styles.finishConfirmLogo}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
              <Text style={[styles.finishConfirmTitle, { color: theme.text }]}>
                Finish Workout?
              </Text>

              {/* Message */}
              <Text style={[styles.finishConfirmMessage, { color: theme.textSecondary }]}>
                There are valid sets in this workout that have not been marked as complete.
              </Text>

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.finishConfirmPrimaryButton, { backgroundColor: theme.success || '#10B981' }]}
                onPress={() => {
                  hapticFeedback.success();
                  handleCompleteUnfinishedSets();
                }}
              >
                <Text style={styles.finishConfirmPrimaryButtonText}>Complete Unfinished Sets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.finishConfirmDangerButton, { backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)' }]}
                onPress={() => {
                  hapticFeedback.light();
                  handleCancelWorkout();
                }}
              >
                <Text style={[styles.finishConfirmDangerButtonText, { color: '#FF3B30' }]}>Cancel Workout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.finishConfirmSecondaryButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => {
                  hapticFeedback.light();
                  setShowFinishConfirm(false);
                }}
              >
                <Text style={[styles.finishConfirmSecondaryButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
            </>
          )}

        </Animated.View>

      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    height: SCREEN_HEIGHT * 0.91,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pullIndicatorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pullIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    opacity: 0.3,
  },
  header: {
    borderBottomWidth: 0.5,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTimer: {
    fontSize: 20,
    fontWeight: '600',
  },
  finishButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  workoutInfo: {
    marginBottom: 24,
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  workoutTitleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
    borderBottomWidth: 2,
    paddingVertical: 4,
  },
  menuButton: {
    padding: 8,
  },
  threeDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutMetaText: {
    fontSize: 15,
  },
  menu: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  addExercisesButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  addExercisesButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  bottomBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  bottomBarTime: {
    fontSize: 14,
  },
  bottomBarButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  bottomBarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 12,
  },
  saveNoteButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  savedNote: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  savedNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  savedNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  savedNoteText: {
    fontSize: 15,
    lineHeight: 22,
  },
  photoContainer: {
    marginBottom: 24,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  removePhotoButton: {
    padding: 4,
  },
  workoutImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseMenuButton: {
    padding: 4,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  setNumber: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previousCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  previousText: {
    fontSize: 16,
  },
  inputCell: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  inputText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmarkButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTimerRow: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  restTimerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addSetButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addSetButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  numpadContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 8,
  },
  numpadGrid: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  numpadNumbersColumn: {
    flex: 3,
  },
  numpadRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  numpadNumberButton: {
    flex: 1,
    height: 50,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadSideColumn: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  numpadSideButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  numpadDoneButtonSide: {
    height: 106,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadButton: {
    width: '23%',
    aspectRatio: 1,
    margin: '1%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadText: {
    fontSize: 28,
    fontWeight: '400',
  },
  numpadSpecialButton: {
    // backgroundColor set dynamically
  },
  numpadSpecialText: {
    fontSize: 16,
    fontWeight: '600',
  },
  numpadButtonRow: {
    width: '23%',
    aspectRatio: 1,
    margin: '1%',
    flexDirection: 'column',
  },
  numpadHalfButton: {
    flex: 1,
    width: '100%',
    marginBottom: 4,
  },
  numpadDoneButton: {
    // backgroundColor set dynamically
  },
  numpadDoneText: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Rest Timer Modal Styles
  timerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  timerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  timerModalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  timerCloseButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timerModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  timerModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  timerCircleContainer: {
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerOption: {
    position: 'absolute',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  timerOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  customTimerButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  customTimerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerProgressRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerProgressCircle: {
    position: 'absolute',
  },
  timerDisplay: {
    alignItems: 'center',
  },
  timerMainTime: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  timerOriginalTime: {
    fontSize: 28,
    fontWeight: '500',
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  timerAdjustButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  timerAdjustText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerSkipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  timerSkipText: {
    fontSize: 16,
    fontWeight: '700',
  },
  timerNumpadContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 8,
    marginTop: 12,
  },
  timerNumpadGrid: {
    gap: 6,
  },
  timerNumpadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  timerNumpadButton: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  timerNumpadText: {
    fontSize: 20,
    fontWeight: '600',
  },
  // Rest Complete Modal Styles
  restCompleteOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  restCompleteBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  restCompleteContainer: {
    width: '80%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 28,
  },
  restCompleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  restCompleteTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  restCompleteMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  restCompleteButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  restCompleteButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finishConfirmContainer: {
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    maxWidth: 400,
    width: '90%',
  },
  finishConfirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  finishConfirmLogo: {
    width: 48,
    height: 48,
  },
  finishConfirmEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  finishConfirmTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  finishConfirmMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  finishConfirmPrimaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  finishConfirmPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  finishConfirmDangerButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 56,
    justifyContent: 'center',
  },
  finishConfirmDangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  finishConfirmSecondaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  finishConfirmSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Loading indicator styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingContent: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WorkoutModal;

