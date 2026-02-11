/**
 * userStorage.js — UID-scoped AsyncStorage wrapper
 *
 * Every user-specific key is stored as  u:{uid}:{key}  in AsyncStorage.
 * Firebase UIDs are immutable and never reused, so data from a deleted
 * account can never leak into a new account, even if the username is recycled.
 *
 * Usage:
 *   import userStorage from '../utils/userStorage';
 *   await userStorage.initUser(uid);          // call once on sign-in/sign-up
 *   await userStorage.set('userStats', data); // writes to u:<uid>:userStats
 *   const d = await userStorage.get('userStats');
 *   await userStorage.clearUser();            // call on sign-out
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Module-level state ──────────────────────────────────────────────────────
let _currentUid = null;

// ── Key helpers ─────────────────────────────────────────────────────────────
const scopedKey = (uid, key) => `u:${uid}:${key}`;

const requireUid = () => {
  if (!_currentUid) {
    console.warn('[userStorage] No active user — returning null. Did you call initUser()?');
  }
  return _currentUid;
};

// ── Legacy keys to migrate (matches the old ALL_USER_DATA_KEYS list) ────────
const LEGACY_KEYS = [
  'onboardingCompleted', 'onboarding_complete',
  'userProfile', 'fivefold_userProfile', 'fivefold_userName', 'fivefold_profilePicture', 'user_profile',
  'userStats', 'fivefold_userStats', 'fivefold_user_stats', 'total_points', 'userLevel', 'userPoints',
  'fivefold_achievements_unlocked', 'fivefold_achievements_prestige', 'achievements',
  'fivefold_unlock_app_streak_15', 'fivefold_unlock_chars_5', 'fivefold_unlock_read_25',
  'fivefold_unlock_tasks_25', 'fivefold_unlock_saved_25', 'fivefold_unlock_read_50',
  'fivefold_unlock_prayers_5', 'fivefold_unlock_saved_5', 'fivefold_unlock_tasks_10',
  'fivefold_unlock_audio_5', 'fivefold_unlock_saved_10', 'fivefold_unlock_app_streak_30',
  'fivefold_streak_animation', 'fivefold_badge_toggles', 'fivefold_bluetick_enabled',
  'fivefold_streak_modal_last_shown',
  'fivefold_theme', 'fivefold_dark_mode', 'fivefold_wallpaper_index', 'fivefold_theme_updated_at',
  'theme_preference', 'wallpaper_preference',
  'selectedBibleVersion', 'selectedLanguage', 'weightUnit', 'heightUnit',
  'highlightViewMode', 'smart_features_enabled', 'purchasedBibleVersions',
  'savedBibleVerses', 'fivefold_savedBibleVerses', 'fivefold_favoriteVerses',
  'journalNotes', 'journal_notes', 'journal_notes_migrated', 'bookmarks',
  'verse_data', 'highlight_names', 'highlight_custom_names',
  'reading_streaks', 'readingProgress', 'currentReadingPlan',
  'daily_verse_data_v6', 'daily_verse_index_v6', 'shuffled_verses_v6',
  'daily_verse_last_update_v6', 'daily_verse', 'votd_dismiss_type', 'votd_dismissed_date',
  'prayerHistory', 'prayer_completions', 'prayer_preferences',
  'userPrayers', 'fivefold_userPrayers', 'customPrayerNames', 'customPrayerTimes',
  'prayers', 'fivefold_prayers', 'simplePrayers', 'fivefold_simplePrayers', 'enhancedPrayers',
  'app_streak_data', 'app_open_streak', 'app_open_dates',
  'todos', 'fivefold_todos', 'completedTodos',
  'workoutHistory', '@workout_history', '@workout_templates', '@workout_folders',
  '@scheduled_workouts', 'quizHistory',
  '@nutrition_profile', '@food_log', '@food_favorites', '@physique_scores',
  'bible_maps_bookmarks', 'bible_maps_visited', 'bible_fast_facts_favorites', 'recentBibleSearches',
  'fivefold_thematicGuideReflections', 'fivefold_completedThematicGuides',
  'hub_token_notification_sent', 'hub_posting_token', 'hub_token_schedule', 'hub_token_last_delivery',
  'notificationPreferences', 'notificationSettings',
  'friendChatHistory',
  'userPainPoint', 'userAttribution',
  'fivefold_settings', 'fivefold_lastResetDate',
  'app_settings', 'app_language', 'fivefold_vibration', 'fivefold_liquidGlass',
  'audio_stories_sort_order', 'audio_stories_playback_mode',
  '@biblely_user_cache',
];

// ── Migration ───────────────────────────────────────────────────────────────
const MIGRATION_FLAG = '_migrated';

const migrateIfNeeded = async (uid) => {
  try {
    const flag = await AsyncStorage.getItem(scopedKey(uid, MIGRATION_FLAG));
    if (flag === 'true') return; // already migrated

    console.log('[userStorage] Running one-time migration for', uid);
    let migrated = 0;

    // Read all legacy keys in one batch
    const pairs = await AsyncStorage.multiGet(LEGACY_KEYS);

    const toSet = [];
    const toRemove = [];

    for (const [legacyKey, value] of pairs) {
      if (value !== null) {
        toSet.push([scopedKey(uid, legacyKey), value]);
        toRemove.push(legacyKey);
        migrated++;
      }
    }

    // Write scoped versions
    if (toSet.length > 0) {
      await AsyncStorage.multiSet(toSet);
    }

    // Remove legacy keys so they cannot leak to another user
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }

    // Mark migration done
    await AsyncStorage.setItem(scopedKey(uid, MIGRATION_FLAG), 'true');
    console.log(`[userStorage] Migration complete — moved ${migrated} keys`);
  } catch (err) {
    console.error('[userStorage] Migration error:', err);
    // Don't throw — the app should still work with empty local state
    // (cloud data will be downloaded during sync)
  }
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialise storage for a user. Call once after sign-in or sign-up.
 * Runs legacy data migration on the first call for this UID.
 */
