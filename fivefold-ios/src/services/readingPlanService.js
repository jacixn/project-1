import AsyncStorage from '@react-native-async-storage/async-storage';

// GitHub Configuration
const GITHUB_CONFIG = {
  USERNAME: 'jacixn',
  REPO: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/one-year-bible-plan.json',
  get URL() {
    return `https://raw.githubusercontent.com/${this.USERNAME}/${this.REPO}/${this.BRANCH}/${this.FILE_PATH}`;
  },
  CACHE_KEY: 'one_year_bible_plan_data',
  CACHE_TIMESTAMP_KEY: 'one_year_bible_plan_timestamp',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

class ReadingPlanService {
  
  // Check if cache is still valid
  static async isCacheValid() {
    try {
      const timestamp = await AsyncStorage.getItem(GITHUB_CONFIG.CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const cacheAge = Date.now() - parseInt(timestamp);
      return cacheAge < GITHUB_CONFIG.CACHE_DURATION;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Fetch reading plan from GitHub
  static async fetchFromGitHub() {
    try {
      console.log('📥 Fetching One Year Bible plan from GitHub...');
      const response = await fetch(GITHUB_CONFIG.URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the data
      await AsyncStorage.setItem(GITHUB_CONFIG.CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(GITHUB_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Successfully fetched and cached reading plan');
      return data;
    } catch (error) {
      console.error('❌ Error fetching reading plan from GitHub:', error);
      throw error;
    }
  }

  // Get reading plan data (with caching)
  static async getReadingPlan() {
    try {
      // Check cache first
      const cacheValid = await this.isCacheValid();
      
      if (cacheValid) {
        const cachedData = await AsyncStorage.getItem(GITHUB_CONFIG.CACHE_KEY);
        if (cachedData) {
          console.log('✅ Using cached reading plan data');
          return JSON.parse(cachedData);
        }
      }

      // Fetch from GitHub if cache is invalid or missing
      return await this.fetchFromGitHub();
    } catch (error) {
      console.error('Error loading reading plan:', error);
      
      // Try to use expired cache as fallback
      try {
        const cachedData = await AsyncStorage.getItem(GITHUB_CONFIG.CACHE_KEY);
        if (cachedData) {
          console.log('⚠️ Using expired cache as fallback');
          return JSON.parse(cachedData);
        }
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
      }
      
      // Return fallback data
      return this.getFallbackData();
    }
  }

  // Force refresh from GitHub
  static async refresh() {
    try {
      await AsyncStorage.removeItem(GITHUB_CONFIG.CACHE_KEY);
      await AsyncStorage.removeItem(GITHUB_CONFIG.CACHE_TIMESTAMP_KEY);
      return await this.fetchFromGitHub();
    } catch (error) {
      console.error('Error refreshing reading plan:', error);
      throw error;
    }
  }

  // Fallback data if GitHub is unavailable
  static getFallbackData() {
    return {
      planName: "One Year Bible",
      planId: "one-year-bible",
      totalDays: 365,
      description: "Read through the entire Bible in one year with daily readings from Old Testament, New Testament, Psalms, and Proverbs.",
      readings: [
        {
          day: 1,
          date: "January 1",
          oldTestament: {
            book: "Genesis",
            chapters: "1-3",
            reference: "Genesis 1-3"
          },
          newTestament: {
            book: "Matthew",
            chapters: "1",
            reference: "Matthew 1"
          },
          psalm: {
            book: "Psalms",
            chapter: "1",
            reference: "Psalm 1"
          },
          proverb: {
            book: "Proverbs",
            chapter: "1:1-9",
            reference: "Proverbs 1:1-9"
          }
        }
      ]
    };
  }
}

export default ReadingPlanService;

