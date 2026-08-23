// Does a scheduled workout happen on this day? One rule for every reader
// (My Week, busy gaps, the Fitness tab, notifications), including the
// per-day exceptions a repeating workout gets when it is skipped or moved
// "just today" (`skipDates`, with a one-time copy carrying that day).
export const workoutOnDay = (s, dateKey, dow) => {
  if (!s) return false;
  if (s.type === 'one-time') return s.date === dateKey;
  if (!Array.isArray(s.days) || !s.days.includes(dow)) return false;
  if (dateKey && Array.isArray(s.skipDates) && s.skipDates.includes(dateKey)) return false;
  return true;
};

// Recurring workouts whose one-time copy exists on `dateKey` never show the
// series as well, even if skipDates got lost in a sync.
export const workoutsOnDay = (list, dateKey, dow) => {
  const all = Array.isArray(list) ? list.filter(Boolean) : [];
  const copied = new Set(all.filter((s) => s.type === 'one-time' && s.parentId && s.date === dateKey).map((s) => String(s.parentId)));
  return all.filter((s) => workoutOnDay(s, dateKey, dow) && !(s.type !== 'one-time' && copied.has(String(s.id))));
};

export const dateKeyFor = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
