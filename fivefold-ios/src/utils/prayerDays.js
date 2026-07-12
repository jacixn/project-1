/**
 * Weekday helpers for recurring prayers.
 *
 * A recurring ('persistent') prayer may carry `days`: an array of weekday
 * indices (0=Sun..6=Sat) it repeats on. Missing/empty/full = every day
 * (legacy prayers predate the field). One-time prayers ignore `days`.
 */

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Returns the prayer's effective day list, or null when it runs every day
export const activeDays = (prayer) => {
  if (!prayer || prayer.type === 'one-time') return null;
  const days = Array.isArray(prayer.days) ? prayer.days.filter((d) => d >= 0 && d <= 6) : [];
  if (days.length === 0 || days.length === 7) return null;
  return [...new Set(days)].sort((a, b) => a - b);
};

// Cleans a wizard-picked day array for storage; anything degenerate -> all days
export const normalizeDays = (days) => {
  if (!Array.isArray(days)) return ALL_DAYS;
  const clean = [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  return clean.length === 0 ? ALL_DAYS : clean;
};

// Does this prayer run on the given date's weekday?
export const isPrayerDayEnabled = (prayer, date = new Date()) => {
  const days = activeDays(prayer);
  if (!days) return true;
  return days.includes(date.getDay());
};

// Whole days until the next enabled weekday (0 = today is enabled)
export const daysUntilNextPrayerDay = (prayer, from = new Date()) => {
  const days = activeDays(prayer);
  if (!days) return 0;
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(from);
    d.setDate(d.getDate() + offset);
    if (days.includes(d.getDay())) return offset;
  }
  return 0;
};

// 'Daily' | 'Weekdays' | 'Weekends' | 'Wed · Thu'
export const formatPrayerDays = (prayer) => {
  const days = activeDays(prayer);
  if (!days) return 'Daily';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days.map((d) => DAY_SHORT[d]).join(' · ');
};
