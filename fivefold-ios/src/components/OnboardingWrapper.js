import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import userStorage from '../utils/userStorage';
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
      let onboardingCompleted = await userStorage.getRaw('onboardingCompleted');
      console.log('Onboarding status (local):', onboardingCompleted);
      
      // If not completed locally, wait for iCloud sync to potentially restore data
      if (onboardingCompleted !== 'true') {
        console.log('Checking iCloud for existing account...');
        
        // Wait for iCloud service to be available and sync
        // Poll every 500ms for up to 5 seconds
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          attempts++;
          console.log(`iCloud check attempt ${attempts}/${maxAttempts}...`);
          
          // Wait a bit for sync to happen
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if we now have data from iCloud
          onboardingCompleted = await userStorage.getRaw('onboardingCompleted');
          const userProfile = await userStorage.getRaw('userProfile');
          const userName = await userStorage.getRaw('userName');
          
          console.log(`Attempt ${attempts} - onboarding: ${onboardingCompleted}, profile: ${!!userProfile}, name: ${!!userName}`);
          
          // If we found a profile or onboarding completed, we're done
          if (onboardingCompleted === 'true' || userProfile || userName) {
            console.log('Found existing account data from iCloud');
            
            // Mark onboarding complete if we have user data
            if (userProfile || userName) {
              await userStorage.setRaw('onboardingCompleted', 'true');
              onboardingCompleted = 'true';
            }
            break;
          }
          
          // If iCloud service says it's not syncing anymore, stop waiting
          if (iCloudSyncService.isAvailable && !iCloudSyncService.isSyncing && attempts >= 4) {
            console.log('iCloud sync completed, no existing account found');
            break;
          }
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
      await userStorage.setRaw('onboardingCompleted', 'true');
      
      // Sync to iCloud so other devices know onboarding is done
      if (iCloudSyncService.isAvailable) {
        await iCloudSyncService.syncToCloud('onboardingCompleted', 'true');
        
        // Also sync the user profile
        const userProfile = await userStorage.getRaw('userProfile');
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
