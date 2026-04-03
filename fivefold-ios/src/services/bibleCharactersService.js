import userStorage from '../utils/userStorage';
import errorHandler from '../utils/errorHandler';
import productionAiService from './productionAiService';

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/bible-characters.json';
const CACHE_KEY = 'bible_characters_data';
const CACHE_EXPIRY_KEY = 'bible_characters_expiry';
const OVERRIDES_KEY = 'bible_character_overrides';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const GENERIC_MARKERS = [
  'appears in the biblical narrative',
  'part of the rich tapestry of Scripture',
  'They lived in the world of the Bible',
  'Biblical Figure',
  'This figure is part of the',
  'Their role and significance are recorded',
];

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
      const url = `${GITHUB_RAW_URL}?t=${Date.now()}`;
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
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

  isGenericProfile(character) {
    if (!character) return true;
    const blob = [character.story || '', character.name || '', ...(character.themes || [])].join(' ');
    return GENERIC_MARKERS.some(m => blob.includes(m));
  }

  async _loadOverrides() {
    try {
      const raw = await userStorage.getRaw(OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  async _saveOverride(name, profile) {
    try {
      const overrides = await this._loadOverrides();
      overrides[name] = profile;
      await userStorage.setRaw(OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('[BibleChar] Failed to save override:', e.message);
    }
  }

  async generateAndCacheProfile(name) {
    try {
      const profile = await productionAiService.generateBibleCharacterProfile(name);
      if (!profile) return null;

      await this._saveOverride(name, profile);

      if (this.characters && this.characters[name]) {
        this.characters[name] = { ...this.characters[name], ...profile };
      }

      return profile;
    } catch (e) {
      console.warn('[BibleChar] generateAndCacheProfile error:', e.message);
      return null;
    }
  }

  async getEnhancedCharacter(name) {
    const overrides = await this._loadOverrides();
    if (overrides[name]) {
      const base = this.characters?.[name] || {};
      return { ...base, ...overrides[name] };
    }
    return this.characters?.[name] || null;
  }
}

// Export a singleton instance
const bibleCharactersService = new BibleCharactersService();
export default bibleCharactersService;

