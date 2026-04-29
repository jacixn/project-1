import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
  Image,
  DeviceEventEmitter,
  Modal,
  KeyboardAvoidingView,
  Easing,
  ActivityIndicator,
} from 'react-native';
import AboutBiblelyModal from '../components/AboutBiblelyModal';
import { logoSpin, logoPulse, logoFloat } from '../utils/sharedHeaderLogoAnim';
// SafeAreaView removed - using full screen experience
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FluidTransition, FluidCard, FluidButton } from '../components/FluidTransition';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import ScrollHeader from '../components/ScrollHeader';
import { createEntranceAnimation, createSpringAnimation } from '../utils/animations';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import useTabBarScrollToTop from '../hooks/useTabBarScrollToTop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Components
import TodoList from '../components/TodoList';
import CalendarView from '../components/CalendarView';
import FullCalendarModal from '../components/FullCalendarModal';
// TasksOverviewModal removed — now a stack screen (TasksOverviewScreen)
import { getStoredData, saveData } from '../utils/localStorage';
import { hapticFeedback } from '../utils/haptics';
import LottieView from 'lottie-react-native';
import notificationService from '../services/notificationService';
import AchievementService from '../services/achievementService';
import { addSeasonalPoints } from '../services/seasonService';
import userStorage from '../utils/userStorage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { QuintupleDotDance } from '../components/ProgressHUDAnimations';
import { updateTodoWidget } from '../utils/widgetBridge';
import { pushToCloud } from '../services/userSyncService';
import VisionCard from '../components/VisionCard';
import VisionSetupModal from '../components/VisionSetupModal';
import { loadVisions } from '../services/visionService';
import HabitsCard from '../components/HabitsCard';
import { loadHabits, checkIn as habitCheckIn } from '../services/habitsService';
import RemindersCard from '../components/RemindersCard';
import { loadReminders, completeReminder } from '../services/reminderService';

// Format large numbers compactly: 1200 -> 1.2K, 1500000 -> 1.5M (kept for potential reuse)
const formatCompact = (num) => {
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return val % 1 === 0 ? `${val}M` : `${parseFloat(val.toFixed(1))}M`;
  }
  if (num >= 10_000) {
    const val = num / 1_000;
    return val % 1 === 0 ? `${val}K` : `${parseFloat(val.toFixed(1))}K`;
  }
  if (num >= 1_000) {
    return num.toLocaleString();
  }
  return `${num}`;
};

