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
} from 'react-native';
// SafeAreaView removed - using full screen experience
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import { getStoredData, saveData } from '../utils/localStorage';
import { hapticFeedback } from '../utils/haptics';
import notificationService from '../services/notificationService';
import { QuintupleDotDance } from '../components/ProgressHUDAnimations';

const TodosTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeTodoData();
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

  const checkAndSendAchievements = async (newCompletedTasks, updatedTodos) => {
    try {
      const settings = await getStoredData('notificationSettings') || {};
      
      console.log('🏆 Checking achievements...');
      console.log('🏆 Settings:', settings);
      console.log('🏆 New completed tasks total:', newCompletedTasks);

      // Check for "Daily Warrior" achievements (complete N tasks in a single day)
      const today = new Date().toDateString();
      const todayCompletedTodos = updatedTodos.filter(todo => 
        todo.completed && todo.completedAt && new Date(todo.completedAt).toDateString() === today
      ).length;
      
      // Achievement tracking: tasks completed today

      // Check specific daily achievements
      const dailyAchievements = [
        { tasks: 5, title: "Daily Warrior", points: 50 },
        { tasks: 10, title: "Daily Champion", points: 100 },
        { tasks: 15, title: "Daily Legend", points: 200 },
        { tasks: 25, title: "Daily Master", points: 300 },
      ];

      for (const achievement of dailyAchievements) {
        if (todayCompletedTodos === achievement.tasks) {
          console.log(`🏆 Achievement triggered: ${achievement.title}!`);
          
          // Always send achievement notification and alert (regardless of settings for testing)
          await notificationService.sendAchievementNotification(
            achievement.title,
            achievement.points
          );
          
          // Also show immediate alert for achievement
          setTimeout(() => {
            Alert.alert(
              '🏆 Achievement Unlocked!',
              `${achievement.title}\n+${achievement.points} bonus points!`,
              [{ text: 'Awesome!', style: 'default' }]
            );
          }, 500);
          
          console.log(`✅ Achievement notification sent: ${achievement.title}!`);
          break; // Only send one achievement per completion
        }
      }

      // Check total tasks milestones (less frequent)
      const totalMilestones = [
        { tasks: 25, title: "Task Master", points: 100 },
        { tasks: 50, title: "Task Expert", points: 250 },
        { tasks: 100, title: "Task Champion", points: 500 },
        { tasks: 250, title: "Task Legend", points: 1000 },
        { tasks: 500, title: "Task Master Supreme", points: 2000 },
      ];

      for (const milestone of totalMilestones) {
        if (newCompletedTasks === milestone.tasks) {
          await notificationService.sendAchievementNotification(
            milestone.title,
            milestone.points
          );
          console.log(`🏆 Milestone achieved: ${milestone.title}!`);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  };

  const handleTodoComplete = useCallback(async (todoId) => {
    const updatedTodos = todos.map(todo => 
      todo.id === todoId 
        ? { ...todo, completed: true, completedAt: new Date().toISOString() }
        : todo
    );
    
    const completedTodo = updatedTodos.find(todo => todo.id === todoId);
    const pointsEarned = completedTodo?.points || 0;
    const newCompletedTasks = userStats.completedTasks + 1;
    
    const updatedStats = {
      ...userStats,
      totalPoints: (userStats.totalPoints || userStats.points || 0) + pointsEarned,
      points: (userStats.totalPoints || userStats.points || 0) + pointsEarned, // Keep both for compatibility
      completedTasks: newCompletedTasks,
      level: Math.floor(((userStats.totalPoints || userStats.points || 0) + pointsEarned) / 1000) + 1,
    };
    
    setTodos(updatedTodos);
    setUserStats(updatedStats);
    
    await saveData('todos', updatedTodos);
    await saveData('userStats', updatedStats);
    
    // Check for achievements and send notifications
    await checkAndSendAchievements(newCompletedTasks, updatedTodos);
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
    
    // Get calendar days for current month
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Create calendar grid
    const calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayWeekday; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      const isToday = day === currentDate;
      const dayTodos = todos.filter(todo => {
        if (!todo.completedAt) return false;
        const todoDate = new Date(todo.completedAt);
        return todoDate.getDate() === day && 
               todoDate.getMonth() === today.getMonth() && 
               todoDate.getFullYear() === today.getFullYear();
      });
      
      calendarDays.push({
        day,
        isToday,
        hasActivity: dayTodos.length > 0,
        completedCount: dayTodos.length
      });
    }

    return (
      <BlurView intensity={20} tint="light" style={styles.calendarCard}>
        {/* Today Banner */}
        <View style={styles.todayBanner}>
          <TouchableOpacity style={[styles.todayButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
          <Text style={[styles.monthYear, { color: theme.text }]}>{currentMonth}</Text>
          <TouchableOpacity style={styles.moreButton}>
            <MaterialIcons name="more-horiz" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Days of Week Header */}
        <View style={styles.weekHeader}>
          {daysOfWeek.map((day, index) => (
            <Text key={index} style={[styles.weekDay, { color: theme.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((dayData, index) => {
            if (!dayData) {
              return <View key={index} style={styles.emptyDay} />;
            }

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  dayData.isToday && [styles.todayDay, { backgroundColor: theme.primary }],
                  dayData.hasActivity && !dayData.isToday && [styles.activeDay, { backgroundColor: `${theme.success}20` }]
                ]}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedDate(new Date(today.getFullYear(), today.getMonth(), dayData.day));
                }}
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
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
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

    return (
      <BlurView intensity={18} tint="light" style={styles.statsCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Today's Progress</Text>
        
        <View style={styles.statsRow}>
          <BlurView intensity={30} tint="light" style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>
              {activeTodos.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Active Tasks
            </Text>
          </BlurView>
          
          <BlurView intensity={30} tint="light" style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.success }]}>
              {completedToday.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Completed
            </Text>
          </BlurView>
          
          <BlurView intensity={30} tint="light" style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.warning }]}>
              {userStats.points}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Points
            </Text>
          </BlurView>
        </View>
      </BlurView>
    );
  };

  // Quick add suggestions
  const HistorySection = () => {
    // Get last 10 completed todos sorted by completion time
    const completedHistory = todos
      .filter(todo => todo.completed)
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .slice(0, 10);

    if (completedHistory.length === 0) {
      return (
        <BlurView intensity={18} tint="light" style={styles.suggestionsCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📜 History</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Your completed tasks will appear here
          </Text>
          <BlurView intensity={30} tint="light" style={styles.emptyHistory}>
            <MaterialIcons name="history" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
              No completed tasks yet
            </Text>
          </BlurView>
        </BlurView>
      );
    }

    return (
      <BlurView intensity={18} tint="light" style={styles.suggestionsCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>📜 History</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
          Last 10 completed tasks
        </Text>
        
        <View style={styles.suggestionsList}>
          {completedHistory.map((todo) => (
            <BlurView
              key={todo.id}
              intensity={30}
              tint="light"
              style={styles.historyItem}
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
            </BlurView>
          ))}
        </View>
      </BlurView>
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
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
      {/* Fixed Header - Always Visible - Glassy */}
      <GlassHeader 
        style={[styles.fixedHeader, { 
          backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'rgba(255, 255, 255, 0.1)' : (isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)')
        }]}
        intensity={(isBlushTheme || isCresviaTheme || isEternaTheme) ? 15 : 25}
        absolute={false}
      >
        <View style={styles.headerContent}>
          {/* Logo positioned on the left */}
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          
          {/* Centered text content */}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Tasks & Goals</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Stay focused and earn points
            </Text>
          </View>
          
          {/* View Toggle Button */}
          <TouchableOpacity
            style={[styles.viewToggle, { backgroundColor: theme.primary + '20' }]}
            onPress={() => {
              hapticFeedback.light();
              setViewMode(viewMode === 'list' ? 'calendar' : 'list');
            }}
          >
            <MaterialIcons 
              name={viewMode === 'list' ? 'calendar-today' : 'list'} 
              size={20} 
              color={theme.primary} 
            />
          </TouchableOpacity>
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
    paddingTop: 175, // Content starts after header - no overlap
    paddingBottom: 20, // Space for floating tab bar
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
});

export default TodosTab;
