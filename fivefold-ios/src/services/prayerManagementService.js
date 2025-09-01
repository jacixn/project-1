import { getStoredData, saveData } from '../utils/localStorage';

// Extended verse pool with more verses
const VERSE_POOL = [
  {
    id: 1,
    text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
    reference: "Jeremiah 29:11",
    category: "hope"
  },
  {
    id: 2,
    text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
    reference: "Proverbs 3:5-6",
    category: "trust"
  },
  {
    id: 3,
    text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9",
    category: "courage"
  },
  {
    id: 4,
    text: "Cast all your anxiety on him because he cares for you.",
    reference: "1 Peter 5:7",
    category: "peace"
  },
  {
    id: 5,
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
    reference: "Romans 8:28",
    category: "faith"
  },
  {
    id: 6,
    text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.",
    reference: "Psalm 23:1-3",
    category: "comfort"
  },
  {
    id: 7,
    text: "Come to me, all you who are weary and burdened, and I will give you rest.",
    reference: "Matthew 11:28",
    category: "rest"
  },
  {
    id: 8,
    text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.",
    reference: "Isaiah 40:31",
    category: "strength"
  },
  {
    id: 9,
    text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.",
    reference: "John 14:27",
    category: "peace"
  },
  {
    id: 10,
    text: "Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.",
    reference: "Matthew 6:34",
    category: "peace"
  },
  {
    id: 11,
    text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
    reference: "Zephaniah 3:17",
    category: "love"
  },
  {
    id: 12,
    text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9",
    category: "courage"
  },
  {
    id: 13,
    text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well.",
    reference: "Matthew 6:33",
    category: "priorities"
  },
  {
    id: 14,
    text: "I can do all this through him who gives me strength.",
    reference: "Philippians 4:13",
    category: "strength"
  },
  {
    id: 15,
    text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus.",
    reference: "Philippians 4:19",
    category: "provision"
  },
  {
    id: 16,
    text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
    reference: "Psalm 34:18",
    category: "comfort"
  },
  {
    id: 17,
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
    reference: "John 3:16",
    category: "love"
  },
  {
    id: 18,
    text: "This is the day the Lord has made; we will rejoice and be glad in it.",
    reference: "Psalm 118:24",
    category: "joy"
  },
  {
    id: 19,
    text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.",
    reference: "Numbers 6:24-26",
    category: "blessing"
  },
  {
    id: 20,
    text: "Give thanks to the Lord, for he is good; his love endures forever.",
    reference: "Psalm 107:1",
    category: "gratitude"
  }
];

class PrayerManagementService {
  static async getPrayers() {
    try {
      const prayers = await getStoredData('enhancedPrayers') || [];
      return prayers;
    } catch (error) {
      console.error('Error getting prayers:', error);
      return [];
    }
  }

  static async savePrayers(prayers) {
    try {
      await saveData('enhancedPrayers', prayers);
      return true;
    } catch (error) {
      console.error('Error saving prayers:', error);
      return false;
    }
  }

