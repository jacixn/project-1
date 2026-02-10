import { NativeModules, Platform } from 'react-native';
import userStorage from './userStorage';

export const restartApp = async () => {
  try {
    // Clear the onboarding flag to force onboarding to show
    await userStorage.remove('onboardingCompleted');
    
    // For development, we can use DevSettings to reload
    if (__DEV__) {
      if (Platform.OS === 'ios') {
        NativeModules.DevSettings?.reload?.();
      } else {
        NativeModules.DevSettings?.reload?.();
      }
      return true;
    }
    
    // For production builds, we need to restart differently
    // This will require the app to be force-closed and reopened manually
    // as React Native doesn't support true app restart in production
    
    return false; // Indicates manual restart needed
  } catch (error) {
    console.error('Failed to restart app:', error);
    return false;
  }
};

export const forceShowOnboarding = async () => {
  try {
    // Clear onboarding and force the wrapper to re-check
    await userStorage.remove('onboardingCompleted');
    
    // Trigger a custom event that the OnboardingWrapper can listen to
    if (global.onboardingRestartCallback) {
      global.onboardingRestartCallback();
    }
    
    return true;
  } catch (error) {
    console.error('Failed to force onboarding:', error);
    return false;
  }
};









