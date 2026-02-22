import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: SW, height: SH } = Dimensions.get('window');

/** Human-readable description of what was done to earn an achievement */
function getAchievementDescription(type, target) {
  if (!type || target == null) return '';
  const t = Number(target) || 0;
  const descriptions = {
    prayersCompleted: () => `Complete ${t} prayer${t !== 1 ? 's' : ''}`,
    savedVerses: () => `Save ${t} verse${t !== 1 ? 's' : ''}`,
    versesShared: () => `Share ${t} verse${t !== 1 ? 's' : ''}`,
    audiosPlayed: () => `Listen to ${t} audio chapter${t !== 1 ? 's' : ''}`,
    charactersRead: () => `Read about ${t} Bible character${t !== 1 ? 's' : ''}`,
    timelineErasViewed: () => `Explore ${t} timeline era${t !== 1 ? 's' : ''}`,
    versesRead: () => `Read ${t} verse${t !== 1 ? 's' : ''}`,
    mapsVisited: () => `Visit ${t} Bible map location${t !== 1 ? 's' : ''}`,
    completedTasks: () => `Complete ${t} task${t !== 1 ? 's' : ''}`,
    lowTierCompleted: () => `Complete ${t} quick task${t !== 1 ? 's' : ''}`,
    midTierCompleted: () => `Complete ${t} medium task${t !== 1 ? 's' : ''}`,
    highTierCompleted: () => `Complete ${t} major task${t !== 1 ? 's' : ''}`,
    appStreak: () => `${t} day${t !== 1 ? 's' : ''} streak`,
    totalPoints: () => `Reach ${t.toLocaleString()} total points`,
    workoutsCompleted: () => `Complete ${t} workout${t !== 1 ? 's' : ''}`,
    gymWeekStreak: () => `${t} week${t !== 1 ? 's' : ''} gym streak`,
    exercisesLogged: () => `Log ${t} exercise${t !== 1 ? 's' : ''}`,
    setsCompleted: () => `Complete ${t} set${t !== 1 ? 's' : ''}`,
    workoutMinutes: () => `${t} minute${t !== 1 ? 's' : ''} of working out`,
  };
  const fn = descriptions[type];
  return fn ? fn() : '';
}

