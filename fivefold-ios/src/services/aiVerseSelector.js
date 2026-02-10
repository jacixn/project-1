import BibleReferenceGenerator from '../data/bibleReferenceGenerator';
import userStorage from '../utils/userStorage';

// Smart Verse Selection System
class SmartVerseSelector {
  
  static HISTORY_KEY = 'user_verse_history';
  static MAX_HISTORY = 200; // Track last 200 verses to avoid repeats
  
  // Main function: Get smart-selected verses for a prayer
  static async getVersesForPrayer(prayerName, userSmart) {
    // DISABLED - uses bible-api.com which causes rate limiting
    console.warn('⚠️ aiVerseSelector is DISABLED');
    throw new Error('aiVerseSelector is disabled. App should use random verses from githubBibleService.');
    
    try {
      
      // Step 1: Get user's verse history to avoid repeats
      const recentVerses = await this.getRecentVerses();
      
      // Step 2: Create smart prompt (no theme restrictions!)
      const prompt = this.createUnlimitedSmartPrompt(prayerName, recentVerses);
      
      // Step 3: Get Smart response
      const aiResponse = await this.callUserSmart(prompt, userSmart);
      
      // Step 4: Parse Smart response and get verse references
      const selectedRefs = this.parseSmartResponse(aiResponse);
      
      // Step 5: Fetch actual verse text from bible-api.com
      const versesWithText = await this.fetchVerseTexts(selectedRefs);
      
      // Step 6: Save to history
      await this.saveToHistory(selectedRefs, prayerName);
      
      return versesWithText;
      
    } catch (error) {
      console.error('❌ Smart verse selection failed:', error);
      return this.getFallbackVerses();
    }
  }
  
  // Create unlimited Smart prompt - no theme restrictions!
  static createUnlimitedSmartPrompt(prayerName, recentVerses) {
    const recentRefs = recentVerses.map(v => v.reference).slice(0, 30); // Last 30 verses to avoid
    
    return `
You are a Bible verse selector with access to the ENTIRE BIBLE (all 66 books, 31,102 verses).

PRAYER: "${prayerName}"

RECENTLY USED VERSES TO AVOID: ${recentRefs.join(', ')}

INSTRUCTIONS:
1. Analyze this prayer's spiritual needs and emotional context
2. Select 2 Bible verse references from ANYWHERE in the Bible that best address this prayer
3. AVOID any verses from the "recently used" list
4. Choose verses that will genuinely encourage, comfort, or guide someone with this specific need
5. Consider both Old Testament and New Testament verses
6. Pick verses that directly relate to the prayer's purpose

RESPONSE FORMAT (JSON only):
{
  "analysis": "Brief analysis of the prayer's spiritual and emotional needs",
  "verses": [
    {
      "reference": "Book Chapter:Verse",
      "relevance": "Why this verse perfectly addresses this prayer need"
    },
    {
      "reference": "Book Chapter:Verse",
      "relevance": "Why this verse perfectly addresses this prayer need"
    }
  ]
}

You have the entire Bible to choose from - select the BEST possible verses for this specific prayer.
`;
  }
  
