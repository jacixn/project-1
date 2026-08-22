// Pure helpers behind the template detail sheet. No React, no native.

const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Rough working time: ~45 s of work + ~75 s rest per set, plus a minute per
// exercise for setup. Good enough for "about 22 min".
export const estimateMinutes = (exercises = []) => {
  const sets = exercises.reduce((s, e) => s + num(e.sets), 0);
  if (!sets) return 0;
  return Math.max(5, Math.round((sets * 2) + exercises.length * 1));
};

export const summarizeTemplate = (template) => {
  const exercises = Array.isArray(template?.exercises) ? template.exercises : [];
  const totalSets = exercises.reduce((s, e) => s + num(e.sets), 0);
  const bySets = new Map();
  for (const e of exercises) {
    const part = (e.bodyPart || 'Other').trim() || 'Other';
    bySets.set(part, (bySets.get(part) || 0) + Math.max(1, num(e.sets, 1)));
  }
  const total = [...bySets.values()].reduce((a, b) => a + b, 0) || 1;
  const muscleSplit = [...bySets.entries()]
    .map(([bodyPart, sets]) => ({ bodyPart, sets, share: sets / total }))
    .sort((a, b) => b.sets - a.sets);
  return { exerciseCount: exercises.length, totalSets, estMinutes: estimateMinutes(exercises), muscleSplit };
};

export const formatDuration = (seconds) => {
  const s = num(seconds);
  if (s < 60) return `${Math.max(0, Math.round(s))} sec`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} min` : `${h} h`;
};

export const relativeDay = (iso, now = Date.now()) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const startOf = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const days = Math.round((startOf(now) - startOf(t)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 28) { const w = Math.round(days / 7); return w === 1 ? 'a week ago' : `${w} weeks ago`; }
  const d = new Date(t);
  return `on ${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
};

// What the history says about this template: when it was last done, how
// often, and the best completed set per exercise from the most recent
// session that contained it (any session, so a Push exercise done in a
// different template still counts).
export const templateHistory = (history = [], template, { now = Date.now(), lookback = 40 } = {}) => {
  const sessions = (Array.isArray(history) ? history : [])
    .filter((s) => s && Array.isArray(s.exercises))
    .slice()
    .sort((a, b) => new Date(b.completedAt || b.endTime || 0) - new Date(a.completedAt || a.endTime || 0));
  const mine = sessions.filter((s) => (template?.id && s.templateId === template.id) || (template?.name && s.name === template.name));
  const last = mine[0] || null;
  const lastByExercise = {};
  for (const s of sessions.slice(0, lookback)) {
    for (const ex of s.exercises) {
      const key = String(ex?.name || '').toLowerCase();
      if (!key || lastByExercise[key]) continue;
      const done = (ex.sets || []).filter((st) => st && st.completed && num(st.weight) > 0);
      if (!done.length) continue;
      const best = done.reduce((a, b) => (num(b.weight) > num(a.weight) ? b : a));
      lastByExercise[key] = { weight: num(best.weight), reps: num(best.reps) };
    }
  }
  return {
    timesDone: mine.length,
    lastDoneIso: last ? (last.completedAt || last.endTime || null) : null,
    lastDoneLabel: last ? relativeDay(last.completedAt || last.endTime, now) : null,
    lastDurationSec: last ? num(last.duration) : 0,
    lastByExercise,
  };
};

export const lastLiftFor = (insights, exerciseName) => {
  const key = String(exerciseName || '').toLowerCase();
  return insights?.lastByExercise?.[key] || null;
};
