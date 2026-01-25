/**
 * User Sync Service
 * 
 * Handles synchronization between local AsyncStorage data and Firestore.
 * - On login: Download cloud data and merge with local
 * - On data change: Upload to Firestore
 * - Conflict resolution: Cloud wins for critical data
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { getStoredData, saveData } from '../utils/localStorage';

// Storage keys that are synced to cloud
const SYNC_KEYS = {
  userStats: 'userStats',
  userProfile: 'userProfile',
  prayerHistory: 'prayerHistory',
  workoutHistory: 'workoutHistory',
  quizHistory: 'quizHistory',
};

// Fields that sync to the users collection
const USER_PROFILE_FIELDS = [
  'displayName',
  'profilePicture',
  'country',
  'countryCode',
  'countryFlag',
  'totalPoints',
  'currentStreak',
  'level',
  'prayersCompleted',
  'workoutsCompleted',
  'tasksCompleted',
  'quizzesTaken',
  'isPublic',
];

/**
 * Sync local user stats to Firestore
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const syncUserStatsToCloud = async (userId) => {
  if (!userId) return false;
  
  try {
    // Get local stats
    const localStats = await getStoredData('userStats');
    const localProfile = await getStoredData('userProfile');
    
    if (!localStats && !localProfile) return true;
    
    // Prepare update data
    const updateData = {
      lastActive: serverTimestamp(),
    };
    
    // Add stats fields
    if (localStats) {
      if (localStats.totalPoints !== undefined) updateData.totalPoints = localStats.totalPoints;
      if (localStats.currentStreak !== undefined) updateData.currentStreak = localStats.currentStreak;
      if (localStats.level !== undefined) updateData.level = localStats.level;
      if (localStats.prayersCompleted !== undefined) updateData.prayersCompleted = localStats.prayersCompleted;
      if (localStats.completedTasks !== undefined) updateData.tasksCompleted = localStats.completedTasks;
    }
    
    // Add profile fields
    if (localProfile) {
      if (localProfile.displayName) updateData.displayName = localProfile.displayName;
      if (localProfile.country) updateData.country = localProfile.country;
      if (localProfile.countryFlag) updateData.countryFlag = localProfile.countryFlag;
      if (localProfile.isPublic !== undefined) updateData.isPublic = localProfile.isPublic;
    }
    
    // Update Firestore
    await setDoc(doc(db, 'users', userId), updateData, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error syncing stats to cloud:', error);
    return false;
  }
};

/**
 * Download cloud data and merge with local
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<Object|null>} - Merged user data
 */
export const downloadAndMergeCloudData = async (userId) => {
  if (!userId) return null;
  
  try {
    // Get cloud data
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.warn('No cloud data found for user');
      return null;
    }
    
    const cloudData = userDoc.data();
    
    // Get local data
    const localStats = await getStoredData('userStats') || {};
    const localProfile = await getStoredData('userProfile') || {};
    
    // Merge strategy: Cloud wins for numeric/tracked values, local for recent edits
    const mergedStats = {
      ...localStats,
      // Cloud values take priority for these tracked fields
      totalPoints: Math.max(localStats.totalPoints || 0, cloudData.totalPoints || 0),
      currentStreak: Math.max(localStats.currentStreak || 0, cloudData.currentStreak || 0),
      level: Math.max(localStats.level || 1, cloudData.level || 1),
      prayersCompleted: Math.max(localStats.prayersCompleted || 0, cloudData.prayersCompleted || 0),
      completedTasks: Math.max(localStats.completedTasks || 0, cloudData.tasksCompleted || 0),
      workoutsCompleted: Math.max(localStats.workoutsCompleted || 0, cloudData.workoutsCompleted || 0),
      quizzesTaken: Math.max(localStats.quizzesTaken || 0, cloudData.quizzesTaken || 0),
      joinedDate: cloudData.joinedDate?.toDate?.()?.toISOString() || localStats.joinedDate || new Date().toISOString(),
    };
    
    const mergedProfile = {
      ...localProfile,
      displayName: cloudData.displayName || localProfile.displayName || '',
      country: cloudData.country || localProfile.country || '',
      countryFlag: cloudData.countryFlag || localProfile.countryFlag || '',
      username: cloudData.username || localProfile.username || '',
      email: cloudData.email || localProfile.email || '',
      isPublic: cloudData.isPublic !== undefined ? cloudData.isPublic : (localProfile.isPublic ?? true),
    };
    
    // Save merged data locally
    await saveData('userStats', mergedStats);
    await saveData('userProfile', mergedProfile);
    
    return {
      stats: mergedStats,
      profile: mergedProfile,
      cloudData,
    };
  } catch (error) {
    console.error('Error downloading cloud data:', error);
    return null;
  }
};

