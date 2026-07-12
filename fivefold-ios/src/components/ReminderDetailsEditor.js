import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
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

export const ICON_OPTIONS = [
  'notifications', 'restaurant', 'local-cafe', 'fitness-center',
  'self-improvement', 'water-drop', 'bedtime', 'medication',
  'school', 'work', 'pets', 'shopping-cart',
  'local-laundry-service', 'cleaning-services', 'call', 'email',
];

export const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
];

// The "what" of a reminder: title, how long it takes, icon, color. No schedule.
// Shared by the library manager and the schedule wizard's details step so both
// speak the same visual language. Controlled — parent owns the value object.
const ReminderDetailsEditor = ({ value, onChange, autoFocus = false }) => {
  const { theme, isDark } = useTheme();
  const { title = '', duration = 30, icon = 'notifications', color = '#3B82F6' } = value || {};
  const inputBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)';

  const [showWheel, setShowWheel] = useState(false);

  const set = (patch) => onChange?.({ ...value, ...patch });

  const bump = (dir) => {
    hapticFeedback.selection();
    set({ duration: stepDuration(duration, dir) });
  };

  // Countdown picker holds a duration as a time-of-day (6h45m => 06:45).
  const durationAsDate = new Date(2000, 0, 1, Math.floor(duration / 60), duration % 60, 0);

  return (
    <View>
      {/* Title */}
      <Text style={[styles.label, { color: theme.textSecondary }]}>What is it</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: theme.border }]}
        placeholder="e.g. Eat breakfast, Take a walk..."
        placeholderTextColor={theme.textTertiary}
        value={title}
        onChangeText={(t) => set({ title: t })}
        autoFocus={autoFocus}
        maxLength={80}
      />

      {/* Duration */}
      <Text style={[styles.label, { color: theme.textSecondary, marginTop: 22 }]}>How long it takes</Text>
      <View style={[styles.stepperRow, { backgroundColor: inputBg, borderColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => bump(-1)}
          style={[styles.stepBtn, { borderColor: theme.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="remove" size={22} color={color} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stepValueWrap}
          onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }}
          activeOpacity={0.7}
        >
          <Text style={[styles.stepValue, { color: theme.text }]}>{formatDuration(duration)}</Text>
          <Text style={[styles.stepHint, { color: color }]}>
            {showWheel ? 'done' : 'tap to set exact'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => bump(1)}
          style={[styles.stepBtn, { borderColor: theme.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="add" size={22} color={color} />
        </TouchableOpacity>
      </View>

      {/* Exact hours + minutes wheel (tap the number). iOS countdown picker. */}
      {showWheel && Platform.OS === 'ios' && (
        <View style={[styles.wheelCard, { backgroundColor: inputBg, borderColor: theme.border }]}>
          <DateTimePicker
            value={durationAsDate}
            mode="countdown"
            display="spinner"
            minuteInterval={5}
            textColor={theme.text}
            style={{ alignSelf: 'stretch' }}
            onChange={(_, selected) => {
              if (selected) set({ duration: clampDuration(selected.getHours() * 60 + selected.getMinutes()) });
            }}
          />
        </View>
      )}
      <View style={styles.chipsRow}>
        {DURATION_PRESETS.map((m) => {
          const active = clampDuration(duration) === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => { hapticFeedback.light(); set({ duration: m }); }}
              style={[styles.durChip, { backgroundColor: active ? color + '20' : inputBg, borderColor: active ? color : theme.border }]}
            >
              <Text style={[styles.durChipText, { color: active ? color : theme.textSecondary }]}>
                {m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Icon */}
      <Text style={[styles.label, { color: theme.textSecondary, marginTop: 22 }]}>Icon</Text>
      <View style={styles.iconGrid}>
        {ICON_OPTIONS.map((ic) => (
          <TouchableOpacity
            key={ic}
            onPress={() => { hapticFeedback.light(); set({ icon: ic }); }}
            style={[styles.iconBtn, { backgroundColor: icon === ic ? color + '20' : inputBg, borderColor: icon === ic ? color : 'transparent' }]}
          >
            <MaterialIcons name={ic} size={22} color={icon === ic ? color : theme.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Color */}
      <Text style={[styles.label, { color: theme.textSecondary, marginTop: 22 }]}>Color</Text>
      <View style={styles.colorRow}>
        {COLOR_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => { hapticFeedback.light(); set({ color: c }); }}
            style={[styles.colorCircle, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff' }]}
          >
            {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    fontSize: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 8,
  },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueWrap: { flex: 1, alignItems: 'center' },
  stepValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  stepHint: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  wheelCard: { borderRadius: 14, borderWidth: 1, marginTop: 10, paddingVertical: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  durChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  durChipText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  colorRow: { flexDirection: 'row', gap: 12 },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReminderDetailsEditor;
