/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles user session persistence and auth state changes.
 * 
 * All user-specific local data is now UID-scoped via userStorage,
 * so data from one account can never leak into another.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getCurrentUser,
  getUserProfile,
  onAuthStateChange,
  getAuthErrorMessage,
  checkUsernameAvailability,
} from '../services/authService';
import { performFullSync } from '../services/userSyncService';
import { savePushToken } from '../services/socialNotificationService';
import notificationService from '../services/notificationService';
import userStorage from '../utils/userStorage';

// Create the context
const AuthContext = createContext(null);

// Local storage key for user data cache (UID-scoped via userStorage)
const USER_CACHE_KEY = '@biblely_user_cache';

/**
 * Auth Provider Component
 * Wraps the app and provides auth state to all children
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  // Tracks sign-in/sign-up progress steps for loading UI
  const [authSteps, setAuthSteps] = useState(null);
  // { type: 'signin'|'signup', steps: [{label, done}], current: number }
  
  // Flag: when true, onAuthStateChanged MUST NOT run performFullSync
  // because the signIn/signUp flow handles its own sync after clearing stale data.
  const isAuthFlowActive = React.useRef(false);

  // Load cached user data on mount
  useEffect(() => {
    const loadCachedUser = async () => {
      try {
        // Try to load user cache — we need to know the UID first to scope reads.
        // On cold start, Firebase Auth persistence already knows the user, but
        // we don't have the UID yet. Use a raw AsyncStorage scan for the cache key.
        // The onAuthStateChanged listener will handle proper scoped loading.
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKey = allKeys.find(k => k.endsWith(':' + USER_CACHE_KEY));
        if (cacheKey) {
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            setUserProfile(parsed);
            // Extract UID from the scoped key (format: u:{uid}:{key})
            const uid = cacheKey.split(':')[1];
            if (uid) {
              await userStorage.initUser(uid);
            }
          }
        }
      } catch (error) {
        console.error('Error loading cached user:', error);
      }
    };
    loadCachedUser();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    let hasCompletedInitialSync = false;
    
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Ensure userStorage is initialised for this UID
          await userStorage.initUser(firebaseUser.uid);
          
          // First, try to use cached profile (fast, no Firestore read)
          const cachedData = await userStorage.get(USER_CACHE_KEY);
          if (cachedData) {
            setUserProfile(cachedData);
            console.log('[Auth] Using cached profile:', cachedData.username);
            
            // IMMEDIATELY unblock the app - don't wait for sync
            setInitializing(false);
            setLoading(false);
          }
          
          // Only do full sync on FRESH login (not every app open)
          // This runs in the BACKGROUND after the app is already showing
          if (!hasCompletedInitialSync) {
            hasCompletedInitialSync = true;
            
            // Fetch user profile from Firestore (once per session, in background)
            let profile = await getUserProfile(firebaseUser.uid);
            
            // If profile doesn't exist or has no username, retry after a short delay
            // This handles the race condition during signup
            if (!profile || !profile.username) {
              console.log('[Auth] Profile not found or incomplete, retrying...');
              await new Promise(resolve => setTimeout(resolve, 1500));
              profile = await getUserProfile(firebaseUser.uid);
            }
            
            if (profile) {
              setUserProfile(profile);
              await userStorage.set(USER_CACHE_KEY, profile);
              console.log('[Auth] Profile loaded from Firestore:', profile.username);
            }
            
            // If we had no cache, NOW unblock the app (first-time login)
            setInitializing(false);
            setLoading(false);
            
            // Everything below happens in background - user is already in the app
            
            // Save push token for notifications
            try {
              const pushToken = await notificationService.getPushToken();
              if (pushToken && pushToken !== 'simulator-token' && pushToken !== 'development-token') {
                await savePushToken(firebaseUser.uid, pushToken);
                console.log('[Auth] Push token saved for notifications');
              }
            } catch (tokenError) {
              console.warn('[Auth] Failed to save push token:', tokenError);
            }
            
            // ONLY sync if signIn/signUp is NOT actively running.
            // Those flows clear stale data first and do their own download/sync.
            // Running performFullSync here in parallel would race with the clear
            // and push the OLD user's data into the NEW user's Firestore doc.
            if (isAuthFlowActive.current) {
              console.log('[Auth] Skipping background sync — auth flow is handling it');
            } else {
              console.log('[Auth] Background syncing user data...');
              await performFullSync(firebaseUser.uid);
              console.log('[Auth] Background sync complete');
            }
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setInitializing(false);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        hasCompletedInitialSync = false;
        userStorage.clearUser();
        setInitializing(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign up a new user
   */
  const signUp = useCallback(async ({ email, password, username, displayName }) => {
    setLoading(true);
    isAuthFlowActive.current = true; // Prevent onAuthStateChanged from syncing
    const steps = [
      { label: 'Creating your account', done: false },
      { label: 'Setting up your profile', done: false },
      { label: 'Preparing onboarding', done: false },
    ];
    setAuthSteps({ type: 'signup', steps: [...steps], current: 0 });

    const markDone = (index) => {
      steps[index].done = true;
      const next = index + 1 < steps.length ? index + 1 : -1;
      setAuthSteps({ type: 'signup', steps: [...steps], current: next });
    };

    try {
      // Step 1: Create account
      const result = await authSignUp({ email, password, username, displayName });
      markDone(0);
      
      // Initialise UID-scoped storage for the brand-new user
      // (no migration needed — this is a fresh account)
      if (result?.uid) {
        await userStorage.initUser(result.uid);
      }
      
      // Step 2: Set up profile
      if (result && result.uid) {
        const profile = await getUserProfile(result.uid);
        if (profile) {
          setUserProfile(profile);
          await userStorage.set(USER_CACHE_KEY, profile);
          console.log('[Auth] Set user profile after signup:', profile.username);
        } else {
          const fallbackProfile = {
            uid: result.uid,
            email: result.email,
            username: result.username,
            displayName: result.displayName,
            totalPoints: 0,
            currentStreak: 0,
            level: 1,
          };
          setUserProfile(fallbackProfile);
          await userStorage.set(USER_CACHE_KEY, fallbackProfile);
          console.log('[Auth] Set fallback profile after signup');
        }
      }
      markDone(1);
      
      // Step 3: Ready for onboarding
      markDone(2);
      
      // Brief pause so user sees completion
      await new Promise(r => setTimeout(r, 600));
      
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      isAuthFlowActive.current = false; // Allow background sync again
      setAuthSteps(null);
      setLoading(false);
    }
  }, []);

  /**
   * Sign in an existing user
   * Downloads cloud data to local storage
   * Skips onboarding for returning users
   */
  const signIn = useCallback(async (email, password) => {
    setLoading(true);
    isAuthFlowActive.current = true; // Prevent onAuthStateChanged from syncing
    const steps = [
      { label: 'Verifying credentials', done: false },
      { label: 'Downloading your data', done: false },
      { label: 'Setting up notifications', done: false },
      { label: 'Preparing your experience', done: false },
    ];
    setAuthSteps({ type: 'signin', steps: [...steps], current: 0 });

    const markDone = (index) => {
      steps[index].done = true;
      const next = index + 1 < steps.length ? index + 1 : -1;
      setAuthSteps({ type: 'signin', steps: [...steps], current: next });
    };

    try {
      // Step 1: Verify credentials
      const result = await authSignIn(email, password);
      markDone(0);
      
      // Initialise UID-scoped storage for this user.
      // If this UID already has data on this device, initUser is a no-op.
      // If another user was signed in before, their data is safely under their own UID prefix.
      if (result?.uid) {
        await userStorage.initUser(result.uid);
      }

      setUserProfile(result);
      await userStorage.set(USER_CACHE_KEY, result);
      
      // Pre-set onboarding completed for returning users
      await userStorage.setRaw('onboardingCompleted', 'true');
      console.log('[Auth] Pre-set onboardingCompleted for returning user');
      
      // Step 2: Download cloud data into local state
      const { downloadAndMergeCloudData } = await import('../services/userSyncService');
      if (result && result.uid) {
        await downloadAndMergeCloudData(result.uid);
        console.log('[Auth] Downloaded cloud data after sign in');
      }
      // Re-set onboarding flag in case download overwrote it
      await userStorage.setRaw('onboardingCompleted', 'true');
      markDone(1);
      
      // Step 3: Set up notifications
      if (result && result.uid) {
        try {
          const pushToken = await notificationService.getPushToken();
          if (pushToken && pushToken !== 'simulator-token' && pushToken !== 'development-token') {
            await savePushToken(result.uid, pushToken);
            console.log('[Auth] Push token saved after sign in');
          }
        } catch (tokenError) {
          console.warn('[Auth] Failed to save push token:', tokenError);
        }
      }
      markDone(2);
      
      // Step 4: Prepare experience
      if (result && result.uid) {
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('userDataDownloaded');
        console.log('[Auth] Emitted userDataDownloaded event');
      }
      markDone(3);
      
      // Brief pause so user sees the completion checkmarks
      await new Promise(r => setTimeout(r, 600));
      
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      isAuthFlowActive.current = false; // Allow background sync again
      setAuthSteps(null);
      setLoading(false);
    }
  }, []);

  /**
   * Sign out the current user
   * Syncs data to cloud first, then clears the active UID.
   * Data stays safely namespaced in AsyncStorage under the old UID prefix.
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // IMPORTANT: Upload all data to cloud BEFORE signing out (while we still have user ID)
      if (user?.uid) {
        try {
          console.log('[Auth] Uploading data to cloud before sign out...');
          const { 
            syncSavedVersesToCloud, 
            syncJournalNotesToCloud, 
            syncThemePreferencesToCloud, 
            syncAllHistoryToCloud,
            syncUserStatsToCloud,
            syncPrayersToCloud 
          } = await import('../services/userSyncService');
          
          // Upload all data to cloud (DO NOT download - that would overwrite local data)
          await syncUserStatsToCloud(user.uid);
          await syncSavedVersesToCloud(user.uid);
          await syncJournalNotesToCloud(user.uid);
          await syncPrayersToCloud(user.uid);
          await syncThemePreferencesToCloud(user.uid);
          await syncAllHistoryToCloud(user.uid);
          
          console.log('[Auth] Data uploaded to cloud successfully');
        } catch (syncError) {
          console.error('[Auth] Failed to upload before sign out:', syncError);
          // Continue with sign out even if sync fails
        }
      }
      
      // Cancel any scheduled token notifications before signing out
      // This prevents old notifications from firing for the next user
      try {
        const Notifications = require('expo-notifications');
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduledNotifications) {
          if (notification.content.data?.type === 'token_arrived') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            console.log('[Auth] Cancelled token notification:', notification.identifier);
          }
        }
      } catch (notifError) {
        console.log('[Auth] Error cancelling notifications:', notifError);
      }
      
      // Now sign out
      await authSignOut();
      setUser(null);
      setUserProfile(null);
      
      // Forget active user — data stays safely under u:{uid}: prefix
      userStorage.clearUser();
      console.log('[Auth] Signed out — UID-scoped data preserved safely');
      
      // Clean up local profile images
      try {
        const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        const profilePics = files.filter(f => f.startsWith('profile_'));
        for (const pic of profilePics) {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${pic}`, { idempotent: true });
        }
        console.log('[Auth] Cleared local profile images');
      } catch (fileError) {
        console.log('[Auth] Profile image cleanup note:', fileError.message);
      }
      
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Send password reset email
   */
  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    try {
      await authResetPassword(email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh the user profile from Firestore
   */
  const refreshUserProfile = useCallback(async () => {
    if (!user) return null;
    
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setUserProfile(profile);
        await userStorage.set(USER_CACHE_KEY, profile);
      }
      return profile;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      return null;
    }
  }, [user]);

  /**
   * Update the local user profile state
   * (used after syncing data to Firestore)
   */
  const updateLocalProfile = useCallback(async (updates) => {
    if (!userProfile) return;
    
    const updatedProfile = { ...userProfile, ...updates };
    setUserProfile(updatedProfile);
    await userStorage.set(USER_CACHE_KEY, updatedProfile);
  }, [userProfile]);

  const value = {
    // State
    user,
    userProfile,
    loading,
    initializing,
    isAuthenticated: !!user,
    authSteps,
    
    // Methods
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshUserProfile,
    updateLocalProfile,
    checkUsernameAvailability,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use the auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
