import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingFlow from './OnboardingFlow';
import { useTheme } from '../contexts/ThemeContext';

const OnboardingWrapper = ({ children }) => {
  const { theme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
    
    // Set up global callback for forced restart
    global.onboardingRestartCallback = () => {
      setShowOnboarding(true);
      setIsLoading(false);
    };
    
    return () => {
      // Cleanup global callback
      delete global.onboardingRestartCallback;
    };
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      console.log('🎯 Onboarding status:', onboardingCompleted);
      
      if (onboardingCompleted !== 'true') {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // If we can't check, assume onboarding is needed for new users
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      console.log('✅ Onboarding completed and saved');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
      setShowOnboarding(false); // Still proceed even if save fails
    }
  };

  // Show loading state while checking
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]} />
    );
  }

  // Show onboarding if needed
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Show main app
  return children;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
});

export default OnboardingWrapper;
