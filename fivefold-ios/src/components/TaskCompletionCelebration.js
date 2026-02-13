import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

// Reduced from 20 to 12 for performance
const CONFETTI_COUNT = 12;

const TaskCompletionCelebration = ({ visible, task, onClose }) => {
  const { theme, isDark } = useTheme();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const pointsScaleAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      y: new Animated.Value(-100),
      x: new Animated.Value(Math.random() * width),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  // Track ALL timeouts so we can clear them on cleanup
  const timersRef = useRef([]);
  // Track if close has already been called to prevent double-fires
  const closingRef = useRef(false);

  const safeTimeout = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  const stopAllAnimations = useCallback(() => {
    scaleAnim.stopAnimation();
    checkScaleAnim.stopAnimation();
    pointsScaleAnim.stopAnimation();
    confettiAnims.forEach(anim => {
      anim.y.stopAnimation();
      anim.rotation.stopAnimation();
      anim.opacity.stopAnimation();
    });
  }, []);

  // Stable handleClose that ALWAYS calls onClose, never depends on animation callback
  const handleClose = useCallback(() => {
    if (closingRef.current) return; // Prevent double-close
    closingRef.current = true;

    // Stop everything
    clearAllTimers();
    stopAllAnimations();

    // Quick exit animation — but call onClose on a timer as a safety net
    // so even if the animation gets interrupted, onClose still fires
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();

    // ALWAYS call onClose after a short delay, regardless of animation state
    setTimeout(() => {
      onClose();
    }, 180);
  }, [onClose, clearAllTimers, stopAllAnimations]);

  useEffect(() => {
    if (visible && task) {
      // Reset closing flag for new celebration
      closingRef.current = false;

      // Success haptic
      hapticFeedback.success();
      
      // Reset animations
      scaleAnim.setValue(0);
      checkScaleAnim.setValue(0);
      pointsScaleAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.y.setValue(-100);
        anim.opacity.setValue(1);
        anim.rotation.setValue(0);
      });

      // Card entrance
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Check mark animation
      safeTimeout(() => {
        Animated.sequence([
          Animated.spring(checkScaleAnim, {
            toValue: 1.2,
            tension: 100,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(checkScaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      // Points animation
      safeTimeout(() => {
        Animated.spring(pointsScaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Confetti animation
      safeTimeout(() => {
        confettiAnims.forEach((anim) => {
          Animated.parallel([
            Animated.timing(anim.y, {
              toValue: height + 100,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotation, {
              toValue: Math.random() * 720 - 360,
              duration: 2000 + Math.random() * 1000,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 300);

      // Auto dismiss after 2.5 seconds
      safeTimeout(() => {
        handleClose();
      }, 2500);

      return () => {
        clearAllTimers();
        stopAllAnimations();
      };
    }
  }, [visible, task, handleClose, safeTimeout, clearAllTimers, stopAllAnimations]);

  if (!task) return null;

  const getTierColor = (tier) => {
    switch (tier) {
      case 'low': return '#22c55e';
      case 'mid': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return theme.primary;
    }
  };

  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        {/* Confetti */}
        {confettiAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: confettiColors[index % confettiColors.length],
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  { rotate: anim.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg']
                  })},
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}

        {/* Main Card */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.card}>
            {/* Success Check Mark */}
            <Animated.View
              style={[
                styles.checkContainer,
                { 
                  backgroundColor: getTierColor(task.tier),
                  transform: [{ scale: checkScaleAnim }],
                },
              ]}
            >
              <MaterialIcons name="check" size={48} color="#fff" />
            </Animated.View>

            {/* Task Completed Text */}
            <Text style={[styles.title, { color: theme.text }]}>
              Task Completed
            </Text>

            {/* Task Name */}
            <Text style={[styles.taskName, { color: theme.textSecondary }]} numberOfLines={2}>
              {task.text}
            </Text>

            {/* Points Earned */}
            <Animated.View
              style={[
                styles.pointsContainer,
                {
                  transform: [{ scale: pointsScaleAnim }],
                },
              ]}
            >
              <View style={[styles.pointsBadge, { backgroundColor: `${getTierColor(task.tier)}20` }]}>
                <MaterialIcons name="stars" size={32} color={getTierColor(task.tier)} />
                <Text style={[styles.pointsText, { color: getTierColor(task.tier) }]}>
                  +{task.points}
                </Text>
                <Text style={[styles.pointsLabel, { color: getTierColor(task.tier) }]}>
                  points
                </Text>
              </View>
            </Animated.View>

            {/* Tier Badge */}
            <View style={[styles.tierBadge, { backgroundColor: getTierColor(task.tier) }]}>
              <Text style={styles.tierText}>
                {task.tier?.toUpperCase()} TIER
              </Text>
            </View>

            {/* Tap to Continue */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.continueText, { color: theme.textSecondary }]}>
                Tap to continue
              </Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  taskName: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  pointsContainer: {
    marginBottom: 20,
  },
  pointsBadge: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 52,
  },
  pointsLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tierBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  tierText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  continueText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TaskCompletionCelebration;
