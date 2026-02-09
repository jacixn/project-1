import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * All Bible-focused achievement definitions.
 *
 * Each milestone maps a userStats key to a target value.
 * The `type` field must match the key name stored in the
 * `userStats` AsyncStorage object.
 */
const ACHIEVEMENTS = [
  // ── Prayers ──────────────────────────────────────────────
  { id: 'prayers_1',   target: 1,   type: 'prayersCompleted', title: 'First Prayer',       points: 5000,    icon: 'self-improvement', category: 'prayer' },
  { id: 'prayers_3',   target: 3,   type: 'prayersCompleted', title: 'Prayer Beginner',     points: 10000,   icon: 'self-improvement', category: 'prayer' },
  { id: 'prayers_5',   target: 5,   type: 'prayersCompleted', title: 'Faithful Five',       points: 20000,   icon: 'self-improvement', category: 'prayer' },
  { id: 'prayers_10',  target: 10,  type: 'prayersCompleted', title: 'Prayer Warrior',      points: 35000,   icon: 'self-improvement', category: 'prayer' },
  { id: 'prayers_25',  target: 25,  type: 'prayersCompleted', title: 'Devoted Heart',       points: 75000,   icon: 'self-improvement', category: 'prayer' },
  { id: 'prayers_50',  target: 50,  type: 'prayersCompleted', title: 'Prayer Champion',     points: 150000,  icon: 'self-improvement', category: 'prayer' },

  // ── Saved Verses ─────────────────────────────────────────
  { id: 'saved_1',     target: 1,   type: 'savedVerses',      title: 'First Bookmark',      points: 5000,    icon: 'bookmark',          category: 'saved' },
  { id: 'saved_3',     target: 3,   type: 'savedVerses',      title: 'Verse Collector',     points: 8000,    icon: 'bookmark',          category: 'saved' },
  { id: 'saved_5',     target: 5,   type: 'savedVerses',      title: 'Treasure Hunter',     points: 15000,   icon: 'bookmark',          category: 'saved' },
  { id: 'saved_10',    target: 10,  type: 'savedVerses',      title: 'Scripture Keeper',    points: 30000,   icon: 'bookmark',          category: 'saved' },
  { id: 'saved_25',    target: 25,  type: 'savedVerses',      title: 'Verse Vault',         points: 60000,   icon: 'bookmark',          category: 'saved' },
  { id: 'saved_50',    target: 50,  type: 'savedVerses',      title: 'Living Library',      points: 120000,  icon: 'bookmark',          category: 'saved' },

  // ── Shared Verses ────────────────────────────────────────
  { id: 'shared_1',    target: 1,   type: 'versesShared',     title: 'First Share',         points: 5000,    icon: 'share',             category: 'shared' },
  { id: 'shared_3',    target: 3,   type: 'versesShared',     title: 'Spreading the Word',  points: 10000,   icon: 'share',             category: 'shared' },
  { id: 'shared_5',    target: 5,   type: 'versesShared',     title: 'Gospel Messenger',    points: 20000,   icon: 'share',             category: 'shared' },
  { id: 'shared_10',   target: 10,  type: 'versesShared',     title: 'Light of the World',  points: 40000,   icon: 'share',             category: 'shared' },
  { id: 'shared_25',   target: 25,  type: 'versesShared',     title: 'Word Ambassador',     points: 100000,  icon: 'share',             category: 'shared' },

  // ── Audio Playback ───────────────────────────────────────
  { id: 'audio_1',     target: 1,   type: 'audiosPlayed',     title: 'First Listen',        points: 5000,    icon: 'headphones',        category: 'audio' },
  { id: 'audio_3',     target: 3,   type: 'audiosPlayed',     title: 'Tuned In',            points: 10000,   icon: 'headphones',        category: 'audio' },
  { id: 'audio_5',     target: 5,   type: 'audiosPlayed',     title: 'Audio Explorer',      points: 20000,   icon: 'headphones',        category: 'audio' },
  { id: 'audio_10',    target: 10,  type: 'audiosPlayed',     title: 'Faithful Listener',   points: 35000,   icon: 'headphones',        category: 'audio' },
  { id: 'audio_25',    target: 25,  type: 'audiosPlayed',     title: 'Word on Repeat',      points: 100000,  icon: 'headphones',        category: 'audio' },

  // ── Bible Characters ─────────────────────────────────────
  { id: 'chars_1',     target: 1,   type: 'charactersRead',   title: 'First Character',     points: 5000,    icon: 'person',            category: 'characters' },
  { id: 'chars_3',     target: 3,   type: 'charactersRead',   title: 'Character Curious',   points: 12000,   icon: 'person',            category: 'characters' },
  { id: 'chars_5',     target: 5,   type: 'charactersRead',   title: 'History Buff',        points: 25000,   icon: 'person',            category: 'characters' },
  { id: 'chars_10',    target: 10,  type: 'charactersRead',   title: 'Bible Scholar',       points: 50000,   icon: 'person',            category: 'characters' },
  { id: 'chars_20',    target: 20,  type: 'charactersRead',   title: 'Character Master',    points: 120000,  icon: 'person',            category: 'characters' },

  // ── Bible Timeline ───────────────────────────────────────
  { id: 'timeline_1',  target: 1,   type: 'timelineErasViewed', title: 'Time Traveller',    points: 5000,    icon: 'timeline',          category: 'timeline' },
  { id: 'timeline_3',  target: 3,   type: 'timelineErasViewed', title: 'Era Explorer',      points: 12000,   icon: 'timeline',          category: 'timeline' },
  { id: 'timeline_5',  target: 5,   type: 'timelineErasViewed', title: 'History Seeker',    points: 25000,   icon: 'timeline',          category: 'timeline' },
  { id: 'timeline_8',  target: 8,   type: 'timelineErasViewed', title: 'Timeline Master',   points: 60000,   icon: 'timeline',          category: 'timeline' },

  // ── Verses Read ──────────────────────────────────────────
  { id: 'read_1',      target: 1,   type: 'versesRead',       title: 'First Verse',         points: 5000,    icon: 'menu-book',         category: 'reading' },
  { id: 'read_10',     target: 10,  type: 'versesRead',       title: 'Page Turner',         points: 10000,   icon: 'menu-book',         category: 'reading' },
  { id: 'read_25',     target: 25,  type: 'versesRead',       title: 'Daily Reader',        points: 20000,   icon: 'menu-book',         category: 'reading' },
  { id: 'read_50',     target: 50,  type: 'versesRead',       title: 'Scripture Seeker',    points: 40000,   icon: 'menu-book',         category: 'reading' },
  { id: 'read_100',    target: 100, type: 'versesRead',       title: 'Bible Student',       points: 75000,   icon: 'menu-book',         category: 'reading' },
  { id: 'read_250',    target: 250, type: 'versesRead',       title: 'Word Warrior',        points: 150000,  icon: 'menu-book',         category: 'reading' },

  // ── Bible Maps ───────────────────────────────────────────
  { id: 'maps_1',      target: 1,   type: 'mapsVisited',      title: 'First Footstep',      points: 5000,    icon: 'map',               category: 'maps' },
  { id: 'maps_3',      target: 3,   type: 'mapsVisited',      title: 'Pilgrim',             points: 10000,   icon: 'map',               category: 'maps' },
  { id: 'maps_5',      target: 5,   type: 'mapsVisited',      title: 'Holy Land Explorer',  points: 20000,   icon: 'map',               category: 'maps' },
  { id: 'maps_10',     target: 10,  type: 'mapsVisited',      title: 'Map Master',          points: 50000,   icon: 'map',               category: 'maps' },

  // ── Tasks (All) ─────────────────────────────────────────
  { id: 'tasks_1',     target: 1,   type: 'completedTasks',   title: 'Getting Started',     points: 5000,    icon: 'check-circle',      category: 'tasks' },
  { id: 'tasks_5',     target: 5,   type: 'completedTasks',   title: 'On a Roll',           points: 15000,   icon: 'check-circle',      category: 'tasks' },
  { id: 'tasks_10',    target: 10,  type: 'completedTasks',   title: 'Task Machine',        points: 30000,   icon: 'check-circle',      category: 'tasks' },
  { id: 'tasks_25',    target: 25,  type: 'completedTasks',   title: 'Productivity Pro',    points: 60000,   icon: 'check-circle',      category: 'tasks' },
  { id: 'tasks_50',    target: 50,  type: 'completedTasks',   title: 'Unstoppable',         points: 100000,  icon: 'check-circle',      category: 'tasks' },
  { id: 'tasks_100',   target: 100, type: 'completedTasks',   title: 'Century Club',        points: 150000,  icon: 'check-circle',      category: 'tasks' },

  // ── Low Tier Tasks ──────────────────────────────────────
  { id: 'low_1',       target: 1,   type: 'lowTierCompleted',  title: 'Quick Win',           points: 3000,    icon: 'flash-on',          category: 'tasks_low' },
  { id: 'low_5',       target: 5,   type: 'lowTierCompleted',  title: 'Easy Does It',        points: 10000,   icon: 'flash-on',          category: 'tasks_low' },
  { id: 'low_10',      target: 10,  type: 'lowTierCompleted',  title: 'Low-Key Legend',      points: 25000,   icon: 'flash-on',          category: 'tasks_low' },
  { id: 'low_25',      target: 25,  type: 'lowTierCompleted',  title: 'Small Steps Giant Leaps', points: 50000, icon: 'flash-on',       category: 'tasks_low' },

  // ── Mid Tier Tasks ──────────────────────────────────────
  { id: 'mid_1',       target: 1,   type: 'midTierCompleted',  title: 'Stepping Up',         points: 5000,    icon: 'trending-up',       category: 'tasks_mid' },
  { id: 'mid_5',       target: 5,   type: 'midTierCompleted',  title: 'Balanced Grinder',    points: 15000,   icon: 'trending-up',       category: 'tasks_mid' },
  { id: 'mid_10',      target: 10,  type: 'midTierCompleted',  title: 'Mid-Range Master',    points: 35000,   icon: 'trending-up',       category: 'tasks_mid' },
  { id: 'mid_25',      target: 25,  type: 'midTierCompleted',  title: 'Consistency King',    points: 75000,   icon: 'trending-up',       category: 'tasks_mid' },

  // ── High Tier Tasks ─────────────────────────────────────
  { id: 'high_1',      target: 1,   type: 'highTierCompleted', title: 'Heavy Hitter',        points: 8000,    icon: 'whatshot',           category: 'tasks_high' },
  { id: 'high_5',      target: 5,   type: 'highTierCompleted', title: 'Built Different',     points: 25000,   icon: 'whatshot',           category: 'tasks_high' },
  { id: 'high_10',     target: 10,  type: 'highTierCompleted', title: 'Boss Mode',           points: 50000,   icon: 'whatshot',           category: 'tasks_high' },
  { id: 'high_25',     target: 25,  type: 'highTierCompleted', title: 'Elite Achiever',      points: 120000,  icon: 'whatshot',           category: 'tasks_high' },

  // ── App Streak (consecutive daily opens) ────────────────
  { id: 'app_streak_1',  target: 1,  type: 'appStreak', title: 'Day One',             points: 5000,    icon: 'local-fire-department', category: 'streak' },
  { id: 'app_streak_5',  target: 5,  type: 'appStreak', title: 'Five Day Flow',       points: 15000,   icon: 'local-fire-department', category: 'streak' },
  { id: 'app_streak_15', target: 15, type: 'appStreak', title: 'Fifteen Day Fire',    points: 40000,   icon: 'local-fire-department', category: 'streak' },
  { id: 'app_streak_30', target: 30, type: 'appStreak', title: 'Monthly Devotion',    points: 100000,  icon: 'local-fire-department', category: 'streak' },

  // ── Points Goals ──────────────────────────────────────
  { id: 'points_10k',  target: 10000,  type: 'totalPoints',   title: 'First 10K',           points: 5000,    icon: 'star',              category: 'goals' },
  { id: 'points_50k',  target: 50000,  type: 'totalPoints',   title: '50K Club',            points: 10000,   icon: 'star',              category: 'goals' },
  { id: 'points_100k', target: 100000, type: 'totalPoints',   title: 'Six Figures',         points: 20000,   icon: 'star',              category: 'goals' },
  { id: 'points_500k', target: 500000, type: 'totalPoints',   title: 'Half a Million',      points: 50000,   icon: 'star',              category: 'goals' },
  { id: 'points_1m',   target: 1000000, type: 'totalPoints',  title: 'Millionaire',         points: 100000,  icon: 'star',              category: 'goals' },

  // ── Workouts ────────────────────────────────────────────
  { id: 'workout_1',   target: 1,   type: 'workoutsCompleted', title: 'First Sweat',         points: 5000,    icon: 'fitness-center',    category: 'workouts' },
  { id: 'workout_3',   target: 3,   type: 'workoutsCompleted', title: 'Getting Consistent',  points: 10000,   icon: 'fitness-center',    category: 'workouts' },
  { id: 'workout_5',   target: 5,   type: 'workoutsCompleted', title: 'Gym Regular',         points: 20000,   icon: 'fitness-center',    category: 'workouts' },
  { id: 'workout_10',  target: 10,  type: 'workoutsCompleted', title: 'Iron Addict',         points: 40000,   icon: 'fitness-center',    category: 'workouts' },
  { id: 'workout_25',  target: 25,  type: 'workoutsCompleted', title: 'Beast Mode',          points: 75000,   icon: 'fitness-center',    category: 'workouts' },
  { id: 'workout_50',  target: 50,  type: 'workoutsCompleted', title: 'Gym Rat',             points: 120000,  icon: 'fitness-center',    category: 'workouts' },

  // ── Workout Streak (weeks) ──────────────────────────────
  { id: 'gym_streak_2',  target: 2,  type: 'gymWeekStreak',   title: 'Two-Week Grind',       points: 10000,   icon: 'local-fire-department', category: 'gym_streak' },
  { id: 'gym_streak_4',  target: 4,  type: 'gymWeekStreak',   title: 'Monthly Muscle',       points: 25000,   icon: 'local-fire-department', category: 'gym_streak' },
  { id: 'gym_streak_8',  target: 8,  type: 'gymWeekStreak',   title: 'Two-Month Terror',     points: 60000,   icon: 'local-fire-department', category: 'gym_streak' },

  // ── Exercises ───────────────────────────────────────────
  { id: 'exercises_5',   target: 5,   type: 'exercisesLogged', title: 'Warming Up',          points: 5000,    icon: 'sports-gymnastics',  category: 'exercises' },
  { id: 'exercises_25',  target: 25,  type: 'exercisesLogged', title: 'All-Rounder',         points: 15000,   icon: 'sports-gymnastics',  category: 'exercises' },
  { id: 'exercises_50',  target: 50,  type: 'exercisesLogged', title: 'Exercise Collector',  points: 30000,   icon: 'sports-gymnastics',  category: 'exercises' },
  { id: 'exercises_100', target: 100, type: 'exercisesLogged', title: 'Movement Master',     points: 60000,   icon: 'sports-gymnastics',  category: 'exercises' },
  { id: 'exercises_200', target: 200, type: 'exercisesLogged', title: 'Gym Encyclopedia',    points: 100000,  icon: 'sports-gymnastics',  category: 'exercises' },

  // ── Sets Completed ──────────────────────────────────────
  { id: 'sets_10',    target: 10,   type: 'setsCompleted',    title: 'First Reps',           points: 5000,    icon: 'replay',            category: 'sets' },
  { id: 'sets_50',    target: 50,   type: 'setsCompleted',    title: 'Set Stacker',          points: 15000,   icon: 'replay',            category: 'sets' },
  { id: 'sets_100',   target: 100,  type: 'setsCompleted',    title: 'Volume Dealer',        points: 30000,   icon: 'replay',            category: 'sets' },
  { id: 'sets_250',   target: 250,  type: 'setsCompleted',    title: 'Rep Machine',          points: 60000,   icon: 'replay',            category: 'sets' },
  { id: 'sets_500',   target: 500,  type: 'setsCompleted',    title: 'Thousand Club',        points: 100000,  icon: 'replay',            category: 'sets' },

  // ── Workout Minutes ─────────────────────────────────────
  { id: 'minutes_30',   target: 30,   type: 'workoutMinutes',  title: 'Half-Hour Hero',      points: 5000,    icon: 'timer',             category: 'gym_time' },
  { id: 'minutes_60',   target: 60,   type: 'workoutMinutes',  title: 'One-Hour Warrior',    points: 12000,   icon: 'timer',             category: 'gym_time' },
  { id: 'minutes_150',  target: 150,  type: 'workoutMinutes',  title: 'Grind Time',          points: 25000,   icon: 'timer',             category: 'gym_time' },
  { id: 'minutes_300',  target: 300,  type: 'workoutMinutes',  title: 'Five-Hour Titan',     points: 50000,   icon: 'timer',             category: 'gym_time' },
  { id: 'minutes_600',  target: 600,  type: 'workoutMinutes',  title: 'Ten-Hour Legend',     points: 100000,  icon: 'timer',             category: 'gym_time' },
];

