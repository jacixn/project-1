import userStorage from '../utils/userStorage';
import {
  SEARCH_UA,
  SEARCH_COOKIE,
  exerciseQuery,
  searchUrl,
  parseSearchResults,
  rankExerciseVideos,
} from '../utils/youtubeSearch';

// Finds the videos that show how an exercise is done, so they can play inside
// Biblely instead of throwing the user out to the YouTube app.
//
// One network call per exercise, then cached for a month: the answer to "how
// do I do a Bulgarian split squat" does not change week to week, and the
// lookup should cost nothing the second time someone opens the same exercise.

const CACHE_PREFIX = '@exercise_videos_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_VERSION = 1;
const REQUEST_TIMEOUT_MS = 12000;
const WANTED = 8;

// Two opens of the same exercise in quick succession, or the card and the
// sheet asking at once, should be one request.
const inflight = new Map();

const cacheKey = (name) => `${CACHE_PREFIX}${CACHE_VERSION}_${String(name || '').trim().toLowerCase()}`;

const readCache = async (name) => {
  try {
    const raw = await userStorage.getRaw(cacheKey(name));
    if (!raw) return null;
    const { videos, ts } = JSON.parse(raw);
    if (!Array.isArray(videos) || !videos.length) return null;
    // Stale entries are still returned to the caller as a fallback when the
    // network is unreachable, so the age travels with them.
    return { videos, stale: Date.now() - ts > CACHE_TTL_MS };
  } catch {
    return null;
  }
};

const writeCache = async (name, videos) => {
  try {
    await userStorage.setRaw(cacheKey(name), JSON.stringify({ videos, ts: Date.now() }));
  } catch {}
};

const fetchSearch = async (query) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const res = await fetch(searchUrl(query), {
      method: 'GET',
      headers: {
        // A phone user agent is redirected to a mobile page that carries no
        // results data, and without the consent cookie the request lands on
        // the consent wall instead.
        'User-Agent': SEARCH_UA,
        'Accept-Language': 'en-GB,en;q=0.9',
        Cookie: SEARCH_COOKIE,
      },
      signal: controller?.signal,
    });
    if (!res.ok) throw new Error(`YouTube search ${res.status}`);
    return await res.text();
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Videos showing how `name` is performed, best first.
 * Returns [] when nothing could be found; the caller then offers YouTube.
 */
export const getExerciseVideos = async (name, { force = false } = {}) => {
  const clean = String(name || '').trim();
  if (!clean) return [];

  if (!force) {
    const cached = await readCache(clean);
    if (cached && !cached.stale) return cached.videos;
  }

  if (inflight.has(clean)) return inflight.get(clean);

  const run = (async () => {
    try {
      const html = await fetchSearch(exerciseQuery(clean));
      const videos = rankExerciseVideos(parseSearchResults(html, WANTED));
      if (videos.length) {
        await writeCache(clean, videos);
        return videos;
      }
      throw new Error('no results parsed');
    } catch (e) {
      if (__DEV__) console.warn('[ExerciseVideo] lookup failed for', clean, e?.message);
      // A month old answer beats no answer when the lookup fails.
      const cached = await readCache(clean);
      return cached?.videos || [];
    } finally {
      inflight.delete(clean);
    }
  })();

  inflight.set(clean, run);
  return run;
};

// Used by the sheet's "Open on YouTube", and by the fallback when no video
// could be resolved at all.
export const exerciseSearchUrl = (name) => searchUrl(exerciseQuery(name));

export default { getExerciseVideos, exerciseSearchUrl };
