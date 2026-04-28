import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
  Modal,
  Dimensions,
  DeviceEventEmitter,
  Alert,
  ActivityIndicator,
  Easing,
} from 'react-native';
import AboutBiblelyModal from '../components/AboutBiblelyModal';
import { logoSpin, logoPulse, logoFloat } from '../utils/sharedHeaderLogoAnim';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import useTabBarScrollToTop from '../hooks/useTabBarScrollToTop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import { createEntranceAnimation } from '../utils/animations';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { hapticFeedback } from '../utils/haptics';
import LottieView from 'lottie-react-native';
import userStorage from '../utils/userStorage';
import ExercisesModal from '../components/ExercisesModal';
import WorkoutModal from '../components/WorkoutModal';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import WorkoutService from '../services/workoutService';
import AchievementService from '../services/achievementService';
import nutritionService from '../services/nutritionService';
import bodyCompositionService from '../services/bodyCompositionService';
import scaleService from '../services/scaleService';
import ManualWeighInModal from '../components/ManualWeighInModal';


// const { width } = Dimensions.get('window');

const GymTab = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark, currentTheme, isBlushTheme, isCresviaTheme, isEternaTheme, isFaithTheme, isBiblelyTheme, selectedWallpaperIndex } = useTheme();
  const { language, t } = useLanguage();
  
  // Only the main Biblely wallpaper (index 0) needs special white icons/text overrides
  // Jesus & Lambs (index 1) and Classic (index 2) use their own theme colors
  const isBiblelyMainWallpaper = isBiblelyTheme && selectedWallpaperIndex === 0;
  
  // For main Biblely wallpaper only, use white text and icons for better readability
  const textColor = isBiblelyMainWallpaper ? '#FFFFFF' : theme.text;
  const textSecondaryColor = isBiblelyMainWallpaper ? 'rgba(255,255,255,0.8)' : theme.textSecondary;
  const textTertiaryColor = isBiblelyMainWallpaper ? 'rgba(255,255,255,0.6)' : theme.textTertiary;
  const iconColor = isBiblelyMainWallpaper ? '#FFFFFF' : theme.primary;
  
  // Text shadow for outline effect - only on main Biblely wallpaper
  const textOutlineStyle = isBiblelyMainWallpaper ? {
    textShadowColor: theme.primaryDark || 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  } : {};
  const { hasActiveWorkout } = useWorkout();
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef(null);
  useTabBarScrollToTop(mainScrollRef);

  // State
  const [exercisesModalVisible, setExercisesModalVisible] = useState(false);
  const [templateSelectionVisible, setTemplateSelectionVisible] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(new Date());
  const [scheduledWorkouts, setScheduledWorkouts] = useState([]);
  const [nutritionProgress, setNutritionProgress] = useState(null);
  const [bodyComp, setBodyComp] = useState(null);
  const [bodyCompExpanded, setBodyCompExpanded] = useState(false);
  const [weighInModalVisible, setWeighInModalVisible] = useState(false);
  const [lastWeighIn, setLastWeighIn] = useState(null);
  const [weighInDates, setWeighInDates] = useState(new Set());

  // Card customisation config
  const GYM_DEFAULT_ORDER = ['WeeklyCalendar', 'WeeklyWeighIn', 'BodyComposition', 'StartWorkout', 'Fuel', 'Physique', 'Exercises', 'WorkoutHistory'];
  const [cardOrder, setCardOrder] = useState(GYM_DEFAULT_ORDER);
  const [hiddenCards, setHiddenCards] = useState([]);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLoadingAnim, setSelectedLoadingAnim] = useState('default');
  const refreshLottieRef = useRef(null);
  const refreshLottieScale = useRef(new Animated.Value(0)).current;
  const refreshLottieOpacity = useRef(new Animated.Value(0)).current;
  const refreshSpacerHeight = useRef(new Animated.Value(0)).current;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Logo animations — shared singleton values so all tabs sync
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;
  
  // Calendar modal animations
  const calendarModalScale = useRef(new Animated.Value(0.8)).current;
  const calendarModalOpacity = useRef(new Animated.Value(0)).current;
  const calendarDayAnims = useRef([...Array(42)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Start entrance animation
    createEntranceAnimation(slideAnim, fadeAnim, scaleAnim, 0, 0).start();
    // Load workout history and scheduled workouts
    loadWorkoutHistory();
    loadScheduledWorkouts();
    
    // Logo animations are now shared globally — no local start call needed.
    // Start shimmer animation
    startShimmerAnimation();

    userStorage.getRaw('fivefold_loading_animation').then(id => {
      setSelectedLoadingAnim(id || 'default');
    }).catch(() => {});
    
    // Listen for workout scheduled events
    const scheduledListener = DeviceEventEmitter.addListener('workoutScheduled', () => {
      loadScheduledWorkouts();
    });
    
    return () => {
      scheduledListener.remove();
    };
  }, []);

  // Listen for global "close all modals" event (e.g., when widget is tapped)
  useEffect(() => {
    const handleCloseAllModals = () => {
      console.log('📱 GymTab: Closing all modals (widget navigation)');
      setShowFullHistoryModal(false);
      setShowAboutModal(false);
      setShowCalendarModal(false);
      setTemplateSelectionVisible(false);
    };

    const subscription = DeviceEventEmitter.addListener('closeAllModals', handleCloseAllModals);
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  useEffect(() => {
    if (showAboutModal) {
      // Animate modal entrance
      modalFadeAnim.setValue(0);
      modalSlideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAboutModal]);

  const startShimmerAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardShimmer, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(cardShimmer, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    // Reload history when template selection closes (in case workout was completed)
    if (!templateSelectionVisible) {
      loadWorkoutHistory();
    }
  }, [templateSelectionVisible]);

  // Force refresh all data every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('GymTab focused - refreshing workout data');
      loadWorkoutHistory();
      loadScheduledWorkouts();
      loadNutritionProgress();
      scaleService.getLastReading().then(setLastWeighIn).catch(() => {});
      scaleService.getHistory().then(history => {
        const weeks = new Set();
        for (const entry of history || []) {
          if (entry?.timestamp) {
            const d = new Date(entry.timestamp);
            // Map every log to the Saturday of its week (Sun-Sat)
            const sat = new Date(d);
            sat.setDate(d.getDate() + (6 - d.getDay()));
            const key = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`;
            weeks.add(key);
          }
        }
        setWeighInDates(weeks);
      }).catch(() => {});
      userStorage.getRaw('fivefold_loading_animation').then(id => {
        setSelectedLoadingAnim(id || 'default');
      }).catch(() => {});
      userStorage.get('cardConfig_Gym').then(config => {
        if (config) {
          const saved = config.order || GYM_DEFAULT_ORDER;
          const merged = [
            ...saved.filter(id => GYM_DEFAULT_ORDER.includes(id)),
            ...GYM_DEFAULT_ORDER.filter(id => !saved.includes(id)),
          ];
          setCardOrder(merged);
          setHiddenCards(config.hidden || []);
        }
      }).catch(() => {});
    }, [])
  );

  // Pull-to-refresh handler — reloads ALL fitness data fresh
  const onRefresh = async () => {
    if (refreshing) return; // Prevent double-refresh
    setRefreshing(true);
    hapticFeedback.gentle();
    console.log('🔄 Fitness: Pull-to-refresh started — reloading all data...');
    try {
      // Reload everything in parallel
      const results = await Promise.allSettled([
        loadWorkoutHistory(),
        loadScheduledWorkouts(),
        loadNutritionProgress(),
      ]);

      // Log results
      const labels = ['Workout History', 'Scheduled Workouts', 'Nutrition Progress'];
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`❌ Fitness refresh failed: ${labels[i]}`, r.reason);
        } else {
          console.log(`✅ Fitness refresh: ${labels[i]} loaded`);
        }
      });

      // Notify other components that fitness data has been refreshed
      DeviceEventEmitter.emit('fitnessDataRefreshed');

      // Small delay so the animation feels satisfying
      await new Promise(resolve => setTimeout(resolve, 600));
      console.log('🔄 Fitness: Refresh complete');
    } catch (error) {
      console.error('Error refreshing fitness data:', error);
    } finally {
      setRefreshing(false);
      hapticFeedback.success();
    }
  };

  // Pull-to-refresh animation controller
  useEffect(() => {
    if (refreshing) {
      setTimeout(() => refreshLottieRef.current?.play(), 50);
      Animated.parallel([
        Animated.spring(refreshLottieScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 12,
        }),
        Animated.timing(refreshLottieOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(refreshSpacerHeight, {
          toValue: selectedLoadingAnim === 'default' ? 50 : 100,
          useNativeDriver: false,
          tension: 50,
          friction: 12,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(refreshSpacerHeight, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(refreshLottieOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(refreshLottieScale, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 15,
        }),
      ]).start(() => {
        refreshLottieRef.current?.reset();
      });
    }
  }, [refreshing, selectedLoadingAnim]);

  const loadNutritionProgress = async () => {
    try {
      const today = nutritionService.getDateKey();
      const progress = await nutritionService.getDailyProgress(today);
      setNutritionProgress(progress);
      const profile = await nutritionService.getProfile();
      if (profile && profile.weightKg && profile.heightCm) {
        setBodyComp(bodyCompositionService.calculate(profile));
      }
    } catch (e) {
      // silent
    }
  };

  const loadWorkoutHistory = async () => {
    try {
      const history = await WorkoutService.getWorkoutHistory();
      setWorkoutHistory(history);

      // Sync gym week streak to achievement stats
      if (history && history.length > 0) {
        const getWeekKey = (date) => {
          const d = new Date(date);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(d.setDate(diff));
          monday.setHours(0, 0, 0, 0);
          return monday.toISOString().split('T')[0];
        };
        const workoutsByWeek = {};
        history.forEach(w => {
          const wk = getWeekKey(w.completedAt);
          workoutsByWeek[wk] = (workoutsByWeek[wk] || 0) + 1;
        });
        let streak = 0;
        let checkWeek = new Date(getWeekKey(new Date()));
        while (true) {
          const wk = checkWeek.toISOString().split('T')[0];
          if ((workoutsByWeek[wk] || 0) >= 1) {
            streak++;
            checkWeek.setDate(checkWeek.getDate() - 7);
          } else break;
        }
        AchievementService.setStat('gymWeekStreak', streak);
      }
    } catch (error) {
      console.error('Error loading workout history:', error);
    }
  };

  const loadScheduledWorkouts = async () => {
    try {
      // Clean up expired one-time schedules first
      await WorkoutService.cleanupExpiredSchedules();
      const scheduled = await WorkoutService.getScheduledWorkouts();
      setScheduledWorkouts(scheduled);
    } catch (error) {
      console.error('Error loading scheduled workouts:', error);
    }
  };

  // Format time with smart units (Minutes → Hours → Days)
  const formatTimeWithUnits = (totalMinutes) => {
    if (totalMinutes < 60) {
      return { value: totalMinutes, label: 'Minutes' };
    } else if (totalMinutes < 1440) { // Less than 24 hours
      const hours = totalMinutes / 60;
      // Show decimal only if needed and < 10 hours
      const formatted = hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours);
      return { value: formatted, label: 'Hours' };
    } else { // 24+ hours
      const hours = Math.round(totalMinutes / 60);
      if (hours >= 1000) {
        // Use K abbreviation for 1000+ hours
        const kValue = Math.round(hours / 100) / 10;
        return { value: `${kValue}K`, label: 'Hours' };
      }
      return { value: hours, label: 'Hours' };
    }
  };

  // Calculate workout stats from history
  const calculateWorkoutStats = () => {
    if (!workoutHistory || workoutHistory.length === 0) {
      return { totalWorkouts: 0, streak: 0, timeValue: 0, timeLabel: 'Minutes' };
    }

    // Total workouts
    const totalWorkouts = workoutHistory.length;

    // Total minutes (duration is in seconds)
    const totalMinutes = workoutHistory.reduce((total, workout) => {
      return total + (workout.duration || 0);
    }, 0);
    const totalMinutesFormatted = Math.floor(totalMinutes / 60);
    
    // Get smart formatted time
    const { value: timeValue, label: timeLabel } = formatTimeWithUnits(totalMinutesFormatted);

    // Calculate weekly streak (consecutive weeks with 1+ workouts)
    const WORKOUTS_PER_WEEK_THRESHOLD = 1;
    
    const sortedWorkouts = [...workoutHistory].sort((a, b) => 
      new Date(b.completedAt) - new Date(a.completedAt)
    );

    // Group workouts by week (week starts on Monday)
    const getWeekKey = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday.toISOString().split('T')[0];
    };

    const workoutsByWeek = {};
    sortedWorkouts.forEach(workout => {
      const weekKey = getWeekKey(workout.completedAt);
      if (!workoutsByWeek[weekKey]) {
        workoutsByWeek[weekKey] = 0;
      }
      workoutsByWeek[weekKey]++;
    });

    // Get current week
    const currentWeekKey = getWeekKey(new Date());
    
    // Calculate consecutive weeks with enough workouts
    let streak = 0;
    let checkWeek = new Date(currentWeekKey);
    
    while (true) {
      const weekKey = checkWeek.toISOString().split('T')[0];
      const workoutsThisWeek = workoutsByWeek[weekKey] || 0;
      
      if (workoutsThisWeek >= WORKOUTS_PER_WEEK_THRESHOLD) {
        streak++;
        // Move to previous week
        checkWeek.setDate(checkWeek.getDate() - 7);
      } else {
        break;
      }
    }

    return { totalWorkouts, streak, timeValue, timeLabel };
  };

  const workoutStats = calculateWorkoutStats();

  // Get all workout dates as a Set for quick lookup
  const getWorkoutDates = useCallback(() => {
    const dates = new Set();
    workoutHistory.forEach(workout => {
      if (workout.completedAt) {
        const date = new Date(workout.completedAt);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dates.add(dateKey);
      }
    });
    return dates;
  }, [workoutHistory]);

  const workoutDates = getWorkoutDates();

  // Get current week days (Sunday first, Saturday last)
  const getCurrentWeekDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
    
    const days = [];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun to Sat
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const isToday = date.toDateString() === today.toDateString();
      const hasWorkout = workoutDates.has(dateKey);
      const scheduledForDay = getScheduledForDate(dateKey);
      const hasScheduled = scheduledForDay.length > 0;
      const isSaturday = i === 6;
      const hasWeighIn = weighInDates.has(dateKey);
      const isFuture = date > today && !isToday;
      const weighInMissed = isSaturday && !isFuture && !hasWeighIn && !isToday;
      const weighInDueToday = isSaturday && isToday && !hasWeighIn;

      days.push({
        dayName: dayNames[i],
        date: date.getDate(),
        dateKey,
        isToday,
        hasWorkout,
        hasScheduled,
        isPast: date < today && !isToday,
        isSaturday,
        hasWeighIn,
        weighInMissed,
        weighInDueToday,
      });
    }
    return days;
  };

  // Get scheduled workouts for a specific date
  const getScheduledForDate = (dateKey) => {
    const date = new Date(dateKey);
    const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, etc.
    
    return scheduledWorkouts.filter(schedule => {
      if (schedule.type === 'recurring') {
        return schedule.days && schedule.days.includes(dayOfWeek);
      } else if (schedule.type === 'one-time') {
        return schedule.date === dateKey;
      }
      return false;
    });
  };

  // Get calendar month data
  const getCalendarMonthData = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // Sunday = 0
    
    const days = [];
    const today = new Date();
    
    // Add empty slots for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ empty: true });
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = date.toDateString() === today.toDateString();
      const hasWorkout = workoutDates.has(dateKey);
      const isFuture = date > today;
      const scheduledForDay = getScheduledForDate(dateKey);
      const hasScheduled = scheduledForDay.length > 0;
      const isSaturday = date.getDay() === 6;
      const hasWeighIn = weighInDates.has(dateKey);
      const weighInMissed = isSaturday && !isFuture && !hasWeighIn && !isToday;
      const weighInDueToday = isSaturday && isToday && !hasWeighIn;

      days.push({
        day,
        dateKey,
        isToday,
        hasWorkout,
        isFuture,
        hasScheduled,
        scheduledWorkouts: scheduledForDay,
        isSaturday,
        hasWeighIn,
        weighInMissed,
        weighInDueToday,
      });
    }

    return days;
  };

  // Open calendar modal with animation
  const openCalendarModal = () => {
    hapticFeedback.medium();
    setSelectedCalendarMonth(new Date());
    setShowCalendarModal(true);
    
    // Reset animations
    calendarModalScale.setValue(0.8);
    calendarModalOpacity.setValue(0);
    calendarDayAnims.forEach(anim => anim.setValue(0));
    
    // Animate modal in
    Animated.parallel([
      Animated.spring(calendarModalScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(calendarModalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stagger animate each day
      const animations = calendarDayAnims.map((anim, index) =>
        Animated.spring(anim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          delay: index * 15,
          useNativeDriver: true,
        })
      );
      Animated.stagger(15, animations).start();
    });
  };

  // Close calendar modal
  const closeCalendarModal = () => {
    hapticFeedback.light();
    Animated.parallel([
      Animated.timing(calendarModalScale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(calendarModalOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCalendarModal(false);
    });
  };

  // Navigate calendar months
  const navigateMonth = (direction) => {
    hapticFeedback.light();
    const newMonth = new Date(selectedCalendarMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedCalendarMonth(newMonth);
    
    // Re-animate days
    calendarDayAnims.forEach(anim => anim.setValue(0));
    const animations = calendarDayAnims.map((anim, index) =>
      Animated.spring(anim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      })
    );
    Animated.stagger(10, animations).start();
  };

  // Count workouts in a month
  const getMonthWorkoutCount = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    let count = 0;
    
    workoutHistory.forEach(workout => {
      if (workout.completedAt) {
        const date = new Date(workout.completedAt);
        if (date.getFullYear() === year && date.getMonth() === month) {
          count++;
        }
      }
    });
    return count;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Liquid Glass Container
  const LiquidGlassContainer = ({ children, style }) => {
    if (!isLiquidGlassSupported) {
      return (
        <BlurView 
          intensity={18} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.card, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }, style]}
        >
          {children}
        </BlurView>
      );
    }

    return (
      <LiquidGlassView
        interactive={true}
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[styles.liquidGlassCard, style]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  return (
    <AnimatedWallpaper 
      scrollY={scrollY}
      parallaxFactor={0.3}
      blurOnScroll={false}
      fadeOnScroll={false}
      scaleOnScroll={true}
    >
      <View style={[styles.container, { backgroundColor: (currentTheme && currentTheme !== 'light' && currentTheme !== 'dark') ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
        {/* Fixed Header */}
        <GlassHeader 
          style={[styles.fixedHeader, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }]}
          intensity={15}
          absolute={false}
        >
          <View style={styles.headerContent}>
            {/* Animated Logo positioned on the left */}
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.heavy();
                setShowAboutModal(true);
              }}
              activeOpacity={0.7}
            >
              <Animated.Image 
                source={require('../../assets/animated-icon.png')} 
                style={[
                  styles.headerLogo,
                  {
                    transform: [
                      {
                        rotate: logoSpin.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      },
                      { scale: logoPulse },
                      {
                        translateY: logoFloat.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -6]
                        })
                      }
                    ],
                  }
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            
            {/* Centered text content */}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: textColor, ...textOutlineStyle }]}>Fitness</Text>
              <Text style={[styles.headerSubtitle, { color: textSecondaryColor, ...textOutlineStyle }]}>
                Track your workouts
              </Text>
            </View>
          </View>
        </GlassHeader>

        {/* Custom Pull-to-Refresh Indicator */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + (selectedLoadingAnim === 'default' ? 90 : 95),
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 1000,
            opacity: refreshLottieOpacity,
            transform: [{ scale: refreshLottieScale }],
          }}
        >
          {selectedLoadingAnim === 'default' ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <LottieView
              ref={refreshLottieRef}
              source={
                selectedLoadingAnim === 'hamster'
                  ? require('../../assets/Run-Hamster.json')
                  : require('../../assets/Running-Cat.json')
              }
              autoPlay={false}
              loop
              style={{ width: selectedLoadingAnim === 'hamster' ? 80 : 120, height: selectedLoadingAnim === 'hamster' ? 80 : 120 }}
            />
          )}
        </Animated.View>

        {/* Main Content */}
        <Animated.ScrollView
          ref={mainScrollRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          bounces={true}
          alwaysBounceVertical={true}
          onScrollEndDrag={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            if (y < -70 && !refreshing) {
              onRefresh();
            }
          }}
        >
          {/* Animated spacer for refresh animation */}
          <Animated.View style={{ height: refreshSpacerHeight }} />

          {cardOrder.filter(id => !hiddenCards.includes(id)).map(id => {
            switch (id) {
              case 'WeeklyCalendar': return (
                <LiquidGlassContainer key={id}>
                  <TouchableOpacity 
                    style={styles.weeklyCalendarContainer}
                    onPress={openCalendarModal}
                    activeOpacity={0.8}
                  >
                    <View style={styles.weeklyCalendarHeader}>
                      <Text style={[styles.weeklyCalendarTitle, { color: textColor, ...textOutlineStyle }]}>
                        This Week
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.weeklyCalendarHint, { color: textSecondaryColor }]}>
                          Tap for full calendar
                        </Text>
                        <MaterialIcons name="chevron-right" size={18} color={theme.textSecondary} />
                      </View>
                    </View>
                    <View style={styles.weeklyDaysRow}>
                      {getCurrentWeekDays().map((day, index) => (
                        <View key={index} style={styles.weeklyDayItem}>
                          <Text style={[
                            styles.weeklyDayName,
                            { color: day.isToday ? theme.primary : textSecondaryColor, ...textOutlineStyle }
                          ]}>
                            {day.dayName}
                          </Text>
                          <View style={[
                            styles.weeklyDayCircle,
                            day.hasWorkout && styles.weeklyDayCircleActive,
                            day.isToday && styles.weeklyDayCircleToday,
                            {
                              backgroundColor: day.hasWorkout 
                                ? theme.primary 
                                : day.hasScheduled && !day.hasWorkout
                                  ? `${theme.warning}25`
                                  : day.isToday 
                                    ? `${theme.primary}30`
                                    : 'transparent',
                              borderColor: day.hasScheduled && !day.hasWorkout
                                ? theme.warning
                                : day.isToday 
                                  ? theme.primary 
                                  : 'transparent',
                              borderWidth: day.hasScheduled && !day.hasWorkout ? 2 : (day.isToday ? 2 : 0),
                            }
                          ]}>
                            <Text style={[
                              styles.weeklyDayNumber,
                              { 
                                color: day.hasWorkout 
                                  ? '#FFFFFF' 
                                  : day.hasScheduled
                                    ? theme.warning
                                    : day.isToday 
                                      ? theme.primary 
                                      : textColor,
                                ...textOutlineStyle,
                                fontWeight: day.hasScheduled ? '700' : '600',
                              }
                            ]}>
                              {day.date}
                            </Text>
                            {day.hasWorkout && (
                              <View style={styles.workoutCheckmark}>
                                <MaterialIcons name="check" size={10} color="#FFFFFF" />
                              </View>
                            )}
                            {day.hasScheduled && !day.hasWorkout && (
                              <View style={[styles.scheduledIndicator, { backgroundColor: theme.warning }]}>
                                <MaterialIcons name="schedule" size={8} color="#FFFFFF" />
                              </View>
                            )}
                            {day.isSaturday && (day.hasWeighIn || day.weighInDueToday || day.weighInMissed) && (
                              <View
                                style={[
                                  styles.weighInDot,
                                  {
                                    backgroundColor: day.hasWeighIn
                                      ? '#10B981'
                                      : day.weighInDueToday
                                        ? '#6366F1'
                                        : '#EF4444',
                                  },
                                ]}
                              />
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                </LiquidGlassContainer>
              );
              case 'WeeklyWeighIn': {
                const today = new Date();
                const isSaturday = today.getDay() === 6;
                const lastTs = lastWeighIn?.timestamp ? new Date(lastWeighIn.timestamp) : null;
                const daysSince = lastTs ? Math.floor((today - lastTs) / 86400000) : 999;
                const overdue = daysSince >= 7;
                if (!isSaturday && !overdue) return null;
                const subtitle = lastWeighIn
                  ? `Last: ${lastWeighIn.weightKg?.toFixed(1)} kg${lastWeighIn.bodyFatPercent ? ` · ${lastWeighIn.bodyFatPercent.toFixed(1)}% fat` : ''}${daysSince === 0 ? ' · today' : ` · ${daysSince}d ago`}`
                  : 'Log your first weigh-in';
                return (
                  <LiquidGlassContainer key={id}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => { hapticFeedback.medium(); setWeighInModalVisible(true); }}
                      style={styles.weighInCard}
                    >
                      <View style={styles.weighInRow}>
                        <View style={[styles.weighInIcon, { backgroundColor: theme.primary + '18' }]}>
                          <MaterialIcons name="fitness-center" size={24} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>
                            {isSaturday ? 'Weekly Check-In' : 'Weigh-In Overdue'}
                          </Text>
                          <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
                            {subtitle}
                          </Text>
                        </View>
                        <View style={[styles.weighInCta, { backgroundColor: theme.primary }]}>
                          <Text style={styles.weighInCtaText}>Log</Text>
                          <MaterialIcons name="arrow-forward" size={14} color="#FFF" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </LiquidGlassContainer>
                );
              }
              case 'BodyComposition': return (
                <LiquidGlassContainer key={id}>
                  <View style={styles.exercisesHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Body Composition</Text>
                      <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
                        {bodyComp ? 'Your body insights' : 'Set up your profile'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.browseButton, { backgroundColor: theme.primary }]}
                      onPress={() => {
                        hapticFeedback.medium();
                        if (bodyComp) {
                          navigation.navigate('BodyComposition');
                        } else {
                          navigation.navigate('Nutrition');
                        }
                      }}
                    >
                      <Text style={styles.browseButtonText}>{bodyComp ? 'View' : 'Set Up'}</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  {bodyComp ? (
                    <View style={styles.exercisesPreview}>
                      <View style={[styles.exercisePreviewItem, {
                        backgroundColor: `${bodyComp.healthScore >= 80 ? '#3B82F6' : bodyComp.healthScore >= 70 ? '#10B981' : bodyComp.healthScore >= 40 ? '#F59E0B' : '#EF4444'}24`,
                        borderColor: `${bodyComp.healthScore >= 80 ? '#3B82F6' : bodyComp.healthScore >= 70 ? '#10B981' : bodyComp.healthScore >= 40 ? '#F59E0B' : '#EF4444'}43`,
                        borderWidth: 0.8,
                      }]}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: bodyComp.healthScore >= 80 ? '#3B82F6' : bodyComp.healthScore >= 70 ? '#10B981' : bodyComp.healthScore >= 40 ? '#F59E0B' : '#EF4444' }}>{bodyComp.healthScore}</Text>
                        <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Health Score</Text>
                      </View>
                      <View style={[styles.exercisePreviewItem, {
                        backgroundColor: `${theme.primary}24`,
                        borderColor: `${theme.primary}43`,
                        borderWidth: 0.8,
                      }]}>
                        <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary }}>{bodyComp.bodyAge}</Text>
                        <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Body Age</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.exercisesPreview}>
                      <View style={[styles.exercisePreviewItem, {
                        backgroundColor: `${theme.primary}24`,
                        borderColor: `${theme.primary}43`,
                        borderWidth: 0.8,
                      }]}>
                        <MaterialIcons name="monitor-weight" size={32} color={theme.primary} />
                        <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Body Metrics</Text>
                      </View>
                      <View style={[styles.exercisePreviewItem, {
                        backgroundColor: `${theme.success || '#10B981'}24`,
                        borderColor: `${theme.success || '#10B981'}43`,
                        borderWidth: 0.8,
                      }]}>
                        <MaterialIcons name="insights" size={32} color={theme.success || '#10B981'} />
                        <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Health Score</Text>
                      </View>
                    </View>
                  )}
                </LiquidGlassContainer>
              );
              case 'StartWorkout': return (
                <LiquidGlassContainer key={id} style={styles.comingSoonCard}>
                  <View style={styles.startWorkoutHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 8, ...textOutlineStyle }]}>Start Workout</Text>
                      <Text style={[styles.sectionSubtitle, { color: textSecondaryColor, marginBottom: 20, ...textOutlineStyle }]}>Begin a new workout session</Text>
                    </View>
                    {hasActiveWorkout && (
                      <View style={[styles.activeWorkoutBadge, { backgroundColor: theme.error || '#EF4444' }]}>
                        <MaterialIcons name="fitness-center" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.startWorkoutButton, { backgroundColor: theme.primary }]}
                    onPress={() => { hapticFeedback.heavy(); navigation.navigate('StartWorkout'); }}
                    accessibilityLabel="Start workout"
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
                    <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
                  </TouchableOpacity>
                </LiquidGlassContainer>
              );
              case 'Fuel': return (
                <LiquidGlassContainer key={id}>
                  <View style={styles.exercisesHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Fuel</Text>
                      <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>Track your nutrition</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.browseButton, { backgroundColor: theme.primary }]}
                      onPress={() => { hapticFeedback.medium(); navigation.navigate('Nutrition'); }}
                      accessibilityLabel="Open nutrition"
                      accessibilityRole="button"
                    >
                      <Text style={styles.browseButtonText}>{nutritionProgress?.hasProfile ? 'Open' : 'Set Up'}</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  {nutritionProgress?.hasProfile ? (
                    <View style={styles.fuelProgressRow}>
                      <View style={styles.fuelProgressBarBg}>
                        <View style={[styles.fuelProgressBarFill, { backgroundColor: theme.primary, width: `${Math.min(((nutritionProgress.consumed?.calories || 0) / (nutritionProgress.targets?.calories || 2000)) * 100, 100)}%` }]} />
                      </View>
                      <Text style={[styles.fuelProgressText, { color: textColor, ...textOutlineStyle }]}>
                        {nutritionProgress.consumed?.calories || 0} / {nutritionProgress.targets?.calories || 0} cal
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.fuelSetupPrompt}>
                      <MaterialIcons name="restaurant-menu" size={20} color={textSecondaryColor} />
                      <Text style={[styles.fuelSetupText, { color: textSecondaryColor }]}>Set up your nutrition plan to track calories</Text>
                    </View>
                  )}
                </LiquidGlassContainer>
              );
              case 'Physique': return (
                <LiquidGlassContainer key={id}>
                  <View style={styles.exercisesHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Physique</Text>
                      <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>Body progress map</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.browseButton, { backgroundColor: theme.primary }]}
                      onPress={() => { hapticFeedback.medium(); navigation.navigate('Physique'); }}
                      accessibilityLabel="View physique"
                      accessibilityRole="button"
                    >
                      <Text style={styles.browseButtonText}>View</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.exercisesPreview}>
                    <View style={[styles.exercisePreviewItem, { backgroundColor: `${theme.primary}24`, borderColor: `${theme.primary}43`, borderWidth: 0.8 }]}>
                      <MaterialIcons name="accessibility-new" size={32} color={theme.primary} />
                      <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Muscle Map</Text>
                    </View>
                    <View style={[styles.exercisePreviewItem, { backgroundColor: `${theme.primary}24`, borderColor: `${theme.primary}43`, borderWidth: 0.8 }]}>
                      <MaterialIcons name="psychology" size={32} color={theme.primary} />
                      <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Balance Coach</Text>
                    </View>
                  </View>
                </LiquidGlassContainer>
              );
              case 'Exercises': return (
                <LiquidGlassContainer key={id}>
                  <View style={styles.exercisesHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Exercises</Text>
                      <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>Browse exercise library</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.browseButton, { backgroundColor: theme.primary }]}
                      onPress={() => { hapticFeedback.medium(); navigation.navigate('Exercises'); }}
                      accessibilityLabel="Browse exercises"
                      accessibilityRole="button"
                    >
                      <Text style={styles.browseButtonText}>Browse</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.exercisesPreview}>
                    <View style={[styles.exercisePreviewItem, { backgroundColor: `${theme.primary}24`, borderColor: `${theme.primary}43`, borderWidth: 0.8 }]}>
                      <MaterialIcons name="fitness-center" size={32} color={theme.primary} />
                      <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>128+ Exercises</Text>
                    </View>
                    <View style={[styles.exercisePreviewItem, { backgroundColor: `${theme.success}24`, borderColor: `${theme.success}43`, borderWidth: 0.8 }]}>
                      <MaterialIcons name="category" size={32} color={theme.success} />
                      <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>All Categories</Text>
                    </View>
                  </View>
                </LiquidGlassContainer>
              );
              case 'WorkoutHistory': return (
                <LiquidGlassContainer key={id}>
                  <View style={styles.exercisesHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Workout History</Text>
                      <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>View your past sessions</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.browseButton, { backgroundColor: theme.primary }]}
                      onPress={() => { hapticFeedback.medium(); navigation.navigate('GymHistory'); }}
                      accessibilityLabel="View workout history"
                      accessibilityRole="button"
                    >
                      <Text style={styles.browseButtonText}>View</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.exercisesPreview}>
                    <View style={[styles.exercisePreviewItem, { backgroundColor: `${theme.primary}24`, borderColor: `${theme.primary}43`, borderWidth: 0.8 }]}>
                      <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary }}>{workoutHistory.length}</Text>
                      <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>{workoutHistory.length === 1 ? 'Workout' : 'Workouts'}</Text>
                    </View>
                    <View style={[styles.exercisePreviewItem, { backgroundColor: `${theme.success || '#10B981'}24`, borderColor: `${theme.success || '#10B981'}43`, borderWidth: 0.8 }]}>
                      <MaterialIcons name="trending-up" size={32} color={theme.success || '#10B981'} />
                      <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>Progress</Text>
                    </View>
                  </View>
                </LiquidGlassContainer>
              );
              default: return null;
            }
          })}

          {/* Health disclaimer */}
          <Text style={{ fontSize: 11, color: textTertiaryColor, textAlign: 'center', paddingHorizontal: 20, marginBottom: 16, lineHeight: 16 }}>
            For informational purposes only. Not a substitute for professional fitness or medical advice. Consult a healthcare professional before starting any new exercise programme.
          </Text>
        </Animated.ScrollView>
      </View>

      {/* Exercises - now navigated via stack navigator for swipe-back support */}

      {/* Start Workout - now navigated via stack navigator for swipe-back support */}

      {/* Full History Modal removed — now a dedicated screen */}

      {/* Workout Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeCalendarModal}
      >
        <TouchableOpacity 
          style={styles.calendarModalOverlay}
          activeOpacity={1}
          onPress={closeCalendarModal}
        >
          <Animated.View 
            style={[
              styles.calendarModalContainer,
              {
                backgroundColor: isDark ? 'rgba(20, 20, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                transform: [{ scale: calendarModalScale }],
                opacity: calendarModalOpacity,
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Modal Header */}
              <View style={styles.calendarModalHeader}>
                <View>
                  <Text style={[styles.calendarModalTitle, { color: textColor, ...textOutlineStyle }]}>
                    Workout Calendar
                  </Text>
                  <Text style={[styles.calendarModalSubtitle, { color: textSecondaryColor }]}>
                    {workoutHistory.length} total workouts
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.calendarCloseButton, { backgroundColor: `${theme.textSecondary}20` }]}
                  onPress={closeCalendarModal}
                >
                  <MaterialIcons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Month Navigator */}
              <View style={styles.monthNavigator}>
                <TouchableOpacity
                  style={[styles.monthNavButton, { backgroundColor: `${theme.primary}20` }]}
                  onPress={() => navigateMonth(-1)}
                >
                  <MaterialIcons name="chevron-left" size={28} color={theme.primary} />
                </TouchableOpacity>
                
                <View style={styles.monthDisplay}>
                  <Text style={[styles.monthText, { color: textColor, ...textOutlineStyle }]}>
                    {selectedCalendarMonth.toLocaleString('default', { month: 'long' })}
                  </Text>
                  <Text style={[styles.yearText, { color: textSecondaryColor }]}>
                    {selectedCalendarMonth.getFullYear()}
                  </Text>
                  <View style={[styles.monthWorkoutBadge, { backgroundColor: `${theme.primary}20` }]}>
                    <MaterialIcons name="fitness-center" size={12} color={theme.primary} />
                    <Text style={[styles.monthWorkoutCount, { color: theme.primary }]}>
                      {getMonthWorkoutCount(selectedCalendarMonth)} workouts
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.monthNavButton, { backgroundColor: `${theme.primary}20` }]}
                  onPress={() => navigateMonth(1)}
                >
                  <MaterialIcons name="chevron-right" size={28} color={theme.primary} />
                </TouchableOpacity>
              </View>

              {/* Day Names Header */}
              <View style={styles.calendarDayNames}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <Text key={index} style={[styles.calendarDayName, { color: textSecondaryColor }]}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {getCalendarMonthData(selectedCalendarMonth).map((day, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.calendarDayCell,
                      {
                        opacity: calendarDayAnims[index] || 1,
                        transform: [{ 
                          scale: calendarDayAnims[index]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }) || 1 
                        }],
                      }
                    ]}
                  >
                    {!day.empty && (
                      <TouchableOpacity
                        activeOpacity={(day.hasScheduled || day.weighInDueToday || day.weighInMissed) ? 0.6 : 1}
                        onPress={() => {
                          if (day.weighInDueToday) {
                            hapticFeedback.medium();
                            setShowCalendarModal(false);
                            setTimeout(() => setWeighInModalVisible(true), 250);
                            return;
                          }
                          if (day.weighInMissed) {
                            hapticFeedback.medium();
                            Alert.alert(
                              'Missed Weigh-In',
                              `You did not log your weight on ${day.dateKey}. Log it now to keep your weekly streak going.`,
                              [
                                { text: 'Skip', style: 'cancel' },
                                { text: 'Log Now', onPress: () => { setShowCalendarModal(false); setTimeout(() => setWeighInModalVisible(true), 250); } },
                              ]
                            );
                            return;
                          }
                          if (day.hasScheduled && day.scheduledWorkouts?.length > 0) {
                            hapticFeedback.medium();
                            const schedule = day.scheduledWorkouts[0];
                            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            const scheduledDays = schedule.days?.map(d => dayNames[d]).join(', ') || 'Unknown';
                            
                            Alert.alert(
                              'Scheduled Workout',
                              schedule.type === 'recurring' 
                                ? `Recurring every: ${scheduledDays}\n${schedule.templateName ? `Template: ${schedule.templateName}` : 'Empty workout'}`
                                : `One-time on ${day.dateKey}`,
                              [
                                { text: 'Keep', style: 'cancel' },
                                {
                                  text: 'Delete Schedule',
                                  style: 'destructive',
                                  onPress: async () => {
                                    hapticFeedback.medium();
                                    await WorkoutService.deleteScheduledWorkout(schedule.id);
                                    const updated = await WorkoutService.getScheduledWorkouts();
                                    setScheduledWorkouts(updated);
                                  }
                                }
                              ]
                            );
                          }
                        }}
                        style={[
                        styles.calendarDayInner,
                        day.hasWorkout && styles.calendarDayHasWorkout,
                        day.isToday && styles.calendarDayIsToday,
                        {
                          backgroundColor: day.hasWorkout 
                            ? theme.primary 
                            : day.hasScheduled && !day.hasWorkout
                              ? `${theme.warning}30`
                              : day.isToday 
                                ? `${theme.primary}25`
                                : 'transparent',
                          borderColor: day.hasScheduled && !day.hasWorkout
                            ? theme.warning
                            : day.isToday && !day.hasWorkout 
                              ? theme.primary 
                              : 'transparent',
                          borderWidth: day.hasScheduled && !day.hasWorkout ? 2 : (day.isToday && !day.hasWorkout ? 2 : 0),
                        }
                      ]}>
                        <Text style={[
                          styles.calendarDayText,
                          {
                            color: day.hasWorkout 
                              ? '#FFFFFF' 
                              : day.hasScheduled
                                ? theme.warning
                                : day.isFuture 
                                  ? theme.textTertiary 
                                  : day.isToday
                                    ? theme.primary
                                    : theme.text,
                            fontWeight: day.isToday || day.hasWorkout || day.hasScheduled ? '700' : '500',
                          }
                        ]}>
                          {day.day}
                        </Text>
                        {/* Completed workout indicator */}
                        {day.hasWorkout && (
                          <View style={styles.calendarWorkoutIndicator}>
                            <MaterialIcons name="check" size={10} color="#FFFFFF" />
                          </View>
                        )}
                        {/* Scheduled workout indicator */}
                        {day.hasScheduled && !day.hasWorkout && (
                          <View style={[styles.calendarScheduledIndicator, { backgroundColor: theme.warning }]}>
                            <MaterialIcons name="schedule" size={8} color="#FFFFFF" />
                          </View>
                        )}
                        {/* Saturday weigh-in indicator */}
                        {day.isSaturday && (day.hasWeighIn || day.weighInDueToday || day.weighInMissed) && (
                          <View
                            style={[
                              styles.calendarWeighInDot,
                              {
                                backgroundColor: day.hasWeighIn
                                  ? '#10B981'
                                  : day.weighInDueToday
                                    ? '#6366F1'
                                    : '#EF4444',
                              },
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                ))}
              </View>

              {/* Legend */}
              <View style={styles.calendarLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>Completed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.warning }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>Scheduled</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, {
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: theme.primary,
                  }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>Today</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>Weigh-in</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.legendText, { color: textSecondaryColor }]}>Missed</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <AboutBiblelyModal visible={showAboutModal} onClose={() => setShowAboutModal(false)} />

      <ManualWeighInModal
        visible={weighInModalVisible}
        onClose={() => setWeighInModalVisible(false)}
        onSaved={(reading) => {
          const now = new Date();
          const sat = new Date(now);
          sat.setDate(now.getDate() + (6 - now.getDay()));
          const key = `${sat.getFullYear()}-${String(sat.getMonth() + 1).padStart(2, '0')}-${String(sat.getDate()).padStart(2, '0')}`;
          setLastWeighIn({ ...reading, timestamp: now.toISOString() });
          setWeighInDates(prev => new Set(prev).add(key));
        }}
      />
    </AnimatedWallpaper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weighInCard: {
    paddingVertical: 4,
  },
  weighInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  weighInIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weighInCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  weighInCtaText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 65 : 40,
    paddingBottom: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerLogo: {
    width: 32,
    height: 32,
    position: 'absolute',
    left: 20,
    top: -10,
  },
  headerTextContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: 0,
  },
  scrollContent: {
    paddingTop: 145,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  liquidGlassCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  fuelProgressRow: {
    gap: 8,
  },
  fuelProgressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  fuelProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  fuelProgressText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  fuelSetupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fuelSetupText: {
    fontSize: 13,
    flex: 1,
  },
  exercisesPreview: {
    flexDirection: 'row',
    gap: 12,
  },
  exercisePreviewItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  exercisePreviewText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  comingSoonCard: {
  },
  startWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeWorkoutBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  workoutButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  workoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  workoutButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  // History Card Styles
  historyCard: {
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: 6,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '700',
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  workoutMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutMetaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  workoutDate: {
    alignItems: 'flex-end',
    gap: 4,
  },
  workoutDateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Full History Modal Styles
  fullHistoryModal: {
    flex: 1,
  },
  fullHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  fullHistoryHeaderText: {
    flex: 1,
    alignItems: 'center',
  },
  fullHistoryTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  fullHistorySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  fullHistoryContent: {
    flex: 1,
  },
  fullHistoryContentContainer: {
    padding: 20,
  },
  fullHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  // About Modal Styles - REDESIGNED
  aboutModal: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').width * 1.2,
    borderRadius: Dimensions.get('window').width * 0.6,
    backgroundColor: '#667eea',
    top: -Dimensions.get('window').width * 0.4,
    right: -Dimensions.get('window').width * 0.2,
  },
  bgCircle2: {
    position: 'absolute',
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.8,
    borderRadius: Dimensions.get('window').width * 0.4,
    backgroundColor: '#764ba2',
    bottom: -Dimensions.get('window').width * 0.3,
    left: -Dimensions.get('window').width * 0.2,
  },
  closeButtonFloating: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 115 : 90,
  },
  aboutContentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  heroGradient: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroIcon: {
    opacity: 0.9,
  },
  creatorCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  creatorCardInner: {
    padding: 24,
    alignItems: 'center',
  },
  creatorIconContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarLogo: {
    width: 70,
    height: 70,
  },
  glowRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    top: -7,
    left: -7,
  },
  creatorName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  storyCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  storyCardInner: {
    padding: 24,
  },
  storyHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  storyText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
    fontWeight: '400',
  },
  highlightBox: {
    borderRadius: 20,
    marginVertical: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  highlightBoxInner: {
    padding: 24,
    alignItems: 'center',
  },
  errorIconContainer: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
  },
  highlightText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 20,
  },
  featureCard: {
    width: (Dimensions.get('window').width - 74) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  featureCardWide: {
    width: Dimensions.get('window').width - 68,
  },
  featureCardInner: {
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  featureCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  missionBox: {
    borderRadius: 20,
    marginTop: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  missionBoxInner: {
    padding: 24,
    alignItems: 'center',
  },
  missionText: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '600',
    color: '#FFFFFF',
    marginVertical: 12,
  },
  missionBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginTop: 6,
  },
  missionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  thankYouCard: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  thankYouCardInner: {
    padding: 32,
    alignItems: 'center',
  },
  heartContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  thankYouText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '400',
  },
  contactInfo: {
    width: '100%',
    gap: 12,
    marginTop: 20,
    marginBottom: 28,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  signatureContainer: {
    alignItems: 'center',
  },
  signatureLine: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 12,
  },
  signature: {
    fontSize: 20,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  
  // Weekly Calendar Preview Styles
  weeklyCalendarContainer: {
    marginTop: 0,
    paddingTop: 0,
  },
  weeklyCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyCalendarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  weeklyCalendarHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  weeklyDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyDayItem: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyDayName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  weeklyDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  weeklyDayCircleActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyDayCircleToday: {
    borderWidth: 2,
  },
  weeklyDayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  workoutCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduledIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Full Calendar Modal Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  calendarModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  calendarModalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  calendarCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 22,
    fontWeight: '700',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  monthWorkoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  monthWorkoutCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarDayNames: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  calendarDayInner: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  calendarDayHasWorkout: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDayIsToday: {
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 14,
  },
  calendarWorkoutIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarScheduledIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarWeighInDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  weighInDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default GymTab;

