import AsyncStorage from '@react-native-async-storage/async-storage';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/jacixn/biblely-character-data/main/bible-characters.json';
const CACHE_KEY = 'bible_characters_data';
const CACHE_EXPIRY_KEY = 'bible_characters_expiry';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class BibleCharactersService {
  constructor() {
    this.characters = null;
    this.characterGroups = null;
    this.loading = false;
    this.error = null;
  }

  // Check if cached data is still valid
  async isCacheValid() {
    try {
      const expiry = await AsyncStorage.getItem(CACHE_EXPIRY_KEY);
      if (!expiry) return false;
      
      const expiryTime = parseInt(expiry, 10);
      return Date.now() < expiryTime;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Load data from cache
  async loadFromCache() {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        this.characters = data.characters;
        this.characterGroups = data.characterGroups;
        console.log('✅ Loaded Bible characters from cache');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return false;
    }
  }

  // Save data to cache
  async saveToCache(data) {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      await AsyncStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      console.log('✅ Saved Bible characters to cache');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  // Fetch fresh data from GitHub
  async fetchFromGitHub() {
    try {
      console.log('📥 Fetching Bible characters from GitHub...');
      const response = await fetch(GITHUB_RAW_URL, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub fetch failed: ${response.status}`);
      }

      const data = await response.json();
      
      this.characters = data.characters;
      this.characterGroups = data.characterGroups;
      
      // Save to cache
      await this.saveToCache(data);
      
      console.log(`✅ Loaded ${Object.keys(data.characters).length} characters from GitHub`);
      return true;
    } catch (error) {
      console.error('❌ Error fetching from GitHub:', error);
      this.error = error.message;
      return false;
    }
  }

  // Main method to get character data
  async loadCharacters() {
    if (this.loading) {
      console.log('⏳ Already loading characters...');
      return;
    }

    if (this.characters && this.characterGroups) {
      console.log('✅ Characters already loaded');
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Try cache first if it's valid
      const cacheValid = await this.isCacheValid();
      if (cacheValid) {
        const cached = await this.loadFromCache();
        if (cached) {
          this.loading = false;
          return;
        }
      }

      // Fetch from GitHub if cache is invalid or empty
      await this.fetchFromGitHub();
    } catch (error) {
      console.error('Error loading characters:', error);
      this.error = error.message;
      
      // Try loading from cache as fallback
      await this.loadFromCache();
    } finally {
      this.loading = false;
    }
  }

  // Force refresh from GitHub
  async refresh() {
    console.log('🔄 Force refreshing Bible characters...');
    this.characters = null;
    this.characterGroups = null;
    await this.fetchFromGitHub();
  }

  // Get all characters
  getCharacters() {
    return this.characters || {};
  }

  // Get a specific character by name
  getCharacter(name) {
    if (!this.characters) return null;
    return this.characters[name];
  }

  // Get all character groups
  getCharacterGroups() {
    return this.characterGroups || [];
  }

  // Check if character has a profile
  hasProfile(name) {
    return this.characters && this.characters[name] !== undefined;
  }

  // Get loading state
  isLoading() {
    return this.loading;
  }

  // Get error state
  getError() {
    return this.error;
  }

  // Clear cache
  async clearCache() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_EXPIRY_KEY);
      console.log('🗑️ Cleared Bible characters cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Export a singleton instance
const bibleCharactersService = new BibleCharactersService();
export default bibleCharactersService;

