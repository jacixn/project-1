// Daily Verse Manager - Shows a random verse each day, cycling through ALL verses in the Bible
// Each verse appears exactly once before the cycle repeats

import AsyncStorage from '@react-native-async-storage/async-storage';
import githubBibleService from '../services/githubBibleService';

const DAILY_VERSE_KEY = 'daily_verse_data_v5';
const VERSE_INDEX_KEY = 'daily_verse_index_v5';
const SHUFFLED_VERSES_KEY = 'shuffled_verses_v5';
const LAST_UPDATE_DATE_KEY = 'daily_verse_last_update_v5';

// All Bible verse references (static list to avoid thousands of API calls)
// Format: { bookId, bookName, chapterNum, verseNum, reference }
let ALL_VERSE_REFERENCES = [];

// Generate all verse references from static Bible structure
const generateAllVerseReferences = () => {
  if (ALL_VERSE_REFERENCES.length > 0) {
    return ALL_VERSE_REFERENCES;
  }
  
  console.log('📖 Generating all verse references...');
  
  // Bible structure: [bookId, bookName, totalChapters, versesPerChapter[]]
  const bibleStructure = [
    // Old Testament
    ['genesis', 'Genesis', 50, [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26]],
    ['exodus', 'Exodus', 40, [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38]],
    ['leviticus', 'Leviticus', 27, [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34]],
    ['numbers', 'Numbers', 36, [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13]],
    ['deuteronomy', 'Deuteronomy', 34, [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12]],
    ['joshua', 'Joshua', 24, [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33]],
    ['judges', 'Judges', 21, [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25]],
    ['ruth', 'Ruth', 4, [22,23,18,22]],
    ['1samuel', '1 Samuel', 31, [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13]],
    ['2samuel', '2 Samuel', 24, [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25]],
    ['1kings', '1 Kings', 22, [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53]],
    ['2kings', '2 Kings', 25, [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30]],
    ['1chronicles', '1 Chronicles', 29, [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30]],
    ['2chronicles', '2 Chronicles', 36, [17,18,17,22,14,42,22,18,31,19,23,16,22,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23]],
    ['ezra', 'Ezra', 10, [11,70,13,24,17,22,28,36,15,44]],
    ['nehemiah', 'Nehemiah', 13, [11,20,32,23,19,19,73,18,38,39,36,47,31]],
    ['esther', 'Esther', 10, [22,23,15,17,14,14,10,17,32,3]],
    ['job', 'Job', 42, [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17]],
    ['psalms', 'Psalms', 150, [6,12,8,8,12,10,17,9,20,18,7,8,6,7,5,11,15,50,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,17,12,8,12,11,10,13,20,7,35,36,5,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6]],
    ['proverbs', 'Proverbs', 31, [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31]],
    ['ecclesiastes', 'Ecclesiastes', 12, [18,26,22,16,20,12,29,17,18,20,10,14]],
    ['song_of_solomon', 'Song of Solomon', 8, [17,17,11,16,16,13,13,14]],
    ['isaiah', 'Isaiah', 66, [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24]],
    ['jeremiah', 'Jeremiah', 52, [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34]],
    ['lamentations', 'Lamentations', 5, [22,22,66,22,22]],
    ['ezekiel', 'Ezekiel', 48, [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35]],
    ['daniel', 'Daniel', 12, [21,49,30,37,31,28,28,27,27,21,45,13]],
    ['hosea', 'Hosea', 14, [11,23,5,19,15,11,16,14,17,15,12,14,16,9]],
    ['joel', 'Joel', 3, [20,32,21]],
    ['amos', 'Amos', 9, [15,16,15,13,27,14,17,14,15]],
    ['obadiah', 'Obadiah', 1, [21]],
    ['jonah', 'Jonah', 4, [17,10,10,11]],
    ['micah', 'Micah', 7, [16,13,12,13,15,16,20]],
    ['nahum', 'Nahum', 3, [15,13,19]],
    ['habakkuk', 'Habakkuk', 3, [17,20,19]],
    ['zephaniah', 'Zephaniah', 3, [18,15,20]],
    ['haggai', 'Haggai', 2, [15,23]],
    ['zechariah', 'Zechariah', 14, [21,13,10,14,11,15,14,23,17,12,17,14,9,21]],
    ['malachi', 'Malachi', 4, [14,17,18,6]],
    // New Testament
    ['matthew', 'Matthew', 28, [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20]],
    ['mark', 'Mark', 16, [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20]],
    ['luke', 'Luke', 24, [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53]],
    ['john', 'John', 21, [51,25,36,54,47,71,53,59,41,42,57,50,38,31,27,33,26,40,42,31,25]],
    ['acts', 'Acts', 28, [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,41,38,40,30,35,27,27,32,44,31]],
    ['romans', 'Romans', 16, [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,27]],
    ['1corinthians', '1 Corinthians', 16, [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24]],
    ['2corinthians', '2 Corinthians', 13, [24,17,18,18,21,18,16,24,15,18,33,21,14]],
    ['galatians', 'Galatians', 6, [24,21,29,31,26,18]],
    ['ephesians', 'Ephesians', 6, [23,22,21,32,33,24]],
    ['philippians', 'Philippians', 4, [30,30,21,23]],
    ['colossians', 'Colossians', 4, [29,23,25,18]],
    ['1thessalonians', '1 Thessalonians', 5, [10,20,13,18,28]],
    ['2thessalonians', '2 Thessalonians', 3, [12,17,18]],
    ['1timothy', '1 Timothy', 6, [20,15,16,16,25,21]],
    ['2timothy', '2 Timothy', 4, [18,26,17,22]],
    ['titus', 'Titus', 3, [16,15,15]],
    ['philemon', 'Philemon', 1, [25]],
    ['hebrews', 'Hebrews', 13, [14,18,19,16,14,20,28,13,28,39,40,29,25]],
    ['james', 'James', 5, [27,26,18,17,20]],
    ['1peter', '1 Peter', 5, [25,25,22,19,14]],
    ['2peter', '2 Peter', 3, [21,22,18]],
    ['1john', '1 John', 5, [10,29,24,21,21]],
    ['2john', '2 John', 1, [13]],
    ['3john', '3 John', 1, [14]],
    ['jude', 'Jude', 1, [25]],
    ['revelation', 'Revelation', 22, [20,29,22,11,14,17,17,13,21,11,19,17,18,20,8,21,18,24,21,15,27,21]]
  ];

  const references = [];
  
  for (const [bookId, bookName, totalChapters, versesPerChapter] of bibleStructure) {
    for (let chapter = 1; chapter <= totalChapters; chapter++) {
      const versesInChapter = versesPerChapter[chapter - 1];
      for (let verse = 1; verse <= versesInChapter; verse++) {
        references.push({
          bookId,
          bookName,
          chapterNum: chapter,
          verseNum: verse,
          reference: `${bookName} ${chapter}:${verse}`
        });
      }
    }
  }

  ALL_VERSE_REFERENCES = references;
  console.log(`✅ Generated ${references.length} verse references`);
  return references;
};

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Get or create shuffled verse list
const getShuffledVerses = async () => {
  try {
    const stored = await AsyncStorage.getItem(SHUFFLED_VERSES_KEY);
    if (stored) {
      const shuffled = JSON.parse(stored);
      console.log(`📖 Using existing shuffled list (${shuffled.length} verses)`);
      return shuffled;
    }
    
    // Create new shuffled list
    const allVerses = generateAllVerseReferences();
    const shuffled = shuffleArray(allVerses);
    await AsyncStorage.setItem(SHUFFLED_VERSES_KEY, JSON.stringify(shuffled));
    console.log(`🔀 Created new shuffled list of ${shuffled.length} verses`);
    return shuffled;
  } catch (error) {
    console.error('Error managing shuffled verses:', error);
    // Fallback to generating on the fly
    return shuffleArray(generateAllVerseReferences());
  }
};

