import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { calculateVisionPoints } from '../services/visionService';

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 18;

const MOTIVATIONAL_MESSAGES = [
  "Every great achievement takes time. You're still on the path.",
  "Not reaching a goal isn't failure — it's just a checkpoint. Keep going.",
  "The fact that you set this vision shows incredible ambition. Don't stop.",
  "Growth isn't always linear. You've come further than you think.",
  "Some of the best things in life take longer than expected. Stay patient.",
  "Your vision is still alive — it just needs a little more time.",
  "Progress, not perfection. You're doing better than you realise.",
  "The journey matters more than the deadline. Keep pushing forward.",
];

const formatPoints = (pts) => {
  if (pts >= 1000) return `${(pts / 1000).toFixed(pts % 1000 === 0 ? 0 : 1)}k`;
  return pts.toString();
};

const VisionCompletionModal = ({ visible, vision, onAchieved, onNotAchieved, onClose }) => {
  const { theme, isDark } = useTheme();
  const [phase, setPhase] = useState('ask');

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const pointsScaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
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
  const motivationalMsg = useRef(
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  );

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
    iconScaleAnim.stopAnimation();
    pointsScaleAnim.stopAnimation();
    fadeAnim.stopAnimation();
    confettiAnims.forEach(a => {
      a.y.stopAnimation();
      a.rotation.stopAnimation();
      a.opacity.stopAnimation();
    });
  }, []);

  useEffect(() => {
    if (visible && vision) {
      closingRef.current = false;
      setPhase('ask');
      motivationalMsg.current =
        MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];

      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      iconScaleAnim.setValue(0);
      pointsScaleAnim.setValue(0);
      confettiAnims.forEach(a => {
        a.y.setValue(-100);
        a.opacity.setValue(1);
        a.rotation.setValue(0);
      });

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

      return () => {
        clearAllTimers();
        stopAllAnimations();
      };
    }
  }, [visible, vision]);

  const handleDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearAllTimers();
    stopAllAnimations();
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
    setTimeout(() => onClose(), 180);
  }, [onClose, clearAllTimers, stopAllAnimations]);

  const runCelebration = () => {
    hapticFeedback.success();
    setPhase('celebrate');

    iconScaleAnim.setValue(0);
    pointsScaleAnim.setValue(0);
    confettiAnims.forEach(a => {
      a.y.setValue(-100);
      a.opacity.setValue(1);
      a.rotation.setValue(0);
      a.x.setValue(Math.random() * width);
    });

    safeTimeout(() => {
      Animated.sequence([
        Animated.spring(iconScaleAnim, {
          toValue: 1.2,
          tension: 100,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    safeTimeout(() => {
      Animated.spring(pointsScaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 4,
        useNativeDriver: true,
      }).start();
    }, 300);

    safeTimeout(() => {
      confettiAnims.forEach(a => {
        Animated.parallel([
          Animated.timing(a.y, {
            toValue: height + 100,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(a.rotation, {
            toValue: Math.random() * 720 - 360,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(a.opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 200);
  };

  const handleYes = async () => {
    runCelebration();
    await onAchieved(vision);
  };

  const handleNo = () => {
    hapticFeedback.light();
    setPhase('motivate');
    onNotAchieved(vision);
  };

  if (!vision) return null;

  const points = calculateVisionPoints(vision);
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

  const cardBg = isDark ? 'rgba(30,30,35,0.95)' : 'rgba(255,255,255,0.97)';
  const subtleText = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={phase !== 'ask' ? handleDismiss : undefined} />

        {phase === 'celebrate' && confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: confettiColors[i % confettiColors.length],
                width: i % 3 === 0 ? 12 : 8,
                height: i % 3 === 0 ? 12 : 8,
                borderRadius: i % 2 === 0 ? 6 : 2,
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
          <BlurView intensity={isDark ? 60 : 40} tint={isDark ? 'dark' : 'light'} style={[styles.card, { backgroundColor: cardBg }]}>

            {phase === 'ask' && (
              <>
                <View style={styles.topAccent}>
                  <LinearGradient
                    colors={['#F59E0B', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconCircle}
                  >
                    <MaterialIcons name="flag" size={32} color="#fff" />
                  </LinearGradient>
                </View>

                <Text style={[styles.title, { color: theme.text }]}>Time's Up</Text>

                <View style={[styles.visionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                  <Text style={[styles.visionTitle, { color: subtleText }]} numberOfLines={3}>
                    {vision.title}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: dividerColor }]} />

                <Text style={[styles.question, { color: theme.text }]}>
                  Did you achieve this vision?
                </Text>

                <View style={styles.buttonCol}>
                  <TouchableOpacity onPress={handleYes} activeOpacity={0.85} style={styles.primaryBtnWrap}>
                    <LinearGradient
                      colors={['#22c55e', '#16a34a']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.primaryBtn}
                    >
                      <MaterialIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.primaryBtnText}>Yes, I did!</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: dividerColor }]}
                    onPress={handleNo}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={18} color={subtleText} />
                    <Text style={[styles.secondaryBtnText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)' }]}>Maybe later</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {phase === 'celebrate' && (
              <>
                <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconCircleLg}
                  >
                    <MaterialIcons name="emoji-events" size={44} color="#fff" />
                  </LinearGradient>
                </Animated.View>

                <Text style={[styles.title, { color: theme.text, marginTop: 20 }]}>Vision Achieved!</Text>
                <Text style={[styles.celebrateSubtitle, { color: subtleText }]} numberOfLines={2}>
                  {vision.title}
                </Text>

                <Animated.View style={[styles.pointsWrap, { transform: [{ scale: pointsScaleAnim }] }]}>
                  <LinearGradient
                    colors={isDark ? ['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.05)'] : ['rgba(34,197,94,0.12)', 'rgba(34,197,94,0.04)']}
                    style={styles.pointsBadge}
                  >
                    <MaterialIcons name="stars" size={28} color="#22c55e" />
                    <Text style={styles.pointsText}>+{formatPoints(points)}</Text>
                    <Text style={styles.pointsLabel}>points</Text>
                  </LinearGradient>
                </Animated.View>

                <TouchableOpacity style={styles.tapToContinue} onPress={handleDismiss} activeOpacity={0.7}>
                  <Text style={[styles.tapToContinueText, { color: subtleText }]}>Tap to continue</Text>
                </TouchableOpacity>
              </>
            )}

            {phase === 'motivate' && (
              <>
                <LinearGradient
                  colors={['#3B82F6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <MaterialIcons name="favorite" size={32} color="#fff" />
                </LinearGradient>

                <Text style={[styles.title, { color: theme.text, marginTop: 20 }]}>Keep Going</Text>

                <Text style={[styles.motivationalText, { color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)' }]}>
                  {motivationalMsg.current}
                </Text>

                <TouchableOpacity onPress={handleDismiss} activeOpacity={0.85} style={styles.primaryBtnWrap}>
                  <LinearGradient
                    colors={['#3B82F6', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Got it</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

          </BlurView>
        </Animated.View>
      </Animated.View>
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
  confetti: {
    position: 'absolute',
  },
  cardContainer: {
    width: width * 0.85,
    maxWidth: 380,
  },
  card: {
    borderRadius: 28,
    padding: 32,
    paddingTop: 36,
    alignItems: 'center',
    overflow: 'hidden',
  },
  topAccent: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconCircleLg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: -0.3,
  },
  visionBadge: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    maxWidth: '100%',
  },
  visionTitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginVertical: 20,
  },
  question: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
  },
  primaryBtnWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  celebrateSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    fontWeight: '500',
  },
  pointsWrap: {
    marginBottom: 12,
  },
  pointsBadge: {
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#22c55e',
    lineHeight: 44,
    letterSpacing: -1,
  },
  pointsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  motivationalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
    marginBottom: 28,
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  tapToContinue: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  tapToContinueText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default VisionCompletionModal;
