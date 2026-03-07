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

const LARGE_NUMBERS = [25, 50, 75, 100];
const SMALL_NUMBERS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
const OPERATORS = ['+', '-', '×', '÷'];

function pickNumbers(level) {
  const count = 6;
  const largeCount = Math.min(level <= 3 ? 1 : level <= 6 ? 2 : 3, 4);
  const shuffledLarge = [...LARGE_NUMBERS].sort(() => Math.random() - 0.5);
  const shuffledSmall = [...SMALL_NUMBERS].sort(() => Math.random() - 0.5);
  const picked = [
    ...shuffledLarge.slice(0, largeCount),
    ...shuffledSmall.slice(0, count - largeCount),
  ];
  return picked.sort(() => Math.random() - 0.5);
}

function generateTarget(level) {
  if (level <= 3) return Math.floor(Math.random() * 100) + 100;
  if (level <= 6) return Math.floor(Math.random() * 300) + 200;
  if (level <= 10) return Math.floor(Math.random() * 500) + 300;
  return Math.floor(Math.random() * 800) + 200;
}

function getTimeForLevel(level) {
  if (level <= 3) return 60;
  if (level <= 6) return 50;
  if (level <= 10) return 45;
  return 40;
}

function evaluate(expression) {
  try {
    const tokens = expression.match(/(\d+|[+\-×÷])/g);
    if (!tokens) return null;

    const nums = [];
    const ops = [];

    const precedence = (op) => (op === '×' || op === '÷') ? 2 : 1;

    const applyOp = () => {
      const b = nums.pop();
      const a = nums.pop();
      const op = ops.pop();
      if (a === undefined || b === undefined) return false;
      switch (op) {
        case '+': nums.push(a + b); break;
        case '-': nums.push(a - b); break;
        case '×': nums.push(a * b); break;
        case '÷':
          if (b === 0) return false;
          if (a % b !== 0) return false;
          nums.push(a / b);
          break;
        default: return false;
      }
      return true;
    };

    for (const token of tokens) {
      if (/^\d+$/.test(token)) {
        nums.push(parseInt(token, 10));
      } else {
        while (ops.length > 0 && precedence(ops[ops.length - 1]) >= precedence(token)) {
          if (!applyOp()) return null;
        }
        ops.push(token);
      }
    }

    while (ops.length > 0) {
      if (!applyOp()) return null;
    }

    return nums.length === 1 ? nums[0] : null;
  } catch {
    return null;
  }
}

const CountdownGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [gameState, setGameState] = useState('playing');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [numbers, setNumbers] = useState(() => pickNumbers(1));
  const [target, setTarget] = useState(() => generateTarget(1));
  const [expression, setExpression] = useState([]);
  const [usedIndices, setUsedIndices] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(60);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [roundsWon, setRoundsWon] = useState(0);
  const [bestDiff, setBestDiff] = useState(null);
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundResult, setRoundResult] = useState(null);

  const timerRef = useRef(null);
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.5)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gameState !== 'playing' || roundComplete) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, roundComplete, level]);

  const handleTimeUp = useCallback(() => {
    const currentVal = evaluate(expression.map(e => e.label).join(''));
    const diff = currentVal !== null ? Math.abs(currentVal - target) : Infinity;
    finishRound(diff, currentVal);
  }, [expression, target]);

  const finishRound = useCallback((diff, result) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRoundComplete(true);
    setRoundsPlayed(prev => prev + 1);

    let points = 0;
    if (diff === 0) {
      points = 100 + level * 20 + timeLeft * 3 - hintsUsed * 15;
      setRoundsWon(prev => prev + 1);
      hapticFeedback.success();
    } else if (diff <= 5) {
      points = 50 + level * 10 + timeLeft;
      hapticFeedback.medium();
    } else if (diff <= 10) {
      points = 20 + level * 5;
      hapticFeedback.light();
    }

    points = Math.max(0, points);
    setScore(prev => prev + points);
    setRoundResult({ diff, result, points });

    if (bestDiff === null || diff < bestDiff) setBestDiff(diff);

    Animated.parallel([
      Animated.spring(celebrateScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.timing(celebrateOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [level, timeLeft, hintsUsed, bestDiff, celebrateScale, celebrateOpacity, target]);

  const addToExpression = useCallback((item, index) => {
    if (roundComplete) return;

    if (item.type === 'number') {
      if (usedIndices.has(index)) return;
      if (expression.length > 0 && expression[expression.length - 1].type === 'number') return;
      setExpression(prev => [...prev, { type: 'number', label: String(item.value), index }]);
      setUsedIndices(prev => new Set([...prev, index]));
      hapticFeedback.light();
    } else if (item.type === 'operator') {
      if (expression.length === 0) return;
      if (expression[expression.length - 1].type === 'operator') return;
      setExpression(prev => [...prev, { type: 'operator', label: item.value }]);
      hapticFeedback.light();
    }
  }, [roundComplete, expression, usedIndices]);

  const removeLastFromExpression = useCallback(() => {
    if (roundComplete || expression.length === 0) return;
    const last = expression[expression.length - 1];
    if (last.type === 'number') {
      setUsedIndices(prev => {
        const next = new Set(prev);
        next.delete(last.index);
        return next;
      });
    }
    setExpression(prev => prev.slice(0, -1));
    hapticFeedback.light();
  }, [roundComplete, expression]);

  const clearExpression = useCallback(() => {
    if (roundComplete) return;
    setExpression([]);
    setUsedIndices(new Set());
    hapticFeedback.light();
  }, [roundComplete]);

  const submitExpression = useCallback(() => {
    if (roundComplete || expression.length === 0) return;
    const exprStr = expression.map(e => e.label).join('');
    const result = evaluate(exprStr);
    if (result === null) {
      hapticFeedback.error();
      return;
    }
    const diff = Math.abs(result - target);
    finishRound(diff, result);
  }, [roundComplete, expression, target, finishRound]);

  const handleNextRound = useCallback(() => {
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setNumbers(pickNumbers(nextLevel));
    setTarget(generateTarget(nextLevel));
    setExpression([]);
    setUsedIndices(new Set());
    setTimeLeft(getTimeForLevel(nextLevel));
    setHintsUsed(0);
    setRoundComplete(false);
    setRoundResult(null);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    hapticFeedback.medium();
  }, [level, celebrateOpacity, celebrateScale]);

  const resetGame = useCallback(() => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setNumbers(pickNumbers(1));
    setTarget(generateTarget(1));
    setExpression([]);
    setUsedIndices(new Set());
    setTimeLeft(60);
    setHintsUsed(0);
    setRoundsPlayed(0);
    setRoundsWon(0);
    setBestDiff(null);
    setRoundComplete(false);
    setRoundResult(null);
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.5);
    resultSlide.setValue(50);
    resultOpacity.setValue(0);
    hapticFeedback.medium();
  }, [celebrateOpacity, celebrateScale, resultSlide, resultOpacity]);

  const currentValue = expression.length > 0 ? evaluate(expression.map(e => e.label).join('')) : null;
  const exprString = expression.map(e => e.label).join(' ');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Countdown</Text>
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
          <Text style={styles.statLabel}>{timeLeft}s</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statLabel}>{roundsWon}/{roundsPlayed} won</Text>
        </View>
      </View>

      <View style={styles.targetContainer}>
        <Text style={styles.targetLabel}>TARGET</Text>
        <Text style={styles.targetNumber}>{target}</Text>
      </View>

      <View style={styles.expressionContainer}>
        <View style={styles.expressionBox}>
          <Text style={styles.expressionText}>{exprString || 'Build your expression...'}</Text>
        </View>
        {currentValue !== null && (
          <Text style={[
            styles.currentValue,
            currentValue === target && styles.currentValueCorrect,
          ]}>
            = {currentValue}
          </Text>
        )}
      </View>

      <View style={styles.numbersRow}>
        {numbers.map((num, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            onPress={() => addToExpression({ type: 'number', value: num }, i)}
            disabled={usedIndices.has(i) || roundComplete}
            style={[styles.numberBtn, usedIndices.has(i) && styles.numberBtnUsed]}
          >
            <LinearGradient
              colors={usedIndices.has(i) ? ['#1A1A1A', '#111'] : ['#1A1A2E', '#2A2A4E']}
              style={styles.numberBtnGradient}
            >
              <Text style={[styles.numberBtnText, usedIndices.has(i) && styles.numberBtnTextUsed]}>
                {num}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.operatorsRow}>
        {OPERATORS.map((op) => (
          <TouchableOpacity
            key={op}
            activeOpacity={0.7}
            onPress={() => addToExpression({ type: 'operator', value: op })}
            disabled={roundComplete}
            style={styles.opBtn}
          >
            <LinearGradient
              colors={['#2A2A4E', '#3A3A5E']}
              style={styles.opBtnGradient}
            >
              <Text style={styles.opBtnText}>{op}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={removeLastFromExpression}
          style={styles.actionBtn}
          disabled={roundComplete}
        >
          <MaterialIcons name="backspace" size={22} color="#FF6B6B" />
          <Text style={styles.actionText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={clearExpression}
          style={styles.actionBtn}
          disabled={roundComplete}
        >
          <MaterialIcons name="refresh" size={22} color="#FFB800" />
          <Text style={styles.actionText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={submitExpression}
          style={styles.submitBtn}
          disabled={roundComplete || expression.length === 0}
        >
          <LinearGradient
            colors={['#4A3AFF', '#6B5AFF']}
            style={styles.submitGradient}
          >
            <MaterialIcons name="check" size={22} color="#FFF" />
            <Text style={styles.submitText}>Submit</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {roundComplete && (
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
              <Text style={styles.resultEmoji}>
                {roundResult?.diff === 0 ? '🎯' : roundResult?.diff <= 5 ? '🔥' : '💪'}
              </Text>
              <Text style={styles.resultTitle}>
                {roundResult?.diff === 0 ? 'Perfect!' : roundResult?.diff <= 5 ? 'So Close!' : 'Nice Try'}
              </Text>

              <View style={styles.scoreBreakdown}>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Your Answer</Text>
                  <Text style={styles.sValue}>{roundResult?.result ?? 'N/A'}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Target</Text>
                  <Text style={styles.sValue}>{target}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Difference</Text>
                  <Text style={styles.sValue}>{roundResult?.diff ?? '—'}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabel}>Points Earned</Text>
                  <Text style={styles.sValue}>+{roundResult?.points ?? 0}</Text>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.sLabelBig}>Total Score</Text>
                  <Text style={[styles.sValueBig, { color: '#FFD700' }]}>
                    {score.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNextRound}
                style={styles.nextButton}
              >
                <LinearGradient
                  colors={['#4A3AFF', '#6B5AFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Next Round</Text>
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

export default CountdownGame;

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
  targetContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  targetNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(74,58,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  expressionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  expressionBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  expressionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  currentValueCorrect: {
    color: '#4ADE80',
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  numberBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  numberBtnUsed: {
    opacity: 0.3,
  },
  numberBtnGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  numberBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  numberBtnTextUsed: {
    color: 'rgba(255,255,255,0.2)',
  },
  operatorsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  opBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  opBtnGradient: {
    width: 56,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  opBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#A78BFA',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  submitBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  submitText: {
    fontSize: 16,
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
