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
import { useTheme } from '../../contexts/ThemeContext';
import hapticFeedback from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_PAIRS = [
  { character: 'Moses', description: 'Parted the Red Sea' },
  { character: 'David', description: 'Defeated Goliath' },
  { character: 'Noah', description: 'Built the Ark' },
  { character: 'Jonah', description: 'Swallowed by a whale' },
  { character: 'Daniel', description: 'Survived the lion\'s den' },
  { character: 'Samson', description: 'Strongest man' },
  { character: 'Abraham', description: 'Father of nations' },
  { character: 'Esther', description: 'Saved her people' },
  { character: 'Solomon', description: 'Wisest king' },
  { character: 'Joseph', description: 'Coat of many colours' },
  { character: 'Ruth', description: 'Loyal daughter-in-law' },
  { character: 'Elijah', description: 'Taken up in a chariot of fire' },
  { character: 'Peter', description: 'Walked on water' },
  { character: 'Paul', description: 'Wrote most New Testament letters' },
  { character: 'Joshua', description: 'Walls of Jericho fell' },
  { character: 'Adam', description: 'First man created' },
  { character: 'Eve', description: 'First woman created' },
  { character: 'Cain', description: 'First murderer' },
  { character: 'Jacob', description: 'Wrestled with God' },
  { character: 'Rahab', description: 'Hid the spies in Jericho' },
  { character: 'Gideon', description: 'Defeated Midian with 300 men' },
  { character: 'Mary', description: 'Mother of Jesus' },
  { character: 'John the Baptist', description: 'Baptised Jesus' },
  { character: 'Lazarus', description: 'Raised from the dead' },
  { character: 'Martha', description: 'Served while Mary listened' },
  { character: 'Zacchaeus', description: 'Tax collector who climbed a tree' },
  { character: 'Nebuchadnezzar', description: 'Threw three men into a furnace' },
  { character: 'Goliath', description: 'Giant from Gath' },
  { character: 'Judas', description: 'Betrayed Jesus' },
  { character: 'Sarah', description: 'Had a child at age 90' },
  { character: 'Job', description: 'Tested by suffering' },
  { character: 'Nicodemus', description: 'Visited Jesus at night' },
  { character: 'Isaac', description: 'Nearly sacrificed by Abraham' },
  { character: 'Rebekah', description: 'Watered camels at the well' },
  { character: 'Leah', description: 'Jacob\'s first wife' },
  { character: 'Rachel', description: 'Jacob\'s beloved wife' },
  { character: 'Aaron', description: 'Moses\' brother, first high priest' },
  { character: 'Miriam', description: 'Sang after crossing the Red Sea' },
  { character: 'Caleb', description: 'Faithful spy of Canaan' },
  { character: 'Deborah', description: 'Judge and prophetess of Israel' },
  { character: 'Jael', description: 'Killed Sisera with a tent peg' },
  { character: 'Hannah', description: 'Prayed for a son, gave him to God' },
  { character: 'Samuel', description: 'Anointed Israel\'s first two kings' },
  { character: 'Saul', description: 'Israel\'s first king' },
  { character: 'Jonathan', description: 'David\'s closest friend' },
  { character: 'Abigail', description: 'Wise woman who married David' },
  { character: 'Bathsheba', description: 'Mother of King Solomon' },
  { character: 'Nathan', description: 'Prophet who confronted David' },
  { character: 'Absalom', description: 'David\'s rebellious son' },
  { character: 'Elisha', description: 'Received Elijah\'s double portion' },
  { character: 'Naaman', description: 'Syrian healed of leprosy' },
  { character: 'Hezekiah', description: 'King who had fifteen extra years' },
  { character: 'Josiah', description: 'Boy king who found the Law' },
  { character: 'Isaiah', description: 'Prophet of the Messiah\'s coming' },
  { character: 'Jeremiah', description: 'The weeping prophet' },
  { character: 'Ezekiel', description: 'Saw the valley of dry bones' },
  { character: 'Hosea', description: 'Married an unfaithful wife' },
  { character: 'Amos', description: 'Shepherd turned prophet' },
  { character: 'Nehemiah', description: 'Rebuilt Jerusalem\'s walls' },
  { character: 'Ezra', description: 'Priest who restored the Law' },
  { character: 'Boaz', description: 'Kinsman-redeemer who married Ruth' },
  { character: 'Naomi', description: 'Ruth\'s mother-in-law' },
  { character: 'Lot', description: 'Escaped destruction of Sodom' },
  { character: 'Pharaoh', description: 'Refused to free the Israelites' },
  { character: 'Balaam', description: 'His donkey spoke to him' },
  { character: 'Delilah', description: 'Cut Samson\'s hair' },
  { character: 'Eli', description: 'Priest who raised Samuel' },
  { character: 'Jezebel', description: 'Wicked queen of Israel' },
  { character: 'Ahab', description: 'King who stole Naboth\'s vineyard' },
  { character: 'Elkanah', description: 'Hannah\'s husband' },
  { character: 'Mordecai', description: 'Esther\'s cousin, saved the Jews' },
  { character: 'Haman', description: 'Plotted to destroy the Jews' },
  { character: 'Shadrach', description: 'Survived the fiery furnace' },
  { character: 'Timothy', description: 'Paul\'s young protege' },
  { character: 'Barnabas', description: 'Encouraging companion of Paul' },
  { character: 'Silas', description: 'Jailed with Paul, sang hymns' },
  { character: 'Luke', description: 'Physician who wrote a Gospel' },
  { character: 'Mark', description: 'Wrote the shortest Gospel' },
  { character: 'Matthew', description: 'Tax collector turned apostle' },
  { character: 'Thomas', description: 'Doubted the resurrection' },
  { character: 'Andrew', description: 'Peter\'s brother, first called' },
  { character: 'James', description: 'First apostle martyred' },
  { character: 'Philip', description: 'Baptised the Ethiopian eunuch' },
  { character: 'Stephen', description: 'First Christian martyr' },
  { character: 'Lydia', description: 'First European convert' },
  { character: 'Priscilla', description: 'Taught Apollos the way' },
  { character: 'Cornelius', description: 'First Gentile convert' },
  { character: 'Mary Magdalene', description: 'First to see the risen Jesus' },
  { character: 'Bartimaeus', description: 'Blind beggar healed by Jesus' },
  { character: 'Jairus', description: 'His daughter was raised to life' },
  { character: 'Joseph of Arimathea', description: 'Provided Jesus\' burial tomb' },
  { character: 'Simeon', description: 'Held baby Jesus in the temple' },
  { character: 'Anna', description: 'Prophetess who saw baby Jesus' },
  { character: 'Herod', description: 'Ordered the slaughter of infants' },
  { character: 'Pontius Pilate', description: 'Sentenced Jesus to death' },
  { character: 'Barabbas', description: 'Criminal released instead of Jesus' },
  { character: 'Simon of Cyrene', description: 'Carried Jesus\' cross' },
  { character: 'Dorcas', description: 'Raised to life by Peter' },
  { character: 'Ananias', description: 'Restored Paul\'s sight' },
  { character: 'Onesimus', description: 'Runaway slave returned to Philemon' },
  { character: 'Titus', description: 'Paul\'s helper in Crete' },
  { character: 'John', description: 'Wrote the book of Revelation' },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getPairsForLevel(level, usedPairIndices = new Set()) {
  const pairCount = Math.min(4 + Math.floor((level - 1) / 2), 6);
  const available = ALL_PAIRS.map((p, i) => ({ ...p, idx: i })).filter(p => !usedPairIndices.has(p.idx));
  if (available.length < pairCount) {
    const shuffled = shuffleArray(ALL_PAIRS.map((p, i) => ({ ...p, idx: i })));
    return { pairs: shuffled.slice(0, pairCount), reset: true };
  }
  const shuffled = shuffleArray(available);
  return { pairs: shuffled.slice(0, pairCount), reset: false };
}

function generateBoard(level, usedPairIndices = new Set()) {
  const { pairs, reset } = getPairsForLevel(level, usedPairIndices);
  const usedIndices = pairs.map(p => p.idx);
  const cards = [];

  pairs.forEach((pair, i) => {
    cards.push({
      id: `char-${i}`,
      pairId: i,
      text: pair.character,
      type: 'character',
      flipAnim: new Animated.Value(0),
    });
    cards.push({
      id: `desc-${i}`,
      pairId: i,
      text: pair.description,
      type: 'description',
      flipAnim: new Animated.Value(0),
    });
  });

  return {
    cards: shuffleArray(cards),
    pairCount: pairs.length,
    usedIndices,
    reset,
  };
}

const FlipCard = React.memo(({ card, size, isFlipped, isMatched, onPress, disabled, isDark, theme }) => {
  const frontOpacity = card.flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });
  const backOpacity = card.flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const rotateY = card.flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const cardBg = isMatched
    ? (theme.success || '#66BB6A') + '20'
    : card.type === 'character'
      ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')
      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)');

  const borderCol = isMatched
    ? (theme.success || '#66BB6A') + '50'
    : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(card)}
      disabled={disabled || isFlipped || isMatched}
      style={[styles.cardOuter, { width: size, height: size }]}
    >
      <Animated.View
        style={[
          styles.cardFace,
          {
            width: size,
            height: size,
            backgroundColor: isDark ? theme.primary + '15' : theme.primary + '10',
            borderColor: theme.primary + '30',
            opacity: backOpacity,
            transform: [{ rotateY }],
          },
        ]}
      >
        <MaterialIcons name="help-outline" size={size * 0.3} color={theme.primary + '50'} />
      </Animated.View>

      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFront,
          {
            width: size,
            height: size,
            backgroundColor: cardBg,
            borderColor: borderCol,
            opacity: frontOpacity,
            transform: [{ rotateY: card.flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }],
          },
        ]}
      >
        {isMatched && (
          <MaterialIcons
            name="check-circle"
            size={14}
            color={theme.success || '#66BB6A'}
            style={{ position: 'absolute', top: 6, right: 6 }}
          />
        )}
        <Text
          style={[
            styles.cardText,
            {
              color: isMatched ? (theme.success || '#66BB6A') : theme.text,
              fontSize: card.text.length > 20 ? 10 : card.text.length > 12 ? 11 : 12,
            },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit
        >
          {card.text}
        </Text>
        {card.type === 'character' && (
          <View style={[styles.typeBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: theme.primary }]}>Person</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

export default function BiblePairsGame() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [level, setLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [usedPairIndices, setUsedPairIndices] = useState(new Set());
  const [board, setBoard] = useState(() => generateBoard(1));
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedPairIds, setMatchedPairIds] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [levelComplete, setLevelComplete] = useState(false);
  const [levelScore, setLevelScore] = useState(0);
  const [lockBoard, setLockBoard] = useState(false);
  const [gameState, setGameState] = useState('playing');

  const timerRef = useRef(null);
  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const movesRef = useRef(moves);
  const timerValRef = useRef(timer);
  useEffect(() => { movesRef.current = moves; }, [moves]);
  useEffect(() => { timerValRef.current = timer; }, [timer]);

  useEffect(() => {
    if (isRunning && gameState === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, gameState]);

  useEffect(() => {
    if (matchedPairIds.size === board.pairCount && board.pairCount > 0) {
      setIsRunning(false);
      const score = calculateScore(movesRef.current, timerValRef.current, board.pairCount);
      setLevelScore(score);
      setTotalScore(prev => prev + score);
      setLevelComplete(true);
      hapticFeedback.levelUp();

      Animated.timing(celebrateAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [matchedPairIds, board.pairCount]);

  const calculateScore = (m, s, pairs) => {
    const perfectMoves = pairs;
    const moveBonus = Math.max(0, Math.round((perfectMoves / Math.max(m, 1)) * 400));
    const timeBonus = Math.max(0, Math.round(Math.max(0, 90 - s) * 4));
    return moveBonus + timeBonus + pairs * 50;
  };

  const flipCard = (card) => {
    Animated.timing(card.flipAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  const unflipCard = (card) => {
    Animated.timing(card.flipAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };

  const flippedCardsRef = useRef(flippedCards);
  useEffect(() => { flippedCardsRef.current = flippedCards; }, [flippedCards]);

  const handleCardPress = useCallback((card) => {
    if (lockBoard) return;
    const currentFlipped = flippedCardsRef.current;
    if (currentFlipped.find(c => c.id === card.id)) return;
    if (matchedPairIds.has(card.pairId)) return;

    hapticFeedback.light();
    flipCard(card);

    const newFlipped = [...currentFlipped, card];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLockBoard(true);

      const [first, second] = newFlipped;

      if (first.pairId === second.pairId && first.id !== second.id) {
        hapticFeedback.success();
        setMatchedPairIds(prev => new Set([...prev, first.pairId]));
        setFlippedCards([]);
        setLockBoard(false);
      } else {
        hapticFeedback.error();
        setTimeout(() => {
          unflipCard(first);
          unflipCard(second);
          setFlippedCards([]);
          setLockBoard(false);
        }, 800);
      }
    }
  }, [lockBoard, matchedPairIds]);

  const nextLevel = useCallback(() => {
    hapticFeedback.medium();
    const next = level + 1;
    setLevel(next);
    const currentUsed = new Set(usedPairIndices);
    (board.usedIndices || []).forEach(i => currentUsed.add(i));
    const newBoard = generateBoard(next, currentUsed);
    setBoard(newBoard);
    if (newBoard.reset) {
      setUsedPairIndices(new Set(newBoard.usedIndices));
    } else {
      (newBoard.usedIndices || []).forEach(i => currentUsed.add(i));
      setUsedPairIndices(currentUsed);
    }
    setFlippedCards([]);
    setMatchedPairIds(new Set());
    setMoves(0);
    setTimer(0);
    setIsRunning(true);
    setLevelComplete(false);
    setLevelScore(0);
    celebrateAnim.setValue(0);
  }, [level, board, usedPairIndices]);

  const resetGame = useCallback(() => {
    hapticFeedback.medium();
    setLevel(1);
    setTotalScore(0);
    setGameState('playing');
    setUsedPairIndices(new Set());
    const newBoard = generateBoard(1);
    setBoard(newBoard);
    setUsedPairIndices(new Set(newBoard.usedIndices));
    setFlippedCards([]);
    setMatchedPairIds(new Set());
    setMoves(0);
    setTimer(0);
    setIsRunning(true);
    setLevelComplete(false);
    setLevelScore(0);
    celebrateAnim.setValue(0);
  }, []);

  const cardCount = board.cards.length;
  const cols = cardCount <= 8 ? 4 : cardCount <= 10 ? 4 : 4;
  const gridPadding = 16;
  const cardGap = 8;
  const availableWidth = SCREEN_WIDTH - gridPadding * 2;
  const cardSize = Math.floor((availableWidth - cardGap * (cols - 1)) / cols);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const celebrateScale = celebrateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.06, 1],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialIcons name="chevron-left" size={30} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Pairs</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.statsBar}>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="star" size={16} color={theme.primary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>Lvl {level}</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="score" size={16} color={theme.primary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>{totalScore}</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="touch-app" size={16} color={theme.textSecondary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>{moves}</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="timer" size={16} color={theme.textSecondary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>{formatTime(timer)}</Text>
        </View>
      </View>

      <ScrollView style={styles.gameArea} contentContainerStyle={styles.gameContent} showsVerticalScrollIndicator={false}>
        {!levelComplete ? (
          <>
            <Text style={[styles.instruction, { color: theme.textSecondary }]}>
              Match each Bible character with what they're known for
            </Text>

            <View style={[styles.grid, { paddingHorizontal: gridPadding }]}>
              {board.cards.map((card) => (
                <FlipCard
                  key={card.id}
                  card={card}
                  size={cardSize}
                  isFlipped={!!flippedCards.find(c => c.id === card.id)}
                  isMatched={matchedPairIds.has(card.pairId)}
                  onPress={handleCardPress}
                  disabled={lockBoard}
                  isDark={isDark}
                  theme={theme}
                />
              ))}
            </View>
          </>
        ) : (
          <Animated.View style={[styles.levelCompleteContainer, { transform: [{ scale: celebrateScale }] }]}>
            <MaterialIcons name="celebration" size={64} color={theme.primary} />
            <Text style={[styles.levelCompleteTitle, { color: theme.text }]}>Level Complete!</Text>

            <View style={[styles.finalScoreBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <Text style={[styles.finalScoreLabel, { color: theme.textSecondary }]}>Level Score</Text>
              <Text style={[styles.finalScoreValue, { color: theme.primary }]}>{levelScore.toLocaleString()}</Text>
            </View>

            <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.text }]}>{moves}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Moves</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.text }]}>{formatTime(timer)}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Time</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.text }]}>{totalScore}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.playAgainButton, { backgroundColor: theme.primary }]} onPress={nextLevel} activeOpacity={0.8}>
              <MaterialIcons name="arrow-forward" size={22} color="#FFFFFF" />
              <Text style={styles.playAgainText}>Next Level</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.secondaryButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} onPress={resetGame} activeOpacity={0.7}>
              <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>Start Over</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.exitButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={[styles.exitButtonText, { color: theme.textSecondary }]}>Exit Game</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gameArea: {
    flex: 1,
  },
  gameContent: {
    paddingTop: 4,
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '500',
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cardOuter: {
    perspective: 1000,
  },
  cardFace: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    padding: 6,
  },
  cardFront: {
    position: 'absolute',
  },
  cardText: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  levelCompleteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  levelCompleteTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 24,
  },
  finalScoreBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
  finalScoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  finalScoreValue: {
    fontSize: 42,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 28,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 8,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    marginBottom: 12,
  },
  playAgainText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exitButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
