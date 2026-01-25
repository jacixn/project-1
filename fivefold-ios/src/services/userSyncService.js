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
  savedBibleVerses: 'savedBibleVerses',
  journalNotes: 'journalNotes',
  themePreferences: 'themePreferences',
};

// Fields that sync to the users collection
const USER_PROFILE_FIELDS = [
  'displayName',
  'profilePicture', // Cloud URL from Firebase Storage
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
    // Get local stats from multiple sources
    // Note: getStoredData adds 'fivefold_' prefix automatically
    const localStats = await getStoredData('userStats') || {};
    const localProfile = await getStoredData('userProfile');
    
    console.log('[Sync] localStats from getStoredData:', localStats);
    
    // IMPORTANT: Get points from ALL possible sources
    // Points are stored in multiple places due to legacy code
    
    // Source 1: PrayerCompletionManager stores points here
    const prayerPointsStr = await AsyncStorage.getItem('total_points');
    const prayerPoints = prayerPointsStr ? parseInt(prayerPointsStr, 10) : 0;
    
    // Source 2: userStats can have points in either 'totalPoints' or 'points' field
    const statsPoints = Math.max(
      localStats.totalPoints || 0,
      localStats.points || 0
    );
    
    // Source 3: Check fivefold_userStats too (some code uses this key)
    const fivefoldStatsStr = await AsyncStorage.getItem('fivefold_userStats');
    let fivefoldPoints = 0;
    if (fivefoldStatsStr) {
      try {
        const fivefoldStats = JSON.parse(fivefoldStatsStr);
        fivefoldPoints = Math.max(fivefoldStats.totalPoints || 0, fivefoldStats.points || 0);
      } catch (e) {}
    }
    
    // Prepare update data
    const updateData = {
      lastActive: serverTimestamp(),
    };
    
    // Use the MAX of all point sources to ensure we don't lose any points
    const pointsToSync = Math.max(prayerPoints, statsPoints, fivefoldPoints);
    if (pointsToSync > 0) {
      updateData.totalPoints = pointsToSync;
      // Also update level based on points
      const { default: AchievementService } = await import('./achievementService');
      updateData.level = AchievementService.getLevelFromPoints(pointsToSync);
    }
    
    console.log('[Sync] Point sources:', { 
      total_points: prayerPoints, 
      'userStats.totalPoints': localStats.totalPoints,
      'userStats.points': localStats.points,
      fivefold_userStats: fivefoldPoints,
      syncing: pointsToSync 
    });
    
    // Add other stats fields
    if (localStats.currentStreak !== undefined) updateData.currentStreak = localStats.currentStreak;
    if (localStats.level !== undefined) updateData.level = localStats.level;
    if (localStats.prayersCompleted !== undefined) updateData.prayersCompleted = localStats.prayersCompleted;
    if (localStats.completedTasks !== undefined) updateData.tasksCompleted = localStats.completedTasks;
    
    // Add profile fields
    if (localProfile) {
      if (localProfile.displayName) updateData.displayName = localProfile.displayName;
      if (localProfile.country) updateData.country = localProfile.country;
      if (localProfile.countryFlag) updateData.countryFlag = localProfile.countryFlag;
      if (localProfile.isPublic !== undefined) updateData.isPublic = localProfile.isPublic;
    }
    
    console.log('[Sync] Syncing to cloud:', { totalPoints: updateData.totalPoints, actualPoints, statsPoints: localStats.totalPoints });
    
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
      profilePicture: cloudData.profilePicture || localProfile.profilePicture || '', // Cloud URL
      country: cloudData.country || localProfile.country || '',
      countryFlag: cloudData.countryFlag || localProfile.countryFlag || '',
      username: cloudData.username || localProfile.username || '',
      email: cloudData.email || localProfile.email || '',
      isPublic: cloudData.isPublic !== undefined ? cloudData.isPublic : (localProfile.isPublic ?? true),
    };
    
    // Save merged data locally
    await saveData('userStats', mergedStats);
    await saveData('userProfile', mergedProfile);
    
    // CRITICAL: Also save total_points to the key that PrayerCompletionManager reads from
    // This ensures points are correctly displayed on the Profile screen
    if (mergedStats.totalPoints > 0) {
      await AsyncStorage.setItem('total_points', String(mergedStats.totalPoints));
      console.log('[Sync] Set total_points to:', mergedStats.totalPoints);
    }
    
    // Also save profile picture URL to local storage for ProfileTab
    if (cloudData.profilePicture) {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      const localProfileData = storedProfile ? JSON.parse(storedProfile) : {};
      localProfileData.profilePicture = cloudData.profilePicture;
      await AsyncStorage.setItem('userProfile', JSON.stringify(localProfileData));
      console.log('[Sync] Downloaded profile picture URL from cloud');
    }
    
    // Download user-specific content from cloud (saved verses, theme, journal)
    // Saved Bible Verses - cloud overwrites local since we clear on sign-out
    if (cloudData.savedBibleVerses && Array.isArray(cloudData.savedBibleVerses)) {
      await AsyncStorage.setItem('savedBibleVerses', JSON.stringify(cloudData.savedBibleVerses));
      console.log(`[Sync] Downloaded ${cloudData.savedBibleVerses.length} saved verses from cloud`);
      
      // Also update userStats with saved verses count
      const statsStr = await AsyncStorage.getItem('userStats');
      const stats = statsStr ? JSON.parse(statsStr) : {};
      stats.savedVerses = cloudData.savedBibleVerses.length;
      await AsyncStorage.setItem('userStats', JSON.stringify(stats));
    } else {
      console.log('[Sync] No saved verses found in cloud');
    }
    
    // Journal Notes - cloud overwrites local
    if (cloudData.journalNotes && Array.isArray(cloudData.journalNotes)) {
      await AsyncStorage.setItem('journalNotes', JSON.stringify(cloudData.journalNotes));
      console.log(`[Sync] Downloaded ${cloudData.journalNotes.length} journal notes from cloud`);
    }
    
    // Theme Preferences - cloud overwrites local
    if (cloudData.themePreferences) {
      const { theme, darkMode, wallpaperIndex } = cloudData.themePreferences;
      if (theme) await AsyncStorage.setItem('fivefold_theme', theme);
      if (darkMode !== undefined) await AsyncStorage.setItem('fivefold_dark_mode', JSON.stringify(darkMode));
      if (wallpaperIndex !== undefined) await AsyncStorage.setItem('fivefold_wallpaper_index', String(wallpaperIndex));
      console.log('[Sync] Downloaded theme preferences from cloud');
    }
    
    // Workout history
    if (cloudData.workoutHistory) {
      await AsyncStorage.setItem('workoutHistory', JSON.stringify(cloudData.workoutHistory));
      console.log('[Sync] Downloaded workout history from cloud');
    }
    
    // Quiz history
    if (cloudData.quizHistory) {
      await AsyncStorage.setItem('quizHistory', JSON.stringify(cloudData.quizHistory));
      console.log('[Sync] Downloaded quiz history from cloud');
    }
    
    // Prayer history
    if (cloudData.prayerHistory) {
      await AsyncStorage.setItem('prayerHistory', JSON.stringify(cloudData.prayerHistory));
      console.log('[Sync] Downloaded prayer history from cloud');
    }
    
    // User prayers (custom prayer settings/names/times)
    if (cloudData.userPrayers) {
      await AsyncStorage.setItem('userPrayers', JSON.stringify(cloudData.userPrayers));
      console.log('[Sync] Downloaded userPrayers from cloud');
    }
    
    // Hub posting token data
    if (cloudData.hubPostingToken) {
      await AsyncStorage.setItem('hub_posting_token', JSON.stringify(cloudData.hubPostingToken));
      console.log('[Sync] Downloaded hub_posting_token from cloud');
    }
    if (cloudData.hubTokenSchedule) {
      await AsyncStorage.setItem('hub_token_schedule', JSON.stringify(cloudData.hubTokenSchedule));
      console.log('[Sync] Downloaded hub_token_schedule from cloud');
    }
    
    // Active todos/tasks
    if (cloudData.todos) {
      await AsyncStorage.setItem('fivefold_todos', JSON.stringify(cloudData.todos));
      console.log(`[Sync] Downloaded ${cloudData.todos.length} todos from cloud`);
    }
    
    // Completed todos/tasks
    if (cloudData.completedTodos) {
      await AsyncStorage.setItem('completedTodos', JSON.stringify(cloudData.completedTodos));
      console.log('[Sync] Downloaded completed todos from cloud');
    }
    
    // App streak data
    if (cloudData.appStreakData) {
      await AsyncStorage.setItem('app_streak_data', JSON.stringify(cloudData.appStreakData));
      console.log('[Sync] Downloaded app streak data from cloud');
    }
    
    // Scheduled workouts (gym)
    if (cloudData.scheduledWorkouts) {
      await AsyncStorage.setItem('@scheduled_workouts', JSON.stringify(cloudData.scheduledWorkouts));
      console.log(`[Sync] Downloaded ${cloudData.scheduledWorkouts.length} scheduled workouts from cloud`);
    }
    
    // Verse data (contains highlights) - used by VerseDataManager
    if (cloudData.verseData) {
      const highlightCount = Object.keys(cloudData.verseData).length;
      await AsyncStorage.setItem('verse_data', JSON.stringify(cloudData.verseData));
      console.log(`[Sync] Downloaded verse_data (${highlightCount} entries) from cloud`);
    } else {
      console.log('[Sync] No verse_data (highlights) found in cloud');
    }
    
    // Highlight custom names
    if (cloudData.highlightNames) {
      await AsyncStorage.setItem('highlight_names', JSON.stringify(cloudData.highlightNames));
      console.log('[Sync] Downloaded highlight names from cloud');
    }
    
    // Bookmarks
    if (cloudData.bookmarks) {
      await AsyncStorage.setItem('bookmarks', JSON.stringify(cloudData.bookmarks));
      console.log('[Sync] Downloaded bookmarks from cloud');
    }
    
    // Reading streaks
    if (cloudData.readingStreaks) {
      await AsyncStorage.setItem('reading_streaks', JSON.stringify(cloudData.readingStreaks));
      console.log('[Sync] Downloaded reading streaks from cloud');
    }
    
    // Reading progress
    if (cloudData.readingProgress) {
      await AsyncStorage.setItem('readingProgress', JSON.stringify(cloudData.readingProgress));
      console.log('[Sync] Downloaded reading progress from cloud');
    }
    
    // Current reading plan
    if (cloudData.currentReadingPlan) {
      await AsyncStorage.setItem('currentReadingPlan', JSON.stringify(cloudData.currentReadingPlan));
      console.log('[Sync] Downloaded current reading plan from cloud');
    }
    
    // Notification preferences
    if (cloudData.notificationPreferences) {
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(cloudData.notificationPreferences));
      console.log('[Sync] Downloaded notification preferences from cloud');
    }
    
    // Daily verse data (verse of the day - per user)
    if (cloudData.dailyVerseSync) {
      const dvSync = cloudData.dailyVerseSync;
      if (dvSync.data) {
        await AsyncStorage.setItem('daily_verse_data_v6', JSON.stringify(dvSync.data));
      }
      if (dvSync.index !== undefined && dvSync.index !== null) {
        await AsyncStorage.setItem('daily_verse_index_v6', String(dvSync.index));
      }
      if (dvSync.shuffledVerses) {
        await AsyncStorage.setItem('shuffled_verses_v6', JSON.stringify(dvSync.shuffledVerses));
      }
      if (dvSync.lastUpdate) {
        await AsyncStorage.setItem('daily_verse_last_update_v6', dvSync.lastUpdate);
      }
      console.log('[Sync] Downloaded daily verse data from cloud');
    }
    
    // Selected Bible version preference
    if (cloudData.selectedBibleVersion) {
      await AsyncStorage.setItem('selectedBibleVersion', cloudData.selectedBibleVersion);
      console.log('[Sync] Downloaded selected Bible version from cloud');
    }
    
    // Weight unit preference
    if (cloudData.weightUnit) {
      await AsyncStorage.setItem('weightUnit', cloudData.weightUnit);
      console.log('[Sync] Downloaded weight unit from cloud');
    }
    
    // Bible maps bookmarks
    if (cloudData.bibleMapsBookmarks) {
      await AsyncStorage.setItem('bible_maps_bookmarks', JSON.stringify(cloudData.bibleMapsBookmarks));
      console.log('[Sync] Downloaded bible maps bookmarks from cloud');
    }
    
    // Bible maps visited
    if (cloudData.bibleMapsVisited) {
      await AsyncStorage.setItem('bible_maps_visited', JSON.stringify(cloudData.bibleMapsVisited));
      console.log('[Sync] Downloaded bible maps visited from cloud');
    }
    
    // Bible fast facts favorites
    if (cloudData.bibleFastFactsFavorites) {
      await AsyncStorage.setItem('bible_fast_facts_favorites', JSON.stringify(cloudData.bibleFastFactsFavorites));
      console.log('[Sync] Downloaded bible fast facts favorites from cloud');
    }
    
    // Recent Bible searches
    if (cloudData.recentBibleSearches) {
      await AsyncStorage.setItem('recentBibleSearches', JSON.stringify(cloudData.recentBibleSearches));
      console.log('[Sync] Downloaded recent Bible searches from cloud');
    }
    
    // Prayer completions
    if (cloudData.prayerCompletions) {
      await AsyncStorage.setItem('prayer_completions', JSON.stringify(cloudData.prayerCompletions));
      console.log('[Sync] Downloaded prayer completions from cloud');
    }
    
    // Prayer preferences
    if (cloudData.prayerPreferences) {
      await AsyncStorage.setItem('prayer_preferences', JSON.stringify(cloudData.prayerPreferences));
      console.log('[Sync] Downloaded prayer preferences from cloud');
    }
    
    // Friend chat history
    if (cloudData.friendChatHistory) {
      await AsyncStorage.setItem('friendChatHistory', JSON.stringify(cloudData.friendChatHistory));
      console.log('[Sync] Downloaded friend chat history from cloud');
    }
    
    // Key Verses favorites
    if (cloudData.favoriteVerses) {
      await AsyncStorage.setItem('fivefold_favoriteVerses', JSON.stringify(cloudData.favoriteVerses));
      console.log('[Sync] Downloaded Key Verses favorites from cloud');
    }
    
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
 * Sync saved Bible verses to cloud
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const syncSavedVersesToCloud = async (userId) => {
  if (!userId) return false;
  
  try {
    const savedVersesStr = await AsyncStorage.getItem('savedBibleVerses');
    console.log('[Sync] Saved verses from AsyncStorage:', savedVersesStr ? 'found' : 'not found');
    
    if (savedVersesStr) {
      const savedVerses = JSON.parse(savedVersesStr);
      console.log(`[Sync] Preparing to upload ${savedVerses.length} saved verses to cloud for user ${userId}`);
      
      await setDoc(doc(db, 'users', userId), {
        savedBibleVerses: savedVerses,
        lastActive: serverTimestamp(),
      }, { merge: true });
      console.log(`[Sync] Successfully uploaded ${savedVerses.length} saved verses to cloud`);
    } else {
      console.log('[Sync] No saved verses found in local storage to upload');
    }
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing saved verses:', error);
    console.error('[Sync] Error details:', error.message);
    return false;
  }
};

