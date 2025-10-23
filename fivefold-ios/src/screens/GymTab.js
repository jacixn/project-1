import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  LiquidGlassView,
  isLiquidGlassSupported,
} from '../utils/liquidGlassSafe';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { GlassCard, GlassHeader } from '../components/GlassEffect';
import { createEntranceAnimation } from '../utils/animations';
import { AnimatedWallpaper } from '../components/AnimatedWallpaper';
import { hapticFeedback } from '../utils/haptics';

const GymTab = () => {
  const { theme, isDark, isBlushTheme, isCresviaTheme, isEternaTheme } = useTheme();
  const { language, t } = useLanguage();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Start entrance animation
    createEntranceAnimation(slideAnim, fadeAnim, scaleAnim, 0, 0).start();
  }, []);

  // Liquid Glass Container
  const LiquidGlassContainer = ({ children, style }) => {
    if (!isLiquidGlassSupported) {
      return (
        <BlurView 
          intensity={18} 
          tint={isDark ? "dark" : "light"} 
          style={[styles.card, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }, style]}
        >
          {children}
        </BlurView>
      );
    }

    return (
      <LiquidGlassView
        interactive={true}
        effect="clear"
        colorScheme="system"
        tintColor="rgba(255, 255, 255, 0.08)"
        style={[styles.liquidGlassCard, style]}
      >
        {children}
      </LiquidGlassView>
    );
  };

  return (
    <AnimatedWallpaper 
      scrollY={scrollY}
      parallaxFactor={0.3}
      blurOnScroll={false}
      fadeOnScroll={false}
      scaleOnScroll={true}
    >
      <View style={[styles.container, { backgroundColor: (isBlushTheme || isCresviaTheme || isEternaTheme) ? 'transparent' : theme.background }]}>
        <StatusBar 
          barStyle={isDark ? "light-content" : "dark-content"} 
          backgroundColor={theme.background}
        />
      
        {/* Fixed Header */}
        <GlassHeader 
          style={[styles.fixedHeader, { 
            backgroundColor: isDark 
              ? 'rgba(255, 255, 255, 0.05)' 
              : `${theme.primary}15`
          }]}
          intensity={15}
          absolute={false}
        >
          <View style={styles.headerContent}>
            {/* Logo positioned on the left */}
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.headerLogo}
              resizeMode="contain"
            />
            
            {/* Centered text content */}
            <View style={styles.headerTextContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Gym & Fitness</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Track your workouts
              </Text>
            </View>
          </View>
        </GlassHeader>

        {/* Main Content */}
        <Animated.ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Welcome Card */}
          <LiquidGlassContainer>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>💪 Workout Stats</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Your fitness journey
            </Text>
            
            <View style={styles.statsRow}>
              <View 
                style={[styles.statItem, { 
                  backgroundColor: `${theme.primary}10`,
                  borderColor: `${theme.primary}15`,
                  borderWidth: 0.8,
                  borderRadius: 16,
                }]}
              >
                <Text style={[styles.statNumber, { color: theme.primary }]}>0</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Workouts
                </Text>
              </View>
              
              <View 
                style={[styles.statItem, { 
                  backgroundColor: `${theme.primary}10`,
                  borderColor: `${theme.primary}15`,
                  borderWidth: 0.8,
                  borderRadius: 16,
                }]}
              >
                <Text style={[styles.statNumber, { color: theme.success }]}>0</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Days Streak
                </Text>
              </View>
              
              <View 
                style={[styles.statItem, { 
                  backgroundColor: `${theme.primary}10`,
                  borderColor: `${theme.primary}15`,
                  borderWidth: 0.8,
                  borderRadius: 16,
                }]}
              >
                <Text style={[styles.statNumber, { color: theme.warning }]}>0</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Minutes
                </Text>
              </View>
            </View>
          </LiquidGlassContainer>

          {/* Coming Soon Card */}
          <LiquidGlassContainer style={styles.comingSoonCard}>
            <View style={styles.comingSoonContent}>
              <MaterialIcons name="fitness-center" size={60} color={theme.textSecondary} />
              <Text style={[styles.comingSoonTitle, { color: theme.text }]}>
                Coming Soon
              </Text>
              <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
                Track your workouts, set goals, and achieve your fitness dreams
              </Text>
            </View>
          </LiquidGlassContainer>
        </Animated.ScrollView>
      </View>
    </AnimatedWallpaper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 65 : 40,
    paddingBottom: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
  },
  headerLogo: {
    width: 32,
    height: 32,
    position: 'absolute',
    left: 20,
  },
  headerTextContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: 0,
  },
  scrollContent: {
    paddingTop: 145,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  liquidGlassCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  comingSoonCard: {
    marginTop: 20,
  },
  comingSoonContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
});

export default GymTab;

