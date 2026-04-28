import userStorage from '../utils/userStorage';
import BUNDLED_EXERCISES from '../data/exercises.json';

const EXERCISES_CONFIG = {
  CUSTOM_EXERCISES_KEY: '@custom_exercises',

  // Legacy cache keys — only used by clearCache to wipe old data on devices
  // that previously cached the GitHub fetch.
  LEGACY_CACHE_KEY: '@exercises_data',
  LEGACY_CACHE_TIMESTAMP_KEY: '@exercises_timestamp',
  LEGACY_CACHE_VERSION_KEY: '@exercises_version',
};

class ExercisesService {

  // Get the bundled default exercise catalog
  static getDefaultExercises() {
    return BUNDLED_EXERCISES;
  }

  // Get custom exercises from local storage
  static async getCustomExercises() {
    try {
      const customData = await userStorage.getRaw(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY);
      if (customData) {
        const customExercises = JSON.parse(customData);
        console.log(`✅ Loaded ${customExercises.length} custom exercises`);
        return customExercises;
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading custom exercises:', error);
      return [];
    }
  }

  // Add a custom exercise
  static async addCustomExercise(exercise) {
    try {
      const customExercises = await this.getCustomExercises();

      const newExercise = {
        ...exercise,
        id: `custom_${Date.now()}`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };

      customExercises.push(newExercise);
      await userStorage.setRaw(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY, JSON.stringify(customExercises));

      console.log('✅ Added custom exercise:', newExercise.name);
      return newExercise;
    } catch (error) {
      console.error('❌ Error adding custom exercise:', error);
      throw error;
    }
  }

  // Update a custom exercise
  static async updateCustomExercise(exerciseId, updates) {
    try {
      const customExercises = await this.getCustomExercises();
      const index = customExercises.findIndex(ex => ex.id === exerciseId);

      if (index === -1) {
        throw new Error('Custom exercise not found');
      }

      customExercises[index] = {
        ...customExercises[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await userStorage.setRaw(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY, JSON.stringify(customExercises));

      console.log('✅ Updated custom exercise:', customExercises[index].name);
      return customExercises[index];
    } catch (error) {
      console.error('❌ Error updating custom exercise:', error);
      throw error;
    }
  }

  // Delete a custom exercise
  static async deleteCustomExercise(exerciseId) {
    try {
      const customExercises = await this.getCustomExercises();
      const filtered = customExercises.filter(ex => ex.id !== exerciseId);

      await userStorage.setRaw(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY, JSON.stringify(filtered));

      console.log('✅ Deleted custom exercise:', exerciseId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting custom exercise:', error);
      throw error;
    }
  }

  // Get all exercises (bundled defaults + custom merged)
  static async getExercises() {
    try {
      const defaultExercises = this.getDefaultExercises();
      const customExercises = await this.getCustomExercises();
      const allExercises = [...defaultExercises, ...customExercises];
      console.log(`✅ Total exercises: ${allExercises.length} (${defaultExercises.length} default + ${customExercises.length} custom)`);
      return allExercises;
    } catch (error) {
      console.error('❌ Error loading exercises:', error);
      throw new Error('Unable to load exercises.');
    }
  }

  // Force refresh — equivalent to getExercises now (no remote source).
  static async refresh() {
    return this.getExercises();
  }

  // Wipe legacy cache keys left over from the old GitHub-fetch implementation
  static async clearCache() {
    try {
      await userStorage.remove(EXERCISES_CONFIG.LEGACY_CACHE_KEY);
      await userStorage.remove(EXERCISES_CONFIG.LEGACY_CACHE_TIMESTAMP_KEY);
      await userStorage.remove(EXERCISES_CONFIG.LEGACY_CACHE_VERSION_KEY);
      console.log('✅ Legacy cache cleared');
    } catch (error) {
      console.error('❌ Error clearing legacy cache:', error);
      throw error;
    }
  }
}

export default ExercisesService;
