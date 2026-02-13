/**
 * WorkoutSplitModal
 *
 * Lets users configure their weekly workout split:
 * - Pick training days vs rest days
 * - Choose muscle groups per day (presets + individual muscles)
 * - Set exercise count per day
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import WorkoutService from '../services/workoutService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Preset definitions ───
const PRESETS = [
  { key: 'push', label: 'Push', icon: 'fitness-center', muscles: ['chest', 'frontDelts', 'sideDelts', 'triceps'] },
  { key: 'pull', label: 'Pull', icon: 'fitness-center', muscles: ['lats', 'upperBack', 'rearDelts', 'biceps', 'forearms'] },
  { key: 'legs', label: 'Legs', icon: 'directions-run', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { key: 'upper', label: 'Upper', icon: 'accessibility-new', muscles: ['chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts', 'biceps', 'triceps'] },
  { key: 'lower', label: 'Lower', icon: 'directions-walk', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'lowerBack'] },
  { key: 'fullBody', label: 'Full Body', icon: 'person', muscles: ['chest', 'lats', 'upperBack', 'frontDelts', 'sideDelts', 'rearDelts', 'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques', 'lowerBack'] },
  { key: 'core', label: 'Core', icon: 'self-improvement', muscles: ['abs', 'obliques', 'lowerBack'] },
];

// ─── Individual muscle chips ───
const MUSCLE_CHIPS = [
  { key: 'chest', label: 'Chest' },
  { key: 'lats', label: 'Back' },
  { key: 'frontDelts', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'calves', label: 'Calves' },
  { key: 'abs', label: 'Abs' },
  { key: 'obliques', label: 'Obliques' },
  { key: 'lowerBack', label: 'Lower Back' },
  { key: 'traps', label: 'Traps' },
  { key: 'upperBack', label: 'Upper Back' },
  { key: 'sideDelts', label: 'Side Delts' },
  { key: 'rearDelts', label: 'Rear Delts' },
];

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };
const DAY_SHORT = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

const DEFAULT_DAY = { active: false, muscles: [], presets: [], exerciseCount: 4 };

const WorkoutSplitModal = ({ visible, onClose, onSave }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [plan, setPlan] = useState({});
  const [expandedDay, setExpandedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load existing plan on open
  useEffect(() => {
    if (visible) {
      loadPlan();
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setExpandedDay(null);
    }
  }, [visible]);

  const loadPlan = async () => {
    setLoading(true);
    const existing = await WorkoutService.getSplitPlan();
    if (existing) {
      setPlan(existing);
    } else {
      // Default: empty plan, all rest days
      const empty = {};
      DAY_KEYS.forEach(day => { empty[day] = { ...DEFAULT_DAY }; });
      setPlan(empty);
    }
    setLoading(false);
  };

  const getDayConfig = (day) => plan[day] || { ...DEFAULT_DAY };

  const toggleDayActive = (day) => {
    hapticFeedback.light();
    const current = getDayConfig(day);
    const newPlan = { ...plan };
    if (current.active) {
      // Deactivate (make rest day)
      newPlan[day] = { ...DEFAULT_DAY };
      if (expandedDay === day) setExpandedDay(null);
    } else {
      // Activate
      newPlan[day] = { active: true, muscles: [], presets: [], exerciseCount: 4 };
      setExpandedDay(day);
    }
    setPlan(newPlan);
  };

  const toggleExpandDay = (day) => {
    const current = getDayConfig(day);
    if (!current.active) {
      toggleDayActive(day);
      return;
    }
    hapticFeedback.light();
    setExpandedDay(expandedDay === day ? null : day);
  };

  const togglePreset = (day, presetKey) => {
    hapticFeedback.light();
    const current = getDayConfig(day);
    const newPlan = { ...plan };
    const currentPresets = [...(current.presets || [])];
    const preset = PRESETS.find(p => p.key === presetKey);
    if (!preset) return;

    let newMuscles = [...(current.muscles || [])];

    if (currentPresets.includes(presetKey)) {
      // Remove preset and its muscles (unless kept by another preset or manual pick)
      const newPresets = currentPresets.filter(p => p !== presetKey);
      // Rebuild muscles from remaining presets
      const musclesFromRemainingPresets = new Set();
      newPresets.forEach(pk => {
        const p = PRESETS.find(x => x.key === pk);
        if (p) p.muscles.forEach(m => musclesFromRemainingPresets.add(m));
      });
      // Keep manually-added muscles that aren't part of any preset
      newMuscles = newMuscles.filter(m => musclesFromRemainingPresets.has(m));
      newPlan[day] = { ...current, presets: newPresets, muscles: newMuscles };
    } else {
      // Add preset and its muscles
      currentPresets.push(presetKey);
      preset.muscles.forEach(m => {
        if (!newMuscles.includes(m)) newMuscles.push(m);
      });
      newPlan[day] = { ...current, presets: currentPresets, muscles: newMuscles };
    }

    setPlan(newPlan);
  };

  const toggleMuscle = (day, muscleKey) => {
    hapticFeedback.light();
    const current = getDayConfig(day);
    const newPlan = { ...plan };
    let newMuscles = [...(current.muscles || [])];

    if (newMuscles.includes(muscleKey)) {
      newMuscles = newMuscles.filter(m => m !== muscleKey);
      // Also remove any preset that included this muscle (since it's now incomplete)
      const newPresets = (current.presets || []).filter(pk => {
        const p = PRESETS.find(x => x.key === pk);
        return p && p.muscles.every(m => m === muscleKey ? false : newMuscles.includes(m));
      });
      newPlan[day] = { ...current, muscles: newMuscles, presets: newPresets };
    } else {
      newMuscles.push(muscleKey);
      newPlan[day] = { ...current, muscles: newMuscles };
    }

    setPlan(newPlan);
  };

  const setExerciseCount = (day, count) => {
    hapticFeedback.light();
    const current = getDayConfig(day);
    const newPlan = { ...plan };
    newPlan[day] = { ...current, exerciseCount: count };
    setPlan(newPlan);
  };

  const handleSave = async () => {
    hapticFeedback.success();
    await WorkoutService.saveSplitPlan(plan);
    if (onSave) onSave(plan);
    onClose();
  };

  const activeDayCount = DAY_KEYS.filter(d => getDayConfig(d).active).length;

  // Colors
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const chipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const renderDayCard = (day) => {
    const config = getDayConfig(day);
    const isExpanded = expandedDay === day;
    const isActive = config.active;
    const muscleCount = (config.muscles || []).length;

    // Get today's day key
    const todayIndex = new Date().getDay();
    const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][todayIndex];
    const isToday = day === todayKey;

    return (
      <Animated.View
        key={day}
        style={[
          styles.dayCard,
          {
            backgroundColor: cardBg,
            borderColor: isToday ? theme.primary + '40' : cardBorder,
            borderWidth: isToday ? 1.5 : 1,
          },
        ]}
      >
        {/* Day header */}
        <TouchableOpacity
          style={styles.dayHeader}
          onPress={() => toggleExpandDay(day)}
          activeOpacity={0.7}
        >
          <View style={styles.dayHeaderLeft}>
            <TouchableOpacity
              onPress={() => toggleDayActive(day)}
              style={[
                styles.dayToggle,
                {
                  backgroundColor: isActive ? theme.primary : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  borderColor: isActive ? theme.primary : chipBorder,
                },
              ]}
              activeOpacity={0.7}
            >
              {isActive ? (
                <MaterialIcons name="check" size={14} color="#FFF" />
              ) : (
                <MaterialIcons name="hotel" size={14} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} />
              )}
            </TouchableOpacity>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.dayName, { color: isActive ? theme.text : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)') }]}>
                  {DAY_LABELS[day]}
                </Text>
                {isToday && (
                  <View style={[styles.todayBadge, { backgroundColor: theme.primary + '18' }]}>
                    <Text style={[styles.todayBadgeText, { color: theme.primary }]}>Today</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.daySummary, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                {isActive
                  ? muscleCount > 0
                    ? `${muscleCount} muscle${muscleCount !== 1 ? 's' : ''} · ${config.exerciseCount} exercises`
                    : 'Tap to configure'
                  : 'Rest day'}
              </Text>
            </View>
          </View>
          {isActive && (
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={22}
              color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
            />
          )}
        </TouchableOpacity>

        {/* Muscle preview chips (when collapsed but active with muscles) */}
        {isActive && !isExpanded && muscleCount > 0 && (
          <View style={styles.musclePreview}>
            {(config.presets || []).map(pk => (
              <View key={pk} style={[styles.previewChip, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '25' }]}>
                <Text style={[styles.previewChipText, { color: theme.primary }]}>{PRESETS.find(p => p.key === pk)?.label || pk}</Text>
              </View>
            ))}
            {(config.muscles || []).filter(m => {
              // Only show muscles not covered by a preset
              const presetMuscles = new Set();
              (config.presets || []).forEach(pk => {
                const p = PRESETS.find(x => x.key === pk);
                if (p) p.muscles.forEach(pm => presetMuscles.add(pm));
              });
              return !presetMuscles.has(m);
            }).map(m => {
              const chip = MUSCLE_CHIPS.find(c => c.key === m);
              return (
                <View key={m} style={[styles.previewChip, { backgroundColor: chipBg, borderColor: chipBorder }]}>
                  <Text style={[styles.previewChipText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>{chip?.label || m}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Expanded config */}
        {isActive && isExpanded && (
          <View style={styles.dayConfig}>
            {/* Quick Presets */}
            <Text style={[styles.configLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }]}>Quick Presets</Text>
            <View style={styles.presetRow}>
              {PRESETS.map(preset => {
                const isSelected = (config.presets || []).includes(preset.key);
                return (
                  <TouchableOpacity
                    key={preset.key}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor: isSelected ? theme.primary : chipBg,
                        borderColor: isSelected ? theme.primary : chipBorder,
                      },
                    ]}
                    onPress={() => togglePreset(day, preset.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetText, { color: isSelected ? '#FFF' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') }]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Individual Muscles */}
            <Text style={[styles.configLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', marginTop: 14 }]}>Muscles</Text>
            <View style={styles.muscleGrid}>
              {MUSCLE_CHIPS.map(muscle => {
                const isSelected = (config.muscles || []).includes(muscle.key);
                return (
                  <TouchableOpacity
                    key={muscle.key}
                    style={[
                      styles.muscleChip,
                      {
                        backgroundColor: isSelected ? theme.primary + '15' : chipBg,
                        borderColor: isSelected ? theme.primary + '40' : chipBorder,
                      },
                    ]}
                    onPress={() => toggleMuscle(day, muscle.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.muscleChipText, { color: isSelected ? theme.primary : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)') }]}>
                      {muscle.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Exercise Count */}
            <Text style={[styles.configLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', marginTop: 14 }]}>Exercises per session</Text>
            <View style={styles.countRow}>
              {[3, 4, 5, 6].map(count => {
                const isSelected = config.exerciseCount === count;
                return (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.countPill,
                      {
                        backgroundColor: isSelected ? theme.primary : chipBg,
                        borderColor: isSelected ? theme.primary : chipBorder,
                      },
                    ]}
                    onPress={() => setExerciseCount(day, count)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.countText, { color: isSelected ? '#FFF' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)') }]}>
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: Platform.OS === 'ios' ? 12 : insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
            <MaterialIcons name="close" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Weekly Split</Text>
            <Text style={[styles.headerSubtitle, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
              {activeDayCount} training day{activeDayCount !== 1 ? 's' : ''} per week
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        {/* Description */}
        <View style={[styles.descCard, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '15' }]}>
          <MaterialIcons name="auto-awesome" size={18} color={theme.primary} />
          <Text style={[styles.descText, { color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }]}>
            Set up your weekly plan and we'll suggest the perfect workout for each day based on your goals and progress.
          </Text>
        </View>

        {/* Day Cards */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {DAY_KEYS.map(day => renderDayCard(day))}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.saveButton, { opacity: activeDayCount > 0 ? 1 : 0.5 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={activeDayCount === 0}
          >
            <LinearGradient
              colors={[theme.primary, theme.primary + 'CC']}
              style={styles.saveButtonGradient}
            >
              <MaterialIcons name="check" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Save Split</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  descCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  descText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dayToggle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  daySummary: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  todayBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  musclePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  previewChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayConfig: {
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  muscleChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  countRow: {
    flexDirection: 'row',
    gap: 8,
  },
  countPill: {
    width: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WorkoutSplitModal;
