import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import hapticFeedback from '../../utils/haptics';

const { width } = Dimensions.get('window');
const GAME_DURATION = 60;

const WORD_BANK = [
  'the','be','to','of','and','in','that','have','it','for','not','on','with','he',
  'as','you','do','at','this','but','his','by','from','they','we','say','her','she',
  'or','an','will','my','one','all','would','there','their','what','so','up','out',
  'if','about','who','get','which','go','me','when','make','can','like','time','no',
  'just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','look','only','come','its','over','think',
  'also','back','after','use','two','how','our','work','first','well','way','even',
  'new','want','because','any','these','give','day','most','find','here','thing',
  'apple','banana','orange','grape','melon','cherry','peach','mango','lemon','plum',
  'mountain','river','ocean','forest','desert','valley','island','canyon','meadow',
  'planet','rocket','galaxy','nebula','comet','orbit','quasar','cosmos','pulsar',
  'guitar','piano','violin','drums','flute','trumpet','cello','harp','oboe','banjo',
  'python','kotlin','swift','react','typescript','flutter','angular','golang','rust',
  'crystal','diamond','emerald','ruby','topaz','opal','pearl','jade','amber','onyx',
  'falcon','eagle','hawk','raven','sparrow','condor','parrot','pelican','osprey',
  'thunder','lightning','cyclone','tsunami','tornado','blizzard','monsoon','tempest',
  'keyboard','monitor','printer','router','server','modem','laptop','tablet','webcam',
  'algebra','calculus','geometry','theorem','matrix','vector','tensor','scalar',
  'dolphin','penguin','giraffe','leopard','elephant','buffalo','panther','gazelle',
  'crimson','scarlet','magenta','indigo','cobalt','bronze','silver','golden','violet',
  'oxygen','helium','carbon','neon','argon','sodium','copper','titanium','platinum',
  'quantum','photon','proton','neutron','electron','nucleus','fusion','plasma',
  'cathedral','monastery','fortress','citadel','palace','mansion','cottage','villa',
  'harmony','melody','rhythm','tempo','chorus','ballad','sonata','opera','symphony',
  'mercury','venus','earth','mars','jupiter','saturn','uranus','neptune','pluto',
  'courage','wisdom','honor','valor','justice','virtue','grace','mercy','patience',
  'adventure','mystery','fantasy','legend','voyage','quest','journey','odyssey',
  'chocolate','vanilla','caramel','cinnamon','espresso','cappuccino','latte',
  'algorithm','function','variable','constant','boolean','integer','string',
  'architect','engineer','designer','sculptor','painter','composer','director',
  'submarine','helicopter','satellite','telescope','microscope','periscope',
  'rectangle','triangle','pentagon','hexagon','octagon','cylinder','pyramid',
  'avalanche','earthquake','volcano','whirlpool','sandstorm','hailstorm',
  'xylophone','saxophone','accordion','harmonica','tambourine','marimba',
  'spectacular','magnificent','extraordinary','phenomenal','remarkable',
  'constellation','atmosphere','stratosphere','thermosphere','exosphere',
  'encyclopedia','bibliography','autobiography','documentary','manuscript',
];

const getWordForLevel = (wordsTyped) => {
  let pool;
  if (wordsTyped < 10) {
    pool = WORD_BANK.filter((w) => w.length <= 4);
  } else if (wordsTyped < 25) {
    pool = WORD_BANK.filter((w) => w.length >= 4 && w.length <= 6);
  } else if (wordsTyped < 45) {
    pool = WORD_BANK.filter((w) => w.length >= 5 && w.length <= 8);
  } else if (wordsTyped < 70) {
    pool = WORD_BANK.filter((w) => w.length >= 6 && w.length <= 10);
  } else {
    pool = WORD_BANK.filter((w) => w.length >= 8);
  }
  if (pool.length === 0) pool = WORD_BANK;
  return pool[Math.floor(Math.random() * pool.length)];
};

