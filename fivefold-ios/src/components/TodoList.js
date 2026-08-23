import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Animated, Platform, DeviceEventEmitter } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { scoreTask } from '../utils/todoScorer';
import { hapticFeedback } from '../utils/haptics';
import DurationField from './DurationField';

// Liquid Glass Container - MUST be outside the main component to prevent re-creation on every render
const LiquidGlassTodoContainer = ({ children, isDark, theme }) => {
  if (!isLiquidGlassSupported) {
    return (
      <BlurView
        intensity={18}
        tint={isDark ? "dark" : "light"}
        style={[styles.container, {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.05)'
            : `${theme.primary}15`
        }]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <LiquidGlassView
      interactive={true}
      effect="clear"
      colorScheme="system"
      tintColor="rgba(255, 255, 255, 0.08)"
      style={styles.liquidGlassTodoCard}
    >
      {children}
    </LiquidGlassView>
  );
};

const TodoList = ({ todos, onTodoAdd, onTodoComplete, onTodoDelete, onViewAll }) => {
  const { theme, isDark, isBiblelyTheme } = useTheme();
  
  // For Biblely theme with wallpaper, use white text for better readability
  const textColor = isBiblelyTheme ? '#FFFFFF' : theme.text;
  const textSecondaryColor = isBiblelyTheme ? 'rgba(255,255,255,0.8)' : theme.textSecondary;
  const textTertiaryColor = isBiblelyTheme ? 'rgba(255,255,255,0.6)' : theme.textTertiary;
  
  // Text shadow for outline effect - warm burnt orange to match theme
  const textOutlineStyle = isBiblelyTheme ? {
    textShadowColor: theme.primaryDark || 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  } : {};
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [customDateTime, setCustomDateTime] = useState(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const floatingIdRef = useRef(0);

  // Open the quick-add form when launched from the "Add Task" home-screen widget.
  // Cold launch: App.js sets a global flag, checked once this list mounts.
  // Warm: App.js emits 'openQuickAddTodo' after navigating here.
  useEffect(() => {
    const openAdd = () => { setIsAdding(true); };
    if (global.__PENDING_ADD_TODO__) {
      global.__PENDING_ADD_TODO__ = false;
      setTimeout(openAdd, 250);
    }
    const sub = DeviceEventEmitter.addListener('openQuickAddTodo', () => {
      global.__PENDING_ADD_TODO__ = false;
      openAdd();
    });
    return () => sub.remove();
  }, []);

  const showFloatingPoints = useCallback((points, tierColor) => {
    const id = ++floatingIdRef.current;
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const scale = new Animated.Value(0.5);

    setFloatingPoints(prev => [...prev, { id, points, tierColor, opacity, translateY, scale }]);

    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 1200, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setFloatingPoints(prev => prev.filter(f => f.id !== id));
    });
  }, []);

  // How long it takes: 1 hr by default, 5-minute steps, quick picks. Rides on
  // the task as durationMinutes (My Week block, busy gaps, Calendar mirror).
  const [duration, setDuration] = useState(60);

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;

    hapticFeedback.light();
    const chosenDateTime = customDateTime;
    const chosenDuration = Math.max(5, Number(duration) || 60);

    const pendingTask = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      isAnalyzing: true,
      durationMinutes: chosenDuration,
      createdAt: new Date().toISOString()
    };
    
    // Add to pending queue immediately
    setPendingTasks(prev => [...prev, pendingTask]);
    
    // Clear input and close form immediately so user can add more
    setNewTodo('');
    setIsAdding(false);
    setCustomDateTime(null);
    setShowSchedulePicker(false);
    setDuration(60);

    // Run analysis in background
    try {
      const scoring = await scoreTask(pendingTask.text);
      
      const completedTodo = {
        id: pendingTask.id,
        text: pendingTask.text,
        points: scoring.points,
        tier: scoring.tier,
        source: scoring.source || 'ai',
        reasoning: scoring.reasoning || scoring.rationale || 'Smart analysis',
        timeEstimate: scoring.timeEstimate || 'Unknown',
        confidence: scoring.confidence || 85,
        completed: false,
        durationMinutes: chosenDuration,
        createdAt: pendingTask.createdAt
      };

      // If the user picked an exact date/time, attach it (skips the auto default
      // time in handleTodoAdd and places it on the calendar at this moment).
      if (chosenDateTime) {
        const d = chosenDateTime;
        completedTodo.scheduledDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        completedTodo.scheduledTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        completedTodo.scheduledDateTime = d.toISOString();
      }

      // Remove from pending and add to actual todos
      setPendingTasks(prev => prev.filter(t => t.id !== pendingTask.id));
      onTodoAdd(completedTodo);
      hapticFeedback.success(); // Success feedback when analysis completes
      
    } catch (error) {
      console.error('Error scoring task:', error);
      // Remove from pending on error
      setPendingTasks(prev => prev.filter(t => t.id !== pendingTask.id));
      hapticFeedback.error(); // Error feedback when something goes wrong
      Alert.alert('Task Scoring Unavailable', 'Unable to score this task right now. Please try again later.');
    }
  };

  // Filter active todos to only show upcoming tasks (within 7 days) or tasks without dates
  const activeTodos = todos.filter(t => {
    if (t.completed) return false;
    
    // If no scheduled date, always show it
    if (!t.scheduledDate) return true;
    
    // If has scheduled date, only show if it's within the next 7 days or overdue
    const scheduledDate = new Date(t.scheduledDate);
    scheduledDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = scheduledDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Show if overdue (negative days) or within next 7 days
    return diffDays <= 7;
  });

  // Count all active tasks (not just the filtered ones)
  const totalActiveTasks = todos.filter(t => !t.completed).length;
  const hiddenTasksCount = totalActiveTasks - activeTodos.length;

  return (
    <LiquidGlassTodoContainer isDark={isDark} theme={theme}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: textColor, ...textOutlineStyle }]}>To Do</Text>
        <TouchableOpacity 
          style={[styles.viewAllButton, { backgroundColor: `${theme.primary}20` }]}
          onPress={() => {
            hapticFeedback.light();
            onViewAll();
          }}
          accessibilityLabel="View all tasks"
          accessibilityRole="button"
        >
          <Text style={[styles.viewAllText, { color: theme.primary }]}>
            View all {totalActiveTasks > 0 && hiddenTasksCount > 0 ? `(${totalActiveTasks})` : ''}
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>
      
      {!isAdding ? (
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]} 
          onPress={() => { 
            hapticFeedback.light();
            setIsAdding(true); 
          }}
          accessibilityLabel="Add task"
          accessibilityRole="button"
        >
          <MaterialIcons name="add" size={24} color="#ffffff" />
          <Text style={[styles.addButtonText, { color: '#ffffff' }]}>Add Task</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addForm}>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.verseBackground, color: textColor, borderColor: theme.border, ...textOutlineStyle }]}
            placeholder="What do you need to do?"
            placeholderTextColor={theme.textSecondary}
            value={newTodo}
            onChangeText={setNewTodo}
            autoFocus
          />

          {/* Optional: pick an exact date & time (otherwise the default time is used) */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              if (!customDateTime) {
                const d = new Date();
                d.setHours(18, 0, 0, 0);
                if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
                setCustomDateTime(d);
              }
              setShowSchedulePicker(s => !s);
            }}
            style={[styles.scheduleRow, { borderColor: theme.border }]}
          >
            <MaterialIcons name="event" size={18} color={theme.primary} />
            <Text style={[styles.scheduleText, { color: customDateTime ? textColor : textTertiaryColor }]} numberOfLines={1}>
              {customDateTime
                ? customDateTime.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Set date & time (optional)'}
            </Text>
            {customDateTime && (
              <TouchableOpacity
                onPress={() => { hapticFeedback.light(); setCustomDateTime(null); setShowSchedulePicker(false); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={18} color={textTertiaryColor} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {/* How long will it take? 1 hr by default; - / + in 5-minute steps; quick picks */}
          <View style={styles.durationBlock}>
            <Text style={[styles.durationKicker, { color: textTertiaryColor }]}>How long?</Text>
            <DurationField value={duration} onChange={setDuration} accent={theme.primary} step={5} presets={[15, 30, 45, 60, 90, 120]} bleed={0} compact />
          </View>

          {showSchedulePicker && (
            <>
              <DateTimePicker
                value={customDateTime || new Date()}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowSchedulePicker(false);
                  if (selected) setCustomDateTime(selected);
                }}
                textColor={textColor}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowSchedulePicker(false)} style={{ alignSelf: 'flex-end', padding: 8 }}>
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.formActions}>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]} 
              onPress={handleAddTodo}
            >
              <Text style={[styles.saveButtonText, { color: '#ffffff' }]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: theme.border }]} 
              onPress={() => { 
                hapticFeedback.light(); // Light feedback when canceling
                setIsAdding(false);
                setNewTodo('');
                setCustomDateTime(null);
                setShowSchedulePicker(false);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pending Tasks - Being Analyzed */}
      {pendingTasks.map(task => (
        <View
          key={task.id}
          style={[styles.todoItem, styles.pendingItem, {
            backgroundColor: `${theme.primary}24`,
            borderColor: `${theme.primary}43`,
          }]}
        >
          <View style={styles.checkButton}>
            <ActivityIndicator size={20} color={theme.primary} />
          </View>
          <View style={styles.todoContent}>
            <Text style={[styles.todoText, { color: textColor, ...textOutlineStyle }]} numberOfLines={2}>{task.text}</Text>
            <View style={styles.todoMetaRow}>
              <View style={styles.todoMeta}>
                <View style={[styles.tierBadge, { backgroundColor: theme.textSecondary }]}>
                  <Text style={styles.tierText}>ANALYZING</Text>
                </View>
                <Text style={[styles.analyzingText, { color: textSecondaryColor }]}>
                  Smart analysis...
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      {activeTodos.length === 0 && pendingTasks.length === 0 ? (
        <Text style={[styles.emptyText, { color: textSecondaryColor }]}>No tasks yet! Add one to get started.</Text>
      ) : (
        <>
          {activeTodos.slice(0, 3).map(todo => {
            const getTierColor = (tier) => {
              switch (tier) {
                case 'low': return '#22c55e';
                case 'mid': return '#f59e0b';
                case 'high': return '#ef4444';
                default: return '#6b7280';
              }
            };

            const getTierLabel = (tier) => {
              switch (tier) {
                case 'low': return 'LOW';
                case 'mid': return 'MID';
                case 'high': return 'HIGH';
                default: return 'MID';
              }
            };

            return (
              <View
                key={todo.id}
                style={[styles.todoItem, {
                  backgroundColor: `${theme.primary}24`,
                  borderWidth: 0.8,
                  borderColor: `${theme.primary}43`,
                }]}
              >
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => {
                    hapticFeedback.success();
                    const getTierColor = (t) => {
                      switch (t) { case 'low': return '#22c55e'; case 'high': return '#ef4444'; default: return '#f59e0b'; }
                    };
                    showFloatingPoints(todo.points || 0, getTierColor(todo.tier));
                    onTodoComplete(todo.id);
                  }}
                >
                  <MaterialIcons name="radio-button-unchecked" size={24} color={theme.primary} />
                </TouchableOpacity>
                <View style={styles.todoContent}>
                  <Text style={[styles.todoText, { color: textColor, ...textOutlineStyle }]} numberOfLines={2}>{todo.text}</Text>
                  <View style={styles.todoMetaRow}>
                    <View style={styles.todoMeta}>
                      <View style={[styles.tierBadge, { backgroundColor: getTierColor(todo.tier) }]}>
                        <Text style={styles.tierText}>{getTierLabel(todo.tier)}</Text>
                      </View>
                      <Text style={[styles.pointsText, { color: theme.primary }]}>+{todo.points} pts</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
          {activeTodos.length > 3 && (
            <TouchableOpacity
              style={styles.viewMoreRow}
              activeOpacity={0.7}
              onPress={() => {
                hapticFeedback.light();
                onViewAll();
              }}
            >
              <Text style={[styles.viewMoreText, { color: theme.primary, ...textOutlineStyle }]}>
                +{activeTodos.length - 3} more task{activeTodos.length - 3 !== 1 ? 's' : ''}
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
        </>
      )}
      {floatingPoints.map(fp => (
        <Animated.Text
          key={fp.id}
          pointerEvents="none"
          style={[styles.floatingPoints, {
            color: fp.tierColor,
            opacity: fp.opacity,
            transform: [{ translateY: fp.translateY }, { scale: fp.scale }],
          }]}
        >
          +{fp.points} pts
        </Animated.Text>
      ))}
    </LiquidGlassTodoContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginHorizontal: 20, // Add horizontal margins for consistent width
    marginBottom: 20, // Add bottom margin for spacing
    padding: 20, // Add padding inside the card
    borderRadius: 16, // Add border radius to match other cards
    shadowColor: '#000', // Add shadow for consistency
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3, // Android shadow
    overflow: 'hidden',
  },
  liquidGlassTodoCard: {
    backgroundColor: 'transparent',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    color: '#667eea',
    marginLeft: 8,
    fontWeight: '600',
  },
  durationBlock: { marginTop: 8, marginBottom: 2 },
  durationKicker: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  addForm: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  scheduleText: { flex: 1, fontSize: 14, fontWeight: '500' },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  scoringText: {
    fontSize: 14,
    color: '#667eea',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  todoItem: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pendingItem: {
    borderWidth: 1,
  },
  checkButton: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoContent: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    lineHeight: 22,
  },
  todoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  pointsText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: 'bold',
  },
  analyzingText: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: -4,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  floatingPoints: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default TodoList;