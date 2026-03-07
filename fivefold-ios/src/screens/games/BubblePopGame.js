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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 56;
const PLAY_AREA_PADDING = 16;

const COLORS = [
  ['#FF3B80', '#FF6B6B'],
  ['#4A3AFF', '#6B5AFF'],
  ['#00C9A7', '#00FFD1'],
  ['#FFB800', '#FFD60A'],
  ['#FF6B35', '#FF8C5A'],
  ['#A855F7', '#C084FC'],
  ['#06B6D4', '#22D3EE'],
];

let bubbleIdCounter = 0;

function createBubble(level, mode, nextValue, playAreaWidth) {
  const speed = Math.max(3000, 8000 - level * 400);
  const minX = PLAY_AREA_PADDING;
  const maxX = playAreaWidth - BUBBLE_SIZE - PLAY_AREA_PADDING;
  const x = minX + Math.random() * (maxX - minX);
  const colorPair = COLORS[Math.floor(Math.random() * COLORS.length)];

  let label;
  if (mode === 'numbers') {
    label = String(nextValue);
  } else {
    label = String.fromCharCode(64 + nextValue);
  }

  return {
    id: ++bubbleIdCounter,
    value: nextValue,
    label,
    x,
    colors: colorPair,
    floatAnim: new Animated.Value(0),
    scaleAnim: new Animated.Value(0),
    speed,
    popped: false,
  };
}

