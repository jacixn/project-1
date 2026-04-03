import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  loadReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  completeReminder,
  uncompleteReminder,
  getRemindersForDay,
  formatTime,
  DAY_NAMES,
  DAY_SHORT,
} from '../services/reminderService';
import CreateReminderModal from './CreateReminderModal';
import userStorage from '../utils/userStorage';
import AchievementService from '../services/achievementService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const todayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDateForDayOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

const getDateStr = (offset) => {
  const d = getDateForDayOffset(offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DAY_RANGE = 14;

const RemindersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const flatListRef = useRef(null);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const floatingIdRef = useRef(0);

  const textPrimary = isDark ? '#FFFFFF' : theme.text;
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const refresh = useCallback(async () => {
    const data = await loadReminders();
    setReminders(data);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refresh);
    return unsubscribe;
  }, [navigation, refresh]);

  const handleSave = async (data) => {
    if (editingReminder) {
      await updateReminder(editingReminder.id, data);
    } else {
      await addReminder(data);
    }
    await refresh();
    setEditingReminder(null);
  };

  const showFloatingPts = useCallback((points, color) => {
    const id = ++floatingIdRef.current;
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const scale = new Animated.Value(0.5);
    setFloatingPoints(prev => [...prev, { id, points, color, opacity, translateY, scale }]);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 1200, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => setFloatingPoints(prev => prev.filter(f => f.id !== id)));
  }, []);

  const awardPoints = useCallback(async (pts) => {
    try {
      const raw = await userStorage.getRaw('userStats');
      const stats = raw ? JSON.parse(raw) : {};
      const oldTotal = stats.totalPoints || stats.points || 0;
      const updated = {
        ...stats,
        totalPoints: oldTotal + pts,
        points: oldTotal + pts,
        level: AchievementService.getLevelFromPoints(oldTotal + pts),
      };
      await userStorage.setRaw('userStats', JSON.stringify(updated));
    } catch (e) {
      console.warn('[RemindersScreen] awardPoints error:', e?.message);
    }
  }, []);

  const handleToggleComplete = async (reminder, dateStr) => {
    hapticFeedback.success();
    const isCompleted = reminder.completions?.[dateStr];
    if (isCompleted) {
      await uncompleteReminder(reminder.id, dateStr);
    } else {
      const pts = 10 + Math.floor(Math.random() * 11);
      showFloatingPts(pts, reminder.color || theme.primary);
      awardPoints(pts);
      await completeReminder(reminder.id, dateStr);
    }
    await refresh();
  };

  const dayPages = Array.from({ length: DAY_RANGE }, (_, i) => i);

  const renderDayPage = ({ item: offset }) => {
    const date = getDateForDayOffset(offset);
    const dayIndex = date.getDay();
    const dayName = DAY_NAMES[dayIndex];
    const dateStr = getDateStr(offset);
    const isToday = offset === 0;
    const dayReminders = getRemindersForDay(reminders, dayIndex, dateStr);
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <View style={[styles.dayPage, { width: SCREEN_WIDTH }]}>
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <Text style={[styles.dayName, { color: isToday ? '#10B981' : theme.primary }]}>
            {isToday ? 'Today' : dayName}
          </Text>
          <Text style={[styles.dayDate, { color: isToday ? textSecondary : theme.textTertiary || textSecondary }]}>
            {isToday ? `${dayName}, ${monthDay}` : monthDay}
          </Text>
          {!isToday && (
            <View style={[styles.notTodayBadge, { backgroundColor: (theme.primary || '#3B82F6') + '15' }]}>
              <Text style={[styles.notTodayText, { color: theme.primary }]}>
                {offset === 1 ? 'Tomorrow' : `In ${offset} days`}
              </Text>
            </View>
          )}
        </View>

        {/* Timeline */}
        {dayReminders.length === 0 ? (
          <View style={styles.emptyDay}>
            <MaterialIcons name="wb-sunny" size={48} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>No reminders for this day</Text>
            <TouchableOpacity
              onPress={() => { hapticFeedback.light(); setEditingReminder(null); setShowCreate(true); }}
              style={[styles.emptyAddBtn, { borderColor: theme.primary }]}
            >
              <MaterialIcons name="add" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timeline}>
            {dayReminders.map((reminder, idx) => {
              const isCompleted = reminder.completions?.[dateStr];
              const isLast = idx === dayReminders.length - 1;
              const rColor = reminder.color || '#3B82F6';
              return (
                <View key={reminder.id} style={styles.timelineItem}>
                  {/* Timeline Track */}
                  <View style={styles.timelineTrack}>
                    <View style={[styles.timelineDot, { backgroundColor: isCompleted ? rColor : cardBg, borderColor: isCompleted ? rColor : rColor + '50' }]}>
                      {isCompleted ? (
                        <MaterialIcons name="check" size={10} color="#fff" />
                      ) : (
                        <View style={[styles.timelineDotInner, { backgroundColor: rColor }]} />
                      )}
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                    )}
                  </View>

                  {/* Card */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleToggleComplete(reminder, dateStr)}
                    onLongPress={() => {
                      hapticFeedback.medium();
                      Alert.alert(reminder.title, null, [
                        { text: 'Edit', onPress: () => { setEditingReminder(reminder); setShowCreate(true); } },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            await deleteReminder(reminder.id);
                            await refresh();
                          },
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ]);
                    }}
                    style={[
                      styles.reminderCard,
                      {
                        backgroundColor: isCompleted
                          ? (isDark ? rColor + '10' : rColor + '08')
                          : cardBg,
                        borderColor: cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.cardTopRow}>
                      <MaterialIcons name={reminder.icon || 'notifications'} size={16} color={rColor} />
                      <Text style={[styles.cardTime, { color: rColor }]}>
                        {formatTime(reminder.time)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.reminderTitle,
                        { color: isDark ? '#FFFFFF' : '#1a1a1a' },
                        isCompleted && { textDecorationLine: 'line-through', opacity: 0.4 },
                      ]}
                      numberOfLines={1}
                    >
                      {reminder.title}
                    </Text>
                    <Text style={[styles.reminderMeta, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>
                      {reminder.type === 'recurring'
                        ? (reminder.days || []).length === 7
                          ? 'Every day'
                          : (reminder.days || []).map(d => DAY_SHORT[d]).join(', ')
                        : 'One-time'}
                    </Text>
                    {isCompleted ? (
                      <View style={[styles.checkDone, { backgroundColor: rColor }]}>
                        <MaterialIcons name="check" size={14} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.checkEmpty, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back-ios" size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Reminders</Text>
        <TouchableOpacity
          onPress={() => { hapticFeedback.light(); setEditingReminder(null); setShowCreate(true); }}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Day Indicator Dots */}
      <View style={styles.dayIndicator}>
        {dayPages.slice(0, 7).map((offset) => {
          const d = getDateForDayOffset(offset);
          const isToday = offset === 0;
          const dayLetter = DAY_SHORT[d.getDay()].charAt(0);
          return (
            <TouchableOpacity
              key={offset}
              onPress={() => {
                hapticFeedback.light();
                flatListRef.current?.scrollToOffset({ offset: offset * SCREEN_WIDTH, animated: true });
              }}
              style={styles.dayIndicatorItem}
            >
              <Text style={[styles.dayIndicatorLetter, { color: isToday ? '#10B981' : textSecondary }]}>
                {dayLetter}
              </Text>
              <View style={[
                styles.dayIndicatorDot,
                { backgroundColor: isToday ? '#10B981' : 'transparent' },
              ]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horizontal Day Pager */}
      <FlatList
        ref={flatListRef}
        data={dayPages}
        keyExtractor={(item) => String(item)}
        renderItem={renderDayPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={0}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
      />

      {floatingPoints.map(fp => (
        <Animated.Text
          key={fp.id}
          pointerEvents="none"
          style={[styles.floatingPts, {
            color: fp.color,
            opacity: fp.opacity,
            transform: [{ translateY: fp.translateY }, { scale: fp.scale }],
          }]}
        >
          +{fp.points} pts
        </Animated.Text>
      ))}

      <CreateReminderModal
        visible={showCreate}
        onClose={() => { setShowCreate(false); setEditingReminder(null); }}
        onSave={handleSave}
        editingReminder={editingReminder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dayIndicatorItem: { alignItems: 'center', gap: 4 },
  dayIndicatorLetter: { fontSize: 13, fontWeight: '600' },
  dayIndicatorDot: { width: 5, height: 5, borderRadius: 2.5 },
  dayPage: { flex: 1, paddingHorizontal: 20 },
  dayHeader: { marginBottom: 24, marginTop: 8 },
  dayName: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  dayDate: { fontSize: 15, marginTop: 2 },
  notTodayBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 6 },
  notTodayText: { fontSize: 12, fontWeight: '600' },
  emptyDay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyText: { fontSize: 16 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 8,
  },
  timeline: { paddingBottom: 40 },
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineTrack: { width: 20, alignItems: 'center', marginRight: 12 },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  timelineDotInner: { width: 6, height: 6, borderRadius: 3 },
  timelineLine: { width: 1.5, flex: 1, marginTop: 6, marginBottom: -6, borderRadius: 1 },
  reminderCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardTime: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  reminderTitle: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  reminderMeta: { fontSize: 13, marginTop: 1 },
  checkDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  checkEmpty: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  floatingPts: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    fontSize: 28,
    fontWeight: '800',
    zIndex: 999,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default RemindersScreen;
