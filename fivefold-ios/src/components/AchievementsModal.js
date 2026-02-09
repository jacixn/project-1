import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AchievementService from '../services/achievementService';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 50) / 2;

/** Human-friendly description for each achievement type */
const DESCRIPTION_MAP = {
  prayersCompleted:    (t) => `Complete ${t} prayer${t > 1 ? 's' : ''}`,
  savedVerses:         (t) => `Save ${t} verse${t > 1 ? 's' : ''}`,
  versesShared:        (t) => `Share ${t} verse${t > 1 ? 's' : ''}`,
  audiosPlayed:        (t) => `Listen to ${t} Bible audio${t > 1 ? 's' : ''}`,
  charactersRead:      (t) => `Read ${t} Bible character${t > 1 ? 's' : ''}`,
  timelineErasViewed:  (t) => `Explore ${t} timeline era${t > 1 ? 's' : ''}`,
  versesRead:          (t) => `Read ${t} verse${t > 1 ? 's' : ''}`,
  mapsVisited:         (t) => `Visit ${t} Bible map location${t > 1 ? 's' : ''}`,
  completedTasks:      (t) => `Complete ${t} task${t > 1 ? 's' : ''}`,
  lowTierCompleted:    (t) => `Complete ${t} low-tier task${t > 1 ? 's' : ''}`,
  midTierCompleted:    (t) => `Complete ${t} mid-tier task${t > 1 ? 's' : ''}`,
  highTierCompleted:   (t) => `Complete ${t} high-tier task${t > 1 ? 's' : ''}`,
  appStreak:           (t) => `Open the app ${t} day${t > 1 ? 's' : ''} in a row`,
  totalPoints:         (t) => `Earn ${t.toLocaleString()} total points`,
  workoutsCompleted:   (t) => `Complete ${t} workout${t > 1 ? 's' : ''}`,
  gymWeekStreak:       (t) => `Work out ${t} week${t > 1 ? 's' : ''} in a row`,
  exercisesLogged:     (t) => `Log ${t} exercise${t > 1 ? 's' : ''} total`,
  setsCompleted:       (t) => `Complete ${t} set${t > 1 ? 's' : ''}`,
  workoutMinutes:      (t) => `Train for ${t} minute${t > 1 ? 's' : ''} total`,
};

/** Category labels for section headers */
const CATEGORY_LABELS = {
  prayer: 'Prayer',
  saved: 'Saved Verses',
  shared: 'Sharing',
  audio: 'Audio',
  characters: 'Bible Characters',
  timeline: 'Timeline',
  reading: 'Reading',
  maps: 'Bible Maps',
  tasks: 'Tasks',
  tasks_low: 'Low Tier Tasks',
  tasks_mid: 'Mid Tier Tasks',
  tasks_high: 'High Tier Tasks',
  streak: 'Daily Streak',
  goals: 'Points Goals',
  workouts: 'Workouts',
  gym_streak: 'Gym Streak',
  exercises: 'Exercises',
  sets: 'Sets',
  gym_time: 'Gym Time',
};

/** Category ordering */
const CATEGORY_ORDER = [
  'prayer', 'saved', 'shared', 'audio', 'characters', 'timeline', 'reading', 'maps',
  'tasks', 'tasks_low', 'tasks_mid', 'tasks_high', 'streak', 'goals',
  'workouts', 'gym_streak', 'exercises', 'sets', 'gym_time',
];

