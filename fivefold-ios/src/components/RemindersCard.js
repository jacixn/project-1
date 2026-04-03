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
import { getRemindersForDay, formatTime, DAY_SHORT } from '../services/reminderService';

const AnimatedCheck = ({ done, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const bgScale = useRef(new Animated.Value(1)).current;
  const tappedRef = useRef(false);

  useEffect(() => {
    if (done) tappedRef.current = true;
  }, [done]);

  const handlePress = useCallback(() => {
    if (tappedRef.current || done) return;
    tappedRef.current = true;

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
    ]).start();

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
        { backgroundColor: done ? '#4CAF5020' : '#FF3B3020', transform: [{ scale: bgScale }] },
      ]} />
      <Animated.View style={{ transform: [{ scale }, { rotate: spin }] }}>
        <View style={[styles.checkDone, { backgroundColor: done ? '#4CAF5020' : '#FF3B3020' }]}>
          <MaterialIcons name="check-circle" size={28} color={done ? '#4CAF50' : '#FF3B30'} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const MAX_VISIBLE = 3;

const todayDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const RemindersCard = ({
  reminders,
  onPress,
  onComplete,
  onPointsEarned,
  liquidGlassEnabled,
  textColor,
  textSecondaryColor,
  textOutlineStyle = {},
}) => {
  const { theme, isDark } = useTheme();
  const today = new Date().getDay();
  const dateStr = todayDateStr();
  const todayReminders = getRemindersForDay(reminders || [], today, dateStr);
  const visibleReminders = todayReminders.slice(0, MAX_VISIBLE);
  const remaining = todayReminders.length - MAX_VISIBLE;
  const completedCount = todayReminders.filter(r => r.completions?.[dateStr] || pendingIds.has(r.id)).length;

  const [pendingIds, setPendingIds] = useState(new Set());
  useEffect(() => { setPendingIds(new Set()); }, [reminders]);
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

  const userPrefersBlur =
    global.liquidGlassUserPreference === false ||
    liquidGlassEnabled === false;
  const useGlass = isLiquidGlassSupported && !userPrefersBlur;

  const cardContent = todayReminders.length === 0 ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ flex: 1 }}>
      <View style={styles.emptyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor, ...textOutlineStyle }]}>
            Set a Reminder
          </Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Create daily reminders to build better routines
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textSecondaryColor} />
      </View>
    </TouchableOpacity>
  ) : (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="notifications-active" size={20} color={theme.primary} />
        <Text style={[styles.sectionLabel, { color: textColor, ...textOutlineStyle, marginLeft: 6 }]}>
          Reminders
        </Text>
        <View style={{ flex: 1 }} />
        {completedCount > 0 && (
          <View style={[styles.progressBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.progressText, { color: theme.primary }]}>
              {completedCount}/{todayReminders.length}
            </Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => { hapticFeedback.light(); onPress?.(); }}
          style={[styles.pillButton, { backgroundColor: theme.primary, marginLeft: 8 }]}
        >
          <Text style={styles.pillText}>View all</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Reminder Rows */}
      {visibleReminders.map((reminder) => {
        const done = !!reminder.completions?.[dateStr] || pendingIds.has(reminder.id);
        const rColor = reminder.color || '#3B82F6';
        return (
          <BlurView
            key={reminder.id}
            intensity={18}
            tint={isDark ? 'dark' : 'light'}
            style={styles.reminderRow}
          >
            <AnimatedCheck
              done={done}
              onPress={() => {
                setPendingIds(prev => new Set(prev).add(reminder.id));
                hapticFeedback.success();
                const pts = 10 + Math.floor(Math.random() * 11);
                showFloatingPoints(pts, rColor);
                onPointsEarned?.(pts);
                onComplete?.(reminder, dateStr);
              }}
            />
            <View style={{ flex: 1 }} />
            <View style={[styles.iconBubble, { backgroundColor: rColor + '20' }]}>
              <MaterialIcons name={reminder.icon || 'notifications'} size={16} color={rColor} />
            </View>
            <View style={{ marginLeft: 10, alignItems: 'flex-end' }}>
              <Text
                style={[
                  styles.reminderName,
                  { color: textColor, ...textOutlineStyle },
                  done && { textDecorationLine: 'line-through', opacity: 0.5 },
                ]}
                numberOfLines={1}
              >
                {reminder.title}
              </Text>
              <Text style={[styles.reminderTime, { color: textSecondaryColor }]}>
                {formatTime(reminder.time)}
              </Text>
            </View>
          </BlurView>
        );
      })}

      {remaining > 0 && (
        <Text style={[styles.moreText, { color: textSecondaryColor }]}>
          +{remaining} more reminder{remaining !== 1 ? 's' : ''}
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
      <LiquidGlassView interactive effect="clear" colorScheme="system" tintColor="rgba(255, 255, 255, 0.08)" style={styles.liquidCard}>
        {cardContent}
      </LiquidGlassView>
    );
  }

  return (
    <BlurView
      intensity={20}
      tint={isDark ? 'dark' : 'light'}
      style={[styles.card, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : `${theme.primary}15` }]}
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  liquidCard: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  emptyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700' },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  progressText: { fontSize: 12, fontWeight: '700' },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  reminderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  checkDone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderName: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  reminderTime: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  moreText: { fontSize: 12, textAlign: 'center', marginTop: 4 },
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

export default RemindersCard;