const BubbleBall = React.memo(({ bubble, playAreaHeight, onPop, disabled }) => {
  const translateY = bubble.floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [playAreaHeight, -BUBBLE_SIZE - 20],
  });

  return (
    <Animated.View
      style={[
        styles.bubbleWrapper,
        {
          left: bubble.x,
          transform: [
            { translateY },
            { scale: bubble.scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => !disabled && onPop(bubble)}
        style={styles.bubbleTouch}
      >
        <LinearGradient
          colors={bubble.colors}
          style={styles.bubbleGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.bubbleShine} />
          <Text style={styles.bubbleLabel}>{bubble.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

const BubblePopGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [nextExpected, setNextExpected] = useState(1);
  const [bubbles, setBubbles] = useState([]);
  const [totalPopped, setTotalPopped] = useState(0);
  const [mode, setMode] = useState('numbers');

  const bubblesRef = useRef([]);
  const nextExpectedRef = useRef(1);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const gameStateRef = useRef('playing');
  const spawnTimerRef = useRef(null);
  const nextValueToSpawnRef = useRef(1);
  const maxValueOnScreenRef = useRef(0);
  const playAreaHeight = SCREEN_HEIGHT - 200;

  const flashAnim = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    nextExpectedRef.current = nextExpected;
  }, [nextExpected]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const endGame = useCallback(() => {
    setGameState('gameover');
    gameStateRef.current = 'gameover';
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    hapticFeedback.error();
    Animated.parallel([
      Animated.spring(resultSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [resultSlide, resultOpacity]);

  const handleBubbleReachedTop = useCallback((bubbleId) => {
    if (gameStateRef.current !== 'playing') return;

    setBubbles(prev => {
      const bubble = prev.find(b => b.id === bubbleId);
      if (!bubble || bubble.popped) return prev;

      const newLives = livesRef.current - 1;
      setLives(newLives);
      setCombo(0);
      hapticFeedback.warning();

      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();

      if (newLives <= 0) {
        endGame();
      }

      return prev.filter(b => b.id !== bubbleId);
    });
  }, [endGame, flashAnim]);

  const spawnBubble = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    const currentLevel = levelRef.current;
    const val = nextValueToSpawnRef.current;

    if (val > maxValueOnScreenRef.current) {
      maxValueOnScreenRef.current = val;
    }

    const modeType = val > 26 ? 'numbers' : (currentLevel % 3 === 0 ? 'letters' : 'numbers');
    const displayVal = modeType === 'letters' ? ((val - 1) % 26) + 1 : val;

    const bubble = createBubble(currentLevel, modeType, val, SCREEN_WIDTH);
    bubble.label = modeType === 'letters' ? String.fromCharCode(64 + displayVal) : String(val);

    Animated.spring(bubble.scaleAnim, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    const floatAnimation = Animated.timing(bubble.floatAnim, {
      toValue: 1,
      duration: bubble.speed,
      useNativeDriver: true,
    });

    floatAnimation.start(({ finished }) => {
      if (finished && !bubble.popped) {
        handleBubbleReachedTop(bubble.id);
      }
    });

    nextValueToSpawnRef.current = val + 1;

    setBubbles(prev => [...prev, bubble]);
  }, [handleBubbleReachedTop]);

  const startSpawning = useCallback(() => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    const interval = Math.max(600, 2000 - levelRef.current * 120);
    spawnTimerRef.current = setInterval(() => {
      if (gameStateRef.current === 'playing') {
        spawnBubble();
      }
    }, interval);
    spawnBubble();
  }, [spawnBubble]);

  useEffect(() => {
    startSpawning();
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [level]);

  const handlePop = useCallback((bubble) => {
    if (gameStateRef.current !== 'playing' || bubble.popped) return;

    if (bubble.value === nextExpectedRef.current) {
      bubble.popped = true;
      hapticFeedback.light();

      Animated.timing(bubble.scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();

      const newExpected = nextExpectedRef.current + 1;
      setNextExpected(newExpected);

      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > bestCombo) setBestCombo(newCombo);
        return newCombo;
      });

      const comboMultiplier = Math.min(5, 1 + Math.floor(combo / 5) * 0.5);
      const points = Math.round((10 + levelRef.current * 5) * comboMultiplier);
      setScore(prev => prev + points);
      setTotalPopped(prev => prev + 1);

      setBubbles(prev => prev.filter(b => b.id !== bubble.id));

      if (totalPopped > 0 && (totalPopped + 1) % (8 + levelRef.current * 2) === 0) {
        setLevel(prev => prev + 1);
        hapticFeedback.success();
      }
    } else {
      hapticFeedback.error();
      setCombo(0);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.5, duration: 80, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [combo, bestCombo, totalPopped, flashAnim]);

  const resetGame = useCallback(() => {
    bubbleIdCounter = 0;
    nextValueToSpawnRef.current = 1;
    maxValueOnScreenRef.current = 0;
    setGameState('playing');
    setScore(0);
    setLevel(1);
    setLives(3);
    setCombo(0);
    setBestCombo(0);
    setNextExpected(1);
    setBubbles([]);
    setTotalPopped(0);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    hapticFeedback.medium();
  }, [resultSlide, resultOpacity]);

  const livesDisplay = Array.from({ length: 3 }, (_, i) => (
    <MaterialIcons
      key={i}
      name="favorite"
      size={18}
      color={i < lives ? '#FF3B80' : 'rgba(255,255,255,0.15)'}
    />
  ));

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
        <Text style={styles.headerTitle}>Bubble Pop</Text>
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
          <Text style={styles.statLabel}>{combo}x</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.nextLabel}>Next: {nextExpected}</Text>
        </View>
      </View>

      <View style={styles.playArea}>
        {bubbles.map(bubble => (
          <BubbleBall
            key={bubble.id}
            bubble={bubble}
            playAreaHeight={playAreaHeight}
            onPop={handlePop}
            disabled={gameState !== 'playing'}
          />
        ))}
      </View>

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
              <Text style={styles.resultEmoji}>💥</Text>
              <Text style={styles.resultTitle}>Game Over</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Bubbles Popped</Text>
                  <Text style={styles.scoreValue}>{totalPopped}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Best Combo</Text>
                  <Text style={styles.scoreValue}>{bestCombo}x</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Level Reached</Text>
                  <Text style={styles.scoreValue}>{level}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabelBig}>Final Score</Text>
                  <Text style={[styles.scoreValueBig, { color: '#FFD700' }]}>
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

export default BubblePopGame;

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
  nextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  playArea: {
    flex: 1,
    overflow: 'hidden',
  },
  bubbleWrapper: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  },
  bubbleTouch: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
  },
  bubbleGradient: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubbleShine: {
    position: 'absolute',
    top: 6,
    left: 10,
    width: 16,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  bubbleLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
  scoreLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  scoreDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  scoreLabelBig: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scoreValueBig: {
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
