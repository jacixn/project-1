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
// AsyncStorage import removed — all storage now goes through userStorage
import { db } from '../config/firebase';
import userStorage from '../utils/userStorage';
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

// History retention period (90 days in milliseconds)
const HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Filter history array to only keep entries from the last 90 days
 * Handles various date formats commonly used in history entries
 * @param {Array} historyArray - Array of history entries
 * @param {string} dateField - The field name containing the date (default: 'date' or 'completedAt')
 * @returns {Array} - Filtered array with only recent entries
 */
const filterRecentHistory = (historyArray, dateField = null) => {
  if (!Array.isArray(historyArray)) return [];
  
  const cutoffDate = Date.now() - HISTORY_RETENTION_MS;
  
  return historyArray.filter(entry => {
    if (!entry) return false;
    
    // Try to find a date field
    let entryDate = null;
    
    // Check common date field names
    const dateFields = dateField ? [dateField] : ['date', 'completedAt', 'completedDate', 'createdAt', 'timestamp', 'time'];
    
    for (const field of dateFields) {
      if (entry[field]) {
        const dateValue = entry[field];
        
        // Handle different date formats
        if (typeof dateValue === 'number') {
          entryDate = dateValue;
        } else if (typeof dateValue === 'string') {
          entryDate = new Date(dateValue).getTime();
        } else if (dateValue?.toMillis) {
          // Firestore Timestamp
          entryDate = dateValue.toMillis();
        } else if (dateValue?.seconds) {
          // Firestore Timestamp object
          entryDate = dateValue.seconds * 1000;
        }
        
        if (entryDate && !isNaN(entryDate)) break;
      }
    }
    
    // If no valid date found, keep the entry (don't delete unknowns)
    if (!entryDate || isNaN(entryDate)) return true;
    
    // Keep if within 90 days
    return entryDate > cutoffDate;
  });
};

/**
 * Clean all history data - removes entries older than 90 days
 * @param {Object} data - Object containing history arrays
 * @returns {Object} - Cleaned data object
 */
