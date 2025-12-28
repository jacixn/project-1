import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkout } from '../contexts/WorkoutContext';
import { hapticFeedback } from '../utils/haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

const MiniWorkoutPlayer = ({ onPress }) => {
  const { theme, isDark } = useTheme();
  const { activeWorkout, elapsedTime, hasActiveWorkout } = useWorkout();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (hasActiveWorkout) {
      // Pulse the whole container slightly
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Blinking live dot
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [hasActiveWorkout]);

  if (!hasActiveWorkout) {
    return null;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maxWidth = Math.min(screenWidth * 0.9, 400);

  return (
    <Animated.View style={[
      styles.wrapper, 
      { transform: [{ scale: pulseAnim }] }
    ]}>
      <TouchableOpacity
        style={[styles.container, { width: maxWidth }]}
        onPress={() => {
          hapticFeedback.medium();
          onPress();
        }}
        activeOpacity={0.9}
      >
        <BlurView
          intensity={isDark ? 40 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        <LinearGradient
          colors={isDark 
            ? ['rgba(40, 40, 40, 0.7)', 'rgba(20, 20, 20, 0.8)'] 
            : ['rgba(255, 255, 255, 0.7)', 'rgba(240, 240, 240, 0.8)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Status border accent */}
        <View style={[styles.borderAccent, { backgroundColor: theme.primary, opacity: 0.5 }]} />
        
        <View style={styles.content}>
          <View style={styles.leftSection}>
            <LinearGradient
              colors={[theme.primary, theme.accent || theme.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <MaterialIcons name="fitness-center" size={20} color="#FFFFFF" />
            </LinearGradient>
            
            <View style={styles.textSection}>
              <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={1}>
                {activeWorkout?.name || 'Workout'}
              </Text>
              <View style={styles.statusRow}>
                <Animated.View style={[styles.liveDot, { backgroundColor: '#FF3B30', opacity: dotAnim }]} />
                <Text style={[styles.workoutTime, { color: theme.textSecondary }]}>
                  {formatTime(elapsedTime)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.expandButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.expandText, { color: theme.primary }]}>Tap to open</Text>
            <MaterialIcons name="expand-less" size={20} color={theme.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  borderAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  textSection: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  workoutTime: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 2,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MiniWorkoutPlayer;

