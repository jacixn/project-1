import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const TimePicker = ({ visible, onClose, onTimeSelected, currentTime, title }) => {
  const { theme } = useTheme();
  const [selectedHour, setSelectedHour] = useState(parseInt(currentTime.split(':')[0]));
  const [selectedMinute, setSelectedMinute] = useState(parseInt(currentTime.split(':')[1]));

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleSave = () => {
    const formattedTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onTimeSelected(formattedTime);
    hapticFeedback.success();
    onClose();
  };

  const formatDisplayTime = (hour, minute) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const NumberPicker = ({ items, selectedValue, onValueChange, label }) => (
    <View style={styles.pickerContainer}>
      <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>{label}</Text>
      <ScrollView 
        style={[styles.picker, { backgroundColor: theme.surface }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerContent}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.pickerItem,
              selectedValue === item && { backgroundColor: theme.primary + '20' }
            ]}
            onPress={() => {
              hapticFeedback.light();
              onValueChange(item);
            }}
          >
            <Text
              style={[
                styles.pickerItemText,
                { color: selectedValue === item ? theme.primary : theme.text }
              ]}
            >
              {item.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.cancelButton, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Time Display */}
        <View style={[styles.timeDisplay, { backgroundColor: theme.card }]}>
          <MaterialIcons name="access-time" size={24} color={theme.primary} />
          <Text style={[styles.timeText, { color: theme.text }]}>
            {formatDisplayTime(selectedHour, selectedMinute)}
          </Text>
        </View>

        {/* Time Pickers */}
        <View style={styles.pickersContainer}>
          <NumberPicker
            items={hours}
            selectedValue={selectedHour}
            onValueChange={setSelectedHour}
            label="Hour"
          />
          
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          
          <NumberPicker
            items={minutes}
            selectedValue={selectedMinute}
            onValueChange={setSelectedMinute}
            label="Minute"
          />
        </View>

        {/* Quick Time Presets */}
        <View style={[styles.presetsContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.presetsTitle, { color: theme.text }]}>Quick Select</Text>
          <View style={styles.presetsGrid}>
            {[
              { time: '06:00', label: '6:00 AM' },
              { time: '07:00', label: '7:00 AM' },
              { time: '12:00', label: '12:00 PM' },
              { time: '18:00', label: '6:00 PM' },
              { time: '20:00', label: '8:00 PM' },
              { time: '21:00', label: '9:00 PM' },
            ].map((preset) => (
              <TouchableOpacity
                key={preset.time}
                style={[styles.presetButton, { backgroundColor: theme.surface }]}
                onPress={() => {
                  const [hour, minute] = preset.time.split(':').map(Number);
                  setSelectedHour(hour);
                  setSelectedMinute(minute);
                  hapticFeedback.light();
                }}
              >
                <Text style={[styles.presetText, { color: theme.text }]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pickersContainer: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: 20,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  picker: {
    maxHeight: 200,
    borderRadius: 12,
  },
  pickerContent: {
    paddingVertical: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 18,
    fontWeight: '500',
  },
  separator: {
    width: 1,
    marginHorizontal: 20,
  },
  presetsContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TimePicker;
