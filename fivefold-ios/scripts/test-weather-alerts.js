// Node test for src/utils/weatherAlerts.js (pure module, babel-transformed in memory).
// Run: node scripts/test-weather-alerts.js
const path = require('path');
const assert = require('assert');
const Module = require('module');

const file = path.join(__dirname, '..', 'src', 'utils', 'weatherAlerts.js');
const { code } = require('@babel/core').transformFileSync(file, {
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});
const m = new Module(file, module);
m.filename = file;
m.paths = Module._nodeModulePaths(path.dirname(file));
m._compile(code, file);
const {
  CONDITIONS, DEFAULT_WEATHER_PREFS, normalizePrefs, hitsForDay, composeAlert, planWeatherAlerts, dateKeyOf,
} = m.exports;

let passed = 0;
const check = (name, fn) => {
  try { fn(); passed++; } catch (e) { console.error('FAIL', name); throw e; }
};

const ALL = CONDITIONS.map((c) => c.id);
const prefsAll = { ...DEFAULT_WEATHER_PREFS, enabled: true, conditions: ALL };
const day = (over) => ({ code: 0, hi: 20, lo: 10, rainPct: 0, label: 'Clear', rainWindow: null, ...over });

// Bad text: em dash (U+2014) or emoji ranges. Written as escapes so this
// file itself stays clean of them.
const BAD = new RegExp('[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}]|\\u{2014}', 'u');
const clean = (s) => { assert.ok(typeof s === 'string' && s.length > 0, `empty: ${s}`); assert.ok(!BAD.test(s), `bad char in: ${s}`); };

// ── hitsForDay: code families ──
check('drizzle 51-57', () => {
  for (const c of [51, 53, 55, 56, 57]) assert.deepStrictEqual(hitsForDay(day({ code: c }), prefsAll), ['drizzle']);
  assert.deepStrictEqual(hitsForDay(day({ code: 50 }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ code: 58 }), prefsAll), []);
});
check('rain 61-67', () => {
  for (const c of [61, 63, 65, 66, 67]) assert.deepStrictEqual(hitsForDay(day({ code: c }), prefsAll), ['rain']);
  assert.deepStrictEqual(hitsForDay(day({ code: 60 }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ code: 68 }), prefsAll), []);
});
check('showers 80-82', () => {
  for (const c of [80, 81, 82]) assert.deepStrictEqual(hitsForDay(day({ code: c }), prefsAll), ['showers']);
  assert.deepStrictEqual(hitsForDay(day({ code: 83 }), prefsAll), []);
});
check('snow 71-77, 85, 86', () => {
  for (const c of [71, 73, 75, 77, 85, 86]) assert.deepStrictEqual(hitsForDay(day({ code: c }), prefsAll), ['snow']);
  assert.deepStrictEqual(hitsForDay(day({ code: 78 }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ code: 84 }), prefsAll), []);
});
check('thunderstorm 95-99', () => {
  for (const c of [95, 96, 99]) assert.deepStrictEqual(hitsForDay(day({ code: c }), prefsAll), ['thunderstorm']);
  assert.deepStrictEqual(hitsForDay(day({ code: 94 }), prefsAll), []);
});
check('fog 45, 48', () => {
  assert.deepStrictEqual(hitsForDay(day({ code: 45 }), prefsAll), ['fog']);
  assert.deepStrictEqual(hitsForDay(day({ code: 48 }), prefsAll), ['fog']);
  assert.deepStrictEqual(hitsForDay(day({ code: 46 }), prefsAll), []);
});
check('clear / clouds hit nothing', () => {
  for (const c of [0, 1, 2, 3]) assert.deepStrictEqual(hitsForDay(day({ code: c }), prefsAll), []);
});

// ── thresholds at the boundary ──
check('hot boundary', () => {
  assert.deepStrictEqual(hitsForDay(day({ hi: 28 }), prefsAll), ['hot']);
  assert.deepStrictEqual(hitsForDay(day({ hi: 27 }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ hi: 31 }), { ...prefsAll, hotAbove: 31 }), ['hot']);
  assert.deepStrictEqual(hitsForDay(day({ hi: 30 }), { ...prefsAll, hotAbove: 31 }), []);
});
check('cold boundary', () => {
  assert.deepStrictEqual(hitsForDay(day({ lo: 3 }), prefsAll), ['cold']);
  assert.deepStrictEqual(hitsForDay(day({ lo: 4 }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ lo: -5 }), { ...prefsAll, coldBelow: -5 }), ['cold']);
  assert.deepStrictEqual(hitsForDay(day({ lo: -4 }), { ...prefsAll, coldBelow: -5 }), []);
});

