import DynamicBibleService from './dynamicBibleService';
import BibleReferenceGenerator from '../data/bibleReferenceGenerator';

// Comprehensive Fallback System for Verse Selection
// Handles all failure scenarios gracefully
class FallbackVerseSystem {
  
  // Main fallback handler - tries multiple strategies
  static async getEmergencyVerses(prayerName, count = 2) {
    
    const strategies = [
      () => this.tryPopularVersesFallback(prayerName, count),
      () => this.tryOfflineVerses(count),
      () => this.tryHardcodedVerses(count),
      () => this.getUltimateFailsafe(count)
    ];
    
    for (const strategy of strategies) {
      try {
        const verses = await strategy();
        if (verses && verses.length > 0) {
          return verses;
        }
      } catch (error) {
        continue;
      }
    }
    
    // This should never happen, but just in case
    return this.getUltimateFailsafe(count);
  }
  
  // Strategy 1: Try popular Bible verses (no theme restrictions)
  static async tryPopularVersesFallback(prayerName, count) {
    try {
      // Use most popular/encouraging Bible verses
      const popularRefs = [
        'Jeremiah 29:11', 'Psalm 23:1', 'Philippians 4:13', 'Romans 8:28',
        'Isaiah 40:31', 'John 3:16', 'Proverbs 3:5-6', 'Matthew 11:28',
        'John 14:27', 'Romans 15:13', 'Psalm 91:1-2', 'James 1:5',
        'Psalm 37:5', '2 Corinthians 12:9', 'Isaiah 26:3', 'Psalm 103:3',
        'Colossians 3:23', 'Ephesians 2:8', '1 John 4:19', 'Psalm 46:10',
        'Romans 5:8', 'Galatians 2:20', 'Hebrews 11:1', 'Matthew 6:26',
        'Psalm 139:14', 'Isaiah 41:10', 'Lamentations 3:22-23', 'Psalm 27:1'
      ];
      
      const shuffled = [...popularRefs].sort(() => Math.random() - 0.5);
      const selectedRefs = shuffled.slice(0, count);
      
      // Try to fetch text for these references
      const versesWithText = [];
      for (const ref of selectedRefs) {
        try {
          const verseData = await DynamicBibleService.getVerseText(ref);
          if (verseData) {
            versesWithText.push({
              id: `fallback_${Date.now()}_${Math.random()}`,
              reference: ref,
              text: verseData.text,
              version: verseData.version || 'KJV',
              source: 'popular_verses_fallback',
              relevance: 'Popular encouraging Bible verse'
            });
          }
        } catch (error) {
        }
      }
      
      return versesWithText;
      
    } catch (error) {
      throw new Error(`Popular verses fallback failed: ${error.message}`);
    }
  }
  
