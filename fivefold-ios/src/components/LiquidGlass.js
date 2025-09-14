import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
// Note: Using custom implementation instead of @callstack/liquid-glass for Expo compatibility
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Main Liquid Glass Card Component
export const LiquidGlassCard = ({ 
  children, 
  style, 
  intensity = 80, 
  tint = 'default',
  morphable = true,
  glowEffect = true,
  ...props 
}) => {
  const { theme, isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle breathing animation
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    breathingAnimation.start();

    return () => breathingAnimation.stop();
  }, []);

  const animatedOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0.9],
  });

  const animatedScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  return (
    <TouchableOpacity
      activeOpacity={morphable ? 0.8 : 1}
      style={[styles.liquidContainer, style]}
      {...props}
    >
      <Animated.View
        style={[
          styles.glassCard,
          {
            opacity: animatedOpacity,
            transform: [{ scale: Animated.multiply(scaleValue, animatedScale) }],
          },
        ]}
      >
        <BlurView
          intensity={intensity}
          tint={isDark ? 'dark' : tint}
          style={styles.blurContainer}
        >
          {glowEffect && (
            <LinearGradient
              colors={[
                isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)',
                'transparent',
                isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
              ]}
              style={styles.glowGradient}
            />
          )}
          <View style={styles.content}>
            {children}
          </View>
        </BlurView>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Liquid Glass Bible Verse Card
export const LiquidVerseCard = ({ verse, onPress, style, ...props }) => {
  const { theme, isDark } = useTheme();
  const pressAnimation = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressAnimation, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: pressAnimation }] },
        style,
      ]}
    >
      <LiquidGlassCard
        morphable={true}
        intensity={90}
        glowEffect={true}
        style={styles.verseCard}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
        onPress={onPress}
        {...props}
      >
        <View style={styles.verseContent}>
          <Text style={[styles.verseText, { color: theme.text }]}>
            "{verse.text}"
          </Text>
          <Text style={[styles.verseReference, { color: theme.textSecondary }]}>
            — {verse.reference}
          </Text>
          {verse.category && (
            <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.categoryText, { color: theme.primary }]}>
                {verse.category}
              </Text>
            </View>
          )}
        </View>
      </LiquidGlassCard>
    </Animated.View>
  );
};

// Liquid Glass Prayer Card
export const LiquidPrayerCard = ({ prayer, onPress, style, ...props }) => {
  const { theme, isDark } = useTheme();
  const floatAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );
    floating.start();

    return () => floating.stop();
  }, []);

  const translateY = floatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <Animated.View
      style={[
        { transform: [{ translateY }] },
        style,
      ]}
    >
      <LiquidGlassCard
        morphable={true}
        intensity={85}
        tint="light"
        style={styles.prayerCard}
        onPress={onPress}
        {...props}
      >
        <View style={styles.prayerContent}>
          <View style={[styles.prayerIcon, { backgroundColor: theme.primary + '30' }]}>
            <MaterialIcons name="favorite" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.prayerTitle, { color: theme.text }]}>
            {prayer.title}
          </Text>
          <Text style={[styles.prayerTime, { color: theme.textSecondary }]}>
            {prayer.time}
          </Text>
          <View style={[styles.prayerStatus, { 
            backgroundColor: prayer.completed ? theme.success + '20' : theme.warning + '20' 
          }]}>
            <Text style={[styles.statusText, { 
              color: prayer.completed ? theme.success : theme.warning 
            }]}>
              {prayer.completed ? 'Completed' : 'Pending'}
            </Text>
          </View>
        </View>
      </LiquidGlassCard>
    </Animated.View>
  );
};

// Liquid Glass Navigation Header
export const LiquidGlassHeader = ({ title, onBack, style, ...props }) => {
  const { theme, isDark } = useTheme();

  return (
    <LiquidGlassCard
      morphable={false}
      intensity={100}
      tint={isDark ? 'dark' : 'light'}
      style={[styles.headerCard, style]}
      {...props}
    >
      <View style={styles.headerContent}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
    </LiquidGlassCard>
  );
};

// Liquid Glass Floating Action Button
export const LiquidGlassFAB = ({ icon, onPress, style, ...props }) => {
  const { theme, isDark } = useTheme();
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        { transform: [{ scale: pulseAnimation }] },
        style,
      ]}
    >
      <LiquidGlassCard
        morphable={true}
        intensity={95}
        style={styles.fab}
        onPress={onPress}
        {...props}
      >
        <MaterialIcons name={icon} size={28} color={theme.primary} />
      </LiquidGlassCard>
    </Animated.View>
  );
};

// Liquid Glass Modal Container
export const LiquidGlassModal = ({ children, visible, onClose, style, ...props }) => {
  const { theme, isDark } = useTheme();
  const modalAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const modalOpacity = modalAnimation;
  const modalScale = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.modalOverlay,
        { opacity: modalOpacity },
      ]}
    >
      <Animated.View
        style={[
          { transform: [{ scale: modalScale }] },
        ]}
      >
        <LiquidGlassCard
          morphable={false}
          intensity={100}
          style={[styles.modalCard, style]}
          {...props}
        >
          {children}
        </LiquidGlassCard>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  liquidContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  blurContainer: {
    flex: 1,
    borderRadius: 20,
  },
  glowGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // Verse Card Styles
  verseCard: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  verseContent: {
    alignItems: 'center',
  },
  verseText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  // Prayer Card Styles
  prayerCard: {
    marginVertical: 6,
    marginHorizontal: 16,
  },
  prayerContent: {
    alignItems: 'center',
  },
  prayerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  prayerTime: {
    fontSize: 14,
    marginBottom: 8,
  },
  prayerStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Header Styles
  headerCard: {
    marginHorizontal: 0,
    borderRadius: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  
  // FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    margin: 20,
  },
});

export default {
  LiquidGlassCard,
  LiquidVerseCard,
  LiquidPrayerCard,
  LiquidGlassHeader,
  LiquidGlassFAB,
  LiquidGlassModal,
};