const cleanHistoryData = (data) => {
  const cleaned = { ...data };
  
  // Clean each history type
  if (cleaned.workoutHistory) {
    const before = cleaned.workoutHistory.length;
    cleaned.workoutHistory = filterRecentHistory(cleaned.workoutHistory);
    if (before !== cleaned.workoutHistory.length) {
      console.log(`[Sync] Cleaned workoutHistory: ${before} → ${cleaned.workoutHistory.length} entries`);
    }
  }
  
  if (cleaned.quizHistory) {
    const before = cleaned.quizHistory.length;
    cleaned.quizHistory = filterRecentHistory(cleaned.quizHistory);
    if (before !== cleaned.quizHistory.length) {
      console.log(`[Sync] Cleaned quizHistory: ${before} → ${cleaned.quizHistory.length} entries`);
    }
  }
  
  if (cleaned.prayerHistory) {
    const before = cleaned.prayerHistory.length;
    cleaned.prayerHistory = filterRecentHistory(cleaned.prayerHistory);
    if (before !== cleaned.prayerHistory.length) {
      console.log(`[Sync] Cleaned prayerHistory: ${before} → ${cleaned.prayerHistory.length} entries`);
    }
  }
  
  if (cleaned.completedTodos) {
    const before = cleaned.completedTodos.length;
    cleaned.completedTodos = filterRecentHistory(cleaned.completedTodos);
    if (before !== cleaned.completedTodos.length) {
      console.log(`[Sync] Cleaned completedTodos: ${before} → ${cleaned.completedTodos.length} entries`);
    }
  }
  
  // Clean food log — remove date entries older than 90 days
  if (cleaned.foodLog && typeof cleaned.foodLog === 'object') {
    const cutoffDate = new Date(Date.now() - HISTORY_RETENTION_MS);
    const cutoffKey = cutoffDate.toISOString().split('T')[0]; // e.g. "2025-11-11"
    const beforeCount = Object.keys(cleaned.foodLog).length;
    for (const dateKey of Object.keys(cleaned.foodLog)) {
      if (dateKey < cutoffKey) {
        delete cleaned.foodLog[dateKey];
      }
    }
    const afterCount = Object.keys(cleaned.foodLog).length;
    if (beforeCount !== afterCount) {
      console.log(`[Sync] Cleaned foodLog: ${beforeCount} → ${afterCount} days`);
    }
  }
  
  return cleaned;
};

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
    
    // Read points from single source of truth: total_points key
    // (managed centrally by achievementService.checkAchievements())
    const totalPointsStr = await userStorage.getRaw('total_points');
    const pointsToSync = totalPointsStr ? parseInt(totalPointsStr, 10) : 0;
    
    // Prepare update data
    const updateData = {
      lastActive: serverTimestamp(),
    };
    
    if (pointsToSync > 0) {
      updateData.totalPoints = pointsToSync;
      // Also update level based on points
      const { default: AchievementService } = await import('./achievementService');
      updateData.level = AchievementService.getLevelFromPoints(pointsToSync);
    }
    
    console.log('[Sync] Points to sync:', pointsToSync);
    
    // Add other stats fields
    // IMPORTANT: Get streak from app_open_streak (AppStreakManager's key) - this is the actual streak
    let streakToSync = 0;
    try {
      const appStreakStr = await userStorage.getRaw('app_open_streak');
      if (appStreakStr) {
        const appStreakData = JSON.parse(appStreakStr);
        streakToSync = appStreakData.currentStreak || 0;
      }
    } catch (e) {
      console.warn('[Sync] Error reading app_open_streak:', e);
    }
    
    if (streakToSync > 0) {
      updateData.currentStreak = streakToSync;
    }
    
    if (localStats.level !== undefined) updateData.level = localStats.level;
    if (localStats.prayersCompleted !== undefined) updateData.prayersCompleted = localStats.prayersCompleted;
    if (localStats.completedTasks !== undefined) updateData.tasksCompleted = localStats.completedTasks;
    if (localStats.workoutsCompleted !== undefined) updateData.workoutsCompleted = localStats.workoutsCompleted;
    if (localStats.quizzesTaken !== undefined) updateData.quizzesTaken = localStats.quizzesTaken;
    // Achievement-relevant activity counters
    if (localStats.savedVerses !== undefined) updateData.savedVerses = localStats.savedVerses;
    if (localStats.versesShared !== undefined) updateData.versesShared = localStats.versesShared;
    if (localStats.audiosPlayed !== undefined) updateData.audiosPlayed = localStats.audiosPlayed;
    if (localStats.charactersRead !== undefined) updateData.charactersRead = localStats.charactersRead;
    if (localStats.timelineErasViewed !== undefined) updateData.timelineErasViewed = localStats.timelineErasViewed;
    if (localStats.mapsVisited !== undefined) updateData.mapsVisited = localStats.mapsVisited;
    if (localStats.versesRead !== undefined) updateData.versesRead = localStats.versesRead;
    if (localStats.exercisesLogged !== undefined) updateData.exercisesLogged = localStats.exercisesLogged;
    if (localStats.setsCompleted !== undefined) updateData.setsCompleted = localStats.setsCompleted;
    if (localStats.workoutMinutes !== undefined) updateData.workoutMinutes = localStats.workoutMinutes;
    if (localStats.gymWeekStreak !== undefined) updateData.gymWeekStreak = localStats.gymWeekStreak;
    
    // Add profile fields
    if (localProfile) {
      if (localProfile.displayName) updateData.displayName = localProfile.displayName;
      if (localProfile.profilePicture) updateData.profilePicture = localProfile.profilePicture;
      if (localProfile.country) updateData.country = localProfile.country;
      if (localProfile.countryFlag) updateData.countryFlag = localProfile.countryFlag;
      if (localProfile.countryCode) updateData.countryCode = localProfile.countryCode;
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
    // For totalPoints: local total_points key is the single source of truth
    // (managed centrally by achievementService.checkAchievements())
    const localTotalPointsStr = await userStorage.getRaw('total_points');
    const localTotalPoints = localTotalPointsStr ? parseInt(localTotalPointsStr, 10) : 0;
    
    const mergedStats = {
      ...localStats,
      // totalPoints: use local total_points as source of truth, NOT Math.max with cloud
      totalPoints: localTotalPoints,
      points: localTotalPoints,
      // Activity counters: Math.max is fine since these only go up
      currentStreak: Math.max(localStats.currentStreak || 0, cloudData.currentStreak || 0),
      level: Math.max(localStats.level || 1, cloudData.level || 1),
      prayersCompleted: Math.max(localStats.prayersCompleted || 0, cloudData.prayersCompleted || 0),
      completedTasks: Math.max(localStats.completedTasks || 0, cloudData.tasksCompleted || 0),
      workoutsCompleted: Math.max(localStats.workoutsCompleted || 0, cloudData.workoutsCompleted || 0),
      quizzesTaken: Math.max(localStats.quizzesTaken || 0, cloudData.quizzesTaken || 0),
      // Achievement-relevant activity counters
      savedVerses: Math.max(localStats.savedVerses || 0, cloudData.savedVerses || 0),
      versesShared: Math.max(localStats.versesShared || 0, cloudData.versesShared || 0),
      audiosPlayed: Math.max(localStats.audiosPlayed || 0, cloudData.audiosPlayed || 0),
      charactersRead: Math.max(localStats.charactersRead || 0, cloudData.charactersRead || 0),
      timelineErasViewed: Math.max(localStats.timelineErasViewed || 0, cloudData.timelineErasViewed || 0),
      mapsVisited: Math.max(localStats.mapsVisited || 0, cloudData.mapsVisited || 0),
      versesRead: Math.max(localStats.versesRead || 0, cloudData.versesRead || 0),
      exercisesLogged: Math.max(localStats.exercisesLogged || 0, cloudData.exercisesLogged || 0),
      setsCompleted: Math.max(localStats.setsCompleted || 0, cloudData.setsCompleted || 0),
      workoutMinutes: Math.max(localStats.workoutMinutes || 0, cloudData.workoutMinutes || 0),
      gymWeekStreak: Math.max(localStats.gymWeekStreak || 0, cloudData.gymWeekStreak || 0),
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
    
    // total_points is managed centrally by achievementService.checkAchievements()
    // Do NOT overwrite it from cloud data during sync
    
    // Also save profile picture URL to local storage for ProfileTab
    if (cloudData.profilePicture) {
      const storedProfile = await userStorage.getRaw('userProfile');
      const localProfileData = storedProfile ? JSON.parse(storedProfile) : {};
      localProfileData.profilePicture = cloudData.profilePicture;
      await userStorage.setRaw('userProfile', JSON.stringify(localProfileData));
      console.log('[Sync] Downloaded profile picture URL from cloud');
    }
    
    // ============================================================
    // SMART MERGE: Always keep whichever data is more recent
    // This prevents background sync from overwriting recent local changes
    // ============================================================
    
    // Helper: merge arrays by ID, keeping more recent items
    const mergeArraysById = async (key, cloudArray, idField = 'id') => {
      if (!cloudArray || !Array.isArray(cloudArray)) return;
      const localStr = await userStorage.getRaw(key);
      const localArray = localStr ? JSON.parse(localStr) : [];
      
      // Create map of local items by ID
      const localMap = new Map();
      localArray.forEach(item => {
        const id = item[idField];
        if (id) localMap.set(id, item);
      });
      
      // Merge: cloud items + any local items not in cloud
      cloudArray.forEach(item => {
        const id = item[idField];
        if (id) localMap.set(id, item); // Cloud wins for items that exist in both
      });
      
      // But also add any LOCAL-ONLY items (created since last sync)
      localArray.forEach(item => {
        const id = item[idField];
        if (id && !cloudArray.find(c => c[idField] === id)) {
          localMap.set(id, item); // Keep local-only items
        }
      });
      
      const merged = Array.from(localMap.values());
      await userStorage.setRaw(key, JSON.stringify(merged));
      return merged;
    };
    
    // Saved Bible Verses - merge by ID, keep local-only additions
    if (cloudData.savedBibleVerses && Array.isArray(cloudData.savedBibleVerses)) {
      const merged = await mergeArraysById('savedBibleVerses', cloudData.savedBibleVerses);
      console.log(`[Sync] Merged saved verses: ${merged?.length || 0} total`);
      
      const statsStr = await userStorage.getRaw('userStats');
      const stats = statsStr ? JSON.parse(statsStr) : {};
      stats.savedVerses = merged?.length || 0;
      await userStorage.setRaw('userStats', JSON.stringify(stats));
    }
    
    // Journal Notes - merge by ID, keep local-only additions
    if (cloudData.journalNotes && Array.isArray(cloudData.journalNotes)) {
      const merged = await mergeArraysById('journalNotes', cloudData.journalNotes);
      console.log(`[Sync] Merged journal notes: ${merged?.length || 0} total`);
    }
    
    // Theme Preferences - ONLY apply cloud theme if local has NO theme set
    // This prevents background sync from overwriting the user's current theme choice
    if (cloudData.themePreferences) {
      const localTheme = await userStorage.getRaw('fivefold_theme');
      if (!localTheme) {
        // No local theme = fresh install or new device, apply cloud theme
        const { theme, darkMode, wallpaperIndex } = cloudData.themePreferences;
        if (theme) await userStorage.setRaw('fivefold_theme', theme);
        if (darkMode !== undefined) await userStorage.setRaw('fivefold_dark_mode', JSON.stringify(darkMode));
        if (wallpaperIndex !== undefined) await userStorage.setRaw('fivefold_wallpaper_index', String(wallpaperIndex));
        console.log('[Sync] Applied cloud theme to fresh install (no local theme found)');
      } else {
        console.log('[Sync] Skipping cloud theme - local theme already set:', localTheme);
      }
    }
    
    // Clean history data from cloud before saving locally (remove entries older than 90 days)
    const cleanedCloudData = cleanHistoryData({
      workoutHistory: cloudData.workoutHistory,
      quizHistory: cloudData.quizHistory,
      prayerHistory: cloudData.prayerHistory,
      completedTodos: cloudData.completedTodos,
    });
    
    // Workout history - merge, keep local-only entries
    // Note: workoutService uses @workout_history key
    if (cleanedCloudData.workoutHistory && cleanedCloudData.workoutHistory.length > 0) {
      const merged = await mergeArraysById('@workout_history', cleanedCloudData.workoutHistory);
      console.log(`[Sync] Merged workout history: ${merged?.length || 0} entries`);
    }

    // Workout templates - cloud + local-only
    if (cloudData.workoutTemplates && Array.isArray(cloudData.workoutTemplates)) {
      const merged = await mergeArraysById('@workout_templates', cloudData.workoutTemplates);
      console.log(`[Sync] Merged workout templates: ${merged?.length || 0}`);
    }

    // Workout folders - cloud + local-only
    if (cloudData.workoutFolders && Array.isArray(cloudData.workoutFolders)) {
      const merged = await mergeArraysById('@workout_folders', cloudData.workoutFolders);
      console.log(`[Sync] Merged workout folders: ${merged?.length || 0}`);
    }

    // Nutrition profile - cloud wins (more stable data)
    if (cloudData.nutritionProfile) {
      const localStr = await userStorage.getRaw('@nutrition_profile');
      const localProfile = localStr ? JSON.parse(localStr) : null;
      // Keep whichever was updated more recently
      if (!localProfile || (cloudData.nutritionProfile.updatedAt && (!localProfile.updatedAt || new Date(cloudData.nutritionProfile.updatedAt) >= new Date(localProfile.updatedAt)))) {
        await userStorage.setRaw('@nutrition_profile', JSON.stringify(cloudData.nutritionProfile));
        console.log('[Sync] Downloaded nutrition profile from cloud');
      } else {
        console.log('[Sync] Local nutrition profile is more recent, keeping local');
      }
    }

    // Food log - merge date keys (each key is a date like "2026-02-09")
    if (cloudData.foodLog && typeof cloudData.foodLog === 'object') {
      const localStr = await userStorage.getRaw('@food_log');
      const localLog = localStr ? JSON.parse(localStr) : {};
      // Merge: for each date, keep whichever has more entries
      const merged = { ...cloudData.foodLog };
      for (const [dateKey, localEntries] of Object.entries(localLog)) {
        if (!merged[dateKey]) {
          merged[dateKey] = localEntries;
        } else {
          // Keep whichever has more food entries for that day
          const cloudEntries = merged[dateKey];
          const cloudFoods = cloudEntries.foods?.length || 0;
          const localFoods = localEntries.foods?.length || 0;
          if (localFoods > cloudFoods) {
            merged[dateKey] = localEntries;
          }
        }
      }
      await userStorage.setRaw('@food_log', JSON.stringify(merged));
      console.log(`[Sync] Merged food log: ${Object.keys(merged).length} days`);
    }

    // Food favorites - merge by ID
    if (cloudData.foodFavorites && Array.isArray(cloudData.foodFavorites)) {
      const merged = await mergeArraysById('@food_favorites', cloudData.foodFavorites);
      console.log(`[Sync] Merged food favorites: ${merged?.length || 0}`);
    }

    // Physique scores - cloud wins
    if (cloudData.physiqueScores) {
      await userStorage.setRaw('@physique_scores', JSON.stringify(cloudData.physiqueScores));
      console.log('[Sync] Downloaded physique scores from cloud');
    }
    
    // Quiz history - merge, keep local-only entries
    if (cleanedCloudData.quizHistory && cleanedCloudData.quizHistory.length > 0) {
      const merged = await mergeArraysById('quizHistory', cleanedCloudData.quizHistory);
      console.log(`[Sync] Merged quiz history: ${merged?.length || 0} entries`);
    }
    
    // Prayer history - merge, keep local-only entries
    if (cleanedCloudData.prayerHistory && cleanedCloudData.prayerHistory.length > 0) {
      const merged = await mergeArraysById('prayerHistory', cleanedCloudData.prayerHistory);
      console.log(`[Sync] Merged prayer history: ${merged?.length || 0} entries`);
    }
    
    // User prayers (custom prayer settings/names/times)
    if (cloudData.userPrayers) {
      await userStorage.setRaw('userPrayers', JSON.stringify(cloudData.userPrayers));
      console.log('[Sync] Downloaded userPrayers from cloud');
    }
    
    // Hub posting token data
    if (cloudData.hubPostingToken) {
      await userStorage.setRaw('hub_posting_token', JSON.stringify(cloudData.hubPostingToken));
      console.log('[Sync] Downloaded hub_posting_token from cloud');
    }
    if (cloudData.hubTokenSchedule) {
      await userStorage.setRaw('hub_token_schedule', JSON.stringify(cloudData.hubTokenSchedule));
      console.log('[Sync] Downloaded hub_token_schedule from cloud');
    }
    
    // Active todos/tasks - merge by ID, preserve local completion state
    if (cloudData.todos) {
      const localStr = await userStorage.getRaw('fivefold_todos');
      const localTodos = localStr ? JSON.parse(localStr) : [];
      const localMap = new Map(localTodos.map(t => [t.id, t]));
      
      // Merge: keep local completion state if more recent
      cloudData.todos.forEach(cloudTodo => {
        const localTodo = localMap.get(cloudTodo.id);
        if (localTodo) {
          // If local is completed but cloud isn't, keep local (user completed it this session)
          if (localTodo.completed && !cloudTodo.completed) {
            // Keep local version
          } else {
            localMap.set(cloudTodo.id, cloudTodo);
          }
        } else {
          localMap.set(cloudTodo.id, cloudTodo);
        }
      });
      
      const merged = Array.from(localMap.values());
      await userStorage.setRaw('fivefold_todos', JSON.stringify(merged));
      console.log(`[Sync] Merged ${merged.length} todos`);
    }
    
    // Completed todos/tasks (cleaned) - merge, keep local-only completions
    if (cleanedCloudData.completedTodos && cleanedCloudData.completedTodos.length > 0) {
      const merged = await mergeArraysById('completedTodos', cleanedCloudData.completedTodos);
      console.log(`[Sync] Merged completed todos: ${merged?.length || 0} entries`);
    }
    
    // App streak data - SMART MERGE: keep whichever is more recent
    if (cloudData.appStreakData) {
      const localStreakStr = await userStorage.getRaw('app_open_streak');
      const localStreak = localStreakStr ? JSON.parse(localStreakStr) : null;
      
      if (localStreak && localStreak.lastOpenDate) {
        // Compare using totalOpens as a proxy for "more recent" (higher = more recent)
        // Also check if local lastOpenDate is today (meaning user already tracked this session)
        const today = new Date().toDateString();
        const localIsToday = localStreak.lastOpenDate === today;
        const localOpens = localStreak.totalOpens || 0;
        const cloudOpens = cloudData.appStreakData.totalOpens || 0;
        
        if (localIsToday || localOpens >= cloudOpens) {
          // Local is more recent or tracked today - DON'T overwrite
          console.log('[Sync] Local streak data is more recent (today or higher opens), keeping local');
        } else {
          // Cloud is more recent - use cloud data
          await userStorage.setRaw('app_streak_data', JSON.stringify(cloudData.appStreakData));
          await userStorage.setRaw('app_open_streak', JSON.stringify(cloudData.appStreakData));
          console.log('[Sync] Cloud streak data is more recent, using cloud');
        }
      } else {
        // No local data - use cloud
        await userStorage.setRaw('app_streak_data', JSON.stringify(cloudData.appStreakData));
        await userStorage.setRaw('app_open_streak', JSON.stringify(cloudData.appStreakData));
        console.log('[Sync] No local streak data, using cloud');
      }
    } else if (cloudData.currentStreak > 0) {
      const localStreakStr = await userStorage.getRaw('app_open_streak');
      if (!localStreakStr) {
        const streakData = {
          currentStreak: cloudData.currentStreak || 0,
          lastOpenDate: new Date().toISOString().split('T')[0],
        };
        await userStorage.setRaw('app_open_streak', JSON.stringify(streakData));
        console.log('[Sync] Created streak data from currentStreak:', cloudData.currentStreak);
      }
    }
    
    // Scheduled workouts (gym)
    if (cloudData.scheduledWorkouts) {
      await userStorage.setRaw('@scheduled_workouts', JSON.stringify(cloudData.scheduledWorkouts));
      console.log(`[Sync] Downloaded ${cloudData.scheduledWorkouts.length} scheduled workouts from cloud`);
    }
    
    // Simple prayers - SMART MERGE: preserve local completedAt timestamps
    if (cloudData.simplePrayers && Array.isArray(cloudData.simplePrayers)) {
      const localStr = await userStorage.getRaw('fivefold_simplePrayers');
      const localPrayers = localStr ? JSON.parse(localStr) : [];
      
      // Build map of local completion states
      const localCompletions = {};
      localPrayers.forEach(p => {
        if (p.completedAt) localCompletions[p.id] = { completedAt: p.completedAt, canComplete: p.canComplete };
      });
      
      // Merge: use cloud prayers but preserve more recent local completedAt
      const merged = cloudData.simplePrayers.map(cloudPrayer => {
        const localCompletion = localCompletions[cloudPrayer.id];
        if (localCompletion && localCompletion.completedAt) {
          const localDate = new Date(localCompletion.completedAt);
          const cloudDate = cloudPrayer.completedAt ? new Date(cloudPrayer.completedAt) : new Date(0);
          if (localDate > cloudDate) {
            // Local completion is more recent - keep it
            return { ...cloudPrayer, completedAt: localCompletion.completedAt, canComplete: false };
          }
        }
        return cloudPrayer;
      });
      
      await userStorage.setRaw('fivefold_simplePrayers', JSON.stringify(merged));
      console.log(`[Sync] Merged ${merged.length} prayers (preserved local completions)`);
    }
    
    // Verse data (contains highlights) - SMART MERGE: keep local additions
    if (cloudData.verseData) {
      const localStr = await userStorage.getRaw('verse_data');
      const localData = localStr ? JSON.parse(localStr) : {};
      
      // Merge: cloud + any local-only verse data
      const merged = { ...cloudData.verseData };
      for (const [verseId, localVerseData] of Object.entries(localData)) {
        if (!merged[verseId]) {
          merged[verseId] = localVerseData; // Local-only highlight/note
        }
      }
      
      await userStorage.setRaw('verse_data', JSON.stringify(merged));
      console.log(`[Sync] Merged verse_data: ${Object.keys(merged).length} entries`);
    }
    
    // Highlight custom names
    if (cloudData.highlightNames) {
      await userStorage.setRaw('highlight_names', JSON.stringify(cloudData.highlightNames));
      console.log('[Sync] Downloaded highlight names from cloud');
    }
    
    // Bookmarks - merge, keep local-only additions
    if (cloudData.bookmarks) {
      const localStr = await userStorage.getRaw('bookmarks');
      const localBookmarks = localStr ? JSON.parse(localStr) : (Array.isArray(cloudData.bookmarks) ? [] : {});
      
      if (Array.isArray(cloudData.bookmarks)) {
        const merged = await mergeArraysById('bookmarks', cloudData.bookmarks);
        console.log(`[Sync] Merged bookmarks: ${merged?.length || 0}`);
      } else {
        const merged = { ...cloudData.bookmarks, ...localBookmarks };
        await userStorage.setRaw('bookmarks', JSON.stringify(merged));
        console.log('[Sync] Merged bookmarks (object)');
      }
    }
    
    // Reading streaks
    if (cloudData.readingStreaks) {
      await userStorage.setRaw('reading_streaks', JSON.stringify(cloudData.readingStreaks));
      console.log('[Sync] Downloaded reading streaks from cloud');
    }
    
    // Reading progress
    if (cloudData.readingProgress) {
      await userStorage.setRaw('readingProgress', JSON.stringify(cloudData.readingProgress));
      console.log('[Sync] Downloaded reading progress from cloud');
    }
    
    // Current reading plan
    if (cloudData.currentReadingPlan) {
      await userStorage.setRaw('currentReadingPlan', JSON.stringify(cloudData.currentReadingPlan));
      console.log('[Sync] Downloaded current reading plan from cloud');
    }
    
    // Notification preferences
    if (cloudData.notificationPreferences) {
      await userStorage.setRaw('notificationPreferences', JSON.stringify(cloudData.notificationPreferences));
      console.log('[Sync] Downloaded notification preferences from cloud');
    }
    
    // Daily verse data (verse of the day - per user)
    if (cloudData.dailyVerseSync) {
      const dvSync = cloudData.dailyVerseSync;
      if (dvSync.data) {
        await userStorage.setRaw('daily_verse_data_v6', JSON.stringify(dvSync.data));
      }
      if (dvSync.index !== undefined && dvSync.index !== null) {
        await userStorage.setRaw('daily_verse_index_v6', String(dvSync.index));
      }
      if (dvSync.shuffledVerses) {
        await userStorage.setRaw('shuffled_verses_v6', JSON.stringify(dvSync.shuffledVerses));
      }
      if (dvSync.lastUpdate) {
        await userStorage.setRaw('daily_verse_last_update_v6', dvSync.lastUpdate);
      }
      console.log('[Sync] Downloaded daily verse data from cloud');
    }
    
    // Selected Bible version preference
    if (cloudData.selectedBibleVersion) {
      await userStorage.setRaw('selectedBibleVersion', cloudData.selectedBibleVersion);
      console.log('[Sync] Downloaded selected Bible version from cloud');
    }
    
    // Weight unit preference
    if (cloudData.weightUnit) {
      await userStorage.setRaw('weightUnit', cloudData.weightUnit);
      console.log('[Sync] Downloaded weight unit from cloud');
    }

    // Height unit preference
    if (cloudData.heightUnit) {
      await userStorage.setRaw('heightUnit', cloudData.heightUnit);
      console.log('[Sync] Downloaded height unit from cloud');
    }
    
    // Bible maps bookmarks
    if (cloudData.bibleMapsBookmarks) {
      await userStorage.setRaw('bible_maps_bookmarks', JSON.stringify(cloudData.bibleMapsBookmarks));
      console.log('[Sync] Downloaded bible maps bookmarks from cloud');
    }
    
    // Bible maps visited
    if (cloudData.bibleMapsVisited) {
      await userStorage.setRaw('bible_maps_visited', JSON.stringify(cloudData.bibleMapsVisited));
      console.log('[Sync] Downloaded bible maps visited from cloud');
    }
    
    // Bible fast facts favorites
    if (cloudData.bibleFastFactsFavorites) {
      await userStorage.setRaw('bible_fast_facts_favorites', JSON.stringify(cloudData.bibleFastFactsFavorites));
      console.log('[Sync] Downloaded bible fast facts favorites from cloud');
    }
    
    // Recent Bible searches
    if (cloudData.recentBibleSearches) {
      await userStorage.setRaw('recentBibleSearches', JSON.stringify(cloudData.recentBibleSearches));
      console.log('[Sync] Downloaded recent Bible searches from cloud');
    }
    
    // Prayer completions - SMART MERGE: keep more recent completedAt per prayer
    if (cloudData.prayerCompletions) {
      const localStr = await userStorage.getRaw('prayer_completions');
      const localCompletions = localStr ? JSON.parse(localStr) : {};
      
      const merged = { ...cloudData.prayerCompletions };
      for (const [prayerId, localData] of Object.entries(localCompletions)) {
        if (!merged[prayerId] || 
            (localData.completedAt && (!merged[prayerId].completedAt || new Date(localData.completedAt) > new Date(merged[prayerId].completedAt)))) {
          merged[prayerId] = localData;
        }
      }
      
      await userStorage.setRaw('prayer_completions', JSON.stringify(merged));
      console.log('[Sync] Merged prayer completions (preserved local)');
    }
    
    // Prayer preferences
    if (cloudData.prayerPreferences) {
      await userStorage.setRaw('prayer_preferences', JSON.stringify(cloudData.prayerPreferences));
      console.log('[Sync] Downloaded prayer preferences from cloud');
    }
    
    // Friend chat history - merge, keep local-only messages
    if (cloudData.friendChatHistory) {
      const localStr = await userStorage.getRaw('friendChatHistory');
      const localHistory = localStr ? JSON.parse(localStr) : [];
      
      if (Array.isArray(cloudData.friendChatHistory) && Array.isArray(localHistory)) {
        const merged = await mergeArraysById('friendChatHistory', cloudData.friendChatHistory);
        console.log(`[Sync] Merged friend chat history: ${merged?.length || 0}`);
      } else {
        await userStorage.setRaw('friendChatHistory', JSON.stringify(cloudData.friendChatHistory));
        console.log('[Sync] Downloaded friend chat history from cloud');
      }
    }
    
    // Key Verses favorites
    if (cloudData.favoriteVerses) {
      await userStorage.setRaw('fivefold_favoriteVerses', JSON.stringify(cloudData.favoriteVerses));
      console.log('[Sync] Downloaded Key Verses favorites from cloud');
    }
    
    // ── Achievement & Customisation Data ──────────────────────────
    // Unlocked achievements — merge: union of local + cloud
    if (cloudData.achievementsUnlocked && Array.isArray(cloudData.achievementsUnlocked)) {
      const localStr = await userStorage.getRaw('fivefold_achievements_unlocked');
      const localIds = localStr ? JSON.parse(localStr) : [];
      const merged = [...new Set([...localIds, ...cloudData.achievementsUnlocked])];
      await userStorage.setRaw('fivefold_achievements_unlocked', JSON.stringify(merged));
      console.log(`[Sync] Merged achievements: ${merged.length} total (local ${localIds.length} + cloud ${cloudData.achievementsUnlocked.length})`);
    }

    // Prestige count — keep whichever is higher
    if (cloudData.achievementsPrestige !== undefined) {
      const localStr = await userStorage.getRaw('fivefold_achievements_prestige');
      const localPrestige = localStr ? parseInt(localStr, 10) : 0;
      const mergedPrestige = Math.max(localPrestige, cloudData.achievementsPrestige || 0);
      await userStorage.setRaw('fivefold_achievements_prestige', mergedPrestige.toString());
      console.log(`[Sync] Merged prestige: ${mergedPrestige} (local ${localPrestige}, cloud ${cloudData.achievementsPrestige})`);
    }

    // Permanent unlock flags — union of local + cloud
    if (cloudData.permanentUnlocks && typeof cloudData.permanentUnlocks === 'object') {
      for (const [achId, val] of Object.entries(cloudData.permanentUnlocks)) {
        if (val) {
          await userStorage.setRaw(`fivefold_unlock_${achId}`, 'true');
        }
      }
      console.log('[Sync] Restored permanent unlock flags from cloud');
    }

    // Selected streak animation — only apply if no local selection yet
    if (cloudData.selectedStreakAnimation) {
      const localAnim = await userStorage.getRaw('fivefold_streak_animation');
      if (!localAnim) {
        await userStorage.setRaw('fivefold_streak_animation', cloudData.selectedStreakAnimation);
        console.log(`[Sync] Restored streak animation from cloud: ${cloudData.selectedStreakAnimation}`);
      }
    }

    // Badge toggles — only apply if no local toggles yet
    if (cloudData.badgeToggles && typeof cloudData.badgeToggles === 'object') {
      const localToggles = await userStorage.getRaw('fivefold_badge_toggles');
      if (!localToggles) {
        await userStorage.setRaw('fivefold_badge_toggles', JSON.stringify(cloudData.badgeToggles));
        console.log('[Sync] Restored badge toggles from cloud');
      }
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
    const savedVersesStr = await userStorage.getRaw('savedBibleVerses');
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
    const journalNotesStr = await userStorage.getRaw('journalNotes');
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
 * Sync user prayers to cloud (the prayers shown on Bible tab)
 * @param {string} userId - The user's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const syncPrayersToCloud = async (userId) => {
  if (!userId) return false;
  
  try {
    // Try the main key first (fivefold_ prefix is added by saveData)
    let prayersStr = await userStorage.getRaw('fivefold_simplePrayers');
    console.log('[Sync] Checking fivefold_simplePrayers:', prayersStr ? `found ${JSON.parse(prayersStr).length} prayers` : 'not found');
    
    if (!prayersStr) {
      // Fallback to non-prefixed key
      prayersStr = await userStorage.getRaw('simplePrayers');
      console.log('[Sync] Checking simplePrayers fallback:', prayersStr ? `found ${JSON.parse(prayersStr).length} prayers` : 'not found');
    }
    
    if (prayersStr) {
      const prayers = JSON.parse(prayersStr);
      console.log('[Sync] Uploading prayers to cloud:', prayers.map(p => ({ id: p.id, name: p.name })));
      
      await setDoc(doc(db, 'users', userId), {
        simplePrayers: prayers,
        lastActive: serverTimestamp(),
      }, { merge: true });
      console.log(`[Sync] Successfully uploaded ${prayers.length} prayers to Firestore for user ${userId}`);
    } else {
      console.log('[Sync] No prayers found in local storage to upload');
    }
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing prayers:', error);
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
    const theme = await userStorage.getRaw('fivefold_theme');
    const darkModeStr = await userStorage.getRaw('fivefold_dark_mode');
    const wallpaperIndexStr = await userStorage.getRaw('fivefold_wallpaper_index');
    
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
    
    // Workout history (workoutService stores under @workout_history)
    let workoutHistoryStr = await userStorage.getRaw('@workout_history');
    if (!workoutHistoryStr) workoutHistoryStr = await userStorage.getRaw('workoutHistory');
    if (workoutHistoryStr) {
      updateData.workoutHistory = JSON.parse(workoutHistoryStr);
      console.log(`[Sync] Including workout history (${updateData.workoutHistory.length} entries) in upload`);
    }

    // Workout templates
    const workoutTemplatesStr = await userStorage.getRaw('@workout_templates');
    if (workoutTemplatesStr) {
      updateData.workoutTemplates = JSON.parse(workoutTemplatesStr);
      console.log(`[Sync] Including workout templates (${updateData.workoutTemplates.length}) in upload`);
    }

    // Workout folders
    const workoutFoldersStr = await userStorage.getRaw('@workout_folders');
    if (workoutFoldersStr) {
      updateData.workoutFolders = JSON.parse(workoutFoldersStr);
      console.log(`[Sync] Including workout folders (${updateData.workoutFolders.length}) in upload`);
    }

    // Nutrition profile
    const nutritionProfileStr = await userStorage.getRaw('@nutrition_profile');
    if (nutritionProfileStr) {
      updateData.nutritionProfile = JSON.parse(nutritionProfileStr);
      console.log('[Sync] Including nutrition profile in upload');
    }

    // Food log
    const foodLogStr = await userStorage.getRaw('@food_log');
    if (foodLogStr) {
      updateData.foodLog = JSON.parse(foodLogStr);
      console.log('[Sync] Including food log in upload');
    }

    // Food favorites
    const foodFavoritesStr = await userStorage.getRaw('@food_favorites');
    if (foodFavoritesStr) {
      updateData.foodFavorites = JSON.parse(foodFavoritesStr);
      console.log(`[Sync] Including food favorites (${updateData.foodFavorites.length}) in upload`);
    }

    // Physique scores
    const physiqueScoresStr = await userStorage.getRaw('@physique_scores');
    if (physiqueScoresStr) {
      updateData.physiqueScores = JSON.parse(physiqueScoresStr);
      console.log('[Sync] Including physique scores in upload');
    }
    
    // Quiz history
    const quizHistoryStr = await userStorage.getRaw('quizHistory');
    if (quizHistoryStr) {
      updateData.quizHistory = JSON.parse(quizHistoryStr);
    }
    
    // Prayer history
    const prayerHistoryStr = await userStorage.getRaw('prayerHistory');
    if (prayerHistoryStr) {
      updateData.prayerHistory = JSON.parse(prayerHistoryStr);
    }
    
    // User prayers (custom prayer settings/names/times)
    const userPrayersStr = await userStorage.getRaw('userPrayers');
    if (userPrayersStr) {
      updateData.userPrayers = JSON.parse(userPrayersStr);
      console.log('[Sync] Including userPrayers in upload');
    }
    
    // Hub posting token data
    const hubTokenStr = await userStorage.getRaw('hub_posting_token');
    if (hubTokenStr) {
      updateData.hubPostingToken = JSON.parse(hubTokenStr);
      console.log('[Sync] Including hub_posting_token in upload');
    }
    const hubScheduleStr = await userStorage.getRaw('hub_token_schedule');
    if (hubScheduleStr) {
      updateData.hubTokenSchedule = JSON.parse(hubScheduleStr);
      console.log('[Sync] Including hub_token_schedule in upload');
    }
    
    // Active todos/tasks
    const todosStr = await userStorage.getRaw('fivefold_todos');
    if (todosStr) {
      updateData.todos = JSON.parse(todosStr);
    }
    
    // Completed todos/tasks
    const completedTodosStr = await userStorage.getRaw('completedTodos');
    if (completedTodosStr) {
      updateData.completedTodos = JSON.parse(completedTodosStr);
    }
    
    // App streak data - read from app_open_streak (AppStreakManager's actual key)
    const streakDataStr = await userStorage.getRaw('app_open_streak');
    if (streakDataStr) {
      updateData.appStreakData = JSON.parse(streakDataStr);
      console.log('[Sync] Syncing streak data to cloud:', updateData.appStreakData);
    } else {
      // Fallback to old key for backwards compatibility
      const oldStreakDataStr = await userStorage.getRaw('app_streak_data');
      if (oldStreakDataStr) {
        updateData.appStreakData = JSON.parse(oldStreakDataStr);
      }
    }
    
    // Scheduled workouts (gym)
    const scheduledWorkoutsStr = await userStorage.getRaw('@scheduled_workouts');
    if (scheduledWorkoutsStr) {
      updateData.scheduledWorkouts = JSON.parse(scheduledWorkoutsStr);
      console.log('[Sync] Including scheduled workouts in upload');
    }
    
    // Highlights - stored in verse_data key by VerseDataManager
    const verseDataStr = await userStorage.getRaw('verse_data');
    console.log('[Sync] verse_data from AsyncStorage:', verseDataStr ? `found (${verseDataStr.length} chars)` : 'not found');
    if (verseDataStr) {
      const verseData = JSON.parse(verseDataStr);
      updateData.verseData = verseData;
      const highlightCount = Object.keys(verseData).length;
      console.log(`[Sync] Including verse_data (${highlightCount} entries) in upload`);
    }
    
    // Highlight custom names
    const highlightNamesStr = await userStorage.getRaw('highlight_names');
    if (highlightNamesStr) {
      updateData.highlightNames = JSON.parse(highlightNamesStr);
    }
    
    // Bookmarks
    const bookmarksStr = await userStorage.getRaw('bookmarks');
    if (bookmarksStr) {
      updateData.bookmarks = JSON.parse(bookmarksStr);
    }
    
    // Reading streaks
    const readingStreaksStr = await userStorage.getRaw('reading_streaks');
    if (readingStreaksStr) {
      updateData.readingStreaks = JSON.parse(readingStreaksStr);
    }
    
    // Reading progress
    const readingProgressStr = await userStorage.getRaw('readingProgress');
    if (readingProgressStr) {
      updateData.readingProgress = JSON.parse(readingProgressStr);
    }
    
    // Current reading plan
    const currentReadingPlanStr = await userStorage.getRaw('currentReadingPlan');
    if (currentReadingPlanStr) {
      updateData.currentReadingPlan = JSON.parse(currentReadingPlanStr);
    }
    
    // Notification preferences
    const notificationPrefsStr = await userStorage.getRaw('notificationPreferences');
    if (notificationPrefsStr) {
      updateData.notificationPreferences = JSON.parse(notificationPrefsStr);
    }
    
    // Selected Bible version preference
    const selectedBibleVersionStr = await userStorage.getRaw('selectedBibleVersion');
    if (selectedBibleVersionStr) {
      updateData.selectedBibleVersion = selectedBibleVersionStr;
    }
    
    // Weight unit preference
    const weightUnitStr = await userStorage.getRaw('weightUnit');
    if (weightUnitStr) {
      updateData.weightUnit = weightUnitStr;
    }

    // Height unit preference
    const heightUnitStr = await userStorage.getRaw('heightUnit');
    if (heightUnitStr) {
      updateData.heightUnit = heightUnitStr;
    }
    
    // Bible maps bookmarks
    const bibleMapsBookmarksStr = await userStorage.getRaw('bible_maps_bookmarks');
    if (bibleMapsBookmarksStr) {
      updateData.bibleMapsBookmarks = JSON.parse(bibleMapsBookmarksStr);
    }
    
    // Bible maps visited
    const bibleMapsVisitedStr = await userStorage.getRaw('bible_maps_visited');
    if (bibleMapsVisitedStr) {
      updateData.bibleMapsVisited = JSON.parse(bibleMapsVisitedStr);
    }
    
    // Bible fast facts favorites
    const bibleFastFactsFavoritesStr = await userStorage.getRaw('bible_fast_facts_favorites');
    if (bibleFastFactsFavoritesStr) {
      updateData.bibleFastFactsFavorites = JSON.parse(bibleFastFactsFavoritesStr);
    }
    
    // Recent Bible searches
    const recentSearchesStr = await userStorage.getRaw('recentBibleSearches');
    if (recentSearchesStr) {
      updateData.recentBibleSearches = JSON.parse(recentSearchesStr);
    }
    
    // Prayer completions
    const prayerCompletionsStr = await userStorage.getRaw('prayer_completions');
    if (prayerCompletionsStr) {
      updateData.prayerCompletions = JSON.parse(prayerCompletionsStr);
    }
    
    // Prayer preferences
    const prayerPrefsStr = await userStorage.getRaw('prayer_preferences');
    if (prayerPrefsStr) {
      updateData.prayerPreferences = JSON.parse(prayerPrefsStr);
    }
    
    // Friend chat history
    const friendChatHistoryStr = await userStorage.getRaw('friendChatHistory');
    if (friendChatHistoryStr) {
      updateData.friendChatHistory = JSON.parse(friendChatHistoryStr);
    }
    
    // Key Verses favorites (uses fivefold_ prefix via saveData)
    const favoriteVersesStr = await userStorage.getRaw('fivefold_favoriteVerses');
    if (favoriteVersesStr) {
      updateData.favoriteVerses = JSON.parse(favoriteVersesStr);
      console.log('[Sync] Including Key Verses favorites in upload');
    }
    
    // ── Achievement & Customisation Data ──────────────────────────
    // Unlocked achievements list
    const achievementsStr = await userStorage.getRaw('fivefold_achievements_unlocked');
    if (achievementsStr) {
      updateData.achievementsUnlocked = JSON.parse(achievementsStr);
      console.log(`[Sync] Including ${updateData.achievementsUnlocked.length} unlocked achievements in upload`);
    }

    // Prestige count
    const prestigeStr = await userStorage.getRaw('fivefold_achievements_prestige');
    if (prestigeStr) {
      updateData.achievementsPrestige = parseInt(prestigeStr, 10);
      console.log(`[Sync] Including prestige count (${updateData.achievementsPrestige}) in upload`);
    }

    // Permanent unlock flags for customisation gates
    const CUSTOMISATION_GATE_IDS = [
      'app_streak_15', 'chars_5', 'read_25', 'tasks_25', 'saved_25',
      'read_50', 'prayers_5', 'saved_5', 'tasks_10', 'audio_5', 'saved_10',
      'app_streak_30',
    ];
    const permanentUnlocks = {};
    for (const id of CUSTOMISATION_GATE_IDS) {
      const val = await userStorage.getRaw(`fivefold_unlock_${id}`);
      if (val === 'true') {
        permanentUnlocks[id] = true;
      }
    }
    if (Object.keys(permanentUnlocks).length > 0) {
      updateData.permanentUnlocks = permanentUnlocks;
      console.log(`[Sync] Including ${Object.keys(permanentUnlocks).length} permanent unlock flags in upload`);
    }

    // Selected streak animation
    const streakAnimStr = await userStorage.getRaw('fivefold_streak_animation');
    if (streakAnimStr) {
      updateData.selectedStreakAnimation = streakAnimStr;
      console.log(`[Sync] Including streak animation (${streakAnimStr}) in upload`);
    }

    // Badge toggles
    const badgeTogglesStr = await userStorage.getRaw('fivefold_badge_toggles');
    if (badgeTogglesStr) {
      updateData.badgeToggles = JSON.parse(badgeTogglesStr);
      console.log('[Sync] Including badge toggles in upload');
    }

    // Daily verse data (verse of the day - per user)
    const dailyVerseDataStr = await userStorage.getRaw('daily_verse_data_v6');
    const dailyVerseIndexStr = await userStorage.getRaw('daily_verse_index_v6');
    const shuffledVersesStr = await userStorage.getRaw('shuffled_verses_v6');
    const dailyVerseLastUpdateStr = await userStorage.getRaw('daily_verse_last_update_v6');
    
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
      // Clean history data - remove entries older than 90 days to save Firebase costs
      const cleanedData = cleanHistoryData(updateData);
      
      await setDoc(doc(db, 'users', userId), cleanedData, { merge: true });
      console.log('[Sync] Uploaded history data to cloud (cleaned entries older than 90 days)');
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
    await syncPrayersToCloud(userId);
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
