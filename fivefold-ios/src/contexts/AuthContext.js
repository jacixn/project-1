/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the app.
 * Handles user session persistence and auth state changes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore with retry logic
          // This handles the race condition during signup where the profile
          // might not be written to Firestore yet
          let profile = await getUserProfile(firebaseUser.uid);
          
          // If profile doesn't exist or has no username, retry after a short delay
          // This can happen during signup when the auth state changes before Firestore write completes
          if (!profile || !profile.username) {
            console.log('[Auth] Profile not found or incomplete, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1500));
            profile = await getUserProfile(firebaseUser.uid);
          }
          
          if (profile) {
            setUserProfile(profile);
            // Cache the user profile
            await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
            console.log('[Auth] Profile loaded:', profile.username);
          }
          
          // Auto-sync data when user logs in or app opens
          console.log('[Auth] Auto-syncing user data...');
          await performFullSync(firebaseUser.uid);
          
          // Refresh profile after sync in case it was updated
          const refreshedProfile = await getUserProfile(firebaseUser.uid);
          if (refreshedProfile) {
            setUserProfile(refreshedProfile);
            await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(refreshedProfile));
          }
          
          console.log('[Auth] Auto-sync complete');
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
        await AsyncStorage.removeItem(USER_CACHE_KEY);
      }
      
      setInitializing(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sign up a new user
   */
  const signUp = useCallback(async ({ email, password, username, displayName }) => {
    setLoading(true);
    try {
      const result = await authSignUp({ email, password, username, displayName });
      
      // IMPORTANT: The auth state change listener fires BEFORE the Firestore writes complete
      // So we need to manually set the profile here after signup finishes
      if (result && result.uid) {
        // Fetch the freshly created profile from Firestore
        const profile = await getUserProfile(result.uid);
        if (profile) {
          setUserProfile(profile);
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
          console.log('[Auth] Set user profile after signup:', profile.username);
        } else {
          // Fallback: use the result data directly if Firestore read fails
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
      
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
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
    try {
      const result = await authSignIn(email, password);
      setUserProfile(result);
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(result));
      
      // Download cloud data to local storage
      const { downloadAndMergeCloudData } = await import('../services/userSyncService');
      if (result && result.uid) {
        await downloadAndMergeCloudData(result.uid);
        console.log('[Auth] Downloaded cloud data after sign in');
        
        // Emit event to reload theme after data is downloaded
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('userDataDownloaded');
        console.log('[Auth] Emitted userDataDownloaded event');
      }
      
      // Skip onboarding for existing users (they've already set up their account)
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      console.log('[Auth] Skipping onboarding for returning user');
      
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
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
            syncUserStatsToCloud 
          } = await import('../services/userSyncService');
          
          // Upload all data to cloud (DO NOT download - that would overwrite local data)
          await syncUserStatsToCloud(user.uid);
          await syncSavedVersesToCloud(user.uid);
          await syncJournalNotesToCloud(user.uid);
          await syncThemePreferencesToCloud(user.uid);
          await syncAllHistoryToCloud(user.uid);
          
          console.log('[Auth] Data uploaded to cloud successfully');
        } catch (syncError) {
          console.error('[Auth] Failed to upload before sign out:', syncError);
          // Continue with sign out even if sync fails
        }
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
        // Saved content
        'savedBibleVerses',
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
        // User prayers (custom prayer settings)
        'userPrayers',
        'customPrayerNames',
        'customPrayerTimes',
        // Hub posting tokens
        'hub_posting_token',
        'hub_token_schedule',
        // Reading progress
        'readingProgress',
        'currentReadingPlan',
        // Verse of the day (actual keys used by dailyVerse.js)
        'daily_verse_data_v6',
        'daily_verse_index_v6',
        'shuffled_verses_v6',
        'daily_verse_last_update_v6',
        // App streak (user-specific)
        'app_streak_data',
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
