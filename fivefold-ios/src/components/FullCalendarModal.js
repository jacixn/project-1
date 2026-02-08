import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { scoreTask } from '../utils/todoScorer';
import { getStoredData } from '../utils/localStorage';

const FullCalendarModal = ({ visible, onClose, onTaskAdd, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    const defaultTime = new Date();
    defaultTime.setHours(12, 0, 0, 0); // Default to noon
    return defaultTime;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderBefore, setReminderBefore] = useState(60); // 60 minutes = 1 hour default

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate years from current year to 2030
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 2030 - currentYear + 1 }, (_, i) => currentYear + i);

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days for selected month
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateSelect = (day) => {
    if (!day) return;
    
    hapticFeedback.light();
    const date = new Date(selectedYear, selectedMonth, day);
    setSelectedDate(date);
    setShowTaskInput(true);
    // Reset time to default when selecting new date
    const defaultTime = new Date();
    defaultTime.setHours(12, 0, 0, 0);
    setSelectedTime(defaultTime);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const scheduleTaskNotification = async (task, taskDateTime) => {
    try {
      // Check if task reminders are enabled in settings
      const notificationSettings = await getStoredData('notificationSettings') || {};
      if (notificationSettings.taskReminders === false || notificationSettings.pushNotifications === false) {
        console.log('Task reminders are disabled, skipping notification');
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Cancel any existing notification for this task
      try {
        await Notifications.cancelScheduledNotificationAsync(task.id);
      } catch (cancelError) {
        // Ignore cancel errors
      }

      const notifyTime = new Date(taskDateTime.getTime() - reminderBefore * 60 * 1000);
      
      if (notifyTime > new Date()) {
        const reminderText = reminderBefore >= 60 
          ? `${Math.floor(reminderBefore / 60)} hour${reminderBefore >= 120 ? 's' : ''}` 
          : `${reminderBefore} minutes`;

        try {
          await Notifications.scheduleNotificationAsync({
            identifier: task.id,
            content: {
              title: 'Task Reminder',
              body: `"${task.text}" is scheduled in ${reminderText}`,
              data: { type: 'task_reminder', taskId: task.id },
              sound: notificationSettings.sound !== false ? 'default' : null,
            },
            trigger: { date: notifyTime },
          });
          console.log('✅ Task notification scheduled for:', notifyTime);
        } catch (scheduleError) {
          console.warn('Failed to schedule notification:', scheduleError);
          // Don't throw - notification failure shouldn't break task creation
        }
      }
    } catch (error) {
      console.error('Error in scheduleTaskNotification:', error);
      // Don't throw - let task creation continue
    }
  };

  const handleTaskSubmit = async () => {
    if (!taskText.trim()) {
      Alert.alert('Error', 'Please enter a task');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Combine date and time first
      const taskDateTime = new Date(selectedDate);
      taskDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      
      // Try to get AI scoring, but fallback if it fails
      let scoreResult = { points: 1000, tier: 'mid', reasoning: 'Default scoring', timeEstimate: '30 min' };
      try {
        scoreResult = await scoreTask(taskText.trim());
      } catch (scoreError) {
        console.warn('AI scoring failed, using defaults:', scoreError.message);
        // Continue with default score
      }
      
      // Create the task with scheduled date and time
      const newTask = {
        id: Date.now().toString(),
        text: taskText.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        scheduledDate: selectedDate.toISOString().split('T')[0],
        scheduledTime: `${String(selectedTime.getHours()).padStart(2, '0')}:${String(selectedTime.getMinutes()).padStart(2, '0')}`,
        scheduledDateTime: taskDateTime.toISOString(),
        reminderBefore: reminderBefore,
        points: scoreResult.points || 1000,
        tier: scoreResult.tier || 'mid',
        reasoning: scoreResult.reasoning || '',
        timeEstimate: scoreResult.timeEstimate || '',
      };

      // Add task to parent
      await onTaskAdd(newTask);
      
      // Success! Reset state first
      setIsAnalyzing(false);
      setTaskText('');
      setSelectedDate(null);
      setShowTaskInput(false);
      
      // Haptic feedback
      hapticFeedback.success?.();
      
      // Close modal with a small delay to ensure state updates complete
      setTimeout(() => {
        onClose();
        
        // Schedule notification AFTER modal is closed (non-blocking)
        setTimeout(() => {
          scheduleTaskNotification(newTask, taskDateTime).catch(() => {});
        }, 300);
      }, 50);
      
    } catch (error) {
      console.error('Error creating task:', error);
      setIsAnalyzing(false);
      Alert.alert('Error', error.message || 'Failed to create task. Please try again.');
    }
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();

  const content = (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="chevron-left" size={30} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Schedule a Task
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Year Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Year</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.yearScroll}
            >
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearButton,
                    year === selectedYear && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedYear(year);
                  }}
                >
                  <Text
                    style={[
                      styles.yearText,
                      { color: year === selectedYear ? '#fff' : theme.text }
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Month Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Month</Text>
            <View style={styles.monthGrid}>
              {monthNames.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.monthButton,
                    { backgroundColor: `${theme.primary}20` },
                    index === selectedMonth && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => {
                    hapticFeedback.light();
                    setSelectedMonth(index);
                  }}
                >
                  <Text
                    style={[
                      styles.monthText,
                      { color: index === selectedMonth ? '#fff' : theme.text }
                    ]}
                  >
                    {month.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calendar Grid */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
            
            {/* Day names */}
            <View style={styles.dayNamesRow}>
              {dayNames.map((day) => (
                <Text key={day} style={[styles.dayName, { color: theme.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar days */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.emptyDay} />;
                }

                const date = new Date(selectedYear, selectedMonth, day);
                const isToday = 
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear();
                const isSelected = 
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();
                const isPast = date < today && !isToday;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      { backgroundColor: `${theme.primary}10` },
                      isToday && { borderColor: theme.primary, borderWidth: 2 },
                      isSelected && { backgroundColor: theme.primary },
                      isPast && { opacity: 0.4 }
                    ]}
                    onPress={() => handleDateSelect(day)}
                    disabled={isPast}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? '#fff' : theme.text },
                        isPast && { color: theme.textTertiary }
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selected Date Display */}
          {selectedDate && (
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.selectedDateCard}>
              <MaterialIcons name="event" size={24} color={theme.primary} />
              <Text style={[styles.selectedDateText, { color: theme.text }]}>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </BlurView>
          )}
        </ScrollView>

        {/* Task Input Modal - Full Screen Beautiful Design */}
        <Modal
          visible={showTaskInput}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowTaskInput(false)}
        >
          <SafeAreaView style={[styles.taskModalContainer, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.taskModalHeader, { borderBottomColor: `${theme.text}15`, backgroundColor: theme.background }]}>
              <TouchableOpacity 
                onPress={() => {
                  hapticFeedback.light();
                  setShowTaskInput(false);
                  setTaskText('');
                  setShowTimePicker(false);
                }}
                style={styles.taskModalCloseBtn}
                disabled={isAnalyzing}
              >
                <MaterialIcons name="close" size={26} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.taskModalTitle, { color: theme.text }]}>New Task</Text>
              <View style={styles.taskModalCloseBtn} />
            </View>

            <ScrollView 
              style={styles.taskModalContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Date Badge */}
              <View style={[styles.taskDateBadge, { backgroundColor: `${theme.primary}15` }]}>
                <MaterialIcons name="event" size={20} color={theme.primary} />
                <Text style={[styles.taskDateText, { color: theme.primary }]}>
                  {selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>

              {/* Task Input Section */}
              <View style={styles.taskSection}>
                <Text style={[styles.taskSectionTitle, { color: theme.text }]}>
                  What's the task?
                </Text>
                <TextInput
                  style={[
                    styles.taskTextInput,
                    { 
                      color: theme.text,
                      backgroundColor: theme.card,
                      borderColor: `${theme.primary}40`
                    }
                  ]}
                  placeholder="Enter your task here..."
                  placeholderTextColor={theme.textTertiary}
                  value={taskText}
                  onChangeText={setTaskText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isAnalyzing}
                />
              </View>

              {/* Time Section */}
              <View style={styles.taskSection}>
                <Text style={[styles.taskSectionTitle, { color: theme.text }]}>
                  What time?
                </Text>
                
                {/* Time Display */}
                <View style={[styles.timeDisplayCard, { backgroundColor: theme.card }]}>
                  <View style={styles.timeDisplayContent}>
                    <MaterialIcons name="schedule" size={28} color={theme.primary} />
                    <Text style={[styles.timeDisplayText, { color: theme.text }]}>
                      {formatTime(selectedTime)}
                    </Text>
                  </View>
                  
                  {/* Inline Time Picker for iOS */}
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) setSelectedTime(date);
                      }}
                      style={styles.inlineTimePicker}
                      textColor={theme.text}
                    />
                  </View>
                </View>
              </View>

              {/* Reminder Section */}
              <View style={styles.taskSection}>
                <Text style={[styles.taskSectionTitle, { color: theme.text }]}>
                  Remind me
                </Text>
                
                <View style={styles.reminderGrid}>
                  {[
                    { value: 60, label: '1 hour before', icon: 'alarm' },
                    { value: 360, label: '6 hours before', icon: 'notifications-active' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reminderCard,
                        {
                          backgroundColor: reminderBefore === option.value 
                            ? theme.primary 
                            : theme.card,
                          borderColor: reminderBefore === option.value 
                            ? theme.primary 
                            : `${theme.text}15`,
                        }
                      ]}
                      onPress={() => {
                        hapticFeedback.medium();
                        setReminderBefore(option.value);
                      }}
                      disabled={isAnalyzing}
                    >
                      <MaterialIcons 
                        name={option.icon} 
                        size={24} 
                        color={reminderBefore === option.value ? '#FFFFFF' : theme.primary} 
                      />
                      <Text style={[
                        styles.reminderCardText,
                        { color: reminderBefore === option.value ? '#FFFFFF' : theme.text }
                      ]}>
                        {option.label}
                      </Text>
                      {reminderBefore === option.value && (
                        <View style={styles.reminderCheckmark}>
                          <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Summary */}
              <View style={[styles.taskSummary, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}>
                <MaterialIcons name="info-outline" size={18} color={theme.primary} />
                <Text style={[styles.taskSummaryText, { color: theme.textSecondary }]}>
                  You'll receive a notification {reminderBefore === 60 ? '1 hour' : '6 hours'} before{' '}
                  <Text style={{ fontWeight: '700', color: theme.text }}>
                    {formatTime(selectedTime)}
                  </Text>
                </Text>
              </View>

              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action Button */}
            <View style={[styles.taskModalFooter, { backgroundColor: theme.background }]}>
              <TouchableOpacity
                style={[
                  styles.createTaskButton,
                  { backgroundColor: theme.primary },
                  (!taskText.trim() || isAnalyzing) && { opacity: 0.5 }
                ]}
                onPress={handleTaskSubmit}
                disabled={!taskText.trim() || isAnalyzing}
              >
                {isAnalyzing ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.createTaskButtonText}>Creating Task...</Text>
                  </View>
                ) : (
                  <>
                    <MaterialIcons name="add-task" size={22} color="#FFFFFF" />
                    <Text style={styles.createTaskButtonText}>Create Task</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
  );

  if (asScreen) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      {content}
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
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  yearScroll: {
    flexDirection: 'row',
  },
  yearButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  monthButton: {
    width: '22%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayButton: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  taskInputOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInputCard: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
  },
  taskInputTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  taskInputSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  taskInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  taskInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  taskInputButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  taskInputButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // New Beautiful Task Modal Styles
  taskModalContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  taskModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  taskModalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  taskModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  taskDateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskSection: {
    marginBottom: 20,
  },
  taskSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  taskTextInput: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    lineHeight: 22,
  },
  timeDisplayCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  timeDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  timeDisplayText: {
    fontSize: 28,
    fontWeight: '700',
  },
  timePickerContainer: {
    alignItems: 'center',
    marginTop: -8,
  },
  inlineTimePicker: {
    height: 150,
    width: '100%',
  },
  reminderGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  reminderCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  reminderCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  taskSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  taskSummaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  taskModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  createTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createTaskButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default FullCalendarModal;