// Get today's date string
const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Get the verse of the day
 * Shows a random verse each day, cycling through ALL verses before repeating
 * @returns {Promise<Object>} - { text: string, reference: string, version: string }
 */
const getDailyVerse = async () => {
  try {
    const todayString = getTodayString();
    
    // Get user's preferred version first
    const preferredVersion = await AsyncStorage.getItem('selectedBibleVersion') || 'niv';
    
    // Check if we already have today's verse
    const cachedVerse = await AsyncStorage.getItem(DAILY_VERSE_KEY);
    const lastUpdateDate = await AsyncStorage.getItem(LAST_UPDATE_DATE_KEY);
    
    if (cachedVerse && lastUpdateDate === todayString) {
      const parsedVerse = JSON.parse(cachedVerse);
      
      // Check if the cached verse is in the correct version
      if (parsedVerse.version && parsedVerse.version.toLowerCase() === preferredVersion.toLowerCase()) {
        console.log(`📖 Using cached daily verse in ${parsedVerse.version}`);
        return parsedVerse;
      } else {
        // Version changed - re-fetch the SAME verse in the new version
        console.log(`🔄 Cached verse is in ${parsedVerse.version}, but user wants ${preferredVersion.toUpperCase()}`);
        console.log(`🔄 Re-fetching same verse (${parsedVerse.reference}) in new version...`);
        
        // Get the shuffled verses to find the reference
        const shuffledVerses = await getShuffledVerses();
        const verseIndex = parsedVerse.index || 0;
        const verseRef = shuffledVerses[verseIndex];
        
        if (verseRef) {
          // Build chapter ID for githubBibleService
          const chapterId = `${verseRef.bookId}_${verseRef.chapterNum}`;
          
          // Fetch the verse text in the NEW version
          const verses = await githubBibleService.getVerses(chapterId, preferredVersion);
          const verseData = verses.find(v => {
            const vNum = parseInt(String(v.number || v.verse || v.displayNumber || '').replace(/^Verse\s*/i, ''));
            return vNum === verseRef.verseNum;
          });
          
          if (verseData) {
            const verseText = (verseData.content || verseData.text || '').replace(/\s+/g, ' ').trim();
            
            // Create updated verse with new version (keep same index and reference)
            const updatedVerse = {
              text: verseText,
              reference: parsedVerse.reference,
              version: preferredVersion.toUpperCase(),
              date: todayString,
              index: parsedVerse.index,
              progress: parsedVerse.progress
            };
            
            // Update the cache with new version
            await AsyncStorage.setItem(DAILY_VERSE_KEY, JSON.stringify(updatedVerse));
            
            console.log(`✅ Verse re-fetched in ${preferredVersion.toUpperCase()}: ${updatedVerse.reference}`);
            return updatedVerse;
          }
        }
        
        // If re-fetch failed, fall through to get new verse
        console.warn('⚠️ Re-fetch failed, getting new verse');
      }
    }
    
    // Get shuffled verses list
    const shuffledVerses = await getShuffledVerses();
    
    // Get current index
    let verseIndex = parseInt(await AsyncStorage.getItem(VERSE_INDEX_KEY) || '0');
    
    // If we've gone through all verses, reshuffle and restart
    if (verseIndex >= shuffledVerses.length) {
      console.log('🔄 Completed full cycle! Reshuffling verses...');
      const allVerses = generateAllVerseReferences();
      const newShuffled = shuffleArray(allVerses);
      await AsyncStorage.setItem(SHUFFLED_VERSES_KEY, JSON.stringify(newShuffled));
      verseIndex = 0;
    }
    
    // Get today's verse reference
    const verseRef = shuffledVerses[verseIndex];
    console.log(`📖 Today's verse (${verseIndex + 1}/${shuffledVerses.length}): ${verseRef.reference}`);
    console.log(`📖 Fetching verse in ${preferredVersion.toUpperCase()}`);
    
    // Build chapter ID for githubBibleService
    const chapterId = `${verseRef.bookId}_${verseRef.chapterNum}`;
    
    // Fetch the verse text in the preferred version
    const verses = await githubBibleService.getVerses(chapterId, preferredVersion);
    const verseData = verses.find(v => {
      const vNum = parseInt(String(v.number || v.verse || v.displayNumber || '').replace(/^Verse\s*/i, ''));
      return vNum === verseRef.verseNum;
    });
    
    if (!verseData) {
      throw new Error(`Verse not found: ${verseRef.reference}`);
    }
    
    const verseText = (verseData.content || verseData.text || '').replace(/\s+/g, ' ').trim();
    
    const dailyVerse = {
      text: verseText,
      reference: verseRef.reference,
      version: preferredVersion.toUpperCase(),
      date: todayString,
      index: verseIndex,
      progress: `${verseIndex + 1}/${shuffledVerses.length}`
    };
    
    // Cache the verse
    await AsyncStorage.setItem(DAILY_VERSE_KEY, JSON.stringify(dailyVerse));
    await AsyncStorage.setItem(LAST_UPDATE_DATE_KEY, todayString);
    
    // Increment index for tomorrow
    await AsyncStorage.setItem(VERSE_INDEX_KEY, String(verseIndex + 1));
    
    console.log(`✅ Daily verse loaded: ${dailyVerse.reference} (${dailyVerse.version})`);
    console.log(`📊 Progress: ${dailyVerse.progress} (${((verseIndex + 1) / shuffledVerses.length * 100).toFixed(1)}%)`);
    
    return dailyVerse;
  } catch (error) {
    console.error('❌ Error getting daily verse:', error);
    
    // Fallback verse
    return {
      text: "Daily verse is loading...",
      reference: "Loading...",
      version: "NIV",
      date: getTodayString()
    };
  }
};

