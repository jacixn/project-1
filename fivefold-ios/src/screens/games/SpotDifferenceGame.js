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

const EMOJI_POOL = [
  '🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🦄',
  '🐝', '🦋', '🐢', '🐙', '🦀', '🐬', '🦅', '🐧',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌸', '🌻', '🌙', '⭐', '🔥', '💎', '🎸', '🎯',
  '🚀', '🎲', '🧩', '🎭', '🏆', '⚡', '🌊', '🎪',
  '🐉', '🎵', '🔮', '🧲', '🎱', '🏀', '🎺', '🧸',
  '🦜', '🐺', '🦊', '🐳', '🦈', '🐊', '🦩', '🐞',
];

function getGridSizeForLevel(level) {
  if (level <= 3) return 3;
  if (level <= 7) return 4;
  if (level <= 12) return 5;
  return 6;
}

function generatePuzzle(gridSize) {
  const totalCells = gridSize * gridSize;
  const shuffled = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
  const emojis = shuffled.slice(0, totalCells);

  const diffIndex = Math.floor(Math.random() * totalCells);
  const originalEmoji = emojis[diffIndex];

  let replacement;
  do {
    replacement = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
  } while (replacement === originalEmoji);

  const grid1 = [...emojis];
  const grid2 = [...emojis];
  grid2[diffIndex] = replacement;

  return { grid1, grid2, diffIndex, gridSize };
}

const SpotDifferenceGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [puzzle, setPuzzle] = useState(() => generatePuzzle(3));
  const [found, setFound] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const timerRef = useRef(null);
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.5)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const wrongFlash = useRef(new Animated.Value(0)).current;
  const correctScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gameState === 'playing' && !found) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, found, level]);

  const handleCellTap = useCallback((gridNum, index) => {
    if (gameState !== 'playing' || found) return;

    if (index === puzzle.diffIndex && gridNum === 2) {
      if (timerRef.current) clearInterval(timerRef.current);
      setFound(true);
      hapticFeedback.success();
      setTotalFound(prev => prev + 1);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);

      const timeBonus = Math.max(0, Math.round(Math.max(0, 30 - timer) * 10));
      const levelBonus = puzzle.gridSize * puzzle.gridSize * 8;
      const streakBonus = Math.min(newStreak * 15, 150);
      const accuracyBonus = wrongTaps === 0 ? 100 : Math.max(0, 50 - wrongTaps * 10);
      const levelScore = timeBonus + levelBonus + streakBonus + accuracyBonus;

      setScore(prev => prev + levelScore);
      setTotalTime(prev => prev + timer);

      Animated.parallel([
        Animated.spring(correctScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
        Animated.spring(celebrateScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true, delay: 600 }),
        Animated.timing(celebrateOpacity, { toValue: 1, duration: 300, delay: 600, useNativeDriver: true }),
      ]).start();
    } else {
      setWrongTaps(prev => prev + 1);
      hapticFeedback.error();
      setStreak(0);

      Animated.sequence([
        Animated.timing(wrongFlash, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(wrongFlash, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [gameState, found, puzzle, timer, wrongTaps, streak, bestStreak, celebrateScale, celebrateOpacity, correctScale, wrongFlash]);

  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    const gridSize = getGridSizeForLevel(nextLevel);
    setLevel(nextLevel);
    setPuzzle(generatePuzzle(gridSize));
    setTimer(0);
    setFound(false);
    setWrongTaps(0);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    correctScale.setValue(0);
    hapticFeedback.medium();
  }, [level, celebrateOpacity, celebrateScale, correctScale]);

  const resetGame = useCallback(() => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setTimer(0);
    setPuzzle(generatePuzzle(3));
    setFound(false);
    setWrongTaps(0);
    setTotalFound(0);
    setTotalTime(0);
    setStreak(0);
    setBestStreak(0);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    correctScale.setValue(0);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    hapticFeedback.medium();
  }, [celebrateOpacity, celebrateScale, correctScale, resultSlide, resultOpacity]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const gridPadding = 12;
  const gridGap = 4;
  const gridWidth = (SCREEN_WIDTH - 48) / 2;
  const cellSize = Math.floor((gridWidth - gridPadding * 2 - (puzzle.gridSize - 1) * gridGap) / puzzle.gridSize);

  const renderGrid = (gridData, gridNum) => (
    <View style={styles.gridWrapper}>
      <Text style={styles.gridLabel}>{gridNum === 1 ? 'Original' : 'Changed'}</Text>
      <View style={[styles.grid, { padding: gridPadding }]}>
        <View style={[styles.gridInner, { width: cellSize * puzzle.gridSize + gridGap * (puzzle.gridSize - 1) }]}>
          {gridData.map((emoji, index) => {
            const isFoundCell = found && index === puzzle.diffIndex && gridNum === 2;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => handleCellTap(gridNum, index)}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                  },
                  isFoundCell && styles.foundCell,
                ]}
              >
                <Text style={[styles.cellEmoji, { fontSize: cellSize * 0.55 }]}>
                  {emoji}
                </Text>
                {isFoundCell && (
                  <Animated.View
                    style={[
                      styles.foundRing,
                      { transform: [{ scale: correctScale }] },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View
        style={[styles.damageFlash, { opacity: wrongFlash }]}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spot Difference</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>Lvl {level}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="grid-on" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.statLabel}>{puzzle.gridSize}x{puzzle.gridSize}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="timer" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.statLabel}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="whatshot" size={14} color="#FFB800" />
          <Text style={styles.statLabel}>{streak}x</Text>
        </View>
      </View>

      <View style={styles.instruction}>
        <Text style={styles.instructionText}>
          Find the one different emoji in the right grid
        </Text>
      </View>

      <View style={styles.gridsContainer}>
        {renderGrid(puzzle.grid1, 1)}
        {renderGrid(puzzle.grid2, 2)}
      </View>

      <View style={styles.bottomInfo}>
        {wrongTaps > 0 && (
          <Text style={styles.wrongText}>{wrongTaps} wrong tap{wrongTaps !== 1 ? 's' : ''}</Text>
        )}
      </View>

      {found && (
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
              <Text style={styles.resultEmoji}>🔍</Text>
              <Text style={styles.resultTitle}>Found It!</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Time</Text>
                  <Text style={styles.sValue}>{formatTime(timer)}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Wrong Taps</Text>
                  <Text style={styles.sValue}>{wrongTaps}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Streak</Text>
                  <Text style={styles.sValue}>{streak}x</Text>
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

export default SpotDifferenceGame;

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
    marginBottom: 8,
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
  instruction: {
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  gridsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridWrapper: {
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundCell: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  cellEmoji: {
    textAlign: 'center',
  },
  foundRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#4ADE80',
  },
  bottomInfo: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  wrongText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
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
