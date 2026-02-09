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
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';

const { width: screenWidth } = Dimensions.get('window');

const MiniWorkoutPlayer = ({ onPress, bottomOffset = 85 }) => {
  const { theme, isDark } = useTheme();
  const { activeWorkout, elapsedTime, hasActiveWorkout } = useWorkout();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (hasActiveWorkout) {
      // Subtle breathing pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.015,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Blinking live dot
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 0.2,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Soft glow animation on the icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 2000,
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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Count completed sets for progress display
  const completedSets = activeWorkout?.exercises?.reduce((total, ex) => 
    total + (ex.sets?.filter(s => s.completed)?.length || 0), 0) || 0;
  const totalSets = activeWorkout?.exercises?.reduce((total, ex) => 
    total + (ex.sets?.length || 0), 0) || 0;

  const maxWidth = Math.min(screenWidth * 0.9, 400);

  // Liquid Glass wrapper component
  const GlassContainer = ({ children }) => {
    if (isLiquidGlassSupported) {
      return (
        <LiquidGlassView
          interactive={true}
          effect="clear"
          colorScheme="system"
          tintColor="rgba(255, 255, 255, 0.08)"
          style={StyleSheet.absoluteFill}
        >
          {children}
        </LiquidGlassView>
      );
    }
    return (
      <>
        <BlurView
          intensity={isDark ? 50 : 90}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={isDark 
            ? ['rgba(40, 40, 40, 0.75)', 'rgba(25, 25, 25, 0.85)'] 
            : ['rgba(255, 255, 255, 0.8)', 'rgba(245, 245, 245, 0.9)']}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </>
    );
  };

  return (
    <Animated.View style={[
      styles.wrapper, 
      { bottom: bottomOffset, transform: [{ scale: pulseAnim }] }
    ]}>
      <TouchableOpacity
        style={[styles.container, { width: maxWidth }]}
        onPress={() => {
          hapticFeedback.medium();
          onPress();
        }}
        activeOpacity={0.85}
      >
        <GlassContainer>
          <View style={styles.content}>
            {/* Left: Icon */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={[theme.primary, theme.accent || theme.primaryDark || theme.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <MaterialIcons name="fitness-center" size={18} color="#FFFFFF" />
              </LinearGradient>
              {/* Glow behind icon */}
              <Animated.View style={[styles.iconGlow, { 
                backgroundColor: theme.primary,
                opacity: glowAnim,
              }]} />
            </View>
            
            {/* Center: Name + Status */}
            <View style={styles.centerSection}>
              <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={1}>
                {activeWorkout?.name || 'Workout'}
              </Text>
              <View style={styles.statusRow}>
                <Animated.View style={[styles.liveDot, { opacity: dotAnim }]} />
                <Text style={[styles.timerText, { color: theme.textSecondary }]}>
                  {formatTime(elapsedTime)}
                </Text>
                {totalSets > 0 && (
                  <>
                    <View style={[styles.dividerDot, { backgroundColor: theme.textSecondary }]} />
                    <Text style={[styles.setsText, { color: theme.textSecondary }]}>
                      {completedSets}/{totalSets} sets
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Right: Open button */}
            <View style={[styles.openButton, { backgroundColor: `${theme.primary}18` }]}>
              <MaterialIcons name="keyboard-arrow-up" size={22} color={theme.primary} />
            </View>
          </View>
        </GlassContainer>
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
    height: 60,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 10,
    gap: 10,
  },
  iconWrapper: {
    position: 'relative',
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconGlow: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 12,
    zIndex: 0,
    transform: [{ scale: 1.35 }],
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF3B30',
    marginRight: 5,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  dividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
    opacity: 0.4,
  },
  setsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  openButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MiniWorkoutPlayer;
