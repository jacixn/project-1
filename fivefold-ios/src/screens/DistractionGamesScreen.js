import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import hapticFeedback from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const GAMES = [
  { name: 'Memory Recall', icon: 'psychology', colors: ['#1a1a4e', '#2a2a6e'], screen: 'MemoryRecallGame' },
  { name: 'Find It Fast', icon: 'search', colors: ['#4a1a6e', '#6a2a8e'], screen: 'FindItFastGame' },
  { name: 'Stroop Test', icon: 'palette', colors: ['#2a4a1a', '#3a6a2a'], screen: 'StroopTestGame' },
  { name: 'Math Blitz', icon: 'calculate', colors: ['#4a3a1a', '#6a5a2a'], screen: 'MathBlitzGame' },
  { name: 'Breath Hold', icon: 'air', colors: ['#1a3a5a', '#2a4a7a'], screen: 'BreathHoldGame' },
  { name: 'Color Match', icon: 'colorize', colors: ['#5a1a3a', '#7a2a5a'], screen: 'ColorMatchGame' },
  { name: 'Pattern Repeat', icon: 'grid-view', colors: ['#1a4a3a', '#2a6a5a'], screen: 'PatternRepeatGame' },
  { name: 'Reaction Time', icon: 'flash-on', colors: ['#5a4a1a', '#7a6a2a'], screen: 'ReactionTimeGame' },
  { name: 'Number Chain', icon: 'tag', colors: ['#3a1a5a', '#5a2a7a'], screen: 'NumberChainGame' },
  { name: 'Typing Speed', icon: 'keyboard', colors: ['#1a2a4a', '#2a3a6a'], screen: 'TypingSpeedGame' },
  { name: 'Emoji Match', icon: 'mood', colors: ['#4a3a0a', '#6a5a1a'], screen: 'EmojiMatchGame' },
  { name: 'Bubble Pop', icon: 'bubble-chart', colors: ['#1a4a5a', '#2a6a7a'], screen: 'BubblePopGame' },
  { name: 'Maze Runner', icon: 'map', colors: ['#3a3a1a', '#5a5a2a'], screen: 'MazeRunnerGame' },
  { name: 'Quick Sort', icon: 'sort', colors: ['#1a1a3a', '#2a2a5a'], screen: 'QuickSortGame' },
  { name: 'Spot Difference', icon: 'compare', colors: ['#4a1a1a', '#6a2a2a'], screen: 'SpotDifferenceGame' },
  { name: 'True or False', icon: 'fact-check', colors: ['#0a3a3a', '#1a5a5a'], screen: 'TrueOrFalseGame' },
  { name: 'Countdown', icon: 'timer', colors: ['#3a0a3a', '#5a1a5a'], screen: 'CountdownGame' },
  { name: 'Flash Cards', icon: 'flip', colors: ['#2a3a0a', '#4a5a1a'], screen: 'FlashCardsGame' },
];

const DistractionGamesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleGamePress = (screen) => {
    hapticFeedback.light();
    navigation.navigate(screen);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.headerTitle}>Distraction Games</Text>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.subtitle}>
        Defeat the urge with these cognitive exercises
      </Text>

      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.screen}
            activeOpacity={0.8}
            onPress={() => handleGamePress(game.screen)}
            style={styles.cardWrapper}
          >
            <LinearGradient
              colors={game.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons name={game.icon} size={36} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.gameName}>{game.name}</Text>
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
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 24,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: CARD_GAP,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gameName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default DistractionGamesScreen;