const TypingSpeedGame = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const inputRef = useRef(null);

  const [gameState, setGameState] = useState('idle');
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [correctWords, setCorrectWords] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [score, setScore] = useState(0);

  const timerRef = useRef(null);
  const wordAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const nextWord = useCallback((typed) => {
    const w = getWordForLevel(typed);
    setCurrentWord(w);
    setInput('');
    wordAnim.setValue(0);
    Animated.spring(wordAnim, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }).start();
  }, [wordAnim]);

  const startGame = useCallback(() => {
    hapticFeedback.medium();
    setTimeLeft(GAME_DURATION);
    setWordsTyped(0);
    setCorrectWords(0);
    setTotalChars(0);
    setCorrectChars(0);
    setStreak(0);
    setBestStreak(0);
    setScore(0);
    setGameState('playing');
    nextWord(0);
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [nextWord]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          Keyboard.dismiss();
          setGameState('over');
          resultSlide.setValue(50);
          resultOpacity.setValue(0);
          Animated.parallel([
            Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
            Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]).start();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const handleTextChange = (text) => {
    if (gameState !== 'playing') return;
    setInput(text);

    if (text.endsWith(' ') || text.endsWith('\n')) {
      const trimmed = text.trim();
      const newWordsTyped = wordsTyped + 1;
      setWordsTyped(newWordsTyped);
      setTotalChars((c) => c + currentWord.length);

      if (trimmed.toLowerCase() === currentWord.toLowerCase()) {
        hapticFeedback.success();
        const charScore = currentWord.length * 10;
        const newStreak = streak + 1;
        const streakBonus = newStreak >= 10 ? 50 : newStreak >= 5 ? 25 : 0;
        setScore((s) => s + charScore + streakBonus);
        setCorrectWords((c) => c + 1);
        setCorrectChars((c) => c + currentWord.length);
        setStreak(newStreak);
        if (newStreak > bestStreak) setBestStreak(newStreak);
      } else {
        hapticFeedback.error();
        setStreak(0);
        let matched = 0;
        for (let i = 0; i < Math.min(trimmed.length, currentWord.length); i++) {
          if (trimmed[i].toLowerCase() === currentWord[i].toLowerCase()) matched++;
        }
        setCorrectChars((c) => c + matched);

        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }

      nextWord(newWordsTyped);
    }
  };

  const getLetterColors = () => {
    return currentWord.split('').map((char, i) => {
      if (i >= input.length) return 'rgba(255,255,255,0.3)';
      return input[i].toLowerCase() === char.toLowerCase() ? '#34C759' : '#FF3B30';
    });
  };

  const wpm = wordsTyped > 0
    ? Math.round((correctWords / ((GAME_DURATION - timeLeft) || 1)) * 60)
    : 0;
  const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
  const finalWpm = correctWords > 0
    ? Math.round((correctWords / GAME_DURATION) * 60)
    : 0;
  const timerColor = timeLeft > 30 ? '#10B981' : timeLeft > 10 ? '#F59E0B' : '#EF4444';

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
          <Text style={styles.headerTitle}>Typing Speed</Text>
          <View style={styles.backButton} />
        </View>

        <Animated.View style={[
          styles.gameOverContainer,
          { transform: [{ translateY: resultSlide }], opacity: resultOpacity },
        ]}>
          <MaterialIcons name="keyboard" size={72} color="#007AFF" />
          <Text style={styles.gameOverTitle}>Time's Up!</Text>

          <View style={styles.bigStatBox}>
            <Text style={styles.bigStatLabel}>Words Per Minute</Text>
            <Text style={styles.bigStatValue}>{finalWpm}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{score}</Text>
              <Text style={styles.statItemLabel}>Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{accuracy}%</Text>
              <Text style={styles.statItemLabel}>Accuracy</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{correctWords}/{wordsTyped}</Text>
              <Text style={styles.statItemLabel}>Correct/Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{bestStreak}</Text>
              <Text style={styles.statItemLabel}>Best Streak</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={startGame}>
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

  if (gameState === 'idle') {
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
          <Text style={styles.headerTitle}>Typing Speed</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.idleContainer}>
          <MaterialIcons name="keyboard" size={80} color="rgba(0,122,255,0.4)" />
          <Text style={styles.idleTitle}>Typing Speed</Text>
          <Text style={styles.idleDesc}>
            Type the displayed words as fast and accurately as possible. You have 60 seconds. Words get harder as you go!
          </Text>
          <TouchableOpacity activeOpacity={0.8} onPress={startGame}>
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            clearInterval(timerRef.current);
            Keyboard.dismiss();
            navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Typing Speed</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      <View style={styles.playingStats}>
        <View style={styles.playingStatBox}>
          <MaterialIcons name="timer" size={16} color={timerColor} />
          <Text style={[styles.playingStatValue, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
        <View style={styles.playingStatBox}>
          <MaterialIcons name="speed" size={16} color="#007AFF" />
          <Text style={styles.playingStatValue}>{wpm} WPM</Text>
        </View>
        <View style={styles.playingStatBox}>
          <MaterialIcons name="local-fire-department" size={16} color="#FF6B35" />
          <Text style={styles.playingStatValue}>{streak}</Text>
        </View>
      </View>

      <View style={styles.timerBar}>
        <View
          style={[
            styles.timerFill,
            {
              width: `${(timeLeft / GAME_DURATION) * 100}%`,
              backgroundColor: timerColor,
            },
          ]}
        />
      </View>

      <View style={styles.wordArea}>
        <Animated.View style={[
          styles.wordDisplay,
          { transform: [{ scale: wordAnim }, { translateX: shakeAnim }] },
        ]}>
          <View style={styles.lettersRow}>
            {getLetterColors().map((color, i) => (
              <Text key={`${currentWord}-${i}`} style={[styles.wordLetter, { color }]}>
                {currentWord[i].toUpperCase()}
              </Text>
            ))}
          </View>
        </Animated.View>

        <Text style={styles.wordCounter}>
          {correctWords} words correct
        </Text>
      </View>

      <View style={styles.inputArea}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={handleTextChange}
          placeholder="Type here..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="next"
          blurOnSubmit={false}
        />
      </View>
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
  playingStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  playingStatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playingStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  wordArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordDisplay: {
    paddingHorizontal: 20,
  },
  lettersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  wordLetter: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
  },
  wordCounter: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 20,
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
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
  bigStatBox: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  bigStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  bigStatValue: {
    fontSize: 64,
    fontWeight: '900',
    color: '#007AFF',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
    gap: 12,
  },
  statItem: {
    width: (width - 96) / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItemValue: {
    fontSize: 22,
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
    marginTop: 28,
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

export default TypingSpeedGame;
