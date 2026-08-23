// Day templates: a named shape for a day ("Work Remote": Work 9:00 to 5:30,
// Breakfast, Lunch, Dinner) that can be put on any date, or on every Monday.
// The blocks become real items on the day (My Week, the Biblely calendar,
// the planner), so EyeCandy and the iPhone Calendar see the same busy time
// and the same free time.
//
// Pure: no storage, no React. The service (services/dayTemplates.js) owns
// persistence and side effects.
//
//   template: { id, name, blocks: [{ id, title, start: 'HH:MM', end: 'HH:MM', fixed }] }
//   plan:     { dates: { 'YYYY-MM-DD': templateId | null }, weekdays: { '0'..'6': templateId },
//               overrides: { 'YYYY-MM-DD': { [blockId]: { start, end } | null } } }
//
// A date entry beats a weekday entry (null = "no template today, even though
// Mondays normally are Work Remote"). An override moves one block on one day
// (null = skipped that day). `fixed` blocks never move in a plan (work,
// school); the rest (meals) may give way for one day like reminders do.

import { sameThing, DAY_GROUPS } from './takeover';

export const DAY_MIN = 24 * 60;

export const hmToMin = (hm) => {
  if (typeof hm !== 'string') return null;
  const m = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2]);
  if (h < 0 || h > 24 || mi < 0 || mi > 59) return null;
  return Math.min(DAY_MIN, h * 60 + mi);
};
export const minToHm = (min) => {
  const v = Math.max(0, Math.min(DAY_MIN, Math.round(Number(min) || 0)));
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
};
export const fmtClock = (min) => {
  const v = Math.max(0, Math.min(DAY_MIN, Math.round(Number(min) || 0)));
  const h = Math.floor(v / 60) % 24; const m = v % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
};

let seq = 0;
export const newId = (prefix = 'b') => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Things a day is usually made of. Start/end are the suggestion when the
// block is added; the user drags or edits from there.
export const BLOCK_PRESETS = [
  { title: 'Work', start: '09:00', end: '17:30', fixed: true, icon: 'work' },
  { title: 'School', start: '08:45', end: '15:30', fixed: true, icon: 'school' },
  { title: 'Commute', start: '08:00', end: '08:45', fixed: false, icon: 'directions-bus' },
  { title: 'Breakfast', start: '08:00', end: '08:30', fixed: false, icon: 'free-breakfast' },
  { title: 'Lunch', start: '13:00', end: '13:30', fixed: false, icon: 'lunch-dining' },
  { title: 'Dinner', start: '19:00', end: '19:45', fixed: false, icon: 'dinner-dining' },
  { title: 'Church', start: '10:00', end: '12:00', fixed: true, icon: 'church' },
  { title: 'Chores', start: '10:00', end: '11:00', fixed: false, icon: 'cleaning-services' },
  { title: 'Family time', start: '18:00', end: '19:00', fixed: false, icon: 'people' },
  { title: 'Rest', start: '14:00', end: '15:00', fixed: false, icon: 'self-improvement' },
  { title: 'Wind down', start: '22:00', end: '23:00', fixed: false, icon: 'nightlight' },
];

export const iconForTitle = (title) => {
  const t = String(title || '').toLowerCase();
  const hit = BLOCK_PRESETS.find((p) => t.includes(p.title.toLowerCase()));
  if (hit) return hit.icon;
  if (/eat|meal|brunch|tea|coffee/.test(t)) return 'restaurant';
  if (/drive|train|bus|travel/.test(t)) return 'directions-bus';
  if (/study|class|lecture|uni/.test(t)) return 'school';
  if (/sleep|nap|bed/.test(t)) return 'nightlight';
  return 'schedule';
};

// Starting points the first time the feature is opened. The user edits or
// deletes them like their own.
const P = (title, start, end, fixed = false) => ({ title, start, end, fixed });
export const PRESET_TEMPLATES = [
  { name: 'Work Remote', blocks: [P('Breakfast', '08:00', '08:30'), P('Work', '09:00', '17:30', true), P('Lunch', '13:00', '13:30'), P('Dinner', '19:00', '19:45')] },
  { name: 'Office day', blocks: [P('Breakfast', '07:15', '07:45'), P('Commute', '08:00', '08:45'), P('Work', '09:00', '17:30', true), P('Lunch', '12:30', '13:00'), P('Commute', '17:30', '18:15'), P('Dinner', '19:00', '19:45')] },
  { name: 'Day off', blocks: [P('Breakfast', '09:00', '09:30'), P('Lunch', '13:00', '13:45'), P('Dinner', '19:00', '19:45')] },
];