// Animated Todo Components (follows Rules of Hooks)
const AnimatedTodoButton = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedCalendarDay = ({ children, onPress, style, ...props }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 500,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 500,
      friction: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
        style={style}
        {...props}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const TodosTab = () => {
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
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef(null);
  useTabBarScrollToTop(mainScrollRef);
  const [userStats, setUserStats] = useState({
    points: 0,
    level: 1,
    completedTasks: 0,
    streak: 0,
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  // showTasksOverview removed — now navigates to TasksOverview screen
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);
  const [visions, setVisions] = useState([]);
  const [showVisionSetup, setShowVisionSetup] = useState(false);
  const [habits, setHabits] = useState([]);
  const [reminders, setReminders] = useState([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  
  // Logo animations — shared singleton values so all tabs sync
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;

  const handleTodoAddRef = useRef(null);

  // Card customisation config
  const TODOS_DEFAULT_ORDER = ['Reminders', 'Habits', 'Vision', 'Tasks'];
  const [cardOrder, setCardOrder] = useState(TODOS_DEFAULT_ORDER);
  const [hiddenCards, setHiddenCards] = useState([]);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLoadingAnim, setSelectedLoadingAnim] = useState('default');
  const refreshLottieRef = useRef(null);
  const refreshLottieScale = useRef(new Animated.Value(0)).current;
  const refreshLottieOpacity = useRef(new Animated.Value(0)).current;
  const refreshSpacerHeight = useRef(new Animated.Value(0)).current;

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
    initializeTodoData();
    // Logo animations are now shared globally — no local start call needed.
    startShimmerAnimation();
    // Start entrance animation
    createEntranceAnimation(slideAnim, fadeAnim, scaleAnim, 0, 0).start();
    // Header appears after content
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 300,
      delay: 200,
      useNativeDriver: true,
    }).start();
    userStorage.getRaw('fivefold_loading_animation').then(id => {
      setSelectedLoadingAnim(id || 'default');
    }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      userStorage.getRaw('fivefold_loading_animation').then(v => {
        setSelectedLoadingAnim(v || 'default');
      }).catch(() => {});
      userStorage.get('cardConfig_Todos').then(config => {
        if (config) {
          const saved = config.order || TODOS_DEFAULT_ORDER;
          const merged = [
            ...saved.filter(id => TODOS_DEFAULT_ORDER.includes(id)),
            ...TODOS_DEFAULT_ORDER.filter(id => !saved.includes(id)),
          ];
          setCardOrder(merged);
          setHiddenCards(config.hidden || []);
        }
      }).catch(() => {});
    }, [])
  );

  // Load visions and habits when tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadVisions().then((v) => setVisions(v));
      loadHabits().then((h) => setHabits(h));
      loadReminders().then((r) => setReminders(r));
    }, [])
  );

  // Listen for global "close all modals" event (e.g., when widget is tapped)
  useEffect(() => {
    const handleCloseAllModals = () => {
      console.log('TodosTab: Closing all modals (widget navigation)');
      setShowFullCalendar(false);
      setShowCompletionCelebration(false);
      setShowAboutModal(false);
    };

    const subscription = DeviceEventEmitter.addListener('closeAllModals', handleCloseAllModals);
    
    // Listen for user data downloaded from cloud (after sign in)
    const userDataListener = DeviceEventEmitter.addListener('userDataDownloaded', async () => {
      console.log('☁️ TodosTab: User data downloaded, refreshing tasks...');
      await initializeTodoData();
    });
    
    // Listen for tasks scheduled from ScheduleTaskScreen
    const scheduleTaskListener = DeviceEventEmitter.addListener('scheduleTaskFromScreen', (task) => {
      console.log('📅 Task scheduled from screen:', task);
      handleTodoAddRef.current?.(task);
    });

    return () => {
      subscription.remove();
      userDataListener.remove();
      scheduleTaskListener.remove();
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

  // Refresh data when tab becomes focused (to show updated points from prayers)
  // Listen for stat changes via events instead of polling every 30 seconds
  useEffect(() => {
    const refreshStats = async () => {
      try {
        const stats = await getStoredData('userStats');
        if (stats) {
          setUserStats(stats);
        }
      } catch (error) {
        // Failed to refresh user stats - continue with cached data
      }
    };

    const statsListener = DeviceEventEmitter.addListener('userStatsChanged', refreshStats);
    const prayerListener = DeviceEventEmitter.addListener('prayerCompleted', refreshStats);
    
    // Listen for changes from TasksOverviewScreen (completions/deletions)
    const todosChangedListener = DeviceEventEmitter.addListener('todosChanged', async () => {
      try {
        const storedTodos = await getStoredData('todos') || [];
        const storedStats = await getStoredData('userStats') || { points: 0, level: 1, completedTasks: 0 };
        setTodos(storedTodos);
        setUserStats(storedStats);
        updateTodoWidget().catch(() => {});
      } catch (err) {
        // Failed to refresh todos after change event
      }
    });
    
    return () => {
      statsListener.remove();
      prayerListener.remove();
      todosChangedListener.remove();
    };
  }, []);

  // Pull-to-refresh handler — reloads ALL tasks & stats fresh
  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    hapticFeedback.gentle();
    console.log('🔄 Tasks: Pull-to-refresh started — reloading all data...');
    try {
      const results = await Promise.allSettled([
        (async () => {
          const storedTodos = await getStoredData('todos') || [];
          setTodos(storedTodos);
        })(),
        (async () => {
          const storedStats = await getStoredData('userStats') || { points: 0, level: 1, completedTasks: 0, streak: 0 };
          setUserStats(storedStats);
        })(),
        loadVisions().then((v) => setVisions(v)),
        loadHabits().then((h) => setHabits(h)),
        loadReminders().then((r) => setReminders(r)),
      ]);

      const labels = ['Todos', 'User Stats', 'Visions', 'Habits', 'Reminders'];
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`❌ Tasks refresh failed: ${labels[i]}`, r.reason);
        } else {
          console.log(`✅ Tasks refresh: ${labels[i]} loaded`);
        }
      });

      DeviceEventEmitter.emit('todosRefreshed');
      await new Promise(resolve => setTimeout(resolve, 600));
      console.log('🔄 Tasks: Refresh complete');
    } catch (error) {
      console.error('Error refreshing tasks data:', error);
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

  const initializeTodoData = async () => {
    try {
      // Loading animation plays while real data loads (no artificial delay)
      
      const storedTodos = await getStoredData('todos') || [];
      const storedStats = await getStoredData('userStats') || {
        points: 0,
        level: 1,
        completedTasks: 0,
        streak: 0,
      };
      
      setTodos(storedTodos);
      setUserStats(storedStats);
      setLoading(false);
      // Ensure widget has latest data whenever tab loads
      updateTodoWidget().catch(() => {});
    } catch (error) {
      // Failed to initialize todo data - handle gracefully
      setLoading(false);
    }
  };

  const handleTodoAdd = useCallback(async (newTodo) => {
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await saveData('todos', updatedTodos);
    pushToCloud('todos', updatedTodos);
    updateTodoWidget().catch(() => {});
  }, [todos]);
  handleTodoAddRef.current = handleTodoAdd;

  const handleTodoComplete = useCallback(async (todoId) => {
    // Find the task before completing it to show in celebration
    const taskToComplete = todos.find(t => t.id === todoId);
    if (!taskToComplete) return;

    try {
      const updatedTodos = todos.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: true, completedAt: new Date().toISOString() }
          : todo
      );
      
      const pointsEarned = Math.min(taskToComplete.points || 69, 345); // Clamped to valid range
      const oldTotal = userStats.totalPoints || userStats.points || 0;
      const newCompletedTasks = userStats.completedTasks + 1;

      // Track per-tier completions for achievements
      const tier = taskToComplete.tier || 'mid';
      const tierKey = tier === 'low' ? 'lowTierCompleted' : tier === 'high' ? 'highTierCompleted' : 'midTierCompleted';
      
      const updatedStats = {
        ...userStats,
        totalPoints: oldTotal + pointsEarned,
        points: oldTotal + pointsEarned,
        completedTasks: newCompletedTasks,
        [tierKey]: (userStats[tierKey] || 0) + 1,
        level: AchievementService.getLevelFromPoints(oldTotal + pointsEarned),
      };
      
      setTodos(updatedTodos);
      setUserStats(updatedStats);
      
      // Persist in background — don't await to keep UI snappy
      saveData('todos', updatedTodos).catch(() => {});
      pushToCloud('todos', updatedTodos);
      saveData('userStats', updatedStats).catch(() => {});
      userStorage.setRaw('userStats', JSON.stringify(updatedStats)).catch(() => {});
      updateTodoWidget().catch(() => {});
      
      // Sync to Firebase in background (non-blocking)
      const currentUser = auth.currentUser;
      if (currentUser) {
        setDoc(doc(db, 'users', currentUser.uid), {
          totalPoints: updatedStats.totalPoints,
          tasksCompleted: newCompletedTasks,
          level: updatedStats.level,
          lastActive: serverTimestamp(),
        }, { merge: true }).catch(err => {
          console.warn('Firebase task points sync failed:', err.message);
        });
      }

      // Check achievements in background (non-blocking)
      addSeasonalPoints(pointsEarned).catch(() => {});
      Promise.race([
        AchievementService.checkAchievements(updatedStats),
        new Promise(resolve => setTimeout(() => resolve(null), 5000)), // 5s timeout
      ]).then(statsAfterAchievement => {
        if (statsAfterAchievement) {
          setUserStats(statsAfterAchievement);
        }
      }).catch(() => {});
      
      // Notify other components that a task was completed
      DeviceEventEmitter.emit('taskCompleted', {
        taskId: todoId,
        points: pointsEarned,
        newCompletedTasks
      });
    } catch (error) {
      console.warn('[TodosTab] handleTodoComplete error:', error?.message);
    }
  }, [todos, userStats]);

  const handleMiscPoints = useCallback((pointsEarned) => {
    try {
      const oldTotal = userStats.totalPoints || userStats.points || 0;
      const updatedStats = {
        ...userStats,
        totalPoints: oldTotal + pointsEarned,
        points: oldTotal + pointsEarned,
        level: AchievementService.getLevelFromPoints(oldTotal + pointsEarned),
      };
      setUserStats(updatedStats);
      saveData('userStats', updatedStats).catch(() => {});
      userStorage.setRaw('userStats', JSON.stringify(updatedStats)).catch(() => {});
      addSeasonalPoints(pointsEarned).catch(() => {});
      const currentUser = auth.currentUser;
      if (currentUser) {
        setDoc(doc(db, 'users', currentUser.uid), {
          totalPoints: updatedStats.totalPoints,
          level: updatedStats.level,
          lastActive: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      console.warn('[TodosTab] handleMiscPoints error:', e?.message);
    }
  }, [userStats]);

  const handleTodoDelete = useCallback(async (todoId) => {
    const updatedTodos = todos.filter(todo => todo.id !== todoId);
    setTodos(updatedTodos);
    await saveData('todos', updatedTodos);
    pushToCloud('todos', updatedTodos);
    updateTodoWidget().catch(() => {});
  }, [todos]);

  // Beautiful Calendar Component
  const CalendarHeader = () => {
    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const currentDate = today.getDate();
    const currentDay = today.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Get days of the week
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    
    // Get the current week (Sunday to Saturday)
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const sundayOfWeek = new Date(today);
    sundayOfWeek.setDate(today.getDate() - currentDayOfWeek); // Go back to Sunday
    
    // Create calendar grid for 7 days (Sunday to Saturday)
    const calendarDays = [];
    
    // Add 7 days starting from Sunday
    for (let i = 0; i < 7; i++) {
      const date = new Date(sundayOfWeek);
      date.setDate(sundayOfWeek.getDate() + i);
      const day = date.getDate();
      const isToday = date.toDateString() === today.toDateString();
      
      const dayTodos = todos.filter(todo => {
        if (!todo.completedAt) return false;
        const todoDate = new Date(todo.completedAt);
        return todoDate.toDateString() === date.toDateString();
      });
      
      calendarDays.push({
        day,
        date,
        isToday,
        hasActivity: dayTodos.length > 0,
        completedCount: dayTodos.length
      });
    }

    // Liquid Glass Container for Calendar
    const LiquidGlassCalendarContainer = ({ children }) => {
      // Use BlurView if: device doesn't support liquid glass OR user disabled it
      const userPrefersBlur = global.liquidGlassUserPreference === false || liquidGlassEnabled === false;
      
      if (!isLiquidGlassSupported || userPrefersBlur) {
        return (
          <BlurView 
            intensity={20} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.calendarCard, { 
              backgroundColor: isDark 
                ? 'rgba(255, 255, 255, 0.05)' 
                : `${theme.primary}15`
            }]}
          >
            {children}
          </BlurView>
        );
      }

      // Use Liquid Glass if: device supports it AND user enabled it
      return (
        <LiquidGlassView
          interactive={true}
          effect="clear"
          colorScheme="system"
          tintColor="rgba(255, 255, 255, 0.08)"
          style={styles.liquidGlassCalendarCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    return (
      <LiquidGlassCalendarContainer>
        {/* This Week Calendar */}
        <View style={styles.todayBanner}>
          <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle, marginBottom: 0 }]}>This Week</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              hapticFeedback.light();
              navigation.navigate('ScheduleTask');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.primary,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Schedule</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Days of Week Header */}
        <View style={styles.weekHeader}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={[styles.weekDay, { color: textSecondaryColor }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((dayData, index) => {
            return (
              <View
                key={index}
                style={[
                  styles.calendarDay,
                  dayData.isToday && [styles.todayDay, { backgroundColor: theme.primary }],
                  dayData.hasActivity && !dayData.isToday && [styles.activeDay, { backgroundColor: `${theme.success}20` }]
                ]}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: dayData.isToday ? '#fff' : textColor, ...textOutlineStyle },
                  dayData.hasActivity && !dayData.isToday && { color: theme.success, fontWeight: '600' }
                ]}>
                  {dayData.day}
                </Text>
                {dayData.hasActivity && (
                  <View style={[
                    styles.activityDot,
                    { backgroundColor: dayData.isToday ? '#fff' : theme.success }
                  ]} />
                )}
              </View>
            );
          })}
        </View>
      </LiquidGlassCalendarContainer>
    );
  };

  // Show loading screen with beautiful animation
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
        <View style={styles.loadingContainer}>
          <QuintupleDotDance size={60} />
          <Text style={[styles.loadingText, { color: textColor, ...textOutlineStyle }]}>
            Loading your tasks...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <AnimatedWallpaper 
      scrollY={scrollY}
      parallaxFactor={0.3}
      blurOnScroll={false}
      fadeOnScroll={false}
      scaleOnScroll={true}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <View style={[styles.container, { backgroundColor: (currentTheme && currentTheme !== 'light' && currentTheme !== 'dark') ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
      {/* Fixed Header - Always Visible - Glassy */}
      <GlassHeader 
        style={[styles.fixedHeader, { 
          backgroundColor: isDark 
            ? 'rgba(255, 255, 255, 0.05)' 
            : `${theme.primary}15` // Same as cards - use theme primary color with 15% opacity
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
            <Text style={[styles.headerTitle, { color: textColor, ...textOutlineStyle }]}>Focus</Text>
            <Text style={[styles.headerSubtitle, { color: textSecondaryColor, ...textOutlineStyle }]}>
              Focus and achieve goals
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

      {/* Main Content - flows to top like Twitter */}
      <Animated.ScrollView
        ref={mainScrollRef}
        style={styles.twitterContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.twitterScrollContent}
        keyboardShouldPersistTaps="handled"
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
            case 'Calendar': return <CalendarHeader key={id} />;
            case 'Reminders': return (
              <RemindersCard
                key={id}
                reminders={reminders}
                onPress={() => navigation.navigate('Reminders')}
                onComplete={async (reminder, dateStr) => {
                  try {
                    await completeReminder(reminder.id, dateStr);
                    const r = await loadReminders();
                    setReminders(r);
                  } catch (e) {
                    console.error('[TodosTab] onComplete error', e);
                  }
                }}
                onPointsEarned={handleMiscPoints}
                liquidGlassEnabled={liquidGlassEnabled}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
                textOutlineStyle={textOutlineStyle}
              />
            );
            case 'Habits': return (
              <HabitsCard
                key={id}
                habits={habits}
                onPress={() => navigation.navigate('Habits')}
                onCheckIn={async (habit) => {
                  try {
                    await habitCheckIn(habit.id);
                    const h = await loadHabits();
                    setHabits(h);
                  } catch (e) {
                    console.error('[TodosTab] habit checkIn error', e);
                  }
                }}
                onPointsEarned={handleMiscPoints}
                liquidGlassEnabled={liquidGlassEnabled}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
                textOutlineStyle={textOutlineStyle}
              />
            );
            case 'Vision': return (
              <VisionCard
                key={id}
                visions={visions}
                onPress={() => navigation.navigate('Vision')}
                onSetup={() => setShowVisionSetup(true)}
                liquidGlassEnabled={liquidGlassEnabled}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
                textOutlineStyle={textOutlineStyle}
                isBiblelyMainWallpaper={isBiblelyMainWallpaper}
              />
            );
            case 'Tasks': return viewMode === 'list' ? (
              <TodoList
                key={id}
                todos={todos}
                onTodoAdd={handleTodoAdd}
                onTodoComplete={handleTodoComplete}
                onTodoDelete={handleTodoDelete}
                userStats={userStats}
                onViewAll={() => navigation.navigate('TasksOverview')}
              />
            ) : (
              <CalendarView
                key={id}
                todos={todos}
                onTodoAdd={handleTodoAdd}
                onTodoComplete={handleTodoComplete}
                onTodoDelete={handleTodoDelete}
                onDateSelect={setSelectedDate}
              />
            );
            default: return null;
          }
        })}
      </Animated.ScrollView>

      {/* Schedule Task - now navigated via stack navigator for swipe-back support */}

      {/* Tasks Overview — now a stack screen, navigated via navigation.navigate('TasksOverview') */}

      {/* Vision Setup Modal */}
      <VisionSetupModal
        visible={showVisionSetup}
        onClose={() => setShowVisionSetup(false)}
        onComplete={() => {
          loadVisions().then((v) => setVisions(v));
        }}
      />

      <AboutBiblelyModal visible={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </View>
    </KeyboardAvoidingView>
    </AnimatedWallpaper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Higher z-index to stay on top
    paddingTop: Platform.OS === 'ios' ? 70 : 35,
    paddingBottom: 15,
    paddingHorizontal: 20,
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
  twitterContent: {
    flex: 1,
    marginTop: 0, // Removed safe area - content flows to top
  },
  twitterScrollContent: {
    paddingTop: 145, // Content starts after header - no overlap
    paddingBottom: 100, // Space for floating tab bar - no content hidden
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerLogo: {
    width: 24,
    height: 24,
    position: 'absolute',
    left: 20,
    top: -10,
  },
  viewToggle: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  scrollContent: {
    paddingTop: 95, // Moved cards up closer to header
    paddingBottom: 130, // More space for bigger floating tab bar
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20, // Add horizontal margins for consistent width
    marginBottom: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 12,
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
  suggestionsCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20, // Add horizontal margins for consistent width
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  suggestionsList: {
    gap: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  historyContent: {
    flex: 1,
    marginLeft: 10,
  },
  historyText: {
    fontSize: 14,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 11,
  },
  emptyHistory: {
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  emptyHistoryText: {
    marginTop: 10,
    fontSize: 14,
  },
  // Liquid Glass Styles
  liquidGlassCalendarCard: {
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
  liquidGlassStatsCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  liquidGlassHistoryCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  // Compact Calendar Styles - Like the reference image
  calendarCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  moreButton: {
    padding: 6,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekDay: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    width: 28,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 2,
  },
  emptyDay: {
    width: 28,
    height: 28,
    margin: 1,
  },
  calendarDay: {
    width: 28,
    height: 28,
    margin: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayDay: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  activeDay: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activityDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  expandHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // About Modal Styles
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
});

export default TodosTab;
