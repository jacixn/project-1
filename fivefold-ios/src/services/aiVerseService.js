import userStorage from '../utils/userStorage';
import productionAiService from './productionAiService'; // Use YOUR existing AI service!
import RealBibleService from './realBibleService'; // Use YOUR existing Bible service!

// Configuration
const CONFIG = {
  VERSE_HISTORY_KEY: 'user_verse_history',
  HISTORY_DAYS: 30, // Don't repeat verses for 30 days
};

class AIVerseService {
  
  // Main function: Get contextual verses for a prayer
  static async getContextualVerses(prayerTitle, userPreferences = {}) {
    try {
      console.log(`🤖 AI analyzing prayer: "${prayerTitle}"`);
      
      // Step 1: AI analyzes the prayer theme
      const themeAnalysis = await this.analyzeTheme(prayerTitle);
      console.log('🎯 Theme analysis:', themeAnalysis);
      
      // Step 2: AI suggests relevant verse references
      const verseReferences = await this.getRelevantReferences(themeAnalysis);
      console.log('📖 AI suggested references:', verseReferences);
      
      // Step 3: Filter out recently shown verses
      const freshReferences = await this.filterRecentVerses(verseReferences, userPreferences.userId);
      console.log('✨ Fresh references:', freshReferences);
      
      // Step 4: Get actual verse text from Bible API
      const verses = await this.fetchVersesFromAPI(freshReferences.slice(0, 2), userPreferences);
      
      // Step 5: Save to history
      await this.saveToHistory(verses, userPreferences.userId);
      
      console.log('🎉 Final verses delivered!');
      return verses;
      
    } catch (error) {
      console.error('❌ AI verse selection failed:', error);
      return this.getFallbackVerses(userPreferences);
    }
  }
  
  // Step 1: AI analyzes prayer theme - SIMPLIFIED VERSION
  static async analyzeTheme(prayerTitle) {
    console.log(`🧠 Analyzing prayer theme for: "${prayerTitle}"`);
    
    // Skip AI for now and use smart keyword analysis
    try {
      const analysis = this.getSimpleThemeAnalysis(prayerTitle);
      console.log('✅ Theme analysis result:', analysis);
      return analysis;
    } catch (error) {
      console.error('Theme analysis failed:', error);
      // Ultimate fallback
      return {
        mainThemes: ['general'],
        emotions: ['seeking'],
        spiritualNeeds: ['guidance', 'comfort'],
        suggestedTopics: ['hope', 'faith']
      };
    }
  }
  
  // Step 2: Get relevant verse references - SIMPLIFIED VERSION
  static async getRelevantReferences(themeAnalysis) {
    console.log(`📖 Getting verse references for themes: ${themeAnalysis.mainThemes?.join(', ')}`);
    
    // Use reliable fallback system for now
    try {
      const references = this.getFallbackReferences(themeAnalysis.mainThemes);
      console.log('✅ Got verse references:', references);
      return references;
    } catch (error) {
      console.error('Verse reference selection failed:', error);
      // Return empty array instead of fallback verses
      return [];
    }
  }
  
