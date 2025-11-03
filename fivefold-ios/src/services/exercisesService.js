import AsyncStorage from '@react-native-async-storage/async-storage';

const EXERCISES_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'fivefold-exercises',
  BRANCH: 'main',
  FILE_PATH: 'exercises.json',
  
  CACHE_KEY: '@exercises_data',
  CACHE_TIMESTAMP_KEY: '@exercises_timestamp',
  CACHE_VERSION_KEY: '@exercises_version',
  CUSTOM_EXERCISES_KEY: '@custom_exercises',
  CURRENT_VERSION: '4', // Increment this when data structure changes
  CACHE_DURATION: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  get URL() {
    return `https://raw.githubusercontent.com/${this.GITHUB_USERNAME}/${this.REPO_NAME}/${this.BRANCH}/${this.FILE_PATH}`;
  }
};

class ExercisesService {
  
  // Check if cache is still valid (within 30 days AND correct version)
  static async isCacheValid() {
    try {
      // Check version first
      const cachedVersion = await AsyncStorage.getItem(EXERCISES_CONFIG.CACHE_VERSION_KEY);
      if (cachedVersion !== EXERCISES_CONFIG.CURRENT_VERSION) {
        console.log(`🔄 Cache version mismatch (cached: ${cachedVersion}, current: ${EXERCISES_CONFIG.CURRENT_VERSION})`);
        return false;
      }

      const timestamp = await AsyncStorage.getItem(EXERCISES_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < EXERCISES_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking exercises cache validity:', error);
      return false;
    }
  }

  // Fetch default exercises from GitHub
  static async fetchFromGitHub() {
    try {
      const url = EXERCISES_CONFIG.URL;
      if (!url) {
        throw new Error('GitHub URL not configured');
      }

      const cacheBuster = `?cb=${Date.now()}`;
      const urlWithCacheBuster = url + cacheBuster;

      console.log('🏋️ Fetching default exercises from GitHub:', urlWithCacheBuster);
      const response = await fetch(urlWithCacheBuster, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the default exercises
      await AsyncStorage.setItem(EXERCISES_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(EXERCISES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      await AsyncStorage.setItem(EXERCISES_CONFIG.CACHE_VERSION_KEY, EXERCISES_CONFIG.CURRENT_VERSION);
      
      console.log(`✅ Successfully fetched ${data.length || 0} default exercises from GitHub`);
      console.log('💾 Cached for 30 days with version', EXERCISES_CONFIG.CURRENT_VERSION);
      return data;
    } catch (error) {
      console.error('❌ Error fetching exercises from GitHub:', error);
      throw error;
    }
  }

  // Get custom exercises from local storage
  static async getCustomExercises() {
    try {
      const customData = await AsyncStorage.getItem(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY);
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
      
      // Generate unique ID for custom exercise
      const newExercise = {
        ...exercise,
        id: `custom_${Date.now()}`,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      
      customExercises.push(newExercise);
      await AsyncStorage.setItem(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY, JSON.stringify(customExercises));
      
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
      
      await AsyncStorage.setItem(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY, JSON.stringify(customExercises));
      
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
      
      await AsyncStorage.setItem(EXERCISES_CONFIG.CUSTOM_EXERCISES_KEY, JSON.stringify(filtered));
      
      console.log('✅ Deleted custom exercise:', exerciseId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting custom exercise:', error);
      throw error;
    }
  }

  // Get all exercises (default + custom merged)
  static async getExercises() {
    try {
      console.log('🏋️ getExercises called');
      
      let defaultExercises = [];
      
      // Check cache first for default exercises
      const cacheValid = await this.isCacheValid();
      console.log('🏋️ Cache valid:', cacheValid);
      
      if (cacheValid) {
        const cachedData = await AsyncStorage.getItem(EXERCISES_CONFIG.CACHE_KEY);
        if (cachedData) {
          const cacheTimestamp = await AsyncStorage.getItem(EXERCISES_CONFIG.CACHE_TIMESTAMP_KEY);
          const cacheAge = Date.now() - parseInt(cacheTimestamp);
          const daysOld = Math.round(cacheAge / (1000 * 60 * 60 * 24));
          console.log(`✅ Using cached default exercises (${daysOld} days old, expires in ${30 - daysOld} days)`);
          defaultExercises = JSON.parse(cachedData);
        }
      } else {
        // Fetch from GitHub if cache is invalid or missing
        console.log('📥 Cache expired or missing, fetching from GitHub...');
        defaultExercises = await this.fetchFromGitHub();
      }

      // Get custom exercises
      const customExercises = await this.getCustomExercises();
      
      // Merge default and custom exercises
      const allExercises = [...defaultExercises, ...customExercises];
      console.log(`✅ Total exercises: ${allExercises.length} (${defaultExercises.length} default + ${customExercises.length} custom)`);
      
      return allExercises;
    } catch (error) {
      console.error('❌ Error loading exercises:', error);
      
      // Try to use expired cache as fallback
      try {
        const cachedData = await AsyncStorage.getItem(EXERCISES_CONFIG.CACHE_KEY);
        const customExercises = await this.getCustomExercises();
        
        if (cachedData) {
          console.log('⚠️ Using expired cache as fallback');
          const defaultExercises = JSON.parse(cachedData);
          return [...defaultExercises, ...customExercises];
        }
      } catch (cacheError) {
        console.error('❌ Error loading from cache:', cacheError);
      }
      
      throw new Error('Unable to load exercises. Please check your connection.');
    }
  }

  // Force refresh default exercises from GitHub
  static async refresh() {
    try {
      console.log('🔄 Force refreshing default exercises from GitHub...');
      // Clear the cache completely
      await AsyncStorage.removeItem(EXERCISES_CONFIG.CACHE_KEY);
      await AsyncStorage.removeItem(EXERCISES_CONFIG.CACHE_TIMESTAMP_KEY);
      await AsyncStorage.removeItem(EXERCISES_CONFIG.CACHE_VERSION_KEY);
      console.log('✅ Cache cleared');
      
      const defaultExercises = await this.fetchFromGitHub();
      const customExercises = await this.getCustomExercises();
      
      return [...defaultExercises, ...customExercises];
    } catch (error) {
      console.error('❌ Error refreshing exercises:', error);
      throw error;
    }
  }

  static async clearCache() {
    try {
      console.log('🗑️ Clearing exercise cache...');
      await AsyncStorage.removeItem(EXERCISES_CONFIG.CACHE_KEY);
      await AsyncStorage.removeItem(EXERCISES_CONFIG.CACHE_TIMESTAMP_KEY);
      await AsyncStorage.removeItem(EXERCISES_CONFIG.CACHE_VERSION_KEY);
      console.log('✅ Cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      throw error;
    }
  }

  // Get cache info
  static async getCacheInfo() {
    try {
      const timestamp = await AsyncStorage.getItem(EXERCISES_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) {
        return { cached: false };
      }
      
      const cacheAge = Date.now() - parseInt(timestamp);
      const daysOld = Math.round(cacheAge / (1000 * 60 * 60 * 24));
      const isValid = cacheAge < EXERCISES_CONFIG.CACHE_DURATION;
      
      return {
        cached: true,
        isValid,
        daysOld,
        expiresIn: isValid ? 30 - daysOld : 0,
        timestamp: new Date(parseInt(timestamp)).toLocaleString()
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { cached: false };
    }
  }

}

export default ExercisesService;

