import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { scoreTask } from '../utils/todoScorer';
import { hapticFeedback } from '../utils/haptics';

const TodoList = ({ todos, onTodoAdd, onTodoComplete, onTodoDelete }) => {
  const { theme, isDark } = useTheme();
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [pendingTasks, setPendingTasks] = useState([]); // Queue for tasks being analyzed

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    
    hapticFeedback.light(); // Light feedback when starting to add
    
    // Create pending task immediately
    const pendingTask = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      isAnalyzing: true,
      createdAt: new Date().toISOString()
    };
    
    // Add to pending queue immediately
    setPendingTasks(prev => [...prev, pendingTask]);
    
    // Clear input and close form immediately so user can add more
    setNewTodo('');
    setIsAdding(false);
    
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
        createdAt: pendingTask.createdAt
      };
      
      // Remove from pending and add to actual todos
      setPendingTasks(prev => prev.filter(t => t.id !== pendingTask.id));
      onTodoAdd(completedTodo);
      hapticFeedback.success(); // Success feedback when analysis completes
      
    } catch (error) {
      console.error('Error scoring task:', error);
      // Remove from pending on error
      setPendingTasks(prev => prev.filter(t => t.id !== pendingTask.id));
      hapticFeedback.error(); // Error feedback when something goes wrong
      Alert.alert('Smart Features Error', error.message || 'Failed to score task. Please check smart features settings.');
    }
  };

  const activeTodos = todos.filter(t => !t.completed);

  // Liquid Glass Container for TodoList
  const LiquidGlassTodoContainer = ({ children }) => {
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

  return (
    <LiquidGlassTodoContainer>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📝 Tasks</Text>
      
      {!isAdding ? (
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]} 
          onPress={() => { 
            hapticFeedback.light(); // Light feedback when opening add form
            setIsAdding(true); 
          }}
        >
          <MaterialIcons name="add" size={24} color="#ffffff" />
          <Text style={[styles.addButtonText, { color: '#ffffff' }]}>Add Task</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addForm}>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.verseBackground, color: theme.text, borderColor: theme.border }]}
            placeholder="What do you need to do?"
            placeholderTextColor={theme.textSecondary}
            value={newTodo}
            onChangeText={setNewTodo}
            autoFocus
          />
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
              }}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pending Tasks - Being Analyzed */}
      {pendingTasks.map(task => (
        <BlurView 
          key={task.id} 
          intensity={30} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.todoItem, styles.pendingItem, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.08)' 
              : `${theme.primary}25` // Deeper color for individual items
          }]}
        >
          <View style={styles.checkButton}>
            <ActivityIndicator size={20} color={theme.primary} />
          </View>
          <View style={styles.todoContent}>
            <Text style={[styles.todoText, { color: theme.text }]}>{task.text}</Text>
            <View style={styles.todoMeta}>
              <View style={[styles.tierBadge, { backgroundColor: theme.textSecondary }]}>
                <Text style={styles.tierText}>ANALYZING</Text>
              </View>
              <Text style={[styles.pointsText, { color: theme.textSecondary }]}>
                🧠 Smart analysis in progress...
              </Text>
            </View>
          </View>
        </BlurView>
      ))}

      {activeTodos.length === 0 && pendingTasks.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tasks yet! Add one to get started.</Text>
      ) : (
        activeTodos.map(todo => {
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
            <BlurView key={todo.id} intensity={18} tint="light" style={styles.todoItem}>
              <TouchableOpacity 
                style={styles.checkButton} 
                onPress={() => {
                  hapticFeedback.success(); // Success feedback when completing task
                  onTodoComplete(todo.id);
                }}
              >
                <MaterialIcons name="radio-button-unchecked" size={24} color={theme.primary} />
              </TouchableOpacity>
              <View style={styles.todoContent}>
                <Text style={[styles.todoText, { color: theme.text }]}>{todo.text}</Text>
                <View style={styles.todoMeta}>
                  <View style={[styles.tierBadge, { backgroundColor: getTierColor(todo.tier) }]}>
                    <Text style={styles.tierText}>{getTierLabel(todo.tier)}</Text>
                  </View>
                  <Text style={[styles.pointsText, { color: theme.primary }]}>+{todo.points} pts</Text>
                  {todo.source === 'ai' && (
                    <Text style={[styles.aiTag, { color: theme.primary }]}>
                      🧠 Smart
                    </Text>
                  )}
                </View>
                {todo.reasoning && (
                  <Text style={[styles.aiReasoning, { color: theme.textSecondary }]}>
                    💭 {todo.reasoning}
                  </Text>
                )}
                {todo.timeEstimate && todo.timeEstimate !== 'Unknown' && (
                  <Text style={[styles.timeEstimate, { color: theme.textSecondary }]}>
                    ⏱️ Est. time: {todo.timeEstimate}
                  </Text>
                )}
              </View>
            </BlurView>
          );
        })
      )}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#667eea',
    borderStyle: 'dashed',
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
    marginBottom: 8,
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  aiTag: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 8,
  },
  aiReasoning: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  timeEstimate: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
});

export default TodoList;