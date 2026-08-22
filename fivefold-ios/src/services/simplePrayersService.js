/**
 * Single home for simplePrayers persistence + side effects.
 *
 * The prayer wizard screens (AddPrayerModal/EditPrayerModal, native-stack
 * presentation:'modal') persist straight through here and dismiss with
 * navigation.goBack(); SimplePrayerCard refreshes via the PRAYERS_CHANGED
 * DeviceEventEmitter event instead of callback props.
 */
import { DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';
import { pushToCloud } from './userSyncService';
import notificationService from './notificationService';
import completeBibleService from './completeBibleService';
import { normalizeDays, ALL_DAYS } from '../utils/prayerDays';
import { dayKey, versesStale, applyVerses } from '../utils/prayerVerses';

export const PRAYERS_CHANGED = 'simplePrayersChanged';

export const getPrayers = async () => (await getStoredData('simplePrayers')) || [];

// Every write funnels through here so storage, cloud, notifications, and the
// iPhone Calendar mirror never drift apart
export const savePrayersList = async (prayerList) => {
  await saveData('simplePrayers', prayerList);
  pushToCloud('simplePrayers', prayerList);
  await notificationService.scheduleStoredPrayerReminders();
  try { require('./calendarSync').syncPrayers(prayerList); } catch {}
  DeviceEventEmitter.emit(PRAYERS_CHANGED, prayerList);
  return prayerList;
};

// Picks 2 random curated verses and fetches their KJV text (moved verbatim
// from SimplePrayerCard so the Add wizard screen can backfill verses too)
export const getTwoRandomVerses = async () => {
  try {
    const CURATED_VERSES = require('../../daily-verses-references.json');
    const curatedReferences = CURATED_VERSES.verses;

    // Uniform 2-of-N pick with a no-repeat window.
    // The old `sort(() => Math.random() - 0.5)` shuffle is heavily biased on
    // real JS engines (measured up to ~9x overweight for some verses), which
    // made the same handful of verses recycle across prayers. We now sample
    // uniformly AND remember the last 200 shown refs so nothing repeats until
    // at least 200 other verses have been shown (the pool holds ~2300).
    const RECENT_KEY = 'recentPrayerVerseRefs';
    let recentRefs = [];
    try {
      recentRefs = (await getStoredData(RECENT_KEY)) || [];
      if (!Array.isArray(recentRefs)) recentRefs = [];
    } catch (e) { recentRefs = []; }

    const recentSet = new Set(recentRefs);
    let candidates = curatedReferences.filter((r) => !recentSet.has(r));
    if (candidates.length < 2) {
      // Window exhausted the pool (tiny pools only), reset it
      candidates = [...curatedReferences];
      recentRefs = [];
    }

    // Two distinct uniform indices (partial Fisher-Yates)
    const first = Math.floor(Math.random() * candidates.length);
    let second = Math.floor(Math.random() * (candidates.length - 1));
    if (second >= first) second += 1;
    const selectedRefs = [candidates[first], candidates[second]];

    // Persist the updated no-repeat window (fire and forget)
    saveData(RECENT_KEY, [...recentRefs, ...selectedRefs].slice(-200)).catch(() => {});

    const versePromises = selectedRefs.map(async (reference, i) => {
      try {
        const match = reference.match(/^((?:\d\s)?[\w\s]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (!match) {
          return { id: Date.now() + i, reference: 'Loading...', text: 'Verse is loading...' };
        }

        const bookName = match[1].trim();
        const chapterNum = match[2];
        const verseNum = match[3];

        const bookId = bookName.toLowerCase()
          .replace(/\s+/g, '')
          .replace(/\d+/g, (num) => num);
        const chapterId = `${bookId}_${chapterNum}`;

        const chapterVerses = await completeBibleService.getVerses(chapterId, 'kjv');
        if (!chapterVerses || chapterVerses.length === 0) {
          return { id: Date.now() + i, reference, text: 'Verse is loading...' };
        }

        const verseData = chapterVerses.find((v) => {
          const vNum = parseInt(String(v.number || v.verse || v.displayNumber || '').replace(/^Verse\s*/i, ''));
          return vNum === parseInt(verseNum);
        });
        if (!verseData) {
          return { id: Date.now() + i, reference, text: 'Verse is loading...' };
        }

        return { id: Date.now() + i, reference, text: (verseData.text || verseData.content || '').trim() };
      } catch (error) {
        console.error('Error fetching verse', reference, ':', error);
        return { id: Date.now() + i, reference: 'Loading...', text: 'Verse is loading...' };
      }
    });

    return await Promise.all(versePromises);
  } catch (error) {
    console.error('Error in getTwoRandomVerses:', error);
    return [
      { id: 1, reference: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
      { id: 2, reference: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
    ];
  }
};

const fieldsFromPayload = (payload) => ({
  name: payload.name,
  time: payload.time,
  type: payload.type,
  duration: Number(payload.duration) > 0 ? Number(payload.duration) : 5,
  notifyBefore: payload.notifyBefore == null ? 0 : payload.notifyBefore,
  date: payload.type === 'one-time' ? (payload.date || null) : null,
  days: payload.type === 'one-time' ? ALL_DAYS : normalizeDays(payload.days),
});

export const addPrayer = async (payload) => {
  const list = await getPrayers();
  const newPrayer = {
    id: Date.now().toString(),
    ...fieldsFromPayload(payload),
    verses: [
      { id: 1, reference: 'Loading...', text: 'Selecting your verses...' },
      { id: 2, reference: 'Loading...', text: 'Selecting your verses...' },
    ],
    completedAt: null,
    canComplete: false,
  };
  await savePrayersList([...list, newPrayer]);

  // Swap in real verses in the background (placeholders keep the UI instant)
  getTwoRandomVerses().then(async (randomVerses) => {
    const stored = await getPrayers();
    const idx = stored.findIndex((p) => p.id === newPrayer.id);
    if (idx !== -1) {
      stored[idx] = applyVerses(stored[idx], randomVerses);
      await savePrayersList(stored);
    }
  }).catch((error) => {
    console.error('Error fetching verses for new prayer:', error);
  });

  return newPrayer;
};

// "Today's Verses" has to mean today's. Any persistent prayer whose verses
// were not picked today (or are still placeholders) gets two fresh ones.
// Before this, verses only changed when a prayer was marked complete, so
// someone who opens a prayer to read it saw the same two verses every day.
// Runs on the prayer card's mount, at midnight and on foreground; a no-op
// when nothing is stale. Failed fetches (offline) are simply retried next time.
let refreshInFlight = null;
export const refreshDailyVerses = async () => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const list = await getPrayers();
      const today = dayKey();
      const stale = list.filter((p) => versesStale(p, today));
      if (!stale.length) return list;
      let next = list;
      for (const p of stale) {
        try {
          const verses = await getTwoRandomVerses();
          if (!Array.isArray(verses) || verses.length < 2 || verses.some((v) => /loading/i.test(String(v?.reference || '')))) continue;
          next = next.map((q) => (q.id === p.id ? applyVerses(q, verses) : q));
        } catch (e) { /* try again next time */ }
      }
      if (next !== list) {
        await saveData('simplePrayers', next);
        pushToCloud('simplePrayers', next);
        DeviceEventEmitter.emit(PRAYERS_CHANGED, next);
        console.log(`[Prayers] fresh verses for ${stale.length} prayer(s)`);
      }
      return next;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
};

export const updatePrayer = async (id, payload) => {
  const list = await getPrayers();
  const next = list.map((p) => (p.id === id ? { ...p, ...fieldsFromPayload(payload) } : p));
  return savePrayersList(next);
};

export const deletePrayerById = async (id) => {
  const list = await getPrayers();
  return savePrayersList(list.filter((p) => p.id !== id));
};
