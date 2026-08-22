import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { loadReminders, deleteReminder, formatTime } from '../services/reminderService';
import {
  nextOccurrence, whenLabel, sortByNext, patternLabel, durationLabel,
  weekLoad, weeklySummary, hoursLabel, WEEK_ORDER, WEEK_LETTERS,
} from '../utils/scheduleAgenda';
import SheetHeader from './SheetHeader';

// Every reminder as a week agenda, same shape as Scheduled Workouts: what the
// week looks like up top, then soonest first. Native pull-to-dismiss modal
// screen. Tap a row to edit, the bin to remove. Refreshes on focus.
const AllRemindersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [reminders, setReminders] = useState([]);
  const [now, setNow] = useState(() => new Date());

  const accent = theme.primary;
  const tile = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const dim = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)';

  const refresh = useCallback(async () => {
    setNow(new Date());
    try { setReminders(await loadReminders()); } catch { setReminders([]); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => navigation.addListener('focus', refresh), [navigation, refresh]);

  // scheduleAgenda speaks {time, duration, type, days, date}; reminders carry
  // the same fields plus title/enabled, so they drop straight in.
  const active = useMemo(() => reminders.filter((r) => r && r.enabled !== false), [reminders]);
  const sorted = useMemo(() => sortByNext(reminders, now), [reminders, now]);
  const summary = useMemo(() => weeklySummary(active, now), [active, now]);
  const load = useMemo(() => weekLoad(active, now), [active, now]);
  const maxLoad = Math.max(1, ...load);
  const todayCol = WEEK_ORDER.indexOf(now.getDay());

  const handleDelete = (r) => {
    hapticFeedback.medium();
    Alert.alert(r.title || 'Reminder', 'Delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteReminder(r.id); await refresh(); } },
    ]);
  };

  const openEdit = (r) => {
    hapticFeedback.light();
    navigation.navigate('ScheduleReminder', { editingReminder: r });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SheetHeader title="All Reminders" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No reminders yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Add one from the Reminders screen and it will show up here.</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.kicker, { color: theme.textSecondary }]}>This week</Text>
            <Text style={[styles.headline, { color: theme.text }]}>
              {summary.sessionsPerWeek} {summary.sessionsPerWeek === 1 ? 'reminder' : 'reminders'}
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
                    <View style={styles.weekBarTrack}>
                      <View style={{ height: h, borderRadius: 3, backgroundColor: mins ? accent : tile, opacity: mins ? (isToday ? 1 : 0.45) : 1 }} />
                    </View>
                    <Text style={[styles.weekLetter, { color: isToday ? accent : theme.textSecondary, fontWeight: isToday ? '800' : '600' }]}>{WEEK_LETTERS[i]}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.list}>
              {sorted.map((r) => {
                const off = r.enabled === false;
                const next = nextOccurrence(r, now);
                const when = off ? 'Off' : whenLabel(next, now);
                const passed = when === 'Passed';
                const days = new Set(r.type === 'one-time' ? [] : (r.days || []));
                const c = r.color || accent;
                return (
                  <View key={r.id} style={[styles.row, { backgroundColor: tile, opacity: off ? 0.55 : 1 }]}>
                    <TouchableOpacity
                      style={styles.rowMain}
                      activeOpacity={0.6}
                      onPress={() => openEdit(r)}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.title || 'Reminder'}, ${formatTime(r.time)}, ${patternLabel(r)}${off ? ', off' : ''}`}
                      accessibilityHint="Opens the reminder editor"
                    >
                      <View style={styles.timeCol}>
                        <Text style={[styles.time, { color: theme.text }]}>{formatTime(r.time)}</Text>
                        <Text style={[styles.when, { color: passed ? (theme.error || '#EF4444') : when === 'Today' ? accent : theme.textSecondary }]}>{when || 'Never'}</Text>
                      </View>
                      <View style={styles.mainCol}>
                        <View style={styles.nameRow}>
                          <View style={[styles.iconTile, { backgroundColor: c + '22' }]}>
                            <MaterialIcons name={r.icon || 'notifications'} size={16} color={c} />
                          </View>
                          <Text style={[styles.name, { color: theme.text }]}>{r.title || 'Reminder'}</Text>
                        </View>
                        {r.type === 'one-time' ? (
                          <Text style={[styles.pattern, { color: theme.textSecondary }]}>{patternLabel(r)}  ·  one-time</Text>
                        ) : (
                          <View style={styles.dayStrip}>
                            {WEEK_ORDER.map((d, i) => {
                              const on = days.has(d);
                              return (
                                <Text key={i} style={[styles.dayLetter, { color: on ? accent : dim, fontWeight: on ? '800' : '600' }]}>{WEEK_LETTERS[i]}</Text>
                              );
                            })}
                            <Text style={[styles.patternInline, { color: theme.textSecondary }]}>{patternLabel(r)}</Text>
                          </View>
                        )}
                        {r.duration ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{durationLabel(r.duration)}</Text> : null}
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(r)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.5}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${r.title || 'reminder'}`}
                    >
                      <MaterialIcons name="delete-outline" size={21} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.footnote, { color: theme.textSecondary }]}>Tap a reminder to change its time, days or length.</Text>
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
  weekBarTrack: { width: 26, height: 40, justifyContent: 'flex-end' },
  weekLetter: { fontSize: 12, marginTop: 6 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 16, paddingHorizontal: 14 },
  rowMain: { flex: 1, flexDirection: 'row', paddingVertical: 14 },
  timeCol: { width: 82, paddingRight: 8 },
  time: { fontSize: 16, fontWeight: '700', lineHeight: 21, fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  when: { fontSize: 12.5, fontWeight: '700', marginTop: 2 },
  mainCol: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconTile: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 16.5, fontWeight: '700', lineHeight: 21, letterSpacing: -0.2 },
  dayStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  dayLetter: { fontSize: 13, width: 16, textAlign: 'center' },
  patternInline: { fontSize: 14, fontWeight: '500', marginLeft: 8 },
  pattern: { fontSize: 14, fontWeight: '500', marginTop: 6 },
  meta: { fontSize: 14, marginTop: 4, lineHeight: 19 },
  deleteBtn: { paddingTop: 14, paddingLeft: 10, paddingBottom: 14 },
  footnote: { fontSize: 13.5, marginTop: 16, lineHeight: 19 },
});

export default AllRemindersScreen;
