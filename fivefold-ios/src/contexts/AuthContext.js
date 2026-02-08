/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles user session persistence and auth state changes.
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

// Create the context
const AuthContext = createContext(null);

// Local storage key for user data cache
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

  // Load cached user data on mount
  useEffect(() => {
    const loadCachedUser = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setUserProfile(parsed);
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
          // First, try to use cached profile (fast, no Firestore read)
          const cachedData = await AsyncStorage.getItem(USER_CACHE_KEY);
          if (cachedData) {
            const cachedProfile = JSON.parse(cachedData);
            setUserProfile(cachedProfile);
            console.log('[Auth] Using cached profile:', cachedProfile.username);
            
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
              await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
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
            
            // Sync data once per session (runs in background)
            console.log('[Auth] Background syncing user data...');
            await performFullSync(firebaseUser.uid);
            console.log('[Auth] Background sync complete');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setInitializing(false);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        hasCompletedInitialSync = false;
        await AsyncStorage.removeItem(USER_CACHE_KEY);
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
      // CRITICAL: Clear onboarding flag so new user ALWAYS sees onboarding
      await AsyncStorage.removeItem('onboardingCompleted');
      console.log('[Auth] Cleared onboardingCompleted for new user signup');
      
      // Step 1: Create account
      const result = await authSignUp({ email, password, username, displayName });
      markDone(0);
      
      // Step 2: Set up profile
      if (result && result.uid) {
        const profile = await getUserProfile(result.uid);
        if (profile) {
          setUserProfile(profile);
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
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
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(fallbackProfile));
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
      setUserProfile(result);
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(result));
      markDone(0);
      
      // CRITICAL: Skip onboarding for existing users IMMEDIATELY
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      console.log('[Auth] Skipping onboarding for returning user (set immediately)');
      
      // Step 2: Download cloud data
      const { downloadAndMergeCloudData } = await import('../services/userSyncService');
      if (result && result.uid) {
        await downloadAndMergeCloudData(result.uid);
        console.log('[Auth] Downloaded cloud data after sign in');
      }
      // Re-set onboarding flag in case download overwrote it
      await AsyncStorage.setItem('onboardingCompleted', 'true');
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
      setAuthSteps(null);
      setLoading(false);
    }
  }, []);

  /**
   * Sign out the current user
   * Syncs data to cloud first, then clears local data to prevent data leakage between accounts
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
      
      // Clear user cache
      await AsyncStorage.removeItem(USER_CACHE_KEY);
      
      // Clear user-specific data to prevent data sharing between accounts
      // These are the keys that should be unique per user
      const userSpecificKeys = [
        // CRITICAL: Onboarding flag - must clear so new user sees onboarding
        'onboardingCompleted',
        // Saved content
        'savedBibleVerses',
        'fivefold_savedBibleVerses',
        'journalNotes',
        'bookmarks',
        // Verse data (highlights stored here by VerseDataManager)
        'verse_data',
        'highlight_names',
        'reading_streaks',
        // User preferences (theme, settings)
        'fivefold_theme',
        'fivefold_dark_mode',
        'fivefold_wallpaper_index',
        'selectedBibleVersion',
        'selectedLanguage',
        'weightUnit',
        // User stats
        'userStats',
        'fivefold_userStats',
        'userProfile',
        'fivefold_userProfile',
        'total_points',
        // Prayer/workout history
        'prayerHistory',
        'workoutHistory',
        'quizHistory',
        'prayer_completions',
        'prayer_preferences',
        // User prayers (custom prayer data - the prayers shown on Bible tab)
        'userPrayers',
        'fivefold_userPrayers',
        'customPrayerNames',
        'customPrayerTimes',
        'prayers',
        'fivefold_prayers',
        'simplePrayers',
        'fivefold_simplePrayers',
        // Hub posting tokens - DO NOT CLEAR on sign-out
        // These are synced to cloud and will be overwritten when new user signs in
        // Clearing them causes race condition where new schedule is created before cloud data downloads
        // 'hub_posting_token',
        // 'hub_token_schedule',
        // 'hub_token_last_delivery',
        // Scheduled workouts
        '@scheduled_workouts',
        // Reading progress
        'readingProgress',
        'currentReadingPlan',
        // Verse of the day (actual keys used by dailyVerse.js)
        'daily_verse_data_v6',
        'daily_verse_index_v6',
        'shuffled_verses_v6',
        'daily_verse_last_update_v6',
        // App streak (user-specific) - BOTH keys used by AppStreakManager
        'app_streak_data',
        'app_open_streak',
        'app_open_dates',
        // Onboarding selections
        'userPainPoint',
        'userAttribution',
        // Token notification flag
        'hub_token_notification_sent',
        'hub_posting_token',
        'hub_token_schedule',
        'hub_token_last_delivery',
        // Tasks/Todos
        'todos',
        'fivefold_todos',
        'completedTodos',
        // Notifications
        'notificationPreferences',
        // Bible maps data
        'bible_maps_bookmarks',
        'bible_maps_visited',
        // Bible fast facts
        'bible_fast_facts_favorites',
        // Recent searches
        'recentBibleSearches',
        // Friend chat history
        'friendChatHistory',
        // Key Verses favorites
        'fivefold_favoriteVerses',
      ];
      
      await AsyncStorage.multiRemove(userSpecificKeys);
      console.log('[Auth] Cleared user-specific data on sign out');
      
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
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
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
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(updatedProfile));
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
