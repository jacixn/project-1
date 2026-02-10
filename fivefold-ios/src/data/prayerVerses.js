// Prayer-specific verses for different prayer times - Now loaded from remote source
// Each prayer type has its own collection of verses that rotate

import userStorage from '../utils/userStorage';

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
    { text: "Verse is loading...", reference: "Loading..." },
    { text: "Verse is loading...", reference: "Loading..." }
  ],
  'post_dawn': [
    { text: "Verse is loading...", reference: "Loading..." },
    { text: "Verse is loading...", reference: "Loading..." }
  ],
  'midday': [
    { text: "Verse is loading...", reference: "Loading..." },
    { text: "Verse is loading...", reference: "Loading..." }
  ],
  'pre_sunset': [
    { text: "Verse is loading...", reference: "Loading..." },
    { text: "Verse is loading...", reference: "Loading..." }
  ],
  'post_sunset': [
    { text: "Verse is loading...", reference: "Loading..." },
    { text: "Verse is loading...", reference: "Loading..." }
  ],
  'night': [
    { text: "Verse is loading...", reference: "Loading..." },
    { text: "Verse is loading...", reference: "Loading..." }
  ]
};

// Global state for prayer verses
let prayerVersesData = null;
let isLoading = false;
let loadPromise = null;

// Check if cache is valid
const isCacheValid = async () => {
  try {
    const timestamp = await userStorage.getRaw(PRAYER_VERSES_CONFIG.CACHE_TIMESTAMP_KEY);
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
  await userStorage.setRaw(PRAYER_VERSES_CONFIG.CACHE_KEY, JSON.stringify(data));
  await userStorage.setRaw(PRAYER_VERSES_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
  
  console.log('✅ Prayer verses fetched and cached successfully');
  return data;
};

// Load prayer verses (with caching)
const loadPrayerVerses = async () => {
  try {
    // Check cache first
    if (await isCacheValid()) {
      const cachedData = await userStorage.getRaw(PRAYER_VERSES_CONFIG.CACHE_KEY);
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