import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const WorkoutCompletionModal = ({ visible, onClose, workoutData, workoutCount = 0 }) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!workoutData) return null;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const formatDate = () => {
    const date = new Date();
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${dayName}, ${day} ${month}`;
  };

  const calculateTotalWeight = () => {
    let total = 0;
    workoutData.exercises?.forEach(ex => {
      ex.sets?.forEach(set => {
        if (set.completed && set.weight && set.reps) {
          total += parseFloat(set.weight) * parseInt(set.reps);
        }
      });
    });
    return Math.round(total);
  };

  const getBestSet = (exercise) => {
    let best = null;
    exercise.sets?.forEach(set => {
      if (set.completed && set.weight && set.reps) {
        const volume = parseFloat(set.weight) * parseInt(set.reps);
        if (!best || volume > (parseFloat(best.weight) * parseInt(best.reps))) {
          best = set;
        }
      }
    });
    return best ? `${best.weight} kg × ${best.reps}` : '—';
  };

  const handleShare = async () => {
    hapticFeedback.light();
    try {
      const totalWeight = calculateTotalWeight();
      const message = `💪 Workout Complete!\n\n${workoutData.name}\n⏱️ ${formatDuration(workoutData.duration)}\n🏋️ ${totalWeight} kg total\n📊 ${workoutData.exercises?.length || 0} exercises\n\nThat's my ${workoutCount}${getOrdinalSuffix(workoutCount)} workout! 🎉`;
      
      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={0.7}
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.container,
            {
              backgroundColor: theme.background,
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Close Button */}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} color={theme.text} />
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity 
              style={[styles.shareButton, { backgroundColor: theme.primary + '20' }]}
              onPress={handleShare}
            >
              <MaterialIcons name="share" size={24} color={theme.primary} />
            </TouchableOpacity>

            {/* Stars */}
            <View style={styles.starsContainer}>
              <MaterialIcons name="star" size={40} color="#FFD700" style={{ opacity: 0.3 }} />
              <MaterialIcons name="star" size={52} color="#FFD700" style={{ opacity: 0.7 }} />
              <MaterialIcons name="star" size={64} color="#FFD700" />
              <MaterialIcons name="star" size={52} color="#FFD700" style={{ opacity: 0.7 }} />
              <MaterialIcons name="star" size={40} color="#FFD700" style={{ opacity: 0.3 }} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>
              Well Done!
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              That's your {workoutCount}{getOrdinalSuffix(workoutCount)} workout!
            </Text>

            {/* Workout Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              {/* Workout Name */}
              <Text style={[styles.workoutName, { color: theme.text }]}>
                {workoutData.name}
              </Text>

              {/* Date */}
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                {formatDate()}
              </Text>

              {/* Stats Row */}
              <View style={[styles.statsRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={styles.statItem}>
                  <MaterialIcons name="access-time" size={20} color={theme.textSecondary} />
                  <Text style={[styles.statText, { color: theme.text }]}>
                    {formatDuration(workoutData.duration)}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <MaterialIcons name="fitness-center" size={20} color={theme.textSecondary} />
                  <Text style={[styles.statText, { color: theme.text }]}>
                    {calculateTotalWeight()} kg
                  </Text>
                </View>
              </View>

              {/* Exercises Header */}
              <View style={styles.exercisesHeader}>
                <Text style={[styles.exercisesHeaderText, { color: theme.text }]}>
                  Exercise
                </Text>
                <Text style={[styles.exercisesHeaderText, { color: theme.text }]}>
                  Best Set
                </Text>
              </View>

              {/* Exercises List */}
              {workoutData.exercises?.map((exercise, index) => (
                <View 
                  key={index}
                  style={[
                    styles.exerciseRow,
                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                  ]}
                >
                  <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>
                    {exercise.sets?.filter(s => s.completed).length} × {exercise.name}
                  </Text>
                  <Text style={[styles.bestSet, { color: theme.textSecondary }]}>
                    {getBestSet(exercise)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
    textAlign: 'center',
  },
  summaryCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 15,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exercisesHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.6,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exerciseName: {
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  bestSet: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default WorkoutCompletionModal;


