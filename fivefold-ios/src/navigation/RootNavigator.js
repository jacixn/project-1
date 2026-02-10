/**
 * Root Navigator
 * 
 * Handles the main navigation flow:
 * 1. Not authenticated → Auth screen
 * 2. Authenticated + new signup → Onboarding
 * 3. Authenticated + returning user → Main app
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Easing } from 'react-native';
import userStorage from '../utils/userStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import AuthScreen from '../screens/AuthScreen';
import FriendsScreen from '../screens/FriendsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import PrayerWallScreen from '../screens/PrayerWallScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ChallengeQuizScreen from '../screens/ChallengeQuizScreen';
import TasksDoneScreen from '../screens/TasksDoneScreen';
import SavedVersesScreen from '../screens/SavedVersesScreen';
import HighlightsScreen from '../screens/HighlightsScreen';
import JournalScreen from '../screens/JournalScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import PhysiqueScreen from '../screens/PhysiqueScreen';
import BodyCompositionScreen from '../screens/BodyCompositionScreen';
import GymHistoryScreen from '../screens/GymHistoryScreen';
import StartWorkoutScreen from '../screens/StartWorkoutScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ScheduleTaskScreen from '../screens/ScheduleTaskScreen';
import TasksOverviewScreen from '../screens/TasksOverviewScreen';
import BibleStudyScreen from '../screens/BibleStudyScreen';
import QuizGamesScreen from '../screens/QuizGamesScreen';
import BibleTimelineScreen from '../screens/BibleTimelineScreen';
import BibleMapsScreen from '../screens/BibleMapsScreen';
import ThematicGuidesScreen from '../screens/ThematicGuidesScreen';
import KeyVersesScreen from '../screens/KeyVersesScreen';
import BibleFastFactsScreen from '../screens/BibleFastFactsScreen';
import AudioLearningScreen from '../screens/AudioLearningScreen';
import BibleReaderScreen from '../screens/BibleReaderScreen';
import FriendChatScreen from '../screens/FriendChatScreen';
import CustomisationScreen from '../screens/CustomisationScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import SimpleOnboarding from '../components/SimpleOnboarding';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
// refreshEmailVerificationStatus import removed - verification handled in onboarding

const Stack = createNativeStackNavigator();

// Premium dark loading screen with step-by-step progress indicators
// Design: 5 rounds of iterative refinement for maximum visual polish
const AnimatedLoadingScreen = () => {
  // Core animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const ring2Rotate = useRef(new Animated.Value(0)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;

  // Step animations — declared individually (hooks rules)
  const s0Text = useRef(new Animated.Value(0)).current;
  const s0Prog = useRef(new Animated.Value(0)).current;
  const s0Check = useRef(new Animated.Value(0)).current;
  const s0Slide = useRef(new Animated.Value(12)).current;
  const s1Text = useRef(new Animated.Value(0)).current;
  const s1Prog = useRef(new Animated.Value(0)).current;
  const s1Check = useRef(new Animated.Value(0)).current;
  const s1Slide = useRef(new Animated.Value(12)).current;
  const s2Text = useRef(new Animated.Value(0)).current;
  const s2Prog = useRef(new Animated.Value(0)).current;
  const s2Check = useRef(new Animated.Value(0)).current;
  const s2Slide = useRef(new Animated.Value(12)).current;

  const stepAnims = [
    { text: s0Text, progress: s0Prog, check: s0Check, slide: s0Slide },
    { text: s1Text, progress: s1Prog, check: s1Check, slide: s1Slide },
    { text: s2Text, progress: s2Prog, check: s2Check, slide: s2Slide },
  ];

  const [done, setDone] = useState([false, false, false]);
  const markDone = (i) => setDone(prev => { const n = [...prev]; n[i] = true; return n; });

  const STEPS = ['Signing you in', 'Loading your content', 'Preparing your experience'];

  useEffect(() => {
    // 1. Background fade in
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // 2. Logo entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 100);

    // Continuous animations (all run on native driver — zero perf cost)
    // Logo breathing glow
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Logo subtle breathing scale
    Animated.loop(Animated.sequence([
      Animated.timing(breatheScale, { toValue: 1.03, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breatheScale, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Logo shimmer sweep
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Decorative rings — slow, elegant rotation
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(ring2Rotate, { toValue: 1, duration: 28000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // 3. Title slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(titleSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    }, 350);

    // 4. Steps area fade in
    setTimeout(() => {
      Animated.timing(stepsOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }, 500);

    // Helper to animate a single step
    const animateStep = (index, delay, duration) => {
      const sa = stepAnims[index];
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(sa.text, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(sa.slide, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
        ]).start();
        Animated.timing(sa.progress, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
          markDone(index);
          Animated.spring(sa.check, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }).start();
        });
      }, delay);
    };

    // 5. Steps — fast and efficient (total ~1.3s for all steps)
    animateStep(0, 550, 400);
    animateStep(1, 1000, 350);
    animateStep(2, 1400, 300);
  }, []);

  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const ringSpin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ring2Spin = ring2Rotate.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
    <View style={loadingStyles.container}>
      {/* Deep dark gradient */}
      <LinearGradient
        colors={['#06060A', '#0D1220', '#0A0E1A', '#06060A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={loadingStyles.bg}
      />

      {/* Ambient light — 3 orbs for depth */}
      <Animated.View style={[loadingStyles.ambientOrb, {
        top: '8%', left: '-20%', width: 320, height: 320,
        backgroundColor: 'rgba(245, 158, 11, 0.02)',
        opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
      }]} />
      <Animated.View style={[loadingStyles.ambientOrb, {
        bottom: '15%', right: '-15%', width: 240, height: 240,
        backgroundColor: 'rgba(99, 102, 241, 0.015)',
        opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] }),
      }]} />
      <Animated.View style={[loadingStyles.ambientOrb, {
        top: '45%', left: '60%', width: 160, height: 160,
        backgroundColor: 'rgba(245, 158, 11, 0.01)',
        opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }),
      }]} />

      <Animated.View style={[loadingStyles.content, { opacity: fadeAnim }]}>
        {/* Logo with ambient glow + decorative rings */}
        <Animated.View style={[loadingStyles.logoContainer, {
          transform: [{ scale: Animated.multiply(logoScale, breatheScale) }],
          opacity: logoOpacity,
        }]}>
          {/* Breathing ambient glow */}
          <Animated.View style={[loadingStyles.logoGlow, {
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.3] }),
            transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) }],
          }]} />
          {/* Outer decorative ring — slow clockwise */}
          <Animated.View style={[loadingStyles.decoRing, loadingStyles.decoRingOuter, {
            transform: [{ rotate: ringSpin }],
          }]} />
          {/* Inner decorative ring — slow counter-clockwise */}
          <Animated.View style={[loadingStyles.decoRing, loadingStyles.decoRingInner, {
            transform: [{ rotate: ring2Spin }],
          }]} />
          {/* Logo glass box */}
          <View style={loadingStyles.logoBox}>
            <Image
              source={require('../../assets/logo.png')}
              style={loadingStyles.logoImg}
              resizeMode="contain"
            />
            {/* Shimmer sweep */}
            <Animated.View style={[loadingStyles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleSlide }], marginBottom: 48 }}>
          <Text style={loadingStyles.title}>Biblely</Text>
        </Animated.View>

        {/* Separator line */}
        <View style={loadingStyles.separator} />

        {/* Loading steps */}
        <Animated.View style={[loadingStyles.stepsArea, { opacity: stepsOpacity }]}>
          {STEPS.map((label, i) => (
            <Animated.View
              key={i}
              style={[
                loadingStyles.stepRow,
                { opacity: stepAnims[i].text, transform: [{ translateY: stepAnims[i].slide }] },
              ]}
            >
              {/* Status indicator */}
              <View style={loadingStyles.indicator}>
                {done[i] ? (
                  <Animated.View style={[loadingStyles.checkCircle, {
                    transform: [{ scale: stepAnims[i].check }],
                  }]}>
                    <Text style={loadingStyles.checkMark}>{'✓'}</Text>
                  </Animated.View>
                ) : (
                  <View style={loadingStyles.pendingRing} />
                )}
              </View>

              {/* Step content */}
              <View style={loadingStyles.stepBody}>
                <Text style={[loadingStyles.stepLabel, done[i] && loadingStyles.stepLabelDone]}>
                  {label}
                </Text>
                {!done[i] && (
                  <View style={loadingStyles.progressTrack}>
                    <Animated.View style={[loadingStyles.progressFill, {
                      width: stepAnims[i].progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    }]}>
                      <LinearGradient
                        colors={['#F59E0B', '#F97316']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={loadingStyles.progressGradient}
                      />
                    </Animated.View>
                  </View>
                )}
              </View>
            </Animated.View>
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80, // Push slightly above center for better visual balance
  },
  // Logo area
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  decoRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  decoRingOuter: {
    width: 150,
    height: 150,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.08)',
    borderStyle: 'dashed',
  },
  decoRingInner: {
    width: 130,
    height: 130,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  logoImg: {
    width: 72,
    height: 72,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ skewX: '-20deg' }],
  },
  // Title
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FAFAFA',
    letterSpacing: 2,
    textShadowColor: 'rgba(245, 158, 11, 0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  // Separator
  separator: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 36,
    borderRadius: 1,
  },
  // Steps
  stepsArea: {
    width: '100%',
    maxWidth: 280,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    minHeight: 30,
  },
  indicator: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: -1,
  },
  pendingRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepBody: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  stepLabelDone: {
    color: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 0,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 2,
  },
});

