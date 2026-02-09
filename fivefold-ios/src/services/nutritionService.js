/**
 * nutritionService.js
 *
 * Core service for nutrition tracking:
 * - Body profile storage (age, height, weight, goal, etc.)
 * - TDEE calculation via Mifflin-St Jeor
 * - Daily food log with calories and macros
 * - Food favorites with usage tracking
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@nutrition_profile';
const FOOD_LOG_KEY = '@food_log';
const FAVORITES_KEY = '@food_favorites';

// ─── Activity multipliers (Harris-Benedict / Mifflin-St Jeor) ───
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,       // Little or no exercise
  light: 1.375,         // Light exercise 1-3 days/week
  moderate: 1.55,       // Moderate exercise 3-5 days/week
  active: 1.725,        // Hard exercise 6-7 days/week
  veryActive: 1.9,      // Very hard exercise, physical job
};

const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  veryActive: 'Extra Active',
};

// ─── Macro splits (percentage of total calories) ───
const MACRO_SPLITS = {
  lose: { protein: 0.40, carbs: 0.30, fat: 0.30 },
  gain: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
};

class NutritionService {
  // ════════════════════════════════════════════════════
  //  BODY PROFILE
  // ════════════════════════════════════════════════════

  /**
   * Save the user's body profile.
   * Supports optional AI-generated overrides for calories/macros.
   */
  async saveProfile(profile) {
    try {
      const data = {
        ...profile,
        setupDate: profile.setupDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
      console.log('[Nutrition] Profile saved');
      return data;
    } catch (e) {
      console.warn('[Nutrition] Failed to save profile:', e.message);
      return null;
    }
  }

  /**
   * Get the user's body profile, or null if not set up.
   */
  async getProfile() {
    try {
      const json = await AsyncStorage.getItem(PROFILE_KEY);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      console.warn('[Nutrition] Failed to load profile:', e.message);
      return null;
    }
  }

  /**
   * Delete the profile (for reset).
   */
  async deleteProfile() {
    try {
      await AsyncStorage.removeItem(PROFILE_KEY);
    } catch (e) {
      console.warn('[Nutrition] Failed to delete profile:', e.message);
    }
  }

  // ════════════════════════════════════════════════════
  //  TDEE & MACROS
  // ════════════════════════════════════════════════════

  /**
   * Calculate BMR using Mifflin-St Jeor.
   */
  calculateBMR(profile) {
    const { gender, weightKg, heightCm, age } = profile;
    if (gender === 'female') {
      return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  /**
   * Calculate TDEE (Total Daily Energy Expenditure).
   * Returns { bmr, tdee, dailyCalories, goal }
   */
  calculateTDEE(profile) {
    const bmr = this.calculateBMR(profile);
    const multiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel] || 1.55;
    const tdee = Math.round(bmr * multiplier);

    let dailyCalories = tdee;
    if (profile.goal === 'lose') dailyCalories = tdee - 500;
    if (profile.goal === 'gain') dailyCalories = tdee + 400;

    // Safety floor
    if (dailyCalories < 1200) dailyCalories = 1200;

    return { bmr: Math.round(bmr), tdee, dailyCalories, goal: profile.goal };
  }

  /**
   * Get macro targets in grams.
   * If AI overrides exist on the profile, use those. Otherwise fall back to formula.
   * Returns { protein, carbs, fat, dailyCalories }.
   */
  getMacroTargets(profile) {
    // If AI-generated targets are stored, use them
    if (profile.aiTargets && profile.aiTargets.dailyCalories) {
      return {
        protein: profile.aiTargets.protein,
        carbs: profile.aiTargets.carbs,
        fat: profile.aiTargets.fat,
        dailyCalories: profile.aiTargets.dailyCalories,
      };
    }

    // Fallback: formula-based
    const { dailyCalories } = this.calculateTDEE(profile);
    const split = MACRO_SPLITS[profile.goal] || MACRO_SPLITS.maintain;

    return {
      protein: Math.round((dailyCalories * split.protein) / 4),  // 4 cal/g
      carbs: Math.round((dailyCalories * split.carbs) / 4),      // 4 cal/g
      fat: Math.round((dailyCalories * split.fat) / 9),           // 9 cal/g
      dailyCalories,
    };
  }

  // ════════════════════════════════════════════════════
  //  FOOD LOG
  // ════════════════════════════════════════════════════

  /**
   * Get the full food log object from storage.
   */
  async _getFullLog() {
    try {
      const json = await AsyncStorage.getItem(FOOD_LOG_KEY);
      return json ? JSON.parse(json) : {};
    } catch (e) {
      console.warn('[Nutrition] Failed to load food log:', e.message);
      return {};
    }
  }

  async _saveFullLog(log) {
    try {
      await AsyncStorage.setItem(FOOD_LOG_KEY, JSON.stringify(log));
    } catch (e) {
      console.warn('[Nutrition] Failed to save food log:', e.message);
    }
  }

  /**
   * Get today's date key in YYYY-MM-DD format.
   */
  getDateKey(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Add a food entry for a given date.
   * @param {string} dateKey – YYYY-MM-DD
   * @param {Object} food – { name, calories, protein, carbs, fat, photoUri? }
   */
  async addFoodEntry(dateKey, food) {
    const log = await this._getFullLog();
    if (!log[dateKey]) {
      log[dateKey] = { foods: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    }

    const entry = {
      id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: food.name || 'Unknown Food',
      calories: Math.round(food.calories || 0),
      protein: Math.round(food.protein || 0),
      carbs: Math.round(food.carbs || 0),
      fat: Math.round(food.fat || 0),
      portionSize: food.portionSize || '',
      photoUri: food.photoUri || null,
      timestamp: new Date().toISOString(),
    };

    log[dateKey].foods.push(entry);
    this._recalcTotals(log[dateKey]);
    await this._saveFullLog(log);
    console.log('[Nutrition] Added food:', entry.name, entry.calories, 'cal');
    return entry;
  }

  /**
   * Remove a food entry.
   */
  async removeFoodEntry(dateKey, foodId) {
    const log = await this._getFullLog();
    if (!log[dateKey]) return;

    log[dateKey].foods = log[dateKey].foods.filter(f => f.id !== foodId);
    this._recalcTotals(log[dateKey]);
    await this._saveFullLog(log);
    console.log('[Nutrition] Removed food entry:', foodId);
  }

  /**
   * Get daily log for a given date.
   */
  async getDailyLog(dateKey) {
    const log = await this._getFullLog();
    return log[dateKey] || { foods: [], totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
  }

  /**
   * Get daily progress: consumed vs targets.
   */
  async getDailyProgress(dateKey) {
    const profile = await this.getProfile();
    const dailyLog = await this.getDailyLog(dateKey);

    if (!profile) {
      return {
        hasProfile: false,
        consumed: dailyLog,
        targets: null,
        remaining: null,
      };
    }

    const targets = this.getMacroTargets(profile);
    return {
      hasProfile: true,
      consumed: {
        calories: dailyLog.totalCalories,
        protein: dailyLog.totalProtein,
        carbs: dailyLog.totalCarbs,
        fat: dailyLog.totalFat,
        foodCount: dailyLog.foods.length,
      },
      targets: {
        calories: targets.dailyCalories,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat,
      },
      remaining: {
        calories: targets.dailyCalories - dailyLog.totalCalories,
        protein: targets.protein - dailyLog.totalProtein,
        carbs: targets.carbs - dailyLog.totalCarbs,
        fat: targets.fat - dailyLog.totalFat,
      },
    };
  }

  _recalcTotals(dayData) {
    dayData.totalCalories = dayData.foods.reduce((s, f) => s + (f.calories || 0), 0);
    dayData.totalProtein = dayData.foods.reduce((s, f) => s + (f.protein || 0), 0);
    dayData.totalCarbs = dayData.foods.reduce((s, f) => s + (f.carbs || 0), 0);
    dayData.totalFat = dayData.foods.reduce((s, f) => s + (f.fat || 0), 0);
  }

  // ════════════════════════════════════════════════════
  //  FAVORITES
  // ════════════════════════════════════════════════════

  async getFavorites() {
    try {
      const json = await AsyncStorage.getItem(FAVORITES_KEY);
      const favorites = json ? JSON.parse(json) : [];
      // Sort by usage count
      return favorites.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
    } catch (e) {
      console.warn('[Nutrition] Failed to load favorites:', e.message);
      return [];
    }
  }

  async addFavorite(food) {
    try {
      const favorites = await this.getFavorites();
      // Check for duplicate by name
      const existing = favorites.find(f => f.name.toLowerCase() === food.name.toLowerCase());
      if (existing) {
        existing.useCount = (existing.useCount || 0) + 1;
        existing.calories = food.calories;
        existing.protein = food.protein;
        existing.carbs = food.carbs;
        existing.fat = food.fat;
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        return existing;
      }

      const entry = {
        id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: food.name,
        calories: Math.round(food.calories || 0),
        protein: Math.round(food.protein || 0),
        carbs: Math.round(food.carbs || 0),
        fat: Math.round(food.fat || 0),
        portionSize: food.portionSize || '',
        addedAt: new Date().toISOString(),
        useCount: 1,
      };

      favorites.push(entry);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      console.log('[Nutrition] Added favorite:', entry.name);
      return entry;
    } catch (e) {
      console.warn('[Nutrition] Failed to add favorite:', e.message);
      return null;
    }
  }

  async removeFavorite(id) {
    try {
      let favorites = await this.getFavorites();
      favorites = favorites.filter(f => f.id !== id);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('[Nutrition] Failed to remove favorite:', e.message);
    }
  }

  async incrementFavoriteUse(name) {
    try {
      const favorites = await this.getFavorites();
      const fav = favorites.find(f => f.name.toLowerCase() === name.toLowerCase());
      if (fav) {
        fav.useCount = (fav.useCount || 0) + 1;
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      }
    } catch (e) {
      // silent
    }
  }

  // ════════════════════════════════════════════════════
  //  WEEKLY STATS
  // ════════════════════════════════════════════════════

  async getWeeklyAverage() {
    const log = await this._getFullLog();
    const today = new Date();
    let total = 0;
    let days = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      if (log[key] && log[key].totalCalories > 0) {
        total += log[key].totalCalories;
        days++;
      }
    }

    return days > 0 ? Math.round(total / days) : 0;
  }

  async getLoggingStreak() {
    const log = await this._getFullLog();
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = this.getDateKey(d);
      if (log[key] && log[key].foods.length > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  // ════════════════════════════════════════════════════
  //  CLEANUP (remove logs older than 90 days)
  // ════════════════════════════════════════════════════

  async cleanOldLogs() {
    try {
      const log = await this._getFullLog();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffKey = this.getDateKey(cutoff);

      let removed = 0;
      for (const key of Object.keys(log)) {
        if (key < cutoffKey) {
          delete log[key];
          removed++;
        }
      }

      if (removed > 0) {
        await this._saveFullLog(log);
        console.log(`[Nutrition] Cleaned ${removed} old daily logs`);
      }
    } catch (e) {
      console.warn('[Nutrition] Failed to clean old logs:', e.message);
    }
  }
}

// Export constants for UI
export { ACTIVITY_MULTIPLIERS, ACTIVITY_LABELS, MACRO_SPLITS };

export default new NutritionService();
