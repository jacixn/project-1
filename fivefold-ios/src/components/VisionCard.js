import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
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
import {
  getActiveVisions,
  getProgress,
  getTimeRemaining,
} from '../services/visionService';

const MAX_VISIBLE = 3;

const VisionCard = ({
  visions,
  onPress,
  onSetup,
  liquidGlassEnabled,
  textColor,
  textSecondaryColor,
  textOutlineStyle = {},
  isBiblelyMainWallpaper,
}) => {
  const { theme, isDark } = useTheme();
  const active = getActiveVisions(visions || []);
  const visibleGoals = active.slice(0, MAX_VISIBLE);
  const remaining = active.length - MAX_VISIBLE;

  const userPrefersBlur =
    global.liquidGlassUserPreference === false ||
    liquidGlassEnabled === false;

  const useGlass = isLiquidGlassSupported && !userPrefersBlur;

  const cardContent = active.length === 0 ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onSetup} style={{ flex: 1 }}>
      <View style={styles.emptyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor, ...textOutlineStyle }]}>
            What's your vision?
          </Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Set goals for your future — where do you see yourself?
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textSecondaryColor} />
      </View>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { hapticFeedback.light(); onPress?.(); }}
      style={{ flex: 1 }}
    >
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, { color: textColor, ...textOutlineStyle }]}>
          Vision
        </Text>
        <View style={{ flex: 1 }} />
        <View style={[styles.pillButton, { backgroundColor: theme.primary }]}>
          <Text style={styles.pillText}>
            {active.length} goal{active.length !== 1 ? 's' : ''}
          </Text>
          <MaterialIcons name="arrow-forward" size={16} color="#fff" />
        </View>
      </View>

      {visibleGoals.map((vision) => {
        const progress = getProgress(vision);
        return (
          <View key={vision.id} style={styles.goalRow}>
            <Text
              style={[styles.goalTitle, { color: textColor, ...textOutlineStyle }]}
              numberOfLines={1}
            >
              {vision.title}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(progress > 0 ? 1 : 0, Math.round(progress * 100))}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressPct, { color: theme.primary }]}>
                {progress > 0 ? Math.max(1, Math.round(progress * 100)) : 0}%
              </Text>
              <Text style={[styles.timeLeft, { color: textSecondaryColor }]}>
                {getTimeRemaining(vision)}
              </Text>
            </View>
          </View>
        );
      })}

      {remaining > 0 && (
        <Text style={[styles.moreText, { color: textSecondaryColor }]}>
          +{remaining} more goal{remaining !== 1 ? 's' : ''}
        </Text>
      )}
    </TouchableOpacity>
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
  goalRow: {
    marginBottom: 14,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeLeft: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
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
});

export default VisionCard;
