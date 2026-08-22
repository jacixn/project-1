// Pure helpers behind the Scheduled Workouts screen. Days use JS getDay()
// indices (0 = Sun .. 6 = Sat). Times are 'HH:MM'. Durations are minutes.

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Display order Monday-first, one letter each.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const parseTime = (t) => {
  const [h, m] = String(t || '18:00').split(':').map(Number);
  return { h: Number.isFinite(h) ? h : 18, m: Number.isFinite(m) ? m : 0 };
};
const parseDate = (key) => {
  const [y, mo, d] = String(key || '').split('-').map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
};
const at = (date, time) => { const { h, m } = parseTime(time); const d = new Date(date); d.setHours(h, m, 0, 0); return d; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Next time this schedule fires. One-time schedules return their date even
// when it has passed (the list shows them as "Passed"). Recurring schedules
// with no days return null.
export const nextOccurrence = (s, now = new Date()) => {
  const nowD = now instanceof Date ? now : new Date(now);
  if (s?.type === 'one-time') {
    const d = parseDate(s.date);
    return d ? at(d, s.time) : null;
  }
  const days = Array.isArray(s?.days) ? s.days : [];
  if (!days.length) return null;
  for (let add = 0; add < 8; add++) {
    const d = new Date(startOfDay(nowD));
    d.setDate(d.getDate() + add);
    if (!days.includes(d.getDay())) continue;
    const when = at(d, s.time);
    if (when.getTime() > nowD.getTime()) return when;
  }
  return null;
};

// 'Today' | 'Tomorrow' | 'Thu' (within the week) | 'Sat 23 Aug' | 'Passed'
export const whenLabel = (date, now = new Date()) => {
  if (!date) return '';
  const nowD = now instanceof Date ? now : new Date(now);
  if (date.getTime() < nowD.getTime()) return 'Passed';
  const days = Math.round((startOfDay(date) - startOfDay(nowD)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return DAY_SHORT[date.getDay()];
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()} ${date.toLocaleString('en', { month: 'short' })}`;
};

// Soonest first; passed one-time schedules sink to the bottom; schedules that
// never fire (recurring with no days) last.
export const sortByNext = (list, now = new Date()) => {
  const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
  const rank = (s) => {
    const n = nextOccurrence(s, now);
    if (!n) return Number.POSITIVE_INFINITY;
    const t = n.getTime();
    return t < nowMs ? 1e15 + t : t;
  };
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => rank(a) - rank(b) || String(a.templateName || '').localeCompare(String(b.templateName || '')));
};

// 'Every day' | 'Weekdays' | 'Weekends' | 'Mon, Wed, Fri' | 'Sat 23 Aug 2026' | 'Not repeating'
export const patternLabel = (s) => {
  if (s?.type === 'one-time') {
    const d = parseDate(s.date);
    return d ? `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}` : 'One-time';
  }
  const days = [...new Set(Array.isArray(s?.days) ? s.days : [])].sort((a, b) => a - b);
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.join() === '1,2,3,4,5') return 'Weekdays';
  if (days.length === 2 && days.join() === '0,6') return 'Weekends';
  if (!days.length) return 'Not repeating';
  return days.map((d) => DAY_SHORT[d]).join(', ');
};

export const reminderLabel = (notifyBefore) => {
  if (notifyBefore == null || notifyBefore < 0) return 'no reminder';
  if (notifyBefore === 0) return 'reminder at start';
  if (notifyBefore % 60 === 0) { const h = notifyBefore / 60; return `reminder ${h} ${h === 1 ? 'hr' : 'hrs'} before`; }
  return `reminder ${notifyBefore} min before`;
};

export const durationLabel = (mins) => {
  const n = Math.max(0, Math.round(Number(mins) || 0));
  if (!n) return '';
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  return `${h} hr ${m} min`;
};

// Minutes per weekday in display order (Mon..Sun): recurring days plus
// one-time dates inside the next 7 days.
export const weekLoad = (list, now = new Date()) => {
  const nowD = now instanceof Date ? now : new Date(now);
  const load = [0, 0, 0, 0, 0, 0, 0]; // indexed by getDay()
  const weekEnd = startOfDay(nowD).getTime() + 7 * 86400000;
  for (const s of Array.isArray(list) ? list : []) {
    const mins = Math.max(0, Number(s?.duration) || 0);
    if (s?.type === 'one-time') {
      const d = parseDate(s.date);
      if (!d) continue;
      const t = d.getTime();
      if (t >= startOfDay(nowD).getTime() && t < weekEnd) load[d.getDay()] += mins;
      continue;
    }
    for (const day of new Set(Array.isArray(s?.days) ? s.days : [])) if (day >= 0 && day <= 6) load[day] += mins;
  }
  return WEEK_ORDER.map((d) => load[d]);
};

// { workouts, sessionsPerWeek, minutesPerWeek } from recurring schedules,
// plus one-time sessions inside the next 7 days.
export const weeklySummary = (list, now = new Date()) => {
  const nowD = now instanceof Date ? now : new Date(now);
  const weekEnd = startOfDay(nowD).getTime() + 7 * 86400000;
  let sessions = 0;
  let minutes = 0;
  for (const s of Array.isArray(list) ? list : []) {
    const mins = Math.max(0, Number(s?.duration) || 0);
    if (s?.type === 'one-time') {
      const d = parseDate(s.date);
      if (d && d.getTime() >= startOfDay(nowD).getTime() && d.getTime() < weekEnd) { sessions += 1; minutes += mins; }
      continue;
    }
    const n = new Set(Array.isArray(s?.days) ? s.days : []).size;
    sessions += n;
    minutes += n * mins;
  }
  return { workouts: Array.isArray(list) ? list.length : 0, sessionsPerWeek: sessions, minutesPerWeek: minutes };
};

export const hoursLabel = (mins) => {
  const n = Math.max(0, Number(mins) || 0);
  if (n < 60) return `${Math.round(n)} min`;
  const h = n / 60;
  const rounded = Math.round(h * 2) / 2;
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} ${rounded === 1 ? 'hr' : 'hrs'}`;
};
