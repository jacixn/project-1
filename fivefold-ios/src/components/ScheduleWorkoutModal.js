import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import WorkoutService from '../services/workoutService';
import { hapticFeedback } from '../utils/haptics';
import * as Notifications from 'expo-notifications';
import { getStoredData } from '../utils/localStorage';

const DAYS_OF_WEEK = [
  { id: 0, short: 'S', name: 'Sunday' },
  { id: 1, short: 'M', name: 'Monday' },
  { id: 2, short: 'T', name: 'Tuesday' },
  { id: 3, short: 'W', name: 'Wednesday' },
  { id: 4, short: 'T', name: 'Thursday' },
  { id: 5, short: 'F', name: 'Friday' },
  { id: 6, short: 'S', name: 'Saturday' },
];

const ScheduleWorkoutModal = ({ visible, onClose, template, onScheduled }) => {
  const { theme, isDark } = useTheme();
  
  const [scheduleType, setScheduleType] = useState('recurring'); // 'recurring' or 'one-time'
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notifyBefore, setNotifyBefore] = useState(60); // 60 minutes default

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setScheduleType('recurring');
      setSelectedDays([]);
      setSelectedDate(new Date());
      // Default time to 6:00 PM
      const defaultTime = new Date();
      defaultTime.setHours(18, 0, 0, 0);
      setSelectedTime(defaultTime);
      setNotifyBefore(60);
    }
  }, [visible]);

  const toggleDay = (dayId) => {
    hapticFeedback.light();
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const scheduleNotification = async (schedule) => {
    try {
      // Check if workout reminders are enabled in settings
      const notificationSettings = await getStoredData('notificationSettings') || {};
      if (notificationSettings.workoutReminders === false || notificationSettings.pushNotifications === false) {
        console.log('Workout reminders are disabled, skipping notification');
        return;
      }

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Cancel any existing notifications for this schedule
      for (let i = 0; i <= 6; i++) {
        await Notifications.cancelScheduledNotificationAsync(`${schedule.id}_${i}`).catch(() => {});
      }
      await Notifications.cancelScheduledNotificationAsync(schedule.id).catch(() => {});
      
      // Also cancel any stale workout reminder notifications from previous schedules
      try {
        const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notif of allScheduled) {
          if (notif.content?.data?.type === 'workout_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(() => {});
          }
        }
      } catch (e) {
        console.log('Could not clear old workout notifications:', e);
      }

      const notifyMinutes = schedule.notifyBefore || 60;
      const [hours, minutes] = schedule.time.split(':').map(Number);

      // Calculate notification time (X minutes before workout)
      let notifyHours = hours;
      let notifyMins = minutes - notifyMinutes;
      
      if (notifyMins < 0) {
        notifyHours -= Math.ceil(Math.abs(notifyMins) / 60);
        notifyMins = 60 + (notifyMins % 60);
        if (notifyMins === 60) notifyMins = 0;
      }
      if (notifyHours < 0) {
        notifyHours += 24;
      }

      const reminderText = notifyMinutes >= 60 
        ? `${Math.floor(notifyMinutes / 60)} hour${notifyMinutes >= 120 ? 's' : ''}` 
        : `${notifyMinutes} minutes`;

      const soundSetting = notificationSettings.sound !== false ? 'default' : null;

      if (schedule.type === 'recurring') {
        // Schedule recurring notifications for each day
        // Using weekly trigger with proper format
        for (const day of schedule.days) {
          console.log(`📅 Scheduling notification for day ${day} at ${notifyHours}:${notifyMins}`);
          
          await Notifications.scheduleNotificationAsync({
            identifier: `${schedule.id}_${day}`,
            content: {
              title: 'Workout Reminder',
              body: `${schedule.templateName} starts in ${reminderText}!`,
              data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
              sound: soundSetting,
            },
            trigger: {
              type: 'weekly',
              weekday: day + 1, // Expo uses 1=Sunday, 2=Monday, etc.
              hour: notifyHours,
              minute: notifyMins,
              repeats: true,
            },
          });
        }
      } else {
        // One-time notification
        // Parse date parts manually to avoid UTC timezone issues
        const dateParts = schedule.date.split('-').map(Number);
        const workoutDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes, 0, 0);
        
        const notifyTime = new Date(workoutDateTime.getTime() - notifyMinutes * 60 * 1000);
        
        if (notifyTime > new Date()) {
          console.log(`📅 Scheduling one-time notification for ${notifyTime.toLocaleString()}`);
          
          await Notifications.scheduleNotificationAsync({
            identifier: schedule.id,
            content: {
              title: 'Workout Reminder',
              body: `${schedule.templateName} starts in ${reminderText}!`,
              data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
              sound: soundSetting,
            },
            trigger: notifyTime,
          });
        } else {
          console.log(`⏭️ Skipping notification - notify time ${notifyTime.toLocaleString()} is in the past`);
        }
      }

      console.log('✅ Notifications scheduled for:', schedule.templateName);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      // Don't throw - notification failure shouldn't break scheduling
    }
  };

  const handleSave = async () => {
    if (!template) return;

    // Validation
    if (scheduleType === 'recurring' && selectedDays.length === 0) {
      Alert.alert('Select Days', 'Please select at least one day for your recurring workout.');
      return;
    }

    if (scheduleType === 'one-time') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        Alert.alert('Invalid Date', 'Please select a date in the future.');
        return;
      }
    }

    hapticFeedback.success();

    const timeString = `${String(selectedTime.getHours()).padStart(2, '0')}:${String(selectedTime.getMinutes()).padStart(2, '0')}`;

    const schedule = {
      templateId: template.id,
      templateName: template.name,
      type: scheduleType,
      time: timeString,
      notifyBefore: notifyBefore,
      ...(scheduleType === 'recurring' 
        ? { days: selectedDays }
        : { date: selectedDate.toISOString().split('T')[0] }
      ),
    };

    try {
      const savedSchedule = await WorkoutService.addScheduledWorkout(schedule);
      
      // Schedule notifications
      await scheduleNotification(savedSchedule);
      
      if (onScheduled) {
        onScheduled(savedSchedule);
      }
      
      onClose();
      
      // Show success message
      const daysText = scheduleType === 'recurring'
        ? selectedDays.map(d => DAYS_OF_WEEK[d].name).join(', ')
        : formatDate(selectedDate);
      
      Alert.alert(
        '✅ Workout Scheduled!',
        `${template.name} scheduled for ${daysText} at ${formatTime(selectedTime)}.\n\nYou'll get a reminder ${notifyBefore} minutes before.`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to schedule workout. Please try again.');
    }
  };

  if (!template) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Schedule Workout</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={[styles.saveText, { color: theme.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Template Info */}
          <View style={[styles.templateCard, { backgroundColor: theme.card }]}>
            <View style={[styles.templateIcon, { backgroundColor: `${theme.primary}20` }]}>
              <MaterialIcons name="fitness-center" size={24} color={theme.primary} />
            </View>
            <View style={styles.templateInfo}>
              <Text style={[styles.templateName, { color: theme.text }]}>{template.name}</Text>
              <Text style={[styles.templateDetails, { color: theme.textSecondary }]}>
                {template.exercises?.length || 0} exercises
              </Text>
            </View>
          </View>

          {/* Schedule Type */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Schedule Type</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                { 
                  backgroundColor: scheduleType === 'recurring' ? theme.primary : theme.card,
                  borderColor: scheduleType === 'recurring' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => {
                hapticFeedback.light();
                setScheduleType('recurring');
              }}
            >
              <MaterialIcons 
                name="repeat" 
                size={20} 
                color={scheduleType === 'recurring' ? '#FFF' : theme.textSecondary} 
              />
              <Text style={[
                styles.typeButtonText,
                { color: scheduleType === 'recurring' ? '#FFF' : theme.text }
              ]}>
                Recurring
              </Text>
              <Text style={[
                styles.typeButtonSubtext,
                { color: scheduleType === 'recurring' ? 'rgba(255,255,255,0.8)' : theme.textTertiary }
              ]}>
                Every week
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                { 
                  backgroundColor: scheduleType === 'one-time' ? theme.primary : theme.card,
                  borderColor: scheduleType === 'one-time' ? theme.primary : theme.border,
                }
              ]}
              onPress={() => {
                hapticFeedback.light();
                setScheduleType('one-time');
              }}
            >
              <MaterialIcons 
                name="event" 
                size={20} 
                color={scheduleType === 'one-time' ? '#FFF' : theme.textSecondary} 
              />
              <Text style={[
                styles.typeButtonText,
                { color: scheduleType === 'one-time' ? '#FFF' : theme.text }
              ]}>
                One-Time
              </Text>
              <Text style={[
                styles.typeButtonSubtext,
                { color: scheduleType === 'one-time' ? 'rgba(255,255,255,0.8)' : theme.textTertiary }
              ]}>
                Specific date
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Selection (for recurring) */}
          {scheduleType === 'recurring' && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Repeat On</Text>
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.dayButton,
                      {
                        backgroundColor: selectedDays.includes(day.id) ? theme.primary : theme.card,
                        borderColor: selectedDays.includes(day.id) ? theme.primary : theme.border,
                      }
                    ]}
                    onPress={() => toggleDay(day.id)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      { color: selectedDays.includes(day.id) ? '#FFF' : theme.text }
                    ]}>
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedDays.length > 0 && (
                <Text style={[styles.selectedDaysText, { color: theme.textSecondary }]}>
                  {selectedDays.map(d => DAYS_OF_WEEK[d].name).join(', ')}
                </Text>
              )}
            </>
          )}

          {/* Date Selection (for one-time) */}
          {scheduleType === 'one-time' && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Date</Text>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="event" size={22} color={theme.primary} />
                <Text style={[styles.pickerText, { color: theme.text }]}>
                  {formatDate(selectedDate)}
                </Text>
                <MaterialIcons name="chevron-right" size={22} color={theme.textTertiary} />
              </TouchableOpacity>
            </>
          )}

          {/* Time Selection */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Time</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setShowTimePicker(true)}
          >
            <MaterialIcons name="schedule" size={22} color={theme.primary} />
            <Text style={[styles.pickerText, { color: theme.text }]}>
              {formatTime(selectedTime)}
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Notification Setting */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Reminder</Text>
          <View style={styles.reminderOptions}>
            {[30, 60, 120].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.reminderButton,
                  {
                    backgroundColor: notifyBefore === mins ? theme.primary : theme.card,
                    borderColor: notifyBefore === mins ? theme.primary : theme.border,
                  }
                ]}
                onPress={() => {
                  hapticFeedback.light();
                  setNotifyBefore(mins);
                }}
              >
                <Text style={[
                  styles.reminderButtonText,
                  { color: notifyBefore === mins ? '#FFF' : theme.text }
                ]}>
                  {mins === 60 ? '1 hour' : mins === 120 ? '2 hours' : `${mins} min`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.reminderHint, { color: theme.textSecondary }]}>
            You'll be notified {notifyBefore === 60 ? '1 hour' : notifyBefore === 120 ? '2 hours' : `${notifyBefore} minutes`} before your workout (only if not completed)
          </Text>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (date) setSelectedTime(date);
            }}
          />
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setSelectedDate(date);
            }}
          />
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    marginLeft: 14,
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
  },
  templateDetails: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  typeButtonSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedDaysText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  reminderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  reminderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});

export default ScheduleWorkoutModal;
