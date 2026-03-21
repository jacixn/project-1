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
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

const CONFETTI_COUNT = 12;

const TaskCompletionCelebration = ({ visible, task, onClose }) => {
  const { theme, isDark } = useTheme();
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const pointsScaleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      y: new Animated.Value(-100),
      x: new Animated.Value(Math.random() * width),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  const timersRef = useRef([]);
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
    shimmerAnim.stopAnimation();
    confettiAnims.forEach(anim => {
      anim.y.stopAnimation();
      anim.rotation.stopAnimation();
      anim.opacity.stopAnimation();
    });
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearAllTimers();
    stopAllAnimations();
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
    setTimeout(() => { onClose(); }, 180);
  }, [onClose, clearAllTimers, stopAllAnimations]);

  useEffect(() => {
    if (visible && task) {
      closingRef.current = false;
      hapticFeedback.success();
      
      scaleAnim.setValue(0);
      checkScaleAnim.setValue(0);
      pointsScaleAnim.setValue(0);
      shimmerAnim.setValue(0);
      confettiAnims.forEach(anim => {
        anim.y.setValue(-100);
        anim.opacity.setValue(1);
        anim.rotation.setValue(0);
      });

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      safeTimeout(() => {
        Animated.sequence([
          Animated.spring(checkScaleAnim, { toValue: 1.15, tension: 100, friction: 3, useNativeDriver: true }),
          Animated.spring(checkScaleAnim, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }),
        ]).start();
      }, 200);

      safeTimeout(() => {
        Animated.spring(pointsScaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 4,
          useNativeDriver: true,
        }).start();
      }, 400);

      Animated.loop(
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ).start();

      safeTimeout(() => {
        confettiAnims.forEach((anim) => {
          Animated.parallel([
            Animated.timing(anim.y, { toValue: height + 100, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
            Animated.timing(anim.rotation, { toValue: Math.random() * 720 - 360, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
            Animated.timing(anim.opacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
          ]).start();
        });
      }, 300);

      safeTimeout(() => { handleClose(); }, 2500);

      return () => { clearAllTimers(); stopAllAnimations(); };
    }
  }, [visible, task, handleClose, safeTimeout, clearAllTimers, stopAllAnimations]);

  if (!task) return null;

  const tierConfig = {
    low: { colors: ['#34d399', '#10b981'], label: 'Quick Win', icon: 'flash-on' },
    mid: { colors: ['#fbbf24', '#f59e0b'], label: 'Solid Work', icon: 'trending-up' },
    high: { colors: ['#f87171', '#ef4444'], label: 'Major Task', icon: 'whatshot' },
  };
  const tier = tierConfig[task.tier] || tierConfig.mid;

  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
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
                  { rotate: anim.rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
                ],
                opacity: anim.opacity,
              },
            ]}
          />
        ))}

        <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
          <BlurView
            intensity={isDark ? 50 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={styles.card}
          >
            <View style={[styles.cardInner, { backgroundColor: isDark ? 'rgba(15,15,25,0.5)' : 'rgba(255,255,255,0.75)' }]}>
              {/* Top accent line */}
              <LinearGradient
                colors={['transparent', ...tier.colors, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topAccent}
              />

              {/* Check circle */}
              <Animated.View style={{ transform: [{ scale: checkScaleAnim }] }}>
                <LinearGradient colors={tier.colors} style={styles.checkCircle}>
                  <MaterialIcons name="check" size={32} color="#fff" />
                </LinearGradient>
              </Animated.View>

              <Text style={[styles.title, { color: isDark ? '#fff' : '#111' }]}>
                Done
              </Text>

              <Text
                style={[styles.taskName, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}
                numberOfLines={2}
              >
                {task.text}
              </Text>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />

              {/* Points + Tier row */}
              <Animated.View style={[styles.rewardRow, { transform: [{ scale: pointsScaleAnim }] }]}>
                <View style={[styles.pointsPill, { backgroundColor: tier.colors[0] + '18' }]}>
                  <MaterialIcons name="star" size={18} color={tier.colors[0]} />
                  <Text style={[styles.pointsValue, { color: tier.colors[0] }]}>
                    +{task.points}
                  </Text>
                </View>

                <View style={[styles.tierPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <MaterialIcons name={tier.icon} size={14} color={tier.colors[0]} />
                  <Text style={[styles.tierLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>
                    {tier.label}
                  </Text>
                </View>
              </Animated.View>

              <Text style={[styles.dismissHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>
                Tap anywhere to dismiss
              </Text>
            </View>
          </BlurView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContainer: {
    width: width * 0.82,
    maxWidth: 360,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  cardInner: {
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  topAccent: {
    height: 3,
    width: '120%',
    marginBottom: 28,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: -0.3,
  },
  taskName: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 20,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 18,
  },
});

export default TaskCompletionCelebration;
