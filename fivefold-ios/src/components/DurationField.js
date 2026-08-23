import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  formatDuration,
  stepDuration,
  clampDuration,
  DURATION_PRESETS,
} from '../utils/duration';

// A duration control: big value with - / + adaptive steppers, tap the value
// for an exact hours+minutes wheel, and a row of quick picks underneath.
// Shared by reminders + workouts.
// bleed = the parent's horizontal padding; the quick-pick row cancels it so
// chips scroll right off the screen edge instead of clipping at the inset.
// step = fixed minutes per - / + tap (default: adaptive); presets = the quick picks.
// compact = the small in-form version (quick To Do): one short row, smaller chips.
const DurationField = ({ value = 30, onChange, accent, bleed = 20, step = null, presets = null, compact = false }) => {
  const { theme, isDark } = useTheme();
  const acc = accent || theme.primary;
  const hairline = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const tile = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const [showWheel, setShowWheel] = useState(false);
  const durationAsDate = new Date(2000, 0, 1, Math.floor(value / 60), value % 60, 0);

  const set = (m) => onChange?.(clampDuration(m));
  const bump = (dir) => { hapticFeedback.selection(); set(step > 0 ? clampDuration(value + dir * step) : stepDuration(value, dir)); };
  const picks = Array.isArray(presets) && presets.length ? presets : DURATION_PRESETS;
  const chipLabel = (m) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} hr` : `${Math.floor(m / 60)} hr ${m % 60}`);

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.valueWrap, compact && styles.valueWrapCompact, { backgroundColor: tile }]}
          onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Duration ${formatDuration(value)}`}
          accessibilityHint="Opens an exact hours and minutes picker"
        >
          <Text style={[styles.value, compact && styles.valueCompact, { color: theme.text }]}>{formatDuration(value)}</Text>
          <Text style={[styles.hint, compact && styles.hintCompact, { color: showWheel ? acc : theme.textSecondary }]}>{showWheel ? 'Done' : compact ? 'Tap for exact' : 'Tap to set exactly'}</Text>
        </TouchableOpacity>
        <View style={styles.steppers}>
          <TouchableOpacity onPress={() => bump(-1)} style={[styles.stepBtn, compact && styles.stepBtnCompact, { borderColor: hairline, backgroundColor: tile }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Shorter">
            <MaterialIcons name="remove" size={compact ? 18 : 20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bump(1)} style={[styles.stepBtn, compact && styles.stepBtnCompact, { borderColor: hairline, backgroundColor: tile }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Longer">
            <MaterialIcons name="add" size={compact ? 18 : 20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showWheel && Platform.OS === 'ios' && (
        <View style={[styles.wheel, { borderColor: hairline }]}>
          <DateTimePicker
            value={durationAsDate}
            mode="countdown"
            display="spinner"
            minuteInterval={5}
            textColor={theme.text}
            style={{ alignSelf: 'stretch' }}
            onChange={(_, selected) => { if (selected) set(selected.getHours() * 60 + selected.getMinutes()); }}
          />
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -bleed }}
        contentContainerStyle={[styles.chipsRow, compact && styles.chipsRowCompact, { paddingHorizontal: bleed }]}
        keyboardShouldPersistTaps="handled"
      >
        {picks.map((m) => {
          const active = clampDuration(value) === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => { hapticFeedback.light(); set(m); }}
              style={[styles.chip, compact && styles.chipCompact, { backgroundColor: active ? acc : tile }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, compact && styles.chipTextCompact, { color: active ? '#FFFFFF' : theme.text }]}>
                {chipLabel(m)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  valueWrap: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14 },
  value: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  steppers: { flexDirection: 'row', gap: 8 },
  stepBtn: { width: 46, height: 46, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  wheel: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingVertical: 4 },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  valueWrapCompact: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  valueCompact: { fontSize: 20, letterSpacing: -0.4 },
  hintCompact: { fontSize: 12, marginTop: 0 },
  stepBtnCompact: { width: 36, height: 36, borderRadius: 10 },
  chipsRowCompact: { gap: 6, marginTop: 8 },
  chipCompact: { paddingHorizontal: 11, height: 30, borderRadius: 10 },
  chipTextCompact: { fontSize: 13 },

});

export default DurationField;
