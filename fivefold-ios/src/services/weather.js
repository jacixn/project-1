// Weather for My Week, from Open-Meteo (free, no API key). The user types
// their city once (geocoded, stored); the 7-day forecast is cached so the
// screen never waits on the network twice in a row.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLACE_KEY = 'biblely_weather_place'; // { name, lat, lon }
const CACHE_KEY = 'biblely_weather_cache'; // { at, lat, lon, data }
const CACHE_MS = 45 * 60 * 1000;

export const getPlace = async () => {
  try { const raw = await AsyncStorage.getItem(PLACE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

// Geocode a typed city and remember the best match. Returns the place, or
// null when nothing was found.
export const setPlaceByName = async (query) => {
  const q = String(query || '').trim();
  if (!q) return null;
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
  const json = await res.json();
  const hit = json && Array.isArray(json.results) && json.results[0];
  if (!hit) return null;
  const place = { name: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(', '), lat: hit.latitude, lon: hit.longitude };
  await AsyncStorage.setItem(PLACE_KEY, JSON.stringify(place));
  await AsyncStorage.removeItem(CACHE_KEY);
  return place;
};

const fetchForecast = async (lat, lon) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&hourly=precipitation_probability&timezone=auto&forecast_days=7';
  const res = await fetch(url);
  return res.json();
};

// WMO weather code -> MaterialIcons name + plain words.
export const wxLook = (code) => {
  const c = Number(code);
  if (c === 0) return { icon: 'wb-sunny', label: 'Clear' };
  if (c === 1 || c === 2) return { icon: 'wb-cloudy', label: 'Partly cloudy' };
  if (c === 3) return { icon: 'cloud', label: 'Overcast' };
  if (c === 45 || c === 48) return { icon: 'blur-on', label: 'Fog' };
  if (c >= 51 && c <= 57) return { icon: 'grain', label: 'Drizzle' };
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return { icon: 'umbrella', label: 'Rain' };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { icon: 'ac-unit', label: 'Snow' };
  if (c >= 95) return { icon: 'bolt', label: 'Thunderstorm' };
  return { icon: 'wb-cloudy', label: 'Cloudy' };
};

const fmtHour = (h) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12} ${ap}`;
};

// One plain-words sentence for a day's forecast: rain first, then the
// temperatures, lowest to highest.
export const lineForDay = (day) => {
  if (!day) return null;
  const temps = `${day.lo}° to ${day.hi}°`;
  if (day.rainWindow && day.rainPct >= 80) return `${day.label} ${day.rainWindow}, bring a jacket. ${temps}.`;
  if (day.rainWindow) return `${day.label} likely ${day.rainWindow}. ${temps}.`;
  if (day.rainPct >= 50) return `Rain likely today. ${temps}.`;
  if (day.label === 'Clear') return `Clear all day. ${temps}.`;
  return `${day.label}, staying dry. ${temps}.`;
};

// The widget's short form: "Drizzle 1 PM-11 PM · 16°-21°".
export const shortLineForDay = (day) => {
  if (!day) return null;
  const temps = `${day.lo}°-${day.hi}°`;
  if (day.rainWindow) return `${day.label} ${day.rainWindow.replace(' to ', '-')} · ${temps}`;
  if (day.rainPct >= 50) return `${day.label} likely · ${temps}`;
  return `${day.label} · ${temps}`;
};

// { 'YYYY-MM-DD': { code, hi, lo, rainPct, icon, label, rainWindow } } for the
// stored place, or null when no place is set yet. Network errors fall back
// to the last cached forecast, however old.
export const getWeek = async () => {
  const place = await getPlace();
  if (!place) return null;
  let cached = null;
  try { const raw = await AsyncStorage.getItem(CACHE_KEY); cached = raw ? JSON.parse(raw) : null; } catch {}
  let data = cached && cached.lat === place.lat && cached.lon === place.lon && Date.now() - cached.at < CACHE_MS ? cached.data : null;
  if (!data) {
    try {
      data = await fetchForecast(place.lat, place.lon);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), lat: place.lat, lon: place.lon, data }));
    } catch {
      data = cached && cached.lat === place.lat && cached.lon === place.lon ? cached.data : null;
    }
  }
  if (!data || !data.daily || !Array.isArray(data.daily.time)) return { place, byDay: {} };

  // Hourly rain chances grouped by day, for a "Rain 2 to 6 PM" window.
  const rainHours = {};
  const ht = (data.hourly && data.hourly.time) || [];
  const hp = (data.hourly && data.hourly.precipitation_probability) || [];
  for (let i = 0; i < ht.length; i++) {
    const [day, clock] = String(ht[i]).split('T');
    if (Number(hp[i]) >= 45) (rainHours[day] = rainHours[day] || []).push(Number(String(clock).slice(0, 2)));
  }

  const byDay = {};
  for (let i = 0; i < data.daily.time.length; i++) {
    const day = data.daily.time[i];
    const code = data.daily.weather_code[i];
    const hrs = rainHours[day] || [];
    // Open-Meteo returns null for days the model has no temperature for.
    // Math.round(null) is 0, which would read as a freezing day, so keep a
    // missing value non-finite (the alert planner ignores non-finite hi/lo).
    const tmax = data.daily.temperature_2m_max[i];
    const tmin = data.daily.temperature_2m_min[i];
    byDay[day] = {
      code: Number(code),
      hi: Number.isFinite(tmax) ? Math.round(tmax) : NaN,
      lo: Number.isFinite(tmin) ? Math.round(tmin) : NaN,
      rainPct: Math.round(data.daily.precipitation_probability_max[i] || 0),
      ...wxLook(code),
      rainWindow: hrs.length ? `${fmtHour(hrs[0])} to ${fmtHour(Math.min(23, hrs[hrs.length - 1] + 1))}` : null,
    };
  }
  return { place, byDay };
};
