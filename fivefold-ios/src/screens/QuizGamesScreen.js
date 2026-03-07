import React, { useRef, useEffect } from 'react';
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
import { useTheme } from '../contexts/ThemeContext';
import hapticFeedback from '../utils/haptics';

const { width } = Dimensions.get('window');

const QuizGamesScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const quizSlide = useRef(new Animated.Value(40)).current;
  const gamesSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.spring(quizSlide, { toValue: 0, tension: 50, friction: 10, delay: 100, useNativeDriver: true }).start();
    Animated.spring(gamesSlide, { toValue: 0, tension: 50, friction: 10, delay: 200, useNativeDriver: true }).start();
  }, []);

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
        <Text style={[styles.headerTitle, { color: textColor }]}>Quiz & Games</Text>
        <View style={styles.backBtn} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={[styles.subtitle, { color: subtextColor }]}>
          Choose your adventure
        </Text>

        <Animated.View style={{ transform: [{ translateY: quizSlide }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { hapticFeedback.medium(); navigation.navigate('QuizCategories'); }}
          >
            <LinearGradient
              colors={isDark ? ['#1a2a1a', '#2a3a2a'] : ['#E8F5E9', '#C8E6C9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.optionCard}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(76,175,80,0.15)' }]}>
                <MaterialIcons name="quiz" size={40} color="#4CAF50" />
              </View>
              <Text style={[styles.optionTitle, { color: textColor }]}>Quiz</Text>
              <Text style={[styles.optionDesc, { color: subtextColor }]}>
                Test your Bible knowledge with questions across categories
              </Text>
              <View style={styles.arrowRow}>
                <Text style={[styles.tapText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>Tap to start</Text>
                <MaterialIcons name="arrow-forward" size={20} color={subtextColor} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: gamesSlide }] }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => { hapticFeedback.medium(); navigation.navigate('BibleGames'); }}
          >
            <LinearGradient
              colors={isDark ? ['#2a1a3a', '#3a2a4a'] : ['#F3E5F5', '#E1BEE7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.optionCard}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(156,39,176,0.15)' }]}>
                <MaterialIcons name="sports-esports" size={40} color="#9C27B0" />
              </View>
              <Text style={[styles.optionTitle, { color: textColor }]}>Games</Text>
              <Text style={[styles.optionDesc, { color: subtextColor }]}>
                Fun Bible-themed games to play and learn
              </Text>
              <View style={styles.arrowRow}>
                <Text style={[styles.tapText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>Tap to play</Text>
                <MaterialIcons name="arrow-forward" size={20} color={subtextColor} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
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
    paddingHorizontal: 20,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tapText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default QuizGamesScreen;