// ── missing temperature (Open-Meteo null) never reads as 0 degrees ──
check('missing temps are not hot or cold', () => {
  assert.deepStrictEqual(hitsForDay(day({ lo: null }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ lo: undefined, hi: null }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ lo: NaN, hi: NaN }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ code: 63, lo: null, hi: null }), prefsAll), ['rain']);
  // a real 0 degree low still counts as cold
  assert.deepStrictEqual(hitsForDay(day({ lo: 0 }), prefsAll), ['cold']);
});

// ── rainPct >= 60 counts as rain only when 'rain' is picked ──
check('rainPct rule', () => {
  assert.deepStrictEqual(hitsForDay(day({ code: 3, rainPct: 60 }), prefsAll), ['rain']);
  assert.deepStrictEqual(hitsForDay(day({ code: 3, rainPct: 59 }), prefsAll), []);
  assert.deepStrictEqual(hitsForDay(day({ code: 3, rainPct: 90 }), { ...prefsAll, conditions: ['drizzle', 'showers'] }), []);
  // code-based rain plus the pct rule collapse to one 'rain' hit
  assert.deepStrictEqual(hitsForDay(day({ code: 63, rainPct: 95 }), prefsAll), ['rain']);
});

// ── unpicked conditions never hit; order follows CONDITIONS ──
check('unpicked never hit', () => {
  const stormyHot = day({ code: 95, hi: 35, lo: 1 });
  assert.deepStrictEqual(hitsForDay(stormyHot, { ...prefsAll, conditions: ['hot'] }), ['hot']);
  assert.deepStrictEqual(hitsForDay(stormyHot, { ...prefsAll, conditions: ['cold', 'thunderstorm'] }), ['thunderstorm', 'cold']);
  assert.deepStrictEqual(hitsForDay(stormyHot, { ...prefsAll, conditions: [] }), []);
  assert.deepStrictEqual(hitsForDay(stormyHot, { ...prefsAll, conditions: ['snow', 'fog'] }), []);
});

// ── normalizePrefs ──
check('normalizePrefs defaults', () => {
  const p = normalizePrefs({});
  assert.deepStrictEqual(p, { ...DEFAULT_WEATHER_PREFS });
  assert.notStrictEqual(p.conditions, DEFAULT_WEATHER_PREFS.conditions); // a copy, not the shared array
  assert.deepStrictEqual(normalizePrefs(null), { ...DEFAULT_WEATHER_PREFS });
  assert.deepStrictEqual(normalizePrefs(undefined), { ...DEFAULT_WEATHER_PREFS });
  assert.deepStrictEqual(normalizePrefs('junk'), { ...DEFAULT_WEATHER_PREFS });
});
check('normalizePrefs merges stored keys', () => {
  const p = normalizePrefs({
    weatherAlerts: true, weatherAlertTime: '07:30', weatherConditions: ['hot', 'rain', 'rain', 'bogus', 42],
    weatherHotAbove: '31', weatherColdBelow: -2, weatherEveryDay: true,
  });
  assert.deepStrictEqual(p, { enabled: true, time: '07:30', conditions: ['hot', 'rain'], hotAbove: 31, coldBelow: -2, everyDay: true });
});
check('normalizePrefs garbage', () => {
  const p = normalizePrefs({
    weatherAlerts: 'yes', weatherAlertTime: '25:99', weatherConditions: 'rain',
    weatherHotAbove: 'hot', weatherColdBelow: NaN, weatherEveryDay: 1,
  });
  assert.strictEqual(p.enabled, false);
  assert.strictEqual(p.time, '06:00');
  assert.deepStrictEqual(p.conditions, DEFAULT_WEATHER_PREFS.conditions);
  assert.strictEqual(p.hotAbove, 28);
  assert.strictEqual(p.coldBelow, 3);
  assert.strictEqual(p.everyDay, false);
  assert.strictEqual(normalizePrefs({ weatherAlertTime: '6:00' }).time, '06:00');
  assert.strictEqual(normalizePrefs({ weatherAlertTime: '23:59' }).time, '23:59');
  assert.strictEqual(normalizePrefs({ weatherAlertTime: 600 }).time, '06:00');
  assert.strictEqual(normalizePrefs({ weatherHotAbove: Infinity }).hotAbove, 28);
  assert.deepStrictEqual(normalizePrefs({ weatherConditions: [] }).conditions, []); // explicit empty stays empty
});

