import AsyncStorage from '@react-native-async-storage/async-storage';

// All available Bible verses for prayers - organized by themes/times
export const allPrayerVerses = {
  // Morning/Dawn verses
  morning: [
    {
      text: "Very early in the morning, while it was still dark, Jesus got up, left the house and went off to a solitary place, where he prayed.",
      reference: "Mark 1:35"
    },
    {
      text: "In the morning, Lord, you hear my voice; in the morning I lay my requests before you and wait expectantly.",
      reference: "Psalm 5:3"
    },
    {
      text: "Let the morning bring me word of your unfailing love, for I have put my trust in you. Show me the way I should go, for to you I entrust my life.",
      reference: "Psalm 143:8"
    },
    {
      text: "My heart is steadfast, O God; I will sing and make music with all my soul. Awake, harp and lyre! I will awaken the dawn.",
      reference: "Psalm 108:1-2"
    },
    {
      text: "This is the day the Lord has made; we will rejoice and be glad in it.",
      reference: "Psalm 118:24"
    },
    {
      text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
      reference: "Lamentations 3:22-23"
    },
    {
      text: "Satisfy us in the morning with your unfailing love, that we may sing for joy and be glad all our days.",
      reference: "Psalm 90:14"
    },
    {
      text: "But I trust in your unfailing love; my heart rejoices in your salvation. I will sing the Lord's praise, for he has been good to me.",
      reference: "Psalm 13:5-6"
    }
  ],

  // Midday verses
  midday: [
    {
      text: "At noon I will pray and cry aloud, and He shall hear my voice.",
      reference: "Psalm 55:17"
    },
    {
      text: "But I call to God, and the Lord saves me. Evening, morning and noon I cry out in distress, and he hears my voice.",
      reference: "Psalm 55:16-17"
    },
    {
      text: "Cast all your anxiety on him because he cares for you.",
      reference: "1 Peter 5:7"
    },
    {
      text: "Come to me, all you who are weary and burdened, and I will give you rest.",
      reference: "Matthew 11:28"
    },
    {
      text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
      reference: "Proverbs 3:5-6"
    },
    {
      text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters.",
      reference: "Psalm 23:1-2"
    }
  ],

  // Evening/Sunset verses
  evening: [
    {
      text: "From the rising of the sun to the place where it sets, the name of the Lord is to be praised.",
      reference: "Psalm 113:3"
    },
    {
      text: "Let my prayer be set before You as incense, the lifting up of my hands as the evening sacrifice.",
      reference: "Psalm 141:2"
    },
    {
      text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.",
      reference: "Zephaniah 3:17"
    },
    {
      text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.",
      reference: "Psalm 46:10"
    },
    {
      text: "When I lie down, I go to sleep in peace; you alone, O Lord, let me sleep in safety.",
      reference: "Psalm 4:8"
    },
    {
      text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.",
      reference: "Numbers 6:24-26"
    }
  ],

  // Night verses
  night: [
    {
      text: "I will praise the Lord, who counsels me; even at night my heart instructs me.",
      reference: "Psalm 16:7"
    },
    {
      text: "On my bed I remember you; I think of you through the watches of the night.",
      reference: "Psalm 63:6"
    },
    {
      text: "By day the Lord directs his love, at night his song is with me—a prayer to the God of my life.",
      reference: "Psalm 42:8"
    },
    {
      text: "The Lord appeared to us in the past, saying: 'I have loved you with an everlasting love; I have drawn you with unfailing kindness.'",
      reference: "Jeremiah 31:3"
    },
    {
      text: "He gives strength to the weary and increases the power of the weak.",
      reference: "Isaiah 40:29"
    }
  ],

  // General prayer verses (for any time)
  general: [
    {
      text: "And pray in the Spirit on all occasions with all kinds of prayers and requests. With this in mind, be alert and always keep on praying for all the Lord's people.",
      reference: "Ephesians 6:18"
    },
    {
      text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
      reference: "Philippians 4:6"
    },
    {
      text: "The prayer of a righteous person is powerful and effective.",
      reference: "James 5:16"
    },
    {
      text: "Call to me and I will answer you and tell you great and unsearchable things you do not know.",
      reference: "Jeremiah 33:3"
    },
    {
      text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.",
      reference: "Matthew 7:7"
    },
    {
      text: "The Lord is near to all who call on him, to all who call on him in truth.",
      reference: "Psalm 145:18"
    },
    {
      text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus.",
      reference: "1 Thessalonians 5:16-18"
    },
    {
      text: "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.",
      reference: "James 1:5"
    }
  ]
};