/**
 * Force refresh the daily verse (gets next verse in sequence)
 */
const refreshDailyVerse = async () => {
  try {
    await AsyncStorage.removeItem(DAILY_VERSE_KEY);
    await AsyncStorage.removeItem(LAST_UPDATE_DATE_KEY);
    return await getDailyVerse();
  } catch (error) {
    console.error('Error refreshing daily verse:', error);
    throw error;
  }
};

/**
 * Re-fetch today's verse in a new Bible version
 * (keeps the same verse reference, just updates the version)
 */
const refetchDailyVerseInNewVersion = async () => {
  try {
    // Get the current cached verse to know which reference we're on
    const cachedVerse = await AsyncStorage.getItem(DAILY_VERSE_KEY);
    
    if (!cachedVerse) {
      // No cached verse, just get the daily verse normally
      return await getDailyVerse();
    }
    
    const currentVerse = JSON.parse(cachedVerse);
    console.log(`🔄 Re-fetching same verse in new version: ${currentVerse.reference}`);
    
    // Get the new preferred version
    const preferredVersion = await AsyncStorage.getItem('selectedBibleVersion') || 'niv';
    console.log(`📖 New version: ${preferredVersion.toUpperCase()}`);
    
    // Parse the reference to get book/chapter/verse info
    // The cached verse has the full reference like "Proverbs 19:10"
    const shuffledVerses = await getShuffledVerses();
    const verseIndex = currentVerse.index || 0;
    const verseRef = shuffledVerses[verseIndex];
    
    if (!verseRef) {
      console.warn('⚠️ Could not find verse reference, getting daily verse normally');
      return await getDailyVerse();
    }
    
    // Build chapter ID for githubBibleService
    const chapterId = `${verseRef.bookId}_${verseRef.chapterNum}`;
    
    // Fetch the verse text in the NEW version
    const verses = await githubBibleService.getVerses(chapterId, preferredVersion);
    const verseData = verses.find(v => {
      const vNum = parseInt(String(v.number || v.verse || v.displayNumber || '').replace(/^Verse\s*/i, ''));
      return vNum === verseRef.verseNum;
    });
    
    if (!verseData) {
      console.error('❌ Verse not found in new version');
      return await getDailyVerse();
    }
    
    const verseText = (verseData.content || verseData.text || '').replace(/\s+/g, ' ').trim();
    
    // Create updated verse with new version
    const updatedVerse = {
      text: verseText,
      reference: currentVerse.reference,
      version: preferredVersion.toUpperCase(),
      date: currentVerse.date,
      index: currentVerse.index,
      progress: currentVerse.progress
    };
    
    // Update the cache with new version
    await AsyncStorage.setItem(DAILY_VERSE_KEY, JSON.stringify(updatedVerse));
    
    console.log(`✅ Verse re-fetched in ${preferredVersion.toUpperCase()}`);
    return updatedVerse;
    
  } catch (error) {
    console.error('❌ Error re-fetching daily verse in new version:', error);
    // Fallback to getting the daily verse normally
    return await getDailyVerse();
  }
};

