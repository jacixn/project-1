import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import hapticFeedback from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateNumbers(count, level) {
  const maxRange = 10 + level * 5;
  const set = new Set();
  while (set.size < count) {
    set.add(Math.floor(Math.random() * maxRange) + 1);
  }
  return shuffleArray([...set]);
}

function isSorted(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < arr[i - 1]) return false;
  }
  return true;
}

const NumberTile = React.memo(({ num, index, isSelected, isCorrectPos, onPress, tileWidth }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
    ]).start();
    onPress(index);
  };

  const bgColors = isSelected
    ? ['#4A3AFF', '#6B5AFF']
    : isCorrectPos
    ? ['#1A3A2A', '#1E4A3E']
    : ['#1A1A2E', '#1E1E3A'];

  const borderColor = isSelected
    ? 'rgba(74,58,255,0.6)'
    : isCorrectPos
    ? 'rgba(74,222,128,0.3)'
    : 'rgba(255,255,255,0.08)';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
        <LinearGradient
          colors={bgColors}
          style={[styles.tile, { width: tileWidth, borderColor }]}
        >
          <Text style={[styles.tileText, isSelected && styles.tileTextSelected]}>
            {num}
          </Text>
          {isCorrectPos && !isSelected && (
            <MaterialIcons
              name="check-circle"
              size={12}
              color="#4ADE80"
              style={styles.checkIcon}
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

const QuickSortGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [numbers, setNumbers] = useState(() => generateNumbers(3, 1));
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [swaps, setSwaps] = useState(0);
  const [totalSwaps, setTotalSwaps] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);
  const [perfectLevels, setPerfectLevels] = useState(0);

  const timerRef = useRef(null);
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.5)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const numCount = Math.min(2 + level, 12);

  useEffect(() => {
    if (gameState === 'playing' && !levelComplete) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, levelComplete, level]);

  const handleTilePress = useCallback((index) => {
    if (gameState !== 'playing' || levelComplete) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
      hapticFeedback.light();
    } else if (selectedIndex === index) {
      setSelectedIndex(null);
      hapticFeedback.light();
    } else {
      setNumbers(prev => {
        const newArr = [...prev];
        [newArr[selectedIndex], newArr[index]] = [newArr[index], newArr[selectedIndex]];

        setSwaps(s => s + 1);
        setSelectedIndex(null);
        hapticFeedback.medium();

        if (isSorted(newArr)) {
          if (timerRef.current) clearInterval(timerRef.current);
          setLevelComplete(true);
          hapticFeedback.success();

          const optimalSwaps = numCount - 1;
          const swapBonus = Math.max(0, Math.round((optimalSwaps / Math.max(swaps + 1, 1)) * 200));
          const timeBonus = Math.max(0, Math.round(Math.max(0, 60 - timer) * 4));
          const levelBonus = numCount * 30;
          const perfBonus = (swaps + 1 <= optimalSwaps) ? 100 : 0;
          const levelScore = swapBonus + timeBonus + levelBonus + perfBonus;

          if (swaps + 1 <= optimalSwaps) setPerfectLevels(p => p + 1);
          setScore(prev => prev + levelScore);
          setTotalSwaps(prev => prev + swaps + 1);
          setTotalTime(prev => prev + timer);

          Animated.parallel([
            Animated.spring(celebrateScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
            Animated.timing(celebrateOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]).start();
        }

        return newArr;
      });
    }
  }, [gameState, levelComplete, selectedIndex, swaps, timer, numCount, celebrateScale, celebrateOpacity]);

  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    const nextCount = Math.min(2 + nextLevel, 12);
    setLevel(nextLevel);
    setNumbers(generateNumbers(nextCount, nextLevel));
    setTimer(0);
    setSwaps(0);
    setSelectedIndex(null);
    setLevelComplete(false);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    hapticFeedback.medium();
  }, [level, celebrateOpacity, celebrateScale]);

  const resetGame = useCallback(() => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setTimer(0);
    setNumbers(generateNumbers(3, 1));
    setSelectedIndex(null);
    setSwaps(0);
    setTotalSwaps(0);
    setTotalTime(0);
    setLevelComplete(false);
    setPerfectLevels(0);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    hapticFeedback.medium();
  }, [celebrateOpacity, celebrateScale, resultSlide, resultOpacity]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const sorted = [...numbers].sort((a, b) => a - b);
  const tileWidth = Math.min(70, (SCREEN_WIDTH - 48 - (numbers.length - 1) * 8) / numbers.length);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Sort</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Lvl {level}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="timer" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.statLabel}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="swap-horiz" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.statLabel}>{swaps} swaps</Text>
        </View>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Tap two numbers to swap them. Sort in ascending order.
        </Text>
        <View style={styles.targetRow}>
          <Text style={styles.targetLabel}>Target:</Text>
          {sorted.map((n, i) => (
            <Text key={i} style={styles.targetNum}>{n}</Text>
          ))}
        </View>
      </View>

      <View style={styles.tilesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tilesScroll}
        >
          {numbers.map((num, index) => (
            <NumberTile
              key={`${level}-${index}`}
              num={num}
              index={index}
              isSelected={selectedIndex === index}
              isCorrectPos={num === sorted[index]}
              onPress={handleTilePress}
              tileWidth={tileWidth}
            />
          ))}
        </ScrollView>

        <View style={styles.indexRow}>
          {numbers.map((_, i) => (
            <View key={i} style={[styles.indexMarker, { width: tileWidth }]}>
              <Text style={styles.indexText}>{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          {selectedIndex !== null
            ? `Selected: ${numbers[selectedIndex]}. Tap another to swap.`
            : 'Tap a number to select it.'}
        </Text>
      </View>

      {levelComplete && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: celebrateOpacity, transform: [{ scale: celebrateScale }] },
            ]}
          >
            <LinearGradient
              colors={['#1E1E4A', '#2A2A5E', '#1E1E4A']}
              style={styles.resultGradient}
            >
              <Text style={styles.resultEmoji}>✅</Text>
              <Text style={styles.resultTitle}>Sorted!</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Time</Text>
                  <Text style={styles.sValue}>{formatTime(timer)}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Swaps Used</Text>
                  <Text style={styles.sValue}>{swaps}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Numbers</Text>
                  <Text style={styles.sValue}>{numbers.length}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabelBig}>Total Score</Text>
                  <Text style={[styles.sValueBig, { color: '#FFD700' }]}>
                    {score.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNextLevel}
                style={styles.nextButton}
              >
                <LinearGradient
                  colors={['#4A3AFF', '#6B5AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Next Level</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

export default QuickSortGame;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
  instructionContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  targetNum: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4ADE80',
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tilesContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tilesScroll: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 1,
    alignItems: 'center',
  },
  tile: {
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tileText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tileTextSelected: {
    color: '#FFD700',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  indexRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  indexMarker: {
    alignItems: 'center',
  },
  indexText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '600',
  },
  hintContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
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
  nextButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
