import AsyncStorage from '@react-native-async-storage/async-storage';
import productionAiService from './productionAiService'; // Use YOUR existing AI service!
import RealBibleService from './realBibleService'; // Use YOUR existing Bible service!

// Configuration
const CONFIG = {
  VERSE_HISTORY_KEY: 'user_verse_history',
  HISTORY_DAYS: 30, // Don't repeat verses for 30 days
};

class ImprovedAIVerseService {
  
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
  
  // Step 1: AI analyzes prayer theme - IMPROVED VERSION
  static async analyzeTheme(prayerTitle) {
    console.log(`🧠 Analyzing prayer theme for: "${prayerTitle}"`);
    
    try {
      const analysis = this.getImprovedThemeAnalysis(prayerTitle);
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
  
  // Step 2: Get relevant verse references - IMPROVED VERSION
  static async getRelevantReferences(themeAnalysis) {
    console.log(`📖 Getting verse references for themes: ${themeAnalysis.mainThemes?.join(', ')}`);
    
    try {
      const references = this.getImprovedFallbackReferences(themeAnalysis.mainThemes);
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
      const historyData = await AsyncStorage.getItem(historyKey);
      
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
      console.warn('⚠️ improvedAiVerseService fallback to bible-api.com DISABLED');
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
      const existingData = await AsyncStorage.getItem(historyKey);
      const history = existingData ? JSON.parse(existingData) : [];
      
      // Add new verses to history
      const newEntries = verses.map(verse => ({
        reference: verse.reference,
        shownAt: new Date().toISOString(),
        prayerContext: 'contextual_selection'
      }));
      
      const updatedHistory = [...history, ...newEntries];
      
      // Keep only last 100 entries to prevent storage bloat
      const trimmedHistory = updatedHistory.slice(-100);
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(trimmedHistory));
      console.log('💾 Saved 2 verses to history');
      
    } catch (error) {
      console.error('Failed to save verse history:', error);
    }
  }
  
  // IMPROVED Theme Analysis with more keywords and better variety
  static getImprovedThemeAnalysis(prayerTitle) {
    const title = prayerTitle.toLowerCase();
    
    // Peace and anxiety themes
    if (title.includes('peace') || title.includes('calm') || title.includes('anxiety') || title.includes('worry') || title.includes('stress') || title.includes('rest') || title.includes('quiet') || title.includes('tranquil')) {
      return { 
        mainThemes: ['peace', 'comfort'], 
        emotions: ['anxiety', 'worry'],
        spiritualNeeds: ['comfort', 'calm', 'rest'], 
        suggestedTopics: ['peace_of_God', 'rest_in_Christ']
      };
    } 
    // Strength and courage themes
    else if (title.includes('strength') || title.includes('strong') || title.includes('difficult') || title.includes('hard') || title.includes('courage') || title.includes('power') || title.includes('overcome') || title.includes('battle') || title.includes('fight') || title.includes('endure')) {
      return { 
        mainThemes: ['strength', 'courage'], 
        emotions: ['struggle', 'determination'],
        spiritualNeeds: ['courage', 'endurance', 'power'], 
        suggestedTopics: ['strength_in_God', 'overcoming']
      };
    } 
    // Gratitude and thanksgiving themes
    else if (title.includes('thank') || title.includes('grateful') || title.includes('bless') || title.includes('praise') || title.includes('joy') || title.includes('celebrate') || title.includes('appreciate') || title.includes('worship')) {
      return { 
        mainThemes: ['gratitude', 'praise'], 
        emotions: ['thankfulness', 'joy'],
        spiritualNeeds: ['praise', 'thanksgiving', 'worship'], 
        suggestedTopics: ['blessings', 'thankfulness']
      };
    } 
    // Healing and health themes
    else if (title.includes('heal') || title.includes('sick') || title.includes('health') || title.includes('pain') || title.includes('recover') || title.includes('restore') || title.includes('broken') || title.includes('illness')) {
      return { 
        mainThemes: ['healing', 'comfort'], 
        emotions: ['pain', 'hope'],
        spiritualNeeds: ['restoration', 'comfort', 'healing'], 
        suggestedTopics: ['divine_healing', 'comfort']
      };
    }
    // Forgiveness themes
    else if (title.includes('forgiv') || title.includes('sorry') || title.includes('hurt') || title.includes('mercy') || title.includes('grace') || title.includes('repent') || title.includes('guilt')) {
      return { 
        mainThemes: ['forgiveness', 'healing'], 
        emotions: ['hurt', 'regret'],
        spiritualNeeds: ['forgiveness', 'restoration', 'peace'], 
        suggestedTopics: ['forgiveness', 'mercy']
      };
    }
    // Guidance and wisdom themes
    else if (title.includes('guide') || title.includes('decision') || title.includes('wisdom') || title.includes('help') || title.includes('direction') || title.includes('choose') || title.includes('path') || title.includes('lead') || title.includes('discern')) {
      return { 
        mainThemes: ['guidance', 'wisdom'], 
        emotions: ['uncertainty', 'seeking'],
        spiritualNeeds: ['guidance', 'wisdom', 'direction'], 
        suggestedTopics: ['divine_guidance', 'wisdom']
      };
    }
    // Love and relationships themes
    else if (title.includes('love') || title.includes('family') || title.includes('friend') || title.includes('relationship') || title.includes('marriage') || title.includes('unity') || title.includes('together') || title.includes('partner')) {
      return { 
        mainThemes: ['love', 'relationships'], 
        emotions: ['love', 'connection'],
        spiritualNeeds: ['love', 'unity', 'compassion'], 
        suggestedTopics: ['God_love', 'loving_others']
      };
    }
    // Work and purpose themes
    else if (title.includes('work') || title.includes('job') || title.includes('career') || title.includes('purpose') || title.includes('calling') || title.includes('service') || title.includes('ministry') || title.includes('mission')) {
      return { 
        mainThemes: ['purpose', 'work'], 
        emotions: ['dedication', 'seeking'],
        spiritualNeeds: ['purpose', 'guidance', 'service'], 
        suggestedTopics: ['calling', 'service']
      };
    }
    // Morning themes
    else if (title.includes('morning') || title.includes('dawn') || title.includes('start') || title.includes('begin') || title.includes('new day') || title.includes('sunrise')) {
      return { 
        mainThemes: ['morning', 'new_beginnings'], 
        emotions: ['hope', 'fresh_start'],
        spiritualNeeds: ['guidance', 'blessing', 'protection'], 
        suggestedTopics: ['new_mercies', 'daily_bread']
      };
    }
    // Evening themes
    else if (title.includes('evening') || title.includes('night') || title.includes('end') || title.includes('sleep') || title.includes('bedtime') || title.includes('sunset')) {
      return { 
        mainThemes: ['evening', 'rest'], 
        emotions: ['reflection', 'peace'],
        spiritualNeeds: ['rest', 'peace', 'protection'], 
        suggestedTopics: ['peaceful_sleep', 'reflection']
      };
    }
    // Protection and safety themes
    else if (title.includes('protect') || title.includes('safe') || title.includes('danger') || title.includes('fear') || title.includes('security') || title.includes('shield') || title.includes('guard')) {
      return { 
        mainThemes: ['protection', 'safety'], 
        emotions: ['fear', 'seeking_safety'],
        spiritualNeeds: ['protection', 'security', 'peace'], 
        suggestedTopics: ['God_protection', 'safety']
      };
    }
    // Financial and provision themes
    else if (title.includes('money') || title.includes('financial') || title.includes('provision') || title.includes('need') || title.includes('provide') || title.includes('supply') || title.includes('abundance')) {
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
  
  // IMPROVED Fallback References with much larger verse pools
  static getImprovedFallbackReferences(themes) {
    const fallbackVerses = {
      peace: [
        { reference: 'John 14:27', relevanceReason: 'Jesus promises peace', comfortLevel: 9 },
        { reference: 'Philippians 4:6-7', relevanceReason: 'Peace through prayer', comfortLevel: 8 },
        { reference: 'Psalm 46:10', relevanceReason: 'Be still and know God', comfortLevel: 8 },
        { reference: 'Isaiah 26:3', relevanceReason: 'Perfect peace for trusting minds', comfortLevel: 9 },
        { reference: 'Numbers 6:26', relevanceReason: 'The Lord give you peace', comfortLevel: 8 },
        { reference: 'Romans 15:13', relevanceReason: 'God of hope fills you with peace', comfortLevel: 8 },
        { reference: 'Colossians 3:15', relevanceReason: 'Let peace rule in your hearts', comfortLevel: 7 }
      ],
      strength: [
        { reference: 'Isaiah 40:31', relevanceReason: 'Renewed strength in God', comfortLevel: 9 },
        { reference: 'Philippians 4:13', relevanceReason: 'Strength through Christ', comfortLevel: 8 },
        { reference: 'Joshua 1:9', relevanceReason: 'Be strong and courageous', comfortLevel: 8 },
        { reference: '2 Corinthians 12:9', relevanceReason: 'Strength made perfect in weakness', comfortLevel: 9 },
        { reference: 'Psalm 28:7', relevanceReason: 'The Lord is my strength', comfortLevel: 8 },
        { reference: 'Ephesians 6:10', relevanceReason: 'Be strong in the Lord', comfortLevel: 8 },
        { reference: 'Nehemiah 8:10', relevanceReason: 'Joy of the Lord is your strength', comfortLevel: 9 }
      ],
      gratitude: [
        { reference: '1 Thessalonians 5:18', relevanceReason: 'Give thanks in all circumstances', comfortLevel: 7 },
        { reference: 'Psalm 103:2', relevanceReason: 'Remember all His benefits', comfortLevel: 8 },
        { reference: 'James 1:17', relevanceReason: 'Every good gift from above', comfortLevel: 7 },
        { reference: 'Psalm 100:4', relevanceReason: 'Enter His gates with thanksgiving', comfortLevel: 8 },
        { reference: 'Colossians 3:17', relevanceReason: 'Do everything in thanksgiving', comfortLevel: 7 },
        { reference: 'Ephesians 5:20', relevanceReason: 'Always giving thanks', comfortLevel: 7 },
        { reference: 'Psalm 118:24', relevanceReason: 'This is the day the Lord has made', comfortLevel: 8 }
      ],
      healing: [
        { reference: 'Jeremiah 30:17', relevanceReason: 'God restores health', comfortLevel: 8 },
        { reference: 'Psalm 147:3', relevanceReason: 'God heals the brokenhearted', comfortLevel: 9 },
        { reference: '1 Peter 2:24', relevanceReason: 'By His wounds we are healed', comfortLevel: 8 },
        { reference: 'Psalm 103:3', relevanceReason: 'He heals all your diseases', comfortLevel: 9 },
        { reference: 'Isaiah 53:5', relevanceReason: 'By His stripes we are healed', comfortLevel: 8 },
        { reference: 'James 5:15', relevanceReason: 'Prayer of faith will heal', comfortLevel: 8 },
        { reference: 'Malachi 4:2', relevanceReason: 'Healing in His wings', comfortLevel: 8 }
      ],
      forgiveness: [
        { reference: '1 John 1:9', relevanceReason: 'He is faithful to forgive', comfortLevel: 9 },
        { reference: 'Ephesians 4:32', relevanceReason: 'Be kind and forgiving', comfortLevel: 8 },
        { reference: 'Psalm 103:12', relevanceReason: 'Sins removed as far as east from west', comfortLevel: 9 },
        { reference: 'Matthew 6:14', relevanceReason: 'Forgive others as God forgives you', comfortLevel: 7 },
        { reference: 'Colossians 3:13', relevanceReason: 'Forgive as the Lord forgave you', comfortLevel: 8 },
        { reference: 'Isaiah 43:25', relevanceReason: 'God blots out your transgressions', comfortLevel: 9 }
      ],
      guidance: [
        { reference: 'Proverbs 3:5-6', relevanceReason: 'Trust in the Lord for direction', comfortLevel: 9 },
        { reference: 'Psalm 32:8', relevanceReason: 'God will guide you', comfortLevel: 8 },
        { reference: 'Isaiah 30:21', relevanceReason: 'This is the way, walk in it', comfortLevel: 8 },
        { reference: 'James 1:5', relevanceReason: 'Ask God for wisdom', comfortLevel: 8 },
        { reference: 'Psalm 119:105', relevanceReason: 'Your word is a lamp to my feet', comfortLevel: 9 },
        { reference: 'Jeremiah 29:11', relevanceReason: 'God has plans for your future', comfortLevel: 9 }
      ],
      wisdom: [
        { reference: 'James 1:5', relevanceReason: 'Ask God for wisdom', comfortLevel: 8 },
        { reference: 'Proverbs 2:6', relevanceReason: 'The Lord gives wisdom', comfortLevel: 8 },
        { reference: 'Proverbs 9:10', relevanceReason: 'Fear of the Lord is beginning of wisdom', comfortLevel: 7 },
        { reference: 'Colossians 2:3', relevanceReason: 'All treasures of wisdom in Christ', comfortLevel: 8 },
        { reference: '1 Corinthians 1:30', relevanceReason: 'Christ became wisdom for us', comfortLevel: 8 },
        { reference: 'Psalm 111:10', relevanceReason: 'Fear of the Lord is beginning of wisdom', comfortLevel: 7 }
      ],
      love: [
        { reference: '1 John 4:19', relevanceReason: 'We love because He first loved us', comfortLevel: 9 },
        { reference: 'Romans 8:38-39', relevanceReason: 'Nothing can separate us from God\'s love', comfortLevel: 9 },
        { reference: '1 Corinthians 13:4-7', relevanceReason: 'Love is patient and kind', comfortLevel: 8 },
        { reference: 'John 3:16', relevanceReason: 'God so loved the world', comfortLevel: 9 },
        { reference: 'Ephesians 3:17-19', relevanceReason: 'Rooted and grounded in love', comfortLevel: 8 },
        { reference: '1 John 4:16', relevanceReason: 'God is love', comfortLevel: 9 }
      ],
      relationships: [
        { reference: 'Ecclesiastes 4:12', relevanceReason: 'A cord of three strands is not easily broken', comfortLevel: 8 },
        { reference: 'Proverbs 17:17', relevanceReason: 'A friend loves at all times', comfortLevel: 8 },
        { reference: 'Ephesians 4:2-3', relevanceReason: 'Bear with one another in love', comfortLevel: 7 },
        { reference: '1 Peter 4:8', relevanceReason: 'Love covers a multitude of sins', comfortLevel: 8 },
        { reference: 'Romans 12:10', relevanceReason: 'Be devoted to one another', comfortLevel: 7 },
        { reference: 'Colossians 3:14', relevanceReason: 'Put on love, which binds everything', comfortLevel: 8 }
      ],
      purpose: [
        { reference: 'Jeremiah 29:11', relevanceReason: 'God has plans for you', comfortLevel: 9 },
        { reference: 'Romans 8:28', relevanceReason: 'Called according to His purpose', comfortLevel: 8 },
        { reference: 'Ephesians 2:10', relevanceReason: 'Created for good works', comfortLevel: 8 },
        { reference: 'Proverbs 19:21', relevanceReason: 'The Lord\'s purpose will prevail', comfortLevel: 8 },
        { reference: '1 Corinthians 10:31', relevanceReason: 'Do everything for God\'s glory', comfortLevel: 7 },
        { reference: 'Psalm 138:8', relevanceReason: 'The Lord will fulfill His purpose', comfortLevel: 8 }
      ],
      work: [
        { reference: 'Colossians 3:23', relevanceReason: 'Work as if working for the Lord', comfortLevel: 8 },
        { reference: '1 Corinthians 15:58', relevanceReason: 'Your labor is not in vain', comfortLevel: 8 },
        { reference: 'Proverbs 16:3', relevanceReason: 'Commit your work to the Lord', comfortLevel: 8 },
        { reference: 'Ecclesiastes 3:13', relevanceReason: 'Finding satisfaction in work is God\'s gift', comfortLevel: 7 },
        { reference: '2 Thessalonians 3:10', relevanceReason: 'If anyone is not willing to work', comfortLevel: 6 },
        { reference: 'Psalm 90:17', relevanceReason: 'Establish the work of our hands', comfortLevel: 8 }
      ],
      morning: [
        { reference: 'Lamentations 3:22-23', relevanceReason: 'His mercies are new every morning', comfortLevel: 9 },
        { reference: 'Psalm 5:3', relevanceReason: 'In the morning I lay my requests before you', comfortLevel: 8 },
        { reference: 'Mark 1:35', relevanceReason: 'Jesus rose early to pray', comfortLevel: 8 },
        { reference: 'Psalm 143:8', relevanceReason: 'Let morning bring word of your love', comfortLevel: 8 },
        { reference: 'Isaiah 50:4', relevanceReason: 'He wakens me morning by morning', comfortLevel: 8 },
        { reference: 'Psalm 90:14', relevanceReason: 'Satisfy us in the morning with your love', comfortLevel: 8 }
      ],
      new_beginnings: [
        { reference: '2 Corinthians 5:17', relevanceReason: 'New creation in Christ', comfortLevel: 9 },
        { reference: 'Isaiah 43:19', relevanceReason: 'God is doing a new thing', comfortLevel: 8 },
        { reference: 'Revelation 21:5', relevanceReason: 'Behold, I make all things new', comfortLevel: 9 },
        { reference: 'Lamentations 3:22-23', relevanceReason: 'New mercies every morning', comfortLevel: 9 },
        { reference: 'Philippians 3:13', relevanceReason: 'Forgetting what lies behind', comfortLevel: 8 },
        { reference: 'Ezekiel 36:26', relevanceReason: 'A new heart I will give you', comfortLevel: 8 }
      ],
      evening: [
        { reference: 'Psalm 4:8', relevanceReason: 'I will lie down and sleep in peace', comfortLevel: 9 },
        { reference: 'Psalm 91:1', relevanceReason: 'Dwelling in the shelter of the Most High', comfortLevel: 9 },
        { reference: 'Matthew 11:28', relevanceReason: 'Come to me and I will give you rest', comfortLevel: 9 },
        { reference: 'Psalm 3:5', relevanceReason: 'I lie down and sleep; I wake again', comfortLevel: 8 },
        { reference: 'Proverbs 3:24', relevanceReason: 'When you lie down, you will not be afraid', comfortLevel: 8 },
        { reference: 'Psalm 139:18', relevanceReason: 'When I awake, I am still with you', comfortLevel: 8 }
      ],
      rest: [
        { reference: 'Matthew 11:28', relevanceReason: 'Come to me and I will give you rest', comfortLevel: 9 },
        { reference: 'Psalm 23:2', relevanceReason: 'He makes me lie down in green pastures', comfortLevel: 9 },
        { reference: 'Exodus 33:14', relevanceReason: 'My presence will go with you, and I will give you rest', comfortLevel: 9 },
        { reference: 'Hebrews 4:9', relevanceReason: 'There remains a Sabbath rest', comfortLevel: 8 },
        { reference: 'Isaiah 30:15', relevanceReason: 'In quietness and trust is your strength', comfortLevel: 8 },
        { reference: 'Psalm 62:1', relevanceReason: 'My soul finds rest in God alone', comfortLevel: 9 }
      ],
      protection: [
        { reference: 'Psalm 91:1-2', relevanceReason: 'Dwelling in the shelter of the Most High', comfortLevel: 9 },
        { reference: 'Proverbs 18:10', relevanceReason: 'The name of the Lord is a strong tower', comfortLevel: 8 },
        { reference: 'Psalm 121:7-8', relevanceReason: 'The Lord will keep you from all harm', comfortLevel: 9 },
        { reference: '2 Thessalonians 3:3', relevanceReason: 'The Lord will protect you from evil', comfortLevel: 8 },
        { reference: 'Isaiah 54:17', relevanceReason: 'No weapon formed against you will prosper', comfortLevel: 8 },
        { reference: 'Psalm 27:1', relevanceReason: 'The Lord is my light and salvation', comfortLevel: 9 }
      ],
      safety: [
        { reference: 'Psalm 4:8', relevanceReason: 'I will lie down and sleep in peace', comfortLevel: 9 },
        { reference: 'Deuteronomy 31:6', relevanceReason: 'He will never leave you nor forsake you', comfortLevel: 9 },
        { reference: 'Psalm 46:1', relevanceReason: 'God is our refuge and strength', comfortLevel: 9 },
        { reference: 'Isaiah 41:10', relevanceReason: 'Do not fear, for I am with you', comfortLevel: 9 },
        { reference: 'Psalm 18:2', relevanceReason: 'The Lord is my rock and fortress', comfortLevel: 8 },
        { reference: 'Nahum 1:7', relevanceReason: 'The Lord is good, a stronghold in trouble', comfortLevel: 8 }
      ],
      provision: [
        { reference: 'Philippians 4:19', relevanceReason: 'God will supply all your needs', comfortLevel: 9 },
        { reference: 'Matthew 6:26', relevanceReason: 'Look at the birds of the air', comfortLevel: 8 },
        { reference: 'Psalm 23:1', relevanceReason: 'The Lord is my shepherd, I lack nothing', comfortLevel: 9 },
        { reference: '2 Corinthians 9:8', relevanceReason: 'God is able to make all grace abound', comfortLevel: 8 },
        { reference: 'Luke 12:24', relevanceReason: 'Consider the ravens', comfortLevel: 8 },
        { reference: 'Malachi 3:10', relevanceReason: 'Test me in this and see if I will not open the floodgates', comfortLevel: 7 }
      ],
      trust: [
        { reference: 'Proverbs 3:5', relevanceReason: 'Trust in the Lord with all your heart', comfortLevel: 9 },
        { reference: 'Psalm 37:5', relevanceReason: 'Commit your way to the Lord', comfortLevel: 8 },
        { reference: 'Isaiah 26:4', relevanceReason: 'Trust in the Lord forever', comfortLevel: 8 },
        { reference: 'Nahum 1:7', relevanceReason: 'The Lord is good to those who trust in Him', comfortLevel: 8 },
        { reference: 'Psalm 9:10', relevanceReason: 'Those who know your name trust in you', comfortLevel: 8 },
        { reference: 'Jeremiah 17:7', relevanceReason: 'Blessed is the one who trusts in the Lord', comfortLevel: 8 }
      ],
      hope: [
        { reference: 'Romans 15:13', relevanceReason: 'May the God of hope fill you', comfortLevel: 9 },
        { reference: 'Jeremiah 29:11', relevanceReason: 'Plans to give you hope and a future', comfortLevel: 9 },
        { reference: 'Psalm 42:11', relevanceReason: 'Put your hope in God', comfortLevel: 8 },
        { reference: '1 Peter 1:3', relevanceReason: 'Living hope through resurrection', comfortLevel: 9 },
        { reference: 'Romans 5:5', relevanceReason: 'Hope does not put us to shame', comfortLevel: 8 },
        { reference: 'Hebrews 6:19', relevanceReason: 'Hope as an anchor for the soul', comfortLevel: 8 }
      ],
      faith: [
        { reference: 'Hebrews 11:1', relevanceReason: 'Faith is confidence in what we hope for', comfortLevel: 8 },
        { reference: 'Romans 10:17', relevanceReason: 'Faith comes from hearing the word', comfortLevel: 8 },
        { reference: 'Matthew 17:20', relevanceReason: 'If you have faith like a mustard seed', comfortLevel: 8 },
        { reference: 'Ephesians 2:8', relevanceReason: 'By grace you have been saved through faith', comfortLevel: 9 },
        { reference: '2 Corinthians 5:7', relevanceReason: 'We walk by faith, not by sight', comfortLevel: 8 },
        { reference: 'Mark 9:23', relevanceReason: 'Everything is possible for one who believes', comfortLevel: 8 }
      ],
      grace: [
        { reference: 'Ephesians 2:8', relevanceReason: 'By grace you have been saved', comfortLevel: 9 },
        { reference: '2 Corinthians 12:9', relevanceReason: 'My grace is sufficient for you', comfortLevel: 9 },
        { reference: 'Romans 3:24', relevanceReason: 'Justified freely by His grace', comfortLevel: 8 },
        { reference: 'Titus 2:11', relevanceReason: 'Grace of God has appeared', comfortLevel: 8 },
        { reference: 'Hebrews 4:16', relevanceReason: 'Approach the throne of grace', comfortLevel: 8 },
        { reference: '1 Peter 5:10', relevanceReason: 'God of all grace will restore you', comfortLevel: 8 }
      ],
      perseverance: [
        { reference: 'James 1:12', relevanceReason: 'Blessed is the one who perseveres', comfortLevel: 8 },
        { reference: 'Galatians 6:9', relevanceReason: 'Let us not become weary in doing good', comfortLevel: 8 },
        { reference: 'Romans 5:3-4', relevanceReason: 'Suffering produces perseverance', comfortLevel: 7 },
        { reference: 'Hebrews 12:1', relevanceReason: 'Run with perseverance the race', comfortLevel: 8 },
        { reference: '2 Timothy 4:7', relevanceReason: 'I have fought the good fight', comfortLevel: 8 },
        { reference: 'Revelation 2:10', relevanceReason: 'Be faithful unto death', comfortLevel: 7 }
      ],
      comfort: [
        { reference: '2 Corinthians 1:3-4', relevanceReason: 'God of all comfort', comfortLevel: 9 },
        { reference: 'Psalm 23:4', relevanceReason: 'Your rod and staff comfort me', comfortLevel: 9 },
        { reference: 'Matthew 5:4', relevanceReason: 'Blessed are those who mourn', comfortLevel: 8 },
        { reference: 'Isaiah 66:13', relevanceReason: 'As a mother comforts her child', comfortLevel: 9 },
        { reference: 'Psalm 119:76', relevanceReason: 'May your unfailing love be my comfort', comfortLevel: 8 },
        { reference: 'John 14:16', relevanceReason: 'He will give you another Comforter', comfortLevel: 9 }
      ],
      general: [
        { reference: 'Jeremiah 29:11', relevanceReason: 'God has good plans', comfortLevel: 9 },
        { reference: 'Romans 8:28', relevanceReason: 'All things work for good', comfortLevel: 8 },
        { reference: 'Psalm 23:1', relevanceReason: 'The Lord is my shepherd', comfortLevel: 9 },
        { reference: 'Philippians 4:13', relevanceReason: 'I can do all things through Christ', comfortLevel: 8 },
        { reference: 'Isaiah 40:31', relevanceReason: 'Those who hope in the Lord will renew their strength', comfortLevel: 9 },
        { reference: 'Proverbs 3:5-6', relevanceReason: 'Trust in the Lord with all your heart', comfortLevel: 9 },
        { reference: 'John 3:16', relevanceReason: 'For God so loved the world', comfortLevel: 9 },
        { reference: 'Matthew 11:28', relevanceReason: 'Come to me, all who are weary', comfortLevel: 9 },
        { reference: '2 Corinthians 5:17', relevanceReason: 'New creation in Christ', comfortLevel: 9 },
        { reference: 'Romans 15:13', relevanceReason: 'May the God of hope fill you', comfortLevel: 9 }
      ]
    };
    
    const theme = themes?.[0] || 'general';
    const availableVerses = fallbackVerses[theme] || fallbackVerses.general;
    
    // Randomize the verses within the theme for variety
    const shuffled = [...availableVerses].sort(() => Math.random() - 0.5);
    return shuffled;
  }
  
  // Fallback verses if everything fails
  static getFallbackVerses(userPreferences) {
    return [
      {
        id: 'fallback_1',
        reference: 'Loading...',
        text: 'Verse is loading...',
        version: userPreferences?.bibleVersion || 'NIV',
        language: userPreferences?.language || 'en',
        relevanceReason: 'Loading...',
        comfortLevel: 0
      },
      {
        id: 'fallback_2',
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd, I lack nothing.',
        version: userPreferences?.bibleVersion || 'NIV',
        language: userPreferences?.language || 'en',
        relevanceReason: 'God provides and cares for you',
        comfortLevel: 9
      }
    ];
  }
}

export default ImprovedAIVerseService;
