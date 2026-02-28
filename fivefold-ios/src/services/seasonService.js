/**
 * Season Service
 *
 * Manages seasonal leaderboard scoring. Every ~90 days a new season starts
 * and all users' seasonal points reset to 0. All-time totalPoints remain
 * untouched — only the seasonal counter resets.
 *
 * Seasons:
 *   Winter  (Dec 1 – Feb 28/29)
 *   Spring  (Mar 1 – May 31)
 *   Summer  (Jun 1 – Aug 31)
 *   Autumn  (Sep 1 – Nov 30)
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import userStorage from '../utils/userStorage';

const SEASONAL_POINTS_KEY = 'seasonal_points';
const CURRENT_SEASON_KEY = 'current_season';

const SEASON_CONFIG = {
  winter: { name: 'Winter', icon: 'ac-unit', color: '#3B82F6', emoji: '' },
  spring: { name: 'Spring', icon: 'local-florist', color: '#10B981', emoji: '' },
  summer: { name: 'Summer', icon: 'wb-sunny', color: '#F59E0B', emoji: '' },
  autumn: { name: 'Autumn', icon: 'eco', color: '#F97316', emoji: '' },
};

/**
 * Determine the current season from the calendar date.
 * Winter spans Dec of previous year through Feb, keyed to the Feb year.
 */
export const getCurrentSeason = () => {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  let id, seasonYear;

  if (month >= 2 && month <= 4) {
    id = 'spring';
    seasonYear = year;
  } else if (month >= 5 && month <= 7) {
    id = 'summer';
    seasonYear = year;
  } else if (month >= 8 && month <= 10) {
    id = 'autumn';
    seasonYear = year;
  } else {
    id = 'winter';
    seasonYear = month === 11 ? year + 1 : year;
  }

  const config = SEASON_CONFIG[id];
  return {
    id,
    key: `${id}_${seasonYear}`,
    year: seasonYear,
    ...config,
  };
};

/**
 * Get the end date of the current season (for countdown display).
 */
export const getSeasonEndDate = () => {
  const season = getCurrentSeason();
  const y = season.year;

  switch (season.id) {
    case 'winter': return new Date(y, 2, 1); // Mar 1
    case 'spring': return new Date(y, 5, 1); // Jun 1
    case 'summer': return new Date(y, 8, 1); // Sep 1
    case 'autumn': return new Date(y, 11, 1); // Dec 1
    default: return new Date(y, 2, 1);
  }
};

/**
 * Days remaining in the current season.
 */
export const getDaysRemaining = () => {
  const end = getSeasonEndDate();
  const now = new Date();
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Check if the season has changed since last check.
 * If so, reset seasonal points to 0 for the current user.
 * Returns { reset: boolean, season: object }.
 */
export const checkSeasonReset = async () => {
  const season = getCurrentSeason();

  try {
    const storedSeason = await userStorage.getRaw(CURRENT_SEASON_KEY);

    if (storedSeason === season.key) {
      return { reset: false, season };
    }

    // New season — reset seasonal points
    await userStorage.setRaw(SEASONAL_POINTS_KEY, '0');
    await userStorage.setRaw(CURRENT_SEASON_KEY, season.key);

    const userId = auth.currentUser?.uid;
    if (userId) {
      setDoc(doc(db, 'users', userId), {
        seasonalPoints: 0,
        currentSeason: season.key,
        lastActive: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }

    console.log(`[Season] New season: ${season.name} ${season.year} — points reset`);
    return { reset: true, season };
  } catch (error) {
    console.warn('[Season] Error checking season reset:', error);
    return { reset: false, season };
  }
};

/**
 * Add points to the seasonal counter.
 * Called from every point-awarding location alongside the all-time total.
 */
export const addSeasonalPoints = async (points) => {
  if (!points || points <= 0) return;

  try {
    await checkSeasonReset();

    const currentStr = await userStorage.getRaw(SEASONAL_POINTS_KEY);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const newTotal = current + points;

    await userStorage.setRaw(SEASONAL_POINTS_KEY, newTotal.toString());

    const userId = auth.currentUser?.uid;
    if (userId) {
      setDoc(doc(db, 'users', userId), {
        seasonalPoints: newTotal,
        currentSeason: getCurrentSeason().key,
        lastActive: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
  } catch (error) {
    console.warn('[Season] Error adding seasonal points:', error);
  }
};

/**
 * Read the current user's seasonal points.
 */
export const getSeasonalPoints = async () => {
  try {
    await checkSeasonReset();
    const str = await userStorage.getRaw(SEASONAL_POINTS_KEY);
    return str ? parseInt(str, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Given a user document from Firestore, return their seasonal points.
 * If the user's stored season doesn't match the current season, return 0
 * (their points haven't been reset yet because they haven't opened the app).
 */
export const getSeasonalPointsForUser = (userData) => {
  const currentKey = getCurrentSeason().key;
  if (userData?.currentSeason === currentKey) {
    return userData?.seasonalPoints || 0;
  }
  return 0;
};

export default {
  getCurrentSeason,
  getSeasonEndDate,
  getDaysRemaining,
  checkSeasonReset,
  addSeasonalPoints,
  getSeasonalPoints,
  getSeasonalPointsForUser,
};
