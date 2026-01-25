/**
 * Root Navigator
 * 
 * Handles the main navigation flow:
 * 1. Not authenticated → Auth screen
 * 2. Authenticated + new signup → Onboarding
 * 3. Authenticated + returning user → Main app
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  
  // Show loading screen while checking auth/onboarding state
  if (initializing || checkingOnboarding) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
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
