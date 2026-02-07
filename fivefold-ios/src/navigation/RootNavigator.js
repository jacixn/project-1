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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import StartWorkoutScreen from '../screens/StartWorkoutScreen';
import ScheduleTaskScreen from '../screens/ScheduleTaskScreen';
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
import SimpleOnboarding from '../components/SimpleOnboarding';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

// Premium animated loading screen
const AnimatedLoadingScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const ringRotate = useRef(new Animated.Value(0)).current;
  const ring2Rotate = useRef(new Animated.Value(0)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const orb3Anim = useRef(new Animated.Value(0)).current;
  const orb4Anim = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.sequence([
      // Background fade in
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Logo entrance with spring
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      // Title slides up
      Animated.parallel([
        Animated.spring(titleSlide, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Subtitle and progress bar fade in
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Continuous breathing glow on logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Shimmer sweep
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Progress bar animation
    Animated.timing(progressAnim, { toValue: 1, duration: 3000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    // Rotating rings
    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(ring2Rotate, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Floating orbs with different speeds
    const floatOrb = (anim, duration) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    };
    floatOrb(orb1Anim, 3000);
    floatOrb(orb2Anim, 4000);
    floatOrb(orb3Anim, 3500);
    floatOrb(orb4Anim, 5000);
  }, []);

  const ringSpin = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ring2Spin = ring2Rotate.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const shimmerTranslate = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });

  return (
    <View style={loadingStyles.container}>
      <LinearGradient
        colors={['#FFF9F0', '#FFF5EB', '#FEF0E0', '#FFF5EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={loadingStyles.gradient}
      />

      {/* Animated floating orbs */}
      <Animated.View style={[loadingStyles.orb, { top: '8%', left: '-10%', width: 220, height: 220, backgroundColor: 'rgba(251, 191, 36, 0.08)', transform: [{ translateY: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -25] }) }, { scale: orb1Anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] }) }] }]} />
      <Animated.View style={[loadingStyles.orb, { top: '55%', right: '-12%', width: 180, height: 180, backgroundColor: 'rgba(249, 115, 22, 0.07)', transform: [{ translateY: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
      <Animated.View style={[loadingStyles.orb, { bottom: '12%', left: '5%', width: 130, height: 130, backgroundColor: 'rgba(234, 88, 12, 0.06)', transform: [{ translateX: orb3Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }) }] }]} />
      <Animated.View style={[loadingStyles.orb, { top: '30%', right: '5%', width: 90, height: 90, backgroundColor: 'rgba(251, 191, 36, 0.1)', transform: [{ translateY: orb4Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }]} />

      <Animated.View style={[loadingStyles.content, { opacity: fadeAnim }]}>
        {/* Rotating decorative rings */}
        <View style={loadingStyles.ringsContainer}>
          <Animated.View style={[loadingStyles.ring, loadingStyles.ring1, { transform: [{ rotate: ringSpin }] }]} />
          <Animated.View style={[loadingStyles.ring, loadingStyles.ring2, { transform: [{ rotate: ring2Spin }] }]} />
          
          {/* Logo with breathing pulse */}
          <Animated.View style={[loadingStyles.logoWrapper, { transform: [{ scale: Animated.multiply(logoScale, breatheAnim) }], opacity: logoOpacity }]}>
            {/* Soft glow behind logo */}
            <View style={loadingStyles.logoGlow} />
            <View style={loadingStyles.logoInner}>
              <Image
                source={require('../../assets/logo.png')}
                style={loadingStyles.logo}
                resizeMode="contain"
              />
              {/* Shimmer overlay */}
              <Animated.View style={[loadingStyles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]} />
            </View>
          </Animated.View>
        </View>

        {/* App name with slide-up entrance */}
        <Animated.View style={{ transform: [{ translateY: titleSlide }], opacity: titleOpacity }}>
          <Text style={loadingStyles.appName}>Biblely</Text>
        </Animated.View>

        {/* Elegant progress bar */}
        <Animated.View style={[loadingStyles.progressContainer, { opacity: subtitleOpacity }]}>
          <View style={loadingStyles.progressTrack}>
            <Animated.View style={[loadingStyles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
              <LinearGradient
                colors={['#F59E0B', '#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 4 }}
              />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text style={[loadingStyles.loadingText, { opacity: subtitleOpacity }]}>
          Preparing your journey
        </Animated.Text>
      </Animated.View>
    </View>
  );
};

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  ringsContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  ring1: {
    width: 180,
    height: 180,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    borderStyle: 'dashed',
  },
  ring2: {
    width: 210,
    height: 210,
    borderColor: 'rgba(251, 191, 36, 0.1)',
    borderStyle: 'dotted',
    borderWidth: 1,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  logoInner: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    width: 90,
    height: 90,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 32,
    letterSpacing: 2,
  },
  progressContainer: {
    width: '70%',
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});

const RootNavigator = () => {
  const { theme, isDark } = useTheme();
  const { isAuthenticated, initializing, userProfile, signOut } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  // Check onboarding status when auth state changes
  useEffect(() => {
    const checkOnboarding = async () => {
      if (isAuthenticated) {
        // Small delay to allow sign-in process to complete setting onboardingCompleted
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If user has no displayName or username, account creation was incomplete
        // Sign them out so they can start fresh
        if (!userProfile?.displayName && !userProfile?.username) {
          console.log('[RootNavigator] No displayName/username found - signing out incomplete account');
          try {
            await signOut();
          } catch (e) {
            console.warn('[RootNavigator] Error signing out incomplete account:', e);
          }
          setCheckingOnboarding(false);
          return;
        }
        
        const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        console.log('[RootNavigator] onboardingCompleted:', onboardingCompleted);
        setNeedsOnboarding(onboardingCompleted !== 'true');
      } else {
        setNeedsOnboarding(null);
      }
      setCheckingOnboarding(false);
    };
    
    if (!initializing) {
      setCheckingOnboarding(true); // Reset while checking
      checkOnboarding();
    }
  }, [isAuthenticated, initializing, userProfile]);
  
  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    setNeedsOnboarding(false);
  };
  
  // Show beautiful loading screen while checking auth/onboarding state
  if (initializing || checkingOnboarding) {
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
      
      {/* Start Workout Screen */}
      <Stack.Screen 
        name="StartWorkout" 
        component={StartWorkoutScreen}
        options={{
          animation: 'slide_from_right',
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
