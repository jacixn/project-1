import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import hapticFeedback from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const H_PAD = 20;
const CARD_WIDTH = (width - H_PAD * 2 - CARD_GAP) / 2;

const BIBLE_GAMES = [
  { name: 'Verse Jumble', icon: 'shuffle', colors: ['#1B5E20', '#2E7D32'], screen: 'VerseJumbleGame', desc: 'Unscramble the words of a Bible verse' },
  { name: 'Bible Hangman', icon: 'text-fields', colors: ['#4A148C', '#6A1B9A'], screen: 'BibleHangmanGame', desc: 'Guess the hidden Bible word' },
  { name: 'Who Am I?', icon: 'person-search', colors: ['#BF360C', '#D84315'], screen: 'WhoAmIGame', desc: 'Guess the Bible character from clues' },
  { name: 'Book Order', icon: 'menu-book', colors: ['#01579B', '#0277BD'], screen: 'BookOrderGame', desc: 'Put the books of the Bible in order' },
  { name: 'Verse Complete', icon: 'auto-fix-high', colors: ['#E65100', '#EF6C00'], screen: 'VerseCompleteGame', desc: 'Fill in the missing word' },
  { name: 'Bible Pairs', icon: 'people', colors: ['#006064', '#00838F'], screen: 'BiblePairsGame', desc: 'Match Bible characters with their stories' },
];

const BibleGamesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const textColor = isDark ? '#FFFFFF' : theme.text;
  const subtextColor = isDark ? 'rgba(255,255,255,0.5)' : '#6B7280';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { hapticFeedback.light(); navigation.goBack(); }}
          style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Bible Games</Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={[styles.subtitle, { color: subtextColor }]}>
        Fun games to explore the Bible
      </Text>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {BIBLE_GAMES.map((game) => (
          <TouchableOpacity
            key={game.screen}
            activeOpacity={0.8}
            onPress={() => { hapticFeedback.light(); navigation.navigate(game.screen); }}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={game.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons name={game.icon} size={32} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameDesc}>{game.desc}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: H_PAD,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gameName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  gameDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default BibleGamesScreen;
