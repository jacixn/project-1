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
const PAD_SIZE = (width - 80) / 2;

const PAD_COLORS = [
  { idle: '#1A3A2A', active: '#34C759', name: 'green' },
  { idle: '#3A1A1A', active: '#FF3B30', name: 'red' },
  { idle: '#1A2A3A', active: '#007AFF', name: 'blue' },
  { idle: '#3A3A1A', active: '#FFD60A', name: 'yellow' },
];

const PatternRepeatGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('idle');
  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [showingSequence, setShowingSequence] = useState(false);

  const padAnims = useRef(PAD_COLORS.map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef(PAD_COLORS.map(() => new Animated.Value(1))).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const flashPad = useCallback((index, duration = 400) => {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(padAnims[index], { toValue: 1, duration: duration * 0.4, useNativeDriver: false }),
          Animated.timing(padAnims[index], { toValue: 0, duration: duration * 0.6, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnims[index], { toValue: 1.08, duration: duration * 0.3, useNativeDriver: true }),
          Animated.spring(scaleAnims[index], { toValue: 1, friction: 6, useNativeDriver: true }),
        ]),
      ]).start(() => resolve());
    });
  }, [padAnims, scaleAnims]);

  const playSequence = useCallback(async (seq) => {
    setShowingSequence(true);
    await new Promise((r) => setTimeout(r, 600));
    const speed = Math.max(250, 500 - (seq.length - 3) * 20);
    for (let i = 0; i < seq.length; i++) {
      await flashPad(seq[i], speed);
      await new Promise((r) => setTimeout(r, Math.max(100, 200 - (seq.length - 3) * 10)));
    }
    setShowingSequence(false);
    setGameState('input');
    setPlayerIndex(0);
  }, [flashPad]);

  const startNewGame = useCallback(() => {
    hapticFeedback.medium();
    const initial = [];
    for (let i = 0; i < 3; i++) {
      initial.push(Math.floor(Math.random() * 4));
    }
    setSequence(initial);
    setLevel(1);
    setScore(0);
    setPlayerIndex(0);
    setGameState('showing');
    playSequence(initial);
  }, [playSequence]);

  const advanceLevel = useCallback(() => {
    const next = Math.floor(Math.random() * 4);
    const newSeq = [...sequence, next];
    const newLevel = level + 1;
    setSequence(newSeq);
    setLevel(newLevel);
    if (newLevel > bestLevel) setBestLevel(newLevel);
    setGameState('showing');
    playSequence(newSeq);
  }, [sequence, level, bestLevel, playSequence]);

  const handlePadPress = (index) => {
    if (gameState !== 'input' || showingSequence) return;

    hapticFeedback.light();
    flashPad(index, 200);

    if (sequence[playerIndex] === index) {
      const newPlayerIndex = playerIndex + 1;
      const roundPoints = 50 + level * 10;

      if (newPlayerIndex === sequence.length) {
        hapticFeedback.success();
        setScore((s) => s + roundPoints + level * 25);
        setPlayerIndex(0);
        setGameState('levelComplete');
        setTimeout(() => advanceLevel(), 1000);
      } else {
        setScore((s) => s + roundPoints);
        setPlayerIndex(newPlayerIndex);
      }
    } else {
      hapticFeedback.error();
      setGameState('over');
      resultSlide.setValue(50);
      resultOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  useEffect(() => {
    titleAnim.setValue(0);
    Animated.spring(titleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  }, []);

  const getStatusText = () => {
    if (gameState === 'idle') return 'Tap Start to Begin';
    if (gameState === 'showing' || showingSequence) return 'Watch carefully...';
    if (gameState === 'input') return `Your turn! (${playerIndex + 1}/${sequence.length})`;
    if (gameState === 'levelComplete') return 'Nice! Next level...';
    return '';
  };

  if (gameState === 'over') {
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
          <Text style={styles.headerTitle}>Pattern Repeat</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[
          styles.gameOverContainer,
          { transform: [{ translateY: resultSlide }], opacity: resultOpacity },
        ]}>
          <MaterialIcons name="emoji-events" size={72} color="#FFD60A" />
          <Text style={styles.gameOverTitle}>Game Over</Text>

          <View style={styles.finalScoreBox}>
            <Text style={styles.finalScoreLabel}>Final Score</Text>
            <Text style={styles.finalScoreValue}>{score.toLocaleString()}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{level}</Text>
              <Text style={styles.statItemLabel}>Level Reached</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{sequence.length}</Text>
              <Text style={styles.statItemLabel}>Sequence Length</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{bestLevel}</Text>
              <Text style={styles.statItemLabel}>Best Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{playerIndex}</Text>
              <Text style={styles.statItemLabel}>Correct Taps</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={startNewGame}>
            <LinearGradient
              colors={['#007AFF', '#0055CC']}
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
          onPress={() => { hapticFeedback.light(); navigation.goBack(); }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pattern Repeat</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.levelText}>Level {level}</Text>
        <View style={styles.seqBadge}>
          <MaterialIcons name="queue-music" size={14} color="#007AFF" />
          <Text style={styles.seqText}>{sequence.length} steps</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {gameState === 'input' && (
          <View style={styles.progressRow}>
            {sequence.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < playerIndex && styles.progressDotFilled,
                  i === playerIndex && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.padsContainer}>
        <View style={styles.padsGrid}>
          {PAD_COLORS.map((pad, index) => (
            <Animated.View
              key={pad.name}
              style={[
                styles.padWrapper,
                { transform: [{ scale: scaleAnims[index] }] },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handlePadPress(index)}
                disabled={gameState !== 'input'}
              >
                <Animated.View
                  style={[
                    styles.pad,
                    {
                      backgroundColor: padAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [pad.idle, pad.active],
                      }),
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.padGlow,
                      {
                        opacity: padAnims[index],
                        backgroundColor: pad.active,
                      },
                    ]}
                  />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {gameState === 'idle' && (
        <View style={styles.startContainer}>
          <TouchableOpacity activeOpacity={0.8} onPress={startNewGame}>
            <LinearGradient
              colors={['#007AFF', '#0055CC']}
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
    color: '#007AFF',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  seqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  seqText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  statusRow: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressDotFilled: {
    backgroundColor: '#007AFF',
  },
  progressDotCurrent: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  padsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: PAD_SIZE * 2 + 16,
  },
  padWrapper: {
    width: PAD_SIZE,
    height: PAD_SIZE,
  },
  pad: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    opacity: 0,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  startContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
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
    color: '#007AFF',
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

export default PatternRepeatGame;