/**
 * Reset the verse cycle (creates a new shuffle)
 */
const resetVerseCycle = async () => {
  try {
    await AsyncStorage.removeItem(SHUFFLED_VERSES_KEY);
    await AsyncStorage.setItem(VERSE_INDEX_KEY, '0');
    await AsyncStorage.removeItem(DAILY_VERSE_KEY);
    await AsyncStorage.removeItem(LAST_UPDATE_DATE_KEY);
    ALL_VERSE_REFERENCES = []; // Clear cache
    console.log('🔄 Verse cycle reset with new shuffle');
  } catch (error) {
    console.error('Error resetting verse cycle:', error);
    throw error;
  }
};

/**
 * Get current progress through the Bible
 */
const getProgress = async () => {
  try {
    const shuffledVerses = await getShuffledVerses();
    const verseIndex = parseInt(await AsyncStorage.getItem(VERSE_INDEX_KEY) || '0');
    
    return {
      current: verseIndex + 1,
      total: shuffledVerses.length,
      percentage: ((verseIndex + 1) / shuffledVerses.length * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error getting progress:', error);
    return { current: 0, total: 31102, percentage: '0.0' };
  }
};

export { 
  getDailyVerse, 
  refreshDailyVerse,
  refetchDailyVerseInNewVersion,
  resetVerseCycle,
  getProgress
};