// Flatten all verses into one pool
const getAllVerses = () => {
  const allVerses = [];
  Object.values(allPrayerVerses).forEach(categoryVerses => {
    allVerses.push(...categoryVerses);
  });
  return allVerses;
};

export class VerseManager {
  static STORAGE_KEY = 'verseRotationState';
  
  // Get the current verse rotation state
  static async getRotationState() {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Initialize with all verses available
      const allVerses = getAllVerses();
      const initialState = {
        availableVerses: [...allVerses],
        usedVerses: [],
        lastResetDate: new Date().toDateString()
      };
      
      await this.saveRotationState(initialState);
      return initialState;
    } catch (error) {
      console.error('Error loading verse rotation state:', error);
      return {
        availableVerses: getAllVerses(),
        usedVerses: [],
        lastResetDate: new Date().toDateString()
      };
    }
  }
  
  // Save verse rotation state
  static async saveRotationState(state) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving verse rotation state:', error);
    }
  }
  
  // Get two unique verses for a prayer (no repeats until all used)
  static async getTwoVersesForPrayer(prayerId) {
    try {
      let state = await this.getRotationState();
      
      // Check if we need to reset (new day or all verses used)
      const today = new Date().toDateString();
      if (state.lastResetDate !== today || state.availableVerses.length < 2) {
        // Reset the rotation - all verses become available again
        const allVerses = getAllVerses();
        state = {
          availableVerses: [...allVerses],
          usedVerses: [],
          lastResetDate: today
        };
      }
      
      // Get two random verses from available verses
      const shuffled = [...state.availableVerses].sort(() => Math.random() - 0.5);
      const selectedVerses = shuffled.slice(0, 2);
      
      // Move selected verses from available to used
      state.availableVerses = state.availableVerses.filter(
        verse => !selectedVerses.some(selected => 
          selected.text === verse.text && selected.reference === verse.reference
        )
      );
      state.usedVerses.push(...selectedVerses);
      
      // Save updated state
      await this.saveRotationState(state);
      
      return selectedVerses;
    } catch (error) {
      console.error('Error getting verses for prayer:', error);
      
      // Fallback to default verses
      return [
        {
          text: "Be still, and know that I am God.",
          reference: "Psalm 46:10"
        },
        {
          text: "The Lord is my shepherd, I lack nothing.",
          reference: "Psalm 23:1"
        }
      ];
    }
  }
  
  // Get verses for a specific prayer - stays same until 24hrs after prayer time
  static async getContextualVersesForPrayer(prayerId, prayerTime) {
    try {
      const prayerVerseKey = `prayer_verses_${prayerId}`;
      
      // Check if we already have verses for this prayer
      const existingData = await AsyncStorage.getItem(prayerVerseKey);
      
      if (existingData) {
        const prayerData = JSON.parse(existingData);
        
        // Check if 24 hours have passed since the prayer time
        const prayerDateTime = this.getPrayerDateTime(prayerTime);
        const now = new Date();
        const hoursSincePrayer = (now - prayerDateTime) / (1000 * 60 * 60);
        
        console.log(`📖 Prayer ${prayerId}: Hours since prayer time: ${hoursSincePrayer.toFixed(1)}`);
        
        // If less than 24 hours have passed, return existing verses
        if (hoursSincePrayer < 24) {
          console.log(`📖 Prayer ${prayerId}: Using existing verses (${24 - hoursSincePrayer.toFixed(1)} hours remaining)`);
          return prayerData.verses;
        } else {
          console.log(`📖 Prayer ${prayerId}: 24 hours passed, getting new verses`);
          // Remove old verses
          await AsyncStorage.removeItem(prayerVerseKey);
        }
      }
      
      // Generate new verses for this prayer
      console.log(`📖 Prayer ${prayerId}: Generating new verses`);
      const timeCategory = this.getTimeCategoryFromTime(prayerTime);
      
      // Get verses from the appropriate time category
      let categoryVerses = allPrayerVerses[timeCategory] || allPrayerVerses.general;
      
      // Get two random verses from the category
      const shuffled = [...categoryVerses].sort(() => Math.random() - 0.5);
      const selectedVerses = shuffled.slice(0, 2);
      
      // Store the verses with timestamp
      const prayerData = {
        verses: selectedVerses,
        prayerTime: prayerTime,
        createdAt: new Date().toISOString(),
        prayerId: prayerId
      };
      
      await AsyncStorage.setItem(prayerVerseKey, JSON.stringify(prayerData));
      
      console.log(`📖 Prayer ${prayerId}: Stored new verses:`, selectedVerses.map(v => v.reference));
      return selectedVerses;
      
    } catch (error) {
      console.error('Error getting contextual verses:', error);
      
      // Fallback to default verses
      return [
        {
          text: "Be still, and know that I am God.",
          reference: "Psalm 46:10"
        },
        {
          text: "The Lord is my shepherd, I lack nothing.",
          reference: "Psalm 23:1"
        }
      ];
    }
  }
  
  // Helper to get prayer date/time for comparison
  static getPrayerDateTime(prayerTime) {
    const today = new Date();
    const [hours, minutes] = prayerTime.split(':').map(Number);
    
    const prayerDateTime = new Date(today);
    prayerDateTime.setHours(hours, minutes, 0, 0);
    
    // If prayer time has passed today, it refers to today
    // If prayer time hasn't come yet, it refers to today
    return prayerDateTime;
  }
  
  // Determine time category from prayer time string
  static getTimeCategoryFromTime(timeString) {
    if (!timeString) return 'general';
    
    const [hours] = timeString.split(':').map(Number);
    
    if (hours >= 5 && hours < 10) return 'morning';
    if (hours >= 10 && hours < 16) return 'midday';
    if (hours >= 16 && hours < 20) return 'evening';
    if (hours >= 20 || hours < 5) return 'night';
    
    return 'general';
  }
  
  // Get rotation statistics (for debugging)
  static async getRotationStats() {
    const state = await this.getRotationState();
    const totalVerses = getAllVerses().length;
    
    return {
      totalVerses,
      availableVerses: state.availableVerses.length,
      usedVerses: state.usedVerses.length,
      lastResetDate: state.lastResetDate,
      percentageUsed: Math.round((state.usedVerses.length / totalVerses) * 100)
    };
  }
  
  // Force reset verse rotation (for testing)
  static async resetRotation() {
    const allVerses = getAllVerses();
    const state = {
      availableVerses: [...allVerses],
      usedVerses: [],
      lastResetDate: new Date().toDateString()
    };
    
    await this.saveRotationState(state);
    return state;
  }
  
  // Mark prayer as completed (verses stay the same until 24hrs pass)
  static async markPrayerCompleted(prayerId) {
    try {
      const prayerVerseKey = `prayer_verses_${prayerId}`;
      const existingData = await AsyncStorage.getItem(prayerVerseKey);
      
      if (existingData) {
        const prayerData = JSON.parse(existingData);
        prayerData.completedAt = new Date().toISOString();
        await AsyncStorage.setItem(prayerVerseKey, JSON.stringify(prayerData));
        console.log(`📖 Prayer ${prayerId}: Marked as completed`);
      }
    } catch (error) {
      console.error('Error marking prayer as completed:', error);
    }
  }
  
  // Force new verses for a prayer (for testing or manual refresh)
  static async forceNewVersesForPrayer(prayerId) {
    try {
      const prayerVerseKey = `prayer_verses_${prayerId}`;
      await AsyncStorage.removeItem(prayerVerseKey);
      console.log(`📖 Prayer ${prayerId}: Forced new verses - old verses cleared`);
    } catch (error) {
      console.error('Error forcing new verses:', error);
    }
  }
}

export default VerseManager;
