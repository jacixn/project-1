import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { computeDayFlow, fmtFlowTime, clashFor } from '../utils/dayFlow';
import { loadBusyForDate } from '../utils/dayBusy';
import DayTimeline from './DayTimeline';

// Picking a start time without dragging: quick picks for the usual times of
// day, then the day itself as a list where every free gap is a tap target
// that says whether the workout fits, an exact wheel, and the drag timeline
// only for people who want it. Same onPick(hour, minute) contract as
// DayTimeline so callers swap without changes.
export const TIME_PRESETS = [
  { label: 'Early', min: 6 * 60 },
  { label: 'Morning', min: 7 * 60 + 30 },
  { label: 'Midday', min: 12 * 60 + 30 },
  { label: 'Afternoon', min: 15 * 60 },
  { label: 'Evening', min: 18 * 60 },
  { label: 'Night', min: 20 * 60 + 30 },
];

const FreeRow = ({ row, active, theme, accent, onPick }) => {
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
  const barColor = active ? accent : row.fits ? ok : row.forcible ? warn : 'transparent';
  const fitColor = active ? accent : row.fits ? ok : row.forcible ? warn : theme.textSecondary;
  return (
    <Animated.View style={shakeStyle}>
      <TouchableOpacity
        onPress={press}
        onLongPress={longPress}
        delayLongPress={350}
        activeOpacity={row.fits ? 0.6 : 0.9}
        style={[styles.row, { opacity: row.fits || row.forcible ? 1 : 0.55 }]}
        accessibilityRole="button"
        accessibilityLabel={`${row.rangeLabel}. ${row.fitLabel}`}
      >
        <View style={[styles.bar, { backgroundColor: barColor }]} />
        <View style={styles.rowText}>
          <Text style={[styles.range, { color: theme.text }]}>{row.rangeLabel}</Text>
          <Text style={[styles.fit, { color: fitColor }]}>{active ? 'Starts here' : row.fitLabel}</Text>
        </View>
        {row.fits && !active ? <Text style={[styles.cta, { color: ok }]}>Pick</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

const BusyRow = ({ row, theme, hairline }) => (
  <View style={styles.row}>
    <View style={[styles.bar, { backgroundColor: hairline }]} />
    <View style={styles.rowText}>
      <Text style={[styles.range, { color: theme.textSecondary }]}>{row.rangeLabel}</Text>
      <Text style={[styles.fit, { color: theme.textSecondary, fontWeight: '700' }]}>{row.label}</Text>
    </View>
  </View>
);

const StartTimePicker = ({
  date, selected, durationMinutes = 60, label, accentColor, onPick, excludeGymId = null, excludeEvent = null,
}) => {
  const { theme, isDark } = useTheme();
  const accent = accentColor || theme.primary;
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const [busy, setBusy] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('flow'); // flow | timeline
  const [showWheel, setShowWheel] = useState(false);
  const dayKey = date ? date.toDateString() : '';

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    loadBusyForDate(date, { excludeGymId })
      .then((b) => { if (alive) { setBusy(b); setLoaded(true); } })
      .catch(() => { if (alive) { setBusy([]); setLoaded(true); } });
    return () => { alive = false; };
  }, [dayKey, excludeGymId]);

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
          <TouchableOpacity onPress={() => { hapticFeedback.light(); setView('flow'); }} hitSlop={{ top: 8, bottom: 8 }} accessibilityRole="button">
            <Text style={[styles.link, { color: accent }]}>Back to free times</Text>
          </TouchableOpacity>
        </View>
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {clash ? <Text style={[styles.clash, { color: theme.warning || '#F59E0B' }]}>{clash}. Pick a free time below or keep it anyway.</Text> : null}

      <Text style={[styles.kicker, { color: theme.textSecondary }]}>Quick pick</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets} keyboardShouldPersistTaps="handled">
        {TIME_PRESETS.map((p) => {
          const active = selMin === p.min;
          return (
            <TouchableOpacity
              key={p.label}
              onPress={() => { hapticFeedback.light(); pick(p.min); }}
              style={styles.preset}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${p.label}, ${fmtFlowTime(p.min)}`}
            >
              <Text style={[styles.presetLabel, { color: active ? theme.text : theme.textSecondary, fontWeight: active ? '800' : '600' }]}>{p.label}</Text>
              <Text style={[styles.presetTime, { color: active ? accent : theme.textSecondary }]}>{fmtFlowTime(p.min)}</Text>
              <View style={[styles.underline, { backgroundColor: active ? accent : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} hitSlop={{ top: 8, bottom: 8 }} style={styles.exactRow} accessibilityRole="button">
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
        <TouchableOpacity onPress={() => { hapticFeedback.light(); setView('timeline'); }} hitSlop={{ top: 8, bottom: 8 }} accessibilityRole="button">
          <Text style={[styles.link, { color: accent }]}>Timeline</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.list, { borderTopColor: hairline }]}>
        {!loaded ? (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Checking your day...</Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Nothing left today. Pick another day or set an exact time.</Text>
        ) : rows.map((row, i) => (
          row.type === 'free'
            ? <FreeRow key={`f${i}`} row={row} active={selMin != null && selMin >= row.startMin && selMin < row.endMin} theme={theme} accent={accent} onPick={pick} />
            : <BusyRow key={`b${i}`} row={row} theme={theme} hairline={hairline} />
        ))}
      </View>
      {loaded && rows.some((r) => r.type === 'free' && r.fits) ? (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>Tap a free time to start there. Green ones fit the whole workout.</Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  kicker: { fontSize: 13, fontWeight: '600' },
  clash: { fontSize: 13.5, fontWeight: '600', lineHeight: 19, marginBottom: 14 },
  presets: { flexDirection: 'row', paddingRight: 8, marginTop: 8 },
  preset: { marginRight: 20, paddingTop: 4 },
  presetLabel: { fontSize: 15, letterSpacing: -0.2 },
  presetTime: { fontSize: 12.5, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
  underline: { height: 2.5, borderRadius: 1.5, marginTop: 7 },
  exactRow: { marginTop: 12, alignSelf: 'flex-start' },
  link: { fontSize: 14, fontWeight: '700' },
  wheel: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingVertical: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 1.5, marginRight: 12 },
  rowText: { flex: 1 },
  range: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  fit: { fontSize: 13, fontWeight: '600', marginTop: 2, lineHeight: 18 },
  cta: { fontSize: 14, fontWeight: '800', marginLeft: 10 },
  hint: { fontSize: 12.5, lineHeight: 17, marginTop: 12 },
});

export default StartTimePicker;
