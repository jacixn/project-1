import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingFlow from './OnboardingFlow';
import { useTheme } from '../contexts/ThemeContext';
import iCloudSyncService from '../services/iCloudSyncService';

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
      // First check local storage
      let onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      console.log('Onboarding status (local):', onboardingCompleted);
      
      // If not completed locally, wait for iCloud sync to potentially restore data
      if (onboardingCompleted !== 'true') {
        console.log('Checking iCloud for existing account...');
        
        // Wait for iCloud sync to complete (it may have already run)
        // Give it a moment to sync data from cloud
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Check again after sync
        onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
        const userProfile = await AsyncStorage.getItem('userProfile');
        
        console.log('Onboarding status (after iCloud):', onboardingCompleted);
        console.log('User profile exists:', !!userProfile);
        
        // If we found a profile from iCloud, mark onboarding complete
        if (userProfile && onboardingCompleted !== 'true') {
          console.log('Found existing profile from iCloud, skipping onboarding');
          await AsyncStorage.setItem('onboardingCompleted', 'true');
          onboardingCompleted = 'true';
        }
      }
      
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
      
      // Sync to iCloud so other devices know onboarding is done
      if (iCloudSyncService.isAvailable) {
        await iCloudSyncService.syncToCloud('onboardingCompleted', 'true');
        
        // Also sync the user profile
        const userProfile = await AsyncStorage.getItem('userProfile');
        if (userProfile) {
          await iCloudSyncService.syncToCloud('userProfile', JSON.parse(userProfile));
        }
      }
      
      console.log('Onboarding completed and synced');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
      setShowOnboarding(false); // Still proceed even if save fails
    }
  };

  // Show loading state while checking - use white as fallback to be visible
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme?.background || '#FFFFFF' }]} />
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