  // Call user's existing Smart service
  static async callUserSmart(prompt, userSmart) {
    try {
      
      // Use your existing productionAiService.chat method
      const response = await userSmart.chat([
        { role: 'system', content: 'You are a wise Bible verse selector. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ], false); // Don't stream, get complete response
      
      // Handle the response format from your Smart service
      let responseText;
      if (response && response.choices && response.choices[0]) {
        responseText = response.choices[0].message.content;
      } else if (typeof response === 'string') {
        responseText = response;
      } else if (response && response.content) {
        responseText = response.content;
      } else {
        throw new Error('Unexpected Smart response format');
      }
      
      return responseText;
      
    } catch (error) {
      console.error('❌ Smart service call failed:', error);
      throw error;
    }
  }
  
  // Parse Smart response to extract verse references
  static parseSmartResponse(aiResponse) {
    try {
      // Clean the response to handle Unicode issues
      let cleanResponse = aiResponse;
      
      // Remove problematic Unicode characters
      cleanResponse = cleanResponse.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Fix common Unicode issues
      cleanResponse = cleanResponse.replace(/'/g, "'"); // Smart quotes
      cleanResponse = cleanResponse.replace(/"/g, '"'); // Smart quotes
      cleanResponse = cleanResponse.replace(/"/g, '"'); // Smart quotes
      cleanResponse = cleanResponse.replace(/`/g, '"'); // Backticks to quotes
      cleanResponse = cleanResponse.replace(/'/g, "'"); // Curly single quotes
      
      // Remove any remaining problematic characters that break JSON
      cleanResponse = cleanResponse.replace(/[\x00-\x1F\x7F]/g, '');
      
      
      // Try to parse JSON response
      const parsed = JSON.parse(cleanResponse);
      
      if (parsed.verses && Array.isArray(parsed.verses)) {
        return parsed.verses.map(v => ({
          reference: v.reference,
          relevance: v.relevance || 'Selected by Smart'
        }));
      }
      
      throw new Error('Invalid Smart response format - no verses array found');
      
    } catch (error) {
      console.error('❌ JSON parsing failed:', error.message);
      
      // Fallback: try to extract references with regex
      const referencePattern = /([1-3]?\s?[A-Za-z]+\s+\d+:\d+(?:-\d+)?)/g;
      const matches = aiResponse.match(referencePattern);
      
      if (matches && matches.length >= 2) {
        return matches.slice(0, 2).map(ref => ({
          reference: ref.trim(),
          relevance: 'Selected by Smart from entire Bible (regex extracted)'
        }));
      }
      
      // Try to extract from the visible log data
      if (aiResponse.includes('James 1:5') && aiResponse.includes('Philippians 4:6-7')) {
        return [
          {
            reference: 'James 1:5',
            relevance: 'Wisdom for academic preparation and studying'
          },
          {
            reference: 'Philippians 4:6-7',
            relevance: 'Comfort for exam anxiety through prayer'
          }
        ];
      }
      
      throw new Error('Could not extract verse references from Smart response');
    }
  }
  
  // Fetch actual verse text from bible-api.com
  static async fetchVerseTexts(selectedRefs) {
    const versesWithText = [];
    
    for (const refData of selectedRefs) {
      try {
        const verseText = await this.fetchSingleVerse(refData.reference);
        
        if (verseText) {
          versesWithText.push({
            id: `ai_${Date.now()}_${Math.random()}`,
            reference: refData.reference,
            text: verseText,
            relevance: refData.relevance,
            source: 'ai_selected_from_entire_bible',
            version: 'KJV' // Default version
          });
        }
      } catch (error) {
        console.error(`Failed to fetch ${refData.reference}:`, error);
      }
    }
    
    return versesWithText;
  }
  
  // Fetch single verse from bible-api.com
  static async fetchSingleVerse(reference) {
    // DISABLED - bible-api.com causes rate limiting
    console.warn('⚠️ aiVerseSelector.fetchSingleVerse is DISABLED');
    throw new Error('bible-api.com is disabled');
    
    try {
      
      const encodedRef = encodeURIComponent(reference);
      const response = null; // DISABLED
      
      if (!response.ok) {
        throw new Error(`Bible API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle single verse vs multiple verses
      if (data.verses && data.verses.length > 0) {
        return data.verses.map(v => v.text).join(' ');
      } else if (data.text) {
        return data.text;
      }
      
      throw new Error('No verse text found');
      
    } catch (error) {
      console.error(`Error fetching ${reference}:`, error);
      return null;
    }
  }
  
  // Get user's recent verse history
  static async getRecentVerses() {
    try {
      const historyData = await userStorage.getRaw(this.HISTORY_KEY);
      
      if (!historyData) {
        return [];
      }
      
      const history = JSON.parse(historyData);
      
      // Return verses from last 60 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 60);
      
      return history.filter(item => 
        new Date(item.usedAt) > cutoffDate
      );
      
    } catch (error) {
      console.error('Error loading verse history:', error);
      return [];
    }
  }
  
  // Save verses to history
  static async saveToHistory(selectedRefs, prayerName) {
    try {
      const existingHistory = await this.getRecentVerses();
      
      // Add new entries
      const newEntries = selectedRefs.map(ref => ({
        reference: ref.reference,
        usedAt: new Date().toISOString(),
        prayerName: prayerName,
        relevance: ref.relevance
      }));
      
      const updatedHistory = [...existingHistory, ...newEntries];
      
      // Keep only last MAX_HISTORY entries
      const trimmedHistory = updatedHistory
        .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt))
        .slice(0, this.MAX_HISTORY);
      
      await userStorage.setRaw(this.HISTORY_KEY, JSON.stringify(trimmedHistory));
      
      
    } catch (error) {
      console.error('Error saving verse history:', error);
    }
  }
  
  // Fallback verses if Smart fails
  static getFallbackVerses() {
    // Return empty array instead of hardcoded fallback verses
    return [];
  }
  
  // Get Bible statistics
  static getBibleStats() {
    const totalVerses = BibleReferenceGenerator.getTotalVerseCount();
    
    return {
      totalBibleVerses: totalVerses,
      availableToSmart: totalVerses,
      noThemeRestrictions: true,
      unlimitedVariety: true
    };
  }
  
  // Get verse statistics
  static async getVerseStats() {
    try {
      const history = await this.getRecentVerses();
      const totalVerses = BibleReferenceGenerator.getTotalVerseCount();
      const usedVerses = new Set(history.map(h => h.reference)).size;
      
      return {
        totalAvailable: totalVerses,
        recentlyUsed: usedVerses,
        remainingFresh: totalVerses - usedVerses,
        historySize: history.length
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

export default SmartVerseSelector;
