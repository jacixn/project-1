import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import hapticFeedback from '../../utils/haptics';

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getBooksForLevel(level) {
  const count = Math.min(3 + Math.floor((level - 1) / 2), 10);
  const maxStart = BIBLE_BOOKS.length - count;
  const startIndex = Math.floor(Math.random() * (maxStart + 1));
  return {
    books: BIBLE_BOOKS.slice(startIndex, startIndex + count),
    startIndex,
    count,
  };
}

const ShakeableBook = ({ book, onPress, disabled, isDark, theme, index }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      delay: index * 60,
      tension: 80,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress(book, triggerShake);
  };

  return (
    <Animated.View
      style={{
        transform: [
          { translateX: shakeAnim },
          { scale: scaleAnim },
          { scale: enterAnim },
        ],
        opacity: enterAnim,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.bookChip,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
          },
        ]}
      >
        <Text
          style={[
            styles.bookChipText,
            { color: theme.text },
          ]}
        >
          {book}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SortedBook = ({ book, bookIndex, theme }) => {
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.sortedChip,
        {
          backgroundColor: theme.success + '25',
          borderColor: theme.success + '60',
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <MaterialIcons name="check-circle" size={18} color={theme.success} style={{ marginRight: 6 }} />
      <Text style={[styles.sortedText, { color: theme.success }]}>{book}</Text>
      <Text style={[styles.bookNumber, { color: theme.success + 'AA' }]}>
        Book {bookIndex + 1} of 66
      </Text>
    </Animated.View>
  );
};

export default function BookOrderGame() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState('playing');

  const [levelData, setLevelData] = useState(() => getBooksForLevel(1));
  const [shuffledBooks, setShuffledBooks] = useState([]);
  const [sortedBooks, setSortedBooks] = useState([]);
  const [nextExpectedIndex, setNextExpectedIndex] = useState(0);

  const celebrateAnim = useRef(new Animated.Value(0)).current;
  const livesShakeAnim = useRef(new Animated.Value(0)).current;

  const levelDataRef = useRef(levelData);
  const nextExpectedIndexRef = useRef(nextExpectedIndex);
  const sortedBooksRef = useRef(sortedBooks);
  const levelRef = useRef(level);
  const livesRef = useRef(lives);

  useEffect(() => { levelDataRef.current = levelData; }, [levelData]);
  useEffect(() => { nextExpectedIndexRef.current = nextExpectedIndex; }, [nextExpectedIndex]);
  useEffect(() => { sortedBooksRef.current = sortedBooks; }, [sortedBooks]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  useEffect(() => {
    startLevel(1);
  }, []);

  const startLevel = useCallback((lvl) => {
    const data = getBooksForLevel(lvl);
    setLevelData(data);
    setShuffledBooks(shuffleArray(data.books));
    setSortedBooks([]);
    setNextExpectedIndex(0);
  }, []);

  const handleBookPress = useCallback((book, triggerShake) => {
    const ld = levelDataRef.current;
    const expectedIdx = nextExpectedIndexRef.current;
    const sorted = sortedBooksRef.current;
    const lvl = levelRef.current;
    const curLives = livesRef.current;
    const expectedBook = ld.books[expectedIdx];

    if (book === expectedBook) {
      hapticFeedback.success();
      const newSorted = [...sorted, book];
      setSortedBooks(newSorted);
      setShuffledBooks(prev => prev.filter(b => b !== book));
      setNextExpectedIndex(expectedIdx + 1);

      const pointsPerBook = 10 + lvl * 5;
      setScore(prev => prev + pointsPerBook);

      if (newSorted.length === ld.books.length) {
        const bonus = lvl * 25;
        setScore(prev => prev + bonus);
        hapticFeedback.levelUp();

        Animated.sequence([
          Animated.timing(celebrateAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(celebrateAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          const nextLevel = lvl + 1;
          setLevel(nextLevel);
          startLevel(nextLevel);
        });
      }
    } else {
      hapticFeedback.error();
      triggerShake();

      Animated.sequence([
        Animated.timing(livesShakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(livesShakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(livesShakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(livesShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();

      const newLives = curLives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setTimeout(() => setGameState('over'), 400);
      }
    }
  }, [startLevel, celebrateAnim, livesShakeAnim]);

  const resetGame = useCallback(() => {
    hapticFeedback.medium();
    setLevel(1);
    setScore(0);
    setLives(3);
    setGameState('playing');
    startLevel(1);
  }, [startLevel]);

  const celebrateScale = celebrateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });

  if (gameState === 'over') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialIcons name="chevron-left" size={30} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Book Order</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.gameOverContainer}>
          <MaterialIcons name="emoji-events" size={72} color={theme.primary} />
          <Text style={[styles.gameOverTitle, { color: theme.text }]}>Great Effort!</Text>

          <View style={[styles.finalScoreBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.finalScoreLabel, { color: theme.textSecondary }]}>Final Score</Text>
            <Text style={[styles.finalScoreValue, { color: theme.primary }]}>{score.toLocaleString()}</Text>
          </View>

          <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{level}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Level</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{score}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Points</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.playAgainButton, { backgroundColor: theme.primary }]}
            onPress={resetGame}
            activeOpacity={0.8}
          >
            <MaterialIcons name="replay" size={22} color="#FFFFFF" />
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exitButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.exitButtonText, { color: theme.textSecondary }]}>Exit Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Book Order</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.statsBar}>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="star" size={16} color={theme.primary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>Lvl {level}</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <MaterialIcons name="score" size={16} color={theme.primary} />
          <Text style={[styles.statBadgeText, { color: theme.text }]}>{score}</Text>
        </View>
        <Animated.View style={[
          styles.statBadge,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', transform: [{ translateX: livesShakeAnim }] },
        ]}>
          {[...Array(3)].map((_, i) => (
            <MaterialIcons
              key={i}
              name="favorite"
              size={16}
              color={i < lives ? theme.error || '#EF5350' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')}
            />
          ))}
        </Animated.View>
      </View>

      <ScrollView
        style={styles.gameArea}
        contentContainerStyle={styles.gameContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.instruction, { color: theme.textSecondary }]}>
          Tap the books in the order they appear in the Bible
        </Text>

        {sortedBooks.length > 0 && (
          <Animated.View style={[styles.sortedSection, { transform: [{ scale: celebrateScale }] }]}>
            <Text style={[styles.sectionLabel, { color: theme.primary }]}>
              <MaterialIcons name="check" size={14} color={theme.primary} /> Sorted
            </Text>
            {sortedBooks.map((book, i) => (
              <SortedBook
                key={book}
                book={book}
                bookIndex={levelData.startIndex + i}
                theme={theme}
              />
            ))}
          </Animated.View>
        )}

        {shuffledBooks.length > 0 && (
          <View style={styles.choicesSection}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              {sortedBooks.length === 0 ? 'Which book comes first?' : 'What comes next?'}
            </Text>
            <View style={styles.chipsContainer}>
              {shuffledBooks.map((book, index) => (
                <ShakeableBook
                  key={book + level}
                  book={book}
                  index={index}
                  onPress={handleBookPress}
                  disabled={gameState !== 'playing'}
                  isDark={isDark}
                  theme={theme}
                />
              ))}
            </View>
          </View>
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
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gameArea: {
    flex: 1,
  },
  gameContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  instruction: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  sortedSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sortedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  sortedText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  bookNumber: {
    fontSize: 12,
    fontWeight: '500',
  },
  choicesSection: {
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bookChip: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  bookChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  gameOverTitle: {
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
    paddingHorizontal: 24,
    marginBottom: 28,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
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
    marginHorizontal: 12,
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
