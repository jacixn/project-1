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
      const [categoriesRes, questionsRes, badgesRes, levelsRes] = await Promise.all([
        fetch(`${GITHUB_BASE_URL}/categories.json`),
        fetch(`${GITHUB_BASE_URL}/questions.json`),
        fetch(`${GITHUB_BASE_URL}/badges.json`),
        fetch(`${GITHUB_BASE_URL}/levels.json`),
      ]);

      if (!categoriesRes.ok || !questionsRes.ok || !badgesRes.ok || !levelsRes.ok) {
        throw new Error('Failed to fetch quiz data from GitHub');
      }

      const [categories, questions, badges, levels] = await Promise.all([
        categoriesRes.json(),
        questionsRes.json(),
        badgesRes.json(),
        levelsRes.json(),
      ]);

      const quizData = {
        categories,
        questions,
        badges,
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

  async getBadges() {
    const data = await this.getQuizData();
    return data?.badges || [];
  }

  async getLevels() {
    const data = await this.getQuizData();
    return data?.levels || [];
  }

  async getDailyChallenge() {
    try {
      const today = new Date().toDateString();
      const cachedChallenge = await AsyncStorage.getItem('daily_challenge');
      
      if (cachedChallenge) {
        const challenge = JSON.parse(cachedChallenge);
        if (challenge.date === today) {
          console.log('✅ Using cached daily challenge');
          return challenge.questions;
        }
      }

      // Generate new daily challenge
      console.log('🎯 Generating new daily challenge...');
      const questions = await this.getQuestions();
      const allQuestions = [];
      
      // Collect all beginner questions from all categories
      Object.keys(questions).forEach(categoryId => {
        const categoryQuestions = questions[categoryId];
        Object.keys(categoryQuestions).forEach(quizType => {
          const beginner = categoryQuestions[quizType]?.beginner || [];
          allQuestions.push(...beginner);
        });
      });

      // Shuffle and select 5 questions
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const dailyQuestions = shuffled.slice(0, 5);

      // Cache for today
      await AsyncStorage.setItem('daily_challenge', JSON.stringify({
        date: today,
        questions: dailyQuestions,
      }));

      return dailyQuestions;
    } catch (error) {
      console.error('Error getting daily challenge:', error);
      return [];
    }
  }

  async getSpeedRound() {
    try {
      const questions = await this.getQuestions();
      const allQuestions = [];
      
      // Collect all questions from all categories and difficulties
      Object.keys(questions).forEach(categoryId => {
        const categoryQuestions = questions[categoryId];
        Object.keys(categoryQuestions).forEach(quizType => {
          Object.keys(categoryQuestions[quizType]).forEach(difficulty => {
            const qs = categoryQuestions[quizType][difficulty] || [];
            allQuestions.push(...qs);
          });
        });
      });

      // Shuffle and select 10 questions
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 10);
    } catch (error) {
      console.error('Error getting speed round:', error);
      return [];
    }
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

