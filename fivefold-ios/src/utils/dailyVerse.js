// Daily Verse Manager - Shows a curated verse each day
// Cycles through 2,306 hand-picked quality verses (no genealogies or lists)

import userStorage from './userStorage';
import githubBibleService from '../services/githubBibleService';
import CURATED_VERSES from '../../daily-verses-references.json';

const DAILY_VERSE_KEY = 'daily_verse_data_v6';
const VERSE_INDEX_KEY = 'daily_verse_index_v6';
const SHUFFLED_VERSES_KEY = 'shuffled_verses_v6';
const LAST_UPDATE_DATE_KEY = 'daily_verse_last_update_v6';

// Parse reference string to get book/chapter/verse info
const parseVerseReference = (reference) => {
  // Examples: "John 3:16", "1 Corinthians 13:4-7", "Psalm 23:1"
  const match = reference.match(/^((?:\d\s)?[\w\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
  
  if (!match) {
    console.error('Failed to parse reference:', reference);
    return null;
  }
  
  const bookName = match[1].trim();
  const chapterNum = parseInt(match[2]);
  const startVerse = parseInt(match[3]);
  const endVerse = match[4] ? parseInt(match[4]) : startVerse;
  
  // Convert book name to book ID for GitHub service
  const bookId = bookName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\d+/g, (num) => num); // Keep numbers
  
  return {
          bookId,
          bookName,
    chapterNum,
    startVerse,
    endVerse,
    reference
  };
};

// Load curated verses from JSON
const loadCuratedVerses = () => {
  console.log('📖 Loading curated verse references...');
  const verses = CURATED_VERSES.verses.map(ref => parseVerseReference(ref)).filter(v => v !== null);
  console.log(`✅ Loaded ${verses.length} curated verse references`);
  return verses;
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
    const stored = await userStorage.getRaw(SHUFFLED_VERSES_KEY);
    if (stored) {
      const shuffled = JSON.parse(stored);
      console.log(`📖 Using existing shuffled list (${shuffled.length} verses)`);
      return shuffled;
    }
    
    // Create new shuffled list from curated verses
    const allVerses = loadCuratedVerses();
    const shuffled = shuffleArray(allVerses);
    await userStorage.setRaw(SHUFFLED_VERSES_KEY, JSON.stringify(shuffled));
    console.log(`🔀 Created new shuffled list of ${shuffled.length} curated verses`);
    return shuffled;
  } catch (error) {
    console.error('Error managing shuffled verses:', error);
    // Fallback to generating on the fly
    return shuffleArray(loadCuratedVerses());
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
    const preferredVersion = await userStorage.getRaw('selectedBibleVersion') || 'niv';
    
    // Check if we already have today's verse
    const cachedVerse = await userStorage.getRaw(DAILY_VERSE_KEY);
    const lastUpdateDate = await userStorage.getRaw(LAST_UPDATE_DATE_KEY);
    
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
            return vNum === verseRef.startVerse;
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
            await userStorage.setRaw(DAILY_VERSE_KEY, JSON.stringify(updatedVerse));
            
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
    let verseIndex = parseInt(await userStorage.getRaw(VERSE_INDEX_KEY) || '0');
    
    // If we've gone through all verses, reshuffle and restart
    if (verseIndex >= shuffledVerses.length) {
      console.log('🔄 Completed full cycle! Reshuffling verses...');
      const allVerses = loadCuratedVerses();
      const newShuffled = shuffleArray(allVerses);
      await userStorage.setRaw(SHUFFLED_VERSES_KEY, JSON.stringify(newShuffled));
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
      return vNum === verseRef.startVerse;
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
    await userStorage.setRaw(DAILY_VERSE_KEY, JSON.stringify(dailyVerse));
    await userStorage.setRaw(LAST_UPDATE_DATE_KEY, todayString);
    
    // Increment index for tomorrow
    await userStorage.setRaw(VERSE_INDEX_KEY, String(verseIndex + 1));
    
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
    await userStorage.remove(DAILY_VERSE_KEY);
    await userStorage.remove(LAST_UPDATE_DATE_KEY);
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
    const cachedVerse = await userStorage.getRaw(DAILY_VERSE_KEY);
    
    if (!cachedVerse) {
      // No cached verse, just get the daily verse normally
      return await getDailyVerse();
    }
    
    const currentVerse = JSON.parse(cachedVerse);
    console.log(`🔄 Re-fetching same verse in new version: ${currentVerse.reference}`);
    
    // Get the new preferred version
    const preferredVersion = await userStorage.getRaw('selectedBibleVersion') || 'niv';
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
      return vNum === verseRef.startVerse;
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
    await userStorage.setRaw(DAILY_VERSE_KEY, JSON.stringify(updatedVerse));
    
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
    await userStorage.remove(SHUFFLED_VERSES_KEY);
    await userStorage.setRaw(VERSE_INDEX_KEY, '0');
    await userStorage.remove(DAILY_VERSE_KEY);
    await userStorage.remove(LAST_UPDATE_DATE_KEY);
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
    const verseIndex = parseInt(await userStorage.getRaw(VERSE_INDEX_KEY) || '0');
    
    return {
      current: verseIndex + 1,
      total: shuffledVerses.length,
      percentage: ((verseIndex + 1) / shuffledVerses.length * 100).toFixed(1)
    };
  } catch (error) {
    console.error('Error getting progress:', error);
    return { current: 0, total: 2306, percentage: '0.0' };
  }
};

export { 
  getDailyVerse, 
  refreshDailyVerse,
  refetchDailyVerseInNewVersion,
  resetVerseCycle,
  getProgress
};
