import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import userStorage from '../utils/userStorage';
import * as StoreReview from 'expo-store-review';

const FEEDBACK_COLLECTION = 'app_feedback';
const STORAGE_KEY_LAST_PROMPT = 'feedback_last_prompt_date';
const STORAGE_KEY_SUBMITTED = 'feedback_submitted_count';
const COOLDOWN_DAYS = 60;

const RATING_TRIGGER_ACHIEVEMENTS = new Set([
  'app_streak_5',   // 7-day app streak
  'app_streak_15',  // 14-day app streak
  'tasks_5',        // 15 tasks completed
  'workout_3',      // 7 workouts completed
  'points_1k',      // 1,000 points
]);

const feedbackService = {
  async shouldShowPrompt() {
    try {
      const lastPrompt = await userStorage.getRaw(STORAGE_KEY_LAST_PROMPT);
      if (!lastPrompt) return true;
      const daysSince = (Date.now() - parseInt(lastPrompt, 10)) / (1000 * 60 * 60 * 24);
      return daysSince >= COOLDOWN_DAYS;
    } catch {
      return true;
    }
  },

  async markPromptShown() {
    await userStorage.setRaw(STORAGE_KEY_LAST_PROMPT, String(Date.now()));
  },

  shouldTriggerForAchievements(achievementIds) {
    return achievementIds.some(id => RATING_TRIGGER_ACHIEVEMENTS.has(id));
  },

  async requestNativeReview() {
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
        return true;
      }
    } catch (e) {
      console.warn('[Feedback] Native review not available:', e.message);
    }
    return false;
  },

  async submitFeedback({ rating, improvements, comment }) {
    try {
      const user = auth.currentUser;
      const userId = user?.uid || 'anonymous';

      let profileData = {};
      try {
        const stored = await userStorage.getRaw('userProfile');
        const profile = stored ? JSON.parse(stored) : {};
        profileData = {
          displayName: user?.displayName || profile.displayName || profile.name || '',
          username: profile.username || '',
          email: user?.email || '',
          country: profile.country || profile.countryCode || '',
        };
      } catch (_) {}

      await addDoc(collection(db, FEEDBACK_COLLECTION), {
        userId,
        ...profileData,
        rating,
        improvements: improvements || [],
        comment: comment || '',
        createdAt: serverTimestamp(),
        platform: 'ios',
        appVersion: require('../../app.json')?.expo?.version || '',
      });

      const count = parseInt(await userStorage.getRaw(STORAGE_KEY_SUBMITTED) || '0', 10);
      await userStorage.setRaw(STORAGE_KEY_SUBMITTED, String(count + 1));

      if (rating >= 4) {
        await this.requestNativeReview();
      }

      return { success: true };
    } catch (error) {
      console.warn('[Feedback] Submit error:', error.message);
      return { success: false };
    }
  },
};

export default feedbackService;
