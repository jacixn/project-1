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
  RefreshControl,
  DeviceEventEmitter,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import ExercisesModal from '../components/ExercisesModal';
import WorkoutModal from '../components/WorkoutModal';
import TemplateSelectionModal from '../components/TemplateSelectionModal';
import WorkoutService from '../services/workoutService';
import AchievementService from '../services/achievementService';
import nutritionService from '../services/nutritionService';
import bodyCompositionService from '../services/bodyCompositionService';

// const { width } = Dimensions.get('window');

const GymTab = () => {
  const navigation = useNavigation();
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme, isBiblelyTheme, selectedWallpaperIndex } = useTheme();
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

  // State
  const [exercisesModalVisible, setExercisesModalVisible] = useState(false);
  const [templateSelectionVisible, setTemplateSelectionVisible] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [showFullHistoryModal, setShowFullHistoryModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(new Date());
  const [scheduledWorkouts, setScheduledWorkouts] = useState([]);
  const [nutritionProgress, setNutritionProgress] = useState(null);
  const [bodyComp, setBodyComp] = useState(null);
  const [bodyCompExpanded, setBodyCompExpanded] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Logo animations
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  
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
    
    // Start logo animations
    startLogoAnimations();
    
    // Start shimmer animation
    startShimmerAnimation();
    
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

  // Continuous logo animations to attract attention
  const startLogoAnimations = () => {
    // Gentle spinning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoSpin, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(logoSpin, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
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
    }, [])
  );

  const loadNutritionProgress = async () => {
    try {
      const today = nutritionService.getDateKey();
      const progress = await nutritionService.getDailyProgress(today);
      setNutritionProgress(progress);
      // Load body composition
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadWorkoutHistory();
      await loadScheduledWorkouts();
    } catch (err) {
      console.error('Error refreshing workout data:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
      
      days.push({
        dayName: dayNames[i],
        date: date.getDate(),
        dateKey,
        isToday,
        hasWorkout,
        hasScheduled,
        isPast: date < today && !isToday,
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
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    
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
      
      days.push({
        day,
        dateKey,
        isToday,
        hasWorkout,
        isFuture,
        hasScheduled,
        scheduledWorkouts: scheduledForDay,
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
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme || isBiblelyTheme) ? 'transparent' : theme.background }]}>
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
                source={require('../../assets/logo.png')} 
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
                    shadowColor: theme.primary,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
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

        {/* Main Content */}
        <Animated.ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* Weekly Calendar Card */}
          <LiquidGlassContainer>
            {/* Weekly Calendar Preview */}
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
                      {/* Completed workout checkmark */}
                      {day.hasWorkout && (
                        <View style={styles.workoutCheckmark}>
                          <MaterialIcons name="check" size={10} color="#FFFFFF" />
                        </View>
                      )}
                      {/* Scheduled workout indicator */}
                      {day.hasScheduled && !day.hasWorkout && (
                        <View style={[styles.scheduledIndicator, { backgroundColor: theme.warning }]}>
                          <MaterialIcons name="schedule" size={8} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </LiquidGlassContainer>

          {/* Fuel Card */}
          <LiquidGlassContainer>
            <View style={styles.exercisesHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Fuel</Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
                  Track your nutrition
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  hapticFeedback.medium();
                  navigation.navigate('Nutrition');
                }}
              >
                <Text style={styles.browseButtonText}>
                  {nutritionProgress?.hasProfile ? 'Open' : 'Set Up'}
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {nutritionProgress?.hasProfile ? (
              <View style={styles.fuelProgressRow}>
                <View style={styles.fuelProgressBarBg}>
                  <View
                    style={[
                      styles.fuelProgressBarFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.min(((nutritionProgress.consumed?.calories || 0) / (nutritionProgress.targets?.calories || 2000)) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.fuelProgressText, { color: textSecondaryColor }]}>
                  {nutritionProgress.consumed?.calories || 0} / {nutritionProgress.targets?.calories || 0} cal
                </Text>
              </View>
            ) : (
              <View style={styles.fuelSetupPrompt}>
                <MaterialIcons name="restaurant-menu" size={20} color={textSecondaryColor} />
                <Text style={[styles.fuelSetupText, { color: textSecondaryColor }]}>
                  Set up your nutrition plan to track calories
                </Text>
              </View>
            )}
          </LiquidGlassContainer>

          {/* Start Workout Card */}
          <LiquidGlassContainer style={styles.comingSoonCard}>
            <View style={styles.startWorkoutHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 8, ...textOutlineStyle }]}>
                  Start Workout
                </Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondaryColor, marginBottom: 20, ...textOutlineStyle }]}>
                  Begin a new workout session
                </Text>
              </View>
              {/* Active workout badge */}
              {hasActiveWorkout && (
                <View style={[styles.activeWorkoutBadge, { backgroundColor: theme.error || '#EF4444' }]}>
                  <MaterialIcons name="fitness-center" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.startWorkoutButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                hapticFeedback.heavy();
                navigation.navigate('StartWorkout');
              }}
            >
              <MaterialIcons name="play-arrow" size={28} color="#FFFFFF" />
              <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
            </TouchableOpacity>
          </LiquidGlassContainer>

          {/* Physique Card */}
          <LiquidGlassContainer>
            <View style={styles.exercisesHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Physique</Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
                  Body progress map
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  hapticFeedback.medium();
                  navigation.navigate('Physique');
                }}
              >
                <Text style={styles.browseButtonText}>View</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.exercisesPreview}>
              <View style={[styles.exercisePreviewItem, { 
                backgroundColor: `${theme.primary}20`,
                borderColor: `${theme.primary}66`,
                borderWidth: 1,
              }]}>
                <MaterialIcons name="accessibility-new" size={32} color={theme.primary} />
                <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                  Muscle Map
                </Text>
              </View>
              <View style={[styles.exercisePreviewItem, { 
                backgroundColor: `${theme.primary}20`,
                borderColor: `${theme.primary}66`,
                borderWidth: 1,
              }]}>
                <MaterialIcons name="psychology" size={32} color={theme.primary} />
                <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                  Balance Coach
                </Text>
              </View>
            </View>
          </LiquidGlassContainer>

          {/* Body Composition Card — compact preview, tap to view full details */}
          <LiquidGlassContainer>
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
                  backgroundColor: `${bodyComp.healthScore >= 70 ? '#10B981' : bodyComp.healthScore >= 50 ? '#F59E0B' : '#EF4444'}20`,
                  borderColor: `${bodyComp.healthScore >= 70 ? '#10B981' : bodyComp.healthScore >= 50 ? '#F59E0B' : '#EF4444'}66`,
                  borderWidth: 1,
                }]}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: bodyComp.healthScore >= 70 ? '#10B981' : bodyComp.healthScore >= 50 ? '#F59E0B' : '#EF4444' }}>{bodyComp.healthScore}</Text>
                  <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                    Health Score
                  </Text>
                </View>
                <View style={[styles.exercisePreviewItem, {
                  backgroundColor: `${theme.primary}20`,
                  borderColor: `${theme.primary}66`,
                  borderWidth: 1,
                }]}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: theme.primary }}>{bodyComp.bodyAge}</Text>
                  <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                    Body Age
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.exercisesPreview}>
                <View style={[styles.exercisePreviewItem, {
                  backgroundColor: `${theme.primary}20`,
                  borderColor: `${theme.primary}66`,
                  borderWidth: 1,
                }]}>
                  <MaterialIcons name="monitor-weight" size={32} color={theme.primary} />
                  <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                    Body Metrics
                  </Text>
                </View>
                <View style={[styles.exercisePreviewItem, {
                  backgroundColor: `${theme.success || '#10B981'}20`,
                  borderColor: `${theme.success || '#10B981'}66`,
                  borderWidth: 1,
                }]}>
                  <MaterialIcons name="insights" size={32} color={theme.success || '#10B981'} />
                  <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                    Health Score
                  </Text>
                </View>
              </View>
            )}
          </LiquidGlassContainer>

          {/* Exercises Card */}
          <LiquidGlassContainer>
            <View style={styles.exercisesHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>Exercises</Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
                  Browse exercise library
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.browseButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  hapticFeedback.medium();
                  navigation.navigate('Exercises');
                }}
              >
                <Text style={styles.browseButtonText}>Browse</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.exercisesPreview}>
              <View style={[styles.exercisePreviewItem, { 
                backgroundColor: `${theme.primary}20`,
                borderColor: `${theme.primary}60`,
                borderWidth: 1,
              }]}>
                <MaterialIcons name="fitness-center" size={32} color={theme.primary} />
                <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                  128+ Exercises
                </Text>
              </View>
              <View style={[styles.exercisePreviewItem, { 
                backgroundColor: `${theme.success}20`,
                borderColor: `${theme.success}60`,
                borderWidth: 1,
              }]}>
                <MaterialIcons name="category" size={32} color={theme.success} />
                <Text style={[styles.exercisePreviewText, { color: textColor, ...textOutlineStyle }]}>
                  All Categories
                </Text>
              </View>
            </View>
          </LiquidGlassContainer>

          {/* History removed — now accessed via Profile > Workouts card */}
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
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
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
                        activeOpacity={day.hasScheduled ? 0.6 : 1}
                        onPress={() => {
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
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* About Jason Modal - REDESIGNED */}
      <Modal
        visible={showAboutModal}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <LinearGradient
          colors={isDark 
            ? ['#0F0F23', '#1A1A2E', '#16213E'] 
            : ['#F0F4FF', '#E8EEFF', '#DDE6FF']}
          style={styles.aboutModal}
        >
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
          
          {/* Animated Background Circles */}
          <Animated.View style={[styles.bgCircle1, {
            opacity: cardShimmer.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6]
            }),
            transform: [{
              scale: cardShimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2]
              })
            }]
          }]} />
          <Animated.View style={[styles.bgCircle2, {
            opacity: cardShimmer.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0.7]
            })
          }]} />
          
          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButtonFloating, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            }]}
            onPress={() => {
              hapticFeedback.medium();
              setShowAboutModal(false);
            }}
          >
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.closeButtonBlur}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </BlurView>
          </TouchableOpacity>

          {/* Content */}
          <Animated.ScrollView 
            style={styles.aboutContent}
            contentContainerStyle={styles.aboutContentContainer}
            showsVerticalScrollIndicator={false}
            opacity={modalFadeAnim}
          >
            {/* Hero Title */}
            <Animated.View style={{
              transform: [{ translateY: modalSlideAnim }]
            }}>
              <LinearGradient
                colors={[theme.primary, theme.primaryLight, theme.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <Text style={styles.heroTitle}>About Biblely</Text>
                <MaterialIcons name="stars" size={32} color="#FFFFFF" style={styles.heroIcon} />
              </LinearGradient>
            </Animated.View>

            {/* Creator Card - REDESIGNED */}
            <Animated.View style={{
              transform: [{ translateY: modalSlideAnim }],
              opacity: modalFadeAnim
            }}>
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.creatorCard}>
                <LinearGradient
                  colors={isDark 
                    ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                    : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                  style={styles.creatorCardInner}
                >
                  {/* Animated Avatar with Logo */}
                  <Animated.View style={[styles.creatorIconContainer, {
                    transform: [{
                      scale: cardShimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.05]
                      })
                    }]
                  }]}>
                    <LinearGradient
                      colors={[theme.primary, theme.primaryLight]}
                      style={styles.avatarGradient}
                    >
                      <Image 
                        source={require('../../assets/logo.png')} 
                        style={styles.avatarLogo}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                    {/* Glow ring */}
                    <Animated.View style={[styles.glowRing, {
                      borderColor: theme.primary,
                      opacity: cardShimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.8]
                      })
                    }]} />
                  </Animated.View>
                  
                  <Text style={[styles.creatorName, { color: textColor, ...textOutlineStyle }]}>
                    Hi, I'm Jason 👋
                  </Text>
                  <View style={styles.badgeContainer}>
                    <LinearGradient
                      colors={[theme.primary + '40', theme.primary + '20']}
                      style={styles.badge}
                    >
                      <MaterialIcons name="school" size={14} color={theme.primary} />
                      <Text style={[styles.badgeText, { color: theme.primary }]}>
                        CS Student
                      </Text>
                    </LinearGradient>
                    <LinearGradient
                      colors={[theme.success + '40', theme.success + '20']}
                      style={styles.badge}
                    >
                      <MaterialIcons name="code" size={14} color={theme.success} />
                      <Text style={[styles.badgeText, { color: theme.success }]}>
                        Developer
                      </Text>
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Story Section - REDESIGNED */}
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.storyCard}>
              <LinearGradient
                colors={isDark 
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                style={styles.storyCardInner}
              >
                {/* Story Header with Gradient */}
                <LinearGradient
                  colors={[theme.primary + '30', theme.primary + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyHeaderGradient}
                >
                  <MaterialIcons name="auto-stories" size={24} color={theme.primary} />
                  <Text style={[styles.storyTitle, { color: textColor, ...textOutlineStyle }]}>
                    Why I Built This
                  </Text>
                </LinearGradient>
                
                <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                  I'm Jason, a computer science student who loves reading the Bible. I wanted an app to help me read daily, so I tried a few popular Bible apps.
                </Text>
                
                <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                  Some had paywalls, others just weren't what I was looking for. I wanted something simple that combined faith, productivity, and wellness in one place.
                </Text>
                
                <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                  So I built Biblely. It's got everything I wanted - Bible reading, daily prayers, tasks to stay productive, and even fitness tracking. All completely free.
                </Text>

                <Text style={[styles.storyText, { color: textColor, ...textOutlineStyle }]}>
                  I made this for myself, but I hope it helps you too. No subscriptions, no paywalls, just a simple app to help you grow.
                </Text>
              </LinearGradient>
            </BlurView>

            {/* Thank You Section - REDESIGNED */}
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={styles.thankYouCard}>
              <LinearGradient
                colors={isDark
                  ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']
                  : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
                style={styles.thankYouCardInner}
              >
                <Animated.View style={{
                  transform: [{
                    scale: cardShimmer.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.1]
                    })
                  }]
                }}>
                  <LinearGradient
                    colors={['#FF6B6B', '#EE5A6F']}
                    style={styles.heartContainer}
                  >
                    <MaterialIcons name="favorite" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
                
                <Text style={[styles.thankYouTitle, { color: textColor, ...textOutlineStyle }]}>
                  Thanks for being here
                </Text>
                <Text style={[styles.thankYouText, { color: textSecondaryColor }]}>
                  Hope Biblely helps you out. If you've got any ideas or feedback, I'd love to hear them.
                </Text>
                
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="email" size={18} color={theme.primary} />
                    <Text style={[styles.contactText, { color: textColor, ...textOutlineStyle }]}>
                      biblelyios@gmail.com
                    </Text>
                  </View>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="alternate-email" size={18} color={theme.primary} />
                    <Text style={[styles.contactText, { color: textColor, ...textOutlineStyle }]}>
                      @biblely.app on TikTok
                    </Text>
                  </View>
                </View>
                
                <View style={styles.signatureContainer}>
                  <View style={styles.signatureLine} />
                  <Text style={[styles.signature, { color: textSecondaryColor }]}>
                    Jason
                  </Text>
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.ScrollView>
        </LinearGradient>
      </Modal>
    </AnimatedWallpaper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    left: 16,
    top: -2,
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
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
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
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
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

