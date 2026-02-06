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
import SimpleOnboarding from '../components/SimpleOnboarding';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

// Beautiful animated loading screen
const AnimatedLoadingScreen = () => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Gentle continuous rotation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Bouncing dots
    const animateDot = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dotAnim1, 0);
    animateDot(dotAnim2, 150);
    animateDot(dotAnim3, 300);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={loadingStyles.container}>
      <LinearGradient
        colors={['#FFF8F0', '#FEF3E7', '#FFF5EB']}
        style={loadingStyles.gradient}
      />
      
      {/* Floating orbs background */}
      <Animated.View style={[loadingStyles.orb, loadingStyles.orb1, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }) }]} />
      <Animated.View style={[loadingStyles.orb, loadingStyles.orb2, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] }) }]} />
      <Animated.View style={[loadingStyles.orb, loadingStyles.orb3, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }) }]} />

      <Animated.View style={[loadingStyles.content, { opacity: fadeAnim }]}>
        {/* Logo with spin and pulse */}
        <Animated.View style={[
          loadingStyles.logoContainer,
          {
            transform: [
              { rotate: spin },
              { scale: pulseAnim },
            ],
          }
        ]}>
          {/* Glow effect behind logo */}
          <Animated.View style={[
            loadingStyles.logoGlow,
            { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }) }
          ]} />
          <Image
            source={require('../../assets/logo.png')}
            style={loadingStyles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App name */}
        <Text style={loadingStyles.appName}>Biblely</Text>

        {/* Loading dots */}
        <View style={loadingStyles.dotsContainer}>
          <Animated.View style={[
            loadingStyles.dot,
            { transform: [{ translateY: dotAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }
          ]} />
          <Animated.View style={[
            loadingStyles.dot,
            { transform: [{ translateY: dotAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }
          ]} />
          <Animated.View style={[
            loadingStyles.dot,
            { transform: [{ translateY: dotAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }
          ]} />
        </View>

        <Text style={loadingStyles.loadingText}>Preparing your journey...</Text>
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    top: '10%',
    left: '-20%',
  },
  orb2: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    top: '60%',
    right: '-15%',
  },
  orb3: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    bottom: '15%',
    left: '10%',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
  },
  logo: {
    width: 180,
    height: 180,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 30,
    letterSpacing: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F97316',
  },
  loadingText: {
    fontSize: 14,
    color: '#78716C',
    fontWeight: '500',
  },
});

const RootNavigator = () => {
  const { theme, isDark } = useTheme();
  const { isAuthenticated, initializing } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  
  // Check onboarding status when auth state changes
  useEffect(() => {
    const checkOnboarding = async () => {
      if (isAuthenticated) {
        // Small delay to allow sign-in process to complete setting onboardingCompleted
        await new Promise(resolve => setTimeout(resolve, 500));
        
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
  }, [isAuthenticated, initializing]);
  
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
