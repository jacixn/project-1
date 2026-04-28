import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { isCheckedInToday } from '../services/habitsService';

const AnimatedCheck = ({ done, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  const animatingRef = useRef(false);

  const handlePress = useCallback(() => {
    if (done || animatingRef.current) return;
    animatingRef.current = true;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.15, duration: 100, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1.25, tension: 300, friction: 6, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(bgScale, { toValue: 1.6, duration: 250, useNativeDriver: true }),
        Animated.timing(bgScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => { animatingRef.current = false; });

    onPress?.();
  }, [done, onPress, scale, rotate, bgScale]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={done}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
      style={styles.checkOuter}
    >
      <Animated.View style={[
        styles.checkPulse,
        { backgroundColor: done ? '#4CAF5020' : '#FFFFFF20', transform: [{ scale: bgScale }] },
      ]} />
      <Animated.View style={{ transform: [{ scale }, { rotate: spin }] }}>
        <View style={[styles.miniCheckBtn, { backgroundColor: done ? '#4CAF5020' : '#FFFFFF20' }]}>
          <MaterialIcons name="check-circle" size={28} color={done ? '#4CAF50' : '#FFFFFF'} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const MAX_VISIBLE = 3;

const HabitsCard = ({
  habits,
  onPress,
  onCheckIn,
  onPointsEarned,
  liquidGlassEnabled,
  textColor,
  textSecondaryColor,
  textOutlineStyle = {},
}) => {
  const { theme, isDark } = useTheme();
  const [pendingIds, setPendingIds] = useState(new Set());
  useEffect(() => { setPendingIds(new Set()); }, [habits]);
  const [floatingPoints, setFloatingPoints] = useState([]);
  const floatingIdRef = useRef(0);

  const showFloatingPoints = useCallback((points, color) => {
    const id = ++floatingIdRef.current;
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const scale = new Animated.Value(0.5);
    setFloatingPoints(prev => [...prev, { id, points, color, opacity, translateY, scale }]);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 1200, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.2, tension: 200, friction: 8, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start(() => setFloatingPoints(prev => prev.filter(f => f.id !== id)));
  }, []);

  const visibleHabits = (habits || []).slice(0, MAX_VISIBLE);
  const remaining = (habits || []).length - MAX_VISIBLE;
  const totalActiveStreak = (habits || []).reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);

  const userPrefersBlur =
    global.liquidGlassUserPreference === false ||
    liquidGlassEnabled === false;

  const useGlass = isLiquidGlassSupported && !userPrefersBlur;

  const cardContent = (habits || []).length === 0 ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ flex: 1 }}>
      <View style={styles.emptyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor, ...textOutlineStyle }]}>
            Start a Habit
          </Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Track your progress daily — build streaks and stay consistent
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textSecondaryColor} />
      </View>
    </TouchableOpacity>
  ) : (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="local-fire-department" size={20} color="#FF6B35" />
        <Text style={[styles.sectionLabel, { color: textColor, ...textOutlineStyle, marginLeft: 6 }]}>
          Habits
        </Text>
        <View style={{ flex: 1 }} />
        {totalActiveStreak > 0 && (
          <View style={styles.streakBadge}>
            <MaterialIcons name="local-fire-department" size={12} color="#FF6B35" />
            <Text style={styles.streakBadgeText}>{totalActiveStreak}</Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { hapticFeedback.light(); onPress?.(); }}
          style={[styles.pillButton, { backgroundColor: theme.primary, marginLeft: 8 }]}
        >
          <Text style={styles.pillText}>
            {habits.length} habit{habits.length !== 1 ? 's' : ''}
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Habit Rows */}
      {visibleHabits.map((habit) => {
        const done = isCheckedInToday(habit) || pendingIds.has(habit.id);
        return (
          <View
            key={habit.id}
            style={[
              styles.habitRow,
              {
                backgroundColor: `${theme.primary}24`,
                borderWidth: 0.8,
                borderColor: `${theme.primary}43`,
              },
            ]}
          >
            <AnimatedCheck
              done={done}
              onPress={() => {
                setPendingIds(prev => new Set(prev).add(habit.id));
                hapticFeedback.success();
                const pts = 15 + Math.floor(Math.random() * 16);
                showFloatingPoints(pts, habit.color || '#4CAF50');
                onPointsEarned?.(pts);
                onCheckIn?.(habit);
              }}
            />
            <View style={{ flex: 1 }} />
            <View style={[styles.habitIcon, { backgroundColor: (habit.color || '#4CAF50') + '20' }]}>
              <MaterialIcons name={habit.icon || 'flag'} size={16} color={habit.color || '#4CAF50'} />
            </View>
            <View style={{ marginLeft: 10, alignItems: 'flex-end' }}>
              <Text style={[styles.habitName, { color: textColor, ...textOutlineStyle }]} numberOfLines={1}>
                {habit.name}
              </Text>
              <View style={styles.miniStreakRow}>
                <MaterialIcons name="local-fire-department" size={11} color="#FF6B35" />
                <Text style={[styles.miniStreakText, { color: textSecondaryColor }]}>
                  Day {habit.currentStreak || 0}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {remaining > 0 && (
        <Text style={[styles.moreText, { color: textSecondaryColor }]}>
          +{remaining} more habit{remaining !== 1 ? 's' : ''}
        </Text>
      )}
      {floatingPoints.map(fp => (
        <Animated.Text
          key={fp.id}
          pointerEvents="none"
          style={[styles.floatingPoints, {
            color: fp.color,
            opacity: fp.opacity,
            transform: [{ translateY: fp.translateY }, { scale: fp.scale }],
          }]}
        >
          +{fp.points} pts
        </Animated.Text>
      ))}
    </View>
  );

  if (useGlass) {
    return (
      <LiquidGlassView
        interactive
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={styles.liquidCard}
      >
        {cardContent}
      </LiquidGlassView>
    );
  }

  return (
    <BlurView
      intensity={20}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.05)'
            : `${theme.primary}15`,
        },
      ]}
    >
      {cardContent}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  liquidCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  habitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  miniStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  miniStreakText: {
    fontSize: 11,
    fontWeight: '500',
  },
  checkOuter: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  miniCheckBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  floatingPoints: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default HabitsCard;