/**
 * Sync journal notes to cloud
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const syncJournalNotesToCloud = async (userId) => {
  if (!userId) return false;
  
  try {
    const journalNotesStr = await AsyncStorage.getItem('journalNotes');
    if (journalNotesStr) {
      const journalNotes = JSON.parse(journalNotesStr);
      await setDoc(doc(db, 'users', userId), {
        journalNotes: journalNotes,
        lastActive: serverTimestamp(),
      }, { merge: true });
      console.log(`[Sync] Uploaded ${journalNotes.length} journal notes to cloud`);
    }
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing journal notes:', error);
    return false;
  }
};

/**
 * Sync theme preferences to cloud
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const syncThemePreferencesToCloud = async (userId) => {
  if (!userId) return false;
  
  try {
    const theme = await AsyncStorage.getItem('fivefold_theme');
    const darkModeStr = await AsyncStorage.getItem('fivefold_dark_mode');
    const wallpaperIndexStr = await AsyncStorage.getItem('fivefold_wallpaper_index');
    
    const themePreferences = {};
    if (theme) themePreferences.theme = theme;
    if (darkModeStr) themePreferences.darkMode = JSON.parse(darkModeStr);
    if (wallpaperIndexStr) themePreferences.wallpaperIndex = parseInt(wallpaperIndexStr, 10);
    
    if (Object.keys(themePreferences).length > 0) {
      await setDoc(doc(db, 'users', userId), {
        themePreferences,
        lastActive: serverTimestamp(),
      }, { merge: true });
      console.log('[Sync] Uploaded theme preferences to cloud');
    }
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing theme preferences:', error);
    return false;
  }
};

/**
 * Sync all user history data to cloud
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const syncAllHistoryToCloud = async (userId) => {
  if (!userId) return false;
  
  try {
    const updateData = { lastActive: serverTimestamp() };
    
    // Workout history
    const workoutHistoryStr = await AsyncStorage.getItem('workoutHistory');
    if (workoutHistoryStr) {
      updateData.workoutHistory = JSON.parse(workoutHistoryStr);
    }
    
    // Quiz history
    const quizHistoryStr = await AsyncStorage.getItem('quizHistory');
    if (quizHistoryStr) {
      updateData.quizHistory = JSON.parse(quizHistoryStr);
    }
    
    // Prayer history
    const prayerHistoryStr = await AsyncStorage.getItem('prayerHistory');
    if (prayerHistoryStr) {
      updateData.prayerHistory = JSON.parse(prayerHistoryStr);
    }
    
    // User prayers (custom prayer settings/names/times)
    const userPrayersStr = await AsyncStorage.getItem('userPrayers');
    if (userPrayersStr) {
      updateData.userPrayers = JSON.parse(userPrayersStr);
      console.log('[Sync] Including userPrayers in upload');
    }
    
    // Hub posting token data
    const hubTokenStr = await AsyncStorage.getItem('hub_posting_token');
    if (hubTokenStr) {
      updateData.hubPostingToken = JSON.parse(hubTokenStr);
      console.log('[Sync] Including hub_posting_token in upload');
    }
    const hubScheduleStr = await AsyncStorage.getItem('hub_token_schedule');
    if (hubScheduleStr) {
      updateData.hubTokenSchedule = JSON.parse(hubScheduleStr);
      console.log('[Sync] Including hub_token_schedule in upload');
    }
    
    // Active todos/tasks
    const todosStr = await AsyncStorage.getItem('fivefold_todos');
    if (todosStr) {
      updateData.todos = JSON.parse(todosStr);
    }
    
    // Completed todos/tasks
    const completedTodosStr = await AsyncStorage.getItem('completedTodos');
    if (completedTodosStr) {
      updateData.completedTodos = JSON.parse(completedTodosStr);
    }
    
    // App streak data
    const streakDataStr = await AsyncStorage.getItem('app_streak_data');
    if (streakDataStr) {
      updateData.appStreakData = JSON.parse(streakDataStr);
    }
    
    // Scheduled workouts (gym)
    const scheduledWorkoutsStr = await AsyncStorage.getItem('@scheduled_workouts');
    if (scheduledWorkoutsStr) {
      updateData.scheduledWorkouts = JSON.parse(scheduledWorkoutsStr);
      console.log('[Sync] Including scheduled workouts in upload');
    }
    
    // Highlights - stored in verse_data key by VerseDataManager
    const verseDataStr = await AsyncStorage.getItem('verse_data');
    console.log('[Sync] verse_data from AsyncStorage:', verseDataStr ? `found (${verseDataStr.length} chars)` : 'not found');
    if (verseDataStr) {
      const verseData = JSON.parse(verseDataStr);
      updateData.verseData = verseData;
      const highlightCount = Object.keys(verseData).length;
      console.log(`[Sync] Including verse_data (${highlightCount} entries) in upload`);
    }
    
    // Highlight custom names
    const highlightNamesStr = await AsyncStorage.getItem('highlight_names');
    if (highlightNamesStr) {
      updateData.highlightNames = JSON.parse(highlightNamesStr);
    }
    
    // Bookmarks
    const bookmarksStr = await AsyncStorage.getItem('bookmarks');
    if (bookmarksStr) {
      updateData.bookmarks = JSON.parse(bookmarksStr);
    }
    
    // Reading streaks
    const readingStreaksStr = await AsyncStorage.getItem('reading_streaks');
    if (readingStreaksStr) {
      updateData.readingStreaks = JSON.parse(readingStreaksStr);
    }
    
    // Reading progress
    const readingProgressStr = await AsyncStorage.getItem('readingProgress');
    if (readingProgressStr) {
      updateData.readingProgress = JSON.parse(readingProgressStr);
    }
    
    // Current reading plan
    const currentReadingPlanStr = await AsyncStorage.getItem('currentReadingPlan');
    if (currentReadingPlanStr) {
      updateData.currentReadingPlan = JSON.parse(currentReadingPlanStr);
    }
    
    // Notification preferences
    const notificationPrefsStr = await AsyncStorage.getItem('notificationPreferences');
    if (notificationPrefsStr) {
      updateData.notificationPreferences = JSON.parse(notificationPrefsStr);
    }
    
    // Selected Bible version preference
    const selectedBibleVersionStr = await AsyncStorage.getItem('selectedBibleVersion');
    if (selectedBibleVersionStr) {
      updateData.selectedBibleVersion = selectedBibleVersionStr;
    }
    
    // Weight unit preference
    const weightUnitStr = await AsyncStorage.getItem('weightUnit');
    if (weightUnitStr) {
      updateData.weightUnit = weightUnitStr;
    }
    
    // Bible maps bookmarks
    const bibleMapsBookmarksStr = await AsyncStorage.getItem('bible_maps_bookmarks');
    if (bibleMapsBookmarksStr) {
      updateData.bibleMapsBookmarks = JSON.parse(bibleMapsBookmarksStr);
    }
    
    // Bible maps visited
    const bibleMapsVisitedStr = await AsyncStorage.getItem('bible_maps_visited');
    if (bibleMapsVisitedStr) {
      updateData.bibleMapsVisited = JSON.parse(bibleMapsVisitedStr);
    }
    
    // Bible fast facts favorites
    const bibleFastFactsFavoritesStr = await AsyncStorage.getItem('bible_fast_facts_favorites');
    if (bibleFastFactsFavoritesStr) {
      updateData.bibleFastFactsFavorites = JSON.parse(bibleFastFactsFavoritesStr);
    }
    
    // Recent Bible searches
    const recentSearchesStr = await AsyncStorage.getItem('recentBibleSearches');
    if (recentSearchesStr) {
      updateData.recentBibleSearches = JSON.parse(recentSearchesStr);
    }
    
    // Prayer completions
    const prayerCompletionsStr = await AsyncStorage.getItem('prayer_completions');
    if (prayerCompletionsStr) {
      updateData.prayerCompletions = JSON.parse(prayerCompletionsStr);
    }
    
    // Prayer preferences
    const prayerPrefsStr = await AsyncStorage.getItem('prayer_preferences');
    if (prayerPrefsStr) {
      updateData.prayerPreferences = JSON.parse(prayerPrefsStr);
    }
    
    // Friend chat history
    const friendChatHistoryStr = await AsyncStorage.getItem('friendChatHistory');
    if (friendChatHistoryStr) {
      updateData.friendChatHistory = JSON.parse(friendChatHistoryStr);
    }
    
    // Key Verses favorites (uses fivefold_ prefix via saveData)
    const favoriteVersesStr = await AsyncStorage.getItem('fivefold_favoriteVerses');
    if (favoriteVersesStr) {
      updateData.favoriteVerses = JSON.parse(favoriteVersesStr);
      console.log('[Sync] Including Key Verses favorites in upload');
    }
    
    // Daily verse data (verse of the day - per user)
    const dailyVerseDataStr = await AsyncStorage.getItem('daily_verse_data_v6');
    const dailyVerseIndexStr = await AsyncStorage.getItem('daily_verse_index_v6');
    const shuffledVersesStr = await AsyncStorage.getItem('shuffled_verses_v6');
    const dailyVerseLastUpdateStr = await AsyncStorage.getItem('daily_verse_last_update_v6');
    
    if (dailyVerseDataStr || dailyVerseIndexStr) {
      updateData.dailyVerseSync = {
        data: dailyVerseDataStr ? JSON.parse(dailyVerseDataStr) : null,
        index: dailyVerseIndexStr ? parseInt(dailyVerseIndexStr) : 0,
        shuffledVerses: shuffledVersesStr ? JSON.parse(shuffledVersesStr) : null,
        lastUpdate: dailyVerseLastUpdateStr || null,
      };
      console.log('[Sync] Including daily verse data in upload');
    }
    
    if (Object.keys(updateData).length > 1) { // More than just lastActive
      await setDoc(doc(db, 'users', userId), updateData, { merge: true });
      console.log('[Sync] Uploaded history data to cloud');
    }
    
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing history:', error);
    return false;
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
    
    // Sync user-specific content to cloud
    await syncSavedVersesToCloud(userId);
    await syncJournalNotesToCloud(userId);
    await syncThemePreferencesToCloud(userId);
    await syncAllHistoryToCloud(userId);
    
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
  syncSavedVersesToCloud,
  syncJournalNotesToCloud,
  syncThemePreferencesToCloud,
  syncAllHistoryToCloud,
};
