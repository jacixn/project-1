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
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { calculateVisionPoints } from '../services/visionService';

const { width, height } = Dimensions.get('window');
const CONFETTI_COUNT = 14;

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
  const [phase, setPhase] = useState('ask'); // 'ask' | 'celebrate' | 'motivate'

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const pointsScaleAnim = useRef(new Animated.Value(0)).current;
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
      iconScaleAnim.setValue(0);
      pointsScaleAnim.setValue(0);
      confettiAnims.forEach(a => {
        a.y.setValue(-100);
        a.opacity.setValue(1);
        a.rotation.setValue(0);
      });

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

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
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={phase !== 'ask' ? handleDismiss : undefined}>
        {phase === 'celebrate' && confettiAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.confetti,
              {
                backgroundColor: confettiColors[i % confettiColors.length],
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
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.card}>

            {phase === 'ask' && (
              <>
                <View style={[styles.iconCircle, { backgroundColor: '#F59E0B20' }]}>
                  <MaterialIcons name="flag" size={44} color="#F59E0B" />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Time's Up</Text>
                <Text style={[styles.visionTitle, { color: theme.textSecondary || (isDark ? 'rgba(255,255,255,0.6)' : '#6B7280') }]} numberOfLines={3}>
                  "{vision.title}"
                </Text>
                <Text style={[styles.question, { color: theme.text }]}>
                  Did you achieve this vision?
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, { backgroundColor: '#22c55e' }]}
                    onPress={handleYes}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.choiceBtnText}>Yes, I did!</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}
                    onPress={handleNo}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={20} color={isDark ? '#fff' : '#333'} />
                    <Text style={[styles.choiceBtnText, { color: isDark ? '#fff' : '#333' }]}>Not yet</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {phase === 'celebrate' && (
              <>
                <Animated.View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: '#22c55e', transform: [{ scale: iconScaleAnim }] },
                  ]}
                >
                  <MaterialIcons name="emoji-events" size={48} color="#fff" />
                </Animated.View>
                <Text style={[styles.title, { color: theme.text }]}>Vision Achieved</Text>
                <Text style={[styles.visionTitle, { color: theme.textSecondary || (isDark ? 'rgba(255,255,255,0.6)' : '#6B7280') }]} numberOfLines={2}>
                  {vision.title}
                </Text>

                <Animated.View style={[styles.pointsContainer, { transform: [{ scale: pointsScaleAnim }] }]}>
                  <View style={[styles.pointsBadge, { backgroundColor: '#22c55e20' }]}>
                    <MaterialIcons name="stars" size={32} color="#22c55e" />
                    <Text style={[styles.pointsText, { color: '#22c55e' }]}>+{formatPoints(points)}</Text>
                    <Text style={[styles.pointsLabel, { color: '#22c55e' }]}>points</Text>
                  </View>
                </Animated.View>

                <TouchableOpacity style={styles.continueButton} onPress={handleDismiss} activeOpacity={0.7}>
                  <Text style={[styles.continueText, { color: theme.textSecondary || (isDark ? 'rgba(255,255,255,0.5)' : '#888') }]}>
                    Tap to continue
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {phase === 'motivate' && (
              <>
                <View style={[styles.iconCircle, { backgroundColor: '#3B82F620' }]}>
                  <MaterialIcons name="favorite" size={44} color="#3B82F6" />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Keep Going</Text>
                <Text style={[styles.motivationalText, { color: theme.textSecondary || (isDark ? 'rgba(255,255,255,0.6)' : '#6B7280') }]}>
                  {motivationalMsg.current}
                </Text>

                <TouchableOpacity
                  style={[styles.dismissBtn, { backgroundColor: theme.primary || '#3B82F6' }]}
                  onPress={handleDismiss}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dismissBtnText}>Got it</Text>
                </TouchableOpacity>
              </>
            )}

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
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  visionTitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  question: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    gap: 10,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  choiceBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pointsContainer: {
    marginBottom: 16,
  },
  pointsBadge: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  pointsText: {
    fontSize: 44,
    fontWeight: 'bold',
    lineHeight: 48,
  },
  pointsLabel: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  motivationalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  dismissBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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

export default VisionCompletionModal;