export const makeTemplate = (name, blocks = []) => normalizeTemplate({ id: newId('t'), name, blocks: blocks.map((b) => ({ ...b, id: newId('b') })) });

// Blocks sorted by start; empty or backwards blocks dropped; a block that
// runs past midnight is cut at midnight (a day template is one day).
export const normalizeTemplate = (t) => {
  const blocks = [];
  for (const b of (t && Array.isArray(t.blocks)) ? t.blocks : []) {
    if (!b) continue;
    const s = hmToMin(b.start); const e = hmToMin(b.end);
    if (s == null || e == null || e === s) continue;
    // end before start = runs past midnight (Sleep 10:30 PM to 6:30 AM)
    const overnight = e < s;
    // source = the block IS an event the user already has in another iPhone
    // calendar ("Work" in the Work calendar): that event stands in for the
    // block on days it occurs, nothing is mirrored, so nothing shows twice.
    const source = b.source && b.source.kind === 'calendar' && b.source.title ? { kind: 'calendar', title: String(b.source.title), calendarTitle: b.source.calendarTitle ? String(b.source.calendarTitle) : null } : null;
    blocks.push({ id: b.id || newId('b'), title: String(b.title || 'Block').trim() || 'Block', start: minToHm(s), end: minToHm(Math.min(e, DAY_MIN)), fixed: !!b.fixed, ...(overnight ? { overnight: true } : {}), ...(source ? { source } : {}) });
  }
  blocks.sort((a, b) => hmToMin(a.start) - hmToMin(b.start) || hmToMin(a.end) - hmToMin(b.end));
  return { id: (t && t.id) || newId('t'), name: String((t && t.name) || 'Day').trim() || 'Day', blocks, keeps: normalizeKeeps(t && t.keeps) };
};

// What else stays on this kind of day (and rings): prayers, workouts,
// one-off things, EyeCandy shows and films, matches. All on unless the
// user turns one off for the template.
export const normalizeKeeps = (k) => {
  const out = {};
  for (const g of DAY_GROUPS) out[g] = !(k && k[g] === false);
  return out;
};
export const hideGroupsFor = (t) => DAY_GROUPS.filter((g) => t && t.keeps && t.keeps[g] === false);

export const emptyPlan = () => ({ dates: {}, weekdays: {}, overrides: {} });
export const normalizePlan = (p) => ({
  dates: p && p.dates && typeof p.dates === 'object' ? p.dates : {},
  weekdays: p && p.weekdays && typeof p.weekdays === 'object' ? p.weekdays : {},
  overrides: p && p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
});

// Which template a day uses: the date's own choice first (null = none,
// on purpose), else the weekday's.
export const templateIdForDay = (plan, dateKey, dow) => {
  const p = normalizePlan(plan);
  if (Object.prototype.hasOwnProperty.call(p.dates, dateKey)) return p.dates[dateKey] || null;
  const w = p.weekdays[String(dow)];
  return w || null;
};

export const templateForDay = (templates, plan, dateKey, dow) => {
  const id = templateIdForDay(plan, dateKey, dow);
  if (!id) return null;
  return (templates || []).find((t) => t && t.id === id) || null;
};

// The day's blocks with that day's overrides applied (moved, or skipped = null).
export const blocksForDay = (templates, plan, dateKey, dow) => {
  const t = templateForDay(templates, plan, dateKey, dow);
  if (!t) return [];
  const ov = (normalizePlan(plan).overrides || {})[dateKey] || {};
  const out = [];
  const piece = (b, id, start, end, extra = {}) => {
    const o = Object.prototype.hasOwnProperty.call(ov, id) ? ov[id] : undefined;
    if (o === null) return; // skipped today
    const s = hmToMin(o && o.start ? o.start : start);
    const e = hmToMin(o && o.end ? o.end : end);
    if (s == null || e == null || e <= s) return;
    out.push({ blockId: id, templateId: t.id, templateName: t.name, title: b.title, startMin: s, endMin: e, baseStartMin: hmToMin(start), fixed: !!b.fixed, moved: !!o, icon: iconForTitle(b.title), ...(b.source ? { source: b.source } : {}), ...extra });
  };
  for (const b of t.blocks || []) {
    if (b.overnight) {
      // Two pieces on this day: the evening until midnight, the morning
      // from midnight. One block in the template, one event in the Calendar.
      piece(b, b.id, b.start, '24:00', { overnight: 'pm', overnightEnd: hmToMin(b.end) });
      piece(b, `${b.id}_am`, '00:00', b.end, { overnight: 'am' });
      continue;
    }
    piece(b, b.id, b.start, b.end);
  }
  out.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  return out;
};

