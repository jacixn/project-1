/**
 * Premium Background Image Cache
 *
 * Downloads premium background images from GitHub on demand and caches
 * them locally so subsequent uses are instant and offline-capable.
 */

import {
  cacheDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  downloadAsync,
  deleteAsync,
} from 'expo-file-system/legacy';

const CACHE_DIR = `${cacheDirectory}premium-backgrounds/`;
const BASE_URL = 'https://raw.githubusercontent.com/jacixn/project-1/main/fivefold-ios/assets/premium-backgrounds/';

// In-memory map of filename → local URI (avoids repeated filesystem checks)
const memoryCache = {};
let cacheDirReady = false;

/**
 * Ensure the cache directory exists (only runs once).
 */
const ensureCacheDir = async () => {
  if (cacheDirReady) return;
  try {
    const info = await getInfoAsync(CACHE_DIR);
    if (!info.exists) {
      await makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
    cacheDirReady = true;
  } catch (e) {
    // If checking fails, try creating anyway
    try {
      await makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      cacheDirReady = true;
    } catch (_) {
      // ignore
    }
  }
};

/**
 * Get the local cached URI for a premium background image.
 * Downloads it from GitHub if not already cached.
 *
 * @param {string} filename - e.g. 'bg_8774.jpg'
 * @returns {Promise<string|null>} Local file URI, or null on failure
 */
export const getCachedImageUri = async (filename) => {
  // 1. Check memory cache first (fastest)
  if (memoryCache[filename]) return memoryCache[filename];

  try {
    await ensureCacheDir();

    const localPath = `${CACHE_DIR}${filename}`;

    // 2. Check if already on disk
    const info = await getInfoAsync(localPath);
    if (info.exists && info.size > 0) {
      memoryCache[filename] = localPath;
      return localPath;
    }

    // 3. Download from GitHub
    const remoteUrl = `${BASE_URL}${filename}`;
    const download = await downloadAsync(remoteUrl, localPath);

    if (download.status === 200) {
      memoryCache[filename] = download.uri;
      return download.uri;
    }

    // Download failed — clean up partial file
    await deleteAsync(localPath, { idempotent: true });
    console.warn(`[PremiumBG] Download failed for ${filename}: HTTP ${download.status}`);
    return null;
  } catch (err) {
    console.warn(`[PremiumBG] Error caching ${filename}:`, err.message);
    return null;
  }
};

/**
 * Preload an array of filenames in the background.
 *
 * @param {string[]} filenames - Array of filenames to preload
 */
export const preloadImages = async (filenames) => {
  await Promise.all(filenames.map((fn) => getCachedImageUri(fn)));
};

/**
 * Clear the entire premium background cache (frees disk space).
 */
export const clearCache = async () => {
  try {
    await deleteAsync(CACHE_DIR, { idempotent: true });
    Object.keys(memoryCache).forEach((k) => delete memoryCache[k]);
    cacheDirReady = false;
  } catch (err) {
    console.warn('[PremiumBG] Error clearing cache:', err.message);
  }
};

export default {
  getCachedImageUri,
  preloadImages,
  clearCache,
};