  // Step 3: Filter out recently shown verses
  static async filterRecentVerses(references, userId) {
    try {
      const historyKey = `${CONFIG.VERSE_HISTORY_KEY}_${userId}`;
      const historyData = await userStorage.getRaw(historyKey);
      
      if (!historyData) {
        return references; // No history, all verses are fresh
      }
      
      const history = JSON.parse(historyData);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.HISTORY_DAYS);
      
      // Get recently shown verse references
      const recentRefs = history
        .filter(item => new Date(item.shownAt) > cutoffDate)
        .map(item => item.reference);
      
      // Filter out recent verses
      const freshVerses = references.filter(ref => 
        !recentRefs.includes(ref.reference)
      );
      
      console.log(`📝 Filtered out ${references.length - freshVerses.length} recent verses`);
      
      // If we filtered out too many, include some recent ones
      if (freshVerses.length < 2) {
        return references.slice(0, 4); // Return first 4 suggestions
      }
      
      return freshVerses;
      
    } catch (error) {
      console.error('History filtering failed:', error);
      return references;
    }
  }
  
  // Step 4: Get actual verse text from Bible API
  static async fetchVersesFromAPI(references, userPreferences) {
    const verses = [];
    
    for (const ref of references) {
      try {
        const verse = await this.getVerseText(
          ref.reference, 
          userPreferences.bibleVersion || 'NIV',
          userPreferences.language || 'en'
        );
        
        if (verse) {
          verses.push({
            ...verse,
            relevanceReason: ref.relevanceReason,
            comfortLevel: ref.comfortLevel
          });
        }
        
      } catch (error) {
        console.error(`Failed to fetch ${ref.reference}:`, error);
      }
    }
    
    return verses;
  }
  
  // Get verse text using YOUR existing Bible service
  static async getVerseText(reference, version = 'kjv', language = 'en') {
    try {
      console.log(`📖 Fetching ${reference} in ${version}`);
      
      // Use your existing RealBibleService to get the verse
      const verses = await RealBibleService.searchVerses(reference, version);
      
      if (verses && verses.length > 0) {
        const verse = verses[0];
        return {
          text: verse.text || verse.content,
          reference: reference,
          version: version,
          language: language
        };
      }
      
      // DISABLED - bible-api.com causes rate limiting
      console.warn('⚠️ aiVerseService fallback to bible-api.com DISABLED');
      return null;
      
    } catch (error) {
      console.error(`Bible verse fetch error for ${reference}:`, error);
      return null;
    }
  }
  
  // Step 5: Save verses to history
  static async saveToHistory(verses, userId) {
    try {
      const historyKey = `${CONFIG.VERSE_HISTORY_KEY}_${userId}`;
      const existingData = await userStorage.getRaw(historyKey);
      const history = existingData ? JSON.parse(existingData) : [];
      
      // Add new verses to history
      const newEntries = verses.map(verse => ({
        reference: verse.reference,
        shownAt: new Date().toISOString(),
        version: verse.version,
        language: verse.language
      }));
      
      history.push(...newEntries);
      
      // Keep only last 100 entries
      const trimmedHistory = history.slice(-100);
      
      await userStorage.setRaw(historyKey, JSON.stringify(trimmedHistory));
      console.log(`💾 Saved ${newEntries.length} verses to history`);
      
    } catch (error) {
      console.error('Failed to save verse history:', error);
    }
  }
  
  // Fallback methods
  static getSimpleThemeAnalysis(prayerTitle) {
    const title = prayerTitle.toLowerCase();
    
    // Peace and anxiety themes
    if (title.includes('peace') || title.includes('calm') || title.includes('anxiety') || title.includes('worry') || title.includes('stress') || title.includes('rest') || title.includes('quiet')) {
      return { 
        mainThemes: ['peace', 'comfort'], 
        emotions: ['anxiety', 'worry'],
        spiritualNeeds: ['comfort', 'calm', 'rest'], 
        suggestedTopics: ['peace_of_God', 'rest_in_Christ']
      };
    } 
    // Strength and courage themes
    else if (title.includes('strength') || title.includes('strong') || title.includes('difficult') || title.includes('hard') || title.includes('courage') || title.includes('power') || title.includes('overcome') || title.includes('battle') || title.includes('fight')) {
      return { 
        mainThemes: ['strength', 'courage'], 
        emotions: ['struggle', 'determination'],
        spiritualNeeds: ['courage', 'endurance', 'power'], 
        suggestedTopics: ['strength_in_God', 'overcoming']
      };
    } 
    // Gratitude and thanksgiving themes
    else if (title.includes('thank') || title.includes('grateful') || title.includes('bless') || title.includes('praise') || title.includes('joy') || title.includes('celebrate') || title.includes('appreciate')) {
      return { 
        mainThemes: ['gratitude', 'praise'], 
        emotions: ['thankfulness', 'joy'],
        spiritualNeeds: ['praise', 'thanksgiving', 'worship'], 
        suggestedTopics: ['blessings', 'thankfulness']
      };
    } 
    // Healing and health themes
    else if (title.includes('heal') || title.includes('sick') || title.includes('health') || title.includes('pain') || title.includes('recover') || title.includes('restore') || title.includes('broken')) {
      return { 
        mainThemes: ['healing', 'comfort'], 
        emotions: ['pain', 'hope'],
        spiritualNeeds: ['restoration', 'comfort', 'healing'], 
        suggestedTopics: ['divine_healing', 'comfort']
      };
    }
    // Forgiveness themes
    else if (title.includes('forgiv') || title.includes('sorry') || title.includes('hurt') || title.includes('mercy') || title.includes('grace') || title.includes('repent')) {
      return { 
        mainThemes: ['forgiveness', 'healing'], 
        emotions: ['hurt', 'regret'],
        spiritualNeeds: ['forgiveness', 'restoration', 'peace'], 
        suggestedTopics: ['forgiveness', 'mercy']
      };
    }
    // Guidance and wisdom themes
    else if (title.includes('guide') || title.includes('decision') || title.includes('wisdom') || title.includes('help') || title.includes('direction') || title.includes('choose') || title.includes('path') || title.includes('lead')) {
      return { 
        mainThemes: ['guidance', 'wisdom'], 
        emotions: ['uncertainty', 'seeking'],
        spiritualNeeds: ['guidance', 'wisdom', 'direction'], 
        suggestedTopics: ['divine_guidance', 'wisdom']
      };
    }
    // Love and relationships themes
    else if (title.includes('love') || title.includes('family') || title.includes('friend') || title.includes('relationship') || title.includes('marriage') || title.includes('unity') || title.includes('together')) {
      return { 
        mainThemes: ['love', 'relationships'], 
        emotions: ['love', 'connection'],
        spiritualNeeds: ['love', 'unity', 'compassion'], 
        suggestedTopics: ['God_love', 'loving_others']
      };
    }
    // Work and purpose themes
    else if (title.includes('work') || title.includes('job') || title.includes('career') || title.includes('purpose') || title.includes('calling') || title.includes('service') || title.includes('ministry')) {
      return { 
        mainThemes: ['purpose', 'work'], 
        emotions: ['dedication', 'seeking'],
        spiritualNeeds: ['purpose', 'guidance', 'service'], 
        suggestedTopics: ['calling', 'service']
      };
    }
    // Morning themes
    else if (title.includes('morning') || title.includes('dawn') || title.includes('start') || title.includes('begin') || title.includes('new day')) {
      return { 
        mainThemes: ['morning', 'new_beginnings'], 
        emotions: ['hope', 'fresh_start'],
        spiritualNeeds: ['guidance', 'blessing', 'protection'], 
        suggestedTopics: ['new_mercies', 'daily_bread']
      };
    }
    // Evening themes
    else if (title.includes('evening') || title.includes('night') || title.includes('end') || title.includes('sleep') || title.includes('bedtime')) {
      return { 
        mainThemes: ['evening', 'rest'], 
        emotions: ['reflection', 'peace'],
        spiritualNeeds: ['rest', 'peace', 'protection'], 
        suggestedTopics: ['peaceful_sleep', 'reflection']
      };
    }
    // Protection and safety themes
    else if (title.includes('protect') || title.includes('safe') || title.includes('danger') || title.includes('fear') || title.includes('security') || title.includes('shield')) {
      return { 
        mainThemes: ['protection', 'safety'], 
        emotions: ['fear', 'seeking_safety'],
        spiritualNeeds: ['protection', 'security', 'peace'], 
        suggestedTopics: ['God_protection', 'safety']
      };
    }
    // Financial and provision themes
    else if (title.includes('money') || title.includes('financial') || title.includes('provision') || title.includes('need') || title.includes('provide') || title.includes('supply')) {
      return { 
        mainThemes: ['provision', 'trust'], 
        emotions: ['concern', 'trust'],
        spiritualNeeds: ['provision', 'trust', 'peace'], 
        suggestedTopics: ['God_provides', 'trust']
      };
    }
    // For generic names like "test", "prayer", "daily", etc. - use varied themes
    else if (title.includes('test') || title.includes('prayer') || title.includes('daily') || title.includes('general') || title.length < 4) {
      // Rotate through different themes for generic names to provide variety
      const genericThemes = [
        { mainThemes: ['hope', 'faith'], emotions: ['seeking', 'hope'], spiritualNeeds: ['hope', 'faith', 'trust'], suggestedTopics: ['hope', 'faith'] },
        { mainThemes: ['love', 'grace'], emotions: ['love', 'gratitude'], spiritualNeeds: ['love', 'grace', 'mercy'], suggestedTopics: ['God_love', 'grace'] },
        { mainThemes: ['strength', 'perseverance'], emotions: ['determination', 'courage'], spiritualNeeds: ['strength', 'endurance'], suggestedTopics: ['perseverance', 'strength'] },
        { mainThemes: ['peace', 'comfort'], emotions: ['seeking_peace', 'calm'], spiritualNeeds: ['peace', 'comfort'], suggestedTopics: ['inner_peace', 'comfort'] },
        { mainThemes: ['wisdom', 'understanding'], emotions: ['seeking', 'learning'], spiritualNeeds: ['wisdom', 'understanding'], suggestedTopics: ['divine_wisdom', 'understanding'] }
      ];
      
      // Use hash of prayer title to consistently pick the same theme for the same name
      const hash = title.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      const themeIndex = Math.abs(hash) % genericThemes.length;
      return genericThemes[themeIndex];
    }
    // Default general theme with some variety
    else {
      const generalThemes = [
        { mainThemes: ['general', 'faith'], emotions: ['seeking', 'hope'], spiritualNeeds: ['guidance', 'comfort', 'faith'], suggestedTopics: ['hope', 'faith', 'trust'] },
        { mainThemes: ['blessing', 'gratitude'], emotions: ['thankfulness', 'peace'], spiritualNeeds: ['blessing', 'gratitude'], suggestedTopics: ['blessings', 'gratitude'] },
        { mainThemes: ['growth', 'spiritual'], emotions: ['growth', 'seeking'], spiritualNeeds: ['growth', 'maturity'], suggestedTopics: ['spiritual_growth', 'maturity'] }
      ];
      
      // Use length of title to pick theme for some variety
      const themeIndex = title.length % generalThemes.length;
      return generalThemes[themeIndex];
    }
  }
  
  static getFallbackReferences(themes) {
    const fallbackVerses = {
      peace: [
        { reference: 'John 14:27', relevanceReason: 'Jesus promises peace', comfortLevel: 9 },
        { reference: 'Philippians 4:6-7', relevanceReason: 'Peace through prayer', comfortLevel: 8 },
        { reference: 'Psalm 46:10', relevanceReason: 'Be still and know God', comfortLevel: 8 }
      ],
      strength: [
        { reference: 'Isaiah 40:31', relevanceReason: 'Renewed strength in God', comfortLevel: 9 },
        { reference: 'Philippians 4:13', relevanceReason: 'Strength through Christ', comfortLevel: 8 },
        { reference: 'Joshua 1:9', relevanceReason: 'Be strong and courageous', comfortLevel: 8 }
      ],
      gratitude: [
        { reference: '1 Thessalonians 5:18', relevanceReason: 'Give thanks in all circumstances', comfortLevel: 7 },
        { reference: 'Psalm 103:2', relevanceReason: 'Remember all His benefits', comfortLevel: 8 },
        { reference: 'James 1:17', relevanceReason: 'Every good gift from above', comfortLevel: 7 }
      ],
      healing: [
        { reference: 'Jeremiah 30:17', relevanceReason: 'God restores health', comfortLevel: 8 },
        { reference: 'Psalm 147:3', relevanceReason: 'God heals the brokenhearted', comfortLevel: 9 },
        { reference: '1 Peter 2:24', relevanceReason: 'By His wounds we are healed', comfortLevel: 8 }
      ],
      general: [
        { reference: 'Jeremiah 29:11', relevanceReason: 'God has good plans', comfortLevel: 9 },
        { reference: 'Romans 8:28', relevanceReason: 'All things work for good', comfortLevel: 8 },
        { reference: 'Psalm 23:1', relevanceReason: 'The Lord is my shepherd', comfortLevel: 9 }
      ]
    };
    
    const theme = themes?.[0] || 'general';
    return fallbackVerses[theme] || fallbackVerses.general;
  }
  
  static getFallbackVerses(userPreferences) {
    return [
      {
        text: "Verse is loading...",
        reference: "Loading...",
        version: userPreferences.bibleVersion || 'NIV',
        language: userPreferences.language || 'en',
        relevanceReason: "Loading...",
        comfortLevel: 0
      },
      {
        text: "The Lord is my shepherd, I lack nothing.",
        reference: "Psalm 23:1", 
        version: userPreferences.bibleVersion || 'NIV',
        language: userPreferences.language || 'en',
        relevanceReason: "God's care and provision",
        comfortLevel: 9
      }
    ];
  }
}

export default AIVerseService;
