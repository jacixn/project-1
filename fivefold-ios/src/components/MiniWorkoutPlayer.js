import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { hapticFeedback } from '../utils/haptics';
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get('window');

const MiniWorkoutPlayer = ({ onPress }) => {
  const { theme, isDark } = useTheme();
  const { activeWorkout, elapsedTime, hasActiveWorkout } = useWorkout();

  if (!hasActiveWorkout) {
    return null;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Match tab bar width calculation
  const tabBarWidth = screenWidth * 0.75;
  const maxWidth = Math.min(tabBarWidth, 414);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.container, { width: maxWidth }]}
        onPress={() => {
          hapticFeedback.medium();
          onPress();
        }}
        activeOpacity={0.7}
      >
        <BlurView
          intensity={isDark ? 90 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Top accent line */}
        <View style={[styles.accentLine, { backgroundColor: theme.primary }]} />
        
        <View style={styles.content}>
          {/* Workout icon and info */}
          <View style={styles.leftSection}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
              <MaterialIcons name="fitness-center" size={18} color="#FFFFFF" />
            </View>
            
            <View style={styles.textSection}>
              <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={1}>
                {activeWorkout?.name || 'Workout'}
              </Text>
              <View style={styles.timeContainer}>
                <MaterialIcons name="schedule" size={12} color={theme.textSecondary} />
                <Text style={[styles.workoutTime, { color: theme.textSecondary }]}>
                  {formatTime(elapsedTime)}
                </Text>
              </View>
            </View>
          </View>

          {/* Tap to expand indicator */}
          <View style={styles.rightSection}>
            <Text style={[styles.tapText, { color: theme.textSecondary }]}>Tap to open</Text>
            <MaterialIcons name="keyboard-arrow-up" size={20} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 91 : 68,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  container: {
    height: 56,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textSection: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  workoutTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MiniWorkoutPlayer;

