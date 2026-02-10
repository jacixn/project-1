/**
 * TasksOverviewScreen
 *
 * Full tasks overview as a stack navigation screen.
 * Loads todos from local storage, supports completion and deletion.
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  DeviceEventEmitter,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { getStoredData, saveData } from '../utils/localStorage';
import AchievementService from '../services/achievementService';
import userStorage from '../utils/userStorage';
import { auth, db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const { width: SW } = Dimensions.get('window');

const TasksOverviewScreen = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [todos, setTodos] = useState([]);
  const [userStats, setUserStats] = useState({ points: 0, level: 1, completedTasks: 0 });
  const [loading, setLoading] = useState(true);

  // Colors
  const bg = theme.background;
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#666';
  const textTertiary = isDark ? 'rgba(255,255,255,0.35)' : '#999';

  // Load data
  const loadData = useCallback(async () => {
    try {
      const storedTodos = await getStoredData('todos') || [];
      const storedStats = await getStoredData('userStats') || { points: 0, level: 1, completedTasks: 0 };
      setTodos(storedTodos);
      setUserStats(storedStats);
    } catch (err) {
      console.warn('Failed to load tasks data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  // Entrance animation
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // Complete task
  const handleTodoComplete = useCallback(async (todoId) => {
    const taskToComplete = todos.find(t => t.id === todoId);
    if (!taskToComplete) return;

    hapticFeedback.success();

    const updatedTodos = todos.map(todo =>
      todo.id === todoId
        ? { ...todo, completed: true, completedAt: new Date().toISOString() }
        : todo
    );

    const pointsEarned = taskToComplete.points || 500;
    const newCompletedTasks = (userStats.completedTasks || 0) + 1;

    // Track per-tier completions for achievements
    const tier = taskToComplete.tier || 'mid';
    const tierKey = tier === 'low' ? 'lowTierCompleted' : tier === 'high' ? 'highTierCompleted' : 'midTierCompleted';

    const updatedStats = {
      ...userStats,
      totalPoints: (userStats.totalPoints || userStats.points || 0) + pointsEarned,
      points: (userStats.totalPoints || userStats.points || 0) + pointsEarned,
      completedTasks: newCompletedTasks,
      [tierKey]: (userStats[tierKey] || 0) + 1,
      level: AchievementService.getLevelFromPoints((userStats.totalPoints || userStats.points || 0) + pointsEarned),
    };

    setTodos(updatedTodos);
    setUserStats(updatedStats);

    await saveData('todos', updatedTodos);
    await saveData('userStats', updatedStats);
    // Also sync to raw userStats key for consistency
    await userStorage.setRaw('userStats', JSON.stringify(updatedStats));

    // total_points is now managed centrally by achievementService.checkAchievements()

    // Sync to Firebase if user is logged in
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

    // Achievement check
    const statsAfterAchievement = await AchievementService.checkAchievements(updatedStats);
    if (statsAfterAchievement) {
      setUserStats(statsAfterAchievement);
    }

    // Notify other components
    DeviceEventEmitter.emit('taskCompleted', {
      taskId: todoId,
      points: pointsEarned,
      newCompletedTasks,
    });
    DeviceEventEmitter.emit('todosChanged');
  }, [todos, userStats]);

  // Delete task
  const handleTodoDelete = useCallback(async (todoId) => {
    hapticFeedback.light();
    const updatedTodos = todos.filter(todo => todo.id !== todoId);
    setTodos(updatedTodos);
    await saveData('todos', updatedTodos);
    DeviceEventEmitter.emit('todosChanged');
  }, [todos]);

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    todos.forEach(todo => {
      if (todo.completed) return;

      let dateKey, dateLabel, sortOrder;

      if (todo.scheduledDate) {
        const scheduledDate = new Date(todo.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          dateKey = 'overdue'; dateLabel = 'Overdue'; sortOrder = -1;
        } else if (diffDays === 0) {
          dateKey = 'today'; dateLabel = 'Today'; sortOrder = 0;
        } else if (diffDays === 1) {
          dateKey = 'tomorrow'; dateLabel = 'Tomorrow'; sortOrder = 1;
        } else if (diffDays <= 7) {
          dateKey = todo.scheduledDate;
          dateLabel = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          sortOrder = diffDays;
        } else {
          dateKey = todo.scheduledDate;
          dateLabel = scheduledDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          sortOrder = diffDays;
        }
      } else {
        dateKey = 'anytime'; dateLabel = 'Anytime'; sortOrder = 999;
      }

      if (!groups[dateKey]) groups[dateKey] = { label: dateLabel, tasks: [], sortOrder, dateKey };
      groups[dateKey].tasks.push(todo);
    });

    return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [todos]);

  const getTierConfig = (tier) => {
    switch (tier) {
      case 'low': return { color: '#10B981', label: 'LOW', icon: 'trending-down' };
      case 'mid': return { color: '#F59E0B', label: 'MID', icon: 'trending-flat' };
      case 'high': return { color: '#EF4444', label: 'HIGH', icon: 'trending-up' };
      default: return { color: '#6B7280', label: 'MID', icon: 'trending-flat' };
    }
  };

  const getSectionIcon = (key) => {
    switch (key) {
      case 'overdue': return { icon: 'warning', color: '#EF4444' };
      case 'today': return { icon: 'today', color: '#3B82F6' };
      case 'tomorrow': return { icon: 'event', color: '#8B5CF6' };
      case 'anytime': return { icon: 'all-inclusive', color: '#6B7280' };
      default: return { icon: 'date-range', color: '#6366F1' };
    }
  };

  const totalTasks = todos.filter(t => !t.completed).length;
  const totalPoints = todos.filter(t => !t.completed).reduce((sum, t) => sum + (t.points || 0), 0);
  const highCount = todos.filter(t => !t.completed && t.tier === 'high').length;

  const renderTaskCard = (todo, index) => {
    const tier = getTierConfig(todo.tier);

    return (
      <Animated.View
        key={todo.id}
        style={[styles.taskCard, {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          opacity: fadeAnim,
          transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.15)) }],
        }]}
      >
        {/* Priority accent */}
        <View style={[styles.taskAccent, { backgroundColor: tier.color }]} />

        <View style={styles.taskInner}>
          {/* Top row: checkbox + text + delete */}
          <View style={styles.taskTopRow}>
            <TouchableOpacity
              style={[styles.checkBtn, { borderColor: tier.color }]}
              onPress={() => handleTodoComplete(todo.id)}
              activeOpacity={0.6}
            >
              <View style={[styles.checkInner, { backgroundColor: tier.color + '15' }]}>
                <MaterialIcons name="check" size={14} color={tier.color} style={{ opacity: 0.3 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.taskTextWrap}>
              <Text style={[styles.taskText, { color: textPrimary }]} numberOfLines={3}>
                {todo.text}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleTodoDelete(todo.id)}
              activeOpacity={0.6}
            >
              <MaterialIcons name="delete-outline" size={18} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'} />
            </TouchableOpacity>
          </View>

          {/* Tags row */}
          <View style={styles.tagsRow}>
            <View style={[styles.tierChip, { backgroundColor: tier.color + '15' }]}>
              <MaterialIcons name={tier.icon} size={12} color={tier.color} />
              <Text style={[styles.tierChipText, { color: tier.color }]}>{tier.label}</Text>
            </View>

            <View style={[styles.pointsChip, { backgroundColor: `${theme.primary}12` }]}>
              <MaterialIcons name="star" size={12} color={theme.primary} />
              <Text style={[styles.pointsChipText, { color: theme.primary }]}>+{todo.points}</Text>
            </View>

            {todo.source === 'ai' && (
              <View style={[styles.smartChip, { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)' }]}>
                <MaterialIcons name="auto-awesome" size={11} color="#8B5CF6" />
                <Text style={[styles.smartChipText, { color: '#8B5CF6' }]}>Smart</Text>
              </View>
            )}

            {todo.timeEstimate && todo.timeEstimate !== 'Unknown' && (
              <View style={[styles.timeChip, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)' }]}>
                <MaterialIcons name="schedule" size={11} color="#3B82F6" />
                <Text style={[styles.timeChipText, { color: '#3B82F6' }]}>{todo.timeEstimate}</Text>
              </View>
            )}
          </View>

          {/* Analysis (collapsed — only show reasoning as a subtle note) */}
          {todo.reasoning && (
            <View style={[styles.insightRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}>
              <MaterialIcons name="lightbulb-outline" size={13} color={textTertiary} />
              <Text style={[styles.insightText, { color: textSecondary }]}>
                {todo.reasoning}
              </Text>
            </View>
          )}

          {/* Confidence micro-bar */}
          {todo.confidence && (
            <View style={styles.confidenceRow}>
              <View style={[styles.confTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F0F1F3' }]}>
                <View style={[styles.confFill, { width: `${todo.confidence}%`, backgroundColor: theme.primary }]} />
              </View>
              <Text style={[styles.confLabel, { color: textTertiary }]}>{todo.confidence}%</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (scrolls with content) */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios-new" size={18} color={textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Your Tasks</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Stats Banner */}
        <Animated.View style={[styles.statsBanner, { opacity: fadeAnim }]}>
          <View style={[styles.statCard, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}20` }]}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{totalTasks}</Text>
            <Text style={[styles.statLbl, { color: textTertiary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B20' }]}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{totalPoints.toLocaleString()}</Text>
            <Text style={[styles.statLbl, { color: textTertiary }]}>Points</Text>
          </View>
          {highCount > 0 && (
            <View style={[styles.statCard, { backgroundColor: '#EF444410', borderColor: '#EF444420' }]}>
              <Text style={[styles.statNum, { color: '#EF4444' }]}>{highCount}</Text>
              <Text style={[styles.statLbl, { color: textTertiary }]}>Urgent</Text>
            </View>
          )}
        </Animated.View>

        {/* Content */}
        {groupedTasks.length === 0 ? (
          <Animated.View style={[styles.emptyState, {
            backgroundColor: cardBg, borderColor: cardBorder,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: `${theme.primary}10` }]}>
              <MaterialIcons name="check-circle-outline" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>All Clear</Text>
            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
              No active tasks. Add one from the home screen to get started.
            </Text>
          </Animated.View>
        ) : (
          groupedTasks.map((group) => {
            const section = getSectionIcon(group.dateKey);
            const activeTasks = group.tasks.filter(t => !t.completed);
            if (activeTasks.length === 0) return null;

            return (
              <View key={group.dateKey} style={styles.section}>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionLeft}>
                    <View style={[styles.sectionIconBg, { backgroundColor: section.color + '14' }]}>
                      <MaterialIcons name={section.icon} size={16} color={section.color} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>{group.label}</Text>
                  </View>
                  <View style={[styles.sectionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[styles.sectionBadgeText, { color: textTertiary }]}>{activeTasks.length}</Text>
                  </View>
                </View>

                {/* Task cards */}
                {activeTasks.map((todo, i) => renderTaskCard(todo, i))}
              </View>
            );
          })
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },

  // Stats banner
  statsBanner: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  // Sections
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconBg: {
    width: 30, height: 30, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700' },

  // Task card
  taskCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskAccent: { height: 3, width: '100%' },
  taskInner: { padding: 16 },

  taskTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, marginRight: 12, marginTop: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  checkInner: {
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  taskTextWrap: { flex: 1 },
  taskText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  deleteBtn: { padding: 6, marginLeft: 8, marginTop: -2 },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginLeft: 40 },
  tierChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  tierChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  pointsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  pointsChipText: { fontSize: 11, fontWeight: '700' },
  smartChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8,
  },
  smartChipText: { fontSize: 10, fontWeight: '700' },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8,
  },
  timeChipText: { fontSize: 10, fontWeight: '600' },

  // Insight
  insightRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 10, marginLeft: 40, padding: 10, borderRadius: 10,
  },
  insightText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '400' },

  // Confidence
  confidenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, marginLeft: 40,
  },
  confTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 2 },
  confLabel: { fontSize: 10, fontWeight: '700', width: 28, textAlign: 'right' },

  // Empty state
  emptyState: {
    marginHorizontal: 20, marginTop: 40,
    padding: 40, borderRadius: 24, borderWidth: 1,
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 72, height: 72, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '400' },
});

export default TasksOverviewScreen;
