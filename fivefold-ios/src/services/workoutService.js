import userStorage from '../utils/userStorage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import AchievementService from './achievementService';

const WORKOUT_HISTORY_KEY = '@workout_history';
const TEMPLATES_KEY = '@workout_templates';
const FOLDERS_KEY = '@workout_folders';
const SCHEDULED_WORKOUTS_KEY = '@scheduled_workouts';
const SPLIT_PLAN_KEY = '@workout_split_plan';

// 90 days in milliseconds
const HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

class WorkoutService {
  
  // Get all workout templates
  static async getTemplates() {
    try {
      const templatesJson = await userStorage.getRaw(TEMPLATES_KEY);
      if (templatesJson) {
        return JSON.parse(templatesJson);
      }
      
      // Return empty array if no templates exist
      return [];
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  // Save templates
  static async saveTemplates(templates) {
    try {
      await userStorage.setRaw(TEMPLATES_KEY, JSON.stringify(templates));
      console.log('✅ Templates saved successfully');
    } catch (error) {
      console.error('Error saving templates:', error);
      throw error;
    }
  }

  // Add new template
  static async addTemplate(template) {
    try {
      const templates = await this.getTemplates();
      templates.push(template);
      await this.saveTemplates(templates);
      return template;
    } catch (error) {
      console.error('Error adding template:', error);
      throw error;
    }
  }

  // Update template
  static async updateTemplate(templateId, updates) {
    try {
      const templates = await this.getTemplates();
      const updatedTemplates = templates.map(t => 
        t.id === templateId ? { ...t, ...updates } : t
      );
      await this.saveTemplates(updatedTemplates);
      console.log('✅ Template updated:', templateId);
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  // Delete template
  static async deleteTemplate(templateId) {
    try {
      const templates = await this.getTemplates();
      const filtered = templates.filter(t => t.id !== templateId);
      await this.saveTemplates(filtered);
      console.log('✅ Template deleted:', templateId);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  // Get all workout history
  static async getWorkoutHistory() {
    try {
      const historyJson = await userStorage.getRaw(WORKOUT_HISTORY_KEY);
      if (historyJson) {
        return JSON.parse(historyJson);
      }
      return [];
    } catch (error) {
      console.error('Error loading workout history:', error);
      return [];
    }
  }

  // Save completed workout
  static async saveWorkout(workout) {
    try {
      const history = await this.getWorkoutHistory();
      
      const completedWorkout = {
        id: Date.now().toString(),
        ...workout,
        completedAt: new Date().toISOString(),
      };
      
      // Add to beginning of history (most recent first)
      history.unshift(completedWorkout);
      
      await userStorage.setRaw(WORKOUT_HISTORY_KEY, JSON.stringify(history));
      console.log('✅ Workout saved to history');
      
      // UPDATE userStats via AchievementService (syncs both keys + triggers achievements)
      try {
        // Count exercises and completed sets from this workout
        const exerciseCount = (workout.exercises || []).length;
        const setsCount = (workout.exercises || []).reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0);
        const workoutMinutes = Math.floor((workout.duration || 0) / 60);

        // ── Award direct points for completing a workout ──
        // Base: 175 pts per workout + 35 per exercise + 12 per set
        const workoutPoints = 175 + (exerciseCount * 35) + (setsCount * 12);
        const stats = await AchievementService.getStats();
        const newPoints = (stats.totalPoints || stats.points || 0) + workoutPoints;
        const newLevel = AchievementService.getLevelFromPoints(newPoints);
        
        // Write updated points to both userStats keys
        const updatedStats = {
          ...stats,
          points: newPoints,
          totalPoints: newPoints,
          level: newLevel,
        };
        await AchievementService._writeBothKeys(updatedStats);
        await userStorage.setRaw('total_points', newPoints.toString());
        console.log(`💪 Workout points awarded: +${workoutPoints} pts (base 175 + ${exerciseCount} exercises + ${setsCount} sets)`);

        await AchievementService.incrementStat('workoutsCompleted');
        if (exerciseCount > 0) await AchievementService.incrementStat('exercisesLogged', exerciseCount);
        if (setsCount > 0) await AchievementService.incrementStat('setsCompleted', setsCount);
        if (workoutMinutes > 0) await AchievementService.incrementStat('workoutMinutes', workoutMinutes);

        console.log(`✅ Updated workout stats: +1 workout, +${exerciseCount} exercises, +${setsCount} sets, +${workoutMinutes} min`);

        // SYNC TO FIREBASE
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshStats = await AchievementService.getStats();
          await setDoc(doc(db, 'users', currentUser.uid), {
            totalPoints: freshStats.totalPoints || newPoints,
            level: freshStats.level || newLevel,
            workoutsCompleted: freshStats.workoutsCompleted || 1,
            lastActive: serverTimestamp(),
          }, { merge: true });
          console.log('✅ Synced workout points + stats to Firebase:', freshStats.totalPoints);
        }
      } catch (statsError) {
        console.warn('⚠️ Failed to update workout stats:', statsError);
      }
      
      // If this workout came from a template, update it
      if (workout.templateId) {
        await this.updateTemplateFromWorkout(workout.templateId, workout);
      }
      
      return completedWorkout;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  }

  // Update template based on completed workout
  static async updateTemplateFromWorkout(templateId, workout) {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        console.warn('Template not found:', templateId);
        return;
      }

      // Update exercise sets count based on workout
      const updatedExercises = template.exercises.map(templateEx => {
        const workoutEx = workout.exercises.find(ex => 
          ex.name === templateEx.name
        );
        
        if (workoutEx) {
          return {
            ...templateEx,
            sets: workoutEx.sets.length, // Update to actual number of sets performed
          };
        }
        return templateEx;
      });

      // Format last performed date
      const date = new Date();
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const lastPerformed = `${day} ${month} ${year}`;

      await this.updateTemplate(templateId, {
        exercises: updatedExercises,
        lastPerformed,
      });
      
      console.log('✅ Template updated from workout:', templateId);
    } catch (error) {
      console.error('Error updating template from workout:', error);
    }
  }

  // Get most recent workout for a template
  static async getPreviousWorkout(templateId) {
    try {
      const history = await this.getWorkoutHistory();
      
      // Find the most recent workout that matches this template
      const previousWorkout = history.find(w => w.templateId === templateId);
      
      return previousWorkout || null;
    } catch (error) {
      console.error('Error getting previous workout:', error);
      return null;
    }
  }

  // Delete workout from history
  static async deleteWorkout(workoutId) {
    try {
      const history = await this.getWorkoutHistory();
      const filtered = history.filter(w => w.id !== workoutId);
      await userStorage.setRaw(WORKOUT_HISTORY_KEY, JSON.stringify(filtered));
      console.log('✅ Workout deleted:', workoutId);
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  }

  // Clear all workout history (for testing/debugging)
  static async clearHistory() {
    try {
      await userStorage.remove(WORKOUT_HISTORY_KEY);
      console.log('✅ Workout history cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  // Clear all templates (for testing/debugging)
  static async clearTemplates() {
    try {
      await userStorage.remove(TEMPLATES_KEY);
      console.log('✅ Templates cleared');
    } catch (error) {
      console.error('Error clearing templates:', error);
      throw error;
    }
  }

  // FOLDER MANAGEMENT

  // Get all folders
  static async getFolders() {
    try {
      const foldersJson = await userStorage.getRaw(FOLDERS_KEY);
      if (foldersJson) {
        return JSON.parse(foldersJson);
      }
      return [];
    } catch (error) {
      console.error('Error loading folders:', error);
      return [];
    }
  }

  // Save folders
  static async saveFolders(folders) {
    try {
      await userStorage.setRaw(FOLDERS_KEY, JSON.stringify(folders));
      console.log('✅ Folders saved successfully');
    } catch (error) {
      console.error('Error saving folders:', error);
      throw error;
    }
  }

  // Add new folder
  static async addFolder(folder) {
    try {
      const folders = await this.getFolders();
      folders.push(folder);
      await this.saveFolders(folders);
      return folder;
    } catch (error) {
      console.error('Error adding folder:', error);
      throw error;
    }
  }

  // Update folder
  static async updateFolder(folderId, updates) {
    try {
      const folders = await this.getFolders();
      const updatedFolders = folders.map(f => 
        f.id === folderId ? { ...f, ...updates } : f
      );
      await this.saveFolders(updatedFolders);
      console.log('✅ Folder updated:', folderId);
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  // Delete folder
  static async deleteFolder(folderId) {
    try {
      const folders = await this.getFolders();
      const filtered = folders.filter(f => f.id !== folderId);
      await this.saveFolders(filtered);
      console.log('✅ Folder deleted:', folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  // ========================================
  // WORKOUT SCHEDULING
  // ========================================

  // Get all scheduled workouts
  static async getScheduledWorkouts() {
    try {
      const scheduledJson = await userStorage.getRaw(SCHEDULED_WORKOUTS_KEY);
      if (scheduledJson) {
        return JSON.parse(scheduledJson);
      }
      return [];
    } catch (error) {
      console.error('Error loading scheduled workouts:', error);
      return [];
    }
  }

  // Save scheduled workouts
  static async saveScheduledWorkouts(scheduled) {
    try {
      await userStorage.setRaw(SCHEDULED_WORKOUTS_KEY, JSON.stringify(scheduled));
      console.log('✅ Scheduled workouts saved');
    } catch (error) {
      console.error('Error saving scheduled workouts:', error);
      throw error;
    }
  }

  // Add a scheduled workout
  // schedule object: {
  //   id: string,
  //   templateId: string,
  //   templateName: string,
  //   type: 'recurring' | 'one-time',
  //   time: string (HH:mm format, e.g., "19:00"),
  //   days: number[] (for recurring: 0=Sun, 1=Mon, etc.),
  //   date: string (for one-time: "2025-01-25"),
  //   notifyBefore: number (minutes before, default 60),
  //   createdAt: string
  // }
  static async addScheduledWorkout(schedule) {
    try {
      const scheduled = await this.getScheduledWorkouts();
      const newSchedule = {
        id: Date.now().toString(),
        ...schedule,
        createdAt: new Date().toISOString(),
      };
      scheduled.push(newSchedule);
      await this.saveScheduledWorkouts(scheduled);
      console.log('✅ Workout scheduled:', newSchedule.templateName);
      return newSchedule;
    } catch (error) {
      console.error('Error scheduling workout:', error);
      throw error;
    }
  }

  // Update a scheduled workout
  static async updateScheduledWorkout(scheduleId, updates) {
    try {
      const scheduled = await this.getScheduledWorkouts();
      const updated = scheduled.map(s => 
        s.id === scheduleId ? { ...s, ...updates } : s
      );
      await this.saveScheduledWorkouts(updated);
      console.log('✅ Schedule updated:', scheduleId);
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }

  // Delete a scheduled workout
  static async deleteScheduledWorkout(scheduleId) {
    try {
      const scheduled = await this.getScheduledWorkouts();
      const filtered = scheduled.filter(s => s.id !== scheduleId);
      await this.saveScheduledWorkouts(filtered);
      console.log('✅ Schedule deleted:', scheduleId);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  // Get scheduled workouts for a specific date
  static async getScheduledWorkoutsForDate(date) {
    try {
      const scheduled = await this.getScheduledWorkouts();
      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay(); // 0=Sun, 1=Mon, etc.
      const dateStr = targetDate.toISOString().split('T')[0]; // "2025-01-25"

      const workoutsForDate = scheduled.filter(schedule => {
        if (schedule.type === 'recurring') {
          // Check if this day is in the recurring days
          return schedule.days && schedule.days.includes(dayOfWeek);
        } else if (schedule.type === 'one-time') {
          // Check if this is the specific date
          return schedule.date === dateStr;
        }
        return false;
      });

      return workoutsForDate;
    } catch (error) {
      console.error('Error getting scheduled workouts for date:', error);
      return [];
    }
  }

  // Check if a workout was completed on a specific date
  static async isWorkoutCompletedOnDate(templateId, date) {
    try {
      const history = await this.getWorkoutHistory();
      const targetDate = new Date(date).toISOString().split('T')[0];
      
      return history.some(workout => {
        if (workout.templateId !== templateId) return false;
        const workoutDate = new Date(workout.completedAt).toISOString().split('T')[0];
        return workoutDate === targetDate;
      });
    } catch (error) {
      console.error('Error checking workout completion:', error);
      return false;
    }
  }

  // Clean up workout history older than 90 days (local)
  static async cleanOldHistory() {
    try {
      const history = await this.getWorkoutHistory();
      if (!history || history.length === 0) return;

      const cutoff = Date.now() - HISTORY_RETENTION_MS;
      const filtered = history.filter(entry => {
        const dateStr = entry.completedAt || entry.startTime || entry.endTime;
        if (!dateStr) return true; // keep entries without a date (don't delete unknowns)
        const entryTime = new Date(dateStr).getTime();
        if (isNaN(entryTime)) return true;
        return entryTime > cutoff;
      });

      if (filtered.length < history.length) {
        await userStorage.setRaw(WORKOUT_HISTORY_KEY, JSON.stringify(filtered));
        console.log(`🧹 Cleaned workout history: ${history.length} → ${filtered.length} (removed ${history.length - filtered.length} entries older than 90 days)`);
      }
    } catch (error) {
      console.warn('⚠️ Error cleaning old workout history:', error);
    }
  }

  // Clean up expired one-time schedules
  static async cleanupExpiredSchedules() {
    try {
      const scheduled = await this.getScheduledWorkouts();
      const today = new Date().toISOString().split('T')[0];
      
      const active = scheduled.filter(schedule => {
        if (schedule.type === 'one-time') {
          // Keep if the date is today or in the future
          return schedule.date >= today;
        }
        // Keep all recurring schedules
        return true;
      });

      if (active.length !== scheduled.length) {
        await this.saveScheduledWorkouts(active);
        console.log(`🧹 Cleaned up ${scheduled.length - active.length} expired schedules`);
      }
    } catch (error) {
      console.error('Error cleaning up schedules:', error);
    }
  }

  // ─── Workout Split Plan ───

  /**
   * Get the user's weekly workout split plan.
   * Returns null if no plan has been set up.
   */
  static async getSplitPlan() {
    try {
      const json = await userStorage.getRaw(SPLIT_PLAN_KEY);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.warn('[WorkoutService] Error loading split plan:', error);
      return null;
    }
  }

  /**
   * Save the user's weekly workout split plan.
   * @param {Object} plan – keyed by day name (monday..sunday)
   */
  static async saveSplitPlan(plan) {
    try {
      await userStorage.setRaw(SPLIT_PLAN_KEY, JSON.stringify(plan));
      console.log('[WorkoutService] Split plan saved');
    } catch (error) {
      console.warn('[WorkoutService] Error saving split plan:', error);
    }
  }

  /**
   * Delete the user's workout split plan.
   */
  static async deleteSplitPlan() {
    try {
      await userStorage.remove(SPLIT_PLAN_KEY);
    } catch (error) {
      console.warn('[WorkoutService] Error deleting split plan:', error);
    }
  }

  /**
   * Get today's split config from the plan.
   * Returns { active, muscles, presets, exerciseCount } or null if no plan.
   */
  static async getTodaySplit() {
    const plan = await this.getSplitPlan();
    if (!plan) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    return plan[today] || null;
  }
}

export default WorkoutService;


