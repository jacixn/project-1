import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Modal,
  Platform,
  ScrollView,
  Alert,
  RefreshControl,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// BlurView removed — header now scrolls with content
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import userStorage from '../utils/userStorage';
import SimplePercentageLoader from './SimplePercentageLoader';
import AchievementService from '../services/achievementService';

const { width, height } = Dimensions.get('window');

// Layout
const RAIL_LEFT = 16;
const DOT_SIZE = 10;
const CARD_LEFT = 36;
const CARD_RIGHT = 20;
const CARD_HEIGHT = 160;
const CARD_GAP = 16;
const STICKER_SIZE = 85;
const VIEWED_ERAS_KEY = 'timeline_viewed_eras';

// =============================================
// Remote Bible Timeline Configuration
// =============================================
const TIMELINE_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/bible-timeline.json',
  get URL() {
    if (this.GITHUB_USERNAME === 'YOUR_USERNAME') return null;
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'bible_timeline_data_v2_with_images',
  CACHE_TIMESTAMP_KEY: 'bible_timeline_timestamp_v2',
  CACHE_DURATION: 60 * 60 * 1000,
};

const BibleTimeline = ({ visible, onClose, onNavigateToVerse, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Data state
  const [timelineDataState, setTimelineDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [selectedEra, setSelectedEra] = useState(null);
  const [viewedEras, setViewedEras] = useState(new Set());

  // Animations
  const cardAnims = useRef([]);
  const dotAnims = useRef([]);
  const hasAnimated = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // =============================================
  // DATA LAYER — preserved verbatim
  // =============================================

  const isCacheValid = async () => {
    try {
      const timestamp = await userStorage.getRaw(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < TIMELINE_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  };

  const fetchTimelineFromRemote = async () => {
    try {
      const url = TIMELINE_CONFIG.URL;
      if (!url) {
        throw new Error('Remote URL not configured');
      }

      console.log('Fetching Bible timeline from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      await userStorage.setRaw(TIMELINE_CONFIG.CACHE_KEY, JSON.stringify(data));
      await userStorage.setRaw(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Successfully fetched and cached Bible timeline');
      return data;
    } catch (error) {
      console.error('Error fetching Bible timeline from remote:', error);
      throw error;
    }
  };

  const loadLocalFallbackData = () => {
    return {
      timelineData: [
        {
          id: 'creation-sample',
          title: 'CREATION & EARLY WORLD',
          subtitle: 'Genesis 1 to 11',
          emoji: '🌍',
          bgEmoji: '✨',
          color: '#E91E63',
          gradient: ['#FF6B9D', '#E91E63', '#C2185B'],
          position: { x: width * 0.25, y: 40 },
          size: 120,
          imageUrl: 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/timeline-stickers/creation-sticker.png',
          description: 'Bible timeline is loading from remote source...',
          stories: [
            {
              title: 'Loading Timeline...',
              when: 'Please wait',
              bibleStory: 'Loading...',
              characters: 'Loading...',
              story: 'Please check your internet connection and try refreshing.'
            }
          ],
          connections: []
        }
      ]
    };
  };

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheValid = await isCacheValid();
      if (cacheValid) {
        const cachedData = await userStorage.getRaw(TIMELINE_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setTimelineDataState(data);
          setLoading(false);
          console.log('✅ Loaded Bible timeline from cache');
          return;
        }
      }

      try {
        const data = await fetchTimelineFromRemote();
        setTimelineDataState(data);
      } catch (remoteError) {
        console.error('Remote fetch failed, using fallback:', remoteError);
        
        const cachedData = await userStorage.getRaw(TIMELINE_CONFIG.CACHE_KEY);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setTimelineDataState(data);
          console.log('📦 Using expired cache due to remote failure');
        } else {
          const fallbackData = loadLocalFallbackData();
          setTimelineDataState(fallbackData);
          console.log('🔄 Using fallback data');
        }
        
        setError('Using offline data. Pull to refresh when online.');
      }
    } catch (error) {
      console.error('Error loading Bible timeline:', error);
      setError('Failed to load timeline. Please try again.');
      
      const fallbackData = loadLocalFallbackData();
      setTimelineDataState(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const refreshTimeline = async () => {
    try {
      await userStorage.remove(TIMELINE_CONFIG.CACHE_KEY);
      await userStorage.remove(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      await loadTimeline();
    } catch (error) {
      console.error('Error refreshing timeline:', error);
      Alert.alert('Error', 'Failed to refresh timeline. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    try {
      await userStorage.remove(TIMELINE_CONFIG.CACHE_KEY);
      await userStorage.remove(TIMELINE_CONFIG.CACHE_TIMESTAMP_KEY);
      await loadTimeline();
    } catch (error) {
      console.error('Error refreshing timeline:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      userStorage.remove('bible_timeline_data_v1').catch(() => {});
      userStorage.remove('bible_timeline_timestamp_v1').catch(() => {});
      loadTimeline();
    } else {
      // Reset entrance animation flag so it replays next time
      hasAnimated.current = false;
      cardAnims.current = [];
      dotAnims.current = [];
    }
  }, [visible]);

  // =============================================
  // END DATA LAYER
  // =============================================

  const timelineData = timelineDataState ? timelineDataState.timelineData : [];

  // Load viewed eras
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await userStorage.getRaw(VIEWED_ERAS_KEY);
        if (stored) setViewedEras(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Error loading viewed eras:', e);
      }
    };
    if (visible) load();
  }, [visible]);

  // Entrance animations — only run ONCE to avoid resetting card opacity
  useEffect(() => {
    if (timelineData.length > 0 && !loading && !hasAnimated.current) {
      hasAnimated.current = true;
      cardAnims.current = timelineData.map(() => new Animated.Value(0));
      dotAnims.current = timelineData.map(() => new Animated.Value(0));

      Animated.parallel([
        Animated.stagger(80,
          cardAnims.current.map((anim) =>
            Animated.spring(anim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true })
          )
        ),
        Animated.stagger(80,
          dotAnims.current.map((anim) =>
            Animated.sequence([
              Animated.delay(40),
              Animated.spring(anim, { toValue: 1, tension: 65, friction: 6, useNativeDriver: true }),
            ])
          )
        ),
        Animated.timing(progressAnim, {
          toValue: timelineData.length > 0 ? viewedEras.size / timelineData.length : 0,
          duration: 800,
          delay: 200,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Belt-and-suspenders: force final values so cards stay visible
        cardAnims.current.forEach(a => a.setValue(1));
        dotAnims.current.forEach(a => a.setValue(1));
      });
    }
  }, [timelineData.length, loading]);

  // Update progress when viewed eras change
  useEffect(() => {
    if (timelineData.length > 0 && !loading) {
      Animated.timing(progressAnim, {
        toValue: viewedEras.size / timelineData.length,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, [viewedEras.size]);

  // =============================================
  // Bottom sheet open / close
  // =============================================

  const openSheet = useCallback(async (era) => {
    hapticFeedback.medium();
    setSelectedEra(era);

    // Mark as viewed
    if (!viewedEras.has(era.id)) {
      const newViewed = new Set(viewedEras);
      newViewed.add(era.id);
      setViewedEras(newViewed);
      try {
        await userStorage.setRaw(VIEWED_ERAS_KEY, JSON.stringify([...newViewed]));
      } catch (e) {
        console.error('Error saving viewed eras:', e);
      }
      AchievementService.incrementStat('timelineErasViewed');
    }

    sheetY.setValue(height);
    overlayOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [viewedEras]);

  const closeSheet = useCallback(() => {
    hapticFeedback.light();
    Animated.parallel([
      Animated.timing(sheetY, { toValue: height, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setSelectedEra(null));
  }, []);

  // Pull-down-to-dismiss for bottom sheet
  const dismissHapticFired = useRef(false);
  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderGrant: () => {
        dismissHapticFired.current = false;
        // Stop any running native-driven animations before JS takes over
        sheetY.stopAnimation();
        overlayOpacity.stopAnimation();
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) return;
        sheetY.setValue(gs.dy);
        overlayOpacity.setValue(Math.max(0, 1 - gs.dy / (height * 0.5)));

        if (gs.dy > 150 && !dismissHapticFired.current) {
          dismissHapticFired.current = true;
          hapticFeedback.medium();
        } else if (gs.dy <= 150 && dismissHapticFired.current) {
          dismissHapticFired.current = false;
          hapticFeedback.light();
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 150 || gs.vy > 0.5) {
          hapticFeedback.success();
          Animated.parallel([
            Animated.timing(sheetY, { toValue: height, duration: 250, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => setSelectedEra(null));
        } else {
          Animated.parallel([
            Animated.spring(sheetY, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
            Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  // =============================================
  // Render helpers
  // =============================================

  const renderEraCard = (era, index) => {
    const isViewed = viewedEras.has(era.id);
    const cardAnim = cardAnims.current[index] || new Animated.Value(1);
    const dotAnim = dotAnims.current[index] || new Animated.Value(1);

    const cardTranslateX = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
    const cardOpacity = cardAnim;
    const dotScale = dotAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.4, 1] });

    return (
      <View key={era.id}>
        <View style={styles.eraRow}>
          {/* Timeline dot */}
          <Animated.View
            style={[
              styles.timelineDot,
              {
                backgroundColor: isViewed ? era.color : 'transparent',
                borderColor: era.color,
                borderWidth: isViewed ? 0 : 2,
                transform: [{ scale: dotScale }],
              },
            ]}
          >
            {isViewed && <MaterialIcons name="check" size={6} color="#FFF" />}
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              styles.cardOuter,
              { opacity: cardOpacity, transform: [{ translateX: cardTranslateX }] },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openSheet(era)}
              style={[styles.cardShadow, { shadowColor: era.color }]}
            >
              <LinearGradient
                colors={era.gradient || [era.color, era.color + 'BB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1.1, y: 1 }}
                style={styles.card}
              >
                {/* Dark scrim at bottom for text readability */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.35)']}
                  style={styles.cardScrim}
                />

                {/* Sticker */}
                <Image
                  source={{ uri: era.imageUrl }}
                  style={styles.cardSticker}
                  resizeMode="contain"
                />

                {/* Viewed badge */}
                {isViewed && (
                  <View style={styles.viewedBadge}>
                    <MaterialIcons name="check" size={12} color="#FFF" />
                  </View>
                )}

                {/* Text content pinned to bottom-left */}
                <View style={styles.cardTextArea}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {era.title}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {era.subtitle}
                  </Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>
                      {era.stories?.length || 0} stories
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Connector between cards */}
        {index < timelineData.length - 1 && (
          <View style={styles.connectorWrap}>
            <View style={[styles.connectorLine, { backgroundColor: theme.primary + '20' }]} />
          </View>
        )}
      </View>
    );
  };

  // Story card inside the bottom sheet
  const renderStoryCard = (story, index, eraColor) => (
    <View
      key={index}
      style={[
        styles.storyCard,
        {
          backgroundColor: isDark ? eraColor + '15' : eraColor + '0C',
          borderColor: isDark ? eraColor + '30' : eraColor + '22',
        },
      ]}
    >
      {/* Story number indicator */}
      <View style={[styles.storyNumber, { backgroundColor: eraColor + '25' }]}>
        <Text style={[styles.storyNumberText, { color: eraColor }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>

      <Text style={[styles.storyTitle, { color: theme.text }]}>{story.title}</Text>

      <View style={styles.storyMeta}>
        <View style={styles.storyMetaRow}>
          <Text style={[styles.storyLabel, { color: theme.textSecondary }]}>When</Text>
          <Text style={[styles.storyValue, { color: theme.text }]}>{story.when}</Text>
        </View>
        <View style={styles.storyMetaRow}>
          <Text style={[styles.storyLabel, { color: theme.textSecondary }]}>Bible Story</Text>
          <Text style={[styles.storyValue, { color: theme.text, fontWeight: '600' }]}>
            {story.bibleStory}
          </Text>
        </View>
        <View style={styles.storyMetaRow}>
          <Text style={[styles.storyLabel, { color: theme.textSecondary }]}>Characters</Text>
          <Text style={[styles.storyValue, { color: theme.text }]}>{story.characters}</Text>
        </View>
      </View>

      <Text style={[styles.storyText, { color: theme.text + 'DD' }]}>{story.story}</Text>
    </View>
  );

  // Bottom sheet
  const renderBottomSheet = () => {
    if (!selectedEra) return null;

    return (
      <>
        {/* Overlay */}
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents={selectedEra ? 'auto' : 'none'}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSheet} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: 0,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          {/* Drag handle area — pull down to dismiss */}
          <View {...sheetPanResponder.panHandlers} style={styles.sheetHandleWrap}>
            <View style={[styles.sheetHandle, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)',
            }]} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.sheetScroll}
          >
            {/* Gradient header with sticker */}
            <LinearGradient
              colors={selectedEra.gradient || [selectedEra.color, selectedEra.color + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sheetHero}
            >
              <Image
                source={{ uri: selectedEra.imageUrl }}
                style={styles.sheetSticker}
                resizeMode="contain"
              />
              <Text style={styles.sheetTitle}>{selectedEra.title}</Text>
              <Text style={styles.sheetSubtitle}>{selectedEra.subtitle}</Text>
            </LinearGradient>

            {/* Description */}
            <View style={styles.sheetDescWrap}>
              <Text style={[styles.sheetDesc, { color: theme.text }]}>
                {selectedEra.description}
              </Text>
            </View>

            {/* Divider */}
            <View style={[styles.divider, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]} />

            {/* Stories heading */}
            <View style={styles.storiesHeading}>
              <Text style={[styles.storiesHeadingText, { color: theme.text }]}>
                Stories
              </Text>
              <Text style={[styles.storiesHeadingCount, { color: theme.textSecondary }]}>
                {selectedEra.stories?.length || 0}
              </Text>
            </View>

            {/* Story cards */}
            {selectedEra.stories?.map((story, i) =>
              renderStoryCard(story, i, selectedEra.color)
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </>
    );
  };

  // =============================================
  // MAIN RENDER
  // =============================================

  const viewedCount = viewedEras.size;
  const totalEras = timelineData.length;

  const content = (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Loading */}
      <SimplePercentageLoader isVisible={loading} loadingText="Loading Bible timeline..." />

      {/* Error */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error_outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            onPress={refreshTimeline}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main list */}
      {!loading && !error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {/* Header — scrolls with content */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.headerBtn, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios-new" size={20} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: theme.text }]}>Bible Timeline</Text>

            <View style={{ width: 44 }} />
          </View>

          {/* Subtitle + progress */}
          <View style={styles.titleSection}>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Journey through Biblical history
            </Text>

            {/* Progress */}
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                {viewedCount} of {totalEras}
              </Text>
            </View>
          </View>

          {/* Timeline rail (absolute) sits inside this container */}
          <View style={styles.timelineWrap}>
            {/* Rail */}
            <View style={[styles.rail, { backgroundColor: theme.primary + '18' }]} />

            {/* Era cards */}
            {timelineData.map((era, index) => renderEraCard(era, index))}
          </View>
        </ScrollView>
      )}

      {/* Bottom Sheet */}
      {renderBottomSheet()}
    </View>
  );

  if (asScreen) return content;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
      {content}
    </Modal>
  );
};

// =============================================
// STYLES
// =============================================

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },

  // ---- Header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ---- Title section ----
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 4,
    letterSpacing: 0.1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ---- Timeline ----
  timelineWrap: {
    position: 'relative',
    paddingTop: 20,
  },
  rail: {
    position: 'absolute',
    top: 20,
    bottom: 0,
    left: RAIL_LEFT,
    width: 1.5,
    borderRadius: 1,
  },

  // ---- Era row ----
  eraRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    position: 'absolute',
    left: RAIL_LEFT - DOT_SIZE / 2 + 0.75,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOuter: {
    flex: 1,
    marginLeft: CARD_LEFT,
    marginRight: CARD_RIGHT,
  },
  cardShadow: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  cardSticker: {
    position: 'absolute',
    right: 8,
    top: (CARD_HEIGHT - STICKER_SIZE) / 2 - 8,
    width: STICKER_SIZE,
    height: STICKER_SIZE,
    opacity: 0.95,
  },
  viewedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextArea: {
    padding: 18,
    paddingTop: 0,
    maxWidth: '68%',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  countPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 8,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ---- Connector ----
  connectorWrap: {
    height: CARD_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: RAIL_LEFT,
  },
  connectorLine: {
    width: 1.5,
    flex: 1,
    borderRadius: 1,
  },

  // ---- Bottom Sheet ----
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  sheet: {
    position: 'absolute',
    top: height * 0.08,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 201,
    overflow: 'hidden',
  },
  sheetHandleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  sheetScroll: {
    paddingBottom: 20,
  },
  sheetHero: {
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 24,
    marginTop: 8,
    overflow: 'hidden',
  },
  sheetSticker: {
    width: 110,
    height: 110,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sheetDescWrap: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sheetDesc: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  storiesHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  storiesHeadingText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  storiesHeadingCount: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ---- Story Card ----
  storyCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  storyNumber: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 10,
  },
  storyNumberText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  storyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  storyMeta: {
    marginBottom: 12,
  },
  storyMetaRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 75,
    marginRight: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storyValue: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  storyText: {
    fontSize: 14,
    lineHeight: 22,
  },

  // ---- Error ----
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BibleTimeline;
