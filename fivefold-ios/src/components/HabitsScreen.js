import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { hapticFeedback } from '../utils/haptics';
import {
  loadHabits,
  addHabit,
  deleteHabit,
  checkIn,
  isCheckedInToday,
  getWeekDots,
  getCompletionRate,
  resetStreak,
  HABIT_ICONS,
  HABIT_COLORS,
} from '../services/habitsService';
import notificationService from '../services/notificationService';
import TimePicker from './TimePicker';
import userStorage from '../utils/userStorage';
import AchievementService from '../services/achievementService';

const HabitsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [habits, setHabits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [checkingIn, setCheckingIn] = useState(null);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const floatingIdRef = useRef(0);

  const textPrimary = isDark ? '#FFFFFF' : theme.text;
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const textTertiary = isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const MAX_ANIM_CARDS = 10;
  const cardSlideAnims = useRef(Array.from({ length: MAX_ANIM_CARDS }, () => new Animated.Value(30))).current;
  const cardFadeAnims = useRef(Array.from({ length: MAX_ANIM_CARDS }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = cardSlideAnims.map((anim, i) =>
      Animated.parallel([
        Animated.timing(cardFadeAnims[i], {
          toValue: 1,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          delay: i * 80,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(0, anims).start();
  }, []);

  const refresh = useCallback(async () => {
    const h = await loadHabits();
    setHabits(h);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
      console.warn('[HabitsScreen] awardPoints error:', e?.message);
    }
  }, []);

  const handleCheckIn = async (habit) => {
    if (isCheckedInToday(habit) || checkingIn) return;
    setCheckingIn(habit.id);
    hapticFeedback.success();
    const pts = 15 + Math.floor(Math.random() * 16);
    showFloatingPts(pts, habit.color || '#4CAF50');
    awardPoints(pts);
    await checkIn(habit.id);
    await refresh();
    setTimeout(() => setCheckingIn(null), 600);
  };

  const handleDelete = (habit) => {
    Alert.alert('Delete Habit', `Remove "${habit.name}"? All streak data will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          hapticFeedback.medium();
          await deleteHabit(habit.id);
          try { await notificationService.cancelHabitReminder(habit.id); } catch (e) {}
          setSelectedHabit(null);
          refresh();
        },
      },
    ]);
  };

  const longestActiveStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);
  const totalCheckIns = habits.reduce((sum, h) => sum + (h.checkIns?.length || 0), 0);

  const renderHabitCard = (habit, index) => {
    const checked = isCheckedInToday(habit);
    const dots = getWeekDots(habit);
    const isAnimating = checkingIn === habit.id;
    const animIdx = Math.min(index + 1, MAX_ANIM_CARDS - 1);

    return (
      <Animated.View
        key={habit.id}
        style={[styles.habitCard, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow), opacity: cardFadeAnims[animIdx], transform: [{ translateY: cardSlideAnims[animIdx] }] }]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { hapticFeedback.light(); setSelectedHabit(habit); }}
          style={{ flex: 1 }}
        >
          {/* Header Row */}
          <View style={styles.habitHeader}>
            <View style={[styles.habitIconCircle, { backgroundColor: habit.color + '20' }]}>
              <MaterialIcons name={habit.icon || 'flag'} size={22} color={habit.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.habitName, { color: textPrimary }]} numberOfLines={1}>
                {habit.name}
              </Text>
              <View style={styles.streakRow}>
                <MaterialIcons name="local-fire-department" size={14} color="#FF6B35" />
                <Text style={[styles.streakText, { color: '#FF6B35' }]}>
                  Day {habit.currentStreak}
                </Text>
                {habit.longestStreak > 0 && (
                  <Text style={[styles.bestStreak, { color: textTertiary }]}>
                    best: {habit.longestStreak}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Weekly Dots */}
          <View style={styles.weekDotsRow}>
            {dots.map((dot) => (
              <View key={dot.date} style={styles.dotColumn}>
                <Text style={[styles.dotLabel, { color: textTertiary }]}>{dot.dayLabel}</Text>
                <View
                  style={[
                    styles.dot,
                    dot.checked && { backgroundColor: habit.color },
                    !dot.checked && !dot.isToday && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                    dot.isToday && !dot.checked && { borderWidth: 2, borderColor: habit.color, backgroundColor: 'transparent' },
                  ]}
                >
                  {dot.checked && <MaterialIcons name="check" size={10} color="#fff" />}
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Check-In Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleCheckIn(habit)}
          disabled={checked}
          style={{ marginTop: 14 }}
        >
          {checked ? (
            <View style={[styles.checkInDone, { backgroundColor: (habit.color || '#4CAF50') + '15' }]}>
              <MaterialIcons name="check-circle" size={18} color={habit.color} />
              <Text style={[styles.checkInDoneText, { color: habit.color }]}>Done for today</Text>
            </View>
          ) : (
            <LinearGradient
              colors={[habit.color || '#4CAF50', (habit.color || '#4CAF50') + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.checkInBtn, isAnimating && { transform: [{ scale: 1.03 }] }]}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.checkInBtnText}>Check In</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Streak lost indicator */}
        {habit.currentStreak === 0 && (habit.checkIns?.length || 0) > 0 && !checked && (
          <Text style={[styles.streakLostText, { color: '#ef4444' }]}>
            Streak lost — start again today!
          </Text>
        )}
      </Animated.View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedHabit) return null;
    const habit = habits.find((h) => h.id === selectedHabit.id) || selectedHabit;
    const rate = getCompletionRate(habit);
    const startDate = new Date(habit.createdAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
      <Modal
        visible={!!selectedHabit}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedHabit(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 16 : 8 }]}>
            <TouchableOpacity onPress={() => setSelectedHabit(null)}>
              <Text style={[styles.modalCancel, { color: textSecondary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>{habit.name}</Text>
            <TouchableOpacity onPress={() => handleDelete(habit)}>
              <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Icon + Streak Hero */}
            <View style={styles.detailHero}>
              <View style={[styles.detailIconCircle, { backgroundColor: habit.color + '20' }]}>
                <MaterialIcons name={habit.icon || 'flag'} size={40} color={habit.color} />
              </View>
              <View style={styles.detailStreakContainer}>
                <MaterialIcons name="local-fire-department" size={28} color="#FF6B35" />
                <Text style={[styles.detailStreakNumber, { color: textPrimary }]}>{habit.currentStreak}</Text>
                <Text style={[styles.detailStreakLabel, { color: textSecondary }]}>day streak</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={[styles.statsGrid, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
              {[
                { icon: 'local-fire-department', value: habit.currentStreak, label: 'Current', color: '#FF6B35' },
                { icon: 'emoji-events', value: habit.longestStreak, label: 'Best', color: '#F59E0B' },
                { icon: 'check-circle', value: habit.checkIns?.length || 0, label: 'Total Days', color: '#10B981' },
                { icon: 'percent', value: `${rate}%`, label: 'Rate', color: theme.primary },
              ].map((s) => (
                <View key={s.label} style={styles.statItem}>
                  <View style={[styles.statIconCircle, { backgroundColor: s.color + '14' }]}>
                    <MaterialIcons name={s.icon} size={18} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: textTertiary }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Start Date */}
            <View style={[styles.infoRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <MaterialIcons name="calendar-today" size={18} color={textSecondary} />
              <Text style={[styles.infoText, { color: textSecondary }]}>Started {startDate}</Text>
            </View>

            {/* Weekly Dots (larger) */}
            <View style={[styles.weekSection, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
              <Text style={[styles.weekSectionTitle, { color: textPrimary }]}>This Week</Text>
              <View style={styles.weekDotsLarge}>
                {getWeekDots(habit).map((dot) => (
                  <View key={dot.date} style={styles.dotColumnLarge}>
                    <Text style={[styles.dotLabelLarge, { color: textTertiary }]}>
                      {new Date(dot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <View
                      style={[
                        styles.dotLarge,
                        dot.checked && { backgroundColor: habit.color },
                        !dot.checked && !dot.isToday && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                        dot.isToday && !dot.checked && { borderWidth: 2, borderColor: habit.color, backgroundColor: 'transparent' },
                      ]}
                    >
                      {dot.checked && <MaterialIcons name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.dotDateText, { color: textTertiary }]}>
                      {new Date(dot.date + 'T12:00:00').getDate()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Check-In History (recent) */}
            <View style={[styles.historySection, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow) }]}>
              <Text style={[styles.weekSectionTitle, { color: textPrimary }]}>Recent Check-ins</Text>
              {(habit.checkIns?.length || 0) === 0 ? (
                <Text style={[styles.emptyHistoryText, { color: textTertiary }]}>
                  No check-ins yet — start today!
                </Text>
              ) : (
                [...(habit.checkIns || [])].sort().reverse().slice(0, 14).map((dateStr) => (
                  <View key={dateStr} style={styles.historyRow}>
                    <View style={[styles.historyDot, { backgroundColor: habit.color }]} />
                    <Text style={[styles.historyDate, { color: textPrimary }]}>
                      {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Reset Streak */}
            <TouchableOpacity
              style={styles.resetStreakBtn}
              onPress={() => {
                Alert.alert(
                  'Reset Streak',
                  `Reset the streak for "${habit.name}" back to Day 0? This cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: async () => {
                        hapticFeedback.warning();
                        await resetStreak(habit.id);
                        await refresh();
                        setSelectedHabit(null);
                      },
                    },
                  ]
                );
              }}
            >
              <MaterialIcons name="restart-alt" size={18} color="#ef4444" />
              <Text style={styles.resetStreakText}>Reset Streak</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Fixed back button */}
      <TouchableOpacity
        style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', position: 'absolute', top: insets.top + 8, left: 20, zIndex: 10 }]}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={22} color={textPrimary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Scrollable header */}
        <View style={[styles.screenHeader, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerBtn} />
          <Text style={[styles.screenTitle, { color: textPrimary }]}>Habits</Text>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => { hapticFeedback.light(); setShowAddModal(true); }}
          >
            <MaterialIcons name="add" size={22} color={textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        {habits.length > 0 && (
          <Animated.View style={[styles.statsBar, { backgroundColor: cardBg, borderColor: cardBorder, ...(!isDark && styles.cardShadow), opacity: cardFadeAnims[0], transform: [{ translateY: cardSlideAnims[0] }] }]}>
            {[
              { icon: 'repeat', value: habits.length, label: 'Active', color: theme.primary },
              { icon: 'local-fire-department', value: longestActiveStreak, label: 'Top Streak', color: '#FF6B35' },
              { icon: 'check-circle', value: totalCheckIns, label: 'Check-ins', color: '#10B981' },
            ].map((s) => (
              <View key={s.label} style={styles.statsBarItem}>
                <View style={[styles.statsBarIcon, { backgroundColor: s.color + '14' }]}>
                  <MaterialIcons name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={[styles.statsBarValue, { color: textPrimary }]}>{s.value}</Text>
                <Text style={[styles.statsBarLabel, { color: textTertiary }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Habits List */}
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC' }]}>
              <MaterialIcons name="flag" size={32} color={textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: textSecondary }]}>No habits yet</Text>
            <Text style={[styles.emptySubtitle, { color: textTertiary }]}>
              Start tracking a habit you want to build or break
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => { hapticFeedback.light(); setShowAddModal(true); }}
            >
              <MaterialIcons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add Your First Habit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          habits.map((habit, index) => renderHabitCard(habit, index))
        )}

      </ScrollView>

      {/* Emergency Button — fixed at bottom */}
      {habits.length > 0 && (
        <View style={[styles.emergencyWrapper, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              hapticFeedback.medium();
              navigation.navigate('PanicButton');
            }}
          >
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.panicButton}
            >
              <MaterialIcons name="warning" size={22} color="#FFFFFF" />
              <Text style={styles.panicButtonText}>Emergency</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Habit Modal */}
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

      <AddHabitModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={async (data) => {
          const newHabit = await addHabit(data);
          try { await notificationService.scheduleHabitReminder(newHabit); } catch (e) {}
          refresh();
          setShowAddModal(false);
        }}
        theme={theme}
        isDark={isDark}
      />

      {/* Habit Detail Modal */}
      {renderDetailModal()}
    </View>
  );
};

// ── Add Habit Modal ──────────────────────────────────────────────────

const AddHabitModal = ({ visible, onClose, onAdd, theme, isDark }) => {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('flag');
  const [selectedColor, setSelectedColor] = useState('#4CAF50');
  const [reminderHour, setReminderHour] = useState(22);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const textColor = isDark ? '#fff' : '#111';
  const secondaryColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  useEffect(() => {
    if (visible) {
      setName('');
      setSelectedIcon('flag');
      setSelectedColor('#4CAF50');
      setReminderHour(22);
      setReminderMinute(0);
      setShowTimePicker(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    hapticFeedback.success();
    onAdd({
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      reminderTime: `${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`,
    });
  };

  const formatTime = () => {
    const h = reminderHour % 12 || 12;
    const ampm = reminderHour >= 12 ? 'PM' : 'AM';
    return `${h}:${String(reminderMinute).padStart(2, '0')} ${ampm}`;
  };

  const handleTimeSelected = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    setReminderHour(h);
    setReminderMinute(m);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: isDark ? '#111' : '#fff' }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalCancel, { color: secondaryColor }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>New Habit</Text>
            <TouchableOpacity onPress={handleSave} disabled={!name.trim()}>
              <Text style={[styles.modalSave, { color: name.trim() ? theme.primary : secondaryColor }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name Input */}
            <Text style={[styles.modalLabel, { color: secondaryColor }]}>WHAT HABIT ARE YOU BUILDING?</Text>
            <TextInput
              style={[styles.modalInput, {
                color: textColor,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }]}
              placeholder='e.g. "Stop Smoking", "Read 30 mins", "No Sugar"'
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoFocus
            />

            {/* Icon Picker */}
            <Text style={[styles.modalLabel, { color: secondaryColor, marginTop: 24 }]}>ICON</Text>
            <View style={styles.iconGrid}>
              {HABIT_ICONS.map((ic) => {
                const isSelected = selectedIcon === ic.name;
                return (
                  <TouchableOpacity
                    key={ic.name}
                    onPress={() => { hapticFeedback.light(); setSelectedIcon(ic.name); }}
                    style={[
                      styles.iconChip,
                      {
                        backgroundColor: isSelected ? selectedColor + '20' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
                        borderColor: isSelected ? selectedColor : 'transparent',
                      },
                    ]}
                  >
                    <MaterialIcons name={ic.name} size={22} color={isSelected ? selectedColor : secondaryColor} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Color Picker */}
            <Text style={[styles.modalLabel, { color: secondaryColor, marginTop: 24 }]}>COLOUR</Text>
            <View style={styles.colorGrid}>
              {HABIT_COLORS.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => { hapticFeedback.light(); setSelectedColor(c); }}
                    style={[styles.colorChip, { backgroundColor: c, borderColor: isSelected ? textColor : 'transparent' }]}
                  >
                    {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reminder Time */}
            <Text style={[styles.modalLabel, { color: secondaryColor, marginTop: 24 }]}>DAILY REMINDER</Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={[styles.timePickerBtn, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }]}
            >
              <MaterialIcons name="notifications-active" size={20} color={theme.primary} />
              <Text style={[styles.timePickerText, { color: textColor }]}>{formatTime()}</Text>
              <Text style={[styles.timePickerHint, { color: secondaryColor }]}>Tap to change</Text>
            </TouchableOpacity>
          </ScrollView>

          <TimePicker
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            onTimeSelected={handleTimeSelected}
            currentTime={`${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`}
            title="Reminder Time"
            subtitle="When should we remind you?"
            presets={[
              { time: '06:00', label: 'Morning', desc: '6:00 AM' },
              { time: '07:30', label: 'Breakfast', desc: '7:30 AM' },
              { time: '12:00', label: 'Lunch', desc: '12:00 PM' },
              { time: '15:00', label: 'Afternoon', desc: '3:00 PM' },
              { time: '18:00', label: 'Evening', desc: '6:00 PM' },
              { time: '20:00', label: 'Night', desc: '8:00 PM' },
              { time: '21:00', label: 'Bedtime', desc: '9:00 PM' },
              { time: '22:00', label: 'Late Night', desc: '10:00 PM' },
            ]}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  statsBarItem: { alignItems: 'center', gap: 4 },
  statsBarIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBarValue: { fontSize: 20, fontWeight: '800' },
  statsBarLabel: { fontSize: 11, fontWeight: '500' },

  // Habit card
  habitCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bestStreak: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
  },

  // Weekly dots
  weekDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  dotColumn: { alignItems: 'center', gap: 4 },
  dotLabel: { fontSize: 10, fontWeight: '600' },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Check-in button
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  checkInBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  checkInDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  checkInDoneText: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakLostText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    gap: 8,
    marginTop: 16,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  // Detail modal
  detailHero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  detailIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailStreakNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  detailStreakLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  infoText: { fontSize: 14, fontWeight: '500' },

  weekSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  weekSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  weekDotsLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotColumnLarge: { alignItems: 'center', gap: 6 },
  dotLabelLarge: { fontSize: 11, fontWeight: '600' },
  dotLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDateText: { fontSize: 10, fontWeight: '500' },

  historySection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  emptyHistoryText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  resetStreakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  resetStreakText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40 },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
  },

  // Icon picker
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Color picker
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Time picker
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  timePickerText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timePickerHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  emergencyWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  panicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  panicButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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

export default HabitsScreen;
