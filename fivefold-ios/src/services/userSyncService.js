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
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
// AsyncStorage import removed — all storage now goes through userStorage
import { db, auth } from '../config/firebase';
import userStorage from '../utils/userStorage';
import { getStoredData, saveData } from '../utils/localStorage';

// Returns true only if the Firebase auth user matches the requested userId.
// Sync functions write to users/{userId}; the Firestore rule requires
// request.auth.uid == userId. After sign-out / account deletion, queued
// debounced syncs (App.js firebaseSyncTimerRef, 5s window) can fire with a
// stale userId — without this guard they hit "Missing or insufficient
// permissions" and surface in the dev-client error overlay.
const authMatches = (userId) => !!auth.currentUser && auth.currentUser.uid === userId;

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

// ── Debounced immediate sync ──────────────────────────────────────
// Pushes a specific field to Firebase with a short debounce so rapid
// writes (e.g. highlight changes, food entries) coalesce into one push.
// Fire-and-forget: never blocks the caller, never throws.
const _debounceTimers = {};

/**
 * Push a single field to the current user's Firestore doc (debounced).
 * Safe to call from anywhere — silently no-ops if not logged in.
 * @param {string} firestoreField - The Firestore document field name
 * @param {any} data - The data to store
 * @param {number} delay - Debounce delay in ms (default 1500)
 */
export const pushToCloud = (firestoreField, data, delay = 1500) => {
  if (_debounceTimers[firestoreField]) {
    clearTimeout(_debounceTimers[firestoreField]);
  }

  _debounceTimers[firestoreField] = setTimeout(async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Subcollection-backed fields: route to per-doc storage to avoid
      // 1 MiB Firestore doc limit and write amplification.
      if (firestoreField === 'savedBibleVerses' && Array.isArray(data)) {
        await syncSavedVersesSubcollection(userId, data);
        return;
      }
      if (firestoreField === 'workoutHistory' && Array.isArray(data)) {
        // Prune to last 90 days before sync (matches existing retention policy).
        const pruned = data.filter(w => {
          if (!w) return false;
          const ts = w.completedAt ? new Date(w.completedAt).getTime() : (w.timestamp || 0);
          return !ts || ts > Date.now() - HISTORY_RETENTION_MS;
        });
        await syncArraySubcollection(userId, 'workouts', pruned);
        await setDoc(doc(db, 'users', userId), {
          workoutHistory: deleteField(),
          lastActive: serverTimestamp(),
        }, { merge: true });
        return;
      }
      if (firestoreField === 'foodLog' && data && typeof data === 'object') {
        // foodLog is an object keyed by 'YYYY-MM-DD' → meals array.
        // Stored as one Firestore doc per date in `users/{uid}/food_log`.
        await syncMapSubcollection(userId, 'food_log', data, /* pruneByDateKey */ true);
        await setDoc(doc(db, 'users', userId), {
          foodLog: deleteField(),
          lastActive: serverTimestamp(),
        }, { merge: true });
        return;
      }
      if (firestoreField === 'journalNotes' && Array.isArray(data)) {
        await syncArraySubcollection(userId, 'journal', data);
        await setDoc(doc(db, 'users', userId), {
          journalNotes: deleteField(),
          lastActive: serverTimestamp(),
        }, { merge: true });
        return;
      }
      if (firestoreField === 'simplePrayers' && Array.isArray(data)) {
        await syncArraySubcollection(userId, 'prayers_personal', data);
        await setDoc(doc(db, 'users', userId), {
          simplePrayers: deleteField(),
          lastActive: serverTimestamp(),
        }, { merge: true });
        return;
      }
      if (firestoreField === 'todos' && Array.isArray(data)) {
        await syncArraySubcollection(userId, 'todos', data);
        await setDoc(doc(db, 'users', userId), {
          todos: deleteField(),
          lastActive: serverTimestamp(),
        }, { merge: true });
        return;
      }
      // Smaller per-item arrays — same pattern: subcollection + drop legacy field.
      const ARRAY_TO_SUBCOLLECTION = {
        favoriteVerses: 'favorite_verses',
        foodFavorites: 'food_favorites',
        scaleHistory: 'scale_history',
        scheduledWorkouts: 'scheduled_workouts',
        visions: 'visions',
        prayerBoards: 'prayer_boards',
      };
      const subName = ARRAY_TO_SUBCOLLECTION[firestoreField];
      if (subName && Array.isArray(data)) {
        await syncArraySubcollection(userId, subName, data);
        await setDoc(doc(db, 'users', userId), {
          [firestoreField]: deleteField(),
          lastActive: serverTimestamp(),
        }, { merge: true });
        return;
      }

      await setDoc(doc(db, 'users', userId), {
        [firestoreField]: data,
        lastActive: serverTimestamp(),
      }, { merge: true });
      console.log(`[Sync] Pushed ${firestoreField} to cloud`);
    } catch (error) {
      console.warn(`[Sync] Failed to push ${firestoreField}:`, error.message);
    }
  }, delay);
};

// ── Saved verses subcollection helpers ────────────────────────────
// Storage layout: users/{uid}/saved_verses/{verseId}
// Each verse is its own Firestore doc, sized ~250 bytes.
// Supports unlimited verses per user (no 1 MiB doc cap).

const SAVED_VERSES_SUBCOLLECTION = 'saved_verses';

/**
 * Sanitize a verse.id into a valid Firestore document ID.
 * Firestore docIds cannot contain '/'. Verse IDs use '_' and '-' only,
 * but defensively replace any remaining slashes.
 */
