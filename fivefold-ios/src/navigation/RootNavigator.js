/**
 * Root Navigator
 * 
 * Handles the main navigation flow:
 * 1. Not authenticated → Auth screen
 * 2. Authenticated + new signup → Onboarding
 * 3. Authenticated + returning user → Main app
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Easing, Dimensions, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from '../utils/userStorage';
import { LinearGradient } from 'expo-linear-gradient';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator, { preloadTabConfig } from './TabNavigator';
import AuthScreen from '../screens/AuthScreen';

import SavedVersesScreen from '../screens/SavedVersesScreen';
import HighlightsScreen from '../screens/HighlightsScreen';
import JournalScreen from '../screens/JournalScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ExercisesScreen from '../screens/ExercisesScreen';
import { ExerciseDetailScreen } from '../components/ExercisesModal';
import PhysiqueScreen from '../screens/PhysiqueScreen';
import BodyCompositionScreen from '../screens/BodyCompositionScreen';
import GymHistoryScreen from '../screens/GymHistoryScreen';
import StartWorkoutScreen from '../screens/StartWorkoutScreen';
import NutritionScreen from '../screens/NutritionScreen';
import ScheduleTaskScreen from '../screens/ScheduleTaskScreen';
import TasksOverviewScreen from '../screens/TasksOverviewScreen';
import BibleStudyScreen from '../screens/BibleStudyScreen';
import QuizGamesScreen from '../screens/QuizGamesScreen';
import QuizCategoriesScreen from '../screens/QuizCategoriesScreen';
import BibleGamesScreen from '../screens/BibleGamesScreen';
import VerseJumbleGame from '../screens/bible-games/VerseJumbleGame';
import BibleHangmanGame from '../screens/bible-games/BibleHangmanGame';
import WhoAmIGame from '../screens/bible-games/WhoAmIGame';
import BookOrderGame from '../screens/bible-games/BookOrderGame';
import VerseCompleteGame from '../screens/bible-games/VerseCompleteGame';
import BiblePairsGame from '../screens/bible-games/BiblePairsGame';
import BibleTimelineScreen from '../screens/BibleTimelineScreen';
import BibleTimelineEraScreen from '../screens/BibleTimelineEraScreen';
import BibleMapsScreen from '../screens/BibleMapsScreen';
import { BibleMapDetailScreen } from '../components/InteractiveBibleMaps';
import ThematicGuidesScreen from '../screens/ThematicGuidesScreen';
import ThematicGuideDetailScreen from '../screens/ThematicGuideDetailScreen';
import KeyVersesScreen from '../screens/KeyVersesScreen';
import BibleFastFactsScreen from '../screens/BibleFastFactsScreen';
import AudioLearningScreen from '../screens/AudioLearningScreen';
import BibleReaderScreen from '../screens/BibleReaderScreen';
import BibleChatScreen from '../screens/BibleChatScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import CoachChatScreen from '../screens/CoachChatScreen';
import VisionScreen, { AddVisionScreen } from '../screens/VisionScreen';
import HabitsScreenWrapper from '../screens/HabitsScreen';
import { AddHabitScreen } from '../components/HabitsScreen';
import RemindersScreenWrapper from '../screens/RemindersScreen';
import ScheduleReminderModal from '../components/ScheduleReminderModal';
import LibrarySheet from '../components/LibrarySheet';
import AllRemindersScreen from '../components/AllRemindersScreen';
import PanicButtonScreen from '../screens/PanicButtonScreen';
import RelapsedScreen from '../screens/RelapsedScreen';
import DistractionGamesScreen from '../screens/DistractionGamesScreen';
import MemoryRecallGame from '../screens/games/MemoryRecallGame';
import FindItFastGame from '../screens/games/FindItFastGame';
import StroopTestGame from '../screens/games/StroopTestGame';
import MathBlitzGame from '../screens/games/MathBlitzGame';
import BreathHoldGame from '../screens/games/BreathHoldGame';
import ColorMatchGame from '../screens/games/ColorMatchGame';
import PatternRepeatGame from '../screens/games/PatternRepeatGame';
import ReactionTimeGame from '../screens/games/ReactionTimeGame';
import NumberChainGame from '../screens/games/NumberChainGame';
import TypingSpeedGame from '../screens/games/TypingSpeedGame';
import EmojiMatchGame from '../screens/games/EmojiMatchGame';
import BubblePopGame from '../screens/games/BubblePopGame';
import MazeRunnerGame from '../screens/games/MazeRunnerGame';
import QuickSortGame from '../screens/games/QuickSortGame';
import SpotDifferenceGame from '../screens/games/SpotDifferenceGame';
import TrueOrFalseGame from '../screens/games/TrueOrFalseGame';
import CountdownGame from '../screens/games/CountdownGame';
import FlashCardsGame from '../screens/games/FlashCardsGame';
import CustomisationScreen from '../screens/CustomisationScreen';
import CustomiseTabBarScreen from '../screens/CustomiseTabBarScreen';
import CustomiseCardsScreen from '../screens/CustomiseCardsScreen';
import PrayerBoardScreen from '../screens/PrayerBoardScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';

import PrayerDetailScreen from '../screens/PrayerDetailScreen';
import SimpleOnboarding from '../components/SimpleOnboarding';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
// refreshEmailVerificationStatus import removed - verification handled in onboarding

const Stack = createNativeStackNavigator();



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
          source={require('../../assets/animated-icon.png')}
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
          const [onboardingCompleted] = await Promise.all([
            userStorage.getRaw('onboardingCompleted'),
            preloadTabConfig(),
          ]);
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
    DeviceEventEmitter.emit('onboardingCompleted');
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
    // Match the splash green so if the splash zoom reveals this placeholder during
    // a slow cold start, it stays on-brand instead of flashing navy.
    return <View style={{ flex: 1, backgroundColor: '#33C473' }} />;
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
      
      {/* Vision Screen */}
      <Stack.Screen 
        name="Vision" 
        component={VisionScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Habits Screen */}
      <Stack.Screen
        name="Habits"
        component={HabitsScreenWrapper}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Add Vision / Add Habit — native modal sheets (match the rest of the app) */}
      <Stack.Screen name="AddVision" component={AddVisionScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddHabit" component={AddHabitScreen} options={{ presentation: 'modal' }} />

      {/* Reminders Screen */}
      <Stack.Screen
        name="Reminders"
        component={RemindersScreenWrapper}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Reminder modals — native pull-to-dismiss sheets (parent scales back). */}
      <Stack.Screen
        name="ScheduleReminder"
        component={ScheduleReminderModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ReminderLibrary"
        component={LibrarySheet}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AllReminders"
        component={AllRemindersScreen}
        options={{ presentation: 'modal' }}
      />

      {/* Legal / support sheets — native pull-to-dismiss */}
      <Stack.Screen
        name="Legal"
        component={require('../screens/LegalScreen').default}
        options={{ presentation: 'modal' }}
      />

      {/* Settings hub — native pull-to-dismiss sheet (like the reminder modals) */}
      <Stack.Screen
        name="Settings"
        component={require('../screens/SettingsScreen').default}
        options={{ presentation: 'modal' }}
      />
      {/* Settings child sheets — stack ON TOP of Settings (it scales back). */}
      <Stack.Screen
        name="ReferralSheet"
        component={require('../screens/ReferralScreen').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="BibleVersionSheet"
        component={require('../screens/BibleVersionScreen').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="LanguageSheet"
        component={require('../screens/LanguageScreen').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ReadingVoiceSheet"
        component={require('../screens/ReadingVoiceScreen').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="NotificationsSheet"
        component={require('../screens/NotificationsScreen').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="TwoFactorSheet"
        component={require('../screens/TwoFactorSetupScreen').default}
        options={{ presentation: 'modal' }}
      />

      {/* Prayer wizard modals — same native pull-to-dismiss sheets */}
      <Stack.Screen
        name="AddPrayer"
        component={require('../components/AddPrayerModal').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditPrayer"
        component={require('../components/EditPrayerModal').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AllWorkouts"
        component={require('../screens/AllWorkoutsScreen').default}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="MyWeek"
        component={require('../screens/MyWeekScreen').default}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ScheduleWorkout"
        component={require('../components/ScheduleWorkoutModal').default}
        options={{ presentation: 'modal', gestureResponseDistance: 140 }}
      />

      {/* Panic Button Flow */}
      <Stack.Screen
        name="PanicButton"
        component={PanicButtonScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Relapsed"
        component={RelapsedScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="DistractionGames"
        component={DistractionGamesScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MemoryRecallGame"
        component={MemoryRecallGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FindItFastGame"
        component={FindItFastGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="StroopTestGame"
        component={StroopTestGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MathBlitzGame"
        component={MathBlitzGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BreathHoldGame"
        component={BreathHoldGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ColorMatchGame"
        component={ColorMatchGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PatternRepeatGame"
        component={PatternRepeatGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ReactionTimeGame"
        component={ReactionTimeGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="NumberChainGame"
        component={NumberChainGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="TypingSpeedGame"
        component={TypingSpeedGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="EmojiMatchGame"
        component={EmojiMatchGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BubblePopGame"
        component={BubblePopGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MazeRunnerGame"
        component={MazeRunnerGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="QuickSortGame"
        component={QuickSortGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SpotDifferenceGame"
        component={SpotDifferenceGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="TrueOrFalseGame"
        component={TrueOrFalseGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CountdownGame"
        component={CountdownGame}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FlashCardsGame"
        component={FlashCardsGame}
        options={{ animation: 'slide_from_right' }}
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
      
      {/* Bible Study hub — a normal push (menu). Its content readers open as
          pull-to-dismiss modals; keeping the hub a push means the games/quiz
          screens pushed from it don't inherit a modal's notch inset. */}
      <Stack.Screen
        name="BibleStudy"
        component={BibleStudyScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Bible Study Sub-Screens. Reader/study screens present as native
          pull-to-dismiss modals; interactive games stay as pushes. */}
      <Stack.Screen name="BibleCharacters" component={require('../screens/BibleCharactersScreen').default} options={{ presentation: 'modal' }} />
      {/* Story group and character each get their own sheet, stacked over the list */}
      <Stack.Screen name="BibleCharacterGroup" component={require('../screens/BibleCharacterGroupScreen').default} options={{ presentation: 'modal', gestureResponseDistance: 140 }} />
      <Stack.Screen name="BibleCharacter" component={require('../screens/BibleCharacterScreen').default} options={{ presentation: 'modal', gestureResponseDistance: 140 }} />
      <Stack.Screen name="QuizGames" component={QuizGamesScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="QuizCategories" component={QuizCategoriesScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BibleGames" component={BibleGamesScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="VerseJumbleGame" component={VerseJumbleGame} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BibleHangmanGame" component={BibleHangmanGame} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="WhoAmIGame" component={WhoAmIGame} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BookOrderGame" component={BookOrderGame} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="VerseCompleteGame" component={VerseCompleteGame} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BiblePairsGame" component={BiblePairsGame} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="BibleTimeline" component={BibleTimelineScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BibleTimelineEra" component={BibleTimelineEraScreen} options={{ presentation: 'modal', gestureResponseDistance: 140 }} />
      <Stack.Screen name="BibleMaps" component={BibleMapsScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BibleMapDetail" component={BibleMapDetailScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ThematicGuides" component={ThematicGuidesScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ThematicGuideDetail" component={ThematicGuideDetailScreen} options={{ presentation: 'modal', gestureResponseDistance: 140 }} />
      <Stack.Screen name="KeyVersesScreen" component={KeyVersesScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BibleFastFacts" component={BibleFastFactsScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="BibleFactDetail" component={require('../screens/BibleFactDetailScreen').default} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AudioLearning" component={AudioLearningScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AudioStory" component={require('../screens/AudioStoryScreen').default} options={{ presentation: 'modal' }} />
      
      {/* Bible Chat Screen (Guide AI verse study) */}
      <Stack.Screen
        name="BibleChat"
        component={BibleChatScreen}
        options={{ presentation: 'modal', gestureResponseDistance: 140 }}
      />

      {/* Active Workout — native modal sheet (parent scales back, swipe to minimize) */}
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{
          presentation: 'modal',
          gestureResponseDistance: 140,
        }}
      />

      {/* Coach Chat Screen */}
      <Stack.Screen
        name="CoachChat"
        component={CoachChatScreen}
        options={{ presentation: 'modal', gestureResponseDistance: 140 }}
      />
      
      {/* Customisation Screen */}
      <Stack.Screen 
        name="Customisation" 
        component={CustomisationScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Customise Tab Bar Screen */}
      <Stack.Screen
        name="CustomiseTabBar"
        component={CustomiseTabBarScreen}
        options={{ presentation: 'modal' }}
      />

      {/* Customise Cards Screen */}
      <Stack.Screen
        name="CustomiseCards"
        component={CustomiseCardsScreen}
        options={{ presentation: 'modal' }}
      />

      {/* Prayer Detail Screen */}
      <Stack.Screen
        name="PrayerDetail"
        component={PrayerDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Prayer Board Screen */}
      <Stack.Screen
        name="PrayerBoard"
        component={PrayerBoardScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Bible Reader Screen */}
      <Stack.Screen 
        name="BibleReader"
        component={BibleReaderScreen}
        options={{ presentation: 'modal', gestureResponseDistance: 140 }}
      />

      {/* Reading a chapter is its own sheet, stacked over the books sheet */}
      <Stack.Screen
        name="BibleChapter"
        component={require('../screens/BibleChapterScreen').default}
        options={{ presentation: 'modal', gestureResponseDistance: 140 }}
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

      {/* Edit Profile Screen */}
      <Stack.Screen
        name="EditProfile"
        component={NutritionScreen}
        initialParams={{ openEdit: true }}
        options={{
          animation: 'slide_from_right',
        }}
      />

      {/* Reconfigure Profile Screen */}
      <Stack.Screen
        name="ReconfigureProfile"
        component={NutritionScreen}
        initialParams={{ openReconfigure: true }}
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

      {/* Exercise Detail — native modal sheet (matches the rest of the app) */}
      <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ presentation: 'modal' }} />
      
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
