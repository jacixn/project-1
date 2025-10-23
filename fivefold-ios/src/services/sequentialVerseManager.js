import AsyncStorage from '@react-native-async-storage/async-storage';
import BibleReferenceGenerator from '../data/bibleReferenceGenerator';
import DynamicBibleService from './dynamicBibleService';

/**
 * Sequential Verse Manager
 * 
 * Manages systematic distribution of Bible verses for persistent prayers.
 * Ensures every verse in the Bible (31,102 verses) is used before repeating.
 * 
 * Flow:
 * 1. Generate all 31,102 Bible verse references
 * 2. Shuffle them once at the beginning
 * 3. Distribute 2 verses at a time for each persistent prayer
 * 4. Track global position in the sequence
 * 5. When all verses are used, reshuffle and start over
 */
class SequentialVerseManager {
  static STORAGE_KEY = 'sequential_verse_system';
  static VERSES_PER_PRAYER = 2;
  
  /**
   * Initialize or load the sequential verse system
   */
  static async initializeSystem() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const system = JSON.parse(stored);
        console.log(`📚 Loaded existing verse system - Position: ${system.currentPosition}/${system.allVerses.length}`);
        return system;
      }
      
      // First time setup - generate and shuffle all verses
      console.log('🔄 First time setup - generating all Bible verses...');
      
      const allVerses = BibleReferenceGenerator.getAllVerseReferences();
      console.log(`📖 Generated ${allVerses.length} Bible verse references`);
      
      // Shuffle the verses for random distribution
      const shuffledVerses = this.shuffleArray([...allVerses]);
      console.log('🎲 Shuffled all verses for random distribution');
      
      const newSystem = {
        allVerses: shuffledVerses,
        currentPosition: 0,
        cycleCount: 1,
        createdAt: new Date().toISOString(),
        lastReset: new Date().toISOString()
      };
      
      await this.saveSystem(newSystem);
      console.log('✅ Sequential verse system initialized');
      
      return newSystem;
      
    } catch (error) {
      console.error('❌ Error initializing sequential verse system:', error);
      throw error;
    }
  }
  
  /**
   * Get the next set of verses for a persistent prayer
   */
  static async getNextVerses() {
    try {
      const system = await this.initializeSystem();
      
      // Check if we need to reset (reached end of all verses)
      if (system.currentPosition >= system.allVerses.length - this.VERSES_PER_PRAYER) {
        console.log('🔄 Reached end of Bible - starting new cycle');
        return await this.startNewCycle();
      }
      
      // Get next 2 verses from the sequence
      const nextVerses = system.allVerses.slice(
        system.currentPosition, 
        system.currentPosition + this.VERSES_PER_PRAYER
      );
      
      // Update position
      system.currentPosition += this.VERSES_PER_PRAYER;
      await this.saveSystem(system);
      
      console.log(`📖 Sequential verses ${system.currentPosition - this.VERSES_PER_PRAYER + 1}-${system.currentPosition} of ${system.allVerses.length}`);
      console.log(`📚 Verses: ${nextVerses.join(', ')}`);
      
      // Fetch actual verse text
      const versesWithText = await this.fetchVerseTexts(nextVerses);
      
      return versesWithText;
      
    } catch (error) {
      console.error('❌ Error getting next verses:', error);
      // Fallback to random verses if system fails
      return await this.getEmergencyVerses();
    }
  }
  
  /**
   * Start a new cycle when all verses have been used
   */
  static async startNewCycle() {
    try {
      console.log('🎉 Starting new Bible cycle - reshuffling all verses');
      
      const allVerses = BibleReferenceGenerator.getAllVerseReferences();
      const shuffledVerses = this.shuffleArray([...allVerses]);
      
      const newSystem = {
        allVerses: shuffledVerses,
        currentPosition: this.VERSES_PER_PRAYER,
        cycleCount: (await this.getSystem())?.cycleCount + 1 || 2,
        createdAt: (await this.getSystem())?.createdAt || new Date().toISOString(),
        lastReset: new Date().toISOString()
      };
      
      await this.saveSystem(newSystem);
      
      // Get first 2 verses of new cycle
      const firstVerses = shuffledVerses.slice(0, this.VERSES_PER_PRAYER);
      console.log(`🆕 Cycle ${newSystem.cycleCount} - First verses: ${firstVerses.join(', ')}`);
      
      // Fetch actual verse text
      const versesWithText = await this.fetchVerseTexts(firstVerses);
      
      return versesWithText;
      
    } catch (error) {
      console.error('❌ Error starting new cycle:', error);
      return await this.getEmergencyVerses();
    }
  }
  
  /**
   * Fetch actual verse text for references
   */
  static async fetchVerseTexts(references) {
    const versesWithText = [];
    
    for (const reference of references) {
      try {
        const verseData = await DynamicBibleService.getVerseText(reference);
        
        if (verseData && verseData.text) {
          versesWithText.push({
            reference: reference,
            text: verseData.text,
            source: 'sequential_system'
          });
        } else {
          // If fetch fails, add reference only
          versesWithText.push({
            reference: reference,
            text: `"${reference} - Text will be loaded when available"`,
            source: 'sequential_system_offline'
          });
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch text for ${reference}:`, error.message);
        versesWithText.push({
          reference: reference,
          text: `"${reference} - Text will be loaded when available"`,
          source: 'sequential_system_offline'
        });
      }
    }
    
    return versesWithText;
  }
  
  /**
   * Emergency fallback verses if system fails
   */
  static async getEmergencyVerses() {
    console.log('🚨 Using emergency fallback verses');
    return [
      {
        reference: 'Loading...',
        text: 'Verse is loading...',
        source: 'loading'
      },
      {
        reference: 'Loading...',
        text: 'Verse is loading...',
        source: 'loading'
      }
    ];
  }
  
  /**
   * Utility: Shuffle array using Fisher-Yates algorithm
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * Save system state to AsyncStorage
   */
  static async saveSystem(system) {
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(system));
  }
  
  /**
   * Get current system state
   */
  static async getSystem() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting system state:', error);
      return null;
    }
  }
  
  /**
   * Get system statistics
   */
  static async getSystemStats() {
    try {
      const system = await this.getSystem();
      
      if (!system) {
        return {
          totalVerses: 31102,
          currentPosition: 0,
          versesUsed: 0,
          versesRemaining: 31102,
          cycleCount: 0,
          progressPercentage: 0
        };
      }
      
      const versesUsed = system.currentPosition;
      const versesRemaining = system.allVerses.length - system.currentPosition;
      const progressPercentage = ((versesUsed / system.allVerses.length) * 100).toFixed(1);
      
      return {
        totalVerses: system.allVerses.length,
        currentPosition: system.currentPosition,
        versesUsed,
        versesRemaining,
        cycleCount: system.cycleCount,
        progressPercentage: parseFloat(progressPercentage),
        createdAt: system.createdAt,
        lastReset: system.lastReset
      };
      
    } catch (error) {
      console.error('Error getting system stats:', error);
      return null;
    }
  }
  
  /**
   * Reset the entire system (for debugging/admin)
   */
  static async resetSystem() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      console.log('🔄 Sequential verse system reset');
      return await this.initializeSystem();
    } catch (error) {
      console.error('Error resetting system:', error);
      throw error;
    }
  }
}

export default SequentialVerseManager;
