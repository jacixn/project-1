import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const resetOnboardingForTesting = async () => {
  try {
    // Clear onboarding completion flag
    await AsyncStorage.removeItem('onboardingCompleted');
    
    // Clear all user data for completely fresh start
    const keysToRemove = [
      'userProfile',
      'todos',
      'completedTodos',
      'prayerCompletions',
      'customPrayerNames',
      'customPrayerTimes',
      'achievements',
      'userStats',
      'readingProgress',
      'chatHistory',
      'notificationSettings',
      'appSettings',
      'app_language',
      'theme_preference',
      'wallpaper_preference',
      'smart_features_enabled'
    ];
    
    // Get all keys and clear any fivefold-related data
    const allKeys = await AsyncStorage.getAllKeys();
    const allKeysToRemove = allKeys.filter(key => 
      keysToRemove.includes(key) || 
      key.startsWith('fivefold_') ||
      key.includes('prayer') ||
      key.includes('todo') ||
      key.includes('completion') ||
      key.includes('user') ||
      key.includes('profile')
    );
    
    if (allKeysToRemove.length > 0) {
      await AsyncStorage.multiRemove(allKeysToRemove);
    }
    
    console.log('✅ Account deleted - all user data cleared:', allKeysToRemove);
    
    // Trigger onboarding restart if callback exists
    if (global.onboardingRestartCallback) {
      console.log('🔄 Triggering onboarding restart...');
      global.onboardingRestartCallback();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    return false;
  }
};

export const forceShowOnboarding = async () => {
  try {
    await AsyncStorage.removeItem('onboardingCompleted');
    console.log('✅ Onboarding flag cleared - will show on next app restart');
    return true;
  } catch (error) {
    console.error('❌ Error clearing onboarding flag:', error);
    return false;
  }
};

export const deleteAccountCompletely = async () => {
  try {
    console.log('🗑️ Starting complete account deletion...');
    
    // Clear onboarding completion flag first
    await AsyncStorage.removeItem('onboardingCompleted');
    
    // Get all stored keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📋 Found keys:', allKeys);
    
    // Filter out system keys and only remove app-specific data
    const systemKeys = ['@RNC_AsyncStorage_'];
    const appKeysToRemove = allKeys.filter(key => 
      !systemKeys.some(systemKey => key.startsWith(systemKey))
    );
    
    // Remove all app data
    if (appKeysToRemove.length > 0) {
      await AsyncStorage.multiRemove(appKeysToRemove);
      console.log('🧹 Removed keys:', appKeysToRemove);
    }
    
    // Force trigger onboarding restart
    console.log('🔄 Triggering app restart to onboarding...');
    
    // Use a timeout to ensure the deletion completes before restart
    setTimeout(() => {
      if (global.onboardingRestartCallback) {
        global.onboardingRestartCallback();
      } else {
        console.warn('⚠️ No onboarding restart callback found');
      }
    }, 500);
    
    return true;
  } catch (error) {
    console.error('❌ Complete account deletion failed:', error);
    return false;
  }
};