// ─── Storage key constants ──────────────────────────────────
// The app uses TWO copies of userStats due to legacy code:
//   'userStats'          — raw key (used by BibleReader, ProfileTab counts, etc.)
//   'fivefold_userStats' — prefixed key (used by TodosTab, SimplePrayerCard, etc.)
// We MUST keep both in sync to avoid lost data.
const RAW_KEY = 'userStats';
const PREFIXED_KEY = 'fivefold_userStats';
const TOTAL_POINTS_KEY = 'total_points';

class AchievementService {
  static ACHIEVEMENTS_KEY = 'fivefold_achievements_unlocked';
  static PRESTIGE_KEY = 'fivefold_achievements_prestige';

  /**
   * Convert total points to level.
   *
   * Scale: 10,000 points per level, minimum level 1.
   */
  static getLevelFromPoints(points) {
    if (!points || points <= 0) return 1;
    return Math.floor(points / 10000) + 1;
  }

  /**
   * Get the total points required to reach a given level.
   */
  static getPointsForLevel(level) {
    if (level <= 1) return 0;
    return (level - 1) * 10000;
  }

  /** Return the full list so the modal can render them. */
  static getAchievementDefinitions() {
    return ACHIEVEMENTS;
  }

  // ─── Internal: merged stats read ─────────────────────────

