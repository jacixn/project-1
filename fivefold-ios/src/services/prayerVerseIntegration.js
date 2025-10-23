import AIVerseService from './aiVerseService';

// Integration helper to connect AI verses with existing prayer system
class PrayerVerseIntegration {
  
  // Replace the old getTwoVerses function with AI-powered selection
  static async getVersesForPrayer(prayerName, userId, userPreferences = {}) {
    try {
      
      // Use AI to get contextual verses
      const aiVerses = await AIVerseService.getContextualVerses(prayerName, {
        userId: userId,
        bibleVersion: userPreferences.bibleVersion || 'NIV',
        language: userPreferences.language || 'en'
      });
      
      // Convert AI verses to your existing format
      const formattedVerses = aiVerses.map((verse, index) => ({
        id: `ai_${Date.now()}_${index}`, // Unique ID for each verse
        reference: verse.reference,
        text: verse.text,
        version: verse.version,
        language: verse.language,
        relevanceReason: verse.relevanceReason,
        comfortLevel: verse.comfortLevel,
        source: 'ai' // Mark as AI-generated
      }));
      
      return formattedVerses;
      
    } catch (error) {
      console.error('❌ AI verse selection failed, using fallback:', error);
      return this.getFallbackVerses();
    }
  }
  
  // Fallback to your existing verse system if AI fails
  static getFallbackVerses() {
    const VERSES = [
      { id: 1, reference: "Loading...", text: "Verse is loading..." },
      { id: 2, reference: "Loading...", text: "Verse is loading..." },
      { id: 3, reference: "Loading...", text: "Verse is loading..." },
      { id: 4, reference: "Loading...", text: "Verse is loading..." },
      { id: 5, reference: "Loading...", text: "Verse is loading..." }
    ];
    
    // Return 2 random verses as fallback
    const shuffled = [...VERSES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  }
  
  // Check if user has set up their preferences
  static async getUserPreferences(userId) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const prefsKey = `user_preferences_${userId}`;
      const prefsData = await AsyncStorage.getItem(prefsKey);
      
      if (prefsData) {
        return JSON.parse(prefsData);
      }
      
      // Default preferences
      return {
        bibleVersion: 'NIV',
        language: 'en',
        aiVersesEnabled: true
      };
      
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      return {
        bibleVersion: 'NIV',
        language: 'en',
        aiVersesEnabled: true
      };
    }
  }
  
  // Save user preferences
  static async saveUserPreferences(userId, preferences) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const prefsKey = `user_preferences_${userId}`;
      await AsyncStorage.setItem(prefsKey, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }
}

export default PrayerVerseIntegration;
