import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const CalendarView = ({ todos, onTodoAdd, onTodoComplete, onTodoDelete, onDateSelect }) => {
  const { theme } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return todos.filter(todo => {
      if (todo.scheduledDate) {
        return todo.scheduledDate === dateString;
      }
      // If no scheduled date, check creation date
      const createdDate = new Date(todo.createdAt).toISOString().split('T')[0];
      return createdDate === dateString;
    });
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const dayTasks = getTasksForDate(current);
      const completedTasks = dayTasks.filter(task => task.completed).length;
      const totalTasks = dayTasks.length;
      
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString(),
        isSelected: current.toDateString() === selectedDate.toDateString(),
        taskCount: totalTasks,
        completedCount: completedTasks,
        tasks: dayTasks
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    hapticFeedback.light();
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const selectDate = (date) => {
    hapticFeedback.light();
    setSelectedDate(date);
    onDateSelect && onDateSelect(date);
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    
    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      scheduledDate: selectedDate.toISOString().split('T')[0],
      points: Math.floor(Math.random() * 50) + 10, // Random points 10-60
    };
    
    await onTodoAdd(newTask);
    setNewTaskText('');
    setShowAddModal(false);
    hapticFeedback.success();
  };

  const TaskDot = ({ count, completed, size = 6 }) => {
    if (count === 0) return null;
    
    const completionRatio = completed / count;
    let color = theme.error; // Red for incomplete
    if (completionRatio === 1) color = theme.success; // Green for all complete
    else if (completionRatio > 0.5) color = theme.warning; // Orange for mostly complete
    
    return (
      <View style={[
        styles.taskDot, 
        { 
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2
        }
      ]} />
    );
  };

  const renderCalendarDay = (day, index) => {
    const isDisabled = !day.isCurrentMonth;
    const textColor = isDisabled 
      ? theme.textTertiary 
      : day.isToday 
        ? theme.primary 
        : theme.text;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.calendarDay,
          day.isSelected && { backgroundColor: theme.primary + '20' },
          day.isToday && { borderColor: theme.primary, borderWidth: 2 },
        ]}
        onPress={() => !isDisabled && selectDate(day.date)}
        disabled={isDisabled}
      >
        <Text style={[styles.dayNumber, { color: textColor }]}>
          {day.date.getDate()}
        </Text>
        
        {day.taskCount > 0 && (
          <View style={styles.taskIndicator}>
            <TaskDot count={day.taskCount} completed={day.completedCount} />
            {day.taskCount > 1 && (
              <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
                {day.taskCount}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSelectedDateTasks = () => {
    const selectedTasks = getTasksForDate(selectedDate);
    
    if (selectedTasks.length === 0) {
      return (
        <BlurView intensity={20} tint="light" style={styles.emptyTasks}>
          <MaterialIcons name="event-available" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyTasksText, { color: theme.textSecondary }]}>
            No tasks for this day
          </Text>
          <TouchableOpacity
            style={[styles.addTaskButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
            <Text style={styles.addTaskButtonText}>Add Task</Text>
          </TouchableOpacity>
        </BlurView>
      );
    }

    return (
      <View style={styles.tasksContainer}>
        <View style={styles.tasksHeader}>
          <Text style={[styles.tasksTitle, { color: theme.text }]}>
            Tasks for {selectedDate.toLocaleDateString()}
          </Text>
          <TouchableOpacity
            style={[styles.addTaskIconButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
          {selectedTasks.map((task) => (
            <BlurView key={task.id} intensity={20} tint="light" style={styles.taskItem}>
              <TouchableOpacity
                style={styles.taskCheckbox}
                onPress={() => !task.completed && onTodoComplete(task.id)}
              >
                <MaterialIcons
                  name={task.completed ? "check-circle" : "radio-button-unchecked"}
                  size={24}
                  color={task.completed ? theme.success : theme.textSecondary}
                />
              </TouchableOpacity>
              
              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskText,
                  { 
                    color: task.completed ? theme.textSecondary : theme.text,
                    textDecorationLine: task.completed ? 'line-through' : 'none'
                  }
                ]}>
                  {task.text}
                </Text>
                {task.points && (
                  <Text style={[styles.taskPoints, { color: theme.primary }]}>
                    +{task.points} pts
                  </Text>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Task',
                    'Are you sure you want to delete this task?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => onTodoDelete(task.id) }
                    ]
                  );
                }}
              >
                <MaterialIcons name="delete-outline" size={20} color={theme.error} />
              </TouchableOpacity>
            </BlurView>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <BlurView intensity={18} tint="light" style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth(-1)}
        >
          <MaterialIcons name="chevron-left" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateMonth(1)}
        >
          <MaterialIcons name="chevron-right" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Day Names */}
      <View style={styles.dayNamesRow}>
        {dayNames.map((day) => (
          <Text key={day} style={[styles.dayName, { color: theme.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {getCalendarDays().map(renderCalendarDay)}
      </View>

      {/* Selected Date Tasks */}
      <View style={styles.selectedDateSection}>
        {renderSelectedDateTasks()}
      </View>

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <BlurView intensity={100} tint="light" style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Add Task for {selectedDate.toLocaleDateString()}
            </Text>
            <TouchableOpacity onPress={handleAddTask}>
              <Text style={[styles.saveButton, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TextInput
              style={[styles.taskInput, { 
                backgroundColor: theme.verseBackground,
                color: theme.text,
                borderColor: theme.border
              }]}
              placeholder="What do you need to do?"
              placeholderTextColor={theme.textSecondary}
              value={newTaskText}
              onChangeText={setNewTaskText}
              multiline
              autoFocus
            />
          </View>
        </BlurView>
      </Modal>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    marginBottom: 20,
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  taskIndicator: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDot: {
    marginRight: 2,
  },
  taskCount: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  selectedDateSection: {
    flex: 1,
    minHeight: 200,
  },
  emptyTasks: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyTasksText: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addTaskButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  tasksContainer: {
    flex: 1,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  addTaskIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tasksList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  taskCheckbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 14,
    marginBottom: 2,
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  taskInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default CalendarView;
