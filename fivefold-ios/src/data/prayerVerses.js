// Prayer-specific verses for different prayer times - Now loaded from remote source
// Each prayer type has its own collection of verses that rotate

import AsyncStorage from '@react-native-async-storage/async-storage';

// Remote Prayer Verses Configuration
const PRAYER_VERSES_CONFIG = {
  GITHUB_USERNAME: 'jacixn',
  REPO_NAME: 'project-1',
  BRANCH: 'main',
  FILE_PATH: 'fivefold-ios/prayer-verses.json',
  CACHE_KEY: 'prayer_verses_cache',
  CACHE_TIMESTAMP_KEY: 'prayer_verses_cache_timestamp',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

// Fallback prayer verses (in case remote fails)
const fallbackPrayerVerses = {
  'pre_dawn': [
    { text: "Very early in the morning, while it was still dark, Jesus got up, left the house and went off to a solitary place, where he prayed.", reference: "Mark 1:35" },
    { text: "In the morning, Lord, you hear my voice; in the morning I lay my requests before you and wait expectantly.", reference: "Psalm 5:3" }
  ],
  'post_dawn': [
    { text: "This is the day the Lord has made; we will rejoice and be glad in it.", reference: "Psalm 118:24" },
    { text: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.", reference: "Lamentations 3:22-23" }
  ],
  'midday': [
    { text: "At noon I will pray and cry aloud, and He shall hear my voice.", reference: "Psalm 55:17" },
    { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" }
  ],
  'pre_sunset': [
    { text: "From the rising of the sun to the place where it sets, the name of the Lord is to be praised.", reference: "Psalm 113:3" },
    { text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.", reference: "Psalm 46:10" }
  ],
  'post_sunset': [
    { text: "When I lie down, I go to sleep in peace; you alone, O Lord, let me sleep in safety.", reference: "Psalm 4:8" },
    { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace.", reference: "Numbers 6:24-26" }
  ],
  'night': [
    { text: "I will praise the Lord, who counsels me; even at night my heart instructs me.", reference: "Psalm 16:7" },
    { text: "On my bed I remember you; I think of you through the watches of the night.", reference: "Psalm 63:6" }
  ]
};

// Global state for prayer verses
let prayerVersesData = null;
let isLoading = false;
let loadPromise = null;

// Check if cache is valid
const isCacheValid = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(PRAYER_VERSES_CONFIG.CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge < PRAYER_VERSES_CONFIG.CACHE_DURATION;
  } catch (error) {
    console.error('Error checking prayer verses cache validity:', error);
    return false;
  }
};

// Fetch prayer verses from remote
const fetchPrayerVersesFromRemote = async () => {
  const url = `https://raw.githubusercontent.com/${PRAYER_VERSES_CONFIG.GITHUB_USERNAME}/${PRAYER_VERSES_CONFIG.REPO_NAME}/${PRAYER_VERSES_CONFIG.BRANCH}/${PRAYER_VERSES_CONFIG.FILE_PATH}`;
  
  console.log('📿 Fetching prayer verses from:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch prayer verses: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Cache the data
  await AsyncStorage.setItem(PRAYER_VERSES_CONFIG.CACHE_KEY, JSON.stringify(data));
  await AsyncStorage.setItem(PRAYER_VERSES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
  
  console.log('✅ Prayer verses fetched and cached successfully');
  return data;
};

// Load prayer verses (with caching)
const loadPrayerVerses = async () => {
  try {
    // Check cache first
    if (await isCacheValid()) {
      const cachedData = await AsyncStorage.getItem(PRAYER_VERSES_CONFIG.CACHE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        prayerVersesData = data.prayerVerses;
        console.log('✅ Loaded prayer verses from cache');
        return prayerVersesData;
      }
    }

    // Fetch from remote
    const data = await fetchPrayerVersesFromRemote();
    prayerVersesData = data.prayerVerses;
    return prayerVersesData;
  } catch (error) {
    console.error('❌ Error loading prayer verses:', error);
    console.log('📿 Using fallback prayer verses');
    prayerVersesData = fallbackPrayerVerses;
    return prayerVersesData;
  }
};

// Get prayer verses (loads if not already loaded)
const getPrayerVersesData = async () => {
  if (prayerVersesData) {
    return prayerVersesData;
  }

  if (isLoading) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = loadPrayerVerses();
  
  try {
    const result = await loadPromise;
    return result;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
};

// Export the prayer verses object (for backward compatibility)
export const prayerVerses = new Proxy({}, {
  get: function(target, prop) {
    if (prayerVersesData && prayerVersesData[prop]) {
      return prayerVersesData[prop];
    }
    // Return fallback if data not loaded yet
    return fallbackPrayerVerses[prop] || [];
  }
});

export const getPrayerVerses = async (prayerSlot) => {
  await getPrayerVersesData();
  return prayerVerses[prayerSlot] || [];
};

export const getRotatingVerse = async (prayerSlot, index = null) => {
  await getPrayerVersesData();
  const verses = prayerVerses[prayerSlot];
  if (!verses || verses.length === 0) {
    return {
      text: "Be still, and know that I am God.",
      reference: "Psalm 46:10"
    };
  }

  // Use provided index or rotate based on day of year for consistency
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const verseIndex = index !== null ? index % verses.length : dayOfYear % verses.length;
  
  return verses[verseIndex];
};

// Get two different verses for a prayer session
export const getTwoVerses = async (prayerSlot) => {
  await getPrayerVersesData();
  const verses = prayerVerses[prayerSlot];
  if (!verses || verses.length < 2) return [];

  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);

  const firstIndex = dayOfYear % verses.length;
  const secondIndex = (dayOfYear + 1) % verses.length;

  return [verses[firstIndex], verses[secondIndex]];
};

// Initialize prayer verses data (call this early in app lifecycle)
export const initializePrayerVerses = async () => {
  return await getPrayerVersesData();
};