// ── composeAlert ──
const K = '2026-09-18';
check('composeAlert one hit', () => {
  const r = composeAlert({ dateKey: K, day: day({ code: 63, lo: 11, hi: 17, label: 'Rain', rainWindow: '2 PM to 6 PM' }), hits: ['rain'], prefs: prefsAll, placeName: 'London, England, GB', isToday: true });
  assert.strictEqual(r.title, 'Rain today');
  assert.strictEqual(r.body, 'Likely 2 PM to 6 PM in London, England, GB. 11° to 17°.');
});
check('composeAlert two hits, no place', () => {
  const r = composeAlert({ dateKey: K, day: day({ code: 53, lo: 9, hi: 15, label: 'Drizzle', rainWindow: '8 AM to 11 AM' }), hits: ['rain', 'drizzle'], prefs: prefsAll, isToday: true });
  assert.strictEqual(r.title, 'Rain and drizzle today');
  assert.strictEqual(r.body, 'Likely 8 AM to 11 AM. 9° to 15°.');
});
check('composeAlert three hits, no window', () => {
  const r = composeAlert({ dateKey: K, day: day({ code: 95, lo: 12, hi: 19, label: 'Thunderstorm' }), hits: ['drizzle', 'showers', 'thunderstorm'], prefs: prefsAll, placeName: 'Leeds', isToday: true });
  assert.strictEqual(r.title, 'Drizzle, showers and thunderstorms today');
  assert.strictEqual(r.body, 'Thunderstorm. 12° to 19°.');
});
check('composeAlert hot / cold alone', () => {
  const h = composeAlert({ dateKey: K, day: day({ hi: 31, lo: 18, label: 'Clear' }), hits: ['hot'], prefs: prefsAll, isToday: true });
  assert.strictEqual(h.title, 'Hot day today: 31°');
  assert.strictEqual(h.body, 'Clear. 18° to 31°.');
  const c = composeAlert({ dateKey: K, day: day({ hi: 6, lo: 1, label: 'Overcast' }), hits: ['cold'], prefs: prefsAll, isToday: true });
  assert.strictEqual(c.title, 'Cold day today: 1°');
  assert.strictEqual(c.body, 'Overcast. 1° to 6°.');
});
check('composeAlert rain and hot', () => {
  const r = composeAlert({ dateKey: K, day: day({ code: 61, hi: 30, lo: 20, label: 'Rain', rainWindow: '4 PM to 7 PM' }), hits: ['rain', 'hot'], prefs: prefsAll, placeName: 'Rome', isToday: true });
  assert.strictEqual(r.title, 'Rain and a hot day today');
  assert.strictEqual(r.body, 'Likely 4 PM to 7 PM in Rome. 20° to 30°.');
});
check('composeAlert weekday when not today', () => {
  // 2026-09-18 is a Friday
  const r = composeAlert({ dateKey: K, day: day({ code: 61, label: 'Rain' }), hits: ['rain'], prefs: prefsAll, isToday: false });
  assert.strictEqual(r.title, 'Rain on Friday');
  const h = composeAlert({ dateKey: '2026-09-21', day: day({ hi: 33 }), hits: ['hot'], prefs: prefsAll, isToday: false });
  assert.strictEqual(h.title, 'Hot day on Monday: 33°');
});
check('composeAlert everyDay body', () => {
  const dry = composeAlert({ dateKey: K, day: day({ code: 2, lo: 8, hi: 16, label: 'Partly cloudy', rainPct: 10 }), hits: [], prefs: prefsAll, isToday: true });
  assert.strictEqual(dry.title, "Today's weather");
  assert.strictEqual(dry.body, 'Partly cloudy, staying dry. 8° to 16°.');
  const wet = composeAlert({ dateKey: K, day: day({ code: 3, lo: 8, hi: 16, label: 'Overcast', rainPct: 55 }), hits: [], prefs: prefsAll, isToday: true });
  assert.strictEqual(wet.body, 'Rain likely. 8° to 16°.');
});
check('composeAlert omits temps when a temperature is missing', () => {
  const r = composeAlert({ dateKey: K, day: day({ code: 63, lo: null, hi: null, label: 'Rain', rainWindow: '2 PM to 6 PM' }), hits: ['rain'], prefs: prefsAll, placeName: 'London', isToday: true });
  assert.strictEqual(r.title, 'Rain today');
  assert.strictEqual(r.body, 'Likely 2 PM to 6 PM in London.');
  const half = composeAlert({ dateKey: K, day: day({ code: 3, lo: 8, hi: NaN, label: 'Overcast' }), hits: [], prefs: prefsAll, isToday: true });
  assert.strictEqual(half.body, 'Overcast, staying dry.');
  const wet = composeAlert({ dateKey: K, day: day({ lo: undefined, hi: undefined, rainPct: 70 }), hits: [], prefs: prefsAll, isToday: true });
  assert.strictEqual(wet.body, 'Rain likely.');
  assert.ok(!r.body.includes('0°') && !half.body.includes('0°') && !wet.body.includes('0°'));
  clean(r.body); clean(half.body); clean(wet.body);
});
check('composed text is free of em dashes and emoji', () => {
  const combos = [[], ['rain'], ['rain', 'drizzle'], ['drizzle', 'showers', 'thunderstorm'], ['hot'], ['cold'], ['rain', 'hot'], ALL];
  for (const hits of combos) {
    for (const d of [day({ code: 63, rainWindow: '1 PM to 3 PM', rainPct: 80 }), day({ code: 0, hi: 30, lo: -1 })]) {
      for (const isToday of [true, false]) {
        const r = composeAlert({ dateKey: K, day: d, hits, prefs: prefsAll, placeName: 'Paris', isToday });
        clean(r.title); clean(r.body);
      }
    }
  }
});

