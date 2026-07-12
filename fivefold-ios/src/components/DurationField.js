import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  formatDuration,
  stepDuration,
  adaptiveStep,
  clampDuration,
  DURATION_PRESETS,
} from '../utils/duration';

const stepLabel = (m) => {
  const s = adaptiveStep(m);
  return s >= 60 ? `${s / 60} hr steps` : `${s} min steps`;
};

// A duration control: - / value / + adaptive stepper, quick chips, and a tap-to-
// open hours+minutes wheel for exact values. Shared by reminders + workouts.
const DurationField = ({ value = 30, onChange, accent }) => {
  const { theme, isDark } = useTheme();
  const acc = accent || theme.primary;
  const inputBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)';
  const [showWheel, setShowWheel] = useState(false);
  const durationAsDate = new Date(2000, 0, 1, Math.floor(value / 60), value % 60, 0);

  const set = (m) => onChange?.(clampDuration(m));
  const bump = (dir) => { hapticFeedback.selection(); set(stepDuration(value, dir)); };

  return (
    <View>
      <View style={[styles.stepperRow, { backgroundColor: inputBg, borderColor: theme.border }]}>
        <TouchableOpacity onPress={() => bump(-1)} style={[styles.stepBtn, { borderColor: theme.border }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="remove" size={22} color={acc} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.valueWrap} onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} activeOpacity={0.7}>
          <Text style={[styles.value, { color: theme.text }]}>{formatDuration(value)}</Text>
          <Text style={[styles.hint, { color: acc }]}>{showWheel ? 'done' : 'tap to set exact'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => bump(1)} style={[styles.stepBtn, { borderColor: theme.border }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="add" size={22} color={acc} />
        </TouchableOpacity>
      </View>

      {showWheel && Platform.OS === 'ios' && (
        <View style={[styles.wheelCard, { backgroundColor: inputBg, borderColor: theme.border }]}>
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
              style={[styles.chip, { backgroundColor: active ? acc + '20' : inputBg, borderColor: active ? acc : theme.border }]}
            >
              <Text style={[styles.chipText, { color: active ? acc : theme.textSecondary }]}>
                {m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  stepperRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 8 },
  stepBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  valueWrap: { flex: 1, alignItems: 'center' },
  value: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  hint: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  wheelCard: { borderRadius: 14, borderWidth: 1, marginTop: 10, paddingVertical: 4 },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingRight: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default DurationField;
