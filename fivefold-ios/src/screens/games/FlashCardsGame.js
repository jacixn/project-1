import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMOJI_CARDS = [
  '🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🦄',
  '🐝', '🦋', '🐢', '🐙', '🦀', '🐬', '🦅', '🐧',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌸', '🌻', '🌙', '⭐', '🔥', '💎', '🎸', '🎯',
  '🚀', '🎲', '🧩', '🎭', '🏆', '⚡', '🌊', '🎪',
];

const COLOR_CARDS = [
  { name: 'Red', color: '#FF3B30' },
  { name: 'Blue', color: '#007AFF' },
  { name: 'Green', color: '#34C759' },
  { name: 'Yellow', color: '#FFD60A' },
  { name: 'Purple', color: '#AF52DE' },
  { name: 'Orange', color: '#FF9500' },
  { name: 'Pink', color: '#FF2D55' },
  { name: 'Teal', color: '#5AC8FA' },
  { name: 'Indigo', color: '#5856D6' },
  { name: 'Mint', color: '#00C7BE' },
];

const NUMBER_CARDS = Array.from({ length: 50 }, (_, i) => i + 1);

const CARD_TYPES = ['emoji', 'color', 'number', 'emoji', 'number', 'color'];

function getDisplayTime(level) {
  if (level <= 3) return 2000;
  if (level <= 6) return 1500;
  if (level <= 10) return 1000;
  if (level <= 15) return 750;
  return 500;
}

function generateRound(level) {
  const typeIndex = (level - 1) % CARD_TYPES.length;
  const cardType = CARD_TYPES[typeIndex];
  let card, correctAnswer, options;

  if (cardType === 'emoji') {
    const shuffled = [...EMOJI_CARDS].sort(() => Math.random() - 0.5);
    card = { type: 'emoji', value: shuffled[0] };
    correctAnswer = shuffled[0];
    const wrongOptions = shuffled.slice(1, 4);
    options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
  } else if (cardType === 'color') {
    const shuffled = [...COLOR_CARDS].sort(() => Math.random() - 0.5);
    card = { type: 'color', value: shuffled[0] };
    correctAnswer = shuffled[0].name;
    const wrongOptions = shuffled.slice(1, 4).map(c => c.name);
    options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
  } else {
    const shuffled = [...NUMBER_CARDS].sort(() => Math.random() - 0.5);
    card = { type: 'number', value: shuffled[0] };
    correctAnswer = String(shuffled[0]);
    const wrongOptions = shuffled.slice(1, 4).map(n => String(n));
    options = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
  }

  return { card, correctAnswer, options, displayTime: getDisplayTime(level) };
}

const FlashCardsGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(() => generateRound(1));
  const [phase, setPhase] = useState('showing');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [lives, setLives] = useState(3);

  const livesRef = useRef(3);
  const cardFlip = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const showTimerRef = useRef(null);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const startShowPhase = useCallback(() => {
    setPhase('showing');
    cardFlip.setValue(0);
    optionsOpacity.setValue(0);
    cardScale.setValue(0.5);

    Animated.spring(cardScale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: round.displayTime,
      useNativeDriver: false,
    }).start();

    showTimerRef.current = setTimeout(() => {
      setPhase('answering');
      Animated.sequence([
        Animated.timing(cardFlip, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(optionsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, round.displayTime);
  }, [round, cardFlip, cardScale, optionsOpacity, progressAnim]);

  useEffect(() => {
    if (gameState === 'playing') {
      startShowPhase();
    }
    return () => { if (showTimerRef.current) clearTimeout(showTimerRef.current); };
  }, [level, gameState]);

  const handleAnswer = useCallback((answer) => {
    if (phase !== 'answering' || selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    setTotal(prev => prev + 1);

    const isCorrect = answer === round.correctAnswer;

    if (isCorrect) {
      hapticFeedback.success();
      setCorrect(prev => prev + 1);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const speedBonus = Math.round((round.displayTime <= 1000 ? 3 : round.displayTime <= 1500 ? 2 : 1) * 15);
      const streakBonus = Math.min(newStreak * 5, 50);
      const points = 20 + level * 3 + speedBonus + streakBonus;
      setScore(prev => prev + points);

      Animated.sequence([
        Animated.timing(cardScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        const nextLevel = level + 1;
        setLevel(nextLevel);
        setRound(generateRound(nextLevel));
        setSelectedAnswer(null);
        progressAnim.setValue(1);
      }, 800);
    } else {
      hapticFeedback.error();
      setStreak(0);
      const newLives = livesRef.current - 1;
      setLives(newLives);

      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      if (newLives <= 0) {
        setTimeout(() => {
          setGameState('gameover');
          Animated.parallel([
            Animated.spring(resultSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
            Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]).start();
        }, 800);
      } else {
        setTimeout(() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setRound(generateRound(nextLevel));
          setSelectedAnswer(null);
          progressAnim.setValue(1);
        }, 1000);
      }
    }
  }, [phase, selectedAnswer, round, streak, bestStreak, level, cardScale, flashAnim, resultSlide, resultOpacity, progressAnim]);

  const resetGame = useCallback(() => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setTotal(0);
    setRound(generateRound(1));
    setPhase('showing');
    setSelectedAnswer(null);
    setLives(3);
    cardFlip.setValue(0);
    cardScale.setValue(1);
    optionsOpacity.setValue(0);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    progressAnim.setValue(1);
    hapticFeedback.medium();
  }, [cardFlip, cardScale, optionsOpacity, resultSlide, resultOpacity, progressAnim]);

  const livesDisplay = Array.from({ length: 3 }, (_, i) => (
    <MaterialIcons
      key={i}
      name="favorite"
      size={18}
      color={i < lives ? '#FF3B80' : 'rgba(255,255,255,0.15)'}
    />
  ));

  const flipInterpolate = cardFlip.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 90, 0],
  });

  const cardOpacity = cardFlip.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [1, 1, 0, 0],
  });

  const questionOpacity = cardFlip.interpolate({
    inputRange: [0, 0.45, 0.55, 1],
    outputRange: [0, 0, 1, 1],
  });

  const renderCardContent = () => {
    const { card } = round;
    if (card.type === 'emoji') {
      return <Text style={styles.cardEmoji}>{card.value}</Text>;
    } else if (card.type === 'color') {
      return (
        <View style={[styles.colorSwatch, { backgroundColor: card.value.color }]}>
          <Text style={styles.colorLabel}>{card.value.name}</Text>
        </View>
      );
    } else {
      return <Text style={styles.cardNumber}>{card.value}</Text>;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View
        style={[styles.damageFlash, { opacity: flashAnim }]}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flash Cards</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Lvl {level}</Text>
        </View>
        <View style={styles.statPill}>
          <View style={styles.livesRow}>{livesDisplay}</View>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="whatshot" size={14} color="#FFB800" />
          <Text style={styles.statLabel}>{streak}x</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>{correct}/{total}</Text>
        </View>
      </View>

      {gameState === 'playing' && (
        <View style={styles.gameArea}>
          {phase === 'showing' && (
            <View style={styles.timerBarContainer}>
              <View style={styles.timerBar}>
                <Animated.View style={[styles.timerFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.displayTimeLabel}>
                {(round.displayTime / 1000).toFixed(1)}s
              </Text>
            </View>
          )}

          <View style={styles.cardContainer}>
            <Animated.View
              style={[
                styles.flashCard,
                {
                  transform: [
                    { scale: cardScale },
                    { rotateY: flipInterpolate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
                  ],
                },
              ]}
            >
              <Animated.View style={[styles.cardFront, { opacity: cardOpacity }]}>
                <LinearGradient
                  colors={['#1A1A2E', '#2A2A4E']}
                  style={styles.cardGradient}
                >
                  {renderCardContent()}
                  <Text style={styles.rememberText}>Remember this!</Text>
                </LinearGradient>
              </Animated.View>

              <Animated.View style={[styles.cardBack, { opacity: questionOpacity }]}>
                <LinearGradient
                  colors={['#1E1E3A', '#2A2A4E']}
                  style={styles.cardGradient}
                >
                  <MaterialIcons name="help-outline" size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.questionText}>What was shown?</Text>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
          </View>

          {phase === 'answering' && (
            <Animated.View style={[styles.optionsContainer, { opacity: optionsOpacity }]}>
              {round.options.map((option, i) => {
                const isSelected = selectedAnswer === option;
                const isCorrectOption = option === round.correctAnswer;
                const showResult = selectedAnswer !== null;

                let bgColors = ['#1A1A2E', '#1E1E3A'];
                let borderColor = 'rgba(255,255,255,0.08)';

                if (showResult) {
                  if (isCorrectOption) {
                    bgColors = ['#166534', '#15803D'];
                    borderColor = '#4ADE80';
                  } else if (isSelected && !isCorrectOption) {
                    bgColors = ['#7F1D1D', '#991B1B'];
                    borderColor = '#FF3B30';
                  }
                }

                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={() => handleAnswer(option)}
                    disabled={selectedAnswer !== null}
                    style={styles.optionButton}
                  >
                    <LinearGradient
                      colors={bgColors}
                      style={[styles.optionGradient, { borderColor }]}
                    >
                      <Text style={styles.optionText}>{option}</Text>
                      {showResult && isCorrectOption && (
                        <MaterialIcons name="check-circle" size={20} color="#4ADE80" />
                      )}
                      {showResult && isSelected && !isCorrectOption && (
                        <MaterialIcons name="cancel" size={20} color="#FF3B30" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}
        </View>
      )}

      {gameState === 'gameover' && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: resultOpacity, transform: [{ translateY: resultSlide }] },
            ]}
          >
            <LinearGradient
              colors={['#1E1E4A', '#2A2A5E', '#1E1E4A']}
              style={styles.resultGradient}
            >
              <Text style={styles.resultEmoji}>🃏</Text>
              <Text style={styles.resultTitle}>Game Over</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Correct</Text>
                  <Text style={styles.sValue}>{correct}/{total}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Accuracy</Text>
                  <Text style={styles.sValue}>{total > 0 ? Math.round((correct / total) * 100) : 0}%</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Best Streak</Text>
                  <Text style={styles.sValue}>{bestStreak}x</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Level Reached</Text>
                  <Text style={styles.sValue}>{level}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabelBig}>Final Score</Text>
                  <Text style={[styles.sValueBig, { color: '#FFD700' }]}>
                    {score.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={resetGame}
                style={styles.playAgainButton}
              >
                <LinearGradient
                  colors={['#4A3AFF', '#6B5AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.playAgainGradient}
                >
                  <MaterialIcons name="replay" size={20} color="#FFF" />
                  <Text style={styles.playAgainText}>Play Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default FlashCardsGame;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  damageFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
    zIndex: 999,
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  scoreContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timerBarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerBar: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  timerFill: {
    height: '100%',
    backgroundColor: '#4A3AFF',
    borderRadius: 2,
  },
  displayTimeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  flashCard: {
    width: SCREEN_WIDTH - 80,
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardFront: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  cardBack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  cardEmoji: {
    fontSize: 64,
  },
  cardNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  colorSwatch: {
    width: 120,
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rememberText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  resultCard: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  resultGradient: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,100,200,0.2)',
    borderRadius: 24,
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  scoreBreakdown: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  sValue: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  scoreDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  sLabelBig: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sValueBig: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4ADE80',
  },
  playAgainButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  playAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  playAgainText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
