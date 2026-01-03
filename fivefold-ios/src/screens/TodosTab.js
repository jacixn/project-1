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
} from 'react-native';
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

// Components
import TodoList from '../components/TodoList';
import CalendarView from '../components/CalendarView';
import FullCalendarModal from '../components/FullCalendarModal';
import TasksOverviewModal from '../components/TasksOverviewModal';
import TaskCompletionCelebration from '../components/TaskCompletionCelebration';
import { getStoredData, saveData } from '../utils/localStorage';
import { hapticFeedback } from '../utils/haptics';
import notificationService from '../services/notificationService';
import AchievementService from '../services/achievementService';
import { QuintupleDotDance } from '../components/ProgressHUDAnimations';

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
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme, isSpidermanTheme, isFaithTheme, isSailormoonTheme } = useTheme();
  const { language, t } = useLanguage();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [userStats, setUserStats] = useState({
    points: 0,
    level: 1,
    completedTasks: 0,
    streak: 0,
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [showTasksOverview, setShowTasksOverview] = useState(false);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const [completedTask, setCompletedTask] = useState(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  
  // Logo animations
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;
  
  // Modal card animations
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(50)).current;
  const cardShimmer = useRef(new Animated.Value(0)).current;

  // Continuous logo animations
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
    startLogoAnimations();
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

    // Refresh every 30 seconds to catch prayer completions
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeTodoData = async () => {
    try {
      // Simulate loading time to show beautiful animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
    } catch (error) {
      // Failed to initialize todo data - handle gracefully
      setLoading(false);
    }
  };

  const handleTodoAdd = useCallback(async (newTodo) => {
    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await saveData('todos', updatedTodos);
  }, [todos]);

  const handleTodoComplete = useCallback(async (todoId) => {
    // Find the task before completing it to show in celebration
    const taskToComplete = todos.find(t => t.id === todoId);
    if (!taskToComplete) return;

    // Show celebration first
    setCompletedTask(taskToComplete);
    setShowCompletionCelebration(true);

    // Update data after showing celebration
    setTimeout(async () => {
      const updatedTodos = todos.map(todo => 
        todo.id === todoId 
          ? { ...todo, completed: true, completedAt: new Date().toISOString() }
          : todo
      );
      
      const pointsEarned = 10000; // 10k points per task (more gradual)
      const newCompletedTasks = userStats.completedTasks + 1;
      
      const updatedStats = {
        ...userStats,
        totalPoints: (userStats.totalPoints || userStats.points || 0) + pointsEarned,
        points: (userStats.totalPoints || userStats.points || 0) + pointsEarned,
        completedTasks: newCompletedTasks,
        level: AchievementService.getLevelFromPoints((userStats.totalPoints || userStats.points || 0) + pointsEarned),
      };
      
      setTodos(updatedTodos);
      setUserStats(updatedStats);
      
      await saveData('todos', updatedTodos);
      await saveData('userStats', updatedStats);

      // Global Achievement Check - Handles awarding extra points and showing the alert
      const statsAfterAchievement = await AchievementService.checkAchievements(updatedStats);
      if (statsAfterAchievement) {
        setUserStats(statsAfterAchievement);
      }
      
      // Notify other components that a task was completed
      DeviceEventEmitter.emit('taskCompleted', {
        taskId: todoId,
        points: pointsEarned,
        newCompletedTasks
      });
    }, 100);
  }, [todos, userStats]);

  const handleTodoDelete = useCallback(async (todoId) => {
    const updatedTodos = todos.filter(todo => todo.id !== todoId);
    setTodos(updatedTodos);
    await saveData('todos', updatedTodos);
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
        {/* Today Banner */}
        <View style={styles.todayBanner}>
          <AnimatedTodoButton style={[styles.todayButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.todayButtonText}>Today</Text>
          </AnimatedTodoButton>
          <Text style={[styles.monthYear, { color: theme.text }]}>{currentMonth}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Days of Week Header */}
        <View style={styles.weekHeader}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={[styles.weekDay, { color: theme.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid - Tappable to open full calendar */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => {
            hapticFeedback.light();
            setShowFullCalendar(true);
          }}
        >
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
                    { color: dayData.isToday ? '#fff' : theme.text },
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
          
          {/* Tap to expand hint */}
          <View style={styles.expandHint}>
            <MaterialIcons name="calendar-today" size={16} color={theme.textSecondary} />
            <Text style={[styles.expandHintText, { color: theme.textSecondary }]}>
              Tap to schedule tasks
            </Text>
          </View>
        </TouchableOpacity>
      </LiquidGlassCalendarContainer>
    );
  };

  // Stats overview component (moved below tasks)
  const StatsOverview = () => {
    const activeTodos = todos.filter(todo => !todo.completed);
    const completedToday = todos.filter(todo => {
      if (!todo.completed || !todo.completedAt) return false;
      const today = new Date().toISOString().split('T')[0];
      const completedDate = new Date(todo.completedAt).toISOString().split('T')[0];
      return today === completedDate;
    });

    // Calculate today's points from tasks completed today
    const todayPoints = completedToday.reduce((total, todo) => total + (todo.points || 0), 0);

    // Liquid Glass Container for Stats
    const LiquidGlassStatsContainer = ({ children }) => {
      // Use BlurView if: device doesn't support liquid glass OR user disabled it
      const userPrefersBlur = global.liquidGlassUserPreference === false || liquidGlassEnabled === false;
      
      if (!isLiquidGlassSupported || userPrefersBlur) {
        return (
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.statsCard, { 
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
          style={styles.liquidGlassStatsCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    return (
      <LiquidGlassStatsContainer>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Progress</Text>
        
        <View style={styles.statsRow}>
          <View 
            style={[styles.statItem, { 
              backgroundColor: `${theme.primary}30`,
              borderColor: `${theme.primary}99`,
              borderWidth: 0.8,
              borderRadius: 16,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 1,
            }]}
          >
            <Text style={[styles.statNumber, { color: theme.primary }]}>
              {activeTodos.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Active Tasks
            </Text>
          </View>
          
          <View 
            style={[styles.statItem, { 
              backgroundColor: `${theme.primary}30`,
              borderColor: `${theme.primary}99`,
              borderWidth: 0.8,
              borderRadius: 16,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 1,
            }]}
          >
            <Text style={[styles.statNumber, { color: theme.success }]}>
              {completedToday.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Completed
            </Text>
          </View>
          
          <View 
            style={[styles.statItem, { 
              backgroundColor: `${theme.primary}30`,
              borderColor: `${theme.primary}99`,
              borderWidth: 0.8,
              borderRadius: 16,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 1,
            }]}
          >
            <Text style={[styles.statNumber, { color: theme.warning }]}>
              {todayPoints}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Points
            </Text>
          </View>
        </View>
      </LiquidGlassStatsContainer>
    );
  };

  // Quick add suggestions
  const HistorySection = () => {
    // Get last 10 completed todos sorted by completion time
    const completedHistory = todos
      .filter(todo => todo.completed)
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .slice(0, 10);

    // Liquid Glass Container for History
    const LiquidGlassHistoryContainer = ({ children }) => {
      // Use BlurView if: device doesn't support liquid glass OR user disabled it
      const userPrefersBlur = global.liquidGlassUserPreference === false || liquidGlassEnabled === false;
      
      if (!isLiquidGlassSupported || userPrefersBlur) {
        return (
          <BlurView 
            intensity={18} 
            tint={isDark ? "dark" : "light"} 
            style={[styles.suggestionsCard, { 
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
          style={styles.liquidGlassHistoryCard}
        >
          {children}
        </LiquidGlassView>
      );
    };

    if (completedHistory.length === 0) {
      return (
        <LiquidGlassHistoryContainer>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Your completed tasks will appear here
          </Text>
          <View 
            style={[styles.emptyHistory, { 
              backgroundColor: `${theme.primary}30`,
              borderColor: `${theme.primary}99`,
              borderWidth: 1.5,
            }]}
          >
            <MaterialIcons name="history" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
              No completed tasks yet
            </Text>
          </View>
        </LiquidGlassHistoryContainer>
      );
    }

    return (
      <LiquidGlassHistoryContainer>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Last 10 completed tasks
        </Text>
        
        <View style={styles.suggestionsList}>
          {completedHistory.map((todo) => (
              <View
              key={todo.id}
              style={[styles.historyItem, { 
                backgroundColor: `${theme.primary}30`,
                borderColor: `${theme.primary}99`,
                borderWidth: 1.5,
              }]}
            >
              <MaterialIcons name="check-circle" size={20} color={theme.success} />
              <View style={styles.historyContent}>
                <Text style={[styles.historyText, { 
                  color: theme.textSecondary,
                  textDecorationLine: 'line-through'
                }]} numberOfLines={1}>
                  {todo.text}
                </Text>
                <Text style={[styles.historyTime, { color: theme.textTertiary }]}>
                  {todo.completedAt ? new Date(todo.completedAt).toLocaleTimeString() : 'Earlier'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </LiquidGlassHistoryContainer>
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
          <Text style={[styles.loadingText, { color: theme.text }]}>
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
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme || isSpidermanTheme || isFaithTheme || isSailormoonTheme) ? 'transparent' : theme.background }]}>
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Tasks & Goals</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Stay focused and earn points
            </Text>
          </View>
        </View>
      </GlassHeader>

      {/* Main Content - flows to top like Twitter */}
      <Animated.ScrollView 
        style={styles.twitterContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.twitterScrollContent}

        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Beautiful Calendar Header */}
        <CalendarHeader />

        {/* Main Content - List or Calendar View */}
        {viewMode === 'list' ? (
          <>
            {/* Todo List */}
            <TodoList
              todos={todos}
              onTodoAdd={handleTodoAdd}
              onTodoComplete={handleTodoComplete}
              onTodoDelete={handleTodoDelete}
              userStats={userStats}
              onViewAll={() => setShowTasksOverview(true)}
            />

            {/* Stats Overview - Now below tasks */}
            <StatsOverview />

            {/* Quick Add Suggestions */}
            <HistorySection />
          </>
        ) : (
          /* Calendar View */
          <CalendarView
            todos={todos}
            onTodoAdd={handleTodoAdd}
            onTodoComplete={handleTodoComplete}
            onTodoDelete={handleTodoDelete}
            onDateSelect={setSelectedDate}
          />
        )}
      </Animated.ScrollView>

      {/* Full Calendar Modal */}
      <FullCalendarModal
        visible={showFullCalendar}
        onClose={() => setShowFullCalendar(false)}
        onTaskAdd={handleTodoAdd}
      />

      {/* Tasks Overview Modal */}
      <TasksOverviewModal
        visible={showTasksOverview}
        onClose={() => setShowTasksOverview(false)}
        todos={todos}
        onTodoComplete={handleTodoComplete}
        onTodoDelete={handleTodoDelete}
      />

      {/* Task Completion Celebration */}
      <TaskCompletionCelebration
        visible={showCompletionCelebration}
        task={completedTask}
        onClose={() => {
          setShowCompletionCelebration(false);
          setCompletedTask(null);
        }}
      />

      {/* About Modal */}
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
                <MaterialIcons name="stars" size={28} color="#FFFFFF" style={styles.heroIcon} />
              </LinearGradient>
            </Animated.View>

            {/* Creator Card */}
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
                  
                  <Text style={[styles.creatorName, { color: theme.text }]}>
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

            {/* Story Section */}
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
                  <Text style={[styles.storyTitle, { color: theme.text }]}>
                    Why I Built This
                  </Text>
                </LinearGradient>
                
                <Text style={[styles.storyText, { color: theme.text }]}>
                  I'm Jason, a computer science student who loves reading the Bible. I wanted an app to help me read daily, so I tried a few popular Bible apps.
                </Text>
                
                <Text style={[styles.storyText, { color: theme.text }]}>
                  Some had paywalls, others just weren't what I was looking for. I wanted something simple that combined faith, productivity, and wellness in one place.
                </Text>
                
                <Text style={[styles.storyText, { color: theme.text }]}>
                  So I built Biblely. It's got everything I wanted - Bible reading, daily prayers, tasks to stay productive, and even fitness tracking. All completely free.
                </Text>

                <Text style={[styles.storyText, { color: theme.text }]}>
                  I made this for myself, but I hope it helps you too. No subscriptions, no paywalls, just a simple app to help you grow.
                </Text>
              </LinearGradient>
            </BlurView>

            {/* Thank You Section */}
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
                
                <Text style={[styles.thankYouTitle, { color: theme.text }]}>
                  Thanks for being here
                </Text>
                <Text style={[styles.thankYouText, { color: theme.textSecondary }]}>
                  Hope Biblely helps you out. If you've got any ideas or feedback, I'd love to hear them.
                </Text>
                
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="email" size={18} color={theme.primary} />
                    <Text style={[styles.contactText, { color: theme.text }]}>
                      biblelyios@gmail.com
                    </Text>
                  </View>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="alternate-email" size={18} color={theme.primary} />
                    <Text style={[styles.contactText, { color: theme.text }]}>
                      @biblely.app on TikTok
                    </Text>
                  </View>
                </View>
                
                <View style={styles.signatureContainer}>
                  <View style={styles.signatureLine} />
                  <Text style={[styles.signature, { color: theme.textSecondary }]}>
                    Jason
                  </Text>
                </View>
              </LinearGradient>
            </BlurView>
          </Animated.ScrollView>
        </LinearGradient>
      </Modal>
    </View>
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
    width: 32,
    height: 32,
    position: 'absolute',
    left: 20,
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
    marginBottom: 35, // Increased gap between Today's Progress and cards below
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
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
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
