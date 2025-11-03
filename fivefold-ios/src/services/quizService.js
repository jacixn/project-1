import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorHandler } from '../utils/errorHandler';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/jacixn/project-1/main/quiz-data';
const CACHE_KEY = 'quiz_data_cache';
const CACHE_TIMESTAMP_KEY = 'quiz_data_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class QuizService {
  constructor() {
    this.cache = null;
    this.isLoading = false;
  }

  async isCacheValid() {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const now = Date.now();
      const cacheAge = now - parseInt(timestamp, 10);
      return cacheAge < CACHE_DURATION;
    } catch (error) {
      errorHandler.silent('Quiz Cache Check', error);
      return false;
    }
  }

  async loadFromCache() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
        console.log('✅ Loaded quiz data from cache');
        return this.cache;
      }
    } catch (error) {
      errorHandler.silent('Quiz Cache Load', error);
    }
    return null;
  }

  async saveToCache(data) {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('✅ Saved quiz data to cache');
    } catch (error) {
      errorHandler.silent('Quiz Cache Save', error);
    }
  }

  async fetchFromGitHub() {
    try {
      console.log('📥 Fetching quiz data from GitHub...');
      
      // Fetch all required files
      const [categoriesRes, questionsRes, levelsRes] = await Promise.all([
        fetch(`${GITHUB_BASE_URL}/categories.json`),
        fetch(`${GITHUB_BASE_URL}/questions.json`),
        fetch(`${GITHUB_BASE_URL}/levels.json`),
      ]);

      if (!categoriesRes.ok || !questionsRes.ok || !levelsRes.ok) {
        throw new Error('Failed to fetch quiz data from GitHub');
      }

      const [categories, questions, levels] = await Promise.all([
        categoriesRes.json(),
        questionsRes.json(),
        levelsRes.json(),
      ]);

      const quizData = {
        categories,
        questions,
        levels,
      };

      await this.saveToCache(quizData);
      this.cache = quizData;
      
      console.log('✅ Successfully fetched and cached quiz data from GitHub');
      return quizData;
    } catch (error) {
      errorHandler.networkError('Quiz GitHub Fetch', error);
      throw error;
    }
  }

  async getQuizData(forceRefresh = false) {
    // Return from memory cache if available
    if (this.cache && !forceRefresh) {
      return this.cache;
    }

    // Check if we're already loading
    if (this.isLoading) {
      // Wait for the current load to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isLoading && this.cache) {
            clearInterval(checkInterval);
            resolve(this.cache);
          }
        }, 100);
      });
    }

    this.isLoading = true;

    try {
      // Try cache first if not forcing refresh
      if (!forceRefresh) {
        const isValid = await this.isCacheValid();
        if (isValid) {
          const cached = await this.loadFromCache();
          if (cached) {
            this.isLoading = false;
            return cached;
          }
        }
      }

      // Fetch from GitHub
      const data = await this.fetchFromGitHub();
      this.isLoading = false;
      return data;
    } catch (error) {
      this.isLoading = false;
      
      // Fall back to cache if GitHub fails
      const cached = await this.loadFromCache();
      if (cached) {
        console.log('⚠️ Using cached quiz data (GitHub fetch failed)');
        return cached;
      }
      
      throw error;
    }
  }

  async getCategories() {
    const data = await this.getQuizData();
    return data?.categories || [];
  }

  async getQuestions() {
    const data = await this.getQuizData();
    return data?.questions || {};
  }

  async getLevels() {
    const data = await this.getQuizData();
    return data?.levels || [];
  }

  async refreshData() {
    console.log('🔄 Force refreshing quiz data...');
    return await this.getQuizData(true);
  }

  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      this.cache = null;
      console.log('🗑️ Cleared quiz data cache');
    } catch (error) {
      errorHandler.silent('Quiz Cache Clear', error);
    }
  }
}

export default new QuizService();

