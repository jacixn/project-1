/**
 * PhysiqueScreen
 *
 * Premium body progress map with a rotatable 3D mannequin.
 * Muscle groups are color-coded by training freshness.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import BodyMap3D from '../components/BodyMap3D';
import physiqueService from '../services/physiqueService';
import WorkoutService from '../services/workoutService';
import { MUSCLE_GROUPS, SCORE_COLORS, getScoreColor } from '../data/exerciseMuscleMap';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BODY_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 520);

const PhysiqueScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [overallScore, setOverallScore] = useState(0);
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [gender, setGender] = useState('male');
  const [suggestions, setSuggestions] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadScores();
    }, [])
  );

  const loadScores = async () => {
    try {
      setLoading(true);
      const history = await WorkoutService.getWorkoutHistory();
      await physiqueService.recalculate(history);

      setScores(physiqueService.getScores());
      setOverallScore(physiqueService.getOverallScore());
      setSuggestions(physiqueService.getBalanceSuggestions());
      setLoading(false);

      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (error) {
      console.warn('[Physique] Load failed:', error);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  const handleMusclePress = (muscleId) => {
    setSelectedMuscle(prev => prev === muscleId ? null : muscleId);
    cardSlide.setValue(16);
    cardOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(cardSlide, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const selectedData = selectedMuscle ? scores[selectedMuscle] : null;
  const selectedInfo = selectedMuscle ? MUSCLE_GROUPS[selectedMuscle] : null;
  const overallColor = getScoreColor(overallScore);

  const bg = isDark ? '#09090B' : theme.background;
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#FAFAFA' : theme.text;
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : theme.textSecondary;
  const textTertiary = isDark ? 'rgba(255,255,255,0.3)' : theme.textTertiary;

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: bg, paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>Analyzing your workouts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {isDark && (
        <LinearGradient
          colors={['#09090B', '#0C1018', '#09090B']}
          style={StyleSheet.absoluteFill}
        />
      )}

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Physique</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Controls Row ── */}
        <View style={styles.controlsRow}>
          {/* Gender Toggle */}
          <View style={[styles.pill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <TouchableOpacity
              style={[styles.pillBtn, gender === 'male' && styles.pillActive]}
              onPress={() => setGender('male')}
            >
              <MaterialIcons name="male" size={16} color={gender === 'male' ? '#FFF' : textTertiary} />
              <Text style={[styles.pillText, { color: gender === 'male' ? '#FFF' : textTertiary }]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pillBtn, gender === 'female' && styles.pillActive]}
              onPress={() => setGender('female')}
            >
              <MaterialIcons name="female" size={16} color={gender === 'female' ? '#FFF' : textTertiary} />
              <Text style={[styles.pillText, { color: gender === 'female' ? '#FFF' : textTertiary }]}>Female</Text>
            </TouchableOpacity>
          </View>

          {/* Overall Score */}
          <View style={[styles.scorePill, { borderColor: overallColor + '50' }]}>
            <Text style={[styles.scoreNum, { color: overallColor }]}>{overallScore}</Text>
            <Text style={[styles.scoreLabel, { color: textTertiary }]}>overall</Text>
          </View>
        </View>

        {/* ── 3D Body ── */}
        <View style={styles.bodyArea}>
          <BodyMap3D
            scores={scores}
            gender={gender}
            selectedMuscle={selectedMuscle}
            onMusclePress={handleMusclePress}
            height={BODY_HEIGHT}
          />
          <Text style={[styles.hint, { color: textTertiary }]}>Drag to rotate  ·  Tap a muscle</Text>
        </View>

        {/* ── Legend ── */}
        <View style={styles.legendRow}>
          {Object.values(SCORE_COLORS).map((item) => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: textTertiary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Selected Muscle Detail ── */}
        {selectedMuscle && selectedData && selectedInfo && (
          <Animated.View style={[
            styles.detailCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
            { transform: [{ translateY: cardSlide }], opacity: cardOpacity },
          ]}>
            <View style={styles.detailTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailName, { color: textPrimary }]}>{selectedInfo.name}</Text>
                <Text style={[styles.detailStatus, { color: selectedData.color }]}>{selectedData.label}</Text>
              </View>
              <View style={[styles.detailBadge, { backgroundColor: selectedData.color }]}>
                <Text style={styles.detailBadgeText}>{selectedData.score}</Text>
              </View>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.progressFill, { width: `${Math.max(selectedData.score, 2)}%`, backgroundColor: selectedData.color }]} />
            </View>

            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="schedule" size={14} color={textTertiary} />
                <Text style={[styles.statText, { color: textSecondary }]}>
                  {selectedData.daysAgo !== null
                    ? (selectedData.daysAgo === 0 ? 'Today' : selectedData.daysAgo === 1 ? 'Yesterday' : `${selectedData.daysAgo}d ago`)
                    : 'Never'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="fitness-center" size={14} color={textTertiary} />
                <Text style={[styles.statText, { color: textSecondary }]}>{selectedData.weeklyVolume} sets/wk</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Balance Coach ── */}
        <View style={[styles.coachCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.coachHeader}>
            <View style={[styles.coachIcon, { backgroundColor: theme.primary + '18' }]}>
              <MaterialIcons name="psychology" size={20} color={theme.primary} />
            </View>
            <View>
              <Text style={[styles.coachTitle, { color: textPrimary }]}>Balance Coach</Text>
              <Text style={[styles.coachSub, { color: textTertiary }]}>Based on your training data</Text>
            </View>
          </View>
          {suggestions.map((text, i) => (
            <View key={i} style={styles.suggestionRow}>
              <View style={[styles.bullet, { backgroundColor: theme.primary }]} />
              <Text style={[styles.suggestionText, { color: textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── All Muscle Groups ── */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>All Muscle Groups</Text>
        <View style={styles.muscleGrid}>
          {Object.entries(MUSCLE_GROUPS).map(([id, info]) => {
            const data = scores[id] || { score: 0, color: '#7C3AED' };
            const active = selectedMuscle === id;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.chip,
                  { backgroundColor: cardBg, borderColor: active ? data.color : cardBorder },
                ]}
                onPress={() => handleMusclePress(id)}
                activeOpacity={0.7}
              >
                <View style={[styles.chipDot, { backgroundColor: data.color }]} />
                <Text style={[styles.chipName, { color: textSecondary }]} numberOfLines={1}>{info.shortName}</Text>
                <Text style={[styles.chipScore, { color: data.color }]}>{data.score}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 50 }} />
      </Animated.ScrollView>
    </View>
  );
};

/* ────────────────────────── STYLES ────────────────────────── */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 15, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
    paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },

  controlsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 4,
  },
  pill: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3 },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  pillActive: { backgroundColor: '#7C3AED' },
  pillText: { fontSize: 12, fontWeight: '600' },

  scorePill: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  scoreNum: { fontSize: 24, fontWeight: '800' },
  scoreLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  bodyArea: { alignItems: 'center', marginBottom: 4 },
  hint: { fontSize: 11, fontWeight: '500', marginTop: 2, letterSpacing: 0.3 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginBottom: 20, paddingHorizontal: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500' },

  detailCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20 },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  detailName: { fontSize: 20, fontWeight: '700' },
  detailStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  detailBadge: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  detailBadgeText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', borderRadius: 3 },
  statRow: { flexDirection: 'row', gap: 22 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 13, fontWeight: '500' },

  coachCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 24 },
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  coachIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  coachTitle: { fontSize: 15, fontWeight: '700' },
  coachSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  suggestionText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 20 },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, paddingHorizontal: 20 },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  chip: {
    width: (SCREEN_WIDTH - 40 - 24) / 4,
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', gap: 3,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  chipScore: { fontSize: 17, fontWeight: '800' },
});

export default PhysiqueScreen;
