import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';

const LiquidGlassCard = ({ 
  children, 
  style, 
  interactive = false, 
  effect = "clear",
  spacing = 16,
  fallbackStyle = {},
  ...props 
}) => {
  if (!isLiquidGlassSupported) {
    // Fallback for unsupported devices - maintains current appearance
    return (
      <View 
        style={[
          styles.fallbackCard,
          fallbackStyle, // Custom fallback styling
          { margin: spacing / 2 },
          style
        ]} 
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <LiquidGlassView
      interactive={interactive}
      effect={effect}
      colorScheme="system"
      tintColor="transparent" // Pure glass effect
      style={[
        styles.liquidCard,
        { margin: spacing / 2 },
        style
      ]}
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
};

// Specialized card variants with proper fallbacks
export const LiquidGlassPrayerCard = ({ children, style, ...props }) => (
  <LiquidGlassCard
    interactive={true}
    effect="clear"
    style={[styles.prayerCard, style]}
    fallbackStyle={styles.prayerCardFallback}
    {...props}
  >
    {children}
  </LiquidGlassCard>
);

export const LiquidGlassStatsCard = ({ children, style, ...props }) => (
  <LiquidGlassCard
    interactive={false}
    effect="clear"
    style={[styles.statsCard, style]}
    fallbackStyle={styles.statsCardFallback}
    {...props}
  >
    {children}
  </LiquidGlassCard>
);

export const LiquidGlassProgressCard = ({ children, style, ...props }) => (
  <LiquidGlassCard
    interactive={true}
    effect="regular"
    style={[styles.progressCard, style]}
    fallbackStyle={styles.progressCardFallback}
    {...props}
  >
    {children}
  </LiquidGlassCard>
);

export const LiquidGlassTodoCard = ({ children, style, ...props }) => (
  <LiquidGlassCard
    interactive={true}
    effect="clear"
    style={[styles.todoCard, style]}
    fallbackStyle={styles.todoCardFallback}
    {...props}
  >
    {children}
  </LiquidGlassCard>
);

const styles = StyleSheet.create({
  liquidCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fallbackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Specific fallback styles that match current appearance
  prayerCardFallback: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsCardFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressCardFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todoCardFallback: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  prayerCard: {
    borderRadius: 20,
    minHeight: 120,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  statsCard: {
    borderRadius: 12,
    minHeight: 80,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressCard: {
    borderRadius: 18,
    minHeight: 100,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  todoCard: {
    borderRadius: 14,
    minHeight: 60,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
    elevation: 4,
  },
});

export default LiquidGlassCard;
