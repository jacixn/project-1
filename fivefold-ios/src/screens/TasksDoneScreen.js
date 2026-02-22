/**
 * Tasks Done Screen
 * 
 * Displays completed tasks with premium UI.
 * Extracted from ProfileTab modal for stack navigation support.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import userStorage from '../utils/userStorage';

const TasksDoneScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [completedTodosList, setCompletedTodosList] = useState([]);

  const textColor = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSecondaryColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)';
  const textTertiaryColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  // Helper function to format date smartly
  const formatSmartDate = (dateString) => {
    const taskDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    const time = taskDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (taskDateOnly.getTime() === todayOnly.getTime()) {
      return `Today at ${time}`;
    } else if (taskDateOnly.getTime() === yesterdayOnly.getTime()) {
      return `Yesterday at ${time}`;
    } else {
      const dateStr = taskDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
      return `${dateStr} at ${time}`;
    }
  };

  const loadCompletedTasks = async () => {
    try {
      const storedTodos = await userStorage.getRaw('fivefold_todos');
      if (storedTodos) {
        const todos = JSON.parse(storedTodos);
        const completedHistory = todos
          .filter(todo => todo.completed)
          .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
        setCompletedTodosList(completedHistory);
      } else {
        setCompletedTodosList([]);
      }
    } catch (error) {
      console.error('Error loading completed tasks:', error);
      setCompletedTodosList([]);
    }
  };

  useEffect(() => {
    loadCompletedTasks();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Content - ScrollView starts from top, content has paddingTop */}
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingBottom: 120,
          paddingTop: insets.top + 70,
        }}
      >
        {completedTodosList.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyStateText, { color: textSecondaryColor, fontSize: 20, fontWeight: '700', marginTop: 24 }]}>
              No Completed Tasks Yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: textTertiaryColor, fontSize: 15, marginTop: 12, lineHeight: 22 }]}>
              Complete tasks to see them here
            </Text>
          </View>
        ) : (
          completedTodosList.map((task, index) => (
            <LinearGradient
              key={task.id || index}
              colors={[
                isDark ? `${theme.success}25` : `${theme.success}15`,
                isDark ? `${theme.success}15` : `${theme.success}08`
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 18,
                marginBottom: 14,
                shadowColor: theme.success,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.15,
                shadowRadius: 12,
                elevation: 4,
                borderWidth: 1,
                borderColor: `${theme.success}30`,
                overflow: 'hidden'
              }}
            >
              {/* Completion Badge */}
              <View style={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: `${theme.success}20`,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.success,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: theme.success,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                  elevation: 3
                }}>
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                </View>
              </View>

              {/* Task Content */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingRight: 30 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 17,
                    fontWeight: '700',
                    color: textColor,
                    lineHeight: 24,
                    marginBottom: 8
                  }}>
                    {task.text || task.title}
                  </Text>
                  
                  {/* Date and Points Row */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 4
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <MaterialIcons name="access-time" size={14} color={theme.textSecondary} />
                      <Text style={{
                        fontSize: 13,
                        color: textSecondaryColor,
                        marginLeft: 6,
                        fontWeight: '500'
                      }}>
                        {task.completedAt ? formatSmartDate(task.completedAt) : 'Completed'}
                      </Text>
                    </View>
                    
                    {task.points && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: `${theme.success}25`,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: `${theme.success}40`
                      }}>
                        <MaterialIcons name="stars" size={14} color={theme.success} />
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: theme.success,
                          marginLeft: 4
                        }}>
                          +{task.points}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </LinearGradient>
          ))
        )}
      </ScrollView>
      
      {/* Premium Transparent Header */}
      <BlurView 
        intensity={50} 
        tint={isDark ? 'dark' : 'light'} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 1000,
        }}
      >
        <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ 
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
            </TouchableOpacity>
              
            <View style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
            }}>
              <Text style={{ 
                color: textColor, 
                fontSize: 17, 
                fontWeight: '700',
                letterSpacing: 0.3,
              }}>
                Tasks Done
              </Text>
              <View style={{ 
                width: 50, 
                height: 3, 
                backgroundColor: theme.primary, 
                borderRadius: 2,
                marginTop: 6,
              }} />
            </View>
              
            <View style={{ width: 40 }} />
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default TasksDoneScreen;