/**
 * AuthProgressScreen — shows real-time sign-in / sign-up progress
 * with the same dark aesthetic as the cold-launch loading screen.
 */
const AuthProgressScreen = ({ authSteps }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;

  // Per-step progress animations (driven by authSteps.steps[i].done)
  const stepAnims = useRef(
    (authSteps?.steps || []).map(() => ({
      opacity: new Animated.Value(0),
      slide: new Animated.Value(14),
      progress: new Animated.Value(0),
      check: new Animated.Value(0),
    }))
  ).current;

  // Entrance animations
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 100);
    setTimeout(() => {
      Animated.timing(stepsOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }, 300);
  }, []);

  // Animate steps as they appear and complete
  useEffect(() => {
    if (!authSteps?.steps) return;
    authSteps.steps.forEach((step, i) => {
      if (!stepAnims[i]) return;
      const sa = stepAnims[i];
      // Show step when it's current or done
      if (i <= (authSteps.current === -1 ? authSteps.steps.length : authSteps.current)) {
        Animated.parallel([
          Animated.timing(sa.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(sa.slide, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
        ]).start();
      }
      // Animate progress bar
      if (step.done) {
        Animated.timing(sa.progress, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
          Animated.spring(sa.check, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }).start();
        });
      } else if (i === authSteps.current) {
        // Active step: animate to 60% and hold (pulsing)
        Animated.timing(sa.progress, { toValue: 0.6, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      }
    });
  }, [authSteps]);

  const title = authSteps?.type === 'signup' ? 'Creating Account' : 'Signing In';
  const subtitle = authSteps?.type === 'signup'
    ? 'Setting up your new account...'
    : 'Welcome back, loading your data...';

  return (
    <Animated.View style={[authProgStyles.root, { opacity: fadeAnim }]}>
      <LinearGradient colors={['#09090B', '#0F0D15', '#09090B']} style={StyleSheet.absoluteFill} />

      {/* Logo */}
      <Animated.View style={[authProgStyles.logoWrap, {
        opacity: logoOpacity,
        transform: [{ scale: logoScale }],
      }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={authProgStyles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Title */}
      <Text style={authProgStyles.title}>{title}</Text>
      <Text style={authProgStyles.subtitle}>{subtitle}</Text>

      {/* Steps */}
      <Animated.View style={[authProgStyles.stepsArea, { opacity: stepsOpacity }]}>
        {(authSteps?.steps || []).map((step, i) => {
          const sa = stepAnims[i];
          if (!sa) return null;
          return (
            <Animated.View key={i} style={[authProgStyles.stepRow, {
              opacity: sa.opacity,
              transform: [{ translateY: sa.slide }],
            }]}>
              <View style={authProgStyles.indicator}>
                {step.done ? (
                  <Animated.View style={[authProgStyles.checkCircle, {
                    transform: [{ scale: sa.check }],
                  }]}>
                    <Text style={authProgStyles.checkMark}>{'\u2713'}</Text>
                  </Animated.View>
                ) : (
                  <View style={authProgStyles.pendingRing} />
                )}
              </View>
              <View style={authProgStyles.stepBody}>
                <Text style={[authProgStyles.stepLabel, step.done && authProgStyles.stepLabelDone]}>
                  {step.label}
                </Text>
                {!step.done && (
                  <View style={authProgStyles.progressTrack}>
                    <Animated.View style={[authProgStyles.progressFill, {
                      width: sa.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    }]}>
                      <LinearGradient
                        colors={['#7C3AED', '#A855F7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={authProgStyles.progressGradient}
                      />
                    </Animated.View>
                  </View>
                )}
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>
    </Animated.View>
  );
};

const authProgStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#09090B',
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 36,
  },
  stepsArea: {
    width: '80%',
    maxWidth: 320,
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  indicator: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepBody: {
    flex: 1,
    gap: 6,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  stepLabelDone: {
    color: 'rgba(255,255,255,0.35)',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressGradient: {
    flex: 1,
    borderRadius: 2,
  },
});

const RootNavigator = () => {
  const { theme, isDark } = useTheme();
  const { isAuthenticated, initializing, loading, authSteps } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  // showVerificationPrompt removed - verification is now handled during onboarding
  
  // Check onboarding status ONLY after auth loading completes
  // This prevents race conditions where signIn hasn't finished setting onboardingCompleted
  useEffect(() => {
    const checkOnboarding = async () => {
      if (isAuthenticated && !loading) {
        const onboardingCompleted = await userStorage.getRaw('onboardingCompleted');
        console.log('[RootNavigator] onboardingCompleted:', onboardingCompleted);
        setNeedsOnboarding(onboardingCompleted !== 'true');
      } else if (!isAuthenticated) {
        setNeedsOnboarding(null);
        setShowVerificationPrompt(false);
      }
      if (!loading) {
        setCheckingOnboarding(false);
      }
    };
    
    if (!initializing && !loading) {
      setCheckingOnboarding(true);
      checkOnboarding();
    }
  }, [isAuthenticated, initializing, loading]);
  
  // Handle onboarding completion — check if email needs verification
  const handleOnboardingComplete = async () => {
    await userStorage.setRaw('onboardingCompleted', 'true');
    setNeedsOnboarding(false);
  };
  
  // Show sign-in / sign-up loading screen with real progress steps
  if (loading && authSteps) {
    return <AuthProgressScreen authSteps={authSteps} />;
  }
  
  // Show cold launch loading screen while checking auth/onboarding state
  if (initializing || checkingOnboarding || loading) {
    return <AnimatedLoadingScreen />;
  }
  
  // If not authenticated, show only the Auth screen
  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{
            animation: 'fade',
          }}
        />
      </Stack.Navigator>
    );
  }
  
  // Authenticated but needs onboarding (new signup)
  if (needsOnboarding) {
    return <SimpleOnboarding onComplete={handleOnboardingComplete} />;
  }
  
  // Authenticated and onboarding complete - show the main app
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      {/* Main Tab Navigator */}
      <Stack.Screen 
        name="Main" 
        component={TabNavigator} 
      />
      
      {/* Friends Screen */}
      <Stack.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Leaderboard Screen */}
      <Stack.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Prayer Wall Screen */}
      <Stack.Screen 
        name="PrayerWall" 
        component={PrayerWallScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Messages Screen */}
      <Stack.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Chat Screen */}
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Challenges Screen */}
      <Stack.Screen 
        name="Challenges" 
        component={ChallengesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Tasks Done Screen */}
      <Stack.Screen 
        name="TasksDone" 
        component={TasksDoneScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Saved Verses Screen */}
      <Stack.Screen 
        name="SavedVerses" 
        component={SavedVersesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Highlights Screen */}
      <Stack.Screen 
        name="Highlights" 
        component={HighlightsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Journal Screen */}
      <Stack.Screen 
        name="Journal" 
        component={JournalScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Achievements Screen */}
      <Stack.Screen 
        name="Achievements" 
        component={AchievementsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Bible Study Screen */}
      <Stack.Screen 
        name="BibleStudy" 
        component={BibleStudyScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Bible Study Sub-Screens */}
      <Stack.Screen name="BibleCharacters" component={require('../screens/BibleCharactersScreen').default} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="QuizGames" component={QuizGamesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BibleTimeline" component={BibleTimelineScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BibleMaps" component={BibleMapsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ThematicGuides" component={ThematicGuidesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="KeyVersesScreen" component={KeyVersesScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BibleFastFacts" component={BibleFastFactsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AudioLearning" component={AudioLearningScreen} options={{ animation: 'slide_from_right' }} />
      
      {/* Friend Chat Screen */}
      <Stack.Screen 
        name="FriendChat" 
        component={FriendChatScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Customisation Screen */}
      <Stack.Screen 
        name="Customisation" 
        component={CustomisationScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Bible Reader Screen */}
      <Stack.Screen 
        name="BibleReader" 
        component={BibleReaderScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Schedule Task Screen */}
      <Stack.Screen 
        name="ScheduleTask" 
        component={ScheduleTaskScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Tasks Overview Screen */}
      <Stack.Screen 
        name="TasksOverview" 
        component={TasksOverviewScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Start Workout Screen */}
      <Stack.Screen 
        name="StartWorkout" 
        component={StartWorkoutScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Physique Screen */}
      <Stack.Screen 
        name="Physique" 
        component={PhysiqueScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Body Composition Screen */}
      <Stack.Screen 
        name="BodyComposition" 
        component={BodyCompositionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Gym History Screen */}
      <Stack.Screen 
        name="GymHistory" 
        component={GymHistoryScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Nutrition Screen */}
      <Stack.Screen 
        name="Nutrition" 
        component={NutritionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Email Verification Screen (navigable from Hub, Profile, etc.) */}
      <Stack.Screen 
        name="EmailVerification" 
        component={EmailVerificationScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      
      {/* Exercises Screen */}
      <Stack.Screen 
        name="Exercises" 
        component={ExercisesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      
      {/* Challenge Quiz Screen */}
      <Stack.Screen 
        name="ChallengeQuiz" 
        component={ChallengeQuizScreen}
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootNavigator;