// Plan edits (pure, return a new plan).
export const withDateTemplate = (plan, dateKey, templateId) => {
  const p = normalizePlan(plan);
  const dates = { ...p.dates, [dateKey]: templateId || null };
  const overrides = { ...p.overrides }; delete overrides[dateKey]; // a fresh template, no stale moves
  return { ...p, dates, overrides };
};
export const withWeekdayTemplate = (plan, dow, templateId) => {
  const p = normalizePlan(plan);
  const weekdays = { ...p.weekdays };
  if (templateId) weekdays[String(dow)] = templateId; else delete weekdays[String(dow)];
  return { ...p, weekdays };
};
// Forget the date's own choice so the weekday rule applies again.
export const withoutDateChoice = (plan, dateKey) => {
  const p = normalizePlan(plan);
  const dates = { ...p.dates }; delete dates[dateKey];
  const overrides = { ...p.overrides }; delete overrides[dateKey];
  return { ...p, dates, overrides };
};
export const withOverride = (plan, dateKey, blockId, value) => {
  const p = normalizePlan(plan);
  const day = { ...(p.overrides[dateKey] || {}) };
  if (value === undefined) delete day[blockId];
  else if (value === null) day[blockId] = null;
  else {
    const s = hmToMin(value.start); const e = hmToMin(value.end);
    if (s == null || e == null || e <= s) return p;
    day[blockId] = { start: minToHm(s), end: minToHm(e) };
  }
  const overrides = { ...p.overrides };
  if (Object.keys(day).length) overrides[dateKey] = day; else delete overrides[dateKey];
  return { ...p, overrides };
};
// A template was deleted: every day that used it goes back to nothing.
export const withoutTemplate = (plan, templateId) => {
  const p = normalizePlan(plan);
  const dates = {}; for (const [k, v] of Object.entries(p.dates)) if (v !== templateId) dates[k] = v;
  const weekdays = {}; for (const [k, v] of Object.entries(p.weekdays)) if (v !== templateId) weekdays[k] = v;
  return { ...p, dates, weekdays };
};
// Past dates and their overrides are noise; keep the plan small.
export const prunePlan = (plan, todayKey) => {
  const p = normalizePlan(plan);
  const dates = {}; for (const [k, v] of Object.entries(p.dates)) if (k >= todayKey) dates[k] = v;
  const overrides = {}; for (const [k, v] of Object.entries(p.overrides)) if (k >= todayKey) overrides[k] = v;
  return { ...p, dates, overrides };
};

// "Work 9 AM to 5:30 PM · Breakfast, Lunch, Dinner"
export const templateSummary = (t) => {
  const blocks = (t && t.blocks) || [];
  if (!blocks.length) return 'Nothing in it yet';
  const fixed = blocks.filter((b) => b.fixed);
  const rest = blocks.filter((b) => !b.fixed);
  const parts = [];
  for (const b of fixed.slice(0, 2)) parts.push(`${b.title} ${fmtClock(hmToMin(b.start))} to ${fmtClock(hmToMin(b.end))}`);
  // (an overnight block reads "10:30 PM to 6:30 AM" on its own)
  if (rest.length) parts.push(rest.map((b) => b.title).join(', '));
  return parts.join(' · ');
};

// Free time between the blocks (and anything else busy) inside the waking
// day. Used for the "free" hint in the template sheet.
export const freeMinutes = (blocks, { dayStart = 7 * 60, dayEnd = 23 * 60 } = {}) => {
  const spans = (blocks || []).map((b) => [Math.max(dayStart, b.startMin), Math.min(dayEnd, b.endMin)]).filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  let busy = 0; let cur = null;
  for (const [s, e] of spans) {
    if (!cur || s > cur[1]) { if (cur) busy += cur[1] - cur[0]; cur = [s, e]; }
    else cur[1] = Math.max(cur[1], e);
  }
  if (cur) busy += cur[1] - cur[0];
  return Math.max(0, dayEnd - dayStart - busy);
};

// A templated day silences the routine it hides: a repeating reminder that
// is not one of the template's blocks does not ring that day.
export const reminderHiddenOn = (reminder, templates, plan, dateKey, dow) => {
  if (!reminder) return false;
  const t = templateForDay(templates, plan, dateKey, dow);
  if (!t) return false;
  if (reminder.type === 'one-time') return hideGroupsFor(t).includes('oneOffs');
  return !(t.blocks || []).some((b) => sameThing(b.title, reminder.title));
};
// Whole groups a template turns off: prayers, workouts, tasks (oneOffs)...
export const groupHiddenOn = (group, templates, plan, dateKey, dow) => {
  const t = templateForDay(templates, plan, dateKey, dow);
  return !!t && hideGroupsFor(t).includes(group);
};
