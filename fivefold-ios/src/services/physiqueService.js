/**
 * Physique Scoring Service
 * 
 * Calculates per-muscle-group freshness scores based on workout history.
 * Scores decay over time when a muscle is not trained.
 * 
 * Score range: 0-100
 *   0-9:   Purple (untrained)
 *   10-34: Red (low)
 *   35-69: Amber (moderate)
 *   70-100: Green (consistent)
 */

import userStorage from '../utils/userStorage';
import { MUSCLE_GROUP_IDS, getMusclesForExercise, getScoreColor, getScoreLabel } from '../data/exerciseMuscleMap';

const STORAGE_KEY = '@physique_scores';
const DECAY_RATE = 0.985; // ~1.5% decay per day
const MAX_SCORE = 100;
const PRIMARY_WEIGHT = 0.7;   // Primary muscles get 70% of points
const SECONDARY_WEIGHT = 0.3; // Secondary muscles split 30%
const POINTS_PER_SET = 8;     // Base points per completed set

class PhysiqueService {
  constructor() {
    this._scores = null;
    this._lastCalculated = null;
  }

  /**
   * Initialize scores — creates empty scores if none exist
   */
  async initialize() {
    try {
      const stored = await userStorage.getRaw(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this._scores = data.muscles || {};
        this._lastCalculated = data.lastCalculated || null;
      } else {
        this._scores = {};
        this._lastCalculated = null;
      }
      
      // Ensure all muscle groups exist
      for (const id of MUSCLE_GROUP_IDS) {
        if (!this._scores[id]) {
          this._scores[id] = { score: 0, lastTrained: null, weeklyVolume: 0 };
        }
      }
      
      return this._scores;
    } catch (error) {
      console.warn('[Physique] Failed to load scores:', error.message);
      this._scores = {};
      for (const id of MUSCLE_GROUP_IDS) {
        this._scores[id] = { score: 0, lastTrained: null, weeklyVolume: 0 };
      }
      return this._scores;
    }
  }

