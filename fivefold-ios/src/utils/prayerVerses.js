// Pure rules for "Today's Verses" on prayers. A persistent prayer carries
// `verses` plus the day they were picked (`versesDate`, local YYYY-MM-DD) and
// a timestamp (`versesAt`). Verses are stale when they were not picked today
// or are still placeholders, and a cloud copy must never undo a newer local
// pick. Unit-tested in src/__tests__/prayerVerses.selftest.js.

const pad2 = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const isPlaceholderVerse = (v) =>
  !v || !v.reference || /loading/i.test(String(v.reference)) || /loading/i.test(String(v.text || ''));

export const versesStale = (prayer, today = dayKey()) => {
  if (!prayer || prayer.type === 'one-time') return false;
  if (!Array.isArray(prayer.verses) || prayer.verses.length < 2) return true;
  if (prayer.verses.some(isPlaceholderVerse)) return true;
  return prayer.versesDate !== today;
};

export const applyVerses = (prayer, verses, now = new Date()) => ({
  ...prayer,
  verses,
  versesDate: dayKey(now),
  versesAt: now.toISOString(),
});

// Cloud wins for everything except verses picked more recently on this device.
export const mergePrayerFromCloud = (cloud, local) => {
  if (!cloud) return local || null;
  if (!local || !Array.isArray(local.verses) || local.verses.length === 0) return cloud;
  const localAt = Date.parse(local.versesAt || '') || 0;
  const cloudAt = Date.parse(cloud.versesAt || '') || 0;
  if (localAt > cloudAt) return { ...cloud, verses: local.verses, versesDate: local.versesDate, versesAt: local.versesAt };
  return cloud;
};
