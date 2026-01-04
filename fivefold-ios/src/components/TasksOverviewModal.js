import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const TasksOverviewModal = ({ visible, onClose, todos, onTodoComplete, onTodoDelete }) => {
  const { theme, isDark } = useTheme();

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    todos.forEach(todo => {
      let dateKey;
      let dateLabel;
      let sortOrder;

      if (todo.scheduledDate) {
        // Task has a scheduled date
        const scheduledDate = new Date(todo.scheduledDate);
        scheduledDate.setHours(0, 0, 0, 0);
        
        const diffTime = scheduledDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          dateKey = 'today';
          dateLabel = 'Today';
          sortOrder = 0;
        } else if (diffDays === 1) {
          dateKey = 'tomorrow';
          dateLabel = 'Tomorrow';
          sortOrder = 1;
        } else if (diffDays > 1 && diffDays <= 7) {
          dateKey = todo.scheduledDate;
          dateLabel = scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          sortOrder = diffDays;
        } else if (diffDays > 7) {
          dateKey = todo.scheduledDate;
          dateLabel = scheduledDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          sortOrder = diffDays;
        } else {
          // Past dates
          dateKey = 'overdue';
          dateLabel = 'Overdue';
          sortOrder = -1;
        }
      } else {
        // No scheduled date - show under "Anytime"
        dateKey = 'anytime';
        dateLabel = 'Anytime';
        sortOrder = 999;
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          label: dateLabel,
          tasks: [],
          sortOrder: sortOrder,
          dateKey: dateKey
        };
      }

      groups[dateKey].tasks.push(todo);
    });

    // Convert to array and sort by sortOrder
    return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [todos]);

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

  const totalTasks = todos.filter(t => !t.completed).length;
  const totalPoints = todos.filter(t => !t.completed).reduce((sum, t) => sum + (t.points || 0), 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={onClose} 
              style={{ 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                paddingHorizontal: 18, 
                paddingVertical: 10,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.primary, fontSize: 15, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
            
            <View style={{ alignItems: 'center' }}>
              <Text style={{ 
                color: theme.text, 
                fontSize: 17, 
                fontWeight: '700',
                letterSpacing: 0.3,
              }}>
                Tasks Done
              </Text>
              <View style={{ 
                width: 30, 
                height: 3, 
                backgroundColor: theme.primary, 
                borderRadius: 2,
                marginTop: 4
              }} />
            </View>
            
            <View style={{ width: 70 }} />
          </View>
        </BlurView>

        {/* Content */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {groupedTasks.length === 0 ? (
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={styles.emptyState}>
              <MaterialIcons name="inbox" size={64} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Tasks Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Create your first task to get started
              </Text>
            </BlurView>
          ) : (
            groupedTasks.map((group) => (
              <View key={group.dateKey} style={styles.dateGroup}>
                {/* Date Header */}
                <View style={[styles.dateHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.dateLabel, { color: theme.text }]}>
                    {group.label}
                  </Text>
                  <Text style={[styles.taskCount, { color: theme.textSecondary }]}>
                    {group.tasks.filter(t => !t.completed).length} tasks
                  </Text>
                </View>

                {/* Tasks */}
                {group.tasks
                  .filter(t => !t.completed)
                  .map((todo) => (
                    <BlurView 
                      key={todo.id} 
                      intensity={20} 
                      tint={isDark ? 'dark' : 'light'} 
                      style={styles.taskCard}
                    >
                      <View style={styles.taskHeader}>
                        <TouchableOpacity 
                          style={styles.checkButton} 
                          onPress={() => {
                            hapticFeedback.success();
                            onTodoComplete(todo.id);
                          }}
                        >
                          <MaterialIcons 
                            name="radio-button-unchecked" 
                            size={28} 
                            color={theme.primary} 
                          />
                        </TouchableOpacity>
                        
                        <View style={styles.taskContent}>
                          <Text style={[styles.taskText, { color: theme.text }]}>
                            {todo.text}
                          </Text>
                          
                          {/* Meta Info */}
                          <View style={styles.taskMeta}>
                            <View style={[styles.tierBadge, { backgroundColor: getTierColor(todo.tier) }]}>
                              <Text style={styles.tierText}>{getTierLabel(todo.tier)}</Text>
                            </View>
                            
                            <Text style={[styles.pointsText, { color: theme.primary }]}>
                              +{todo.points} pts
                            </Text>
                            
                            {todo.source === 'ai' && (
                              <View style={[styles.aiTag, { backgroundColor: `${theme.primary}20` }]}>
                                <Text style={[styles.aiTagText, { color: theme.primary }]}>
                                  Smart
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* AI Analysis Section - Beautiful detailed view */}
                          {(todo.reasoning || todo.timeEstimate) && (
                            <View style={[styles.analysisSection, { 
                              backgroundColor: `${theme.primary}08`,
                              borderLeftColor: theme.primary 
                            }]}>
                              <View style={styles.analysisHeader}>
                                <MaterialIcons name="psychology" size={16} color={theme.primary} />
                                <Text style={[styles.analysisTitle, { color: theme.primary }]}>
                                  Smart Analysis
                                </Text>
                              </View>
                              
                              {todo.reasoning && (
                                <View style={styles.analysisItem}>
                                  <MaterialIcons name="lightbulb" size={14} color={theme.textSecondary} />
                                  <Text style={[styles.analysisText, { color: theme.text }]}>
                                    {todo.reasoning}
                                  </Text>
                                </View>
                              )}
                              
                              {todo.timeEstimate && todo.timeEstimate !== 'Unknown' && (
                                <View style={styles.analysisItem}>
                                  <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
                                  <Text style={[styles.analysisText, { color: theme.text }]}>
                                    Estimated time: <Text style={{ fontWeight: '600' }}>{todo.timeEstimate}</Text>
                                  </Text>
                                </View>
                              )}
                              
                              {todo.confidence && (
                                <View style={styles.confidenceBar}>
                                  <Text style={[styles.confidenceLabel, { color: theme.textSecondary }]}>
                                    Confidence
                                  </Text>
                                  <View style={[styles.confidenceTrack, { backgroundColor: `${theme.primary}20` }]}>
                                    <View 
                                      style={[
                                        styles.confidenceFill, 
                                        { 
                                          width: `${todo.confidence}%`,
                                          backgroundColor: theme.primary 
                                        }
                                      ]} 
                                    />
                                  </View>
                                  <Text style={[styles.confidenceValue, { color: theme.primary }]}>
                                    {todo.confidence}%
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Scheduled Date Badge (if different from section) */}
                          {todo.scheduledDate && group.dateKey !== 'today' && group.dateKey !== 'tomorrow' && (
                            <View style={styles.scheduledDateBadge}>
                              <MaterialIcons name="schedule" size={14} color={theme.textSecondary} />
                              <Text style={[styles.scheduledDateText, { color: theme.textSecondary }]}>
                                {new Date(todo.scheduledDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Delete Button */}
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => {
                            hapticFeedback.light();
                            onTodoDelete(todo.id);
                          }}
                        >
                          <MaterialIcons name="delete-outline" size={24} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    </BlurView>
                  ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyState: {
    marginHorizontal: 20,
    marginTop: 60,
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  dateGroup: {
    marginTop: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 2,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  checkButton: {
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 22,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  analysisSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  analysisTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  analysisText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  confidenceBar: {
    marginTop: 4,
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confidenceTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  scheduledDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  scheduledDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default TasksOverviewModal;


