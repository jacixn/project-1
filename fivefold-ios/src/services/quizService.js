import userStorage from '../utils/userStorage';
import errorHandler from '../utils/errorHandler';

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
      const timestamp = await userStorage.getRaw(CACHE_TIMESTAMP_KEY);
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
      const cached = await userStorage.getRaw(CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
        console.log('Loaded quiz data from cache');
        return this.cache;
      }
    } catch (error) {
      errorHandler.silent('Quiz Cache Load', error);
    }
    return null;
  }

  async saveToCache(data) {
    try {
      await userStorage.setRaw(CACHE_KEY, JSON.stringify(data));
      await userStorage.setRaw(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('Saved quiz data to cache');
    } catch (error) {
      errorHandler.silent('Quiz Cache Save', error);
    }
  }

  async fetchFromGitHub() {
    try {
      console.log('Fetching quiz data from GitHub...');
      
      const cacheBust = `?t=${Date.now()}`;
      const [categoriesRes, questionsRes, levelsRes] = await Promise.all([
        fetch(`${GITHUB_BASE_URL}/categories.json${cacheBust}`),
        fetch(`${GITHUB_BASE_URL}/questions.json${cacheBust}`),
        fetch(`${GITHUB_BASE_URL}/levels.json${cacheBust}`),
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
      
      console.log('Successfully fetched and cached quiz data from GitHub');
      return quizData;
    } catch (error) {
      errorHandler.networkError('Quiz GitHub Fetch', error);
      throw error;
    }
  }

  async getQuizData(forceRefresh = false) {
    if (this.cache && !forceRefresh) {
      return this.cache;
    }

    if (this.isLoading && !forceRefresh) {
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

      const data = await this.fetchFromGitHub();
      this.isLoading = false;
      return data;
    } catch (error) {
      this.isLoading = false;
      
      const cached = await this.loadFromCache();
      if (cached) {
        console.log('Using cached quiz data (GitHub fetch failed)');
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
    console.log('Force refreshing quiz data...');
    return await this.getQuizData(true);
  }

  async clearCache() {
    try {
      await userStorage.remove(CACHE_KEY);
      await userStorage.remove(CACHE_TIMESTAMP_KEY);
      this.cache = null;
      console.log('Cleared quiz data cache');
    } catch (error) {
      errorHandler.silent('Quiz Cache Clear', error);
    }
  }
}

export default new QuizService();

