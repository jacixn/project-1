import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { DAY_SHORT } from '../services/reminderService';

const ICON_OPTIONS = [
  'notifications', 'restaurant', 'local-cafe', 'fitness-center',
  'self-improvement', 'water-drop', 'bedtime', 'medication',
  'school', 'work', 'pets', 'shopping-cart',
  'local-laundry-service', 'cleaning-services', 'call', 'email',
];

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#06B6D4', '#6366F1',
];

const CreateReminderModal = ({ visible, onClose, onSave, editingReminder }) => {
  const { theme, isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(new Date());
  const [type, setType] = useState('recurring');
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [icon, setIcon] = useState('notifications');
  const [color, setColor] = useState('#3B82F6');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title);
      const [h, m] = (editingReminder.time || '08:00').split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      setTime(d);
      setType(editingReminder.type || 'recurring');
      setDays(editingReminder.days || [0, 1, 2, 3, 4, 5, 6]);
      setIcon(editingReminder.icon || 'notifications');
      setColor(editingReminder.color || '#3B82F6');
    } else {
      setTitle('');
      const d = new Date();
      d.setHours(8, 0, 0, 0);
      setTime(d);
      setType('recurring');
      setDays([0, 1, 2, 3, 4, 5, 6]);
      setIcon('notifications');
      setColor('#3B82F6');
    }
  }, [editingReminder, visible]);

  const toggleDay = (dayIdx) => {
    hapticFeedback.light();
    setDays(prev =>
      prev.includes(dayIdx)
        ? prev.filter(d => d !== dayIdx)
        : [...prev, dayIdx].sort()
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;
    hapticFeedback.success();
    if (type === 'recurring' && days.length === 0) {
      return;
    }
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const saveData = {
      title: title.trim(),
      time: timeStr,
      type,
      days: type === 'one-time' ? [now.getDay()] : days,
      icon,
      color,
    };
    if (type === 'one-time') {
      saveData.date = todayStr;
    }
    onSave(saveData);
    onClose();
  };

  const selectPreset = (preset) => {
    hapticFeedback.light();
    if (preset === 'everyday') setDays([0, 1, 2, 3, 4, 5, 6]);
    else if (preset === 'weekdays') setDays([1, 2, 3, 4, 5]);
    else if (preset === 'weekends') setDays([0, 6]);
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)';
  const inputBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {editingReminder ? 'Edit Reminder' : 'New Reminder'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!title.trim() || (type === 'recurring' && days.length === 0)}
            style={[styles.headerBtn, { opacity: (title.trim() && !(type === 'recurring' && days.length === 0)) ? 1 : 0.4 }]}
          >
            <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: inputBg, borderColor: theme.border }]}
            placeholder="e.g. Eat dinner, Take a shower..."
            placeholderTextColor={theme.textTertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus={!editingReminder}
            maxLength={80}
          />

          {/* Time */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 24 }]}>Time</Text>
          <TouchableOpacity
            style={[styles.timeButton, { backgroundColor: inputBg, borderColor: theme.border }]}
            onPress={() => setShowTimePicker(true)}
          >
            <MaterialIcons name="schedule" size={20} color={color} />
            <Text style={[styles.timeText, { color: theme.text }]}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <MaterialIcons name="edit" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="spinner"
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowTimePicker(false);
                if (selected) setTime(selected);
              }}
              textColor={theme.text}
            />
          )}
          {Platform.OS === 'ios' && showTimePicker && (
            <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.doneBtn}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          )}

          {/* Type */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 24 }]}>Type</Text>
          <View style={styles.typeRow}>
            {['recurring', 'one-time'].map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { hapticFeedback.light(); setType(t); }}
                style={[
                  styles.typeBtn,
                  { backgroundColor: type === t ? color : inputBg, borderColor: type === t ? color : theme.border },
                ]}
              >
                <MaterialIcons
                  name={t === 'recurring' ? 'repeat' : 'looks-one'}
                  size={18}
                  color={type === t ? '#fff' : theme.textSecondary}
                />
                <Text style={[styles.typeBtnText, { color: type === t ? '#fff' : theme.text }]}>
                  {t === 'recurring' ? 'Recurring' : 'One-time'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Days (for recurring) */}
          {type === 'recurring' && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 24 }]}>Repeat on</Text>
              <View style={styles.presetsRow}>
                {[
                  { key: 'everyday', label: 'Every day' },
                  { key: 'weekdays', label: 'Weekdays' },
                  { key: 'weekends', label: 'Weekends' },
                ].map(p => {
                  const isActive =
                    (p.key === 'everyday' && days.length === 7) ||
                    (p.key === 'weekdays' && days.length === 5 && [1,2,3,4,5].every(d => days.includes(d))) ||
                    (p.key === 'weekends' && days.length === 2 && [0,6].every(d => days.includes(d)));
                  return (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => selectPreset(p.key)}
                      style={[styles.presetBtn, { backgroundColor: isActive ? color + '20' : inputBg, borderColor: isActive ? color : theme.border }]}
                    >
                      <Text style={[styles.presetText, { color: isActive ? color : theme.textSecondary }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.daysRow}>
                {DAY_SHORT.map((name, idx) => {
                  const selected = days.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => toggleDay(idx)}
                      style={[
                        styles.dayCircle,
                        { backgroundColor: selected ? color : inputBg, borderColor: selected ? color : theme.border },
                      ]}
                    >
                      <Text style={[styles.dayText, { color: selected ? '#fff' : theme.textSecondary }]}>
                        {name.charAt(0)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Icon */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 24 }]}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map(ic => (
              <TouchableOpacity
                key={ic}
                onPress={() => { hapticFeedback.light(); setIcon(ic); }}
                style={[
                  styles.iconBtn,
                  { backgroundColor: icon === ic ? color + '20' : inputBg, borderColor: icon === ic ? color : 'transparent' },
                ]}
              >
                <MaterialIcons name={ic} size={22} color={icon === ic ? color : theme.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Color */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 24 }]}>Color</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => { hapticFeedback.light(); setColor(c); }}
                style={[styles.colorCircle, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff' }]}
              >
                {color === c && <MaterialIcons name="check" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  body: { flex: 1 },
  bodyContent: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    fontSize: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  timeText: { flex: 1, fontSize: 16, fontWeight: '500' },
  doneBtn: { alignSelf: 'flex-end', padding: 8 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnText: { fontSize: 15, fontWeight: '500' },
  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText: { fontSize: 13, fontWeight: '500' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayText: { fontSize: 14, fontWeight: '600' },
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

export default CreateReminderModal;