  /**
   * Read from BOTH userStats keys and merge them.
   * This ensures we see every stat regardless of which key wrote it.
   * For numeric values the higher value wins (prevents data loss).
   */
  static async _getMergedStats() {
    try {
      const [rawStr, prefixedStr] = await Promise.all([
        AsyncStorage.getItem(RAW_KEY),
        AsyncStorage.getItem(PREFIXED_KEY),
      ]);
      const raw = rawStr ? JSON.parse(rawStr) : {};
      const prefixed = prefixedStr ? JSON.parse(prefixedStr) : {};

      // Merge: prefixed first, then raw on top, but for numeric fields take the max
      const merged = { ...prefixed, ...raw };

      // For known numeric fields, take the max of both copies
      const numericKeys = [
        'points', 'totalPoints', 'level', 'completedTasks', 'totalTasks',
        'prayersCompleted', 'savedVerses', 'versesRead', 'versesShared',
        'audiosPlayed', 'charactersRead', 'timelineErasViewed', 'mapsVisited',
        'currentStreak', 'streak', 'appStreak', 'workoutsCompleted',
        'lowTierCompleted', 'midTierCompleted', 'highTierCompleted',
        'gymWeekStreak', 'exercisesLogged', 'setsCompleted', 'workoutMinutes',
      ];
      for (const k of numericKeys) {
        const a = raw[k] || 0;
        const b = prefixed[k] || 0;
        if (a || b) {
          merged[k] = Math.max(a, b);
        }
      }

      return merged;
    } catch (err) {
      console.error('[AchievementService] _getMergedStats error:', err);
      return {};
    }
  }

