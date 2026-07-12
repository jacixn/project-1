import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Tap-to-toggle month calendar (EyeCandy-style). `selectedDates` is an array of
// Date; `onToggle(date)` adds/removes. singleSelect => picking replaces.
const MultiDateCalendar = ({ selectedDates = [], onToggle, accent, singleSelect = false }) => {
  const { theme } = useTheme();
  const acc = accent || theme.primary;
  const first = selectedDates[0] || new Date();
  const [calMonth, setCalMonth] = useState(new Date(first.getFullYear(), first.getMonth(), 1));

  const y = calMonth.getFullYear();
  const mo = calMonth.getMonth();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const startWeekday = new Date(y, mo, 1).getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey = keyOf(today);
  const selectedKeys = new Set(selectedDates.map(keyOf));
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const canPrev = calMonth > thisMonthStart;
  const hs = { top: 8, bottom: 8, left: 8, right: 8 };

  const changeMonth = (delta) => {
    hapticFeedback.selection();
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, mo, d));

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => canPrev && changeMonth(-1)} disabled={!canPrev} hitSlop={hs} style={styles.navBtn}>
          <MaterialIcons name="chevron-left" size={26} color={canPrev ? theme.text : theme.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {calMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={hs} style={styles.navBtn}>
          <MaterialIcons name="chevron-right" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
          <Text key={i} style={[styles.weekLabel, { color: theme.textTertiary }]}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.cell} />;
          const k = keyOf(date);
          const isPast = date < today;
          const isSel = selectedKeys.has(k);
          const isToday = k === todayKey;
          return (
            <TouchableOpacity
              key={k}
              style={styles.cell}
              disabled={isPast}
              activeOpacity={0.7}
              onPress={() => { hapticFeedback.light(); onToggle?.(date); }}
            >
              <View style={[
                styles.day,
                isSel && { backgroundColor: acc },
                !isSel && isToday && { borderWidth: 1.5, borderColor: acc },
              ]}>
                <Text style={[styles.dayText, { color: isSel ? '#fff' : theme.text, opacity: isPast ? 0.3 : 1 }]}>
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

export default MultiDateCalendar;
