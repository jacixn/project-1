import userStorage from '../utils/userStorage';

// Dynamic Bible Verse Fetching Service
// Handles fetching, caching, and offline support for Bible verses
class DynamicBibleService {
  
  static CACHE_KEY = 'bible_verse_cache';
  static CACHE_EXPIRY_DAYS = 30; // Cache verses for 30 days
  static MAX_CACHE_SIZE = 500; // Maximum cached verses
  
  // Main function: Get verse text with caching
  static async getVerseText(reference, version = 'kjv') {
    try {
      console.log(`📖 Getting verse: ${reference} (${version.toUpperCase()})`);
      
      // Step 1: Check cache first
      const cached = await this.getCachedVerse(reference, version);
      if (cached) {
        console.log(`💾 Found in cache: ${reference}`);
        return cached;
      }
      
      // Step 2: Fetch from API
      const verseData = await this.fetchFromAPI(reference, version);
      
      if (verseData) {
        // Step 3: Cache the result
        await this.cacheVerse(reference, version, verseData);
        return verseData;
      }
      
      throw new Error(`Could not fetch verse: ${reference}`);
      
    } catch (error) {
      console.error(`❌ Error getting verse ${reference}:`, error);
      
      // Step 4: Try fallback methods
      return await this.getFallbackVerse(reference);
    }
  }
  
  // Fetch multiple verses efficiently
  static async getMultipleVerses(references, version = 'kjv') {
    const results = [];
    
    // Process in parallel for speed
    const promises = references.map(ref => 
      this.getVerseText(ref, version)
    );
    
    const verses = await Promise.allSettled(promises);
    
    verses.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push({
          reference: references[index],
          ...result.value
        });
      } else {
        console.error(`Failed to fetch: ${references[index]}`);
      }
    });
    
    return results;
  }
  
  // DISABLED - bible-api.com causes rate limiting
  // Use githubBibleService instead
  static async fetchFromAPI(reference, version) {
    console.warn('⚠️ dynamicBibleService.fetchFromAPI is DISABLED - use githubBibleService');
    throw new Error('bible-api.com is disabled due to rate limiting. Use githubBibleService instead.');
    
    const apis = [];
    
    for (const api of apis) {
      try {
        console.log(`🌐 Trying ${api.name} for ${reference}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'FiveFold-Prayer-App/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const parsed = api.parser(data);
        
        if (parsed.text && parsed.text.trim().length > 0) {
          console.log(`✅ Successfully fetched from ${api.name}`);
          return {
            ...parsed,
            fetchedAt: new Date().toISOString(),
            source: api.name
          };
        }
        
      } catch (error) {
        console.log(`❌ ${api.name} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('All API endpoints failed');
  }
  
  // Cache management
  static async getCachedVerse(reference, version) {
    try {
      const cacheData = await userStorage.getRaw(this.CACHE_KEY);
      
      if (!cacheData) {
        return null;
      }
      
      const cache = JSON.parse(cacheData);
      const cacheKey = `${reference}_${version}`;
      const cached = cache[cacheKey];
      
      if (!cached) {
        return null;
      }
      
      // Check if cache is expired
      const fetchedAt = new Date(cached.fetchedAt);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - this.CACHE_EXPIRY_DAYS);
      
      if (fetchedAt < expiryDate) {
        console.log(`🗑️ Cache expired for ${reference}`);
        delete cache[cacheKey];
        await userStorage.setRaw(this.CACHE_KEY, JSON.stringify(cache));
        return null;
      }
      
      return cached;
      
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }
  
  static async cacheVerse(reference, version, verseData) {
    try {
      const cacheData = await userStorage.getRaw(this.CACHE_KEY);
      const cache = cacheData ? JSON.parse(cacheData) : {};
      
      const cacheKey = `${reference}_${version}`;
      cache[cacheKey] = verseData;
      
      // Limit cache size
      const cacheKeys = Object.keys(cache);
      if (cacheKeys.length > this.MAX_CACHE_SIZE) {
        // Remove oldest entries
        const sortedEntries = cacheKeys
          .map(key => ({ key, fetchedAt: cache[key].fetchedAt }))
          .sort((a, b) => new Date(a.fetchedAt) - new Date(b.fetchedAt));
        
        const toRemove = sortedEntries.slice(0, cacheKeys.length - this.MAX_CACHE_SIZE);
        toRemove.forEach(entry => delete cache[entry.key]);
        
        console.log(`🧹 Cleaned ${toRemove.length} old cache entries`);
      }
      
      await userStorage.setRaw(this.CACHE_KEY, JSON.stringify(cache));
      console.log(`💾 Cached: ${reference}`);
      
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
  
  // Fallback verse handling
  static async getFallbackVerse(reference) {
    // Try to get from emergency offline verses
    const offlineVerse = this.getOfflineVerse(reference);
    if (offlineVerse) {
      return offlineVerse;
    }
    
    // Return loading state instead of hardcoded fallback verse
    return {
      text: "Verse is loading...",
      reference: "Loading...",
      version: "NIV",
      translation: "New International Version",
      fetchedAt: new Date().toISOString(),
      source: "loading"
    };
  }
  
  // Emergency offline verses (small selection)
  static getOfflineVerse(reference) {
    // Return null instead of hardcoded verses - let the system handle loading states
    return null;
  }
  
  // Cache management utilities
  static async clearCache() {
    try {
      await userStorage.remove(this.CACHE_KEY);
      console.log('🧹 Bible verse cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
  
  static async getCacheStats() {
    try {
      const cacheData = await userStorage.getRaw(this.CACHE_KEY);
      
      if (!cacheData) {
        return { size: 0, entries: 0 };
      }
      
      const cache = JSON.parse(cacheData);
      const entries = Object.keys(cache).length;
      const sizeKB = Math.round(JSON.stringify(cache).length / 1024);
      
      return {
        entries: entries,
        sizeKB: sizeKB,
        maxEntries: this.MAX_CACHE_SIZE,
        expiryDays: this.CACHE_EXPIRY_DAYS
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }
  
  // Preload popular verses
  static async preloadPopularVerses() {
    const popularRefs = [
      'Jeremiah 29:11', 'Psalm 23:1', 'Philippians 4:13', 'Romans 8:28',
      'Isaiah 40:31', 'John 3:16', 'Proverbs 3:5-6', 'Matthew 11:28',
      'John 14:27', 'Romans 15:13', 'Psalm 91:1-2', 'James 1:5'
    ];
    
    console.log('🚀 Preloading popular verses...');
    
    try {
      await this.getMultipleVerses(popularRefs);
      console.log('✅ Popular verses preloaded');
    } catch (error) {
      console.error('❌ Preload failed:', error);
    }
  }
  
  // Network status check
  static async isOnline() {
    // DISABLED - bible-api.com causes rate limiting
    console.warn('⚠️ dynamicBibleService.isOnline is DISABLED');
    return false; // Always return false since bible-api.com is disabled
  }
}

export default DynamicBibleService;
