/**
 * Profile Data Preload Cache
 * 
 * Pre-loads Profile tab data from local storage during the cold launch
 * loading screen, so when the user opens the Profile tab, everything
 * is instantly available without a second loading phase.
 * 
 * Flow:
 * 1. AuthContext calls preloadProfileData() during cold launch
 *    (while the animated loading screen is showing)
 * 2. ProfileTab calls getPreloadedProfileData() on mount
 *    to instantly populate state with cached values
 * 3. ProfileTab calls clearProfilePreloadCache() after consuming
 * 4. Full loaders still run in background for fresh data
 */

import userStorage from './userStorage';

// Module-level cache — persists across renders, accessible synchronously
let _cache = null;

/**
 * Pre-load all key Profile data from userStorage.
 * Call during cold launch while the loading screen is still visible.
 * All reads are local (AsyncStorage), so this adds ~50-100ms max.
 */
export const preloadProfileData = async () => {
  try {
    const [
      savedVersesRaw,
      userStatsRaw,
      journalNotesRaw,
      highlightViewModeRaw,
      streakAnimRaw,
      loadingAnimRaw,
      badgeTogglesRaw,
      bluetickEnabledRaw,
      vibrationRaw,
      liquidGlassRaw,
      bibleVersionRaw,
      weightUnitRaw,
      heightUnitRaw,
      todosRaw,
      userProfileRaw,
      purchasedVersionsRaw,
      authCacheRaw,
    ] = await Promise.all([
      userStorage.getRaw('savedBibleVerses'),
      userStorage.get('fivefold_userStats'),
      userStorage.getRaw('journalNotes'),
      userStorage.getRaw('highlightViewMode'),
      userStorage.getRaw('fivefold_streak_animation'),
      userStorage.getRaw('fivefold_loading_animation'),
      userStorage.getRaw('fivefold_badge_toggles'),
      userStorage.getRaw('fivefold_bluetick_enabled'),
      userStorage.getRaw('fivefold_vibration'),
      userStorage.getRaw('fivefold_liquidGlass'),
      userStorage.getRaw('selectedBibleVersion'),
      userStorage.getRaw('weightUnit'),
      userStorage.getRaw('heightUnit'),
      userStorage.getRaw('fivefold_todos'),
      userStorage.getRaw('userProfile'),
      userStorage.getRaw('purchasedBibleVersions'),
      userStorage.getRaw('@biblely_user_cache'),
    ]);

    _cache = {
      savedVerses: savedVersesRaw ? JSON.parse(savedVersesRaw) : [],
      userStats: userStatsRaw || null,
      journalNotes: journalNotesRaw ? JSON.parse(journalNotesRaw) : [],
      highlightViewMode: highlightViewModeRaw || 'compact',
      streakAnim: streakAnimRaw || null,
      loadingAnim: loadingAnimRaw || null,
      badgeToggles: badgeTogglesRaw ? JSON.parse(badgeTogglesRaw) : null,
      bluetickEnabled: bluetickEnabledRaw,
      vibrationEnabled: vibrationRaw !== 'false',
      liquidGlassEnabled: liquidGlassRaw !== 'false',
      bibleVersion: bibleVersionRaw || null,
      weightUnit: weightUnitRaw || 'kg',
      heightUnit: heightUnitRaw || 'cm',
      todos: todosRaw ? JSON.parse(todosRaw) : [],
      userProfile: userProfileRaw ? JSON.parse(userProfileRaw) : null,
      purchasedVersions: purchasedVersionsRaw ? JSON.parse(purchasedVersionsRaw) : [],
      authProfile: authCacheRaw ? JSON.parse(authCacheRaw) : null,
    };

    console.log('[ProfilePreload] Pre-loaded Profile data from local storage');
    return _cache;
  } catch (e) {
    console.warn('[ProfilePreload] Error pre-loading:', e?.message);
    _cache = null;
    return null;
  }
};

/**
 * Get pre-loaded data (synchronous read from module-level cache).
 * Returns null if preload hasn't run or failed.
 */
export const getPreloadedProfileData = () => _cache;

/**
 * Clear the preload cache after ProfileTab has consumed it.
 */
export const clearProfilePreloadCache = () => {
  _cache = null;
};
