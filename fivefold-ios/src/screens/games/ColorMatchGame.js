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

const COLORS = [
  { name: 'RED', hex: '#FF3B30' },
  { name: 'BLUE', hex: '#007AFF' },
  { name: 'GREEN', hex: '#34C759' },
  { name: 'YELLOW', hex: '#FFD60A' },
  { name: 'PURPLE', hex: '#AF52DE' },
  { name: 'ORANGE', hex: '#FF9500' },
  { name: 'PINK', hex: '#FF2D55' },
  { name: 'CYAN', hex: '#32D9CB' },
];

const getColorsForLevel = (level) => {
  if (level <= 3) return COLORS.slice(0, 4);
  if (level <= 6) return COLORS.slice(0, 5);
  if (level <= 10) return COLORS.slice(0, 6);
  return COLORS;
};

const getTimeForLevel = (level) => {
  if (level <= 3) return 3;
  if (level <= 6) return 2.5;
  if (level <= 10) return 2;
  if (level <= 15) return 1.5;
  return 1.2;
};

const generateRound = (level) => {
  const pool = getColorsForLevel(level);
  const wordColor = pool[Math.floor(Math.random() * pool.length)];
  const isMatch = Math.random() < 0.4;
  let bgColor;
  if (isMatch) {
    bgColor = pool.find((c) => c.name === wordColor.name);
  } else {
    const others = pool.filter((c) => c.name !== wordColor.name);
    bgColor = others[Math.floor(Math.random() * others.length)];
  }
  const textColor = pool[Math.floor(Math.random() * pool.length)];
  return { wordColor, bgColor, textColor, isMatch };
};

const ColorMatchGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [round, setRound] = useState(() => generateRound(1));
  const [timeLeft, setTimeLeft] = useState(3);
  const [feedback, setFeedback] = useState(null);

  const timerRef = useRef(null);
  const isAnswering = useRef(false);
  const wordScale = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(0.8)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const buttonYes = useRef(new Animated.Value(0)).current;
  const buttonNo = useRef(new Animated.Value(0)).current;

  const animateRoundIn = useCallback(() => {
    wordScale.setValue(0);
    bgScale.setValue(0.8);
    buttonYes.setValue(0);
    buttonNo.setValue(0);

    Animated.parallel([
      Animated.spring(wordScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
      Animated.spring(bgScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.spring(buttonYes, { toValue: 1, tension: 80, friction: 8, delay: 100, useNativeDriver: true }),
      Animated.spring(buttonNo, { toValue: 1, tension: 80, friction: 8, delay: 150, useNativeDriver: true }),
    ]).start();
  }, [wordScale, bgScale, buttonYes, buttonNo]);

  const startTimer = useCallback((limit) => {
    timerWidth.setValue(1);
    Animated.timing(timerWidth, {
      toValue: 0,
      duration: limit * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [timerWidth]);

  const nextRound = useCallback((currentLevel) => {
    isAnswering.current = false;
    const tl = getTimeForLevel(currentLevel);
    const r = generateRound(currentLevel);
    setRound(r);
    setTimeLeft(tl);
    setFeedback(null);
    animateRoundIn();
    startTimer(tl);
  }, [animateRoundIn, startTimer]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    animateRoundIn();
    startTimer(3);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing' || feedback) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [gameState, round, feedback]);

  const handleTimeout = () => {
    if (isAnswering.current) return;
    isAnswering.current = true;
    clearInterval(timerRef.current);
    hapticFeedback.error();
    setFeedback('timeout');
    setStreak(0);
    setRoundsPlayed((p) => p + 1);
    showFeedback();
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(() => setGameState('over'), 900);
      } else {
        const newLevel = Math.floor((roundsPlayed + 1) / 5) + 1;
        setTimeout(() => {
          setLevel(newLevel);
          nextRound(newLevel);
        }, 900);
      }
      return next;
    });
  };

  const showFeedback = () => {
    Animated.sequence([
      Animated.timing(feedbackOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 150, delay: 500, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = (answeredYes) => {
    if (isAnswering.current || gameState !== 'playing') return;
    isAnswering.current = true;
    clearInterval(timerRef.current);

    const isCorrect = answeredYes === round.isMatch;
    setRoundsPlayed((p) => p + 1);

    if (isCorrect) {
      hapticFeedback.success();
      const timeBonus = Math.round(timeLeft * 15);
      const newStreak = streak + 1;
      const streakBonus = newStreak >= 10 ? 200 : newStreak >= 5 ? 100 : 0;
      setScore((p) => p + 100 + timeBonus + streakBonus);
      setCorrectCount((p) => p + 1);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback('correct');
    } else {
      hapticFeedback.error();
      setFeedback('wrong');
      setStreak(0);
      setLives((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => setGameState('over'), 900);
        }
        return next;
      });
    }

    showFeedback();

    if (isCorrect || lives > 1) {
      const totalPlayed = roundsPlayed + 1;
      const newLevel = Math.floor(totalPlayed / 5) + 1;
      setTimeout(() => {
        setLevel(newLevel);
        nextRound(newLevel);
      }, 900);
    }
  };

  const resetGame = () => {
    hapticFeedback.medium();
    setScore(0);
    setLives(3);
    setLevel(1);
    setStreak(0);
    setBestStreak(0);
    setRoundsPlayed(0);
    setCorrectCount(0);
    setGameState('playing');
    setFeedback(null);
    isAnswering.current = false;
    const r = generateRound(1);
    setRound(r);
    setTimeLeft(3);
    animateRoundIn();
    startTimer(3);
  };

  const accuracy = roundsPlayed > 0 ? Math.round((correctCount / roundsPlayed) * 100) : 0;

  if (gameState === 'over') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Color Match</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.gameOverContainer}>
          <MaterialIcons name="emoji-events" size={72} color="#FF9500" />
          <Text style={styles.gameOverTitle}>Game Over</Text>

          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreLabel}>Final Score</Text>
            <Text style={styles.finalScoreValue}>{score.toLocaleString()}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{roundsPlayed}</Text>
              <Text style={styles.statItemLabel}>Rounds</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{accuracy}%</Text>
              <Text style={styles.statItemLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{bestStreak}</Text>
              <Text style={styles.statItemLabel}>Best Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{level}</Text>
              <Text style={styles.statItemLabel}>Level</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={resetGame}>
            <LinearGradient
              colors={['#FF9500', '#FF6B00']}
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
        </View>
      </View>
    );
  }

  const timeLimit = getTimeForLevel(level);
  const timerColor = timeLeft > timeLimit * 0.5 ? '#10B981' : timeLeft > timeLimit * 0.25 ? '#F59E0B' : '#EF4444';

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
        <Text style={styles.headerTitle}>Color Match</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{score}</Text>
          <View style={styles.livesRow}>
            {[...Array(3)].map((_, i) => (
              <MaterialIcons
                key={i}
                name="favorite"
                size={18}
                color={i < lives ? '#EF4444' : 'rgba(255,255,255,0.15)'}
                style={{ marginLeft: 2 }}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.timerBar}>
        <Animated.View
          style={[
            styles.timerFill,
            {
              backgroundColor: timerColor,
              width: timerWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>Level {level}</Text>
        {streak >= 3 && (
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={14} color="#FF9500" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>

      <View style={styles.instructionBar}>
        <Text style={styles.instructionText}>Does the word match the background color?</Text>
      </View>

      <Animated.View style={[styles.colorArea, { transform: [{ scale: bgScale }] }]}>
        <View style={[styles.colorBox, { backgroundColor: round.bgColor.hex }]}>
          <Animated.Text
            style={[
              styles.colorWord,
              { color: round.textColor.hex, transform: [{ scale: wordScale }] },
            ]}
          >
            {round.wordColor.name}
          </Animated.Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.feedbackOverlay,
          {
            opacity: feedbackOpacity,
            backgroundColor: feedback === 'correct' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
          },
        ]}
        pointerEvents="none"
      >
        <MaterialIcons
          name={feedback === 'correct' ? 'check-circle' : 'cancel'}
          size={56}
          color={feedback === 'correct' ? '#10B981' : '#EF4444'}
        />
      </Animated.View>

      <View style={styles.buttonsRow}>
        <Animated.View style={[styles.answerBtnWrap, { transform: [{ scale: buttonYes }], opacity: buttonYes }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleAnswer(true)}
            style={[styles.answerBtn, styles.yesBtn]}
          >
            <MaterialIcons name="check" size={28} color="#10B981" />
            <Text style={[styles.answerBtnText, { color: '#10B981' }]}>YES</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.answerBtnWrap, { transform: [{ scale: buttonNo }], opacity: buttonNo }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleAnswer(false)}
            style={[styles.answerBtn, styles.noBtn]}
          >
            <MaterialIcons name="close" size={28} color="#EF4444" />
            <Text style={[styles.answerBtnText, { color: '#EF4444' }]}>NO</Text>
          </TouchableOpacity>
        </Animated.View>
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
  scoreRow: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
  },
  livesRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  timerBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,149,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9500',
  },
  instructionBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  instructionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
  colorArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  colorBox: {
    width: width - 60,
    height: width - 60,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  colorWord: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 30,
    paddingBottom: 40,
    marginTop: 20,
  },
  answerBtnWrap: {
    flex: 1,
  },
  answerBtn: {
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
  },
  yesBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  noBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  answerBtnText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
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
  finalScoreBox: {
    marginTop: 24,
    alignItems: 'center',
  },
  finalScoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  finalScoreValue: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FF9500',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 32,
    gap: 16,
  },
  statItem: {
    width: (width - 96) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statItemLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  playAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 36,
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

export default ColorMatchGame;
