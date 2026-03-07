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

const { width } = Dimensions.get('window');

const COLORS = [
  { name: 'RED', hex: '#FF3B30' },
  { name: 'BLUE', hex: '#007AFF' },
  { name: 'GREEN', hex: '#34C759' },
  { name: 'YELLOW', hex: '#FFD60A' },
];

const getTimerForLevel = (level) => {
  if (level <= 5) return 5;
  if (level <= 10) return 4;
  if (level <= 15) return 3;
  return 2.5;
};

const pickRound = () => {
  const wordIndex = Math.floor(Math.random() * COLORS.length);
  let colorIndex;
  do {
    colorIndex = Math.floor(Math.random() * COLORS.length);
  } while (colorIndex === wordIndex);
  return { word: COLORS[wordIndex].name, displayColor: COLORS[colorIndex] };
};

const StroopTestGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing'); // 'playing' | 'gameover'
  const [level, setLevel] = useState(1);
  const [roundNum, setRoundNum] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(() => pickRound());
  const [timeLeft, setTimeLeft] = useState(5);
  const [maxTime, setMaxTime] = useState(5);

  const timerRef = useRef(null);
  const wordScale = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const buttonAnims = useRef(COLORS.map(() => new Animated.Value(1))).current;

  const startRound = useCallback(() => {
    const newRound = pickRound();
    const timer = getTimerForLevel(level);
    setRound(newRound);
    setTimeLeft(timer);
    setMaxTime(timer);

    wordScale.setValue(0.3);
    wordOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(wordScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
      Animated.timing(wordOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [level, wordScale, wordOpacity]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    startRound();
  }, [gameState, roundNum]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timerRef.current);
          handleWrong();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [gameState, roundNum]);

  const handleWrong = () => {
    hapticFeedback.error();
    setStreak(0);
    setTotal((t) => t + 1);
    setScore((s) => Math.max(0, s - 50));

    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.4, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    setMistakes((prev) => {
      const newMistakes = prev + 1;
      if (newMistakes >= 3) {
        clearInterval(timerRef.current);
        setTimeout(() => showGameOver(), 400);
      } else {
        setTimeout(() => setRoundNum((r) => r + 1), 500);
      }
      return newMistakes;
    });
  };

  const showGameOver = () => {
    setGameState('gameover');
    hapticFeedback.heavy();
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleColorPress = (colorName, index) => {
    if (gameState !== 'playing') return;
    clearInterval(timerRef.current);

    Animated.sequence([
      Animated.timing(buttonAnims[index], { toValue: 0.85, duration: 60, useNativeDriver: true }),
      Animated.spring(buttonAnims[index], { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();

    if (colorName === round.displayColor.name) {
      hapticFeedback.success();
      const timeBonus = Math.round(timeLeft * 20);
      setScore((s) => s + 100 + timeBonus);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setCorrect((c) => c + 1);
      setTotal((t) => t + 1);

      const newLevel = Math.floor((correct + 1) / 5) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        hapticFeedback.levelUp();
      }

      Animated.sequence([
        Animated.timing(wordOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start(() => {
        setRoundNum((r) => r + 1);
      });
    } else {
      handleWrong();
    }
  };

  const handlePlayAgain = () => {
    hapticFeedback.medium();
    setGameState('playing');
    setLevel(1);
    setRoundNum(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setMistakes(0);
    setCorrect(0);
    setTotal(0);
  };

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const timerProgress = maxTime > 0 ? timeLeft / maxTime : 0;
  const timerColor = timerProgress > 0.5 ? '#4AEADC' : timerProgress > 0.25 ? '#FFAA00' : '#FF4444';

  if (gameState === 'gameover') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View style={[
          styles.resultsContainer,
          { transform: [{ translateY: resultSlide }], opacity: resultOpacity },
        ]}>
          <MaterialIcons name="emoji-events" size={64} color="#FFD700" />
          <Text style={styles.gameOverTitle}>Game Over</Text>

          <View style={styles.resultsGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>{score}</Text>
              <Text style={styles.resultLabel}>Score</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>{bestStreak}</Text>
              <Text style={styles.resultLabel}>Best Streak</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>{accuracy}%</Text>
              <Text style={styles.resultLabel}>Accuracy</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultValue}>Lv {level}</Text>
              <Text style={styles.resultLabel}>Reached</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handlePlayAgain} style={styles.playAgainOuter}>
            <LinearGradient
              colors={['#2A4A1A', '#3A6A2A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playAgainGradient}
            >
              <MaterialIcons name="replay" size={22} color="#FFFFFF" />
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
        <Text style={styles.headerTitle}>Stroop Test</Text>
        <View style={styles.headerRight}>
          <Text style={styles.levelText}>Lv {level}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <MaterialIcons name="star" size={16} color="#FFD700" />
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statBox}>
          <MaterialIcons name="local-fire-department" size={16} color="#FF6B35" />
          <Text style={styles.statValue}>{streak}</Text>
        </View>
        <View style={styles.mistakesBox}>
          {[0, 1, 2].map((i) => (
            <MaterialIcons
              key={i}
              name={i < mistakes ? 'close' : 'favorite'}
              size={18}
              color={i < mistakes ? '#FF4444' : '#FF6B81'}
            />
          ))}
        </View>
      </View>

      <View style={styles.timerBarContainer}>
        <View style={[styles.timerBarFill, { width: `${timerProgress * 100}%`, backgroundColor: timerColor }]} />
      </View>

      <View style={styles.instructionBar}>
        <Text style={styles.instructionText}>Tap the colour of the text, not the word!</Text>
      </View>

      <View style={styles.wordArea}>
        <Animated.Text
          style={[
            styles.stroopWord,
            {
              color: round.displayColor.hex,
              transform: [{ scale: wordScale }],
              opacity: wordOpacity,
            },
          ]}
        >
          {round.word}
        </Animated.Text>
      </View>

      <View style={styles.buttonsGrid}>
        {COLORS.map((color, index) => (
          <Animated.View
            key={color.name}
            style={[styles.colorButtonWrapper, { transform: [{ scale: buttonAnims[index] }] }]}
          >
            <TouchableOpacity
              onPress={() => handleColorPress(color.name, index)}
              activeOpacity={0.7}
              style={[styles.colorButton, { backgroundColor: color.hex }]}
            >
              <Text style={[
                styles.colorButtonText,
                color.name === 'YELLOW' && { color: '#1A1A1A' },
              ]}>
                {color.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        style={[styles.flashOverlay, { opacity: flashOpacity }]}
        pointerEvents="none"
      />
    </View>
  );
};

const BUTTON_GAP = 14;
const BUTTON_WIDTH = (width - 40 - BUTTON_GAP) / 2;

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
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A6A2A',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mistakesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  instructionBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  instructionText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },
  wordArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stroopWord: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  buttonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: BUTTON_GAP,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  colorButtonWrapper: {
    width: BUTTON_WIDTH,
  },
  colorButton: {
    width: '100%',
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  colorButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
  },
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 32,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  resultItem: {
    width: (width - 76) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    fontWeight: '500',
  },
  playAgainOuter: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  playAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
  },
  playAgainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exitButton: {
    paddingVertical: 14,
  },
  exitText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
});

export default StroopTestGame;
