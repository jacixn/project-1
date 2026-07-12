/**
 * MuscleSelector — pick the exact muscles a custom exercise trains.
 *
 * Chips, not a tappable body, because the anatomy SVG has a single "chest" and
 * a single "deltoids" region: it cannot express upper vs mid vs lower chest, or
 * front vs side vs rear delts. Those distinctions are the whole point.
 *
 * The body map beside the chips is a PREVIEW: it lights up as you choose, so
 * you can see what your Physique will show. Tapping a chip cycles it through
 * none -> primary -> secondary -> none.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import { MUSCLE_GROUPS } from '../data/exerciseMuscleMap';
import { regionsForBodyParts } from '../data/muscleSuggest';
import BodyMap2D from './BodyMap2D';

const PRIMARY_COLOR = '#10B981';   // matches the physique "Consistent" green
const SECONDARY_COLOR = '#F59E0B'; // matches the physique "Moderate" amber

// Preview scores chosen to land in the body map's own colour bands, so what
// you see here is literally what the Physique screen renders.
const PREVIEW_PRIMARY_SCORE = 85;
const PREVIEW_SECONDARY_SCORE = 45;

export const roleOf = (muscleId, muscles) => {
  if (muscles.primary.includes(muscleId)) return 'primary';
  if (muscles.secondary.includes(muscleId)) return 'secondary';
  return 'none';
};

// none -> primary -> secondary -> none
export const cycleMuscle = (muscleId, muscles) => {
  const role = roleOf(muscleId, muscles);
  if (role === 'none') {
    return { primary: [...muscles.primary, muscleId], secondary: muscles.secondary };
  }
  if (role === 'primary') {
    return {
      primary: muscles.primary.filter((m) => m !== muscleId),
      secondary: [...muscles.secondary, muscleId],
    };
  }
  return {
    primary: muscles.primary,
    secondary: muscles.secondary.filter((m) => m !== muscleId),
  };
};

export const previewScores = (muscles) => {
  const scores = {};
  muscles.primary.forEach((id) => { scores[id] = { score: PREVIEW_PRIMARY_SCORE }; });
  muscles.secondary.forEach((id) => { scores[id] = { score: PREVIEW_SECONDARY_SCORE }; });
  return scores;
};

const MuscleSelector = ({ muscles, onChange, suggestedFrom = null, onClearSuggestion, bodyParts = [] }) => {
  const { theme, isDark } = useTheme();

  const scores = useMemo(() => previewScores(muscles), [muscles]);
  const count = muscles.primary.length + muscles.secondary.length;
  // Only the muscles the chosen body parts actually contain
  const regions = useMemo(() => regionsForBodyParts(bodyParts), [bodyParts]);

  const surface = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const toggle = (muscleId) => {
    hapticFeedback.light();
    onChange(cycleMuscle(muscleId, muscles));
    if (onClearSuggestion) onClearSuggestion();
  };

  return (
    <View>
      {/* Live preview */}
      <View style={[styles.previewCard, { backgroundColor: surface, borderColor: border }]}>
        {count === 0 ? (
          <View style={styles.emptyPreview}>
            <MaterialIcons name="touch-app" size={28} color={theme.textTertiary || theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Pick the muscles this exercise trains
            </Text>
          </View>
        ) : (
          <BodyMap2D scores={scores} height={260} />
        )}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: PRIMARY_COLOR }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Primary · {muscles.primary.length}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SECONDARY_COLOR }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Secondary · {muscles.secondary.length}
          </Text>
        </View>
        <Text style={[styles.legendHint, { color: theme.textTertiary || theme.textSecondary }]}>
          Tap to cycle
        </Text>
      </View>

      {suggestedFrom && (
        <View style={[styles.suggestionBanner, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` }]}>
          <MaterialIcons name="auto-fix-high" size={16} color={theme.primary} />
          <Text style={[styles.suggestionText, { color: theme.text }]} numberOfLines={2}>
            Filled in from the name. Adjust anything that looks off.
          </Text>
        </View>
      )}

      {regions.length === 0 && (
        <View style={[styles.suggestionBanner, { backgroundColor: surface, borderColor: border }]}>
          <MaterialIcons name="arrow-upward" size={16} color={theme.textSecondary} />
          <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
            Pick a body part above to choose its muscles.
          </Text>
        </View>
      )}

      {/* Chips grouped by region — only the regions the body parts unlock */}
      {regions.map((region) => (
        <View key={region.id} style={styles.region}>
          <Text style={[styles.regionLabel, { color: theme.textSecondary }]}>
            {region.name.toUpperCase()}
          </Text>
          <View style={styles.chipRow}>
            {region.muscles.map((muscleId) => {
              const role = roleOf(muscleId, muscles);
              const active = role !== 'none';
              const color = role === 'primary' ? PRIMARY_COLOR : SECONDARY_COLOR;
              return (
                <TouchableOpacity
                  key={muscleId}
                  onPress={() => toggle(muscleId)}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? `${color}22` : surface,
                      borderColor: active ? color : border,
                    },
                  ]}
                >
                  {active && (
                    <View style={[styles.chipDot, { backgroundColor: color }]} />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? color : theme.text, fontWeight: active ? '700' : '500' },
                    ]}
                  >
                    {MUSCLE_GROUPS[muscleId].name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  emptyPreview: { height: 260, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14, paddingHorizontal: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, fontWeight: '600' },
  legendHint: { fontSize: 12, marginLeft: 'auto' },

  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  suggestionText: { flex: 1, fontSize: 13, fontWeight: '500' },

  region: { marginBottom: 16 },
  regionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 14 },
});

export default MuscleSelector;