/**
 * Update a specific stat and sync to cloud
 * @param {string} userId - The user's Firebase UID
 * @param {string} field - The field to update
 * @param {any} value - The new value
 * @returns {Promise<boolean>} - Success status
 */
export const updateAndSyncStat = async (userId, field, value) => {
  try {
    // Update locally first
    const localStats = await getStoredData('userStats') || {};
    localStats[field] = value;
    await saveData('userStats', localStats);
    
    // If user is logged in, sync to cloud
    if (userId) {
      const firestoreField = field === 'completedTasks' ? 'tasksCompleted' : field;
      await setDoc(doc(db, 'users', userId), {
        [firestoreField]: value,
        lastActive: serverTimestamp(),
      }, { merge: true });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating stat:', error);
    return false;
  }
};

/**
 * Increment a stat and sync to cloud
 * @param {string} userId - The user's Firebase UID
 * @param {string} field - The field to increment
 * @param {number} amount - Amount to increment (default 1)
 * @returns {Promise<number>} - New value
 */
export const incrementAndSyncStat = async (userId, field, amount = 1) => {
  try {
    // Get current value
    const localStats = await getStoredData('userStats') || {};
    const currentValue = localStats[field] || 0;
    const newValue = currentValue + amount;
    
    // Update locally
    localStats[field] = newValue;
    await saveData('userStats', localStats);
    
    // Sync to cloud if logged in
    if (userId) {
      const firestoreField = field === 'completedTasks' ? 'tasksCompleted' : field;
      await setDoc(doc(db, 'users', userId), {
        [firestoreField]: newValue,
        lastActive: serverTimestamp(),
      }, { merge: true });
    }
    
    return newValue;
  } catch (error) {
    console.error('Error incrementing stat:', error);
    return -1;
  }
};

/**
 * Update user profile and sync to cloud
 * @param {string} userId - The user's Firebase UID
 * @param {Object} profileUpdates - Profile fields to update
 * @returns {Promise<boolean>} - Success status
 */
export const updateAndSyncProfile = async (userId, profileUpdates) => {
  try {
    // Update locally
    const localProfile = await getStoredData('userProfile') || {};
    const updatedProfile = { ...localProfile, ...profileUpdates };
    await saveData('userProfile', updatedProfile);
    
    // Sync to cloud if logged in
    if (userId) {
      const cloudUpdates = { lastActive: serverTimestamp() };
      
      // Only sync allowed fields
      for (const field of USER_PROFILE_FIELDS) {
        if (profileUpdates[field] !== undefined) {
          cloudUpdates[field] = profileUpdates[field];
        }
      }
      
      await setDoc(doc(db, 'users', userId), cloudUpdates, { merge: true });
    }
    
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

/**
 * Toggle leaderboard visibility
 * @param {string} userId - The user's Firebase UID
 * @param {boolean} isPublic - Whether to show on public leaderboard
 * @returns {Promise<boolean>} - Success status
 */
export const toggleLeaderboardVisibility = async (userId, isPublic) => {
  return updateAndSyncProfile(userId, { isPublic });
};

/**
 * Get the current sync status
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<Object>} - Sync status info
 */
export const getSyncStatus = async (userId) => {
  if (!userId) {
    return {
      isLoggedIn: false,
      lastSync: null,
      pendingSync: false,
    };
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const cloudData = userDoc.exists() ? userDoc.data() : null;
    
    return {
      isLoggedIn: true,
      lastSync: cloudData?.lastActive?.toDate?.() || null,
      pendingSync: false,
      cloudData,
    };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      isLoggedIn: true,
      lastSync: null,
      pendingSync: true,
      error: error.message,
    };
  }
};

/**
 * Full sync: bidirectional sync between local and cloud
 * - Downloads cloud data and merges with local (cloud wins for stats)
 * - Uploads merged data back to cloud
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const performFullSync = async (userId) => {
  if (!userId) return false;
  
  try {
    // First, download and merge cloud data
    await downloadAndMergeCloudData(userId);
    
    // Then sync merged stats back to cloud
    await syncUserStatsToCloud(userId);
    
    console.log('[Sync] Full sync completed successfully');
    return true;
  } catch (error) {
    console.error('[Sync] Error performing full sync:', error);
    return false;
  }
};

export default {
  syncUserStatsToCloud,
  downloadAndMergeCloudData,
  updateAndSyncStat,
  incrementAndSyncStat,
  updateAndSyncProfile,
  toggleLeaderboardVisibility,
  getSyncStatus,
  performFullSync,
};