const AchievementsModal = ({ visible, onClose, userStats, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [achievements, setAchievements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);
  const [prestigeRound, setPrestigeRound] = useState(0);
  const [showPrestigeCelebration, setShowPrestigeCelebration] = useState(false);
  const [celebrationPrestige, setCelebrationPrestige] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationGlow = useRef(new Animated.Value(0)).current;
  const celebrationLoopRef = useRef(null);

  // Collapsible search bar animation
  const searchBarAnim = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef('up');

  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';

    if (direction !== scrollDirection.current && Math.abs(currentScrollY - lastScrollY.current) > 10) {
      scrollDirection.current = direction;
      Animated.timing(searchBarAnim, {
        toValue: direction === 'down' ? 0 : 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }

    lastScrollY.current = currentScrollY;
  };

  // Load prestige count on mount
  useEffect(() => {
    AchievementService.getPrestigeCount().then(setPrestigeRound);
  }, []);

  // Listen for the all-achievements-completed event
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('allAchievementsCompleted', ({ prestigeRound: round }) => {
      setCelebrationPrestige(round);
      setShowPrestigeCelebration(true);
      setPrestigeRound(round);
      hapticFeedback.success();

      // Animate celebration modal
      celebrationScale.setValue(0);
      celebrationGlow.setValue(0);
      // Stop any previous loop before starting a new one
      if (celebrationLoopRef.current) {
        celebrationLoopRef.current.stop();
        celebrationLoopRef.current = null;
      }
      Animated.spring(celebrationScale, { toValue: 1, tension: 40, friction: 5, useNativeDriver: true }).start(() => {
        const glowLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(celebrationGlow, { toValue: 1, duration: 1500, useNativeDriver: true }),
            Animated.timing(celebrationGlow, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ])
        );
        celebrationLoopRef.current = glowLoop;
        glowLoop.start();
      });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      searchBarAnim.setValue(1);
      lastScrollY.current = 0;
      scrollDirection.current = 'up';

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
      generateAchievements();
      AchievementService.getPrestigeCount().then(setPrestigeRound);
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, userStats]);

  const generateAchievements = () => {
    const stats = userStats || {};
    const definitions = AchievementService.getAchievementDefinitions();

    const mapped = definitions.map((def) => {
      const current = stats[def.type] || 0;
      const descFn = DESCRIPTION_MAP[def.type];
      return {
        id: def.id,
        title: def.title,
        description: descFn ? descFn(def.target) : `Reach ${def.target}`,
        category: def.category,
        icon: def.icon,
        target: def.target,
        progress: Math.min(current, def.target),
        completed: current >= def.target,
        points: def.points,
      };
    });

    setAchievements(mapped);
  };

  // Filter by search + category + completed toggle
  const filteredAchievements = achievements.filter((a) => {
    const matchesSearch =
      searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    const matchesCompleted = !showCompletedOnly || a.completed;
    return matchesSearch && matchesCategory && matchesCompleted;
  });

  // Count completed
  const completedCount = achievements.filter((a) => a.completed).length;

  const renderAchievement = ({ item }) => (
    <Animated.View
      style={{
        transform: [{ scale: item.completed ? 1 : 0.98 }],
        opacity: item.completed ? 1 : 0.8,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.achievementCard,
          {
            backgroundColor: item.completed
              ? `${theme.primary}15`
              : isDark
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(0,0,0,0.03)',
            borderColor: item.completed
              ? theme.primary
              : isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
          },
        ]}
      >
        {item.completed && (
          <LinearGradient
            colors={[`${theme.primary}20`, 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        <View
          style={[
            styles.achievementIcon,
            {
              backgroundColor: item.completed
                ? theme.primary
                : isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)',
              shadowColor: theme.primary,
              shadowOpacity: item.completed ? 0.5 : 0,
              shadowRadius: 10,
              elevation: item.completed ? 10 : 0,
            },
          ]}
        >
          <MaterialIcons
            name={item.icon}
            size={28}
            color={item.completed ? '#FFFFFF' : theme.textTertiary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.achievementTitle, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={[styles.achievementDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.achievementProgress}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <LinearGradient
                colors={[theme.primary, `${theme.primary}80`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${Math.min((item.progress / item.target) * 100, 100)}%` },
                ]}
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[styles.progressText, { color: theme.textTertiary }]}>
                {item.progress.toLocaleString()}/{item.target.toLocaleString()}
              </Text>
              <Text
                style={[
                  styles.pointsText,
                  {
                    color: item.completed ? theme.primary : theme.textTertiary,
                    fontWeight: '800',
                  },
                ]}
              >
                +{Number(item.points || 0).toLocaleString()} PTS
              </Text>
            </View>
          </View>
        </View>

        {item.completed && (
          <View style={[styles.completedBadge, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="check" size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Category filter chips ──
  const renderCategoryChips = () => {
    const categories = [
      { key: 'all', label: 'All' },
      ...CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_LABELS[key] || key })),
    ];

    return (
      <Animated.View
        style={{
          height: searchBarAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 44],
          }),
          opacity: searchBarAnim,
          overflow: 'hidden',
        }}
      >
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedCategory(cat.key);
                }}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? theme.primary
                    : isDark
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.05)',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isActive ? '#FFFFFF' : theme.textSecondary,
                  }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.ScrollView>
      </Animated.View>
    );
  };

  const content = (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#1a1a1a', '#000'] : ['#FDFBFB', '#EBEDEE']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Content */}
        <Animated.FlatList
          data={filteredAchievements}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 100,
            ...(filteredAchievements.length === 0 ? { flex: 1 } : {}),
          }}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={
            filteredAchievements.length > 0 ? { justifyContent: 'space-between' } : undefined
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={
            <Animated.View
              style={{
                height: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Platform.OS === 'ios' ? 100 : 80, Platform.OS === 'ios' ? 210 : 180],
                }),
              }}
            />
          }
          ListEmptyComponent={
            <View
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}
            >
              <MaterialIcons
                name="emoji-events"
                size={64}
                color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
              />
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 17,
                  fontWeight: '700',
                  marginTop: 16,
                }}
              >
                No Matches
              </Text>
              <Text
                style={{
                  color: theme.textTertiary,
                  fontSize: 14,
                  marginTop: 6,
                  textAlign: 'center',
                  paddingHorizontal: 40,
                }}
              >
                Try a different search or category.
              </Text>
            </View>
          }
        />

        {/* Premium Transparent Header */}
        <BlurView
          intensity={50}
          tint={isDark ? 'dark' : 'light'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <View style={{ height: Platform.OS === 'ios' ? 54 : 24 }} />
          <Animated.View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.primary} />
              </TouchableOpacity>

              <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 17,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                    }}
                  >
                    Achievements
                  </Text>
                  {prestigeRound > 0 && (
                    <View style={{
                      backgroundColor: theme.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                        Round {prestigeRound + 1}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {completedCount}/{achievements.length} unlocked{prestigeRound > 0 ? ` \u2022 ${prestigeRound}x completed` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.selection();
                  setShowCompletedOnly((prev) => !prev);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: showCompletedOnly ? theme.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={showCompletedOnly ? '#FFFFFF' : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Collapsible Search bar */}
            <Animated.View
              style={{
                height: searchBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 58],
                }),
                opacity: searchBarAnim,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  marginTop: 16,
                }}
              >
                <MaterialIcons name="search" size={20} color={theme.textTertiary} />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: theme.text,
                    marginLeft: 10,
                    paddingVertical: 2,
                  }}
                  placeholder="Search achievements..."
                  placeholderTextColor={theme.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="close" size={14} color={theme.text} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </Animated.View>

          {/* Category filter chips */}
          {renderCategoryChips()}
        </BlurView>
      </Animated.View>
    </View>
  );

  const prestigeCelebrationModal = (
    <Modal visible={showPrestigeCelebration} animationType="fade" transparent>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}>
        <Animated.View style={{
          transform: [{ scale: celebrationScale }],
          width: '100%',
          maxWidth: 340,
          borderRadius: 32,
          overflow: 'hidden',
        }}>
          <LinearGradient
            colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 32, alignItems: 'center' }}
          >
            {/* Trophy icon */}
            <Animated.View style={{
              opacity: celebrationGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
              transform: [{
                scale: celebrationGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              }],
            }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                shadowColor: '#FFD700',
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 12,
              }}>
                <MaterialIcons name="emoji-events" size={56} color="#FFD700" />
              </View>
            </Animated.View>

            <Text style={{
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: '900',
              textAlign: 'center',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}>
              Incredible!
            </Text>

            <Text style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 8,
            }}>
              You've completed every single achievement!
            </Text>

            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              marginBottom: 20,
            }}>
              <Text style={{
                color: '#FFD700',
                fontSize: 18,
                fontWeight: '800',
                textAlign: 'center',
              }}>
                Round {celebrationPrestige} Complete
              </Text>
            </View>

            <Text style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: '500',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 28,
            }}>
              All achievements have been reset. Time to earn them all over again — let's go!
            </Text>

            <TouchableOpacity
              onPress={() => {
                // Stop the infinite glow loop before closing
                if (celebrationLoopRef.current) {
                  celebrationLoopRef.current.stop();
                  celebrationLoopRef.current = null;
                }
                celebrationGlow.stopAnimation();
                celebrationScale.stopAnimation();
                setShowPrestigeCelebration(false);
                hapticFeedback.medium();
                generateAchievements();
              }}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 36,
                paddingVertical: 14,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text style={{
                color: '#667eea',
                fontSize: 16,
                fontWeight: '800',
                letterSpacing: 0.3,
              }}>
                Let's Go!
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );

  if (asScreen) {
    return (
      <>
        {content}
        {prestigeCelebrationModal}
      </>
    );
  }

  return (
    <>
      <Modal visible={visible} animationType="none" transparent>
        {content}
      </Modal>
      {prestigeCelebrationModal}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  achievementCard: {
    width: CARD_SIZE,
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  achievementDesc: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  achievementProgress: {
    marginTop: 'auto',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.6,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default AchievementsModal;
