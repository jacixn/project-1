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
const DurationField = ({ value = 30, onChange, accent }) => {
  const { theme, isDark } = useTheme();
  const acc = accent || theme.primary;
  const hairline = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  const tile = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const [showWheel, setShowWheel] = useState(false);
  const durationAsDate = new Date(2000, 0, 1, Math.floor(value / 60), value % 60, 0);

  const set = (m) => onChange?.(clampDuration(m));
  const bump = (dir) => { hapticFeedback.selection(); set(stepDuration(value, dir)); };
  const chipLabel = (m) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} hr` : `${Math.floor(m / 60)} hr ${m % 60}`);

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.valueWrap, { backgroundColor: tile }]}
          onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Duration ${formatDuration(value)}`}
          accessibilityHint="Opens an exact hours and minutes picker"
        >
          <Text style={[styles.value, { color: theme.text }]}>{formatDuration(value)}</Text>
          <Text style={[styles.hint, { color: showWheel ? acc : theme.textSecondary }]}>{showWheel ? 'Done' : 'Tap to set exactly'}</Text>
        </TouchableOpacity>
        <View style={styles.steppers}>
          <TouchableOpacity onPress={() => bump(-1)} style={[styles.stepBtn, { borderColor: hairline, backgroundColor: tile }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Shorter">
            <MaterialIcons name="remove" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => bump(1)} style={[styles.stepBtn, { borderColor: hairline, backgroundColor: tile }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Longer">
            <MaterialIcons name="add" size={20} color={theme.text} />
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
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {DURATION_PRESETS.map((m) => {
          const active = clampDuration(value) === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => { hapticFeedback.light(); set(m); }}
              style={[styles.chip, { backgroundColor: active ? acc : tile }]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? '#FFFFFF' : theme.text }]}>
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
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingRight: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

});

export default DurationField;
