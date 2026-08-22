import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import WorkoutService from '../services/workoutService';
import { formatTime } from '../services/reminderService';
import SheetHeader from '../components/SheetHeader';
import {
  nextOccurrence, whenLabel, sortByNext, patternLabel, reminderLabel, durationLabel,
  weekLoad, weeklySummary, hoursLabel, WEEK_ORDER, WEEK_LETTERS,
} from '../utils/scheduleAgenda';

// Every scheduled workout as an agenda: soonest first, with what the week
// looks like up top. Native pull-to-dismiss modal screen. Tap a row to edit,
// the bin to remove. Refreshes on focus.
const AllWorkoutsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [scheduled, setScheduled] = useState([]);
  const [now, setNow] = useState(() => new Date());

  const accent = theme.primary;
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const dim = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)';

  const refresh = useCallback(async () => {
    setNow(new Date());
    try { setScheduled(await WorkoutService.getScheduledWorkouts()); } catch { setScheduled([]); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => navigation.addListener('focus', refresh), [navigation, refresh]);

  const sorted = useMemo(() => sortByNext(scheduled, now), [scheduled, now]);
  const summary = useMemo(() => weeklySummary(scheduled, now), [scheduled, now]);
  const load = useMemo(() => weekLoad(scheduled, now), [scheduled, now]);
  const maxLoad = Math.max(1, ...load);
  const todayCol = WEEK_ORDER.indexOf(now.getDay());

  const handleDelete = (s) => {
    hapticFeedback.medium();
    Alert.alert(s.templateName || 'Workout', 'Remove this scheduled workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await WorkoutService.deleteScheduledWorkout(s.id); await refresh(); } },
    ]);
  };

  const openEdit = (s) => {
    hapticFeedback.light();
    navigation.navigate('ScheduleWorkout', { editingSchedule: s });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SheetHeader title="Scheduled Workouts" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing scheduled</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Open a template and tap Schedule to put it on your week.
            </Text>
          </View>
        ) : (
          <>
            {/* This week */}
            <Text style={[styles.kicker, { color: theme.textSecondary }]}>This week</Text>
            <Text style={[styles.headline, { color: theme.text }]}>
              {summary.sessionsPerWeek} {summary.sessionsPerWeek === 1 ? 'session' : 'sessions'}
              {summary.minutesPerWeek ? <Text style={{ color: theme.textSecondary }}>{`  ·  ${hoursLabel(summary.minutesPerWeek)}`}</Text> : null}
            </Text>

            <View style={styles.week}>
              {load.map((mins, i) => {
                const isToday = i === todayCol;
                const h = mins ? Math.max(6, Math.round((mins / maxLoad) * 40)) : 3;
                return (
                  <View key={i} style={styles.weekCol}>
                    <Text style={[styles.weekMins, { color: isToday ? accent : theme.textSecondary, opacity: mins ? 1 : 0 }]}>
                      {mins ? (mins >= 60 ? `${Math.round((mins / 60) * 10) / 10}h` : `${mins}m`) : '0'}
                    </Text>
                    <View style={[styles.weekBarTrack, { height: 40 }]}>
                      <View
                        style={{
                          height: h,
                          borderRadius: 3,
                          backgroundColor: mins ? accent : hairline,
                          opacity: mins ? (isToday ? 1 : 0.45) : 1,
                        }}
                      />
                    </View>
                    <Text style={[styles.weekLetter, { color: isToday ? accent : theme.textSecondary, fontWeight: isToday ? '800' : '600' }]}>
                      {WEEK_LETTERS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Agenda */}
            <View style={[styles.list, { borderTopColor: hairline }]}>
              {sorted.map((s) => {
                const next = nextOccurrence(s, now);
                const when = whenLabel(next, now);
                const passed = when === 'Passed';
                const days = new Set(s.type === 'one-time' ? [] : (s.days || []));
                const meta = [durationLabel(s.duration), reminderLabel(s.notifyBefore)].filter(Boolean).join('  ·  ');
                return (
                  <View key={s.id} style={[styles.row, { borderBottomColor: hairline }]}>
                    <TouchableOpacity
                      style={styles.rowMain}
                      activeOpacity={0.6}
                      onPress={() => openEdit(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.templateName || 'Workout'}, ${formatTime(s.time)}, ${patternLabel(s)}`}
                      accessibilityHint="Opens the schedule editor"
                    >
                      <View style={styles.timeCol}>
                        <Text style={[styles.time, { color: theme.text }]}>{formatTime(s.time)}</Text>
                        <Text style={[styles.when, { color: passed ? (theme.error || '#EF4444') : when === 'Today' ? accent : theme.textSecondary }]}>
                          {when || 'Never'}
                        </Text>
                      </View>
                      <View style={styles.mainCol}>
                        <Text style={[styles.name, { color: theme.text }]}>{s.templateName || 'Workout'}</Text>
                        {s.type === 'one-time' ? (
                          <Text style={[styles.pattern, { color: theme.textSecondary }]}>{patternLabel(s)}  ·  one-time</Text>
                        ) : (
                          <View style={styles.dayStrip}>
                            {WEEK_ORDER.map((d, i) => {
                              const on = days.has(d);
                              return (
                                <Text key={i} style={[styles.dayLetter, { color: on ? accent : dim, fontWeight: on ? '800' : '600' }]}>
                                  {WEEK_LETTERS[i]}
                                </Text>
                              );
                            })}
                            <Text style={[styles.patternInline, { color: theme.textSecondary }]}>{patternLabel(s)}</Text>
                          </View>
                        )}
                        {meta ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{meta}</Text> : null}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(s)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.5}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${s.templateName || 'workout'}`}
                    >
                      <MaterialIcons name="delete-outline" size={21} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.footnote, { color: theme.textSecondary }]}>Tap a workout to change its time, days or reminder.</Text>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  empty: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  emptySub: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  kicker: { fontSize: 13, fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2, fontVariant: ['tabular-nums'] },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 22 },
  weekCol: { flex: 1, alignItems: 'center' },
  weekMins: { fontSize: 10.5, fontWeight: '700', marginBottom: 4, fontVariant: ['tabular-nums'] },
  weekBarTrack: { width: 26, justifyContent: 'flex-end' },
  weekLetter: { fontSize: 12, marginTop: 6 },
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1, flexDirection: 'row', paddingVertical: 14 },
  timeCol: { width: 82, paddingRight: 8 },
  time: { fontSize: 16, fontWeight: '700', lineHeight: 21, fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  when: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  mainCol: { flex: 1 },
  name: { fontSize: 16.5, fontWeight: '700', lineHeight: 21, letterSpacing: -0.2 },
  dayStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 5, flexWrap: 'wrap' },
  dayLetter: { fontSize: 12, width: 15, textAlign: 'center' },
  patternInline: { fontSize: 13, fontWeight: '500', marginLeft: 8 },
  pattern: { fontSize: 13, fontWeight: '500', marginTop: 5 },
  meta: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  deleteBtn: { paddingTop: 14, paddingLeft: 10, paddingBottom: 14 },
  footnote: { fontSize: 12.5, marginTop: 14, lineHeight: 17 },
});

export default AllWorkoutsScreen;