const initUser = async (uid) => {
  if (!uid) {
    console.error('[userStorage] initUser called without a UID');
    return;
  }
  _currentUid = uid;
  console.log('[userStorage] Active user set:', uid);
  await migrateIfNeeded(uid);
};

/**
 * Forget the active user (call on sign-out).
 * Data stays safely namespaced in AsyncStorage — no deletion needed.
 */
const clearUser = () => {
  console.log('[userStorage] Cleared active user');
  _currentUid = null;
};

/**
 * Get the current UID (useful for services that need it).
 */
const getCurrentUid = () => _currentUid;

// ── Read / Write (JSON) ─────────────────────────────────────────────────────

const get = async (key) => {
  const uid = requireUid();
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(scopedKey(uid, key));
    return raw != null ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`[userStorage] get(${key}):`, err);
    return null;
  }
};

const set = async (key, value) => {
  const uid = requireUid();
  if (!uid) return false;
  try {
    await AsyncStorage.setItem(scopedKey(uid, key), JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[userStorage] set(${key}):`, err);
    return false;
  }
};

const remove = async (key) => {
  const uid = requireUid();
  if (!uid) return;
  try {
    await AsyncStorage.removeItem(scopedKey(uid, key));
  } catch (err) {
    console.error(`[userStorage] remove(${key}):`, err);
  }
};

// ── Read / Write (raw strings, no JSON parse/stringify) ─────────────────────

const getRaw = async (key) => {
  const uid = requireUid();
  if (!uid) return null;
  try {
    return await AsyncStorage.getItem(scopedKey(uid, key));
  } catch (err) {
    console.error(`[userStorage] getRaw(${key}):`, err);
    return null;
  }
};

const setRaw = async (key, value) => {
  const uid = requireUid();
  if (!uid) return false;
  try {
    await AsyncStorage.setItem(scopedKey(uid, key), value);
    return true;
  } catch (err) {
    console.error(`[userStorage] setRaw(${key}):`, err);
    return false;
  }
};

// ── Bulk operations ─────────────────────────────────────────────────────────

const multiRemove = async (keys) => {
  const uid = requireUid();
  if (!uid) return;
  try {
    await AsyncStorage.multiRemove(keys.map(k => scopedKey(uid, k)));
  } catch (err) {
    console.error('[userStorage] multiRemove error:', err);
  }
};

const multiGet = async (keys) => {
  const uid = requireUid();
  if (!uid) return [];
  try {
    const results = await AsyncStorage.multiGet(keys.map(k => scopedKey(uid, k)));
    // Return array of [originalKey, parsedValue]
    return results.map(([scopedK, raw], i) => [keys[i], raw != null ? JSON.parse(raw) : null]);
  } catch (err) {
    console.error('[userStorage] multiGet error:', err);
    return keys.map(k => [k, null]);
  }
};

// ── Export ───────────────────────────────────────────────────────────────────
const userStorage = {
  initUser,
  clearUser,
  getCurrentUid,
  get,
  set,
  remove,
  getRaw,
  setRaw,
  multiRemove,
  multiGet,
};

export default userStorage;
