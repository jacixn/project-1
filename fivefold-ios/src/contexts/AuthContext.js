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
  sendPasswordResetCode as authSendResetCode,
  resetPasswordWithCode as authResetWithCode,
  getCurrentUser,
  getUserProfile,
  onAuthStateChange,
  getAuthErrorMessage,
  checkUsernameAvailability,
  check2FAEnabled,
  send2FALoginCode,
  verify2FALoginCode as authVerify2FALoginCode,
} from '../services/authService';
import { performFullSync } from '../services/userSyncService';
import { savePushToken } from '../services/socialNotificationService';
import notificationService from '../services/notificationService';
import userStorage from '../utils/userStorage';
import { useTheme } from './ThemeContext';
import {
  getLinkedAccounts,
  saveLinkedAccount,
  removeLinkedAccount as removeStoredAccount,
  getStoredPassword,
  updateLinkedAccountProfile,
} from '../services/accountSwitcherService';

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
  const [deleteSteps, setDeleteSteps] = useState(null);
  // { steps: [{label, done}], current: number }
  
  // Multi-account support
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  
  // Reload theme after userStorage is initialized (fixes wallpaper not persisting)
  const { reloadTheme } = useTheme();
  
  // Flag: when true, onAuthStateChanged MUST NOT run performFullSync
  // because the signIn/signUp flow handles its own sync after clearing stale data.
  const isAuthFlowActive = React.useRef(false);
  
  // When true, the next signIn call skips the 2FA check (used after 2FA verification)
  const skip2FACheck = React.useRef(false);

  // Load linked accounts list
  const refreshLinkedAccounts = useCallback(async () => {
    const accounts = await getLinkedAccounts();
    setLinkedAccounts(accounts);
  }, []);

  useEffect(() => {
    refreshLinkedAccounts();
  }, [refreshLinkedAccounts]);

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
              // Now that userStorage has a UID, reload theme/wallpaper
              await reloadTheme();
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
      // When an auth flow (signIn, signUp, addLinkedAccount, switchAccount)
      // is actively running, skip all listener logic. The auth flow handles
      // setUser, setUserProfile, userStorage, and onboardingCompleted itself.
      // Without this guard, the listener races with the auth flow and can
      // cause OnboardingWrapper to remount before onboardingCompleted is set.
      if (isAuthFlowActive.current) {
        console.log('[Auth] onAuthStateChange skipped — auth flow is active');
        return;
      }
      
      console.log('[Auth] onAuthStateChange fired, user:', firebaseUser?.email || 'null');
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Ensure userStorage is initialised for this UID
          await userStorage.initUser(firebaseUser.uid);
          // Now that userStorage has a UID, reload theme/wallpaper
          await reloadTheme();
          
          // First, try to use cached profile (fast, no Firestore read)
          const cachedData = await userStorage.get(USER_CACHE_KEY);
          if (cachedData) {
            setUserProfile(cachedData);
            console.log('[Auth] Using cached profile:', cachedData.username);
            
            // IMMEDIATELY unblock the app - don't wait for sync
            console.log('[Auth] Unblocking app — setting initializing=false, loading=false');
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
              
              // Keep linked account entry up-to-date with latest Firestore data
              // (onboarding sets profilePicture in Firestore but not in the linked accounts list)
              await updateLinkedAccountProfile(firebaseUser.uid, {
                username: profile.username,
                displayName: profile.displayName,
                profilePicture: profile.profilePicture,
              });
              // Refresh the React state so the accounts list UI updates
              refreshLinkedAccounts();
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
      
      // Set user immediately so isAuthenticated becomes true
      setUser(result);
      
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
      // Save as linked account for multi-account switching
      if (result?.uid) {
        await saveLinkedAccount({
          uid: result.uid,
          email: result.email || email,
          username: result.username || username,
          displayName: result.displayName || displayName,
          profilePicture: result.profilePicture || null,
        }, password);
        await refreshLinkedAccounts();
      }
      markDone(2);
      
      // Brief pause so user sees completion
      await new Promise(r => setTimeout(r, 600));
      
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      isAuthFlowActive.current = false; // Allow background sync again
      setAuthSteps(null);
      setInitializing(false);
      setLoading(false);
    }
  }, [refreshLinkedAccounts]);

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
      
      // Check if 2FA is enabled (skip if completing a 2FA flow)
      if (!skip2FACheck.current) {
        try {
          const has2FA = await check2FAEnabled(result.uid);
          if (has2FA) {
            // Send 2FA code to user's email (user is authenticated right now)
            const codeResult = await send2FALoginCode();
            
            // Sign out — user can't enter the app without completing 2FA
            await authSignOut();
            userStorage.clearUser();
            
            // Throw special error for AuthScreen to catch
            const err = new Error('Two-factor authentication required');
            err.requires2FA = true;
            err.maskedEmail = codeResult.maskedEmail;
            throw err;
          }
        } catch (twoFAError) {
          // Re-throw 2FA required errors
          if (twoFAError.requires2FA) throw twoFAError;
          // Log but don't block login for 2FA check failures
          console.warn('[Auth] 2FA check failed, allowing login:', twoFAError?.message);
        }
      }
      skip2FACheck.current = false;
      
      // Initialise UID-scoped storage for this user.
      // If this UID already has data on this device, initUser is a no-op.
      // If another user was signed in before, their data is safely under their own UID prefix.
      if (result?.uid) {
        await userStorage.initUser(result.uid);
        // Reload theme/wallpaper now that userStorage has a UID
        await reloadTheme();
      }

      setUser(result);
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
      
      // Save as linked account for multi-account switching
      await saveLinkedAccount({
        uid: result.uid,
        email: result.email,
        username: result.username,
        displayName: result.displayName,
        profilePicture: result.profilePicture,
      }, password);
      await refreshLinkedAccounts();
      
      markDone(3);
      
      // Brief pause so user sees the completion checkmarks
      await new Promise(r => setTimeout(r, 600));
      
      return result;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      isAuthFlowActive.current = false; // Allow background sync again
      setAuthSteps(null);
      setInitializing(false);
      setLoading(false);
    }
  }, [refreshLinkedAccounts]);

  /**
   * Sign out the current user
   * Syncs data to cloud first, then clears the active UID.
   * Data stays safely namespaced in AsyncStorage under the old UID prefix.
   */
  const signOut = useCallback(async () => {
    setAuthSteps(null); // Clear sign-in progress UI so it doesn't reappear
    setLoading(true);
    isAuthFlowActive.current = true;
    const currentUid = user?.uid;
    try {
      // IMPORTANT: Upload all data to cloud BEFORE signing out (while we still have user ID)
      if (currentUid) {
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
          await syncUserStatsToCloud(currentUid);
          await syncSavedVersesToCloud(currentUid);
          await syncJournalNotesToCloud(currentUid);
          await syncPrayersToCloud(currentUid);
          await syncThemePreferencesToCloud(currentUid);
          await syncAllHistoryToCloud(currentUid);
          
          console.log('[Auth] Data uploaded to cloud successfully');
        } catch (syncError) {
          console.warn('[Auth] Failed to upload before sign out:', syncError?.message);
          // Continue with sign out even if sync fails
        }
      }
      
      // Cancel any scheduled token notifications before signing out
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
      
      // Check for other linked accounts BEFORE signing out
      const otherAccounts = (await getLinkedAccounts()).filter(a => a.uid !== currentUid);
      
      // Remove the current account from linked accounts (they signed out of it)
      if (currentUid) {
        await removeStoredAccount(currentUid);
      }
      
      // Now sign out from Firebase
      await authSignOut();
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
      
      // If there are other linked accounts, auto-switch to the first one
      if (otherAccounts.length > 0) {
        const nextAccount = otherAccounts[0];
        const nextPassword = await getStoredPassword(nextAccount.uid);
        
        if (nextPassword) {
          console.log('[Auth] Auto-switching to linked account:', nextAccount.username || nextAccount.email);
          setSwitchingAccount(true);
          
          try {
            const result = await authSignIn(nextAccount.email, nextPassword);
            
            if (result?.uid) {
              await userStorage.initUser(result.uid);
              await userStorage.setRaw('onboardingCompleted', 'true');
              await userStorage.set(USER_CACHE_KEY, result);
              await reloadTheme();
            }
            
            setUser(result);
            setUserProfile(result);
            setInitializing(false);
            setLoading(false);
            
            // Download cloud data in background
            try {
              const { downloadAndMergeCloudData } = await import('../services/userSyncService');
              if (result?.uid) {
                await downloadAndMergeCloudData(result.uid);
              }
            } catch (dlErr) {
              console.warn('[Auth] Download after auto-switch failed:', dlErr?.message);
            }
            
            await userStorage.setRaw('onboardingCompleted', 'true');
            await reloadTheme();
            await refreshLinkedAccounts();
            
            const { DeviceEventEmitter } = require('react-native');
            DeviceEventEmitter.emit('userDataDownloaded');
            
            console.log('[Auth] Auto-switched to', result?.username || result?.email);
            setSwitchingAccount(false);
            return; // Don't fall through to the normal sign-out cleanup
          } catch (switchErr) {
            console.warn('[Auth] Auto-switch failed, completing normal sign out:', switchErr?.message);
            setSwitchingAccount(false);
            // Fall through to normal sign-out (user goes to login screen)
          }
        }
      }
      
      // No other accounts (or auto-switch failed) — normal sign out to login screen
      setUser(null);
      setUserProfile(null);
      
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    } finally {
      isAuthFlowActive.current = false;
      setLoading(false);
    }
  }, [user, reloadTheme, refreshLinkedAccounts]);

  /**
   * Delete account with animated progress screen
   */
  const deleteAccount = useCallback(async (password) => {
    const STEPS = [
      { label: 'Verifying your identity', done: false },
      { label: 'Removing prayers & posts', done: false },
      { label: 'Deleting conversations', done: false },
      { label: 'Removing challenges', done: false },
      { label: 'Deleting cloud profile', done: false },
      { label: 'Removing profile photos', done: false },
      { label: 'Clearing local data', done: false },
      { label: 'Deleting account', done: false },
    ];

    const markDone = (stepIndex) => {
      if (stepIndex >= STEPS.length) {
        // All done
        STEPS.forEach(s => { s.done = true; });
        setDeleteSteps({ steps: [...STEPS], current: -1 });
        return;
      }
      // Mark previous steps done
      for (let i = 0; i <= stepIndex; i++) {
        STEPS[i].done = true;
      }
      const next = stepIndex + 1 < STEPS.length ? stepIndex + 1 : -1;
      setDeleteSteps({ steps: [...STEPS], current: next });
    };

    setDeleteSteps({ steps: [...STEPS], current: 0 });
    setLoading(true);
    isAuthFlowActive.current = true;

    try {
      const { deleteAccountCompletely } = await import('../utils/onboardingReset');
      const success = await deleteAccountCompletely(password, markDone);

      if (!success) {
        throw new Error('Deletion failed');
      }

      // Small delay so user sees the final step complete
      await new Promise(r => setTimeout(r, 1200));

      // Clear state — user is now deleted
      setUser(null);
      setUserProfile(null);
      setDeleteSteps(null);
      setAuthSteps(null);
      userStorage.clearUser();

      return true;
    } catch (error) {
      setDeleteSteps(null);
      throw error;
    } finally {
      isAuthFlowActive.current = false;
      setLoading(false);
    }
  }, []);

  /**
   * Send password reset code (OTP via Resend — won't go to spam)
   * NOTE: Does NOT set global loading state — password reset uses local
   * loading in AuthScreen to avoid triggering the full-screen loading overlay.
   */
  const sendPasswordResetCode = useCallback(async (email) => {
    try {
      return await authSendResetCode(email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  /**
   * Verify reset code and set new password
   * NOTE: Does NOT set global loading state — same reason as above.
   */
  const resetPasswordWithCode = useCallback(async (email, code, newPassword) => {
    try {
      return await authResetWithCode(email, code, newPassword);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  /**
   * Legacy: Send password reset email (Firebase default — may go to spam)
   * NOTE: Does NOT set global loading state.
   */
  const resetPassword = useCallback(async (email) => {
    try {
      await authResetPassword(email);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  /**
   * Verify a 2FA login code and complete sign-in.
   * Called after the initial signIn threw a 'requires2FA' error.
   * @param {string} email - User's email
   * @param {string} password - User's password (stored from first attempt)
   * @param {string} code - The 6-digit 2FA code
   */
  const verify2FAAndSignIn = useCallback(async (email, password, code) => {
    try {
      // Verify the 2FA code (unauthenticated — user was signed out)
      await authVerify2FALoginCode(email, code);
      
      // Code verified — sign in again, skipping the 2FA check this time
      skip2FACheck.current = true;
      return await signIn(email, password);
    } catch (error) {
      skip2FACheck.current = false;
      // Format the error message nicely
      const msg = error?.message || 'Verification failed. Please try again.';
      throw new Error(msg);
    }
  }, [signIn]);

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
    
    // Keep linked accounts list in sync with latest profile data
    if (user?.uid) {
      await updateLinkedAccountProfile(user.uid, {
        username: updatedProfile.username,
        displayName: updatedProfile.displayName,
        profilePicture: updatedProfile.profilePicture,
      });
      refreshLinkedAccounts();
    }
  }, [userProfile, user, refreshLinkedAccounts]);

  // ── Multi-account methods ───────────────────────────────────────────────

  /**
   * Save the current account as a linked account.
   * Call this after a successful sign-in or sign-up so the user
   * can switch back to this account later.
   * @param {string} password - The password used to sign in
   */
  const saveCurrentAsLinkedAccount = useCallback(async (password) => {
    if (!user || !userProfile) return;
    await saveLinkedAccount({
      uid: user.uid,
      email: user.email || userProfile.email,
      username: userProfile.username,
      displayName: userProfile.displayName,
      profilePicture: userProfile.profilePicture,
    }, password);
    await refreshLinkedAccounts();
  }, [user, userProfile, refreshLinkedAccounts]);

  /**
   * Switch to a different linked account.
   * Syncs the current account's data to the cloud, then signs in as the target.
   * @param {string} uid - The UID of the account to switch to
   */
  const switchAccount = useCallback(async (uid) => {
    if (uid === user?.uid) return; // Already on this account

    setSwitchingAccount(true);
    isAuthFlowActive.current = true;

    try {
      // 1. Get the stored password for the target account
      const password = await getStoredPassword(uid);
      if (!password) {
        throw new Error('No stored credentials for this account. Please remove it and sign in again.');
      }

      // Find the target account to get the email
      const accounts = await getLinkedAccounts();
      const target = accounts.find((a) => a.uid === uid);
      if (!target) {
        throw new Error('Account not found.');
      }

      // 2. Sync current account data to cloud before switching
      if (user?.uid) {
        try {
          console.log('[AccountSwitcher] Syncing current account to cloud...');
          const {
            syncSavedVersesToCloud,
            syncJournalNotesToCloud,
            syncThemePreferencesToCloud,
            syncAllHistoryToCloud,
            syncUserStatsToCloud,
            syncPrayersToCloud,
          } = await import('../services/userSyncService');

          await syncUserStatsToCloud(user.uid);
          await syncSavedVersesToCloud(user.uid);
          await syncJournalNotesToCloud(user.uid);
          await syncPrayersToCloud(user.uid);
          await syncThemePreferencesToCloud(user.uid);
          await syncAllHistoryToCloud(user.uid);
          console.log('[AccountSwitcher] Current account synced');
        } catch (syncErr) {
          console.warn('[AccountSwitcher] Cloud sync failed:', syncErr);
          // Continue with switch even if sync fails
        }
      }

      // 3. Save current user info for recovery if switch fails
      const previousUid = user?.uid;
      const previousEmail = user?.email || userProfile?.email;
      const previousPassword = previousUid ? await getStoredPassword(previousUid) : null;
      const previousProfile = userProfile ? { ...userProfile } : null;

      // 4. Sign out current user (preserves UID-scoped data in AsyncStorage)
      await authSignOut();
      userStorage.clearUser();

      // 5. Sign in as the target account
      console.log('[AccountSwitcher] Signing in as', target.username || target.email);
      let result;
      try {
        result = await authSignIn(target.email, password);
      } catch (signInErr) {
        // Sign-in failed — try to recover by signing back into the previous account
        console.warn('[AccountSwitcher] Target sign-in failed, recovering previous session...');
        if (previousEmail && previousPassword) {
          try {
            const recoveredResult = await authSignIn(previousEmail, previousPassword);
            if (recoveredResult?.uid) {
              await userStorage.initUser(recoveredResult.uid);
              await userStorage.setRaw('onboardingCompleted', 'true');
              await userStorage.set(USER_CACHE_KEY, recoveredResult);
              await reloadTheme();
            }
            setUser(recoveredResult);
            setUserProfile(previousProfile || recoveredResult);
            setInitializing(false);
            setLoading(false);
            console.log('[AccountSwitcher] Recovered previous session');
          } catch (recoveryErr) {
            console.warn('[AccountSwitcher] Recovery also failed:', recoveryErr?.message || recoveryErr);
          }
        }
        throw signInErr;
      }

      if (result?.uid) {
        await userStorage.initUser(result.uid);
        // MUST set onboardingCompleted IMMEDIATELY after initUser to prevent
        // OnboardingWrapper race condition
        await userStorage.setRaw('onboardingCompleted', 'true');
        await userStorage.set(USER_CACHE_KEY, result);
        await reloadTheme();
      }

      setUser(result);
      setUserProfile(result);

      // 5. Download cloud data for the target account
      try {
        const { downloadAndMergeCloudData } = await import('../services/userSyncService');
        if (result?.uid) {
          await downloadAndMergeCloudData(result.uid);
          console.log('[AccountSwitcher] Downloaded cloud data for switched account');
        }
      } catch (dlErr) {
        console.warn('[AccountSwitcher] Download failed:', dlErr);
      }

      // 6. Re-set onboardingCompleted in case cloud data overwrote it
      await userStorage.setRaw('onboardingCompleted', 'true');

      // 7. Reload theme again after data download (in case cloud had different theme)
      await reloadTheme();

      // 8. Update the linked account entry with fresh profile data
      await updateLinkedAccountProfile(result.uid, {
        username: result.username,
        displayName: result.displayName,
        profilePicture: result.profilePicture,
        lastSwitchedAt: Date.now(),
      });
      await refreshLinkedAccounts();

      // 9. Unblock the app (onAuthStateChange listener was skipped during this flow)
      setInitializing(false);
      setLoading(false);

      // 10. Emit event so screens can refresh
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('userDataDownloaded');

      console.log('[AccountSwitcher] Switch complete to', result.username || result.email);
    } catch (error) {
      console.warn('[AccountSwitcher] Switch failed:', error?.message || error);
      setInitializing(false);
      setLoading(false);
      throw error;
    } finally {
      isAuthFlowActive.current = false;
      setSwitchingAccount(false);
    }
  }, [user, reloadTheme, refreshLinkedAccounts]);

  /**
   * Add a new linked account by signing into it.
   * The current account is saved first (using already-stored password if available),
   * then the new account becomes active.
   * @param {string} email
   * @param {string} password
   * @param {string|null} currentPassword - Optional; if null, uses stored password
   */
  const addLinkedAccount = useCallback(async (email, password, currentPassword) => {
    setSwitchingAccount(true);
    isAuthFlowActive.current = true;

    try {
      // 1. Save the current account first (so user can switch back)
      // Use the stored password if no current password is provided
      if (user && userProfile) {
        const storedPw = currentPassword || (user.uid ? await getStoredPassword(user.uid) : null);
        if (storedPw) {
          await saveLinkedAccount({
            uid: user.uid,
            email: user.email || userProfile.email,
            username: userProfile.username,
            displayName: userProfile.displayName,
            profilePicture: userProfile.profilePicture,
          }, storedPw);
        }
      }

      // 2. Sync current account data to cloud
      if (user?.uid) {
        try {
          const {
            syncSavedVersesToCloud,
            syncJournalNotesToCloud,
            syncThemePreferencesToCloud,
            syncAllHistoryToCloud,
            syncUserStatsToCloud,
            syncPrayersToCloud,
          } = await import('../services/userSyncService');

          await syncUserStatsToCloud(user.uid);
          await syncSavedVersesToCloud(user.uid);
          await syncJournalNotesToCloud(user.uid);
          await syncPrayersToCloud(user.uid);
          await syncThemePreferencesToCloud(user.uid);
          await syncAllHistoryToCloud(user.uid);
        } catch (syncErr) {
          console.warn('[AccountSwitcher] Pre-switch sync failed:', syncErr);
        }
      }

      // 3. Sign out current user
      await authSignOut();
      userStorage.clearUser();

      // 4. Sign in as the new account
      const result = await authSignIn(email, password);

      if (result?.uid) {
        await userStorage.initUser(result.uid);
        // MUST set onboardingCompleted IMMEDIATELY after initUser, before any state
        // updates (setUser/setUserProfile) that would cause OnboardingWrapper to
        // remount and check this flag. Otherwise there's a race condition where
        // OnboardingWrapper reads the flag before we set it.
        await userStorage.setRaw('onboardingCompleted', 'true');
        await userStorage.set(USER_CACHE_KEY, result);
        await reloadTheme();
      }

      setUser(result);
      setUserProfile(result);

      // 5. Save the new account as linked too
      await saveLinkedAccount({
        uid: result.uid,
        email: result.email,
        username: result.username,
        displayName: result.displayName,
        profilePicture: result.profilePicture,
      }, password);

      // 6. Download cloud data
      try {
        const { downloadAndMergeCloudData } = await import('../services/userSyncService');
        if (result?.uid) {
          await downloadAndMergeCloudData(result.uid);
        }
      } catch (dlErr) {
        console.warn('[AccountSwitcher] Download failed:', dlErr);
      }

      // Re-set onboardingCompleted in case downloadAndMergeCloudData overwrote it
      await userStorage.setRaw('onboardingCompleted', 'true');
      await reloadTheme();
      await refreshLinkedAccounts();

      // Unblock the app (onAuthStateChange listener was skipped during this flow)
      setInitializing(false);
      setLoading(false);

      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('userDataDownloaded');

      console.log('[AccountSwitcher] Added & switched to', result.username || result.email);
      return result;
    } catch (error) {
      console.warn('[AccountSwitcher] addLinkedAccount failed:', error?.message || error);
      // Ensure app is unblocked even on error
      setInitializing(false);
      setLoading(false);
      throw error;
    } finally {
      isAuthFlowActive.current = false;
      setSwitchingAccount(false);
    }
  }, [user, userProfile, reloadTheme, refreshLinkedAccounts]);

  /**
   * Remove a linked account from this device.
   * Cannot remove the currently active account.
   * @param {string} uid
   */
  const unlinkAccount = useCallback(async (uid) => {
    if (uid === user?.uid) {
      throw new Error('Cannot remove the currently active account.');
    }
    await removeStoredAccount(uid);
    await refreshLinkedAccounts();
  }, [user, refreshLinkedAccounts]);

  const value = {
    // State
    user,
    userProfile,
    loading,
    initializing,
    isAuthenticated: !!user,
    authSteps,
    deleteSteps,
    
    // Multi-account state
    linkedAccounts,
    switchingAccount,
    
    // Methods
    signUp,
    signIn,
    signOut,
    deleteAccount,
    resetPassword,
    sendPasswordResetCode,
    resetPasswordWithCode,
    verify2FAAndSignIn,
    refreshUserProfile,
    updateLocalProfile,
    checkUsernameAvailability,
    
    // Multi-account methods
    switchAccount,
    addLinkedAccount,
    unlinkAccount,
    saveCurrentAsLinkedAccount,
    refreshLinkedAccounts,
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
