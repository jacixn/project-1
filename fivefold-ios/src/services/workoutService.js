import AsyncStorage from '@react-native-async-storage/async-storage';

const WORKOUT_HISTORY_KEY = '@workout_history';
const TEMPLATES_KEY = '@workout_templates';
const FOLDERS_KEY = '@workout_folders';

class WorkoutService {
  
  // Get all workout templates
  static async getTemplates() {
    try {
      const templatesJson = await AsyncStorage.getItem(TEMPLATES_KEY);
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
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
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
      const historyJson = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
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
      
      await AsyncStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(history));
      console.log('✅ Workout saved to history');
      
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
      await AsyncStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(filtered));
      console.log('✅ Workout deleted:', workoutId);
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  }

  // Clear all workout history (for testing/debugging)
  static async clearHistory() {
    try {
      await AsyncStorage.removeItem(WORKOUT_HISTORY_KEY);
      console.log('✅ Workout history cleared');
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  // Clear all templates (for testing/debugging)
  static async clearTemplates() {
    try {
      await AsyncStorage.removeItem(TEMPLATES_KEY);
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
      const foldersJson = await AsyncStorage.getItem(FOLDERS_KEY);
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
      await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
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
}

export default WorkoutService;


