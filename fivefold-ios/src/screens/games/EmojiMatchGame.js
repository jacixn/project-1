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

const IDENTICAL_PAIRS = [
  ['😀', '😀'], ['🐶', '🐶'], ['🌟', '🌟'], ['🎵', '🎵'], ['🔥', '🔥'],
  ['💎', '💎'], ['🎯', '🎯'], ['🚀', '🚀'], ['🌈', '🌈'], ['🎪', '🎪'],
  ['🦋', '🦋'], ['🍕', '🍕'], ['⚡', '⚡'], ['🎸', '🎸'], ['🌸', '🌸'],
];

const EASY_DIFFERENT = [
  ['😀', '😢'], ['🐶', '🐱'], ['🌞', '🌙'], ['🍎', '🍊'], ['❤️', '💙'],
  ['🚗', '✈️'], ['⚽', '🏀'], ['🌲', '🌵'], ['🐟', '🦅'], ['🎸', '🎹'],
  ['🍕', '🍔'], ['🌻', '🌹'], ['🦁', '🐘'], ['📱', '💻'], ['🎭', '🎪'],
];

const TRICKY_DIFFERENT = [
  ['🐶', '🐕'], ['😀', '😃'], ['😊', '🙂'], ['🐱', '🐈'], ['🏠', '🏡'],
  ['👋', '✋'], ['😄', '😁'], ['🌞', '☀️'], ['💗', '💖'], ['🙃', '😊'],
  ['😍', '🥰'], ['🤣', '😂'], ['😎', '🤩'], ['🐕', '🐩'], ['🌺', '🌸'],
  ['🍎', '🍏'], ['💜', '💟'], ['🖐️', '✋'], ['😗', '😚'], ['🤗', '🤭'],
  ['🦊', '🐺'], ['🐻', '🧸'], ['🌊', '🏖️'], ['⭐', '🌟'], ['🎈', '🎉'],
  ['🥳', '🤩'], ['😇', '👼'], ['🐝', '🐛'], ['🍋', '🟡'], ['🎀', '🎗️'],
];

const getTimeForLevel = (round) => {
  if (round <= 5) return 4;
  if (round <= 15) return 3;
  if (round <= 30) return 2.5;
  if (round <= 50) return 2;
  return 1.5;
};

const generateRound = (roundNum) => {
  const isSame = Math.random() < 0.45;

  if (isSame) {
    const pair = IDENTICAL_PAIRS[Math.floor(Math.random() * IDENTICAL_PAIRS.length)];
    return { emoji1: pair[0], emoji2: pair[1], isSame: true };
  }

  let pool;
  if (roundNum <= 8) {
    pool = EASY_DIFFERENT;
  } else if (roundNum <= 20) {
    pool = Math.random() < 0.4 ? TRICKY_DIFFERENT : EASY_DIFFERENT;
  } else {
    pool = Math.random() < 0.7 ? TRICKY_DIFFERENT : EASY_DIFFERENT;
  }

  const pair = pool[Math.floor(Math.random() * pool.length)];
  const swap = Math.random() < 0.5;
  return {
    emoji1: swap ? pair[1] : pair[0],
    emoji2: swap ? pair[0] : pair[1],
    isSame: false,
  };
};

const EmojiMatchGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [round, setRound] = useState(() => generateRound(1));
  const [roundNum, setRoundNum] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(4);
  const [feedback, setFeedback] = useState(null);

  const timerRef = useRef(null);
  const isAnswering = useRef(false);
  const emojiScale1 = useRef(new Animated.Value(0)).current;
  const emojiScale2 = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const buttonSame = useRef(new Animated.Value(0)).current;
  const buttonDiff = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    emojiScale1.setValue(0);
    emojiScale2.setValue(0);
    buttonSame.setValue(0);
    buttonDiff.setValue(0);

    Animated.parallel([
      Animated.spring(emojiScale1, { toValue: 1, tension: 100, friction: 7, delay: 0, useNativeDriver: true }),
      Animated.spring(emojiScale2, { toValue: 1, tension: 100, friction: 7, delay: 150, useNativeDriver: true }),
      Animated.spring(buttonSame, { toValue: 1, tension: 80, friction: 8, delay: 200, useNativeDriver: true }),
      Animated.spring(buttonDiff, { toValue: 1, tension: 80, friction: 8, delay: 250, useNativeDriver: true }),
    ]).start();
  }, [emojiScale1, emojiScale2, buttonSame, buttonDiff]);

  const startTimer = useCallback((limit) => {
    timerWidth.setValue(1);
    Animated.timing(timerWidth, {
      toValue: 0,
      duration: limit * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [timerWidth]);

  const nextRound = useCallback((rn) => {
    isAnswering.current = false;
    const tl = getTimeForLevel(rn);
    const r = generateRound(rn);
    setRound(r);
    setTimeLeft(tl);
    setFeedback(null);
    animateIn();
    startTimer(tl);
  }, [animateIn, startTimer]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    animateIn();
    startTimer(4);
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
  }, [gameState, roundNum, feedback]);

  const handleTimeout = () => {
    if (isAnswering.current) return;
    isAnswering.current = true;
    clearInterval(timerRef.current);
    hapticFeedback.error();
    setFeedback('timeout');
    setStreak(0);
    setTotal((t) => t + 1);
    showFeedback();
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(() => setGameState('over'), 900);
      } else {
        const rn = roundNum + 1;
        setTimeout(() => {
          setRoundNum(rn);
          nextRound(rn);
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

  const handleAnswer = (answeredSame) => {
    if (isAnswering.current || gameState !== 'playing') return;
    isAnswering.current = true;
    clearInterval(timerRef.current);

    const isCorrect = answeredSame === round.isSame;
    setTotal((t) => t + 1);

    if (isCorrect) {
      hapticFeedback.success();
      const timeBonus = Math.round(timeLeft * 20);
      const newStreak = streak + 1;
      const streakBonus = newStreak >= 10 ? 200 : newStreak >= 5 ? 100 : 0;
      setScore((s) => s + 100 + timeBonus + streakBonus);
      setCorrect((c) => c + 1);
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
      const rn = roundNum + 1;
      setTimeout(() => {
        setRoundNum(rn);
        nextRound(rn);
      }, 900);
    }
  };

  const resetGame = () => {
    hapticFeedback.medium();
    setScore(0);
    setLives(3);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setTotal(0);
    setRoundNum(1);
    setGameState('playing');
    setFeedback(null);
    isAnswering.current = false;
    const r = generateRound(1);
    setRound(r);
    setTimeLeft(4);
    animateIn();
    startTimer(4);
  };

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

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
          <Text style={styles.headerTitle}>Emoji Match</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverEmoji}>🎯</Text>
          <Text style={styles.gameOverTitle}>Game Over</Text>

          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreLabel}>Final Score</Text>
            <Text style={styles.finalScoreValue}>{score.toLocaleString()}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{roundNum - 1}</Text>
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
              <Text style={styles.statItemValue}>{correct}</Text>
              <Text style={styles.statItemLabel}>Correct</Text>
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

  const timeLimit = getTimeForLevel(roundNum);
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
        <Text style={styles.headerTitle}>Emoji Match</Text>
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

      <View style={styles.roundInfo}>
        <Text style={styles.roundText}>Round {roundNum}</Text>
        {streak >= 3 && (
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={14} color="#FF9500" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>

      <View style={styles.instructionBar}>
        <Text style={styles.instructionText}>Are these two emojis the same?</Text>
      </View>

      <View style={styles.emojiArea}>
        <View style={styles.emojiPair}>
          <Animated.View style={[styles.emojiBox, { transform: [{ scale: emojiScale1 }] }]}>
            <Text style={styles.emojiText}>{round.emoji1}</Text>
          </Animated.View>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <Animated.View style={[styles.emojiBox, { transform: [{ scale: emojiScale2 }] }]}>
            <Text style={styles.emojiText}>{round.emoji2}</Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View
        style={[
          styles.feedbackOverlay,
          {
            opacity: feedbackOpacity,
            backgroundColor:
              feedback === 'correct' ? 'rgba(16,185,129,0.2)' :
              feedback === 'wrong' ? 'rgba(239,68,68,0.2)' :
              'rgba(239,68,68,0.2)',
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
        <Animated.View style={[styles.answerBtnWrap, { transform: [{ scale: buttonSame }], opacity: buttonSame }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleAnswer(true)}
            style={[styles.answerBtn, styles.sameBtn]}
          >
            <MaterialIcons name="check" size={28} color="#10B981" />
            <Text style={[styles.answerBtnText, { color: '#10B981' }]}>SAME</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.answerBtnWrap, { transform: [{ scale: buttonDiff }], opacity: buttonDiff }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleAnswer(false)}
            style={[styles.answerBtn, styles.diffBtn]}
          >
            <MaterialIcons name="close" size={28} color="#EF4444" />
            <Text style={[styles.answerBtnText, { color: '#EF4444' }]}>DIFF</Text>
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
  roundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  roundText: {
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
  emojiArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  emojiBox: {
    width: (width - 100) / 2,
    height: (width - 100) / 2,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 72,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
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
  sameBtn: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  diffBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  answerBtnText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  gameOverEmoji: {
    fontSize: 64,
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

export default EmojiMatchGame;