  // Strategy 2: Use offline verses from DynamicBibleService
  static async tryOfflineVerses(count) {
    try {
      const offlineRefs = [
        'Jeremiah 29:11', 'Psalm 23:1', 'Philippians 4:13', 'Romans 8:28',
        'Isaiah 40:31', 'John 3:16', 'Proverbs 3:5-6', 'Matthew 11:28',
        'John 14:27', 'Romans 15:13', 'Psalm 91:1-2', 'James 1:5',
        'Psalm 37:5', '2 Corinthians 12:9', 'Isaiah 26:3', 'Psalm 103:3',
        'Colossians 3:23', 'Ephesians 2:8'
      ];
      
      const shuffled = [...offlineRefs].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);
      
      const verses = [];
      for (const ref of selected) {
        const offlineVerse = DynamicBibleService.getOfflineVerse(ref);
        if (offlineVerse) {
          verses.push({
            id: `offline_${Date.now()}_${Math.random()}`,
            reference: ref,
            text: offlineVerse.text,
            version: offlineVerse.version,
            source: 'offline_emergency',
            relevance: 'Offline emergency verse'
          });
        }
      }
      
      return verses;
      
    } catch (error) {
      throw new Error(`Offline verses failed: ${error.message}`);
    }
  }
  
  // Strategy 3: Hardcoded verses (absolute emergency)
  static tryHardcodedVerses(count) {
    const hardcodedVerses = [
      {
        reference: 'Jeremiah 29:11',
        text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.',
        version: 'NIV'
      },
      {
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd, I lack nothing.',
        version: 'NIV'
      },
      {
        reference: 'Philippians 4:13',
        text: 'I can do all this through him who gives me strength.',
        version: 'NIV'
      },
      {
        reference: 'Romans 8:28',
        text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
        version: 'NIV'
      },
      {
        reference: 'John 3:16',
        text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        version: 'NIV'
      },
      {
        reference: 'Isaiah 40:31',
        text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
        version: 'NIV'
      }
    ];
    
    const shuffled = [...hardcodedVerses].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    return selected.map((verse, index) => ({
      id: `hardcoded_${Date.now()}_${index}`,
      reference: verse.reference,
      text: verse.text,
      version: verse.version,
      source: 'hardcoded_emergency',
      relevance: 'Emergency hardcoded verse'
    }));
  }
  
  // Strategy 4: Ultimate failsafe (should never be needed)
  static getUltimateFailsafe(count) {
    const failsafe = {
      reference: 'Jeremiah 29:11',
      text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.',
      version: 'NIV'
    };
    
    return Array(count).fill(null).map((_, index) => ({
      id: `failsafe_${Date.now()}_${index}`,
      reference: failsafe.reference,
      text: failsafe.text,
      version: failsafe.version,
      source: 'ultimate_failsafe',
      relevance: 'Ultimate failsafe verse - God has good plans for you'
    }));
  }
  
  // Get system capabilities
  static getSystemCapabilities() {
    return {
      totalBibleAccess: true,
      noThemeRestrictions: true,
      aiDrivenSelection: true,
      fallbackLayers: 4,
      neverFails: true
    };
  }
  
  // Check system health and suggest fixes
  static async checkSystemHealth() {
    const health = {
      online: false,
      cacheWorking: false,
      offlineVerses: false,
      hardcodedVerses: false,
      recommendations: []
    };
    
    try {
      // Test internet connection
      health.online = await DynamicBibleService.isOnline();
      
      // Test cache system
      try {
        const cacheStats = await DynamicBibleService.getCacheStats();
        health.cacheWorking = !cacheStats.error;
      } catch (error) {
        health.cacheWorking = false;
      }
      
      // Test offline verses
      try {
        const offlineVerse = DynamicBibleService.getOfflineVerse('Jeremiah 29:11');
        health.offlineVerses = !!offlineVerse;
      } catch (error) {
        health.offlineVerses = false;
      }
      
      // Test hardcoded verses
      try {
        const hardcoded = this.tryHardcodedVerses(1);
        health.hardcodedVerses = hardcoded.length > 0;
      } catch (error) {
        health.hardcodedVerses = false;
      }
      
      // Generate recommendations
      if (!health.online) {
        health.recommendations.push('No internet connection - using offline verses');
      }
      
      if (!health.cacheWorking) {
        health.recommendations.push('Cache system not working - verses will be slower');
      }
      
      if (!health.offlineVerses) {
        health.recommendations.push('Offline verses not available - limited fallback options');
      }
      
      if (!health.hardcodedVerses) {
        health.recommendations.push('CRITICAL: Hardcoded verses failed - app may crash');
      }
      
      if (health.online && health.cacheWorking && health.offlineVerses && health.hardcodedVerses) {
        health.recommendations.push('All systems working normally');
      }
      
    } catch (error) {
      health.recommendations.push(`Health check failed: ${error.message}`);
    }
    
    return health;
  }
  
  // Repair system if possible
  static async repairSystem() {
    
    const repairs = [];
    
    try {
      // Clear corrupted cache
      await DynamicBibleService.clearCache();
      repairs.push('Cache cleared');
      
      // Preload essential verses
      await DynamicBibleService.preloadPopularVerses();
      repairs.push('Popular verses preloaded');
      
      return repairs;
      
    } catch (error) {
      console.error('❌ Repair failed:', error);
      return [`Repair failed: ${error.message}`];
    }
  }
}

export default FallbackVerseSystem;
