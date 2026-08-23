// Pins for things Biblely does not own (events from other calendars,
// EyeCandy slots): a local list of keys. A pinned thing is invisible to
// plans (never moved, never in the way). "Social Media time" is pinned by
// default until the user unpins it.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'myweek_calendar_pins_v1';
const DEFAULT_PIN = /social media/i;

// One key per thing: repeating things by title (every occurrence), one-offs
// by id. Works for every kind, not only calendar events.
const titleKey = (item) => `title:${String(item?.title || '').trim().toLowerCase()}`;
export const pinKeyFor = (item) => {
  const raw = item?.raw || {};
  if (!item) return null;
  if (raw.calendar) return raw.recurring ? titleKey(item) : `event:${raw.eventId}`;
  return raw.type === 'one-time' ? `own:${item.kind}:${raw.id}` : titleKey(item);
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
  return !!(item.raw && item.raw.pinnedHint) || DEFAULT_PIN.test(String(item.title || ''));
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

// For loaders: resolve pins for a whole list in one go. A pin stored on the
// item itself (reminder/task/workout `pinned`) wins; then this list by id or
// title; then the default by title.
export const applyCalendarPins = async (items) => {
  const map = await load();
  for (const it of items) {
    const raw = it.raw || {};
    if (raw.pinned != null) continue;
    const key = pinKeyFor(it);
    const byTitle = map[titleKey(it)];
    const stored = key && map[key] != null ? map[key] : byTitle;
    // Default: what the owner said (Biblely marks prayers and pinned items in
    // the event notes, read into raw.pinnedHint), else the title rule.
    const pinned = stored != null ? !!stored : (!!raw.pinnedHint || DEFAULT_PIN.test(String(it.title || '')));
    if (pinned) it.raw = { ...raw, pinned: true };
  }
  return items;
};
export const applyPins = applyCalendarPins;
