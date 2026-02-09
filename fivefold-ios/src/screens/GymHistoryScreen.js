/**
 * GymHistoryScreen
 *
 * Full workout history with expandable workout details.
 * Every set, rep, weight, and note is shown — nothing missing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import WorkoutService from '../services/workoutService';
import { hapticFeedback } from '../utils/haptics';

const { width: SW } = Dimensions.get('window');

const GymHistoryScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  const textPrimary = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondary = isDark ? 'rgba(255,255,255,0.65)' : '#666';
  const textTertiary = isDark ? 'rgba(255,255,255,0.4)' : '#999';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await WorkoutService.getWorkoutHistory();
      setHistory(data || []);
      setLoading(false);
      runEntrance();
    } catch (e) {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await WorkoutService.getWorkoutHistory();
    setHistory(data || []);
    setRefreshing(false);
  };

  const runEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const handleDelete = (workoutId, workoutName) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workoutName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.medium();
            await WorkoutService.deleteWorkout(workoutId);
            setHistory(prev => prev.filter(w => w.id !== workoutId));
            if (expandedId === workoutId) setExpandedId(null);
          },
        },
      ]
    );
  };

  // ── Helpers ──
  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Group history by date sections ──
  const groupedHistory = () => {
    const groups = {};
    history.forEach(w => {
      const d = w.completedAt ? new Date(w.completedAt) : new Date();
      const key = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });
    return Object.entries(groups);
  };

  // ── Stats summary ──
  const totalWorkouts = history.length;
  const totalMinutes = Math.round(history.reduce((s, w) => s + (w.duration || 0), 0) / 60);
  const totalExercises = history.reduce((s, w) => s + (w.exercises?.length || 0), 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <MaterialIcons name="fitness-center" size={48} color={theme.primary} />
        <Text style={[styles.loadingText, { color: textSecondary }]}>Loading workouts...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingTop: insets.top + 46, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Stats Banner */}
        <View style={[styles.statsBanner, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: textTertiary }]}>Workouts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: cardBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}</Text>
            <Text style={[styles.statLabel, { color: textTertiary }]}>Total Time</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: cardBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{totalExercises}</Text>
            <Text style={[styles.statLabel, { color: textTertiary }]}>Exercises</Text>
          </View>
        </View>

        {/* Empty state */}
        {history.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}14` }]}>
              <MaterialIcons name="fitness-center" size={40} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No workouts yet</Text>
            <Text style={[styles.emptyDesc, { color: textSecondary }]}>
              Complete your first workout and it will show up here.
            </Text>
          </View>
        )}

        {/* Grouped workout list */}
        {groupedHistory().map(([monthLabel, workouts]) => (
          <View key={monthLabel} style={styles.monthGroup}>
            <Text style={[styles.monthHeader, { color: textTertiary }]}>{monthLabel}</Text>

            {workouts.map((workout) => {
              const isExpanded = expandedId === workout.id;
              return (
                <View key={workout.id} style={[styles.workoutCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  {/* Workout row — tap to expand */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.workoutRow}
                    onPress={() => {
                      hapticFeedback.light();
                      setExpandedId(isExpanded ? null : workout.id);
                    }}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}18` }]}>
                      <MaterialIcons name="fitness-center" size={18} color={theme.primary} />
                    </View>

                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: textPrimary }]} numberOfLines={1}>{workout.name || 'Workout'}</Text>
                      <View style={styles.metaRow}>
                        <MaterialIcons name="schedule" size={12} color={textTertiary} />
                        <Text style={[styles.metaText, { color: textSecondary }]}>{formatDuration(workout.duration)}</Text>
                        <Text style={[styles.metaDot, { color: textTertiary }]}>·</Text>
                        <MaterialIcons name="fitness-center" size={12} color={textTertiary} />
                        <Text style={[styles.metaText, { color: textSecondary }]}>{workout.exercises?.length || 0} exercises</Text>
                      </View>
                    </View>

                    <View style={styles.dateChevron}>
                      <Text style={[styles.dateText, { color: textTertiary }]}>{formatDate(workout.completedAt)}</Text>
                      <MaterialIcons
                        name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={22}
                        color={textTertiary}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded details */}
                  {isExpanded && (
                    <View style={[styles.expandedArea, { borderTopColor: cardBorder }]}>
                      {/* Date / time bar */}
                      <View style={styles.detailBar}>
                        <View style={styles.detailPill}>
                          <MaterialIcons name="event" size={14} color={theme.primary} />
                          <Text style={[styles.detailPillText, { color: textSecondary }]}>{formatFullDate(workout.completedAt)}</Text>
                        </View>
                        <View style={styles.detailPill}>
                          <MaterialIcons name="access-time" size={14} color={theme.primary} />
                          <Text style={[styles.detailPillText, { color: textSecondary }]}>
                            {formatTime(workout.startTime)} – {formatTime(workout.endTime || workout.completedAt)}
                          </Text>
                        </View>
                      </View>

                      {/* Note */}
                      {workout.note ? (
                        <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderColor: cardBorder }]}>
                          <MaterialIcons name="sticky-note-2" size={14} color={textTertiary} style={{ marginRight: 8, marginTop: 2 }} />
                          <Text style={[styles.noteText, { color: textSecondary }]}>{workout.note}</Text>
                        </View>
                      ) : null}

                      {/* Photo */}
                      {workout.photo ? (
                        <Image source={{ uri: workout.photo }} style={styles.workoutPhoto} />
                      ) : null}

                      {/* Exercises */}
                      {(workout.exercises || []).map((ex, exIdx) => (
                        <View key={exIdx} style={[styles.exerciseBlock, { borderColor: cardBorder }]}>
                          <View style={styles.exerciseHeader}>
                            <Text style={[styles.exerciseName, { color: textPrimary }]}>{ex.name}</Text>
                            {ex.equipment ? (
                              <Text style={[styles.equipmentBadge, { color: textTertiary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>{ex.equipment}</Text>
                            ) : null}
                          </View>

                          {/* Sets table */}
                          <View style={styles.setsTable}>
                            <View style={styles.setsHeaderRow}>
                              <Text style={[styles.setsCol, styles.setsHeaderText, { color: textTertiary }]}>Set</Text>
                              <Text style={[styles.setsCol, styles.setsHeaderText, { color: textTertiary }]}>Weight</Text>
                              <Text style={[styles.setsCol, styles.setsHeaderText, { color: textTertiary }]}>Reps</Text>
                              <Text style={[styles.setsColSmall, styles.setsHeaderText, { color: textTertiary }]}></Text>
                            </View>
                            {(ex.sets || []).map((set, sIdx) => (
                              <View key={sIdx} style={[styles.setsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }]}>
                                <Text style={[styles.setsCol, styles.setNum, { color: textTertiary }]}>{sIdx + 1}</Text>
                                <Text style={[styles.setsCol, styles.setVal, { color: textPrimary }]}>
                                  {set.weight ? `${set.weight} kg` : '–'}
                                </Text>
                                <Text style={[styles.setsCol, styles.setVal, { color: textPrimary }]}>
                                  {set.reps || '–'}
                                </Text>
                                <View style={styles.setsColSmall}>
                                  {set.completed ? (
                                    <MaterialIcons name="check-circle" size={16} color="#10B981" />
                                  ) : (
                                    <MaterialIcons name="radio-button-unchecked" size={16} color={textTertiary} />
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}

                      {/* Delete button */}
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(workout.id, workout.name)}
                      >
                        <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Delete Workout</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </Animated.ScrollView>

      {/* Premium Transparent Header */}
      <BlurView
        intensity={50}
        tint={isDark ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <View style={{ height: Platform.OS === 'ios' ? insets.top : 24 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>

            <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
              <Text style={{
                color: textPrimary,
                fontSize: 17,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}>
                Workout History
              </Text>
              <View style={{
                width: 60,
                height: 3,
                backgroundColor: theme.primary,
                borderRadius: 2,
                marginTop: 6,
              }} />
            </View>

            {/* Spacer to balance the back button */}
            <View style={{ width: 40 }} />
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },

  // Stats banner
  statsBanner: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderRadius: 18, borderWidth: 1,
    paddingVertical: 18, alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // Month groups
  monthGroup: { marginTop: 20, paddingHorizontal: 16 },
  monthHeader: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 },

  // Workout card
  workoutCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  workoutRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconCircle: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  workoutInfo: { flex: 1, gap: 4 },
  workoutName: { fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  metaDot: { fontSize: 12, marginHorizontal: 2 },
  dateChevron: { alignItems: 'flex-end', gap: 2 },
  dateText: { fontSize: 11, fontWeight: '500' },

  // Expanded area
  expandedArea: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
  detailBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  detailPillText: { fontSize: 12, fontWeight: '500' },

  // Note
  noteBox: { flexDirection: 'row', borderRadius: 10, padding: 10, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Photo
  workoutPhoto: { width: '100%', height: 180, borderRadius: 12 },

  // Exercise block
  exerciseBlock: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  exerciseName: { fontSize: 14, fontWeight: '700', flex: 1 },
  equipmentBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', textTransform: 'capitalize' },

  // Sets table
  setsTable: { paddingHorizontal: 12, paddingBottom: 8 },
  setsHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  setsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth },
  setsCol: { flex: 1, textAlign: 'center' },
  setsColSmall: { width: 30, alignItems: 'center' },
  setsHeaderText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },
  setNum: { fontSize: 13, fontWeight: '600' },
  setVal: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
});

export default GymHistoryScreen;