  /**
   * Write the given stats object to BOTH storage keys so every
   * consumer in the app sees consistent data.
   */
  static async _writeBothKeys(stats) {
    const json = JSON.stringify(stats);
    await Promise.all([
      AsyncStorage.setItem(RAW_KEY, json),
      AsyncStorage.setItem(PREFIXED_KEY, json),
    ]);
  }

  // ─── Stat helpers ────────────────────────────────────────

  /**
   * Increment a stat key by `amount`, then check achievements.
   *
   * Usage:
   *   AchievementService.incrementStat('versesShared');
   *   AchievementService.incrementStat('audiosPlayed', 1);
   */
  static async incrementStat(key, amount = 1) {
    try {
      const stats = await this._getMergedStats();
      stats[key] = (stats[key] || 0) + amount;
      await this._writeBothKeys(stats);

      // Check achievements with the fresh stats
      await this.checkAchievements(stats);
      return stats;
    } catch (err) {
      console.error('[AchievementService] incrementStat error:', err);
      return null;
    }
  }

  /**
   * Set a stat to an absolute value (e.g. savedBibleVerses array length).
   */
  static async setStat(key, value) {
    try {
      const stats = await this._getMergedStats();
      stats[key] = value;
      await this._writeBothKeys(stats);
      await this.checkAchievements(stats);
      return stats;
    } catch (err) {
      console.error('[AchievementService] setStat error:', err);
      return null;
    }
  }