const AchievementToast = forwardRef((props, ref) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [achievements, setAchievements] = useState([]);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  // Per-item animations stored as refs
  const itemAnimsRef = useRef([]);
  // Track pending timeouts so we can cancel them on dismiss
  const pendingTimeoutsRef = useRef([]);
  // Guard against showing while dismiss animation is running
  const isDismissingRef = useRef(false);

  /** Clear all pending stagger timeouts */
  const clearPendingTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach(id => clearTimeout(id));
    pendingTimeoutsRef.current = [];
  }, []);

  const animateIn = useCallback((count) => {
    // Clear any leftover timeouts from previous show
    clearPendingTimeouts();

    // Reset
    backdropOpacity.setValue(0);
    contentScale.setValue(0.85);
    contentOpacity.setValue(0);
    headerSlide.setValue(-20);
    headerFade.setValue(0);

    // Create per-item animated values
    const itemAnims = [];
    for (let i = 0; i < count; i++) {
      itemAnims.push({
        translateY: new Animated.Value(30),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.9),
      });
    }
    itemAnimsRef.current = itemAnims;

    hapticFeedback.achievement();

    // Entrance
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(contentScale, { toValue: 1, tension: 65, friction: 9, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      // Header slides in
      Animated.parallel([
        Animated.spring(headerSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        Animated.timing(headerFade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      // Stagger item entrances — store timeout IDs for cleanup
      itemAnims.forEach((anim, i) => {
        const timeoutId = setTimeout(() => {
          Animated.parallel([
            Animated.spring(anim.translateY, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
            Animated.timing(anim.opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(anim.scale, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
          ]).start();
          if (i === 0) hapticFeedback.light();
        }, 150 + i * 100);
        pendingTimeoutsRef.current.push(timeoutId);
      });
    });
  }, [clearPendingTimeouts]);

  const dismiss = useCallback(() => {
    if (isDismissingRef.current) return; // Prevent double-dismiss
    isDismissingRef.current = true;

    // Cancel any pending stagger timeouts
    clearPendingTimeouts();

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 0.9, duration: 200, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setAchievements([]);
      itemAnimsRef.current = [];
      isDismissingRef.current = false;
    });
  }, [clearPendingTimeouts]);

  // Listen for force-dismiss events from other modals.
  // When a parent Modal (e.g. WorkoutModal) needs to dismiss, it emits this
  // event so the AchievementToast hides FIRST — preventing the iOS UIKit
  // deadlock that occurs when two Modals dismiss simultaneously.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('dismissAchievementToast', () => {
      clearPendingTimeouts();
      // Instant hide — no animation — to avoid any overlap with the
      // parent Modal's dismiss transition.
      setVisible(false);
      setAchievements([]);
      itemAnimsRef.current = [];
      isDismissingRef.current = false;
    });
    return () => sub.remove();
  }, [clearPendingTimeouts]);

  useImperativeHandle(ref, () => ({
    // New batch API — show all achievements at once
    showBatch: (achievementList) => {
      if (!achievementList || achievementList.length === 0) return;
      // If currently dismissing, wait for it to finish
      if (isDismissingRef.current) {
        setTimeout(() => {
          setAchievements(achievementList);
          setVisible(true);
          setTimeout(() => animateIn(achievementList.length), 50);
        }, 350);
        return;
      }
      setAchievements(achievementList);
      setVisible(true);
      setTimeout(() => animateIn(achievementList.length), 50);
    },
    // Legacy single-item API — wraps into batch of 1
    show: (title, points, achievementId, icon, target, type) => {
      if (isDismissingRef.current) return; // Ignore during dismiss
      const item = {
        id: achievementId || `legacy_${Date.now()}`,
        title: title || 'Achievement',
        points: points || 0,
        icon: icon || 'emoji-events',
        target,
        type,
      };
      setAchievements(prev => {
        const updated = prev.length > 0 ? [...prev, item] : [item];
        // Only one animateIn call — always with the full list length
        setTimeout(() => animateIn(updated.length), 50);
        return updated;
      });
      setVisible(true);
      // Do NOT call animateIn here — it's called inside setAchievements above
    },
  }), [animateIn]);

  if (!visible || achievements.length === 0) return null;

  const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);
  const isSingle = achievements.length === 1;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.backdrop, { opacity: backdropOpacity }]}>
        {/* Full-screen dismiss target */}
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={st.backdropTouch}>
            {/* Card — stop propagation so inner scrolling doesn't dismiss */}
            <TouchableWithoutFeedback onPress={dismiss}>
              <Animated.View
                style={[
                  st.container,
                  {
                    transform: [{ scale: contentScale }],
                    opacity: contentOpacity,
                  },
                ]}
              >
                {/* Glass card — high blur, low overlay opacity for true frosted glass */}
                  <BlurView
                    intensity={Platform.OS === 'ios' ? (isDark ? 50 : 80) : 50}
                    tint={isDark ? 'dark' : 'light'}
                    style={st.glassCard}
                  >
                  {/* Thin tint overlay — keep it very light so blur shows through */}
                  <View style={[st.glassInner, {
                    backgroundColor: isDark ? 'rgba(15,15,25,0.4)' : 'rgba(255,255,255,0.7)',
                  }]}>

                    {/* Top shimmer accent line */}
                    <LinearGradient
                      colors={['transparent', '#FFD70050', '#FF8C0040', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={st.topLine}
                    />

                    {/* Header */}
                    <Animated.View style={[st.header, {
                      transform: [{ translateY: headerSlide }],
                      opacity: headerFade,
                    }]}>
                      {/* Trophy glow */}
                      <View style={st.trophyContainer}>
                        <View style={[st.trophyGlow, { backgroundColor: '#FFD70015' }]} />
                        <LinearGradient
                          colors={['#FFD700', '#FF8C00']}
                          style={st.trophyCircle}
                        >
                          <MaterialIcons name="emoji-events" size={26} color="#fff" />
                        </LinearGradient>
                      </View>

                      <View style={st.headerText}>
                          <Text style={[st.headerLabel, { color: isDark ? '#FFD700' : '#E69500' }]} numberOfLines={2} adjustsFontSizeToFit>
                            {isSingle ? 'ACHIEVEMENT UNLOCKED' : `${achievements.length} ACHIEVEMENTS UNLOCKED`}
                          </Text>
                        {!isSingle && (
                          <Text style={[st.headerSubtext, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }]}>
                            +{totalPoints.toLocaleString()} points earned
                          </Text>
                        )}
                      </View>
                    </Animated.View>

                    {/* Divider */}
                    <View style={[st.divider, { backgroundColor: isDark ? 'rgba(255,215,0,0.12)' : 'rgba(255,165,0,0.15)' }]} />

                    {/* Achievement list */}
                    <ScrollView
                      style={st.listScroll}
                      contentContainerStyle={st.listContent}
                      showsVerticalScrollIndicator={false}
                      bounces={achievements.length > 3}
                      keyboardShouldPersistTaps="handled"
                    >
                      {achievements.map((achievement, index) => {
                        const itemAnim = itemAnimsRef.current[index] || {
                          translateY: new Animated.Value(0),
                          opacity: new Animated.Value(1),
                          scale: new Animated.Value(1),
                        };
                        const description = getAchievementDescription(achievement.type, achievement.target);

                        return (
                          <Animated.View
                            key={achievement.id || `achievement_${index}`}
                            style={[
                              st.achievementRow,
                              {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                borderColor: isDark ? 'rgba(255,215,0,0.15)' : 'rgba(230,149,0,0.15)',
                                transform: [
                                  { translateY: itemAnim.translateY },
                                  { scale: itemAnim.scale },
                                ],
                                opacity: itemAnim.opacity,
                              },
                            ]}
                          >
                            {/* Icon */}
                            <LinearGradient
                              colors={isDark ? ['#FFD70030', '#FF8C0015'] : ['#FFD70080', '#FF8C0040']}
                              style={st.achievementIcon}
                            >
                              <MaterialIcons
                                name={achievement.icon || 'emoji-events'}
                                size={24}
                                color={isDark ? '#FFD700' : '#E69500'}
                              />
                            </LinearGradient>

                            {/* Info */}
                            <View style={st.achievementInfo}>
                              <Text
                                style={[st.achievementTitle, { color: isDark ? '#fff' : '#111' }]}
                                numberOfLines={1}
                              >
                                {achievement.title || 'Achievement'}
                              </Text>
                              {description ? (
                                <Text
                                  style={[st.achievementDesc, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}
                                  numberOfLines={1}
                                >
                                  {description}
                                </Text>
                              ) : null}
                            </View>

                            {/* Points */}
                            <View style={[st.pointsBadge, { backgroundColor: isDark ? 'rgba(255,215,0,0.12)' : 'rgba(255,179,0,0.15)' }]}>
                              <MaterialIcons name="star" size={14} color={isDark ? "#FFD700" : "#E69500"} />
                              <Text style={[st.pointsBadgeText, { color: isDark ? '#FFD700' : '#E69500' }]}>
                                +{(achievement.points || 0).toLocaleString()}
                              </Text>
                            </View>
                          </Animated.View>
                        );
                      })}
                    </ScrollView>

                    {/* Total points bar (only for multiple) */}
                    {!isSingle && (
                      <View style={[st.totalBar, { borderTopColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(255,165,0,0.1)' }]}>
                        <Text style={[st.totalLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                          Total Earned
                        </Text>
                        <LinearGradient
                          colors={['#FFD700', '#FF8C00']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={st.totalPill}
                        >
                          <MaterialIcons name="star" size={14} color="#fff" />
                          <Text style={st.totalPillText}>+{totalPoints.toLocaleString()} PTS</Text>
                        </LinearGradient>
                      </View>
                    )}

                    {/* Single achievement — total points pill */}
                    {isSingle && (
                      <View style={st.singlePointsRow}>
                        <LinearGradient
                          colors={['#FFD700', '#FF8C00']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={st.singlePointsPill}
                        >
                          <MaterialIcons name="star" size={15} color="#fff" />
                          <Text style={st.singlePointsText}>+{(achievements[0]?.points || 0).toLocaleString()} PTS</Text>
                        </LinearGradient>
                      </View>
                    )}

                    {/* Dismiss hint */}
                    <Text style={[st.dismissHint, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }]}>
                      Tap anywhere to dismiss
                    </Text>
                  </View>
                </BlurView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
});

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    width: SW * 0.88,
    maxHeight: SH * 0.65,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  glassInner: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  topLine: {
    height: 2,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  trophyContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  trophyGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  trophyCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    lineHeight: 18,
  },
  headerSubtext: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  listScroll: {
    maxHeight: SH * 0.4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: {
    flex: 1,
    marginLeft: 14,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  achievementDesc: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  pointsBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  totalPillText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  singlePointsRow: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  singlePointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
    marginTop: 14,
  },
  singlePointsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  dismissHint: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingBottom: 16,
    paddingTop: 10,
  },
});

export default AchievementToast;
