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

const WALL_TOP = 1;
const WALL_RIGHT = 2;
const WALL_BOTTOM = 4;
const WALL_LEFT = 8;

function generateMaze(rows, cols) {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      walls: WALL_TOP | WALL_RIGHT | WALL_BOTTOM | WALL_LEFT,
      visited: false,
    }))
  );

  const stack = [];
  const start = { r: 0, c: 0 };
  grid[start.r][start.c].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    const dirs = [
      { dr: -1, dc: 0, wall: WALL_TOP, opposite: WALL_BOTTOM },
      { dr: 0, dc: 1, wall: WALL_RIGHT, opposite: WALL_LEFT },
      { dr: 1, dc: 0, wall: WALL_BOTTOM, opposite: WALL_TOP },
      { dr: 0, dc: -1, wall: WALL_LEFT, opposite: WALL_RIGHT },
    ];

    for (const d of dirs) {
      const nr = current.r + d.dr;
      const nc = current.c + d.dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        neighbors.push({ r: nr, c: nc, ...d });
      }
    }

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[current.r][current.c].walls &= ~next.wall;
      grid[next.r][next.c].walls &= ~next.opposite;
      grid[next.r][next.c].visited = true;
      stack.push({ r: next.r, c: next.c });
    } else {
      stack.pop();
    }
  }

  return grid;
}

const LEVEL_SIZES = [5, 7, 9, 11, 13, 15];

function getSizeForLevel(level) {
  const idx = Math.min(level - 1, LEVEL_SIZES.length - 1);
  return LEVEL_SIZES[idx];
}

const MazeRunnerGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [mazeSize, setMazeSize] = useState(5);
  const [maze, setMaze] = useState(() => generateMaze(5, 5));
  const [playerPos, setPlayerPos] = useState({ r: 0, c: 0 });
  const [endPos] = useState({ r: 4, c: 4 });
  const [moves, setMoves] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);

  const timerRef = useRef(null);
  const playerScale = useRef(new Animated.Value(1)).current;
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.5)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const currentEndPos = { r: mazeSize - 1, c: mazeSize - 1 };

  useEffect(() => {
    if (gameState === 'playing' && !levelComplete) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, levelComplete, level]);

  const calculateLevelScore = useCallback((time, moveCount, size) => {
    const optimalMoves = size * 2;
    const moveBonus = Math.max(0, Math.round((optimalMoves / Math.max(moveCount, 1)) * 300));
    const timeBonus = Math.max(0, Math.round(Math.max(0, 120 - time) * 3));
    const sizeBonus = size * size * 5;
    return moveBonus + timeBonus + sizeBonus;
  }, []);

  const movePlayer = useCallback((dr, dc) => {
    if (gameState !== 'playing' || levelComplete) return;

    setPlayerPos(prev => {
      const cell = maze[prev.r][prev.c];
      let blocked = false;

      if (dr === -1 && (cell.walls & WALL_TOP)) blocked = true;
      if (dr === 1 && (cell.walls & WALL_BOTTOM)) blocked = true;
      if (dc === -1 && (cell.walls & WALL_LEFT)) blocked = true;
      if (dc === 1 && (cell.walls & WALL_RIGHT)) blocked = true;

      if (blocked) {
        hapticFeedback.warning();
        Animated.sequence([
          Animated.timing(playerScale, { toValue: 0.8, duration: 50, useNativeDriver: true }),
          Animated.spring(playerScale, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
        ]).start();
        return prev;
      }

      const newR = prev.r + dr;
      const newC = prev.c + dc;

      if (newR < 0 || newR >= mazeSize || newC < 0 || newC >= mazeSize) {
        hapticFeedback.warning();
        return prev;
      }

      hapticFeedback.light();
      setMoves(m => m + 1);

      Animated.sequence([
        Animated.timing(playerScale, { toValue: 1.2, duration: 60, useNativeDriver: true }),
        Animated.spring(playerScale, { toValue: 1, tension: 150, friction: 6, useNativeDriver: true }),
      ]).start();

      if (newR === currentEndPos.r && newC === currentEndPos.c) {
        if (timerRef.current) clearInterval(timerRef.current);
        setLevelComplete(true);
        hapticFeedback.success();

        const levelScore = calculateLevelScore(timer, moves + 1, mazeSize);
        setScore(prev => prev + levelScore);
        setTotalTime(prev => prev + timer);

        Animated.parallel([
          Animated.spring(celebrateScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
          Animated.timing(celebrateOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
      }

      return { r: newR, c: newC };
    });
  }, [gameState, levelComplete, maze, mazeSize, currentEndPos, timer, moves, playerScale, celebrateScale, celebrateOpacity, calculateLevelScore]);

  const handleNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    const nextSize = getSizeForLevel(nextLevel);
    setLevel(nextLevel);
    setMazeSize(nextSize);
    setMaze(generateMaze(nextSize, nextSize));
    setPlayerPos({ r: 0, c: 0 });
    setTimer(0);
    setMoves(0);
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
    setTotalTime(0);
    setMazeSize(5);
    setMaze(generateMaze(5, 5));
    setPlayerPos({ r: 0, c: 0 });
    setMoves(0);
    setLevelComplete(false);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    hapticFeedback.medium();
  }, [celebrateOpacity, celebrateScale, resultSlide, resultOpacity]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maxMazeWidth = SCREEN_WIDTH - 32;
  const cellSize = Math.floor(maxMazeWidth / mazeSize);
  const mazeWidth = cellSize * mazeSize;
  const wallThickness = Math.max(1, Math.floor(cellSize * 0.08));

  const renderMaze = () => {
    const cells = [];
    for (let r = 0; r < mazeSize; r++) {
      for (let c = 0; c < mazeSize; c++) {
        const cell = maze[r][c];
        const isPlayer = playerPos.r === r && playerPos.c === c;
        const isEnd = r === currentEndPos.r && c === currentEndPos.c;

        cells.push(
          <View
            key={`${r}-${c}`}
            style={[
              styles.cell,
              {
                width: cellSize,
                height: cellSize,
                left: c * cellSize,
                top: r * cellSize,
                borderTopWidth: (cell.walls & WALL_TOP) ? wallThickness : 0,
                borderRightWidth: (cell.walls & WALL_RIGHT) ? wallThickness : 0,
                borderBottomWidth: (cell.walls & WALL_BOTTOM) ? wallThickness : 0,
                borderLeftWidth: (cell.walls & WALL_LEFT) ? wallThickness : 0,
              },
              isEnd && styles.endCell,
            ]}
          >
            {isPlayer && (
              <Animated.View
                style={[
                  styles.player,
                  {
                    width: cellSize * 0.55,
                    height: cellSize * 0.55,
                    borderRadius: cellSize * 0.275,
                    transform: [{ scale: playerScale }],
                  },
                ]}
              />
            )}
            {isEnd && !isPlayer && (
              <View style={[styles.endMarker, {
                width: cellSize * 0.4,
                height: cellSize * 0.4,
                borderRadius: cellSize * 0.05,
              }]} />
            )}
          </View>
        );
      }
    }
    return cells;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maze Runner</Text>
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
          <Text style={styles.statLabel}>{mazeSize}x{mazeSize}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="timer" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.statLabel}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>{moves} moves</Text>
        </View>
      </View>

      <View style={styles.mazeContainer}>
        <View style={[styles.mazeGrid, { width: mazeWidth, height: mazeWidth }]}>
          {renderMaze()}
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            onPress={() => movePlayer(-1, 0)}
            style={styles.dpadButton}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#2A2A4E', '#1E1E3A']} style={styles.dpadGradient}>
              <MaterialIcons name="keyboard-arrow-up" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <TouchableOpacity
            onPress={() => movePlayer(0, -1)}
            style={styles.dpadButton}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#2A2A4E', '#1E1E3A']} style={styles.dpadGradient}>
              <MaterialIcons name="keyboard-arrow-left" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.dpadCenter}>
            <MaterialIcons name="radio-button-unchecked" size={20} color="rgba(255,255,255,0.15)" />
          </View>
          <TouchableOpacity
            onPress={() => movePlayer(0, 1)}
            style={styles.dpadButton}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#2A2A4E', '#1E1E3A']} style={styles.dpadGradient}>
              <MaterialIcons name="keyboard-arrow-right" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <TouchableOpacity
            onPress={() => movePlayer(1, 0)}
            style={styles.dpadButton}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#2A2A4E', '#1E1E3A']} style={styles.dpadGradient}>
              <MaterialIcons name="keyboard-arrow-down" size={32} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.dpadSpacer} />
        </View>
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
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>Level {level} Complete!</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Time</Text>
                  <Text style={styles.sValue}>{formatTime(timer)}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Moves</Text>
                  <Text style={styles.sValue}>{moves}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Maze Size</Text>
                  <Text style={styles.sValue}>{mazeSize}x{mazeSize}</Text>
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

export default MazeRunnerGame;

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
  mazeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mazeGrid: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(74,58,255,0.4)',
  },
  cell: {
    position: 'absolute',
    borderColor: 'rgba(74,58,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCell: {
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  player: {
    backgroundColor: '#4A3AFF',
    shadowColor: '#4A3AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },
  endMarker: {
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  controlsContainer: {
    paddingBottom: 30,
    paddingTop: 16,
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dpadButton: {
    width: 64,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dpadGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dpadCenter: {
    width: 64,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadSpacer: {
    width: 64,
    height: 56,
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
