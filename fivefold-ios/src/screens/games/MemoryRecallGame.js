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
const GRID_PADDING = 16;
const CARD_GAP = 8;

const EMOJI_POOL = [
  '🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🦄',
  '🐝', '🦋', '🐢', '🐙', '🦀', '🐬', '🦅', '🐧',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌸', '🌻', '🌙', '⭐', '🔥', '💎', '🎸', '🎯',
  '🚀', '🎲', '🧩', '🎭', '🏆', '⚡', '🌊', '🎪',
];

const LEVEL_CONFIG = {
  1: { cols: 4, rows: 3, pairs: 6 },
  2: { cols: 4, rows: 4, pairs: 8 },
  3: { cols: 5, rows: 4, pairs: 10 },
  4: { cols: 6, rows: 4, pairs: 12 },
};
const MAX_DEFINED_LEVEL = 4;
const ENDLESS_CONFIG = { cols: 6, rows: 5, pairs: 15 };

function getConfigForLevel(level) {
  return level <= MAX_DEFINED_LEVEL ? LEVEL_CONFIG[level] : ENDLESS_CONFIG;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoard(level) {
  const config = getConfigForLevel(level);
  const shuffledPool = shuffleArray(EMOJI_POOL);
  const selected = shuffledPool.slice(0, config.pairs);
  const cards = shuffleArray([...selected, ...selected]).map((emoji, i) => ({
    id: i,
    emoji,
    flipAnim: new Animated.Value(0),
  }));
  return { cards, ...config };
}

function calculateScore(moves, seconds, pairs) {
  const perfectMoves = pairs;
  const moveBonus = Math.max(0, Math.round((perfectMoves / Math.max(moves, 1)) * 500));
  const timeBonus = Math.max(0, Math.round(Math.max(0, 120 - seconds) * 5));
  const pairBonus = pairs * 50;
  return moveBonus + timeBonus + pairBonus;
}

const MemoryCard = React.memo(({ card, size, isFlipped, isMatched, onPress, disabled }) => {
  const frontInterpolate = card.flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const backInterpolate = card.flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || isFlipped || isMatched}
      style={[styles.cardOuter, { width: size, height: size }]}
    >
      {/* Back of card (visible when not flipped) */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardBack,
          { width: size, height: size, transform: [{ scaleX: backInterpolate }] },
        ]}
      >
        <LinearGradient
          colors={['#2A2A5E', '#1A1A3E', '#2A2A5E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <MaterialIcons name="help-outline" size={size * 0.35} color="rgba(255,255,255,0.2)" />
        </LinearGradient>
      </Animated.View>

      {/* Front of card (visible when flipped) */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFront,
          isMatched && styles.cardMatched,
          { width: size, height: size, transform: [{ scaleX: frontInterpolate }] },
        ]}
      >
        <Text style={[styles.cardEmoji, { fontSize: size * 0.4 }]}>{card.emoji}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

export default function MemoryRecallGame() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [level, setLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [board, setBoard] = useState(() => generateBoard(1));
  const [boardKey, setBoardKey] = useState(0);
  const [flippedIds, setFlippedIds] = useState([]);
  const [matchedEmojis, setMatchedEmojis] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [levelComplete, setLevelComplete] = useState(false);
  const [levelScore, setLevelScore] = useState(0);
  const [lockBoard, setLockBoard] = useState(false);

  const timerRef = useRef(null);
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  useEffect(() => {
    if (matchedEmojis.size === board.pairs) {
      setIsRunning(false);
      const score = calculateScore(moves, timer, board.pairs);
      setLevelScore(score);
      setTotalScore(prev => prev + score);
      setLevelComplete(true);
      hapticFeedback.levelUp();

      Animated.sequence([
        Animated.timing(celebrateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(headerGlow, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [matchedEmojis]);

  const handleCardPress = useCallback((card) => {
    if (lockBoard) return;
    if (flippedIds.includes(card.id)) return;
    if (matchedEmojis.has(card.emoji)) return;

    hapticFeedback.light();

    Animated.timing(card.flipAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const newFlipped = [...flippedIds, card.id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLockBoard(true);

      const [firstId, secondId] = newFlipped;
      const first = board.cards.find(c => c.id === firstId);
      const second = board.cards.find(c => c.id === secondId);

      if (first.emoji === second.emoji) {
        hapticFeedback.success();
        setMatchedEmojis(prev => new Set([...prev, first.emoji]));
        setFlippedIds([]);
        setLockBoard(false);
      } else {
        hapticFeedback.warning();
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(first.flipAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(second.flipAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setFlippedIds([]);
            setLockBoard(false);
          });
        }, 800);
      }
    }
  }, [flippedIds, matchedEmojis, lockBoard, board.cards]);

  const handleNextLevel = useCallback(() => {
    hapticFeedback.medium();
    const nextLevel = level + 1;
    const newBoard = generateBoard(nextLevel);
    setLevel(nextLevel);
    setBoard(newBoard);
    setBoardKey(k => k + 1);
    setFlippedIds([]);
    setMatchedEmojis(new Set());
    setMoves(0);
    setTimer(0);
    setLevelComplete(false);
    setLevelScore(0);
    setLockBoard(false);
    setIsRunning(true);
    celebrateAnim.setValue(0);
    headerGlow.setValue(0);
  }, [level]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cardSize = Math.floor(
    (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * (board.cols - 1)) / board.cols
  );

  const celebrateScale = celebrateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.15, 1],
  });

  const celebrateOpacity = celebrateAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
        <Text style={styles.headerTitle}>Memory Recall</Text>
        <View style={styles.backButton} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <MaterialIcons name="layers" size={14} color="#8B8BFF" />
          <Text style={styles.statLabel}>Lvl {level}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="timer" size={14} color="#FFB86B" />
          <Text style={styles.statLabel}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="touch-app" size={14} color="#FF6B8A" />
          <Text style={styles.statLabel}>{moves}</Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="star" size={14} color="#FFD700" />
          <Text style={styles.statLabel}>{totalScore.toLocaleString()}</Text>
        </View>
      </View>

      {/* Pairs Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: board.pairs > 0
                  ? `${(matchedEmojis.size / board.pairs) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {matchedEmojis.size}/{board.pairs} pairs
        </Text>
      </View>

      {/* Game Grid */}
      <View style={styles.gridContainer}>
        <View style={[styles.grid, { width: cardSize * board.cols + CARD_GAP * (board.cols - 1) }]}>
          {board.cards.map((card) => (
            <MemoryCard
              key={`${boardKey}-${card.id}`}
              card={card}
              size={cardSize}
              isFlipped={flippedIds.includes(card.id)}
              isMatched={matchedEmojis.has(card.emoji)}
              onPress={() => handleCardPress(card)}
              disabled={lockBoard}
            />
          ))}
        </View>
      </View>

      {/* Level Complete Overlay */}
      {levelComplete && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.celebrateCard,
              { opacity: celebrateOpacity, transform: [{ scale: celebrateScale }] },
            ]}
          >
            <LinearGradient
              colors={['#1E1E4A', '#2A2A5E', '#1E1E4A']}
              style={styles.celebrateGradient}
            >
              <Text style={styles.celebrateEmoji}>🎉</Text>
              <Text style={styles.celebrateTitle}>Level {level} Complete!</Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Moves</Text>
                  <Text style={styles.scoreValue}>{moves}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Time</Text>
                  <Text style={styles.scoreValue}>{formatTime(timer)}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabelBig}>Level Score</Text>
                  <Text style={styles.scoreValueBig}>+{levelScore.toLocaleString()}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabelBig}>Total</Text>
                  <Text style={[styles.scoreValueBig, { color: '#FFD700' }]}>
                    {totalScore.toLocaleString()}
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
}

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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    minWidth: 60,
    textAlign: 'right',
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GRID_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  cardOuter: {
    perspective: 1000,
  },
  cardFace: {
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBack: {
    zIndex: 2,
  },
  cardGradient: {
    flex: 1,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,100,200,0.25)',
  },
  cardFront: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 1,
  },
  cardMatched: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.35)',
  },
  cardEmoji: {
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  celebrateCard: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  celebrateGradient: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,100,200,0.2)',
    borderRadius: 24,
  },
  celebrateEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  celebrateTitle: {
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