  // ─── Core achievement logic ──────────────────────────────

  static async checkAchievements(newStats) {
    try {
      const unlocked = await this.getUnlockedAchievements();
      const newlyUnlocked = [];

      for (const m of ACHIEVEMENTS) {
        if (!unlocked.includes(m.id) && (newStats[m.type] || 0) >= m.target) {
          newlyUnlocked.push(m);
          unlocked.push(m.id);
        }
      }

      // ── Always sync total_points from userStats (single source of truth) ──
      const currentStatsPoints = Math.max(newStats.points || 0, newStats.totalPoints || 0);

      if (newlyUnlocked.length === 0) {
        // No new achievements — just keep total_points in sync with userStats
        await AsyncStorage.setItem(TOTAL_POINTS_KEY, currentStatsPoints.toString());
        return null;
      }

      // Persist unlocked list
      await AsyncStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(unlocked));

      // ── Award achievement bonus points ──────────────────────
      const totalPointsToAward = newlyUnlocked.reduce((sum, m) => sum + m.points, 0);
      const newPoints = currentStatsPoints + totalPointsToAward;
      const newLevel = this.getLevelFromPoints(newPoints);

      // Build the updated stats object
      const currentStats = await this._getMergedStats();
      const updatedStats = {
        ...currentStats,
        ...newStats,
        points: newPoints,
        totalPoints: newPoints,
        level: newLevel,
      };

      // Write to BOTH storage keys
      await this._writeBothKeys(updatedStats);

      // ── Update central total_points key (single source of truth) ──
      await AsyncStorage.setItem(TOTAL_POINTS_KEY, newPoints.toString());

      // ── Sync to Firebase ──
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          setDoc(doc(db, 'users', currentUser.uid), {
            totalPoints: newPoints,
            level: newLevel,
            lastActive: serverTimestamp(),
          }, { merge: true }).catch(err => {
            console.warn('Firebase achievement points sync failed:', err.message);
          });
        }
      } catch (firebaseErr) {
        // Don't let Firebase errors prevent local points from saving
        console.warn('[AchievementService] Firebase sync error (non-fatal):', firebaseErr.message);
      }

      // ── Trigger toast notifications ──
      newlyUnlocked.forEach(achievement => {
        DeviceEventEmitter.emit('achievementUnlocked', {
          id: achievement.id,
          title: achievement.title,
          points: achievement.points,
          icon: achievement.icon,
        });
      });

      console.log(
        `[Achievement] Unlocked ${newlyUnlocked.length}: ${newlyUnlocked.map(a => a.title).join(', ')} | +${totalPointsToAward.toLocaleString()} pts | Total: ${newPoints.toLocaleString()}`
      );

      // ── Check if ALL achievements are now completed → prestige reset ──
      if (unlocked.length >= ACHIEVEMENTS.length) {
        const prestige = await this.getPrestigeCount();
        const newPrestige = prestige + 1;
        await AsyncStorage.setItem(this.PRESTIGE_KEY, newPrestige.toString());

        // Reset the unlocked list so they can be earned again
        await AsyncStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify([]));

        console.log(`[Achievement] ALL COMPLETE! Prestige round ${newPrestige} — achievements reset.`);

        // Emit a special event so the UI can show a celebration
        DeviceEventEmitter.emit('allAchievementsCompleted', {
          prestigeRound: newPrestige,
          totalPoints: newPoints,
        });
      }

      return updatedStats;
    } catch (error) {
      console.error('[AchievementService] checkAchievements error:', error);
      return null;
    }
  }

  static async getUnlockedAchievements() {
    try {
      const data = await AsyncStorage.getItem(this.ACHIEVEMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get how many times the user has completed all achievements.
   */
  static async getPrestigeCount() {
    try {
      const val = await AsyncStorage.getItem(this.PRESTIGE_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  // ─── Profile Badges ──────────────────────────────────────
  // Badges are special rewards shown next to the user's name.
  // Each badge has a condition based on userStats.

  static PROFILE_BADGES = [
    {
      id: 'verified',
      name: 'Verified',
      icon: 'verified',          // MaterialIcons 'verified' = blue tick
      color: '#1DA1F2',          // Twitter-blue
      condition: (stats) => (stats.savedVerses || 0) >= 5,
      description: 'Save 5 verses to your collection',
    },
    {
      id: 'biblely',
      name: 'Biblely',
      icon: null,                // Uses logo image instead
      image: require('../../assets/logo.png'),
      color: '#F59E0B',          // Gold/amber
      condition: (stats) => (stats.appStreak || 0) >= 30,
      description: 'Maintain a 30-day app streak',
    },
  ];

  /**
   * Return the list of badges the user has earned based on their stats.
   */
  static async getEarnedBadges() {
    const stats = await this._getMergedStats();
    return this.PROFILE_BADGES.filter(b => b.condition(stats));
  }

  /**
   * Synchronous version — pass stats you already have.
   */
  static getEarnedBadgesFromStats(stats) {
    return this.PROFILE_BADGES.filter(b => b.condition(stats || {}));
  }

  /**
   * Public helper: get merged stats from both keys.
   * Use this anywhere you need to display user stats.
   */
  static async getStats() {
    return this._getMergedStats();
  }

  /**
   * Recalculate the user's score from userStats.totalPoints and sync everywhere.
   * Use this to fix inflated scores — it reads from userStats (the actual earned total),
   * writes to total_points (single source of truth), both userStats keys, and Firebase.
   * Returns the corrected total points value.
   */
  static async recalculateScore() {
    try {
      const stats = await this._getMergedStats();
      const correctTotal = Math.max(stats.totalPoints || 0, stats.points || 0);
      const correctLevel = this.getLevelFromPoints(correctTotal);

      // Update both userStats keys with the correct value
      const updatedStats = {
        ...stats,
        points: correctTotal,
        totalPoints: correctTotal,
        level: correctLevel,
      };
      await this._writeBothKeys(updatedStats);

      // Update the single source of truth
      await AsyncStorage.setItem(TOTAL_POINTS_KEY, correctTotal.toString());

      // Sync corrected value to Firebase
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await setDoc(doc(db, 'users', currentUser.uid), {
            totalPoints: correctTotal,
            level: correctLevel,
            lastActive: serverTimestamp(),
          }, { merge: true });
          console.log(`[AchievementService] Score recalculated and synced to Firebase: ${correctTotal}`);
        }
      } catch (firebaseErr) {
        console.warn('[AchievementService] Firebase sync during recalculate failed:', firebaseErr.message);
      }

      console.log(`[AchievementService] Score recalculated: ${correctTotal} (level ${correctLevel})`);
      return correctTotal;
    } catch (error) {
      console.error('[AchievementService] recalculateScore error:', error);
      return 0;
    }
  }
}

export default AchievementService;
