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

const LEVEL_CONFIGS = [
  { count: 9, cols: 3 },
  { count: 16, cols: 4 },
  { count: 25, cols: 5 },
  { count: 36, cols: 6 },
];

const getLevelConfig = (level) => {
  const idx = Math.min(level - 1, LEVEL_CONFIGS.length - 1);
  return LEVEL_CONFIGS[idx];
};

const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const NumberChainGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [nextNumber, setNextNumber] = useState(1);
  const [grid, setGrid] = useState([]);
  const [config, setConfig] = useState(LEVEL_CONFIGS[0]);
  const [timer, setTimer] = useState(0);
  const [tappedCells, setTappedCells] = useState(new Set());
  const [wrongCell, setWrongCell] = useState(null);
  const [levelTimes, setLevelTimes] = useState([]);

  const timerRef = useRef(null);
  const cellAnims = useRef([]);
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const wrongShake = useRef(new Animated.Value(0)).current;

  const setupLevel = useCallback((lvl) => {
    const cfg = getLevelConfig(lvl);
    setConfig(cfg);
    const numbers = Array.from({ length: cfg.count }, (_, i) => i + 1);
    const shuffled = shuffleArray(numbers);
    setGrid(shuffled);
    setNextNumber(1);
    setTappedCells(new Set());
    setWrongCell(null);
    setTimer(0);

    cellAnims.current = shuffled.map(() => new Animated.Value(0));
    setTimeout(() => {
      cellAnims.current.forEach((anim, i) => {
        Animated.spring(anim, {
          toValue: 1,
          delay: i * 25,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }).start();
      });
    }, 100);
  }, []);

  const startGame = useCallback(() => {
    hapticFeedback.medium();
    setScore(0);
    setLevel(1);
    setLevelTimes([]);
    setGameState('playing');
    setupLevel(1);
  }, [setupLevel]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimer((p) => p + 0.1);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [gameState, level]);

  const handleCellTap = (number, index) => {
    if (gameState !== 'playing') return;

    if (number === nextNumber) {
      hapticFeedback.light();
      const newTapped = new Set(tappedCells);
      newTapped.add(number);
      setTappedCells(newTapped);
      setWrongCell(null);

      Animated.sequence([
        Animated.timing(cellAnims.current[index], { toValue: 1.15, duration: 80, useNativeDriver: true }),
        Animated.spring(cellAnims.current[index], { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();

      if (number === config.count) {
        clearInterval(timerRef.current);
        hapticFeedback.success();
        const timeScore = Math.max(0, Math.round((config.count * 5 - timer) * 10));
        const levelBonus = level * 100;
        const roundScore = timeScore + levelBonus;
        setScore((s) => s + roundScore);
        setLevelTimes((t) => [...t, Math.round(timer * 10) / 10]);

        setTimeout(() => {
          const nextLevel = level + 1;
          setLevel(nextLevel);
          setupLevel(nextLevel);
        }, 800);
      } else {
        setNextNumber(number + 1);
      }
    } else {
      hapticFeedback.error();
      setWrongCell(index);
      Animated.sequence([
        Animated.timing(wrongShake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(wrongShake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      setTimer((t) => t + 2);

      setTimeout(() => setWrongCell(null), 500);
    }
  };

  const handleQuit = () => {
    clearInterval(timerRef.current);
    setGameState('over');
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const cellSize = Math.floor((width - 40 - (config.cols - 1) * 6) / config.cols);

  if (gameState === 'over') {
    const avgTime = levelTimes.length > 0
      ? Math.round((levelTimes.reduce((a, b) => a + b, 0) / levelTimes.length) * 10) / 10
      : 0;
    const bestTime = levelTimes.length > 0 ? Math.min(...levelTimes) : 0;

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
          <Text style={styles.headerTitle}>Number Chain</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[
          styles.gameOverContainer,
          { transform: [{ translateY: resultSlide }], opacity: resultOpacity },
        ]}>
          <MaterialIcons name="emoji-events" size={72} color="#AF52DE" />
          <Text style={styles.gameOverTitle}>Results</Text>

          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreLabel}>Total Score</Text>
            <Text style={styles.finalScoreValue}>{score.toLocaleString()}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{level - 1}</Text>
              <Text style={styles.statItemLabel}>Levels Done</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{avgTime}s</Text>
              <Text style={styles.statItemLabel}>Avg Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{bestTime}s</Text>
              <Text style={styles.statItemLabel}>Best Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{levelTimes.length}</Text>
              <Text style={styles.statItemLabel}>Completed</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={startGame}>
            <LinearGradient
              colors={['#AF52DE', '#8944AB']}
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            if (gameState === 'playing') {
              handleQuit();
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Number Chain</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      {gameState === 'playing' && (
        <>
          <View style={styles.playingStats}>
            <View style={styles.playingStatBox}>
              <Text style={styles.playingStatLabel}>Level</Text>
              <Text style={styles.playingStatValue}>{level}</Text>
            </View>
            <View style={styles.playingStatBox}>
              <Text style={styles.playingStatLabel}>Find</Text>
              <Text style={[styles.playingStatValue, { color: '#AF52DE' }]}>{nextNumber}</Text>
            </View>
            <View style={styles.playingStatBox}>
              <Text style={styles.playingStatLabel}>Time</Text>
              <Text style={styles.playingStatValue}>{(Math.round(timer * 10) / 10).toFixed(1)}s</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((nextNumber - 1) / config.count) * 100}%` },
              ]}
            />
          </View>

          <Animated.View
            style={[
              styles.gridContainer,
              { transform: [{ translateX: wrongShake }] },
            ]}
          >
            <View style={[styles.grid, { width: config.cols * (cellSize + 6) - 6 }]}>
              {grid.map((number, index) => {
                const isTapped = tappedCells.has(number);
                const isWrong = wrongCell === index;
                const isNext = number === nextNumber;
                const anim = cellAnims.current[index] || new Animated.Value(1);

                return (
                  <Animated.View
                    key={`${level}-${index}`}
                    style={{
                      transform: [{ scale: anim }],
                      opacity: anim,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleCellTap(number, index)}
                      disabled={isTapped}
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          borderRadius: Math.min(cellSize * 0.25, 16),
                        },
                        isTapped && styles.cellTapped,
                        isWrong && styles.cellWrong,
                        isNext && styles.cellNext,
                      ]}
                    >
                      {!isTapped && (
                        <Text
                          style={[
                            styles.cellText,
                            { fontSize: cellSize > 50 ? 22 : 16 },
                            isNext && styles.cellTextNext,
                          ]}
                        >
                          {number}
                        </Text>
                      )}
                      {isTapped && (
                        <MaterialIcons
                          name="check"
                          size={cellSize > 50 ? 22 : 16}
                          color="rgba(175,82,222,0.4)"
                        />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        </>
      )}

      {gameState === 'idle' && (
        <View style={styles.idleContainer}>
          <MaterialIcons name="grid-on" size={80} color="rgba(175,82,222,0.4)" />
          <Text style={styles.idleTitle}>Number Chain</Text>
          <Text style={styles.idleDesc}>
            Tap the numbers in ascending order as fast as you can. Grids get bigger each level!
          </Text>
          <TouchableOpacity activeOpacity={0.8} onPress={startGame}>
            <LinearGradient
              colors={['#AF52DE', '#8944AB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startBtn}
            >
              <MaterialIcons name="play-arrow" size={28} color="#FFF" />
              <Text style={styles.startText}>Start Game</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    color: '#AF52DE',
  },
  playingStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 14,
  },
  playingStatBox: {
    alignItems: 'center',
  },
  playingStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playingStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#AF52DE',
    borderRadius: 2,
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cellTapped: {
    backgroundColor: 'rgba(175,82,222,0.1)',
    borderColor: 'rgba(175,82,222,0.2)',
  },
  cellWrong: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderColor: '#EF4444',
  },
  cellNext: {
    borderColor: 'rgba(175,82,222,0.5)',
    backgroundColor: 'rgba(175,82,222,0.08)',
  },
  cellText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cellTextNext: {
    color: '#AF52DE',
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  idleTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
  },
  idleDesc: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginTop: 32,
    gap: 8,
  },
  startText: {
    fontSize: 18,
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
    color: '#AF52DE',
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

export default NumberChainGame;
