import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  DeviceEventEmitter,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  loadReminders,
  deleteReminder,
  completeReminder,
  uncompleteReminder,
  getRemindersForDay,
  formatTime,
  DAY_NAMES,
  DAY_SHORT,
} from '../services/reminderService';
import { formatDurationShort } from '../utils/duration';
import userStorage from '../utils/userStorage';
import AchievementService from '../services/achievementService';
import { awardOnce, reminderKey, blockKey } from '../services/pointsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getDateForDayOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

const getDateStr = (offset) => {
  const d = getDateForDayOffset(offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Day pages run from two weeks back to four weeks ahead; offset 0 = today.
// The pager index for an offset is offset + PAST_DAYS.
const PAST_DAYS = 14;
const FUTURE_DAYS = 28; // both multiples of 7, so week windows tile the range exactly
const DAY_OFFSETS = Array.from({ length: PAST_DAYS + FUTURE_DAYS }, (_, i) => i - PAST_DAYS);
const MIN_WEEK = -PAST_DAYS;
const MAX_WEEK = FUTURE_DAYS - 7;
const weekStartOf = (offset) => Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.floor(offset / 7) * 7));

const RemindersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState([]);
  // Day template blocks that ring (Eat dinner at 7 on a Work Remote day): shown with the reminders, by date.
  const [blocksByDate, setBlocksByDate] = useState({});
  const [activePage, setActivePage] = useState(0);
  const flatListRef = useRef(null);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const floatingIdRef = useRef(0);

  const textPrimary = isDark ? '#FFFFFF' : theme.text;
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const refresh = useCallback(async () => {
    // Templates and plan are read once; the per-day split is pure.
    let data = [];
    try {
      const { getTemplates, getPlan } = require('../services/dayTemplates');
      const { blocksForDay } = require('../utils/dayTemplates');
      const [templates, plan, list] = await Promise.all([getTemplates(), getPlan(), loadReminders()]);
      data = list;
      const map = {};
      for (const i of DAY_OFFSETS) {
        const d = getDateForDayOffset(i);
        const blocks = blocksForDay(templates, plan, getDateStr(i), d.getDay()).filter((b) => b.notify && !b.source && b.overnight !== 'am');
        if (blocks.length) map[getDateStr(i)] = blocks;
      }
      setBlocksByDate(map);
    } catch {
      try { data = await loadReminders(); } catch {}
    }
    setReminders(data);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('dayPlanChanged', refresh);
    const unsubscribe = navigation.addListener('focus', refresh);
    return () => { sub.remove(); unsubscribe(); };
  }, [navigation, refresh]);

  // Open the schedule wizard (native modal screen); pass an existing reminder to edit.
  const openSchedule = (editingReminder) => {
    hapticFeedback.light();
    navigation.navigate('ScheduleReminder', editingReminder ? { editingReminder } : undefined);
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

  // Awarding goes through services/pointsService so the points reach the
  // season and the cloud, not just the local total, and so that ticking the
  // same thing twice in a day cannot pay twice.
  const award = useCallback(async (key, color) => {
    const pts = await awardOnce(key);
    if (pts > 0) showFloatingPts(pts, color);
  }, [showFloatingPts]);

  const handleToggleComplete = async (reminder, dateStr) => {
    hapticFeedback.success();
    const isCompleted = reminder.completions?.[dateStr];
    if (isCompleted) {
      await uncompleteReminder(reminder.id, dateStr);
    } else {
      await completeReminder(reminder.id, dateStr);
      await award(reminderKey(reminder.id, dateStr), reminder.color || theme.primary);
    }
    await refresh();
  };

  const dayPages = DAY_OFFSETS;

  const renderDayPage = ({ item: offset }) => {
    const date = getDateForDayOffset(offset);
    const dayIndex = date.getDay();
    const dayName = DAY_NAMES[dayIndex];
    const dateStr = getDateStr(offset);
    const isToday = offset === 0;
    const blockRows = (blocksByDate[dateStr] || []).map((b) => ({
      id: `block:${dateStr}:${b.blockId}`,
      title: b.title,
      time: `${String(Math.floor(b.startMin / 60)).padStart(2, '0')}:${String(b.startMin % 60).padStart(2, '0')}`,
      duration: b.endMin - b.startMin,
      icon: b.icon || 'schedule',
      color: '#5AC8FA',
      isBlock: true,
      blockId: b.blockId,
      templateId: b.templateId,
      templateName: b.templateName,
      completions: b.done ? { [dateStr]: true } : {},
    }));
    const dayReminders = [...getRemindersForDay(reminders, dayIndex, dateStr), ...blockRows]
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
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
                {offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : offset > 0 ? `In ${offset} days` : `${-offset} days ago`}
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
              onPress={() => openSchedule()}
              style={[styles.emptyAddBtn, { borderColor: theme.primary }]}
            >
              <MaterialIcons name="add" size={18} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.timeline, { paddingBottom: 140 }]}
            showsVerticalScrollIndicator={false}
          >
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
                    onPress={async () => {
                      if (reminder.isBlock) {
                        const done = !reminder.completions?.[dateStr];
                        if (done) hapticFeedback.success(); else hapticFeedback.light();
                        try { await require('../services/dayTemplates').setBlockDone(dateStr, reminder.blockId, done); } catch {}
                        // A block off a day template is a thing you finished,
                        // exactly like a reminder, so it pays the same.
                        if (done) await award(blockKey(reminder.blockId, dateStr), reminder.color || '#5AC8FA');
                        await refresh();
                        return;
                      }
                      handleToggleComplete(reminder, dateStr);
                    }}
                    onLongPress={() => {
                      hapticFeedback.medium();
                      if (reminder.isBlock) { navigation.navigate('DayTemplates', { editId: reminder.templateId }); return; }
                      Alert.alert(reminder.title, null, [
                        { text: 'Edit', onPress: () => openSchedule(reminder) },
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
                      {reminder.duration ? (
                        <View style={[styles.durPill, { backgroundColor: rColor + '18' }]}>
                          <Text style={[styles.durPillText, { color: rColor }]}>{formatDurationShort(reminder.duration)}</Text>
                        </View>
                      ) : null}
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
                      {reminder.isBlock
                        ? `Day plan · ${reminder.templateName}`
                        : reminder.type === 'recurring'
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
          </ScrollView>
        )}
      </View>
    );
  };

  const iconBtnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const goToPage = (offset) => {
    hapticFeedback.light();
    setActivePage(offset);
    flatListRef.current?.scrollToOffset({ offset: (offset + PAST_DAYS) * SCREEN_WIDTH, animated: true });
  };

  // The week strip shows 7 days from weekStart (0 = today's week). Swiping it
  // moves a week; paging the days past its edge drags it along.
  const [weekStart, setWeekStart] = useState(0);
  useEffect(() => {
    if (activePage < weekStart || activePage > weekStart + 6) setWeekStart(weekStartOf(activePage));
  }, [activePage]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i);
  const shiftWeek = (dir) => {
    const next = weekStart + dir * 7;
    if (next < MIN_WEEK || next > MAX_WEEK) return;
    hapticFeedback.light();
    setWeekStart(next);
    // Same weekday, one week over (clamped to the pages that exist).
    const target = Math.min(FUTURE_DAYS - 1, Math.max(-PAST_DAYS, activePage + dir * 7));
    setActivePage(target);
    flatListRef.current?.scrollToOffset({ offset: (target + PAST_DAYS) * SCREEN_WIDTH, animated: false });
  };
  // Follows the finger, then the old week slides out and the new one springs in.
  const stripX = useSharedValue(0);
  const stripO = useSharedValue(1);
  const goWeek = (dir) => {
    const next = weekStart + dir * 7;
    if (next < MIN_WEEK || next > MAX_WEEK) { stripX.value = withSpring(0, { damping: 18, stiffness: 200 }); stripO.value = withTiming(1, { duration: 120 }); return; }
    const w = SCREEN_WIDTH;
    stripX.value = withTiming(-dir * w * 0.6, { duration: 140, easing: Easing.in(Easing.cubic) }, (done) => {
      // A new touch mid-slide cancels this; bring the strip back to full.
      if (!done) { stripO.value = withTiming(1, { duration: 120 }); return; }
      runOnJS(shiftWeek)(dir);
      stripX.value = dir * w * 0.5;
      stripO.value = 0.2;
      stripX.value = withSpring(0, { damping: 18, stiffness: 180 });
      stripO.value = withTiming(1, { duration: 220 });
    });
    stripO.value = withTiming(0.3, { duration: 140 });
  };
  const weekSwipe = useMemo(() => Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .runOnJS(true)
    .onUpdate((e) => { stripX.value = e.translationX * 0.55; })
    .onEnd((e) => {
      if (e.translationX < -50 || e.velocityX < -500) goWeek(1);
      else if (e.translationX > 50 || e.velocityX > 500) goWeek(-1);
      else { stripX.value = withSpring(0, { damping: 18, stiffness: 200 }); stripO.value = withTiming(1, { duration: 120 }); }
    }), [weekStart, activePage]); // eslint-disable-line react-hooks/exhaustive-deps
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: stripX.value }], opacity: stripO.value }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top bar: back (left) · title (centered in the middle band) · actions
          (right). Title takes the flexible middle so it centers between the two
          control clusters and never overlaps a button. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: iconBtnBg }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: textPrimary }]} numberOfLines={1}>Reminders</Text>

        <View style={styles.actionCluster}>
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); navigation.navigate('MyWeek'); }}
            style={[styles.iconBtn, { backgroundColor: iconBtnBg }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="My Week"
          >
            <MaterialIcons name="calendar-month" size={20} color={textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); navigation.navigate('ReminderLibrary'); }}
            style={[styles.iconBtn, { backgroundColor: iconBtnBg }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="bookmarks" size={19} color={textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); navigation.navigate('AllReminders'); }}
            style={[styles.iconBtn, { backgroundColor: iconBtnBg }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="format-list-bulleted" size={20} color={textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openSchedule()}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Week strip: weekday + date, active day underlined, today in green.
          Swipe it left/right for the next/previous week. */}
      <GestureHandlerRootView style={{ flex: 0 }}>
        <GestureDetector gesture={weekSwipe}>
          <Reanimated.View style={[styles.weekStrip, stripStyle]}>
            {weekDays.map((offset) => {
              const d = getDateForDayOffset(offset);
              const isToday = offset === 0;
              const isActive = offset === activePage;
              const activeColor = isToday ? '#10B981' : theme.primary;
              const numColor = isActive ? activeColor : (isToday ? '#10B981' : textSecondary);
              return (
                <TouchableOpacity
                  key={offset}
                  onPress={() => goToPage(offset)}
                  style={styles.weekItem}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={d.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
                >
                  <Text style={[styles.weekLetter, { color: isToday ? '#10B981' : textSecondary }]}>
                    {DAY_SHORT[d.getDay()].charAt(0)}
                  </Text>
                  <Text style={[styles.weekNum, { color: numColor, fontWeight: isActive ? '800' : '600' }]}>
                    {d.getDate()}
                  </Text>
                  <View style={[styles.weekBar, { backgroundColor: isActive ? activeColor : 'transparent' }]} />
                </TouchableOpacity>
              );
            })}
          </Reanimated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Horizontal Day Pager */}
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={dayPages}
        keyExtractor={(item) => String(item)}
        renderItem={renderDayPage}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={PAST_DAYS}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setActivePage(page - PAST_DAYS);
        }}
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

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Top bar (Reminders screen)
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 10,
  },
  topBarTitle: { flex: 1, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  actionCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  // Week strip
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  weekItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  weekLetter: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  weekNum: { fontSize: 16, marginTop: 3, fontVariant: ['tabular-nums'] },
  weekBar: { width: 16, height: 3, borderRadius: 1.5, marginTop: 5 },
  // Shared header (used by the "All reminders" modal)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  allIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allTitle: { fontSize: 15, fontWeight: '600' },
  allMeta: { fontSize: 12, marginTop: 2 },
  allActionBtn: { padding: 6 },
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
  durPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  durPillText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
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