  /**
   * Save current scores to storage
   */
  async _save() {
    try {
      await userStorage.setRaw(STORAGE_KEY, JSON.stringify({
        muscles: this._scores,
        lastCalculated: new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('[Physique] Failed to save scores:', error.message);
    }
  }

  /**
   * Recalculate all scores from workout history.
   * This is the main function — call it when opening the Physique screen.
   * 
   * @param {Array} workoutHistory - Array of workout objects from WorkoutService
   * @returns {Object} Updated muscle scores
   */
  async recalculate(workoutHistory) {
    if (!this._scores) {
      await this.initialize();
    }

    // Reset all scores to 0
    for (const id of MUSCLE_GROUP_IDS) {
      this._scores[id] = { score: 0, lastTrained: null, weeklyVolume: 0 };
    }

    if (!workoutHistory || workoutHistory.length === 0) {
      await this._save();
      return this.getScores();
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Sort workouts oldest first so we process in chronological order
    const sortedWorkouts = [...workoutHistory].sort((a, b) => {
      const dateA = new Date(a.completedAt || a.endTime || a.startTime);
      const dateB = new Date(b.completedAt || b.endTime || b.startTime);
      return dateA - dateB;
    });

    // Process each workout
    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.completedAt || workout.endTime || workout.startTime);
      if (isNaN(workoutDate.getTime())) continue;

      const daysAgo = Math.max(0, (now - workoutDate) / (1000 * 60 * 60 * 24));
      const isThisWeek = workoutDate >= oneWeekAgo;

      // Process each exercise in the workout
      for (const exercise of (workout.exercises || [])) {
        // Count completed sets
        const completedSets = (exercise.sets || []).filter(s => s.completed).length;
        if (completedSets === 0) continue;

        // Get muscle mapping
        const muscles = getMusclesForExercise(
          exercise.name,
          exercise.target || '',
          exercise.bodyPart || ''
        );

        // Calculate raw stimulus points
        const rawPoints = completedSets * POINTS_PER_SET;

        // Apply decay based on how old the workout is
        const decayFactor = Math.pow(DECAY_RATE, daysAgo);
        const decayedPoints = rawPoints * decayFactor;

        // Distribute to primary muscles
        if (muscles.primary.length > 0) {
          const pointsPerPrimary = (decayedPoints * PRIMARY_WEIGHT) / muscles.primary.length;
          for (const muscleId of muscles.primary) {
            if (this._scores[muscleId]) {
              this._scores[muscleId].score = Math.min(MAX_SCORE, this._scores[muscleId].score + pointsPerPrimary);
              
              // Track last trained (most recent date)
              if (!this._scores[muscleId].lastTrained || workoutDate > new Date(this._scores[muscleId].lastTrained)) {
                this._scores[muscleId].lastTrained = workoutDate.toISOString();
              }
              
              // Track weekly volume
              if (isThisWeek) {
                this._scores[muscleId].weeklyVolume += completedSets;
              }
            }
          }
        }

        // Distribute to secondary muscles
        if (muscles.secondary.length > 0) {
          const pointsPerSecondary = (decayedPoints * SECONDARY_WEIGHT) / muscles.secondary.length;
          for (const muscleId of muscles.secondary) {
            if (this._scores[muscleId]) {
              this._scores[muscleId].score = Math.min(MAX_SCORE, this._scores[muscleId].score + pointsPerSecondary);
              
              if (!this._scores[muscleId].lastTrained || workoutDate > new Date(this._scores[muscleId].lastTrained)) {
                this._scores[muscleId].lastTrained = workoutDate.toISOString();
              }
              
              if (isThisWeek) {
                this._scores[muscleId].weeklyVolume += Math.round(completedSets * 0.3);
              }
            }
          }
        }
      }
    }

    // Round all scores
    for (const id of MUSCLE_GROUP_IDS) {
      this._scores[id].score = Math.round(this._scores[id].score);
    }

    await this._save();
    return this.getScores();
  }

  /**
   * Get current scores with colors
   * @returns {Object} { muscleId: { score, color, label, lastTrained, weeklyVolume, daysAgo } }
   */
  getScores() {
    if (!this._scores) return {};

    const now = new Date();
    const result = {};

    for (const id of MUSCLE_GROUP_IDS) {
      const data = this._scores[id] || { score: 0, lastTrained: null, weeklyVolume: 0 };
      const score = Math.round(data.score);
      
      let daysAgo = null;
      if (data.lastTrained) {
        daysAgo = Math.floor((now - new Date(data.lastTrained)) / (1000 * 60 * 60 * 24));
      }

      result[id] = {
        score,
        color: getScoreColor(score),
        label: getScoreLabel(score),
        lastTrained: data.lastTrained,
        weeklyVolume: data.weeklyVolume || 0,
        daysAgo,
        recentlyTrained: daysAgo !== null && daysAgo <= 2, // trained in last 48h
      };
    }

    return result;
  }

  /**
   * Get overall physique score (average of all muscle groups)
   */
  getOverallScore() {
    const scores = this.getScores();
    const values = Object.values(scores).map(s => s.score);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Get the weakest muscle groups (for AI Balance Coach)
   * @param {number} count - Number of weakest muscles to return
   * @returns {Array<{ id, name, score, color }>}
   */
  getWeakestMuscles(count = 3) {
    const scores = this.getScores();
    return Object.entries(scores)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => a.score - b.score)
      .slice(0, count);
  }

  /**
   * Get the strongest muscle groups
   * @param {number} count
   * @returns {Array}
   */
  getStrongestMuscles(count = 3) {
    const scores = this.getScores();
    return Object.entries(scores)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  /**
   * Generate balance suggestions (used by AI Balance Coach)
   * @returns {Array<string>} Array of suggestion strings
   */
  getBalanceSuggestions() {
    const scores = this.getScores();
    const suggestions = [];

    // Find imbalances
    const pushMuscles = ['chest', 'frontDelts', 'triceps'];
    const pullMuscles = ['lats', 'upperBack', 'biceps', 'rearDelts'];
    const legMuscles = ['quads', 'hamstrings', 'glutes', 'calves'];
    const coreMuscles = ['abs', 'obliques', 'lowerBack'];

    const avgScore = (ids) => {
      const vals = ids.map(id => (scores[id]?.score || 0));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const pushAvg = avgScore(pushMuscles);
    const pullAvg = avgScore(pullMuscles);
    const legAvg = avgScore(legMuscles);
    const coreAvg = avgScore(coreMuscles);

    // Push vs pull imbalance
    if (pushAvg > pullAvg + 15) {
      suggestions.push('Your pushing muscles are significantly stronger than pulling. Add more back and bicep work to prevent shoulder imbalance.');
    } else if (pullAvg > pushAvg + 15) {
      suggestions.push('Your pulling is ahead of pushing. Consider adding more chest and shoulder press work.');
    }

    // Upper vs lower
    const upperAvg = (pushAvg + pullAvg) / 2;
    if (upperAvg > legAvg + 20) {
      suggestions.push('Your upper body is more developed than legs. Add squat, deadlift, or lunge variations.');
    } else if (legAvg > upperAvg + 20) {
      suggestions.push('Your legs are ahead. Consider more upper body volume for balance.');
    }

    // Core weakness
    if (coreAvg < 15 && (pushAvg > 30 || pullAvg > 30 || legAvg > 30)) {
      suggestions.push('Your core is undertrained relative to other muscles. Add planks, crunches, or ab wheel work.');
    }

    // Specific neglected muscles
    const weakest = this.getWeakestMuscles(3);
    for (const muscle of weakest) {
      if (muscle.score < 10 && this.getOverallScore() > 25) {
        const { MUSCLE_GROUPS } = require('../data/exerciseMuscleMap');
        const name = MUSCLE_GROUPS[muscle.id]?.name || muscle.id;
        suggestions.push(`${name} hasn't been trained recently. Consider adding it to your next workout.`);
        break; // Only show one "neglected" suggestion
      }
    }

    // Quad vs hamstring imbalance
    const quadScore = scores.quads?.score || 0;
    const hamScore = scores.hamstrings?.score || 0;
    if (quadScore > hamScore + 20) {
      suggestions.push('Quads are dominating over hamstrings. Add Romanian deadlifts or leg curls to reduce imbalance risk.');
    }

    // If everything is balanced
    if (suggestions.length === 0) {
      const overall = this.getOverallScore();
      if (overall >= 50) {
        suggestions.push('Great balance across all muscle groups. Keep up the consistent training!');
      } else if (overall >= 20) {
        suggestions.push('Your training is well-balanced. Increase overall volume to reach green status on more muscles.');
      } else {
        suggestions.push('Start training consistently to build up your physique scores. Even 3 sessions a week makes a big difference.');
      }
    }

    return suggestions;
  }
}

// Singleton
const physiqueService = new PhysiqueService();
export default physiqueService;
