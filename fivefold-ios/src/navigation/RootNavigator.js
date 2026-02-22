/**
 * Root Navigator
 * 
 * Handles the main navigation flow:
 * 1. Not authenticated → Auth screen
 * 2. Authenticated + new signup → Onboarding
 * 3. Authenticated + returning user → Main app
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Easing, Dimensions } from 'react-native';
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
import CoachChatScreen from '../screens/CoachChatScreen';
import VisionScreen from '../screens/VisionScreen';
import CustomisationScreen from '../screens/CustomisationScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import SimpleOnboarding from '../components/SimpleOnboarding';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
// refreshEmailVerificationStatus import removed - verification handled in onboarding

const Stack = createNativeStackNavigator();

const STAR_FIELD = Array.from({ length: 20 }, (_, i) => ({
  x: (7 + i * 17 + (i * i * 3)) % 100,
  y: (11 + i * 13 + (i * 7)) % 100,
  size: 1 + (i % 3),
  delay: i * 200,
}));

const AnimatedLoadingScreen = () => {
  const { width: SW } = Dimensions.get('window');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.6)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.85)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagSlide = useRef(new Animated.Value(10)).current;
  const stepsContainerOpacity = useRef(new Animated.Value(0)).current;
  const stepsContainerSlide = useRef(new Animated.Value(30)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const ring2Rotate = useRef(new Animated.Value(0)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;
  const burstScale = useRef(new Animated.Value(0)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  const star0 = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0)).current;
  const star2 = useRef(new Animated.Value(0)).current;
  const star3 = useRef(new Animated.Value(0)).current;
  const star4 = useRef(new Animated.Value(0)).current;
  const star5 = useRef(new Animated.Value(0)).current;
  const star6 = useRef(new Animated.Value(0)).current;
  const star7 = useRef(new Animated.Value(0)).current;
  const star8 = useRef(new Animated.Value(0)).current;
  const star9 = useRef(new Animated.Value(0)).current;
  const star10 = useRef(new Animated.Value(0)).current;
  const star11 = useRef(new Animated.Value(0)).current;
  const star12 = useRef(new Animated.Value(0)).current;
  const star13 = useRef(new Animated.Value(0)).current;
  const star14 = useRef(new Animated.Value(0)).current;
  const star15 = useRef(new Animated.Value(0)).current;
  const star16 = useRef(new Animated.Value(0)).current;
  const star17 = useRef(new Animated.Value(0)).current;
  const star18 = useRef(new Animated.Value(0)).current;
  const star19 = useRef(new Animated.Value(0)).current;
  const starAnims = [star0,star1,star2,star3,star4,star5,star6,star7,star8,star9,star10,star11,star12,star13,star14,star15,star16,star17,star18,star19];

  const s0Op = useRef(new Animated.Value(0)).current;
  const s0Sl = useRef(new Animated.Value(16)).current;
  const s0Pr = useRef(new Animated.Value(0)).current;
  const s0Ck = useRef(new Animated.Value(0)).current;
  const s1Op = useRef(new Animated.Value(0)).current;
  const s1Sl = useRef(new Animated.Value(16)).current;
  const s1Pr = useRef(new Animated.Value(0)).current;
  const s1Ck = useRef(new Animated.Value(0)).current;
  const s2Op = useRef(new Animated.Value(0)).current;
  const s2Sl = useRef(new Animated.Value(16)).current;
  const s2Pr = useRef(new Animated.Value(0)).current;
  const s2Ck = useRef(new Animated.Value(0)).current;

  const stepAnims = [
    { op: s0Op, sl: s0Sl, pr: s0Pr, ck: s0Ck },
    { op: s1Op, sl: s1Sl, pr: s1Pr, ck: s1Ck },
    { op: s2Op, sl: s2Sl, pr: s2Pr, ck: s2Ck },
  ];

  const [done, setDone] = useState([false, false, false]);
  const markDone = (i) => setDone(prev => { const n = [...prev]; n[i] = true; return n; });

  const STEPS = ['Signing you in', 'Loading your content', 'Preparing your experience'];

  useEffect(() => {
    // Stars twinkle independently
    starAnims.forEach((s, i) => {
      setTimeout(() => {
        Animated.loop(Animated.sequence([
          Animated.timing(s, { toValue: 1, duration: 1200 + (i % 5) * 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(s, { toValue: 0.15, duration: 1200 + (i % 5) * 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();
      }, STAR_FIELD[i].delay);
    });

    // Scene fade in
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Light burst then logo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(burstOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(burstScale, { toValue: 1.5, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
      setTimeout(() => {
        Animated.timing(burstOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      }, 250);
    }, 200);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(heroScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 300);

    // Continuous ambient loops (all native driver)
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(breatheScale, { toValue: 1.05, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(breatheScale, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ringRotate, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(ring2Rotate, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })).start();

    // Title reveal — scale + fade like an Apple keynote
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(titleScale, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      ]).start();
    }, 500);

    // Tagline
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(tagSlide, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      ]).start();
    }, 750);

    // Steps container slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(stepsContainerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(stepsContainerSlide, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
      ]).start();
    }, 900);

    const animateStep = (index, delay, duration) => {
      const sa = stepAnims[index];
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(sa.op, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(sa.sl, { toValue: 0, tension: 100, friction: 14, useNativeDriver: true }),
        ]).start();
        Animated.timing(sa.pr, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
          markDone(index);
          Animated.spring(sa.ck, { toValue: 1, tension: 300, friction: 6, useNativeDriver: true }).start();
        });
      }, delay);
    };

    animateStep(0, 1000, 450);
    animateStep(1, 1500, 400);
    animateStep(2, 1950, 350);
  }, []);

  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-140, 140] });
  const ringSpin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ring2Spin = ring2Rotate.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
    <View style={ls.container}>
      {/* Deep cinematic background */}
      <LinearGradient
        colors={['#000004', '#050A18', '#0C1229', '#0A0F20', '#030408']}
        locations={[0, 0.2, 0.45, 0.7, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={ls.bg}
      />

      {/* Star field */}
      {STAR_FIELD.map((s, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          left: `${s.x}%`,
          top: `${s.y}%`,
          width: s.size,
          height: s.size,
          borderRadius: s.size,
          backgroundColor: '#FFF',
          opacity: starAnims[i],
        }} />
      ))}

      {/* Warm ambient glow — top */}
      <Animated.View style={[ls.aOrb, {
        top: '-8%', left: '-20%', width: 380, height: 380,
        opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
        transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }) }],
      }]}>
        <LinearGradient
          colors={['rgba(245,158,11,0.06)', 'rgba(245,158,11,0)']}
          style={{ width: '100%', height: '100%', borderRadius: 190 }}
        />
      </Animated.View>
      {/* Cool ambient glow — bottom */}
      <Animated.View style={[ls.aOrb, {
        bottom: '0%', right: '-18%', width: 320, height: 320,
        opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
        transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1.05, 0.93] }) }],
      }]}>
        <LinearGradient
          colors={['rgba(99,102,241,0.05)', 'rgba(99,102,241,0)']}
          style={{ width: '100%', height: '100%', borderRadius: 160 }}
        />
      </Animated.View>

      <Animated.View style={[ls.content, { opacity: fadeAnim }]}>

        {/* ── HERO LOGO AREA ── */}
        <Animated.View style={[ls.heroWrap, {
          transform: [{ scale: Animated.multiply(heroScale, breatheScale) }],
          opacity: heroOpacity,
        }]}>
          {/* Multi-layer glow */}
          <Animated.View style={[ls.glowLayer, {
            width: 280, height: 280, borderRadius: 140,
            backgroundColor: 'rgba(245,158,11,0.08)',
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }),
            transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
          }]} />
          <Animated.View style={[ls.glowLayer, {
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: 'rgba(245,158,11,0.06)',
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [{ scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) }],
          }]} />

          {/* Decorative orbit rings */}
          <Animated.View style={[ls.orbitRing, {
            width: 200, height: 200,
            borderWidth: 1, borderColor: 'rgba(245,158,11,0.07)',
            transform: [{ rotate: ringSpin }],
          }]}>
            <View style={{ position: 'absolute', top: -3, left: '50%', marginLeft: -3,
              width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(245,158,11,0.4)' }} />
          </Animated.View>
          <Animated.View style={[ls.orbitRing, {
            width: 240, height: 240,
            borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)', borderStyle: 'dashed',
            transform: [{ rotate: ring2Spin }],
          }]}>
            <View style={{ position: 'absolute', bottom: -2, right: '30%',
              width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(99,102,241,0.35)' }} />
          </Animated.View>

          {/* Light burst */}
          <Animated.View style={{
            position: 'absolute', width: 300, height: 300, borderRadius: 150,
            backgroundColor: 'rgba(245,200,80,0.15)',
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          }} />

          {/* Glass logo card */}
          <View style={ls.logoCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ls.logoCardGradient}
            />
            <Image source={require('../../assets/logo.png')} style={ls.logoImg} resizeMode="contain" />
            <Animated.View style={[ls.shimmer, { transform: [{ translateX: shimmerX }] }]} />
          </View>
        </Animated.View>

        {/* ── TITLE ── */}
        <Animated.View style={[ls.titleWrap, {
          opacity: titleOpacity,
          transform: [{ scale: titleScale }],
        }]}>
          <Text style={ls.title}>Biblely</Text>
        </Animated.View>

        {/* ── TAGLINE ── */}
        <Animated.View style={{
          opacity: tagOpacity,
          transform: [{ translateY: tagSlide }],
          marginBottom: 48,
        }}>
          <Text style={ls.tagline}>Your Faith Journey</Text>
        </Animated.View>

        {/* ── STEPS ── */}
        <Animated.View style={[ls.stepsWrap, {
          opacity: stepsContainerOpacity,
          transform: [{ translateY: stepsContainerSlide }],
        }]}>
          {/* Vertical connector line behind the step indicators */}
          <View style={ls.connectorLine} />

          {STEPS.map((label, i) => {
            const isLast = i === STEPS.length - 1;
            return (
              <Animated.View key={i} style={[
                ls.stepRow,
                !isLast && { marginBottom: 20 },
                { opacity: stepAnims[i].op, transform: [{ translateY: stepAnims[i].sl }] },
              ]}>
                {/* Indicator */}
                <View style={ls.indicatorCol}>
                  {done[i] ? (
                    <Animated.View style={[ls.doneDot, { transform: [{ scale: stepAnims[i].ck }] }]}>
                      <LinearGradient
                        colors={['#34D399', '#10B981']}
                        style={ls.doneDotGrad}
                      />
                      <Text style={ls.doneCheck}>{'✓'}</Text>
                    </Animated.View>
                  ) : (
                    <View style={ls.pendingDot}>
                      <View style={ls.pendingDotInner} />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={ls.stepContent}>
                  <Text style={[ls.stepLabel, done[i] && ls.stepLabelDone]}>{label}</Text>
                  {!done[i] && (
                    <View style={ls.progressTrack}>
                      <Animated.View style={[ls.progressFill, {
                        width: stepAnims[i].pr.interpolate({
                          inputRange: [0, 1], outputRange: ['0%', '100%'],
                        }),
                      }]}>
                        <LinearGradient
                          colors={['#F59E0B', '#F97316']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={ls.progressGrad}
                        />
                      </Animated.View>
                      {/* Animated glow dot at progress tip */}
                      <Animated.View style={[ls.progressGlow, {
                        left: stepAnims[i].pr.interpolate({
                          inputRange: [0, 1], outputRange: ['0%', '100%'],
                        }),
                      }]} />
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const ls = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  aOrb: { position: 'absolute' },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 36, paddingBottom: 50,
  },

  heroWrap: {
    width: 250, height: 250,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 36,
  },
  glowLayer: { position: 'absolute' },
  orbitRing: { position: 'absolute', borderRadius: 999 },
  logoCard: {
    width: 120, height: 120, borderRadius: 34,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 12,
  },
  logoCardGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 34,
  },
  logoImg: { width: 82, height: 82 },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ skewX: '-20deg' }],
  },

  titleWrap: { marginBottom: 6 },
  title: {
    fontSize: 46, fontWeight: '800',
    color: '#FAFAFA', letterSpacing: 4,
    textShadowColor: 'rgba(245,158,11,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  tagline: {
    fontSize: 14, fontWeight: '500',
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 8,
    textTransform: 'uppercase',
  },

  stepsWrap: {
    width: '100%', maxWidth: 300,
    paddingLeft: 20,
  },
  connectorLine: {
    position: 'absolute',
    left: 30, top: 14, bottom: 14,
    width: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 1,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  indicatorCol: {
    width: 24, alignItems: 'center', marginRight: 16, zIndex: 1,
  },
  doneDot: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 6,
  },
  doneDotGrad: {
    position: 'absolute', width: 24, height: 24, borderRadius: 12,
  },
  doneCheck: {
    color: '#FFF', fontSize: 13, fontWeight: '800',
  },
  pendingDot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.2)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pendingDotInner: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(245,158,11,0.25)',
  },
  stepContent: { flex: 1 },
  stepLabel: {
    fontSize: 15, fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  stepLabelDone: {
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 0,
  },
  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'visible',
  },
  progressFill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
  progressGrad: { flex: 1, borderRadius: 2 },
  progressGlow: {
    position: 'absolute', top: -3, marginLeft: -5,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: 'rgba(245,158,11,0.4)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
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

/**
 * DeletionProgressScreen — shows real-time account deletion progress
 * with a red/danger aesthetic.
 */
const DeletionProgressScreen = ({ deleteSteps }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const stepsOpacity = useRef(new Animated.Value(0)).current;

  const stepAnims = useRef(
    (deleteSteps?.steps || []).map(() => ({
      opacity: new Animated.Value(0),
      slide: new Animated.Value(14),
      progress: new Animated.Value(0),
      check: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    }, 100);
    setTimeout(() => {
      Animated.timing(stepsOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }, 300);
  }, []);

  useEffect(() => {
    if (!deleteSteps?.steps) return;
    deleteSteps.steps.forEach((step, i) => {
      if (!stepAnims[i]) return;
      const sa = stepAnims[i];
      if (i <= (deleteSteps.current === -1 ? deleteSteps.steps.length : deleteSteps.current)) {
        Animated.parallel([
          Animated.timing(sa.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(sa.slide, { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
        ]).start();
      }
      if (step.done) {
        Animated.timing(sa.progress, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
          Animated.spring(sa.check, { toValue: 1, tension: 300, friction: 8, useNativeDriver: true }).start();
        });
      } else if (i === deleteSteps.current) {
        Animated.timing(sa.progress, { toValue: 0.6, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      }
    });
  }, [deleteSteps]);

  const allDone = deleteSteps?.steps?.every(s => s.done);

  return (
    <Animated.View style={[delProgStyles.root, { opacity: fadeAnim }]}>
      <LinearGradient colors={['#1A0A0A', '#0F0D15', '#09090B']} style={StyleSheet.absoluteFill} />

      {/* Icon */}
      <Animated.View style={[delProgStyles.iconWrap, {
        opacity: iconOpacity,
        transform: [{ scale: iconScale }],
      }]}>
        <View style={delProgStyles.iconCircle}>
          <Text style={delProgStyles.iconText}>{allDone ? '\u2713' : '\u2717'}</Text>
        </View>
      </Animated.View>

      <Text style={delProgStyles.title}>{allDone ? 'Account Deleted' : 'Deleting Account'}</Text>
      <Text style={delProgStyles.subtitle}>
        {allDone ? 'All your data has been removed.' : 'Permanently removing your data...'}
      </Text>

      {/* Steps */}
      <Animated.View style={[delProgStyles.stepsArea, { opacity: stepsOpacity }]}>
        {(deleteSteps?.steps || []).map((step, i) => {
          const sa = stepAnims[i];
          if (!sa) return null;
          return (
            <Animated.View key={i} style={[delProgStyles.stepRow, {
              opacity: sa.opacity,
              transform: [{ translateY: sa.slide }],
            }]}>
              <View style={delProgStyles.indicator}>
                {step.done ? (
                  <Animated.View style={[delProgStyles.checkCircle, {
                    transform: [{ scale: sa.check }],
                  }]}>
                    <Text style={delProgStyles.checkMark}>{'\u2713'}</Text>
                  </Animated.View>
                ) : (
                  <View style={delProgStyles.pendingRing} />
                )}
              </View>
              <View style={delProgStyles.stepBody}>
                <Text style={[delProgStyles.stepLabel, step.done && delProgStyles.stepLabelDone]}>
                  {step.label}
                </Text>
                {!step.done && (
                  <View style={delProgStyles.progressTrack}>
                    <Animated.View style={[delProgStyles.progressFill, {
                      width: sa.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    }]}>
                      <LinearGradient
                        colors={['#DC2626', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={delProgStyles.progressGradient}
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

const delProgStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090B' },
  iconWrap: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(220,38,38,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(220,38,38,0.3)' },
  iconText: { fontSize: 28, fontWeight: '800', color: '#EF4444' },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 6, letterSpacing: 0.3 },
  subtitle: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)', marginBottom: 36 },
  stepsArea: { width: '80%', maxWidth: 320, gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  indicator: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center' },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pendingRing: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  stepBody: { flex: 1, gap: 6 },
  stepLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  stepLabelDone: { color: 'rgba(255,255,255,0.35)' },
  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressGradient: { flex: 1, borderRadius: 2 },
});

const RootNavigator = () => {
  const { theme, isDark } = useTheme();
  const { isAuthenticated, initializing, loading, authSteps, deleteSteps } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  // showVerificationPrompt removed - verification is now handled during onboarding
  
  // Check onboarding status ONLY after auth loading completes
  // This prevents race conditions where signIn hasn't finished setting onboardingCompleted
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        if (isAuthenticated && !loading) {
          const onboardingCompleted = await userStorage.getRaw('onboardingCompleted');
          console.log('[RootNavigator] onboardingCompleted:', onboardingCompleted);
          setNeedsOnboarding(onboardingCompleted !== 'true');
        } else if (!isAuthenticated) {
          setNeedsOnboarding(null);
        }
      } catch (err) {
        console.warn('[RootNavigator] checkOnboarding error:', err);
        // If check fails, assume onboarding is completed to avoid getting stuck
        setNeedsOnboarding(false);
      } finally {
        // ALWAYS clear checkingOnboarding to prevent the loading screen from getting stuck
        if (!loading) {
          setCheckingOnboarding(false);
        }
      }
    };
    
    if (!initializing && !loading) {
      setCheckingOnboarding(true);
      checkOnboarding();
    }
  }, [isAuthenticated, initializing, loading]);
  
  // Safety net: if loading screen is still showing after 8 seconds, force-dismiss it
  // This prevents the app from getting permanently stuck on the loading screen
  useEffect(() => {
    if (initializing || checkingOnboarding || (loading && isAuthenticated)) {
      const safetyTimer = setTimeout(() => {
        console.warn('[RootNavigator] Safety timeout — forcing loading screen to dismiss');
        setCheckingOnboarding(false);
      }, 8000);
      return () => clearTimeout(safetyTimer);
    }
  }, [initializing, checkingOnboarding, loading, isAuthenticated]);
  
  // Handle onboarding completion — check if email needs verification
  const handleOnboardingComplete = async () => {
    await userStorage.setRaw('onboardingCompleted', 'true');
    setNeedsOnboarding(false);
  };
  
  // Show account deletion progress screen
  if (deleteSteps) {
    return <DeletionProgressScreen deleteSteps={deleteSteps} />;
  }

  // Show sign-in / sign-up loading screen with real progress steps
  if (loading && authSteps) {
    return <AuthProgressScreen authSteps={authSteps} />;
  }
  
  // Show cold launch loading screen while checking auth/onboarding state.
  // Only show for `loading` when the user is authenticated (e.g. sign-out transition).
  // When NOT authenticated, `loading` may fire during password-reset — the AuthScreen
  // handles that with its own local spinner; we must NOT replace it with a full-screen overlay.
  if (initializing || checkingOnboarding || (loading && isAuthenticated)) {
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
        options={{ gestureEnabled: false }}
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
      
      {/* Vision Screen */}
      <Stack.Screen 
        name="Vision" 
        component={VisionScreen}
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

      {/* Coach Chat Screen */}
      <Stack.Screen 
        name="CoachChat" 
        component={CoachChatScreen}
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