const verseDocId = (verseId) => String(verseId).replace(/\//g, '_');

/**
 * Sync the full saved-verses array to the user's subcollection.
 * Upserts every verse (merge), and deletes cloud docs not in `verses`.
 * One-time migration: removes legacy array field from main user doc.
 */
const syncSavedVersesSubcollection = async (userId, verses) => {
  if (!userId || !Array.isArray(verses)) return;

  const subRef = collection(db, 'users', userId, SAVED_VERSES_SUBCOLLECTION);

  // Read existing IDs in cloud
  const cloudSnap = await getDocs(subRef);
  const cloudIds = new Set();
  cloudSnap.forEach(d => cloudIds.add(d.id));

  // Build local id set + write upserts
  const localIds = new Set();
  let batch = writeBatch(db);
  let opsInBatch = 0;
  const commits = [];

  for (const v of verses) {
    if (!v || !v.id) continue;
    const docId = verseDocId(v.id);
    localIds.add(docId);
    batch.set(doc(subRef, docId), { ...v, syncedAt: serverTimestamp() }, { merge: true });
    opsInBatch++;
    if (opsInBatch >= 450) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  // Delete cloud docs not present locally
  for (const cloudId of cloudIds) {
    if (!localIds.has(cloudId)) {
      batch.delete(doc(subRef, cloudId));
      opsInBatch++;
      if (opsInBatch >= 450) {
        commits.push(batch.commit());
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) commits.push(batch.commit());
  await Promise.all(commits);

  // Remove legacy array field from main doc + bump lastActive
  await setDoc(doc(db, 'users', userId), {
    savedBibleVerses: deleteField(),
    lastActive: serverTimestamp(),
  }, { merge: true });

  let deleted = 0;
  for (const id of cloudIds) if (!localIds.has(id)) deleted++;
  console.log(`[Sync] Synced ${verses.length} saved verses to subcollection (deleted ${deleted} stale)`);
};

/**
 * Read all saved verses from the subcollection.
 * Returns array (may be empty). Caller should fall back to legacy array
 * field on the user doc if this returns empty AND user is mid-migration.
 */
export const pullSavedVersesFromSubcollection = async (userId) => {
  if (!userId) return [];
  try {
    const subRef = collection(db, 'users', userId, SAVED_VERSES_SUBCOLLECTION);
    const snap = await getDocs(subRef);
    const out = [];
    snap.forEach(d => {
      const data = d.data();
      // Strip server-only fields before returning
      const { syncedAt, ...rest } = data;
      out.push(rest);
    });
    return out;
  } catch (e) {
    console.warn('[Sync] pullSavedVersesFromSubcollection failed:', e.message);
    return [];
  }
};

/**
 * Delete a single verse from the cloud subcollection.
 * Used by callers that delete verses individually (cheaper than full re-sync).
 */
export const deleteVerseFromCloud = async (verseId) => {
  const userId = auth.currentUser?.uid;
  if (!userId || !verseId) return;
  try {
    await deleteDoc(doc(db, 'users', userId, SAVED_VERSES_SUBCOLLECTION, verseDocId(verseId)));
  } catch (e) {
    console.warn('[Sync] deleteVerseFromCloud failed:', e.message);
  }
};

/**
 * Generic per-doc subcollection sync. Upserts each item by `id`, deletes
 * cloud docs missing from the local array. Used for any large array that
 * would otherwise blow the 1 MiB user-doc cap (workouts, food log, etc.).
 *
 * Items must have a string/number `id` field — items without are skipped.
 *
 * @param {string} userId
 * @param {string} subcollectionName  e.g. 'workouts', 'food_log', 'journal'
 * @param {Array<object>} items
 */
const syncArraySubcollection = async (userId, subcollectionName, items) => {
  if (!userId || !Array.isArray(items)) return;

  const subRef = collection(db, 'users', userId, subcollectionName);

  const cloudSnap = await getDocs(subRef);
  const cloudIds = new Set();
  cloudSnap.forEach(d => cloudIds.add(d.id));

  const localIds = new Set();
  let batch = writeBatch(db);
  let opsInBatch = 0;
  const commits = [];

  for (const item of items) {
    if (!item || item.id === undefined || item.id === null) continue;
    const docId = verseDocId(item.id); // sanitize slashes
    localIds.add(docId);
    batch.set(doc(subRef, docId), { ...item, syncedAt: serverTimestamp() }, { merge: true });
    opsInBatch++;
    if (opsInBatch >= 450) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  for (const cloudId of cloudIds) {
    if (!localIds.has(cloudId)) {
      batch.delete(doc(subRef, cloudId));
      opsInBatch++;
      if (opsInBatch >= 450) {
        commits.push(batch.commit());
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) commits.push(batch.commit());
  await Promise.all(commits);

  let deleted = 0;
  for (const id of cloudIds) if (!localIds.has(id)) deleted++;
  console.log(`[Sync] Synced ${items.length} items to ${subcollectionName} (deleted ${deleted} stale)`);
};

/**
 * Pull all items from a subcollection into an array. Strips internal
 * `syncedAt` timestamp before returning.
 */
const pullArraySubcollection = async (userId, subcollectionName) => {
  if (!userId) return [];
  try {
    const subRef = collection(db, 'users', userId, subcollectionName);
    const snap = await getDocs(subRef);
    const out = [];
    snap.forEach(d => {
      const { syncedAt, ...rest } = d.data();
      out.push(rest);
    });
    return out;
  } catch (e) {
    console.warn(`[Sync] pullArraySubcollection(${subcollectionName}) failed:`, e.message);
    return [];
  }
};

export { pullArraySubcollection };

/**
 * Sync an object keyed by string (e.g. foodLog keyed by 'YYYY-MM-DD') into
 * a subcollection where each top-level key becomes one doc. Each doc stores
 * its value under `entries` (array) or `value` (anything else) so reads can
 * round-trip cleanly.
 *
 * If `pruneByDateKey` is true, keys parseable as dates older than 90 days
 * are dropped before writing.
 */
const syncMapSubcollection = async (userId, subcollectionName, mapObject, pruneByDateKey = false) => {
  if (!userId || !mapObject || typeof mapObject !== 'object') return;

  const subRef = collection(db, 'users', userId, subcollectionName);
  const cloudSnap = await getDocs(subRef);
  const cloudIds = new Set();
  cloudSnap.forEach(d => cloudIds.add(d.id));

  const localIds = new Set();
  let batch = writeBatch(db);
  let opsInBatch = 0;
  const commits = [];
  const cutoff = Date.now() - HISTORY_RETENTION_MS;

  for (const key of Object.keys(mapObject)) {
    if (pruneByDateKey) {
      const ts = new Date(key).getTime();
      if (!isNaN(ts) && ts < cutoff) continue;
    }
    const value = mapObject[key];
    const docId = verseDocId(key);
    localIds.add(docId);
    const payload = Array.isArray(value)
      ? { entries: value, syncedAt: serverTimestamp() }
      : { value, syncedAt: serverTimestamp() };
    batch.set(doc(subRef, docId), payload, { merge: true });
    opsInBatch++;
    if (opsInBatch >= 450) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      opsInBatch = 0;
    }
  }

  for (const cloudId of cloudIds) {
    if (!localIds.has(cloudId)) {
      batch.delete(doc(subRef, cloudId));
      opsInBatch++;
      if (opsInBatch >= 450) {
        commits.push(batch.commit());
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) commits.push(batch.commit());
  await Promise.all(commits);

  let deletedMap = 0;
  for (const id of cloudIds) if (!localIds.has(id)) deletedMap++;
  console.log(`[Sync] Synced ${Object.keys(mapObject).length} entries to ${subcollectionName} (deleted ${deletedMap} stale)`);
};

/**
 * Pull a map-style subcollection back into a plain object.
 * Each doc's `entries` (array) or `value` field is reattached under its docId.
 */
const pullMapSubcollection = async (userId, subcollectionName) => {
  if (!userId) return {};
  try {
    const subRef = collection(db, 'users', userId, subcollectionName);
    const snap = await getDocs(subRef);
    const out = {};
    snap.forEach(d => {
      const data = d.data();
      if (Array.isArray(data.entries)) out[d.id] = data.entries;
      else if (data.value !== undefined) out[d.id] = data.value;
    });
    return out;
  } catch (e) {
    console.warn(`[Sync] pullMapSubcollection(${subcollectionName}) failed:`, e.message);
    return {};
  }
};

export { pullMapSubcollection };

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
  if (Array.isArray(cleaned.workoutHistory)) {
    const before = cleaned.workoutHistory.length;
    cleaned.workoutHistory = filterRecentHistory(cleaned.workoutHistory);
    if (before !== cleaned.workoutHistory.length) {
      console.log(`[Sync] Cleaned workoutHistory: ${before} → ${cleaned.workoutHistory.length} entries`);
    }
  }

  if (Array.isArray(cleaned.quizHistory)) {
    const before = cleaned.quizHistory.length;
    cleaned.quizHistory = filterRecentHistory(cleaned.quizHistory);
    if (before !== cleaned.quizHistory.length) {
      console.log(`[Sync] Cleaned quizHistory: ${before} → ${cleaned.quizHistory.length} entries`);
    }
  }
  
  if (Array.isArray(cleaned.prayerHistory)) {
    const before = cleaned.prayerHistory.length;
    cleaned.prayerHistory = filterRecentHistory(cleaned.prayerHistory);
    if (before !== cleaned.prayerHistory.length) {
      console.log(`[Sync] Cleaned prayerHistory: ${before} → ${cleaned.prayerHistory.length} entries`);
    }
  }

  if (Array.isArray(cleaned.completedTodos)) {
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
  if (!authMatches(userId)) return false;

  try {
    // Get local stats from multiple sources
    // Note: getStoredData adds 'fivefold_' prefix automatically
    const localStats = await getStoredData('userStats') || {};
    const localProfile = await getStoredData('userProfile');
    
    console.log('[Sync] localStats from getStoredData:', localStats);
    
    // Read points from ALL local sources and take the max.
    // total_points key is the primary, but userStats may be ahead if
    // checkAchievements hasn't run yet (e.g. timed out).
    const totalPointsStr = await userStorage.getRaw('total_points');
    const totalPointsKey = totalPointsStr ? parseInt(totalPointsStr, 10) : 0;
    const statsPoints = Math.max(localStats.totalPoints || 0, localStats.points || 0);
    const pointsToSync = Math.max(totalPointsKey, statsPoints);
    
    // Keep total_points key in sync if userStats was ahead
    if (pointsToSync > totalPointsKey) {
      await userStorage.setRaw('total_points', pointsToSync.toString());
      console.log('[Sync] Fixed total_points key:', totalPointsKey, '->', pointsToSync);
    }
    
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
    
    // Sync seasonal points
    const seasonalPointsStr = await userStorage.getRaw('seasonal_points');
    const seasonalPoints = seasonalPointsStr ? parseInt(seasonalPointsStr, 10) : 0;
    const currentSeasonKey = await userStorage.getRaw('current_season');
    if (seasonalPoints > 0 && currentSeasonKey) {
      updateData.seasonalPoints = seasonalPoints;
      updateData.currentSeason = currentSeasonKey;
    }

    console.log('[Sync] Points to sync:', pointsToSync, '(total_points key:', totalPointsKey, ', userStats:', statsPoints, ')');
    
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
    
    console.log('[Sync] Syncing to cloud:', { totalPoints: updateData.totalPoints, statsPoints: localStats.totalPoints });
    
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
    
    // Merge strategy: use Math.max for all numeric values so the highest
    // value wins regardless of which device wrote it. Points can only go UP
    // (no spending/deduction), so max is always correct.
    const localTotalPointsStr = await userStorage.getRaw('total_points');
    const localTotalPoints = localTotalPointsStr ? parseInt(localTotalPointsStr, 10) : 0;
    const localStatsPoints = Math.max(localStats.totalPoints || 0, localStats.points || 0);
    const cloudPoints = cloudData.totalPoints || cloudData.points || 0;
    
    // The correct total is the HIGHEST of all sources — local total_points key,
    // local userStats, and cloud. Points only ever increase, so max is safe.
    const correctTotalPoints = Math.max(localTotalPoints, localStatsPoints, cloudPoints);
    
    console.log('[Sync] Points merge: local_total_points=', localTotalPoints,
      'localStats=', localStatsPoints, 'cloud=', cloudPoints,
      '=> winner=', correctTotalPoints);
    
    // Import AchievementService for level calculation
    const AchievementService = (await import('./achievementService')).default;
    
    const mergedStats = {
      ...localStats,
      // Use the highest points value from all sources
      totalPoints: correctTotalPoints,
      points: correctTotalPoints,
      // Activity counters: Math.max is fine since these only go up
      currentStreak: Math.max(localStats.currentStreak || 0, cloudData.currentStreak || 0),
      // Level: ALWAYS derive from the correct merged points
      level: AchievementService.getLevelFromPoints(correctTotalPoints),
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
    
    // Save merged data locally — write to BOTH storage keys
    // (saveData writes to 'fivefold_userStats', but many components also read
    // the raw 'userStats' key, so we must keep both in sync)
    await saveData('userStats', mergedStats);
    await userStorage.setRaw('userStats', JSON.stringify(mergedStats));
    await saveData('userProfile', mergedProfile);
    
    // Also update the central total_points key so it reflects the merged value.
    // This is critical: if cloud has higher points than local, the total_points
    // key must be updated, otherwise syncUserStatsToCloud will push stale data.
    await userStorage.setRaw('total_points', correctTotalPoints.toString());
    console.log('[Sync] Updated total_points key to', correctTotalPoints);

    // Merge seasonal points — keep whichever is higher for the current season
    if (cloudData.currentSeason && cloudData.seasonalPoints !== undefined) {
      const localSeasonStr = await userStorage.getRaw('current_season');
      const localSeasonalStr = await userStorage.getRaw('seasonal_points');
      const localSeasonal = localSeasonalStr ? parseInt(localSeasonalStr, 10) : 0;

      if (cloudData.currentSeason === localSeasonStr) {
        const merged = Math.max(localSeasonal, cloudData.seasonalPoints || 0);
        await userStorage.setRaw('seasonal_points', merged.toString());
        console.log('[Sync] Merged seasonal points:', merged);
      } else {
        // Cloud is on a different season — the season service will handle reset on next check
        if (!localSeasonStr) {
          await userStorage.setRaw('seasonal_points', (cloudData.seasonalPoints || 0).toString());
          await userStorage.setRaw('current_season', cloudData.currentSeason);
          console.log('[Sync] Imported seasonal data from cloud:', cloudData.currentSeason);
        }
      }
    }

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
    
    // Saved Bible Verses — pull from subcollection (preferred) or legacy array field.
    // Subcollection layout avoids 1 MiB doc cap and lets users save unlimited verses.
    {
      let cloudVerses = await pullSavedVersesFromSubcollection(userId);
      if ((!cloudVerses || cloudVerses.length === 0) && Array.isArray(cloudData.savedBibleVerses) && cloudData.savedBibleVerses.length > 0) {
        // Legacy: doc still has the old array field. Use it; next push will migrate.
        cloudVerses = cloudData.savedBibleVerses;
      }
      if (cloudVerses && cloudVerses.length > 0) {
        const merged = await mergeArraysById('savedBibleVerses', cloudVerses);
        console.log(`[Sync] Merged saved verses: ${merged?.length || 0} total`);

        const statsStr = await userStorage.getRaw('userStats');
        const stats = statsStr ? JSON.parse(statsStr) : {};
        stats.savedVerses = merged?.length || 0;
        await userStorage.setRaw('userStats', JSON.stringify(stats));
      }
    }
    
    // Journal Notes — pull from `journal` subcollection (preferred) or legacy field.
    {
      let cloudJournal = await pullArraySubcollection(userId, 'journal');
      if ((!cloudJournal || cloudJournal.length === 0) && Array.isArray(cloudData.journalNotes) && cloudData.journalNotes.length > 0) {
        cloudJournal = cloudData.journalNotes;
      }
      if (cloudJournal && cloudJournal.length > 0) {
        const merged = await mergeArraysById('journalNotes', cloudJournal);
        console.log(`[Sync] Merged journal notes: ${merged?.length || 0} total`);
      }
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
    
    // Workout history — pull from `workouts` subcollection (preferred),
    // fall back to legacy `workoutHistory` array field for users mid-migration.
    {
      let cloudWorkouts = await pullArraySubcollection(userId, 'workouts');
      if ((!cloudWorkouts || cloudWorkouts.length === 0) && Array.isArray(cloudData.workoutHistory) && cloudData.workoutHistory.length > 0) {
        cloudWorkouts = cloudData.workoutHistory;
      }
      // Apply 90-day retention to whatever source we used
      if (Array.isArray(cloudWorkouts) && cloudWorkouts.length > 0) {
        cloudWorkouts = filterRecentHistory(cloudWorkouts);
        const merged = await mergeArraysById('@workout_history', cloudWorkouts);
        console.log(`[Sync] Merged workout history: ${merged?.length || 0} entries`);
      }
    }

    // Clean history data from cloud before saving locally (remove entries older than 90 days)
    const cleanedCloudData = cleanHistoryData({
      quizHistory: cloudData.quizHistory,
      prayerHistory: cloudData.prayerHistory,
      completedTodos: cloudData.completedTodos,
    });

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

    // Food log — pull from `food_log` subcollection (preferred) or legacy field.
    // Subcollection holds one doc per date; entries stored under `entries`.
    {
      let cloudFoodLog = await pullMapSubcollection(userId, 'food_log');
      // pullMapSubcollection returns { 'YYYY-MM-DD': arrayOfEntries }; legacy field
      // shape was { 'YYYY-MM-DD': { foods: [...], totals: {...} } } — fall back to that.
      const haveSubcollection = cloudFoodLog && Object.keys(cloudFoodLog).length > 0;
      if (!haveSubcollection && cloudData.foodLog && typeof cloudData.foodLog === 'object') {
        cloudFoodLog = cloudData.foodLog;
      }
      if (cloudFoodLog && Object.keys(cloudFoodLog).length > 0) {
        const localStr = await userStorage.getRaw('@food_log');
        const localLog = localStr ? JSON.parse(localStr) : {};
        const merged = { ...cloudFoodLog };
        for (const [dateKey, localEntries] of Object.entries(localLog)) {
          if (!merged[dateKey]) {
            merged[dateKey] = localEntries;
          } else {
            const cloudEntries = merged[dateKey];
            const cloudFoods = cloudEntries?.foods?.length || (Array.isArray(cloudEntries) ? cloudEntries.length : 0);
            const localFoods = localEntries?.foods?.length || (Array.isArray(localEntries) ? localEntries.length : 0);
            if (localFoods > cloudFoods) merged[dateKey] = localEntries;
          }
        }
        await userStorage.setRaw('@food_log', JSON.stringify(merged));
        console.log(`[Sync] Merged food log: ${Object.keys(merged).length} days`);
      }
    }

    // Food favorites — pull from `food_favorites` subcollection or legacy field.
    {
      let cloudFavs = await pullArraySubcollection(userId, 'food_favorites');
      if ((!cloudFavs || cloudFavs.length === 0) && Array.isArray(cloudData.foodFavorites) && cloudData.foodFavorites.length > 0) {
        cloudFavs = cloudData.foodFavorites;
      }
      if (cloudFavs && cloudFavs.length > 0) {
        const merged = await mergeArraysById('@food_favorites', cloudFavs);
        console.log(`[Sync] Merged food favorites: ${merged?.length || 0}`);
      }
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
    
    // Hub posting token data — don't overwrite if local token was already consumed today
    if (cloudData.hubPostingToken || cloudData.hubTokenSchedule) {
      const today = new Date().toISOString().split('T')[0];
      const localTokenStr = await userStorage.getRaw('hub_posting_token');
      const localToken = localTokenStr ? JSON.parse(localTokenStr) : null;
      const localScheduleStr = await userStorage.getRaw('hub_token_schedule');
      const localSchedule = localScheduleStr ? JSON.parse(localScheduleStr) : null;
      const tokenUsedLocally = (localToken?.date === today && localToken?.available === false) ||
                               localSchedule?.tokenUsedDate === today;
      
      if (tokenUsedLocally) {
        console.log('[Sync] Skipping hub token download — token already consumed locally today');
      } else {
        if (cloudData.hubPostingToken) {
          await userStorage.setRaw('hub_posting_token', JSON.stringify(cloudData.hubPostingToken));
          console.log('[Sync] Downloaded hub_posting_token from cloud');
        }
        if (cloudData.hubTokenSchedule) {
          await userStorage.setRaw('hub_token_schedule', JSON.stringify(cloudData.hubTokenSchedule));
          console.log('[Sync] Downloaded hub_token_schedule from cloud');
        }
      }
    }
    
    // Active todos/tasks — pull from `todos` subcollection (preferred) or legacy field.
    {
      let cloudTodos = await pullArraySubcollection(userId, 'todos');
      if ((!cloudTodos || cloudTodos.length === 0) && Array.isArray(cloudData.todos) && cloudData.todos.length > 0) {
        cloudTodos = cloudData.todos;
      }
      if (cloudTodos && cloudTodos.length > 0) {
        const localStr = await userStorage.getRaw('fivefold_todos');
        const localTodos = localStr ? JSON.parse(localStr) : [];
        const localMap = new Map(localTodos.map(t => [t.id, t]));
        cloudTodos.forEach(cloudTodo => {
          const localTodo = localMap.get(cloudTodo.id);
          if (localTodo) {
            if (localTodo.completed && !cloudTodo.completed) {
              // Keep local version (more recent completion)
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
    {
      let cloudScheduled = await pullArraySubcollection(userId, 'scheduled_workouts');
      if ((!cloudScheduled || cloudScheduled.length === 0) && Array.isArray(cloudData.scheduledWorkouts) && cloudData.scheduledWorkouts.length > 0) {
        cloudScheduled = cloudData.scheduledWorkouts;
      }
      if (cloudScheduled && cloudScheduled.length > 0) {
        await userStorage.setRaw('@scheduled_workouts', JSON.stringify(cloudScheduled));
        console.log(`[Sync] Downloaded ${cloudScheduled.length} scheduled workouts from cloud`);
      }
    }
    
    // Simple prayers — pull from `prayers_personal` subcollection (preferred) or legacy field.
    // Smart merge preserves more recent local completedAt timestamps.
    {
      let cloudPrayers = await pullArraySubcollection(userId, 'prayers_personal');
      if ((!cloudPrayers || cloudPrayers.length === 0) && Array.isArray(cloudData.simplePrayers) && cloudData.simplePrayers.length > 0) {
        cloudPrayers = cloudData.simplePrayers;
      }
      if (cloudPrayers && cloudPrayers.length > 0) {
        const localStr = await userStorage.getRaw('fivefold_simplePrayers');
        const localPrayers = localStr ? JSON.parse(localStr) : [];
        const localCompletions = {};
        localPrayers.forEach(p => {
          if (p.completedAt) localCompletions[p.id] = { completedAt: p.completedAt, canComplete: p.canComplete };
        });
        const merged = cloudPrayers.map(cloudPrayer => {
          const localCompletion = localCompletions[cloudPrayer.id];
          if (localCompletion && localCompletion.completedAt) {
            const localDate = new Date(localCompletion.completedAt);
            const cloudDate = cloudPrayer.completedAt ? new Date(cloudPrayer.completedAt) : new Date(0);
            if (localDate > cloudDate) {
              return { ...cloudPrayer, completedAt: localCompletion.completedAt, canComplete: false };
            }
          }
          return cloudPrayer;
        });
        await userStorage.setRaw('fivefold_simplePrayers', JSON.stringify(merged));
        console.log(`[Sync] Merged ${merged.length} prayers (preserved local completions)`);
      }
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
    // Only apply cloud state when it is strictly newer than local — never roll
    // local back to an older verse/index, which would cause the same verse to
    // keep showing for days.
    if (cloudData.dailyVerseSync) {
      const dvSync = cloudData.dailyVerseSync;
      const localLastUpdate = await userStorage.getRaw('daily_verse_last_update_v6');
      const localIndexStr = await userStorage.getRaw('daily_verse_index_v6');
      const localIndex = parseInt(localIndexStr || '0');
      const cloudIndex = (typeof dvSync.index === 'number')
        ? dvSync.index
        : parseInt(dvSync.index || '0');

      const cloudLastUpdateIsNewer = dvSync.lastUpdate
        && (!localLastUpdate || dvSync.lastUpdate > localLastUpdate);

      if (cloudLastUpdateIsNewer) {
        if (dvSync.data) {
          await userStorage.setRaw('daily_verse_data_v6', JSON.stringify(dvSync.data));
        }
        if (dvSync.index !== undefined && dvSync.index !== null && cloudIndex >= localIndex) {
          await userStorage.setRaw('daily_verse_index_v6', String(cloudIndex));
        }
        if (dvSync.shuffledVerses) {
          await userStorage.setRaw('shuffled_verses_v6', JSON.stringify(dvSync.shuffledVerses));
        }
        await userStorage.setRaw('daily_verse_last_update_v6', dvSync.lastUpdate);
        console.log('[Sync] Applied newer daily verse data from cloud');
      } else {
        // Still accept a higher index from cloud (e.g. another device advanced)
        if (dvSync.index !== undefined && dvSync.index !== null && cloudIndex > localIndex) {
          await userStorage.setRaw('daily_verse_index_v6', String(cloudIndex));
          console.log('[Sync] Advanced daily verse index from cloud (index only)');
        } else {
          console.log('[Sync] Skipping daily verse cloud data — local is newer or equal');
        }
      }
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
    
    // Key Verses favorites — pull from `favorite_verses` subcollection or legacy field.
    {
      let cloudFav = await pullArraySubcollection(userId, 'favorite_verses');
      if ((!cloudFav || cloudFav.length === 0) && Array.isArray(cloudData.favoriteVerses) && cloudData.favoriteVerses.length > 0) {
        cloudFav = cloudData.favoriteVerses;
      }
      if (cloudFav && cloudFav.length > 0) {
        await userStorage.setRaw('fivefold_favoriteVerses', JSON.stringify(cloudFav));
        console.log('[Sync] Downloaded Key Verses favorites from cloud');
      }
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

    // Selected loading animation — only apply if no local selection yet
    if (cloudData.selectedLoadingAnimation) {
      const localAnim = await userStorage.getRaw('fivefold_loading_animation');
      if (!localAnim) {
        await userStorage.setRaw('fivefold_loading_animation', cloudData.selectedLoadingAnimation);
        console.log(`[Sync] Restored loading animation from cloud: ${cloudData.selectedLoadingAnimation}`);
      }
    }

    // Visions — pull from `visions` subcollection or legacy field.
    {
      let cloudVisions = await pullArraySubcollection(userId, 'visions');
      if ((!cloudVisions || cloudVisions.length === 0) && Array.isArray(cloudData.visions) && cloudData.visions.length > 0) {
        cloudVisions = cloudData.visions;
      }
      if (cloudVisions && cloudVisions.length > 0) {
        const merged = await mergeArraysById('visions', cloudVisions);
        console.log(`[Sync] Merged visions: ${merged?.length || 0} total`);
      }
    }

    // Reminders — merge by ID, preserve local completions
    if (cloudData.user_reminders && cloudData.user_reminders.reminders && Array.isArray(cloudData.user_reminders.reminders)) {
      const localStr = await userStorage.getRaw('fivefold_user_reminders');
      const localData = localStr ? JSON.parse(localStr) : { reminders: [] };
      const localReminders = localData.reminders || [];

      const localMap = new Map();
      localReminders.forEach(r => { if (r.id) localMap.set(r.id, r); });

      cloudData.user_reminders.reminders.forEach(r => {
        if (!r.id) return;
        const local = localMap.get(r.id);
        if (local) {
          const mergedCompletions = { ...(r.completions || {}), ...(local.completions || {}) };
          localMap.set(r.id, { ...r, completions: mergedCompletions });
        } else {
          localMap.set(r.id, r);
        }
      });

      const mergedReminders = Array.from(localMap.values());
      await userStorage.setRaw('fivefold_user_reminders', JSON.stringify({ reminders: mergedReminders }));
      console.log(`[Sync] Merged reminders: ${mergedReminders.length} total`);
    }

    // Habits — merge habits array by ID, keep local-only additions
    if (cloudData.user_habits && cloudData.user_habits.habits && Array.isArray(cloudData.user_habits.habits)) {
      const localStr = await userStorage.getRaw('fivefold_user_habits');
      const localData = localStr ? JSON.parse(localStr) : { habits: [] };
      const localHabits = localData.habits || [];

      const localMap = new Map();
      localHabits.forEach(h => { if (h.id) localMap.set(h.id, h); });

      cloudData.user_habits.habits.forEach(h => {
        if (h.id) localMap.set(h.id, h);
      });

      localHabits.forEach(h => {
        if (h.id && !cloudData.user_habits.habits.find(c => c.id === h.id)) {
          localMap.set(h.id, h);
        }
      });

      const mergedHabits = Array.from(localMap.values());
      await userStorage.setRaw('fivefold_user_habits', JSON.stringify({ habits: mergedHabits }));
      console.log(`[Sync] Merged habits: ${mergedHabits.length} total`);
    }

    // Workout split plan — cloud wins (stable config data)
    if (cloudData.splitPlan) {
      const localStr = await userStorage.getRaw('@workout_split_plan');
      if (!localStr) {
        await userStorage.setRaw('@workout_split_plan', JSON.stringify(cloudData.splitPlan));
        console.log('[Sync] Downloaded workout split plan from cloud');
      }
    }

    // Prayer boards — pull from `prayer_boards` subcollection or legacy field.
    {
      let cloudBoards = await pullArraySubcollection(userId, 'prayer_boards');
      if ((!cloudBoards || cloudBoards.length === 0) && Array.isArray(cloudData.prayerBoards) && cloudData.prayerBoards.length > 0) {
        cloudBoards = cloudData.prayerBoards;
      }
      if (cloudBoards && cloudBoards.length > 0) {
        await userStorage.set('prayerBoards_list', cloudBoards);
        console.log(`[Sync] Downloaded ${cloudBoards.length} prayer boards from cloud`);
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
  if (!authMatches(userId)) return false;

  try {
    const savedVersesStr = await userStorage.getRaw('savedBibleVerses');
    if (!savedVersesStr) {
      console.log('[Sync] No saved verses found in local storage to upload');
      return true;
    }
    const savedVerses = JSON.parse(savedVersesStr);
    console.log(`[Sync] Preparing to upload ${savedVerses.length} saved verses to subcollection for user ${userId}`);
    await syncSavedVersesSubcollection(userId, savedVerses);
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
  if (!authMatches(userId)) return false;
  try {
    const journalNotesStr = await userStorage.getRaw('journalNotes');
    if (!journalNotesStr) return true;
    const journalNotes = JSON.parse(journalNotesStr);
    await syncArraySubcollection(userId, 'journal', journalNotes);
    await setDoc(doc(db, 'users', userId), {
      journalNotes: deleteField(),
      lastActive: serverTimestamp(),
    }, { merge: true });
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
  if (!authMatches(userId)) return false;
  try {
    let prayersStr = await userStorage.getRaw('fivefold_simplePrayers');
    if (!prayersStr) prayersStr = await userStorage.getRaw('simplePrayers');
    if (!prayersStr) return true;
    const prayers = JSON.parse(prayersStr);
    await syncArraySubcollection(userId, 'prayers_personal', prayers);
    await setDoc(doc(db, 'users', userId), {
      simplePrayers: deleteField(),
      lastActive: serverTimestamp(),
    }, { merge: true });
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
  if (!authMatches(userId)) return false;

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
  if (!authMatches(userId)) return false;

  try {
    const updateData = { lastActive: serverTimestamp() };
    
    // Workout history — synced to `users/{uid}/workouts` subcollection
    // (NOT the main user doc) to avoid the 1 MiB doc cap. Pruned to last 90 days.
    let workoutHistoryStr = await userStorage.getRaw('@workout_history');
    if (!workoutHistoryStr) workoutHistoryStr = await userStorage.getRaw('workoutHistory');
    if (workoutHistoryStr) {
      const parsed = JSON.parse(workoutHistoryStr);
      const pruned = filterRecentHistory(parsed);
      await syncArraySubcollection(userId, 'workouts', pruned);
      // Strip legacy field from main doc if present.
      updateData.workoutHistory = deleteField();
      console.log(`[Sync] Synced ${pruned.length} workouts to subcollection`);
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

    // Food log — synced to `users/{uid}/food_log` subcollection (one doc per date).
    const foodLogStr = await userStorage.getRaw('@food_log');
    if (foodLogStr) {
      const parsedLog = JSON.parse(foodLogStr);
      await syncMapSubcollection(userId, 'food_log', parsedLog, /* pruneByDateKey */ true);
      updateData.foodLog = deleteField();
      console.log(`[Sync] Synced food log (${Object.keys(parsedLog).length} days) to subcollection`);
    }

    // Food favorites — synced to `users/{uid}/food_favorites` subcollection.
    const foodFavoritesStr = await userStorage.getRaw('@food_favorites');
    if (foodFavoritesStr) {
      const arr = JSON.parse(foodFavoritesStr);
      await syncArraySubcollection(userId, 'food_favorites', arr);
      updateData.foodFavorites = deleteField();
      console.log(`[Sync] Synced ${arr.length} food favorites to subcollection`);
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
    
    // Active todos/tasks — synced to `users/{uid}/todos` subcollection.
    const todosStr = await userStorage.getRaw('fivefold_todos');
    if (todosStr) {
      const todosArr = JSON.parse(todosStr);
      await syncArraySubcollection(userId, 'todos', todosArr);
      updateData.todos = deleteField();
      console.log(`[Sync] Synced ${todosArr.length} todos to subcollection`);
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
    
    // Scheduled workouts — synced to `users/{uid}/scheduled_workouts` subcollection.
    const scheduledWorkoutsStr = await userStorage.getRaw('@scheduled_workouts');
    if (scheduledWorkoutsStr) {
      const arr = JSON.parse(scheduledWorkoutsStr);
      await syncArraySubcollection(userId, 'scheduled_workouts', arr);
      updateData.scheduledWorkouts = deleteField();
      console.log(`[Sync] Synced ${arr.length} scheduled workouts to subcollection`);
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
    
    // Key Verses favorites — synced to `users/{uid}/favorite_verses` subcollection.
    const favoriteVersesStr = await userStorage.getRaw('fivefold_favoriteVerses');
    if (favoriteVersesStr) {
      const arr = JSON.parse(favoriteVersesStr);
      await syncArraySubcollection(userId, 'favorite_verses', arr);
      updateData.favoriteVerses = deleteField();
      console.log(`[Sync] Synced ${arr.length} Key Verses favorites to subcollection`);
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

    // Selected loading animation
    const loadingAnimStr = await userStorage.getRaw('fivefold_loading_animation');
    if (loadingAnimStr) {
      updateData.selectedLoadingAnimation = loadingAnimStr;
      console.log(`[Sync] Including loading animation (${loadingAnimStr}) in upload`);
    }

    // Workout split plan
    const splitPlanStr = await userStorage.getRaw('@workout_split_plan');
    if (splitPlanStr) {
      updateData.splitPlan = JSON.parse(splitPlanStr);
      console.log('[Sync] Including workout split plan in upload');
    }

    // Visions — synced to `users/{uid}/visions` subcollection.
    const visionsStr = await userStorage.getRaw('visions');
    if (visionsStr) {
      const arr = JSON.parse(visionsStr);
      await syncArraySubcollection(userId, 'visions', arr);
      updateData.visions = deleteField();
      console.log(`[Sync] Synced ${arr.length} visions to subcollection`);
    }

    // Habits
    const habitsStr = await userStorage.getRaw('fivefold_user_habits');
    if (habitsStr) {
      updateData.user_habits = JSON.parse(habitsStr);
      console.log(`[Sync] Including habits (${updateData.user_habits.habits?.length || 0}) in upload`);
    }

    // Reminders
    const remindersStr = await userStorage.getRaw('fivefold_user_reminders');
    if (remindersStr) {
      updateData.user_reminders = JSON.parse(remindersStr);
      console.log(`[Sync] Including reminders (${updateData.user_reminders.reminders?.length || 0}) in upload`);
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
    
    // Prayer boards — synced to `users/{uid}/prayer_boards` subcollection.
    const prayerBoardsData = await userStorage.get('prayerBoards_list');
    if (prayerBoardsData && Array.isArray(prayerBoardsData) && prayerBoardsData.length > 0) {
      await syncArraySubcollection(userId, 'prayer_boards', prayerBoardsData);
      updateData.prayerBoards = deleteField();
      console.log(`[Sync] Including prayer boards (${prayerBoardsData.length} boards) in upload`);
    }

    // Seasonal points
    const seasonalPointsStr = await userStorage.getRaw('seasonal_points');
    const currentSeasonStr = await userStorage.getRaw('current_season');
    if (seasonalPointsStr && currentSeasonStr) {
      updateData.seasonalPoints = parseInt(seasonalPointsStr, 10) || 0;
      updateData.currentSeason = currentSeasonStr;
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
  if (!authMatches(userId)) return false;

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
  pushToCloud,
};
