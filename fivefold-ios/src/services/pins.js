// Pins for things Biblely does not own (events from other calendars,
// EyeCandy slots): a local list of keys. A pinned thing is invisible to
// plans (never moved, never in the way). "Social Media time" is pinned by
// default until the user unpins it.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'myweek_calendar_pins_v1';
const DEFAULT_PIN = /social media/i;

// One key per thing: repeating events by title (every occurrence), one-offs by event id.
export const pinKeyFor = (item) => {
  const raw = item?.raw || {};
  if (!raw.calendar) return null;
  return raw.recurring ? `title:${String(item.title || '').trim().toLowerCase()}` : `event:${raw.eventId}`;
};

let cache = null;
const load = async () => {
  if (cache) return cache;
  try { cache = JSON.parse((await AsyncStorage.getItem(KEY)) || '{}') || {}; } catch { cache = {}; }
  return cache;
};

// true / false, with the default for untouched keys.
export const isCalendarPinned = async (item) => {
  const key = pinKeyFor(item);
  if (!key) return false;
  const map = await load();
  if (map[key] != null) return !!map[key];
  return DEFAULT_PIN.test(String(item.title || ''));
};

export const setCalendarPinned = async (item, pinned) => {
  const key = pinKeyFor(item);
  if (!key) return false;
  const map = await load();
  map[key] = !!pinned;
  cache = map;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch {}
  return true;
};

// For loaders: resolve pins for a whole list in one go.
export const applyCalendarPins = async (items) => {
  const map = await load();
  for (const it of items) {
    const key = pinKeyFor(it);
    if (!key) continue;
    const pinned = map[key] != null ? !!map[key] : DEFAULT_PIN.test(String(it.title || ''));
    if (pinned) it.raw = { ...(it.raw || {}), pinned: true };
  }
  return items;
};