  static getRandomVerses(count = 2, excludeIds = []) {
    const availableVerses = VERSE_POOL.filter(verse => !excludeIds.includes(verse.id));
    const shuffled = [...availableVerses].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  static async addPrayer(name, time) {
    try {
      const prayers = await this.getPrayers();
      const newPrayer = {
        id: Date.now().toString(),
        name: name.trim(),
        time: time,
        verses: this.getRandomVerses(2),
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        completionCount: 0,
        lastVerseIds: [], // Track last used verses to avoid repetition
      };

      const updatedPrayers = [...prayers, newPrayer];
      await this.savePrayers(updatedPrayers);
      
      // Note: Prayer notification scheduling would go here when notification service is available
      
      return { success: true, prayer: newPrayer };
    } catch (error) {
      console.error('Error adding prayer:', error);
      return { success: false, error: error.message };
    }
  }

  static async deletePrayer(prayerId) {
    try {
      const prayers = await this.getPrayers();
      const updatedPrayers = prayers.filter(p => p.id !== prayerId);
      await this.savePrayers(updatedPrayers);
      
      // Note: Notification cancellation would go here when notification service is available
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting prayer:', error);
      return { success: false, error: error.message };
    }
  }

  static async updatePrayerName(prayerId, newName) {
    try {
      const prayers = await this.getPrayers();
      const updatedPrayers = prayers.map(prayer =>
        prayer.id === prayerId ? { ...prayer, name: newName.trim() } : prayer
      );
      await this.savePrayers(updatedPrayers);
      return { success: true };
    } catch (error) {
      console.error('Error updating prayer name:', error);
      return { success: false, error: error.message };
    }
  }

  static async updatePrayerTime(prayerId, newTime) {
    try {
      const prayers = await this.getPrayers();
      const prayer = prayers.find(p => p.id === prayerId);
      
      if (!prayer) {
        return { success: false, error: 'Prayer not found' };
      }

      const updatedPrayers = prayers.map(p =>
        p.id === prayerId ? { ...p, time: newTime } : p
      );
      
      await this.savePrayers(updatedPrayers);
      
      // Note: Prayer notification rescheduling would go here when notification service is available
      
      return { success: true };
    } catch (error) {
      console.error('Error updating prayer time:', error);
      return { success: false, error: error.message };
    }
  }

  static async completePrayer(prayerId) {
    try {
      const prayers = await this.getPrayers();
      const prayer = prayers.find(p => p.id === prayerId);
      
      if (!prayer) {
        return { success: false, error: 'Prayer not found' };
      }

      const now = new Date().toISOString();
      
      // Get new verses, avoiding recently used ones
      const excludeIds = prayer.lastVerseIds || [];
      const newVerses = this.getRandomVerses(2, excludeIds);
      
      // Update last used verse IDs (keep track of last 6 verses to avoid repetition)
      const newLastVerseIds = [
        ...newVerses.map(v => v.id),
        ...(prayer.lastVerseIds || [])
      ].slice(0, 6);

      const updatedPrayers = prayers.map(p =>
        p.id === prayerId 
          ? { 
              ...p, 
              completed: true, 
              completedAt: now,
              verses: newVerses,
              completionCount: (p.completionCount || 0) + 1,
              lastVerseIds: newLastVerseIds
            } 
          : p
      );
      
      await this.savePrayers(updatedPrayers);
      
      // Note: Prayer reactivation notification would go here when notification service is available
      
      return { success: true, prayer: updatedPrayers.find(p => p.id === prayerId) };
    } catch (error) {
      console.error('Error completing prayer:', error);
      return { success: false, error: error.message };
    }
  }

  static isPrayerActive(prayer) {
    if (!prayer.completed || !prayer.completedAt) return true;
    
    const completedTime = new Date(prayer.completedAt);
    const now = new Date();
    const hoursDiff = (now - completedTime) / (1000 * 60 * 60);
    
    return hoursDiff >= 24;
  }

  static getTimeUntilActive(prayer) {
    if (!prayer.completed || !prayer.completedAt) return null;
    
    const completedTime = new Date(prayer.completedAt);
    const now = new Date();
    const hoursDiff = (now - completedTime) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 24 - hoursDiff);
    
    return hoursLeft === 0 ? null : Math.ceil(hoursLeft);
  }

  static async reactivatePrayer(prayerId) {
    try {
      const prayers = await this.getPrayers();
      const prayer = prayers.find(p => p.id === prayerId);
      
      if (!prayer) return { success: false, error: 'Prayer not found' };
      
      // Only reactivate if 24 hours have passed
      if (!this.isPrayerActive(prayer)) {
        return { success: false, error: 'Prayer not ready for reactivation' };
      }

      // Get new verses for the reactivated prayer
      const excludeIds = prayer.lastVerseIds || [];
      const newVerses = this.getRandomVerses(2, excludeIds);
      
      const updatedPrayers = prayers.map(p =>
        p.id === prayerId 
          ? { 
              ...p, 
              completed: false, 
              completedAt: null,
              verses: newVerses
            } 
          : p
      );
      
      await this.savePrayers(updatedPrayers);
      
      // Note: Regular prayer notification rescheduling would go here when notification service is available
      
      return { success: true, prayer: reactivatedPrayer };
    } catch (error) {
      console.error('Error reactivating prayer:', error);
      return { success: false, error: error.message };
    }
  }

  // Note: Notification functions would be implemented here when notification service is available

  static async checkAndReactivatePrayers() {
    try {
      const prayers = await this.getPrayers();
      let hasUpdates = false;
      
      const updatedPrayers = prayers.map(prayer => {
        if (prayer.completed && this.isPrayerActive(prayer)) {
          hasUpdates = true;
          // Get new verses
          const excludeIds = prayer.lastVerseIds || [];
          const newVerses = this.getRandomVerses(2, excludeIds);
          
          return {
            ...prayer,
            completed: false,
            completedAt: null,
            verses: newVerses
          };
        }
        return prayer;
      });
      
      if (hasUpdates) {
        await this.savePrayers(updatedPrayers);
        
        // Note: Notification rescheduling for reactivated prayers would go here when notification service is available
      }
      
      return { success: true, reactivatedCount: hasUpdates ? updatedPrayers.filter(p => !p.completed).length : 0 };
    } catch (error) {
      console.error('Error checking and reactivating prayers:', error);
      return { success: false, error: error.message };
    }
  }

  static async getPrayerStats() {
    try {
      const prayers = await this.getPrayers();
      
      const stats = {
        totalPrayers: prayers.length,
        activePrayers: prayers.filter(p => this.isPrayerActive(p)).length,
        completedToday: prayers.filter(p => {
          if (!p.completedAt) return false;
          const completedDate = new Date(p.completedAt).toDateString();
          const today = new Date().toDateString();
          return completedDate === today;
        }).length,
        totalCompletions: prayers.reduce((sum, p) => sum + (p.completionCount || 0), 0),
        longestStreak: 0, // Could implement streak tracking
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting prayer stats:', error);
      return {
        totalPrayers: 0,
        activePrayers: 0,
        completedToday: 0,
        totalCompletions: 0,
        longestStreak: 0
      };
    }
  }
}

export default PrayerManagementService;
