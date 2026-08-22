import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { computeDayFlow, fmtFlowTime, clashFor } from '../utils/dayFlow';
import { loadBusyForDate } from '../utils/dayBusy';
import DayTimeline from './DayTimeline';

// Picking a start time without dragging: the day itself as a list where every free gap is a tap target
// that says whether the workout fits, an exact wheel, and the drag timeline
// only for people who want it. Same onPick(hour, minute) contract as
// DayTimeline so callers swap without changes.

const FreeRow = ({ row, active, theme, accent, tile, onPick }) => {
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 45 }), withTiming(8, { duration: 45 }),
      withTiming(-5, { duration: 40 }), withTiming(5, { duration: 40 }), withTiming(0, { duration: 40 }),
    );
  };
  const press = () => {
    if (!row.fits) { hapticFeedback.error(); shake(); return; }
    hapticFeedback.medium();
    onPick(row.pickMin);
  };
  const longPress = () => {
    if (!row.forcible) return;
    hapticFeedback.warning();
    onPick(row.pickMin);
  };
  const ok = theme.success || '#10B981';
  const warn = theme.warning || '#F59E0B';
  const fitColor = active ? accent : row.fits ? ok : row.forcible ? warn : theme.textSecondary;
  const border = active ? accent : row.forcible ? warn : 'transparent';
  return (
    <Animated.View style={shakeStyle}>
      <TouchableOpacity
        onPress={press}
        onLongPress={longPress}
        delayLongPress={350}
        activeOpacity={row.fits ? 0.6 : 0.9}
        style={[styles.row, { backgroundColor: tile, borderColor: border, opacity: row.fits || row.forcible ? 1 : 0.55 }]}
        accessibilityRole="button"
        accessibilityLabel={`${row.rangeLabel}. ${row.fitLabel}`}
      >
        <View style={styles.rowText}>
          <Text style={[styles.range, { color: theme.text }]}>{row.rangeLabel}</Text>
          <Text style={[styles.fit, { color: fitColor }]}>{active ? 'Starts here' : row.fitLabel}</Text>
        </View>
        {active ? (
          <MaterialIcons name="check" size={22} color={accent} />
        ) : row.fits ? (
          <View style={[styles.pill, { backgroundColor: accent }]}>
            <Text style={styles.pillText}>Pick</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

const BusyRow = ({ row, theme, tile }) => (
  <View style={[styles.row, { backgroundColor: tile, borderColor: 'transparent', opacity: 0.7 }]}>
    <View style={styles.rowText}>
      <Text style={[styles.range, { color: theme.textSecondary }]}>{row.rangeLabel}</Text>
      <Text style={[styles.fit, { color: theme.textSecondary, fontWeight: '700' }]}>{row.label}</Text>
    </View>
  </View>
);

const StartTimePicker = ({
  date, selected, durationMinutes = 60, label, accentColor, onPick,
  excludeGymId = null, excludeReminderId = null, excludePrayerId = null, excludeEvent = null,
}) => {
  const { theme, isDark } = useTheme();
  const accent = accentColor || theme.primary;
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const tile = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const [busy, setBusy] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('flow'); // flow | timeline
  const [showWheel, setShowWheel] = useState(false);
  const dayKey = date ? date.toDateString() : '';

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    loadBusyForDate(date, { excludeGymId, excludeReminderId, excludePrayerId })
      .then((b) => { if (alive) { setBusy(b); setLoaded(true); } })
      .catch(() => { if (alive) { setBusy([]); setLoaded(true); } });
    return () => { alive = false; };
  }, [dayKey, excludeGymId, excludeReminderId, excludePrayerId]);

  const isToday = dayKey === new Date().toDateString();
  const nowD = new Date();
  const nowMin = nowD.getHours() * 60 + nowD.getMinutes();
  const rows = useMemo(() => computeDayFlow({ events: busy, durationMinutes, isToday, nowMin }), [busy, durationMinutes, isToday, nowMin]);
  const selMin = selected ? selected.hour * 60 + selected.minute : null;
  const clash = useMemo(() => clashFor(selMin, durationMinutes, busy), [selMin, durationMinutes, busy]);
  const pick = (min) => onPick(Math.floor(min / 60), min % 60);
  const dayName = date ? date.toLocaleDateString('en', { weekday: 'long' }) : 'that day';
  const wheelDate = new Date(2000, 0, 1, selected?.hour ?? 18, selected?.minute ?? 0, 0);

  if (view === 'timeline') {
    return (
      <View style={styles.fill}>
        <View style={styles.switchRow}>
          <Text style={[styles.kicker, { color: theme.textSecondary }]}>Drag the block to move it</Text>
          <TouchableOpacity onPress={() => { hapticFeedback.light(); setView('flow'); }} style={[styles.smallBtn, { borderColor: accent, backgroundColor: tile }]} accessibilityRole="button">
            <Text style={[styles.link, { color: accent }]}>Back to free times</Text>
          </TouchableOpacity>
        </View>
        {/* DayTimeline uses gesture-handler views; give it a root wherever this picker is mounted */}
        <GestureHandlerRootView style={styles.fill}>
          <DayTimeline
            date={date}
            selected={selected}
            durationMinutes={durationMinutes}
            label={label}
            accentColor={accent}
            onPick={(h, m) => onPick(h, m)}
            extraEvents={busy}
            exclude={excludeEvent}
          />
        </GestureHandlerRootView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {clash ? <Text style={[styles.clash, { color: theme.warning || '#F59E0B' }]}>{clash}. Pick a free time below or keep it anyway.</Text> : null}

      <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} style={[styles.exactBtn, { borderColor: accent, backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button">
        <MaterialIcons name="schedule" size={18} color={accent} />
        <Text style={[styles.link, { color: accent }]}>{showWheel ? 'Done' : 'Set an exact time'}</Text>
      </TouchableOpacity>
      {showWheel && Platform.OS === 'ios' ? (
        <View style={[styles.wheel, { borderColor: hairline }]}>
          <DateTimePicker
            value={wheelDate}
            mode="time"
            display="spinner"
            minuteInterval={5}
            textColor={theme.text}
            style={{ alignSelf: 'stretch' }}
            onChange={(_, d) => { if (d) onPick(d.getHours(), d.getMinutes()); }}
          />
        </View>
      ) : null}

      <View style={[styles.switchRow, { marginTop: 22 }]}>
        <Text style={[styles.kicker, { color: theme.textSecondary }]}>{`Your ${dayName}`}</Text>
        <TouchableOpacity onPress={() => { hapticFeedback.light(); setView('timeline'); }} style={[styles.smallBtn, { borderColor: accent, backgroundColor: tile }]} accessibilityRole="button">
          <Text style={[styles.link, { color: accent }]}>Timeline</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.list}>
        {!loaded ? (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Checking your day...</Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Nothing left today. Pick another day or set an exact time.</Text>
        ) : rows.map((row, i) => (
          row.type === 'free'
            ? <FreeRow key={`f${i}`} row={row} active={selMin != null && selMin >= row.startMin && selMin < row.endMin} theme={theme} accent={accent} tile={tile} onPick={pick} />
            : <BusyRow key={`b${i}`} row={row} theme={theme} tile={tile} />
        ))}
      </View>
      {loaded && rows.some((r) => r.type === 'free' && r.fits) ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap Pick on a free time to start there. Greyed ones are already busy or too short.</Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  kicker: { fontSize: 14, fontWeight: '600' },
  clash: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 14 },
  exactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14, borderWidth: 1.5 },
  smallBtn: { height: 36, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  link: { fontSize: 15, fontWeight: '800' },
  wheel: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingVertical: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5 },
  rowText: { flex: 1, paddingRight: 10 },
  range: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  fit: { fontSize: 14, fontWeight: '600', marginTop: 3, lineHeight: 19 },
  pill: { height: 36, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 13.5, lineHeight: 19, marginTop: 14 },
});

export default StartTimePicker;
