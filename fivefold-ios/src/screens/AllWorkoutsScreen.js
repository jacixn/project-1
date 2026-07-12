import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import WorkoutService from '../services/workoutService';
import { formatTime, DAY_SHORT } from '../services/reminderService';
import { formatDurationShort } from '../utils/duration';
import SheetHeader from '../components/SheetHeader';

// Every scheduled workout, regardless of day — a native pull-to-dismiss modal
// screen mirroring "All Reminders". View + delete; refreshes on focus.
const AllWorkoutsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [scheduled, setScheduled] = useState([]);

  const textPrimary = isDark ? '#FFFFFF' : '#1a1a1a';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const accent = theme.primary;

  const refresh = useCallback(async () => {
    try { setScheduled(await WorkoutService.getScheduledWorkouts()); } catch { setScheduled([]); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => navigation.addListener('focus', refresh), [navigation, refresh]);

  const scheduleLabel = (s) => {
    if (s.type === 'one-time') {
      if (s.date) {
        const [y, mo, dd] = s.date.split('-').map(Number);
        return new Date(y, mo - 1, dd).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
      return 'One-time';
    }
    return (s.days || []).length === 7 ? 'Every day' : (s.days || []).map((d) => DAY_SHORT[d]).join(', ');
  };

  // One-time by date first, then recurring by time.
  const sorted = [...scheduled].sort((a, b) => {
    const aOne = a.type === 'one-time';
    const bOne = b.type === 'one-time';
    if (aOne !== bOne) return aOne ? -1 : 1;
    if (aOne && bOne) return (a.date || '').localeCompare(b.date || '');
    const [ah, am] = (a.time || '18:00').split(':').map(Number);
    const [bh, bm] = (b.time || '18:00').split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  const handleDelete = (s) => {
    hapticFeedback.medium();
    Alert.alert(s.templateName || 'Workout', 'Remove this scheduled workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await WorkoutService.deleteScheduledWorkout(s.id); await refresh(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SheetHeader title="Scheduled Workouts" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="event-available" size={48} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>No scheduled workouts yet</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>Schedule one from Start Workout.</Text>
          </View>
        ) : sorted.map((s) => (
          <View key={s.id} style={[styles.row, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <TouchableOpacity
              style={styles.rowMain}
              activeOpacity={0.7}
              onPress={() => { hapticFeedback.light(); navigation.navigate('ScheduleWorkout', { editingSchedule: s }); }}
            >
              <View style={[styles.iconBubble, { backgroundColor: accent + '20' }]}>
                <MaterialIcons name="fitness-center" size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>{s.templateName || 'Workout'}</Text>
                <Text style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
                  {formatTime(s.time)}{s.duration ? ` · ${formatDurationShort(s.duration)}` : ''} · {scheduleLabel(s)}
                  {s.notifyBefore == null || s.notifyBefore < 0 ? ' · no reminder' : s.notifyBefore === 0 ? ' · notify at start' : ` · notify ${s.notifyBefore}m before`}
                </Text>
              </View>
              <View style={[styles.editHint, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <MaterialIcons name="edit" size={16} color={theme.textSecondary} />
                <Text style={[styles.editHintText, { color: theme.textSecondary }]}>Edit</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(s)}
              style={[styles.deleteBtn, { backgroundColor: (theme.error || '#EF4444') + '18' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={20} color={theme.error || '#EF4444'} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 20 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptySub: { fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBubble: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editHintText: { fontSize: 13, fontWeight: '600' },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AllWorkoutsScreen;
