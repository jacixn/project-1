import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import hapticFeedback from '../../utils/haptics';

const { width } = Dimensions.get('window');
const TOTAL_ROUNDS = 10;

const ReactionTimeGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('idle');
  const [roundNum, setRoundNum] = useState(0);
  const [reactionTime, setReactionTime] = useState(null);
  const [allTimes, setAllTimes] = useState([]);
  const [bestTime, setBestTime] = useState(null);
  const [tooEarly, setTooEarly] = useState(false);

  const bgColor = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);

  const startRound = useCallback(() => {
    setReactionTime(null);
    setTooEarly(false);
    setGameState('waiting');
    bgColor.setValue(0);

    const delay = 2000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      setGameState('tap');
      Animated.timing(bgColor, { toValue: 1, duration: 150, useNativeDriver: false }).start();
      hapticFeedback.medium();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ).start();
    }, delay);
  }, [bgColor, pulseAnim]);

  const handleTap = () => {
    if (gameState === 'idle') {
      setRoundNum(1);
      setAllTimes([]);
      setBestTime(null);
      startRound();
      return;
    }

    if (gameState === 'waiting') {
      clearTimeout(timeoutRef.current);
      hapticFeedback.error();
      setTooEarly(true);
      setGameState('tooEarly');
      return;
    }

    if (gameState === 'tooEarly') {
      startRound();
      return;
    }

    if (gameState === 'tap') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      const ms = Date.now() - startTimeRef.current;
      setReactionTime(ms);
      hapticFeedback.success();

      const updatedTimes = [...allTimes, ms];
      setAllTimes(updatedTimes);
      if (!bestTime || ms < bestTime) setBestTime(ms);

      setGameState('result');
    }

    if (gameState === 'result') {
      if (roundNum >= TOTAL_ROUNDS) {
        setGameState('over');
        resultSlide.setValue(50);
        resultOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
          Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      } else {
        setRoundNum((r) => r + 1);
        startRound();
      }
    }
  };

  const resetGame = () => {
    hapticFeedback.medium();
    clearTimeout(timeoutRef.current);
    bgColor.setValue(0);
    setRoundNum(1);
    setAllTimes([]);
    setBestTime(null);
    setReactionTime(null);
    setTooEarly(false);
    setGameState('idle');
    setTimeout(() => {
      setGameState('waiting');
      startRound();
    }, 100);
  };

  const average = allTimes.length > 0 ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length) : 0;
  const worst = allTimes.length > 0 ? Math.max(...allTimes) : 0;

  const getReactionRating = (ms) => {
    if (ms < 200) return { text: 'Incredible!', color: '#34C759' };
    if (ms < 250) return { text: 'Amazing!', color: '#30D158' };
    if (ms < 300) return { text: 'Great!', color: '#10B981' };
    if (ms < 400) return { text: 'Good', color: '#F59E0B' };
    return { text: 'Keep Trying', color: '#FF9500' };
  };

  const getScreenBgColor = () => {
    if (gameState === 'tooEarly') return '#7A1A1A';
    return bgColor.interpolate({
      inputRange: [0, 1],
      outputRange: ['#0A0A0A', '#1A4A1A'],
    });
  };

  if (gameState === 'over') {
    const avgRating = getReactionRating(average);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); navigation.goBack(); }}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reaction Time</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[
          styles.gameOverContainer,
          { transform: [{ translateY: resultSlide }], opacity: resultOpacity },
        ]}>
          <MaterialIcons name="speed" size={72} color="#34C759" />
          <Text style={styles.gameOverTitle}>Results</Text>

          <View style={styles.bigStatBox}>
            <Text style={styles.bigStatLabel}>Average Reaction</Text>
            <Text style={[styles.bigStatValue, { color: avgRating.color }]}>{average}ms</Text>
            <Text style={[styles.bigStatRating, { color: avgRating.color }]}>{avgRating.text}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{bestTime}ms</Text>
              <Text style={styles.statItemLabel}>Best Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{worst}ms</Text>
              <Text style={styles.statItemLabel}>Worst Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{TOTAL_ROUNDS}</Text>
              <Text style={styles.statItemLabel}>Rounds</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{allTimes.length}</Text>
              <Text style={styles.statItemLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.timesRow}>
            {allTimes.map((t, i) => {
              const rating = getReactionRating(t);
              return (
                <View key={i} style={[styles.timeDot, { backgroundColor: rating.color }]}>
                  <Text style={styles.timeDotText}>{t}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={resetGame}>
            <LinearGradient
              colors={['#34C759', '#248A3D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playAgainBtn}
            >
              <MaterialIcons name="replay" size={22} color="#FFF" />
              <Text style={styles.playAgainText}>Play Again</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { hapticFeedback.light(); navigation.goBack(); }}
            style={styles.exitButton}
          >
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const getTapText = () => {
    if (gameState === 'idle') return 'Tap anywhere to start';
    if (gameState === 'waiting') return 'Wait for green...';
    if (gameState === 'tap') return 'TAP NOW!';
    if (gameState === 'tooEarly') return 'Too early! Tap to retry';
    if (gameState === 'result') {
      const rating = getReactionRating(reactionTime);
      return `${reactionTime}ms — ${rating.text}`;
    }
    return '';
  };

  const getTapSubtext = () => {
    if (gameState === 'result') return 'Tap to continue';
    if (gameState === 'idle') return `${TOTAL_ROUNDS} rounds`;
    return '';
  };

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, backgroundColor: getScreenBgColor() }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            clearTimeout(timeoutRef.current);
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reaction Time</Text>
        <View style={styles.headerRight}>
          {roundNum > 0 && (
            <Text style={styles.roundText}>{roundNum}/{TOTAL_ROUNDS}</Text>
          )}
        </View>
      </View>

      {roundNum > 0 && (
        <View style={styles.miniStats}>
          {bestTime && (
            <View style={styles.miniStatBox}>
              <MaterialIcons name="bolt" size={14} color="#34C759" />
              <Text style={styles.miniStatText}>Best: {bestTime}ms</Text>
            </View>
          )}
          {allTimes.length > 0 && (
            <View style={styles.miniStatBox}>
              <MaterialIcons name="timeline" size={14} color="#007AFF" />
              <Text style={styles.miniStatText}>Avg: {average}ms</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={styles.tapArea}
      >
        <Animated.View style={[styles.centerCircle, { transform: [{ scale: pulseAnim }] }]}>
          <MaterialIcons
            name={
              gameState === 'tap' ? 'touch-app' :
              gameState === 'tooEarly' ? 'error-outline' :
              gameState === 'result' ? 'check-circle' :
              gameState === 'waiting' ? 'hourglass-top' :
              'play-arrow'
            }
            size={64}
            color={
              gameState === 'tap' ? '#34C759' :
              gameState === 'tooEarly' ? '#FF3B30' :
              gameState === 'result' ? getReactionRating(reactionTime).color :
              '#FFFFFF'
            }
          />
        </Animated.View>

        <Text style={[
          styles.tapText,
          gameState === 'tap' && styles.tapTextGreen,
          gameState === 'tooEarly' && styles.tapTextRed,
        ]}>
          {getTapText()}
        </Text>

        {getTapSubtext() ? (
          <Text style={styles.tapSubtext}>{getTapSubtext()}</Text>
        ) : null}
      </TouchableOpacity>

      {roundNum > 0 && (
        <View style={styles.roundDots}>
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.roundDot,
                i < allTimes.length && styles.roundDotDone,
                i === roundNum - 1 && gameState !== 'over' && styles.roundDotCurrent,
              ]}
            />
          ))}
        </View>
      )}
    </Animated.View>
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
  headerRight: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
  roundText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  miniStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  miniStatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  tapArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  tapText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tapTextGreen: {
    color: '#34C759',
    fontSize: 32,
  },
  tapTextRed: {
    color: '#FF3B30',
  },
  tapSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
  },
  roundDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  roundDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  roundDotDone: {
    backgroundColor: '#34C759',
  },
  roundDotCurrent: {
    backgroundColor: '#FFFFFF',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
  },
  bigStatBox: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  bigStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  bigStatValue: {
    fontSize: 56,
    fontWeight: '900',
    marginTop: 4,
  },
  bigStatRating: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
    gap: 12,
  },
  statItem: {
    width: (width - 96) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItemValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  timeDot: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    opacity: 0.9,
  },
  timeDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 28,
    gap: 8,
  },
  playAgainText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exitButton: {
    paddingVertical: 14,
    marginTop: 4,
  },
  exitText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
});

export default ReactionTimeGame;
