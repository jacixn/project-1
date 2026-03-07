import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import hapticFeedback from '../../utils/haptics';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.6;

const PHASE_COLORS = {
  breatheIn: '#3B82F6',
  hold: '#F59E0B',
  breatheOut: '#10B981',
};

const getEncouragement = (seconds) => {
  if (seconds < 10) return 'Great start!';
  if (seconds < 20) return 'Good effort!';
  if (seconds < 30) return 'Well done!';
  if (seconds < 45) return 'Impressive!';
  if (seconds < 60) return 'Amazing focus!';
  return 'Incredible discipline!';
};

const BreathHoldGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [phase, setPhase] = useState('idle');
  const [holdTime, setHoldTime] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [lastHoldTime, setLastHoldTime] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const circleScale = useRef(new Animated.Value(0.5)).current;
  const circlePulse = useRef(new Animated.Value(1)).current;
  const circleOpacity = useRef(new Animated.Value(0.3)).current;
  const phaseTextOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef(null);
  const holdStartRef = useRef(null);
  const hapticIntervalRef = useRef(null);
  const pulseAnimRef = useRef(null);
  const breatheInAnimRef = useRef(null);
  const breatheOutAnimRef = useRef(null);

  const fadeInPhaseText = useCallback(() => {
    phaseTextOpacity.setValue(0);
    Animated.timing(phaseTextOpacity, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phaseTextOpacity]);

  const startBreatheIn = useCallback(() => {
    setPhase('breatheIn');
    setShowResult(false);
    setHoldTime(0);
    fadeInPhaseText();

    Animated.timing(circleOpacity, {
      toValue: 0.7,
      duration: 400,
      useNativeDriver: true,
    }).start();

    breatheInAnimRef.current = Animated.timing(circleScale, {
      toValue: 1,
      duration: 4000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    breatheInAnimRef.current.start(({ finished }) => {
      if (finished) startHold();
    });
  }, [circleScale, circleOpacity, fadeInPhaseText, startHold]);

  const startHold = useCallback(() => {
    setPhase('hold');
    fadeInPhaseText();
    holdStartRef.current = Date.now();

    holdTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - holdStartRef.current) / 1000;
      setHoldTime(elapsed);
    }, 50);

    hapticIntervalRef.current = setInterval(() => {
      hapticFeedback.light();
    }, 5000);

    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(circlePulse, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(circlePulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimRef.current.start();
  }, [circlePulse, fadeInPhaseText]);

  const release = useCallback(() => {
    if (phase !== 'hold') return;

    clearInterval(holdTimerRef.current);
    clearInterval(hapticIntervalRef.current);
    if (pulseAnimRef.current) pulseAnimRef.current.stop();
    circlePulse.setValue(1);

    const finalTime = (Date.now() - holdStartRef.current) / 1000;
    setLastHoldTime(finalTime);
    setHoldTime(finalTime);
    if (finalTime > bestTime) setBestTime(finalTime);
    setRounds((p) => p + 1);
    hapticFeedback.success();

    setPhase('breatheOut');
    fadeInPhaseText();

    breatheOutAnimRef.current = Animated.timing(circleScale, {
      toValue: 0.5,
      duration: 6000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    breatheOutAnimRef.current.start(({ finished }) => {
      if (finished) {
        Animated.timing(circleOpacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }).start();

        setPhase('idle');
        setShowResult(true);

        resultOpacity.setValue(0);
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    });
  }, [
    phase,
    bestTime,
    circleScale,
    circleOpacity,
    circlePulse,
    resultOpacity,
    fadeInPhaseText,
  ]);

  useEffect(() => {
    return () => {
      clearInterval(holdTimerRef.current);
      clearInterval(hapticIntervalRef.current);
      if (pulseAnimRef.current) pulseAnimRef.current.stop();
      if (breatheInAnimRef.current) breatheInAnimRef.current.stop();
      if (breatheOutAnimRef.current) breatheOutAnimRef.current.stop();
    };
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
    return `${secs}.${ms}`;
  };

  const phaseLabel =
    phase === 'breatheIn'
      ? 'Breathe In...'
      : phase === 'hold'
        ? 'Hold...'
        : phase === 'breatheOut'
          ? 'Breathe Out...'
          : '';

  const activeColor =
    phase === 'breatheIn'
      ? PHASE_COLORS.breatheIn
      : phase === 'hold'
        ? PHASE_COLORS.hold
        : phase === 'breatheOut'
          ? PHASE_COLORS.breatheOut
          : '#3B82F6';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            clearInterval(holdTimerRef.current);
            clearInterval(hapticIntervalRef.current);
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Breath Hold</Text>
        <View style={styles.bestTimeBox}>
          <MaterialIcons name="timer" size={16} color="#F59E0B" />
          <Text style={styles.bestTimeText}>
            {bestTime > 0 ? formatTime(bestTime) : '--'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {phase !== 'idle' && (
          <Animated.Text
            style={[styles.phaseText, { opacity: phaseTextOpacity, color: activeColor }]}
          >
            {phaseLabel}
          </Animated.Text>
        )}

        {phase === 'idle' && !showResult && (
          <Text style={styles.idleText}>Tap Start to begin</Text>
        )}

        <View style={styles.circleContainer}>
          <Animated.View
            style={[
              styles.circleOuter,
              {
                borderColor: activeColor,
                opacity: circleOpacity,
                transform: [
                  { scale: Animated.multiply(circleScale, circlePulse) },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circleInner,
              {
                backgroundColor: activeColor,
                transform: [
                  { scale: Animated.multiply(circleScale, circlePulse) },
                ],
              },
            ]}
          >
            {phase === 'hold' && (
              <Text style={styles.holdTimerText}>{formatTime(holdTime)}</Text>
            )}
            {phase === 'breatheIn' && (
              <MaterialIcons name="keyboard-arrow-up" size={56} color="rgba(255,255,255,0.8)" />
            )}
            {phase === 'breatheOut' && (
              <MaterialIcons name="keyboard-arrow-down" size={56} color="rgba(255,255,255,0.8)" />
            )}
            {phase === 'idle' && !showResult && (
              <MaterialIcons name="air" size={48} color="rgba(255,255,255,0.5)" />
            )}
          </Animated.View>
        </View>

        {phase === 'hold' && (
          <TouchableOpacity activeOpacity={0.8} onPress={release}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.releaseBtn}
            >
              <Text style={styles.releaseBtnText}>Release</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {phase === 'idle' && !showResult && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              hapticFeedback.medium();
              startBreatheIn();
            }}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>Start</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {showResult && lastHoldTime !== null && (
          <Animated.View style={[styles.resultContainer, { opacity: resultOpacity }]}>
            <Text style={styles.resultTime}>{formatTime(lastHoldTime)}</Text>
            <Text style={styles.resultLabel}>Hold Time</Text>

            {lastHoldTime >= bestTime && rounds > 1 && (
              <View style={styles.newBestBadge}>
                <MaterialIcons name="star" size={16} color="#F59E0B" />
                <Text style={styles.newBestText}>New Best!</Text>
              </View>
            )}

            <Text style={styles.encouragementText}>
              {getEncouragement(lastHoldTime)}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                hapticFeedback.medium();
                startBreatheIn();
              }}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goAgainBtn}
              >
                <MaterialIcons name="replay" size={20} color="#FFF" />
                <Text style={styles.goAgainText}>Go Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {(phase === 'breatheIn' || phase === 'breatheOut') && (
          <View style={styles.breatheHint}>
            <Text style={styles.breatheHintText}>
              {phase === 'breatheIn'
                ? 'Inhale slowly through your nose'
                : 'Exhale gently through your mouth'}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.statsBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.statBlock}>
          <Text style={styles.statBlockValue}>
            {phase === 'hold' ? formatTime(holdTime) : lastHoldTime ? formatTime(lastHoldTime) : '--'}
          </Text>
          <Text style={styles.statBlockLabel}>Current</Text>
        </View>
        <View style={[styles.statBlock, styles.statBlockCenter]}>
          <Text style={[styles.statBlockValue, { color: '#F59E0B' }]}>
            {bestTime > 0 ? formatTime(bestTime) : '--'}
          </Text>
          <Text style={styles.statBlockLabel}>Best</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statBlockValue}>{rounds}</Text>
          <Text style={styles.statBlockLabel}>Rounds</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bestTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bestTimeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F59E0B',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  phaseText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  idleText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 24,
  },
  circleContainer: {
    width: CIRCLE_SIZE + 30,
    height: CIRCLE_SIZE + 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  circleOuter: {
    position: 'absolute',
    width: CIRCLE_SIZE + 30,
    height: CIRCLE_SIZE + 30,
    borderRadius: (CIRCLE_SIZE + 30) / 2,
    borderWidth: 2,
  },
  circleInner: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.15,
  },
  holdTimerText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  releaseBtn: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 16,
  },
  releaseBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startBtn: {
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: 16,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultTime: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  newBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
    gap: 4,
  },
  newBestText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  encouragementText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  goAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  goAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breatheHint: {
    position: 'absolute',
    bottom: 20,
  },
  breatheHintText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },
  statsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statBlockCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statBlockValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statBlockLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
});

export default BreathHoldGame;