// ── dateKeyOf ──
check('dateKeyOf local', () => {
  assert.strictEqual(dateKeyOf(new Date(2026, 8, 18, 5, 0)), '2026-09-18');
  assert.strictEqual(dateKeyOf(new Date(2026, 0, 1, 23, 59)), '2026-01-01');
});

// ── planWeatherAlerts ──
const byDay = {
  '2026-09-18': day({ code: 63, label: 'Rain', rainWindow: '2 PM to 6 PM', rainPct: 80 }),
  '2026-09-19': day({ code: 0, label: 'Clear' }),
  '2026-09-20': day({ code: 53, label: 'Drizzle', rainPct: 40 }),
  // 21st missing on purpose
  '2026-09-22': day({ code: 0, hi: 30, label: 'Clear' }),
  '2026-09-23': day({ code: 95, label: 'Thunderstorm' }),
  '2026-09-24': day({ code: 1, label: 'Partly cloudy' }),
  '2026-09-25': day({ code: 71, label: 'Snow', lo: -2 }),
  '2026-09-26': day({ code: 65, label: 'Rain' }), // beyond the 7-day window
};
const prefs = { ...prefsAll, conditions: ['rain', 'drizzle', 'thunderstorm', 'snow'], time: '06:00' };
const at = (dk, h = 6, mi = 0) => { const [y, mo, d] = dk.split('-').map(Number); return new Date(y, mo - 1, d, h, mi, 0, 0).getTime(); };

