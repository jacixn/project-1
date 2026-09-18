// Weather alert planning, pure and dependency-free so it can be unit tested in
// plain node (scripts/test-weather-alerts.js). The service layer feeds it the
// Open-Meteo week from services/weather.js and the user's notificationSettings.
//
// WMO weather codes: 0 clear; 1-3 clouds; 45,48 fog; 51-57 drizzle; 61-67 rain
// (66,67 freezing rain); 71-77 snow; 80-82 rain showers; 85,86 snow showers;
// 95-99 thunderstorm.

export const CONDITIONS = [
  { id: 'rain', label: 'Rain' },
  { id: 'drizzle', label: 'Drizzle' },
  { id: 'showers', label: 'Showers' },
  { id: 'thunderstorm', label: 'Thunderstorms' },
  { id: 'snow', label: 'Snow' },
  { id: 'fog', label: 'Fog' },
  { id: 'hot', label: 'Hot days' },
  { id: 'cold', label: 'Cold days' },
];

export const DEFAULT_WEATHER_PREFS = {
  enabled: false,
  time: '06:00',
  conditions: ['rain', 'drizzle', 'showers', 'thunderstorm', 'snow'],
  hotAbove: 28,
  coldBelow: 3,
  everyDay: false,
};

const CONDITION_IDS = CONDITIONS.map((c) => c.id);
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// null, undefined, '' and booleans are "missing", not 0 (Number(null) is 0,
// which would turn an unknown temperature into a freezing day).
const finiteOr = (v, fallback) => {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return fallback;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const pad2 = (n) => (n < 10 ? `0${n}` : String(n));

// 'YYYY-MM-DD' in LOCAL time (Open-Meteo returns local dates for the place
// via timezone=auto, and the alert fires on the phone's own clock).
export const dateKeyOf = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// Merge the flat notificationSettings keys into one prefs object, tolerating
// missing or garbage values (this is read from storage on every app open).
export const normalizePrefs = (settings) => {
  const s = settings && typeof settings === 'object' ? settings : {};
  const time = typeof s.weatherAlertTime === 'string' && TIME_RE.test(s.weatherAlertTime)
    ? s.weatherAlertTime
    : DEFAULT_WEATHER_PREFS.time;
  let conditions;
  if (Array.isArray(s.weatherConditions)) {
    const seen = new Set();
    conditions = s.weatherConditions.filter((id) => {
      if (typeof id !== 'string' || !CONDITION_IDS.includes(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } else {
    conditions = [...DEFAULT_WEATHER_PREFS.conditions];
  }
  return {
    enabled: s.weatherAlerts === true,
    time,
    conditions,
    hotAbove: finiteOr(s.weatherHotAbove, DEFAULT_WEATHER_PREFS.hotAbove),
    coldBelow: finiteOr(s.weatherColdBelow, DEFAULT_WEATHER_PREFS.coldBelow),
    everyDay: s.weatherEveryDay === true,
  };
};

// Which of the user's picked conditions a forecast day matches, in CONDITIONS
// order so titles read the same way every time.
export const hitsForDay = (day, prefs) => {
  if (!day || !prefs) return [];
  const picked = new Set(Array.isArray(prefs.conditions) ? prefs.conditions : []);
  if (picked.size === 0) return [];
  const code = Number(day.code);
  const hasCode = Number.isFinite(code);
  const rainPct = finiteOr(day.rainPct, 0);
  const hi = finiteOr(day.hi, NaN);
  const lo = finiteOr(day.lo, NaN);
  const hotAbove = finiteOr(prefs.hotAbove, DEFAULT_WEATHER_PREFS.hotAbove);
  const coldBelow = finiteOr(prefs.coldBelow, DEFAULT_WEATHER_PREFS.coldBelow);
  const match = {
    rain: (hasCode && code >= 61 && code <= 67) || rainPct >= 60,
    drizzle: hasCode && code >= 51 && code <= 57,
    showers: hasCode && code >= 80 && code <= 82,
    thunderstorm: hasCode && code >= 95 && code <= 99,
    snow: hasCode && ((code >= 71 && code <= 77) || code === 85 || code === 86),
    fog: hasCode && (code === 45 || code === 48),
    hot: Number.isFinite(hi) && hi >= hotAbove,
    cold: Number.isFinite(lo) && lo <= coldBelow,
  };
  return CONDITION_IDS.filter((id) => picked.has(id) && match[id]);
};

const PHRASE = {
  rain: 'rain',
  drizzle: 'drizzle',
  showers: 'showers',
  thunderstorm: 'thunderstorms',
  snow: 'snow',
  fog: 'fog',
  hot: 'a hot day',
  cold: 'a cold day',
};

const joinPhrases = (parts) => {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const whenWord = (dateKey, isToday) => {
  if (isToday !== false) return 'today';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!m) return 'today';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return `on ${WEEKDAYS[d.getDay()]}`;
};

const deg = (n) => `${Math.round(n)}°`;

// The notification text for one day. Plain words, commas and periods only.
// A missing temperature (Open-Meteo null, kept non-finite by weather.js) is
// left out rather than rendered as 0°.
export const composeAlert = ({ dateKey, day, hits, prefs, placeName, isToday = true } = {}) => {
  const d = day || {};
  const list = Array.isArray(hits) ? hits.filter((id) => PHRASE[id]) : [];
  const when = whenWord(dateKey, isToday);
  const lo = finiteOr(d.lo, NaN);
  const hi = finiteOr(d.hi, NaN);
  const temps = Number.isFinite(lo) && Number.isFinite(hi) ? ` ${deg(lo)} to ${deg(hi)}.` : '';
  const label = d.label || 'Cloudy';
  const rainPct = finiteOr(d.rainPct, 0);

  if (list.length === 0) {
    const title = when === 'today' ? "Today's weather" : `Weather ${when}`;
    const body = rainPct >= 50 ? `Rain likely.${temps}` : `${label}, staying dry.${temps}`;
    return { title, body };
  }

  let title;
  if (list.length === 1 && list[0] === 'hot' && Number.isFinite(hi)) title = `Hot day ${when}: ${deg(hi)}`;
  else if (list.length === 1 && list[0] === 'cold' && Number.isFinite(lo)) title = `Cold day ${when}: ${deg(lo)}`;
  else title = `${capitalize(joinPhrases(list.map((id) => PHRASE[id])))} ${when}`;

  let body;
  if (d.rainWindow) {
    body = `Likely ${d.rainWindow}${placeName ? ` in ${placeName}` : ''}.${temps}`;
  } else {
    body = `${label}.${temps}`;
  }
  return { title, body };
};

// One-shot alerts for the coming days, morning of each day at prefs.time.
// Dates without a forecast entry and times already past (or within a minute)
// are skipped; the caller re-plans on every app open so tomorrow's alert is
// always armed from the freshest forecast.
export const planWeatherAlerts = ({ byDay, prefs, now, placeName, days = 7 } = {}) => {
  if (!prefs || !prefs.enabled) return [];
  const conditions = Array.isArray(prefs.conditions) ? prefs.conditions : [];
  if (conditions.length === 0 && !prefs.everyDay) return [];
  const map = byDay && typeof byDay === 'object' ? byDay : {};
  const nowMs = now instanceof Date ? now.getTime() : finiteOr(now, Date.now());
  const base = new Date(nowMs);
  const tm = TIME_RE.exec(prefs.time || '') || TIME_RE.exec(DEFAULT_WEATHER_PREFS.time);
  const hh = Number(tm[1]);
  const mm = Number(tm[2]);
  const count = Math.max(0, Math.min(7, finiteOr(days, 7)));

  const out = [];
  for (let i = 0; i < count; i++) {
    const fire = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i, hh, mm, 0, 0);
    const dateKey = dateKeyOf(fire);
    const day = map[dateKey];
    if (!day) continue;
    const fireAt = fire.getTime();
    if (fireAt < nowMs + 60 * 1000) continue;
    const hits = hitsForDay(day, prefs);
    if (hits.length === 0 && !prefs.everyDay) continue;
    const { title, body } = composeAlert({ dateKey, day, hits, prefs, placeName, isToday: true });
    out.push({ dateKey, fireAt, title, body, hits });
  }
  out.sort((a, b) => a.fireAt - b.fireAt);
  return out;
};
