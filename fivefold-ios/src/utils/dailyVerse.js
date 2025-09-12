// Daily Verse Manager - Rotates verses every 24 hours - Now loaded from remote source
// Each day gets a different verse based on the date

import AsyncStorage from '@react-native-async-storage/async-storage';

// Remote Daily Verses Configuration
const DAILY_VERSES_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/daily-verses.json',
  CACHE_KEY: 'daily_verses_cache_v2',
  CACHE_TIMESTAMP_KEY: 'daily_verses_cache_timestamp_v2',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Fallback daily verses (in case remote fails)
const fallbackDailyVerses = [
  { text: "For I know the plans I have for you,\" declares the Lord, \"plans to prosper you and not to harm you, to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:5-6" },
  { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", reference: "Romans 8:28" },
  { text: "I can do all this through him who gives me strength.", reference: "Philippians 4:13" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", reference: "Isaiah 40:31" },
  { text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", reference: "Psalm 23:1-3" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: "John 3:16" }
];

// Global state for daily verses
let dailyVersesData = null;
let isLoading = false;
let loadPromise = null;

// Check if cache is valid
const isCacheValid = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(DAILY_VERSES_CONFIG.CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge < DAILY_VERSES_CONFIG.CACHE_DURATION;
  } catch (error) {
    console.error('Error checking daily verses cache validity:', error);
    return false;
  }
};

// Fetch daily verses from remote
const fetchDailyVersesFromRemote = async () => {
  const url = `https://raw.githubusercontent.com/${DAILY_VERSES_CONFIG.GITHUB_USERNAME}/${DAILY_VERSES_CONFIG.REPO_NAME}/${DAILY_VERSES_CONFIG.BRANCH}/${DAILY_VERSES_CONFIG.FILE_PATH}`;
  
  console.log('📅 Fetching daily verses from:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch daily verses: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache the data
  await AsyncStorage.setItem(DAILY_VERSES_CONFIG.CACHE_KEY, JSON.stringify(data));
  await AsyncStorage.setItem(DAILY_VERSES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
  
  console.log('✅ Daily verses fetched and cached successfully');
  return data;
};

// Load daily verses (with caching)
const loadDailyVerses = async () => {
  try {
    // Check cache first
    if (await isCacheValid()) {
      const cachedData = await AsyncStorage.getItem(DAILY_VERSES_CONFIG.CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        dailyVersesData = data.dailyVerses;
        console.log('✅ Loaded daily verses from cache');
        return dailyVersesData;
      }
    }

    // Fetch from remote
    const data = await fetchDailyVersesFromRemote();
    dailyVersesData = data.dailyVerses;
    return dailyVersesData;
  } catch (error) {
    console.error('❌ Error loading daily verses:', error);
    console.log('📅 Using fallback daily verses');
    dailyVersesData = fallbackDailyVerses;
    return dailyVersesData;
  }
};

// Get daily verses data (loads if not already loaded)
const getDailyVersesData = async () => {
  if (dailyVersesData) {
    return dailyVersesData;
  }

  if (isLoading) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = loadDailyVerses();
  
  try {
    const result = await loadPromise;
    return result;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
};

/**
 * Get the verse of the day based on current date
 * Changes every 24 hours from 00:00 to 23:59
 * @returns {Promise<Object>} - { text: string, reference: string }
 */
const getDailyVerse = async () => {
  await getDailyVersesData();
  const verses = dailyVersesData || fallbackDailyVerses;
  
  // Get current date in YYYY-MM-DD format (local timezone)
  const today = new Date();
  const dateString = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
  
  // Create a simple hash from the date string to get consistent daily selection
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get positive index within verse array bounds
  const verseIndex = Math.abs(hash) % verses.length;
  
  return verses[verseIndex];
};

/**
 * Get verse for a specific date (useful for testing)
 * @param {Date} date - The date to get verse for
 * @returns {Promise<Object>} - { text: string, reference: string }
 */
const getVerseForDate = async (date) => {
  await getDailyVersesData();
  const verses = dailyVersesData || fallbackDailyVerses;
  
  const dateString = date.getFullYear() + '-' + 
                    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(date.getDate()).padStart(2, '0');
  
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const verseIndex = Math.abs(hash) % verses.length;
  return verses[verseIndex];
};

/**
 * Preview next few days' verses (for testing/debugging)
 * @param {number} days - Number of days to preview
 * @returns {Promise<Array>} - Array of { date: string, verse: Object }
 */
const previewUpcomingVerses = async (days = 7) => {
  const preview = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const verse = await getVerseForDate(date);
    const dateString = date.toLocaleDateString();
    
    preview.push({
      date: dateString,
      verse: verse
    });
  }
  
  return preview;
};

// Initialize daily verses data (call this early in app lifecycle)
export const initializeDailyVerses = async () => {
  return await getDailyVersesData();
};

// ES6 exports for React Native
export { getDailyVerse, getVerseForDate, previewUpcomingVerses };