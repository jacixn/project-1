import AsyncStorage from '@react-native-async-storage/async-storage';
import userStorage from './userStorage';
import { Alert } from 'react-native';

export const resetOnboardingForTesting = async () => {
  try {
    // Clear onboarding completion flag
    await userStorage.remove('onboardingCompleted');
    
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
    
    // Get all keys and clear any user-related data (raw keys include UID scope)
    const allKeys = await AsyncStorage.getAllKeys();
    const allKeysToRemove = allKeys.filter(key => 
      keysToRemove.some(k => key.endsWith(':' + k) || key === k) || 
      key.includes('fivefold_') ||
      key.includes('prayer') ||
      key.includes('todo') ||
      key.includes('completion') ||
      key.includes('user') ||
      key.includes('profile')
    );
    
    if (allKeysToRemove.length > 0) {
      // Use raw AsyncStorage since keys are already fully qualified (UID-scoped)
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
    await userStorage.remove('onboardingCompleted');
    console.log('✅ Onboarding flag cleared - will show on next app restart');
    return true;
  } catch (error) {
    console.error('❌ Error clearing onboarding flag:', error);
    return false;
  }
};

export const deleteAccountCompletely = async (password = null) => {
  try {
    console.log('[Delete] Starting complete account deletion...');
    
    // Import Firebase modules
    const { auth, db } = await import('../config/firebase');
    const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
    const { deleteUser, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
    
    const currentUser = auth.currentUser;
    
    // Delete Firebase data if user is signed in
    if (currentUser) {
      console.log('[Delete] Deleting Firebase data for user:', currentUser.uid);
      console.log('[Delete] User email:', currentUser.email);
      console.log('[Delete] Password provided:', !!password);
      
      try {
        // Re-authenticate BEFORE any deletions (required by Firebase for account deletion)
        if (!password) {
          console.log('[Delete] No password provided');
          throw new Error('PASSWORD_REQUIRED');
        }
        
        if (!currentUser.email) {
          console.log('[Delete] No email on account - may be OAuth user');
          throw new Error('NO_EMAIL');
        }
        
        // Create credential and re-authenticate
        console.log('[Delete] Creating credential for:', currentUser.email);
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        
        console.log('[Delete] Attempting re-authentication...');
        await reauthenticateWithCredential(currentUser, credential);
        console.log('[Delete] Re-authenticated successfully');
        
        // Get user's username to delete from usernames collection
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Delete username reservation
          if (userData.username) {
            await deleteDoc(doc(db, 'usernames', userData.username));
            console.log('[Delete] Deleted username:', userData.username);
          }
        }
        
        // Delete user document
        await deleteDoc(doc(db, 'users', currentUser.uid));
        console.log('[Delete] Deleted user document');
        
        // Delete friends document
        try {
          await deleteDoc(doc(db, 'friends', currentUser.uid));
          console.log('[Delete] Deleted friends document');
        } catch (e) {
          console.log('[Delete] No friends document to delete');
        }
        
        // Delete the Firebase Auth account
        await deleteUser(currentUser);
        console.log('[Delete] Deleted Firebase Auth account');
        
      } catch (firebaseError) {
        console.error('[Delete] Firebase deletion error:', firebaseError);
        console.error('[Delete] Error code:', firebaseError.code);
        console.error('[Delete] Error message:', firebaseError.message);
        
        // Handle specific error cases
        if (firebaseError.message === 'PASSWORD_REQUIRED') {
          throw new Error('PASSWORD_REQUIRED');
        }
        if (firebaseError.message === 'NO_EMAIL') {
          throw new Error('NO_EMAIL');
        }
        if (firebaseError.code === 'auth/requires-recent-login') {
          throw new Error('WRONG_PASSWORD');
        }
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          throw new Error('WRONG_PASSWORD');
        }
        if (firebaseError.code === 'auth/too-many-requests') {
          throw new Error('TOO_MANY_ATTEMPTS');
        }
        // Re-throw other errors
        throw firebaseError;
      }
    }
    
    // Clear all local data
    console.log('[Delete] Clearing local data...');
    
    // Get all stored keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('[Delete] Found keys:', allKeys.length);
    
    // Filter out system keys and only remove app-specific data
    const systemKeys = ['@RNC_AsyncStorage_'];
    const appKeysToRemove = allKeys.filter(key => 
      !systemKeys.some(systemKey => key.startsWith(systemKey))
    );
    
    // Remove all app data (raw keys are already fully qualified)
    if (appKeysToRemove.length > 0) {
      await AsyncStorage.multiRemove(appKeysToRemove);
      console.log('[Delete] Removed local keys:', appKeysToRemove.length);
    }
    
    console.log('[Delete] Account deletion complete');
    
    // The app will automatically redirect to auth screen since user is now signed out
    return true;
  } catch (error) {
    console.error('[Delete] Complete account deletion failed:', error);
    // Re-throw known errors for UI handling
    if (['PASSWORD_REQUIRED', 'NO_EMAIL', 'WRONG_PASSWORD', 'TOO_MANY_ATTEMPTS'].includes(error.message)) {
      throw error;
    }
    return false;
  }
};