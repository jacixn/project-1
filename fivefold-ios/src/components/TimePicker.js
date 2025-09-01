import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const TimePicker = ({ visible, onClose, onTimeSelected, currentTime, title }) => {
  const { theme } = useTheme();
  const [selectedHour, setSelectedHour] = useState(parseInt(currentTime.split(':')[0]));
  const [selectedMinute, setSelectedMinute] = useState(parseInt(currentTime.split(':')[1]));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(300);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

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

  const formatTimeForDisplay = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
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
    <Modal visible={visible} animationType="fade" transparent={true}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
              backgroundColor: theme.background,
            }
          ]}
        >
          <SafeAreaView style={styles.modalContent}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border + '50' }]}>
              <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                <MaterialIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Tap to select prayer time
                </Text>
              </View>
              <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Enhanced Time Display */}
            <View style={[styles.timeDisplayContainer, { backgroundColor: theme.card + '95' }]}>
              <View style={styles.timeDisplay}>
                <MaterialIcons name="schedule" size={28} color={theme.primary} />
                <View style={styles.timeDisplayContent}>
                  <Text style={[styles.timeText, { color: theme.text }]}>
                    {formatDisplayTime(selectedHour, selectedMinute)}
                  </Text>
                  <Text style={[styles.timeSubtext, { color: theme.textSecondary }]}>
                    {formatTimeForDisplay(selectedHour, selectedMinute)} • 24h format
                  </Text>
                </View>
              </View>
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

            {/* Enhanced Time Presets */}
            <View style={styles.presetsContainer}>
              <Text style={[styles.presetsTitle, { color: theme.text }]}>📅 Common Prayer Times</Text>
              <View style={styles.presetsGrid}>
                {[
                  { time: '05:30', label: 'Dawn', desc: '5:30 AM' },
                  { time: '06:00', label: 'Morning', desc: '6:00 AM' },
                  { time: '07:00', label: 'Breakfast', desc: '7:00 AM' },
                  { time: '12:00', label: 'Noon', desc: '12:00 PM' },
                  { time: '17:30', label: 'Sunset', desc: '5:30 PM' },
                  { time: '18:00', label: 'Evening', desc: '6:00 PM' },
                  { time: '20:00', label: 'Night', desc: '8:00 PM' },
                  { time: '21:00', label: 'Bedtime', desc: '9:00 PM' },
                ].map((preset) => (
                  <TouchableOpacity
                    key={preset.time}
                    style={[
                      styles.presetButton,
                      {
                        backgroundColor: theme.surface + '90',
                        borderColor: theme.border + '30'
                      }
                    ]}
                    onPress={() => {
                      const [hour, minute] = preset.time.split(':').map(Number);
                      setSelectedHour(hour);
                      setSelectedMinute(minute);
                      hapticFeedback.light();
                    }}
                  >
                    <Text style={[styles.presetLabel, { color: theme.primary }]}>{preset.label}</Text>
                    <Text style={[styles.presetDesc, { color: theme.textSecondary }]}>{preset.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '70%',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeDisplayContainer: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  timeDisplayContent: {
    flex: 1,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  timeSubtext: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  picker: {
    maxHeight: 180,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  pickerContent: {
    paddingVertical: 12,
  },
  pickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 12,
  },
  pickerItemText: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  separator: {
    width: 1,
    marginHorizontal: 24,
    opacity: 0.3,
  },
  presetsContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  presetsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  presetButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  presetDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TimePicker;
