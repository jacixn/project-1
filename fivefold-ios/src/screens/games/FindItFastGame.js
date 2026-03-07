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
const GRID_PADDING = 20;

const EMOJI_PAIRS = [
  ['🍎', '🍏'],
  ['🐶', '🐕'],
  ['👀', '👁️'],
  ['🌝', '🌚'],
  ['🔴', '🟠'],
  ['😀', '😃'],
  ['🐱', '🐈'],
  ['🍊', '🥭'],
  ['⭐', '🌟'],
  ['💜', '💙'],
  ['🟢', '🟩'],
  ['🔵', '🫐'],
  ['🐻', '🧸'],
  ['🥝', '🫒'],
  ['🍋', '🍌'],
];

const getGridSize = (level) => {
  if (level <= 3) return 3;
  if (level <= 6) return 4;
  if (level <= 9) return 5;
  return 6;
};

const getTimerDuration = (level) => {
  const reduction = Math.floor((level - 1) / 3) * 0.5;
  return Math.max(4, 10 - reduction);
};

const FindItFastGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing'); // 'playing' | 'gameover'
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState([]);
  const [oddIndex, setOddIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(10);
  const [flashColor, setFlashColor] = useState(null);

  const timerRef = useRef(null);
  const timeLeftRef = useRef(10);
  const roundStartRef = useRef(Date.now());
  const cellAnims = useRef([]);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const generateRound = useCallback((lvl) => {
    const gridSize = getGridSize(lvl);
    const totalCells = gridSize * gridSize;
    const pair = EMOJI_PAIRS[Math.floor(Math.random() * EMOJI_PAIRS.length)];
    const mainEmoji = pair[0];
    const oddEmoji = pair[1];
    const oddPosition = Math.floor(Math.random() * totalCells);

    const newGrid = Array.from({ length: totalCells }, (_, i) =>
      i === oddPosition ? oddEmoji : mainEmoji
    );

    const anims = Array.from({ length: totalCells }, () => new Animated.Value(0));
    cellAnims.current = anims;

    setGrid(newGrid);
    setOddIndex(oddPosition);

    const duration = getTimerDuration(lvl);
    timeLeftRef.current = duration;
    setTimeLeft(duration);
    roundStartRef.current = Date.now();

    Animated.stagger(
      30,
      anims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 0.1;
      const rounded = Math.round(timeLeftRef.current * 10) / 10;
      if (rounded <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimeLeft(0);
        setGameState('gameover');
        hapticFeedback.error();
      } else {
        setTimeLeft(rounded);
      }
    }, 100);
  }, []);

  useEffect(() => {
    generateRound(1);
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generateRound, startTimer]);

  const triggerFlash = useCallback((color) => {
    setFlashColor(color);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setFlashColor(null));
  }, [flashAnim]);

  const handleCellPress = useCallback((index) => {
    if (gameState !== 'playing') return;

    if (index === oddIndex) {
      hapticFeedback.success();
      triggerFlash('#00FF88');

      const elapsed = (Date.now() - roundStartRef.current) / 1000;
      const maxTime = getTimerDuration(level);
      const speedBonus = Math.max(0, Math.round((1 - elapsed / maxTime) * 200));
      const levelBonus = level * 50;
      const points = 100 + speedBonus + levelBonus;

      const nextLevel = level + 1;
      setScore((prev) => prev + points);
      setLevel(nextLevel);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;

      setTimeout(() => {
        generateRound(nextLevel);
        startTimer();
      }, 400);
    } else {
      hapticFeedback.error();
      triggerFlash('#FF3333');
      setScore((prev) => Math.max(0, prev - 100));
      timeLeftRef.current = Math.max(0, timeLeftRef.current - 2);
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimeLeft(0);
        setGameState('gameover');
      }
    }
  }, [gameState, oddIndex, level, generateRound, startTimer, triggerFlash]);

  const handlePlayAgain = useCallback(() => {
    hapticFeedback.medium();
    setGameState('playing');
    setLevel(1);
    setScore(0);
    generateRound(1);
    startTimer();
  }, [generateRound, startTimer]);

  const gridSize = getGridSize(level);
  const cellSize = (SCREEN_WIDTH - GRID_PADDING * 2 - (gridSize - 1) * 6) / gridSize;
  const emojiSize = cellSize * 0.55;
  const timerPercent = timeLeft / getTimerDuration(level);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {flashColor && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashOverlay,
            {
              backgroundColor: flashColor,
              opacity: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.25],
              }),
            },
          ]}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            if (timerRef.current) clearInterval(timerRef.current);
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find It Fast</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBadge}>
          <MaterialIcons name="emoji-events" size={16} color="#FFD700" />
          <Text style={styles.statValue}>{score.toLocaleString()}</Text>
        </View>
        <View style={styles.statBadge}>
          <MaterialIcons name="layers" size={16} color="#8B5CF6" />
          <Text style={styles.statValue}>Level {level}</Text>
        </View>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timerTrack}>
          <LinearGradient
            colors={
              timerPercent > 0.5
                ? ['#00C853', '#69F0AE']
                : timerPercent > 0.25
                ? ['#FF9800', '#FFB74D']
                : ['#FF1744', '#FF5252']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.timerFill, { width: `${Math.max(0, timerPercent * 100)}%` }]}
          />
        </View>
        <Text style={styles.timerText}>{timeLeft.toFixed(1)}s</Text>
      </View>

      {gameState === 'playing' ? (
        <View style={styles.gridContainer}>
          <View
            style={[
              styles.grid,
              {
                width: SCREEN_WIDTH - GRID_PADDING * 2,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6,
              },
            ]}
          >
            {grid.map((emoji, index) => {
              const anim = cellAnims.current[index];
              if (!anim) return null;
              return (
                <Animated.View
                  key={`${level}-${index}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    transform: [{ scale: anim }],
                    opacity: anim,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleCellPress(index)}
                    style={[styles.cell, { width: cellSize, height: cellSize, borderRadius: cellSize * 0.2 }]}
                  >
                    <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.gameOverContainer}>
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
            style={styles.gameOverCard}
          >
            <Text style={styles.gameOverEmoji}>⏱️</Text>
            <Text style={styles.gameOverTitle}>Time's Up!</Text>
            <Text style={styles.gameOverScore}>{score.toLocaleString()}</Text>
            <Text style={styles.gameOverScoreLabel}>Total Score</Text>
            <Text style={styles.gameOverLevel}>You reached Level {level}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePlayAgain}
              style={styles.playAgainButton}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playAgainGradient}
              >
                <MaterialIcons name="replay" size={22} color="#FFF" />
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
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
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  timerTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    width: 44,
    textAlign: 'right',
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  gameOverCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  gameOverEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  gameOverScore: {
    fontSize: 48,
    fontWeight: '800',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  gameOverScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 8,
  },
  gameOverLevel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
  },
  playAgainButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  playAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  playAgainText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default FindItFastGame;
