import userStorage from '../utils/userStorage';
import errorHandler from '../utils/errorHandler';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/bible-characters.json';
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

  // Remove emoji/icon fields from groups so Bible Characters UI never renders emojis
  sanitizeData(data) {
    try {
      if (!data || typeof data !== 'object') return data;
      const groups = Array.isArray(data.characterGroups) ? data.characterGroups : [];

      const sanitizedGroups = groups.map((group) => {
        if (!group || typeof group !== 'object') return group;
        // Drop emoji-based "icon" field entirely
        // eslint-disable-next-line no-unused-vars
        const { icon, ...rest } = group;
        return rest;
      });

      return {
        ...data,
        characterGroups: sanitizedGroups,
      };
    } catch (e) {
      // If anything goes wrong, fail open (do not break loading)
      return data;
    }
  }

  // Check if cached data is still valid
  async isCacheValid() {
    try {
      const expiry = await userStorage.getRaw(CACHE_EXPIRY_KEY);
      if (!expiry) return false;
      
      const expiryTime = parseInt(expiry, 10);
      return Date.now() < expiryTime;
    } catch (error) {
      errorHandler.silent('Bible Characters Cache Check', error);
      return false;
    }
  }

  // Load data from cache
  async loadFromCache() {
    try {
      const cachedData = await userStorage.getRaw(CACHE_KEY);
      if (cachedData) {
        const raw = JSON.parse(cachedData);
        const data = this.sanitizeData(raw);
        this.characters = data.characters;
        this.characterGroups = data.characterGroups;
        console.log('✅ Loaded Bible characters from cache');
        return true;
      }
      return false;
    } catch (error) {
      errorHandler.silent('Bible Characters Cache Load', error);
      return false;
    }
  }

  // Save data to cache
  async saveToCache(data) {
    try {
      const sanitized = this.sanitizeData(data);
      await userStorage.setRaw(CACHE_KEY, JSON.stringify(sanitized));
      await userStorage.setRaw(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString());
      console.log('✅ Saved Bible characters to cache');
    } catch (error) {
      errorHandler.silent('Bible Characters Cache Save', error);
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
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();
      const data = this.sanitizeData(raw);

      this.characters = data.characters;
      this.characterGroups = data.characterGroups;
      
      // Save to cache
      await this.saveToCache(data);
      
      console.log(`✅ Loaded ${Object.keys(data.characters).length} characters from GitHub`);
      return true;
    } catch (error) {
      // Silent fallback - network errors are expected offline
      errorHandler.networkError('Bible Characters GitHub Fetch', error);
      this.error = null; // Don't show error to user
      return false;
    }
  }

  // Main method to get character data
  async loadCharacters() {
    if (this.loading) {
      return;
    }

    if (this.characters && this.characterGroups) {
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

      // Try to fetch from GitHub (will silently fall back to cache)
      const fetched = await this.fetchFromGitHub();
      
      // If GitHub fetch failed, try loading any cached data
      if (!fetched) {
        await this.loadFromCache();
      }
    } catch (error) {
      // Silent error handling - try cache as last resort
      await this.loadFromCache();
    } finally {
      this.loading = false;
      console.log(`✅ Loaded ${this.characters ? Object.keys(this.characters).length : 0} characters and ${this.characterGroups ? this.characterGroups.length : 0} groups`);
    }
  }

  // Force refresh from GitHub
  async refresh() {
    console.log('🔄 Force refreshing Bible characters...');
    this.characters = null;
    this.characterGroups = null;
    // Clear cache to force fresh fetch
    await this.clearCache();
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
      await userStorage.remove(CACHE_KEY);
      await userStorage.remove(CACHE_EXPIRY_KEY);
      console.log('🗑️ Cleared Bible characters cache');
    } catch (error) {
      errorHandler.silent('Bible Characters Cache Clear', error);
    }
  }
}

// Export a singleton instance
const bibleCharactersService = new BibleCharactersService();
export default bibleCharactersService;

