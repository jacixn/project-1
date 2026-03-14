import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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

const MAX_VISIBLE = 3;

const HabitsCard = ({
  habits,
  onPress,
  onCheckIn,
  liquidGlassEnabled,
  textColor,
  textSecondaryColor,
  textOutlineStyle = {},
}) => {
  const { theme, isDark } = useTheme();
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
        const checked = isCheckedInToday(habit);
        return (
          <BlurView
            key={habit.id}
            intensity={18}
            tint={isDark ? 'dark' : 'light'}
            style={styles.habitRow}
          >
            <TouchableOpacity
              onPress={() => {
                if (!checked) {
                  hapticFeedback.success();
                  onCheckIn?.(habit);
                }
              }}
              disabled={checked}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.miniCheckBtn,
                checked
                  ? { backgroundColor: (habit.color || '#4CAF50') + '20' }
                  : { backgroundColor: habit.color || '#4CAF50' },
              ]}
            >
              <MaterialIcons
                name={checked ? 'check-circle' : 'check'}
                size={16}
                color={checked ? habit.color || '#4CAF50' : '#fff'}
              />
            </TouchableOpacity>
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
          </BlurView>
        );
      })}

      {remaining > 0 && (
        <Text style={[styles.moreText, { color: textSecondaryColor }]}>
          +{remaining} more habit{remaining !== 1 ? 's' : ''}
        </Text>
      )}
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
});

export default HabitsCard;
