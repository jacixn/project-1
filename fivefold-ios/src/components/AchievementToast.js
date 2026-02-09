import React, { useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: SW, height: SH } = Dimensions.get('window');

// Customisation items are no longer gated by achievements — everything is free.
// This helper returns an empty array so the toast never shows unlock sections.
function getUnlocksForAchievement() {
  return [];
}

const AchievementToast = forwardRef((props, ref) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);
  const queueRef = useRef([]);
  const isShowingRef = useRef(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.6)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;
  const unlockSlide = useRef(new Animated.Value(30)).current;
  const unlockFade = useRef(new Animated.Value(0)).current;

  // Store references to running loop animations so we can stop them on dismiss
  const pulseLoopRef = useRef(null);
  const shimmerLoopRef = useRef(null);

  /** Stop all running infinite loops and reset their values */
  const stopLoops = useCallback(() => {
    if (pulseLoopRef.current) {
      pulseLoopRef.current.stop();
      pulseLoopRef.current = null;
    }
    if (shimmerLoopRef.current) {
      shimmerLoopRef.current.stop();
      shimmerLoopRef.current = null;
    }
    iconPulse.setValue(1);
    shimmerAnim.setValue(0);
  }, []);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      return;
    }

    isShowingRef.current = true;
    const next = queueRef.current.shift();
    setCurrent(next);
    setVisible(true);

    // Stop any leftover loops from previous toast before starting fresh
    stopLoops();

    // Reset animations
    backdropOpacity.setValue(0);
    cardScale.setValue(0.6);
    cardOpacity.setValue(0);
    iconPulse.setValue(1);
    shimmerAnim.setValue(0);
    ringScale.setValue(0);
    ringOpacity.setValue(1);
    unlockSlide.setValue(30);
    unlockFade.setValue(0);

    hapticFeedback.achievement();

    // Entrance
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      // Ring burst
      Animated.parallel([
        Animated.timing(ringScale, { toValue: 2.5, duration: 600, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();

      // Icon pulse — store reference so we can stop it later
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(iconPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current = pulseLoop;
      pulseLoop.start();

      // Shimmer — store reference so we can stop it later
      const shimmerLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      shimmerLoopRef.current = shimmerLoop;
      shimmerLoop.start();

      // Unlock items slide in
      if (next.unlocks && next.unlocks.length > 0) {
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(unlockSlide, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
            Animated.timing(unlockFade, { toValue: 1, duration: 350, useNativeDriver: true }),
          ]).start();
        }, 400);
      }
    });
  }, [stopLoops]);

  const dismiss = useCallback(() => {
    // CRITICAL: Stop infinite loops BEFORE running exit animations
    stopLoops();

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setCurrent(null);
      // Show next in queue after brief pause
      setTimeout(() => showNext(), 300);
    });
  }, [showNext, stopLoops]);

  useImperativeHandle(ref, () => ({
    show: (title, points, achievementId, icon) => {
      const unlocks = getUnlocksForAchievement(achievementId);
      queueRef.current.push({ title, points, achievementId, icon, unlocks });
      if (!isShowingRef.current) {
        showNext();
      }
    }
  }));

  if (!visible || !current) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SW * 1.5, SW * 1.5],
  });

  const unlocks = current.unlocks || [];
  const hasUnlocks = unlocks.length > 0;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={st.backdropTouch} activeOpacity={1} onPress={dismiss}>
          <Animated.View
            style={[st.card, {
              backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            }]}
          >
            {/* Gradient top accent */}
            <LinearGradient
              colors={['#FFD700', '#FF8C00', '#FF6B00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.topAccent}
            />

            {/* Shimmer overlay */}
            <Animated.View style={[st.shimmer, { transform: [{ translateX: shimmerTranslate }] }]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,215,0,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* Trophy icon with ring burst */}
            <View style={st.iconArea}>
              {/* Ring burst */}
              <Animated.View style={[st.ring, {
                borderColor: '#FFD700',
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }]} />

              <Animated.View style={[st.iconCircle, { transform: [{ scale: iconPulse }] }]}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={st.iconGrad}>
                  <MaterialIcons name="emoji-events" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Title area */}
            <Text style={[st.label, { color: '#FFD700' }]}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={[st.title, { color: isDark ? '#fff' : '#111' }]}>{current.title}</Text>

            {/* Points pill */}
            <View style={st.pointsRow}>
              <LinearGradient colors={['#FFD700', '#FF8C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.pointsPill}>
                <MaterialIcons name="star" size={16} color="#fff" />
                <Text style={st.pointsText}>+{(current.points || 0).toLocaleString()} PTS</Text>
              </LinearGradient>
            </View>

            {/* Customisation unlocks */}
            {hasUnlocks && (
              <Animated.View style={[st.unlocksArea, {
                transform: [{ translateY: unlockSlide }],
                opacity: unlockFade,
              }]}>
                <View style={[st.unlockDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialIcons name="lock-open" size={14} color="#4CAF50" />
                  <Text style={[st.unlockLabel, { color: '#4CAF50' }]}>NEW UNLOCK{unlocks.length > 1 ? 'S' : ''}</Text>
                </View>

                {unlocks.map((u, i) => (
                  <View key={i} style={[st.unlockRow, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }]}>
                    <View style={[st.unlockIcon, { backgroundColor: u.color + '20' }]}>
                      <MaterialIcons name={u.icon} size={18} color={u.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[st.unlockName, { color: isDark ? '#fff' : '#111' }]}>{u.name}</Text>
                      <Text style={[st.unlockType, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>{u.type} unlocked</Text>
                    </View>
                    <View style={[st.unlockCheckBg, { backgroundColor: u.color }]}>
                      <MaterialIcons name="check" size={12} color="#fff" />
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Dismiss hint */}
            <Text style={[st.dismissHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>
              Tap anywhere to dismiss
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
});

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: SW * 0.85,
    borderRadius: 28,
    alignItems: 'center',
    paddingBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 24 },
    }),
  },
  topAccent: {
    width: '100%',
    height: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    zIndex: 1,
  },
  iconArea: {
    marginTop: 32,
    marginBottom: 16,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  iconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginHorizontal: 24,
    letterSpacing: -0.5,
  },
  pointsRow: {
    marginTop: 14,
    marginBottom: 4,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  pointsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  unlocksArea: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  unlockDivider: {
    height: 1,
    marginBottom: 14,
    marginHorizontal: 10,
  },
  unlockLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 6,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  unlockIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockName: {
    fontSize: 15,
    fontWeight: '700',
  },
  unlockType: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  unlockCheckBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 16,
  },
});

export default AchievementToast;
