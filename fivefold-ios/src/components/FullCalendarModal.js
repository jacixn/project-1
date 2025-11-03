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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { scoreTask } from '../utils/todoScorer';

const FullCalendarModal = ({ visible, onClose, onTaskAdd }) => {
  const { theme, isDark } = useTheme();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

    try {
      setIsAnalyzing(true);
      
      // Use AI to analyze the task and get points
      const scoreResult = await scoreTask(taskText.trim());
      
      // Create the task with scheduled date
      const newTask = {
        id: Date.now().toString(),
        text: taskText.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        scheduledDate: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
        points: scoreResult.points,
        tier: scoreResult.tier,
        reasoning: scoreResult.reasoning,
        timeEstimate: scoreResult.timeEstimate,
      };

      hapticFeedback.success();
      onTaskAdd(newTask);
      
      // Reset and close
      setTaskText('');
      setSelectedDate(null);
      setShowTaskInput(false);
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create task. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Schedule a Task
          </Text>
          <View style={styles.closeButton} />
        </BlurView>

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

        {/* Task Input Modal */}
        {showTaskInput && (
          <Modal
            visible={showTaskInput}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTaskInput(false)}
          >
            <View style={styles.taskInputOverlay}>
              <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.taskInputCard}>
                <Text style={[styles.taskInputTitle, { color: theme.text }]}>
                  What do you want to do?
                </Text>
                <Text style={[styles.taskInputSubtitle, { color: theme.textSecondary }]}>
                  {selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>

                <TextInput
                  style={[
                    styles.taskInput,
                    { 
                      color: theme.text,
                      backgroundColor: `${theme.primary}10`,
                      borderColor: theme.primary
                    }
                  ]}
                  placeholder="e.g., Go shopping, Study for exam..."
                  placeholderTextColor={theme.textSecondary}
                  value={taskText}
                  onChangeText={setTaskText}
                  multiline
                  autoFocus
                  editable={!isAnalyzing}
                />

                <View style={styles.taskInputButtons}>
                  <TouchableOpacity
                    style={[styles.taskInputButton, { backgroundColor: theme.error }]}
                    onPress={() => {
                      hapticFeedback.light();
                      setShowTaskInput(false);
                      setTaskText('');
                    }}
                    disabled={isAnalyzing}
                  >
                    <Text style={styles.taskInputButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.taskInputButton, 
                      { backgroundColor: theme.primary },
                      isAnalyzing && { opacity: 0.6 }
                    ]}
                    onPress={handleTaskSubmit}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <View style={styles.analyzingContainer}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={[styles.taskInputButtonText, { marginLeft: 8 }]}>
                          Analyzing...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.taskInputButtonText}>Create Task</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </Modal>
        )}
      </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
});

export default FullCalendarModal;




