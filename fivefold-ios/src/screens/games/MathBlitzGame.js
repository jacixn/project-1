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
const CARD_SIZE = (width - 60) / 2;

const generateQuestion = (level) => {
  let a, b, op, correct, display;

  if (level <= 5) {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    if (Math.random() < 0.5) {
      op = '+';
      correct = a + b;
    } else {
      if (a < b) [a, b] = [b, a];
      op = '−';
      correct = a - b;
    }
    display = `${a} ${op} ${b}`;
  } else if (level <= 10) {
    a = Math.floor(Math.random() * 91) + 10;
    b = Math.floor(Math.random() * 91) + 10;
    if (Math.random() < 0.5) {
      op = '+';
      correct = a + b;
    } else {
      if (a < b) [a, b] = [b, a];
      op = '−';
      correct = a - b;
    }
    display = `${a} ${op} ${b}`;
  } else if (level <= 15) {
    a = Math.floor(Math.random() * 11) + 2;
    b = Math.floor(Math.random() * 11) + 2;
    correct = a * b;
    display = `${a} × ${b}`;
  } else if (level <= 20) {
    const opType = Math.floor(Math.random() * 4);
    if (opType === 0) {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 50) + 10;
      correct = a + b;
      display = `${a} + ${b}`;
    } else if (opType === 1) {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * 20) + 1;
      correct = a - b;
      display = `${a} − ${b}`;
    } else if (opType === 2) {
      a = Math.floor(Math.random() * 11) + 2;
      b = Math.floor(Math.random() * 11) + 2;
      correct = a * b;
      display = `${a} × ${b}`;
    } else {
      b = Math.floor(Math.random() * 11) + 2;
      correct = Math.floor(Math.random() * 11) + 2;
      a = b * correct;
      display = `${a} ÷ ${b}`;
    }
  } else {
    const first = Math.floor(Math.random() * 10) + 2;
    const second = Math.floor(Math.random() * 10) + 2;
    const third = Math.floor(Math.random() * 20) + 1;
    if (Math.random() < 0.5) {
      correct = first * second + third;
      display = `${first} × ${second} + ${third}`;
    } else {
      correct = first * second - third;
      display = `${first} × ${second} − ${third}`;
    }
  }

  const wrongSet = new Set();
  wrongSet.add(correct);
  while (wrongSet.size < 4) {
    const offset = Math.floor(Math.random() * Math.max(10, Math.abs(correct) * 0.3)) + 1;
    const wrong = Math.random() < 0.5 ? correct + offset : correct - offset;
    if (wrong !== correct && !wrongSet.has(wrong)) {
      wrongSet.add(wrong);
    }
  }

  const options = Array.from(wrongSet).sort(() => Math.random() - 0.5);
  return { display, correct, options };
};

const getTimeLimit = (level) => {
  const reduction = Math.floor((level - 1) / 5) * 0.3;
  return Math.max(3, 8 - reduction);
};

const MathBlitzGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [question, setQuestion] = useState(() => generateQuestion(1));
  const [timeLeft, setTimeLeft] = useState(8);
  const [feedback, setFeedback] = useState(null);

  const equationScale = useRef(new Animated.Value(0)).current;
  const buttonAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const timerWidth = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);
  const isAnswering = useRef(false);

  const animateIn = useCallback(() => {
    equationScale.setValue(0);
    buttonAnims.forEach((a) => a.setValue(0));

    Animated.spring(equationScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();

    buttonAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        delay: 80 + i * 50,
        useNativeDriver: true,
      }).start();
    });
  }, [equationScale, buttonAnims]);

  const startTimer = useCallback(
    (limit) => {
      timerWidth.setValue(1);
      Animated.timing(timerWidth, {
        toValue: 0,
        duration: limit * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    },
    [timerWidth],
  );

  const nextRound = useCallback(
    (currentLevel) => {
      isAnswering.current = false;
      const tl = getTimeLimit(currentLevel);
      const q = generateQuestion(currentLevel);
      setQuestion(q);
      setTimeLeft(tl);
      setFeedback(null);
      animateIn();
      startTimer(tl);
    },
    [animateIn, startTimer],
  );

  useEffect(() => {
    if (gameState !== 'playing') return;
    animateIn();
    startTimer(8);
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
  }, [gameState, question, feedback]);

  const handleTimeout = () => {
    if (isAnswering.current) return;
    isAnswering.current = true;
    clearInterval(timerRef.current);
    hapticFeedback.error();
    setFeedback('timeout');
    setQuestionsAnswered((p) => p + 1);
    setStreak(0);

    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 150,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const totalAnswered = questionsAnswered + 1;
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setTimeout(() => setGameState('over'), 900);
      } else {
        const newLevel = Math.floor(totalAnswered / 5) + 1;
        setTimeout(() => {
          setLevel(newLevel);
          nextRound(newLevel);
        }, 900);
      }
      return next;
    });
  };

  const handleAnswer = (answer) => {
    if (isAnswering.current || gameState !== 'playing') return;
    isAnswering.current = true;
    clearInterval(timerRef.current);

    const isCorrect = answer === question.correct;
    setQuestionsAnswered((p) => p + 1);

    if (isCorrect) {
      hapticFeedback.success();
      const timeBonus = Math.round(timeLeft * 10);
      const newStreak = streak + 1;
      const streakBonus = newStreak > 0 && newStreak % 5 === 0 ? 500 : 0;
      setScore((p) => p + 100 + timeBonus + streakBonus);
      setCorrectAnswers((p) => p + 1);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setFeedback('correct');

      if (streakBonus > 0) hapticFeedback.achievement();
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

    Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 150,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    if (isCorrect || lives > 1) {
      const totalAnswered = questionsAnswered + 1;
      const newLevel = Math.floor(totalAnswered / 5) + 1;
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
    setQuestionsAnswered(0);
    setCorrectAnswers(0);
    setStreak(0);
    setBestStreak(0);
    setGameState('playing');
    setFeedback(null);
    isAnswering.current = false;
    const q = generateQuestion(1);
    setQuestion(q);
    setTimeLeft(8);
    animateIn();
    startTimer(8);
  };

  const accuracy =
    questionsAnswered > 0
      ? Math.round((correctAnswers / questionsAnswered) * 100)
      : 0;

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
          <Text style={styles.headerTitle}>Math Blitz</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.gameOverContainer}>
          <MaterialIcons name="emoji-events" size={72} color="#F59E0B" />
          <Text style={styles.gameOverTitle}>Game Over</Text>

          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreLabel}>Final Score</Text>
            <Text style={styles.finalScoreValue}>{score.toLocaleString()}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{questionsAnswered}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bestStreak}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={resetGame}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playAgainBtn}
            >
              <MaterialIcons name="replay" size={22} color="#FFF" />
              <Text style={styles.playAgainText}>Play Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const timerColor =
    timeLeft > getTimeLimit(level) * 0.5
      ? '#10B981'
      : timeLeft > getTimeLimit(level) * 0.25
        ? '#F59E0B'
        : '#EF4444';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Math Blitz</Text>
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
            <MaterialIcons name="local-fire-department" size={14} color="#F59E0B" />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>

      <View style={styles.equationArea}>
        <Animated.View
          style={{
            transform: [{ scale: equationScale }],
          }}
        >
          <Text style={styles.equationText}>{question.display}</Text>
          <Text style={styles.equalsText}>= ?</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.feedbackOverlay,
            {
              opacity: feedbackOpacity,
              backgroundColor:
                feedback === 'correct'
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(239,68,68,0.15)',
            },
          ]}
          pointerEvents="none"
        >
          <MaterialIcons
            name={feedback === 'correct' ? 'check-circle' : 'cancel'}
            size={48}
            color={feedback === 'correct' ? '#10B981' : '#EF4444'}
          />
        </Animated.View>
      </View>

      <View style={styles.answersGrid}>
        {question.options.map((option, i) => (
          <Animated.View
            key={`${question.display}-${i}`}
            style={[
              styles.answerCardWrapper,
              {
                transform: [{ scale: buttonAnims[i] }],
                opacity: buttonAnims[i],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAnswer(option)}
              style={[
                styles.answerCard,
                feedback && option === question.correct && styles.answerCorrect,
                feedback === 'wrong' &&
                  option !== question.correct &&
                  styles.answerWrong,
              ]}
            >
              <Text style={styles.answerText}>{option}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
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
    color: '#F59E0B',
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
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  equationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  equationText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  equalsText: {
    fontSize: 32,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 4,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  answersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  answerCardWrapper: {
    width: CARD_SIZE,
  },
  answerCard: {
    width: '100%',
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  answerCorrect: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: '#10B981',
  },
  answerWrong: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  answerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#F59E0B',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 32,
    gap: 20,
  },
  statItem: {
    width: (width - 100) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
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
});

export default MathBlitzGame;
