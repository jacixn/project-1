import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Share,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import WorkoutService from '../services/workoutService';

const WorkoutCompletionModal = ({ visible, onClose, workoutData, workoutCount = 0 }) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const closingRef = useRef(false);

  // Safe close: animate out first, then ALWAYS call onClose via setTimeout
  const handleDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    // Stop entry animations
    scaleAnim.stopAnimation();
    fadeAnim.stopAnimation();

    // Animate out
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // ALWAYS call onClose after animation, regardless of whether animation completes
    setTimeout(() => {
      onClose();
    }, 180);
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setShowSaveTemplate(false);
      setTemplateSaved(false);
      setTemplateName(workoutData?.name || '');
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
      scaleAnim.stopAnimation();
      fadeAnim.stopAnimation();
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }

    return () => {
      scaleAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
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

  const handleSaveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) {
      Alert.alert('Name Required', 'Please enter a name for this template.');
      return;
    }
    try {
      hapticFeedback.medium();
      const templateExercises = (workoutData.exercises || []).map(ex => {
        // Get the most common set config from completed sets
        const completedSets = (ex.sets || []).filter(s => s.completed);
        const reps = completedSets.length > 0 ? completedSets[0].reps || '10' : '10';
        const weight = completedSets.length > 0 ? completedSets[0].weight || '' : '';
        return {
          name: ex.name,
          bodyPart: ex.bodyPart || 'Full Body',
          equipment: ex.equipment || 'Body Weight',
          target: ex.target || '',
          sets: completedSets.length || 3,
          reps: String(reps),
          weight: weight ? String(weight) : null,
          restTime: ex.restTime || 120,
        };
      });

      const template = {
        id: Date.now().toString(),
        name: name,
        exercises: templateExercises,
        createdAt: new Date().toISOString(),
      };

      await WorkoutService.addTemplate(template);
      hapticFeedback.success();
      setTemplateSaved(true);
      setShowSaveTemplate(false);
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template. Please try again.');
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

  if (!visible) return null;

  return (
      <View style={[styles.overlay, StyleSheet.absoluteFill]}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={0.7}
          onPress={handleDismiss}
        />
        
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={styles.blurContainer}
          >
            <View style={[styles.glassOverlay, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.75)' }]}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
            {/* Close Button */}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={handleDismiss}
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
            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
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

            {/* Save as Template */}
            {!templateSaved && !showSaveTemplate && (
              <TouchableOpacity
                style={[styles.saveTemplateBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: theme.primary + '30' }]}
                onPress={() => { hapticFeedback.light(); setShowSaveTemplate(true); }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="bookmark-border" size={20} color={theme.primary} />
                <Text style={[styles.saveTemplateBtnText, { color: theme.primary }]}>Save as Template</Text>
              </TouchableOpacity>
            )}

            {showSaveTemplate && (
              <View style={[styles.saveTemplateCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: theme.primary + '30' }]}>
                <Text style={[styles.saveTemplateLabel, { color: theme.text }]}>Template Name</Text>
                <TextInput
                  style={[styles.saveTemplateInput, { color: theme.text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder="e.g. Push Day A"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                />
                <View style={styles.saveTemplateActions}>
                  <TouchableOpacity
                    style={[styles.saveTemplateCancelBtn, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => setShowSaveTemplate(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.saveTemplateCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveTemplateConfirmBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveAsTemplate}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="bookmark" size={16} color="#FFF" />
                    <Text style={styles.saveTemplateConfirmText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {templateSaved && (
              <View style={[styles.savedFeedback, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '40' }]}>
                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                <Text style={[styles.savedFeedbackText, { color: '#10B981' }]}>Template saved</Text>
              </View>
            )}
              </ScrollView>
            </View>
          </BlurView>
        </Animated.View>
      </View>
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
    height: '75%',
    maxHeight: 600,
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassOverlay: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
  saveTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  saveTemplateBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveTemplateCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  saveTemplateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  saveTemplateInput: {
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  saveTemplateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveTemplateCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTemplateCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveTemplateConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveTemplateConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  savedFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  savedFeedbackText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkoutCompletionModal;


