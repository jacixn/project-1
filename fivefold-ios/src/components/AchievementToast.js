import React, { useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Map achievement IDs to customisation unlocks ─────────────────────
const UNLOCK_MAP = {
  // Streak animations
  app_streak_15: { type: 'Streak Animation', name: 'Inferno', icon: 'local-fire-department', color: '#FF6B00' },
  chars_5:       { type: 'Streak Animation', name: 'Red Car', icon: 'directions-car', color: '#E53935' },
  read_25:       { type: 'Streak Animation', name: 'Bright Idea', icon: 'lightbulb', color: '#FFC107' },
  tasks_25:      { type: 'Streak Animation', name: 'Among Us', icon: 'smart-toy', color: '#4CAF50' },
  saved_25:      { type: 'Streak Animation', name: 'Lightning', icon: 'bolt', color: '#7C4DFF' },
  // Themes
  read_50:       { type: 'Theme', name: 'Blush Bloom', icon: 'palette', color: '#EC407A' },
  // app_streak_15 already mapped above — will be merged
  prayers_5:     { type: 'Theme', name: 'Sailor Moon', icon: 'palette', color: '#AB47BC' },
  saved_5:       { type: 'Badge & Theme', name: 'Blue Tick + Biblely Light', icon: 'verified', color: '#1DA1F2' },
  tasks_10:      { type: 'Theme', name: 'Cresvia', icon: 'palette', color: '#7C4DFF' },
  audio_5:       { type: 'Theme', name: 'Spiderman', icon: 'palette', color: '#EF5350' },
  saved_10:      { type: 'Theme', name: 'Biblely Classic', icon: 'palette', color: '#FFA726' },
  // Badge
  app_streak_30: { type: 'Badge', name: 'Biblely Badge', icon: 'workspace-premium', color: '#F59E0B' },
};

// Build a multi-unlock map for achievements that unlock more than one thing
const MULTI_UNLOCK_MAP = {};
// app_streak_15 unlocks both Inferno animation AND Eterna theme
MULTI_UNLOCK_MAP['app_streak_15'] = [
  { type: 'Streak Animation', name: 'Inferno', icon: 'local-fire-department', color: '#FF6B00' },
  { type: 'Theme', name: 'Eterna', icon: 'palette', color: '#FF6B00' },
];
MULTI_UNLOCK_MAP['saved_5'] = [
  { type: 'Badge', name: 'Blue Tick', icon: 'verified', color: '#1DA1F2' },
  { type: 'Theme', name: 'Biblely Light', icon: 'palette', color: '#42A5F5' },
];

function getUnlocksForAchievement(achievementId) {
  if (MULTI_UNLOCK_MAP[achievementId]) return MULTI_UNLOCK_MAP[achievementId];
  if (UNLOCK_MAP[achievementId]) return [UNLOCK_MAP[achievementId]];
  return [];
}

const AchievementToast = forwardRef((props, ref) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(null);
  const queueRef = useRef([]);
  const isShowingRef = useRef(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.6)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;
  const unlockSlide = useRef(new Animated.Value(30)).current;
  const unlockFade = useRef(new Animated.Value(0)).current;

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      return;
    }

    isShowingRef.current = true;
    const next = queueRef.current.shift();
    setCurrent(next);
    setVisible(true);

    // Reset animations
    backdropOpacity.setValue(0);
    cardScale.setValue(0.6);
    cardOpacity.setValue(0);
    iconPulse.setValue(1);
    shimmerAnim.setValue(0);
    ringScale.setValue(0);
    ringOpacity.setValue(1);
    unlockSlide.setValue(30);
    unlockFade.setValue(0);

    hapticFeedback.achievement();

    // Entrance
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      // Ring burst
      Animated.parallel([
        Animated.timing(ringScale, { toValue: 2.5, duration: 600, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();

      // Icon pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(iconPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // Shimmer
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();

      // Unlock items slide in
      if (next.unlocks && next.unlocks.length > 0) {
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(unlockSlide, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
            Animated.timing(unlockFade, { toValue: 1, duration: 350, useNativeDriver: true }),
          ]).start();
        }, 400);
      }
    });
  }, []);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setCurrent(null);
      // Show next in queue after brief pause
      setTimeout(() => showNext(), 300);
    });
  }, [showNext]);

  useImperativeHandle(ref, () => ({
    show: (title, points, achievementId, icon) => {
      const unlocks = getUnlocksForAchievement(achievementId);
      queueRef.current.push({ title, points, achievementId, icon, unlocks });
      if (!isShowingRef.current) {
        showNext();
      }
    }
  }));

  if (!visible || !current) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SW * 1.5, SW * 1.5],
  });

  const unlocks = current.unlocks || [];
  const hasUnlocks = unlocks.length > 0;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[st.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={st.backdropTouch} activeOpacity={1} onPress={dismiss}>
          <Animated.View
            style={[st.card, {
              backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            }]}
          >
            {/* Gradient top accent */}
            <LinearGradient
              colors={['#FFD700', '#FF8C00', '#FF6B00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.topAccent}
            />

            {/* Shimmer overlay */}
            <Animated.View style={[st.shimmer, { transform: [{ translateX: shimmerTranslate }] }]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,215,0,0.08)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* Trophy icon with ring burst */}
            <View style={st.iconArea}>
              {/* Ring burst */}
              <Animated.View style={[st.ring, {
                borderColor: '#FFD700',
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              }]} />

              <Animated.View style={[st.iconCircle, { transform: [{ scale: iconPulse }] }]}>
                <LinearGradient colors={['#FFD700', '#FF8C00']} style={st.iconGrad}>
                  <MaterialIcons name="emoji-events" size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Title area */}
            <Text style={[st.label, { color: '#FFD700' }]}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={[st.title, { color: isDark ? '#fff' : '#111' }]}>{current.title}</Text>

            {/* Points pill */}
            <View style={st.pointsRow}>
              <LinearGradient colors={['#FFD700', '#FF8C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.pointsPill}>
                <MaterialIcons name="star" size={16} color="#fff" />
                <Text style={st.pointsText}>+{(current.points || 0).toLocaleString()} PTS</Text>
              </LinearGradient>
            </View>

            {/* Customisation unlocks */}
            {hasUnlocks && (
              <Animated.View style={[st.unlocksArea, {
                transform: [{ translateY: unlockSlide }],
                opacity: unlockFade,
              }]}>
                <View style={[st.unlockDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialIcons name="lock-open" size={14} color="#4CAF50" />
                  <Text style={[st.unlockLabel, { color: '#4CAF50' }]}>NEW UNLOCK{unlocks.length > 1 ? 'S' : ''}</Text>
                </View>

                {unlocks.map((u, i) => (
                  <View key={i} style={[st.unlockRow, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  }]}>
                    <View style={[st.unlockIcon, { backgroundColor: u.color + '20' }]}>
                      <MaterialIcons name={u.icon} size={18} color={u.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[st.unlockName, { color: isDark ? '#fff' : '#111' }]}>{u.name}</Text>
                      <Text style={[st.unlockType, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>{u.type} unlocked</Text>
                    </View>
                    <View style={[st.unlockCheckBg, { backgroundColor: u.color }]}>
                      <MaterialIcons name="check" size={12} color="#fff" />
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            {/* Dismiss hint */}
            <Text style={[st.dismissHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }]}>
              Tap anywhere to dismiss
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
});

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: SW * 0.85,
    borderRadius: 28,
    alignItems: 'center',
    paddingBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 24 },
    }),
  },
  topAccent: {
    width: '100%',
    height: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    zIndex: 1,
  },
  iconArea: {
    marginTop: 32,
    marginBottom: 16,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  iconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginHorizontal: 24,
    letterSpacing: -0.5,
  },
  pointsRow: {
    marginTop: 14,
    marginBottom: 4,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  pointsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  unlocksArea: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  unlockDivider: {
    height: 1,
    marginBottom: 14,
    marginHorizontal: 10,
  },
  unlockLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginLeft: 6,
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  unlockIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockName: {
    fontSize: 15,
    fontWeight: '700',
  },
  unlockType: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  unlockCheckBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 16,
  },
});

export default AchievementToast;