check('plan includes today when now is before the time', () => {
  const plan = planWeatherAlerts({ byDay, prefs, now: new Date(2026, 8, 18, 5, 0), placeName: 'London' });
  assert.deepStrictEqual(plan.map((p) => p.dateKey), ['2026-09-18', '2026-09-20', '2026-09-23']);
  assert.strictEqual(plan[0].fireAt, at('2026-09-18'));
  assert.strictEqual(plan[0].title, 'Rain today');
  assert.strictEqual(plan[0].body, 'Likely 2 PM to 6 PM in London. 10° to 20°.');
  assert.deepStrictEqual(plan[0].hits, ['rain']);
  assert.deepStrictEqual(plan[1].hits, ['drizzle']);
  assert.deepStrictEqual(plan[2].hits, ['thunderstorm']);
  for (const p of plan) { clean(p.title); clean(p.body); }
});
check('plan skips today when now is past the time', () => {
  const plan = planWeatherAlerts({ byDay, prefs, now: new Date(2026, 8, 18, 6, 30) });
  assert.deepStrictEqual(plan.map((p) => p.dateKey), ['2026-09-20', '2026-09-23']);
});
check('plan skips a fireAt less than 60s away', () => {
  const plan = planWeatherAlerts({ byDay, prefs, now: new Date(2026, 8, 18, 5, 59, 30) });
  assert.deepStrictEqual(plan.map((p) => p.dateKey), ['2026-09-20', '2026-09-23']);
  const plan2 = planWeatherAlerts({ byDay, prefs, now: new Date(2026, 8, 18, 5, 59, 0) });
  assert.strictEqual(plan2[0].dateKey, '2026-09-18');
});
check('plan skips dates without a forecast', () => {
  const plan = planWeatherAlerts({ byDay, prefs: { ...prefs, everyDay: true }, now: new Date(2026, 8, 18, 5, 0) });
  assert.ok(!plan.some((p) => p.dateKey === '2026-09-21'));
});
check('plan empty when disabled', () => {
  assert.deepStrictEqual(planWeatherAlerts({ byDay, prefs: { ...prefs, enabled: false }, now: new Date(2026, 8, 18, 5, 0) }), []);
  assert.deepStrictEqual(planWeatherAlerts({ byDay, prefs: { ...prefs, conditions: [] }, now: new Date(2026, 8, 18, 5, 0) }), []);
  assert.deepStrictEqual(planWeatherAlerts({ byDay: {}, prefs, now: new Date(2026, 8, 18, 5, 0) }), []);
  assert.deepStrictEqual(planWeatherAlerts({ byDay: null, prefs, now: new Date(2026, 8, 18, 5, 0) }), []);
});
check('plan everyDay includes calm days', () => {
  const plan = planWeatherAlerts({ byDay, prefs: { ...prefs, everyDay: true }, now: new Date(2026, 8, 18, 5, 0) });
  assert.deepStrictEqual(plan.map((p) => p.dateKey), ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-22', '2026-09-23', '2026-09-24']);
  const calm = plan.find((p) => p.dateKey === '2026-09-19');
  assert.strictEqual(calm.title, "Today's weather");
  assert.strictEqual(calm.body, 'Clear, staying dry. 10° to 20°.');
  assert.deepStrictEqual(calm.hits, []);
  // everyDay with no conditions picked still fires
  const plain = planWeatherAlerts({ byDay, prefs: { ...prefs, conditions: [], everyDay: true }, now: new Date(2026, 8, 18, 5, 0) });
  assert.strictEqual(plain.length, 6);
  assert.ok(plain.every((p) => p.hits.length === 0));
});
check('plan sorted by fireAt', () => {
  const plan = planWeatherAlerts({ byDay, prefs: { ...prefs, everyDay: true }, now: new Date(2026, 8, 18, 5, 0) });
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].fireAt > plan[i - 1].fireAt);
  assert.strictEqual(plan[plan.length - 1].fireAt, at('2026-09-24'));
});
check('plan capped by days', () => {
  const p7 = planWeatherAlerts({ byDay, prefs: { ...prefs, everyDay: true }, now: new Date(2026, 8, 18, 5, 0) });
  assert.ok(!p7.some((p) => p.dateKey === '2026-09-25'));
  assert.ok(!p7.some((p) => p.dateKey === '2026-09-26'));
  const p3 = planWeatherAlerts({ byDay, prefs: { ...prefs, everyDay: true }, now: new Date(2026, 8, 18, 5, 0), days: 3 });
  assert.deepStrictEqual(p3.map((p) => p.dateKey), ['2026-09-18', '2026-09-19', '2026-09-20']);
  const p1 = planWeatherAlerts({ byDay, prefs, now: new Date(2026, 8, 18, 5, 0), days: 1 });
  assert.deepStrictEqual(p1.map((p) => p.dateKey), ['2026-09-18']);
  // more than 7 is still capped to 7
  const p9 = planWeatherAlerts({ byDay, prefs: { ...prefs, everyDay: true }, now: new Date(2026, 8, 18, 5, 0), days: 9 });
  assert.ok(!p9.some((p) => p.dateKey === '2026-09-25'));
});
check('plan honours the picked time', () => {
  const plan = planWeatherAlerts({ byDay, prefs: { ...prefs, time: '07:45' }, now: new Date(2026, 8, 18, 7, 0) });
  assert.strictEqual(plan[0].fireAt, at('2026-09-18', 7, 45));
  const later = planWeatherAlerts({ byDay, prefs: { ...prefs, time: '07:45' }, now: new Date(2026, 8, 18, 7, 46) });
  assert.strictEqual(later[0].dateKey, '2026-09-20');
});
check('plan accepts now as a number', () => {
  const plan = planWeatherAlerts({ byDay, prefs, now: new Date(2026, 8, 18, 5, 0).getTime() });
  assert.strictEqual(plan[0].dateKey, '2026-09-18');
});

console.log(`test-weather-alerts: ${passed} checks passed`);
