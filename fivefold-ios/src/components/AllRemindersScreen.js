import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  loadReminders,
  deleteReminder,
  formatTime,
  DAY_SHORT,
} from '../services/reminderService';
import { formatDurationShort } from '../utils/duration';
import SheetHeader from './SheetHeader';

// Every reminder regardless of date — presented as a native pull-to-dismiss modal
// SCREEN. Amend (opens the schedule wizard) or delete. Refreshes on focus so edits
// made in the pushed wizard reflect on return.
const AllRemindersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [reminders, setReminders] = useState([]);

  const textPrimary = isDark ? '#FFFFFF' : '#1a1a1a';
  const textSecondary = isDark ? 'rgba(255,255,255,0.6)' : '#6B7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const refresh = useCallback(async () => {
    setReminders(await loadReminders());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => navigation.addListener('focus', refresh), [navigation, refresh]);

  const scheduleLabel = (r) => {
    if (r.type === 'one-time') {
      if (r.date) {
        const [y, mo, dd] = r.date.split('-').map(Number);
        return new Date(y, mo - 1, dd).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      }
      return 'One-time';
    }
    return (r.days || []).length === 7 ? 'Every day' : (r.days || []).map((d) => DAY_SHORT[d]).join(', ');
  };

  // One-time by date first (so far-future dates surface), then recurring by time.
  const allSorted = [...reminders].sort((a, b) => {
    const aOne = a.type === 'one-time';
    const bOne = b.type === 'one-time';
    if (aOne !== bOne) return aOne ? -1 : 1;
    if (aOne && bOne) return (a.date || '').localeCompare(b.date || '');
    const [ah, am] = (a.time || '08:00').split(':').map(Number);
    const [bh, bm] = (b.time || '08:00').split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  const handleDelete = (r) => {
    hapticFeedback.medium();
    Alert.alert(r.title, 'Delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteReminder(r.id); await refresh(); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SheetHeader title="All Reminders" leftLabel="Done" onLeft={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {allSorted.length === 0 ? (
          <Text style={{ color: textSecondary, textAlign: 'center', marginTop: 40 }}>No reminders yet</Text>
        ) : allSorted.map((r) => {
          const rColor = r.color || '#3B82F6';
          const off = r.enabled === false;
          return (
            <View key={r.id} style={[styles.row, { backgroundColor: cardBg, borderColor: cardBorder, opacity: off ? 0.5 : 1 }]}>
              <View style={[styles.iconBubble, { backgroundColor: rColor + '20' }]}>
                <MaterialIcons name={r.icon || 'notifications'} size={18} color={rColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>{r.title}</Text>
                <Text style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
                  {formatTime(r.time)}{r.duration ? ` · ${formatDurationShort(r.duration)}` : ''} · {scheduleLabel(r)}{off ? ' · Off' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { hapticFeedback.light(); navigation.navigate('ScheduleReminder', { editingReminder: r }); }}
                style={styles.actionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="edit" size={20} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(r)}
                style={styles.actionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="delete-outline" size={20} color={theme.error || '#EF4444'} />
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  iconBubble: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  actionBtn: { padding: 6 },
});

export default AllRemindersScreen;
