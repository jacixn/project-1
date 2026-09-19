// How long a workout template takes, as the user set it. Stored on the
// template as `durationMinutes` (older rows may carry `estimatedDuration` or
// `duration`; both are honoured). This is the block a scheduled workout
// fills on My Week, the Calendar mirror and the day-flow strip, and the
// default the Schedule sheet opens with. Pure: no React, no storage.
import { clampDuration, DEFAULT_WORKOUT_DURATION, formatDuration } from './duration';
import { estimateMinutes } from './templateSummary';

// The length the user chose, or null when none is set.
export const templateDurationMinutes = (template) => {
  if (!template) return null;
  const raw = template.durationMinutes ?? template.estimatedDuration ?? template.duration;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

// What the Length control shows before the user touches it: the chosen
// length, else the exercise estimate rounded up to a 5 min step (never under
// 15 min), else the usual hour.
export const suggestedDurationMinutes = (template, exercises) => {
  const set = templateDurationMinutes(template);
  if (set) return set;
  const list = Array.isArray(exercises) ? exercises : (Array.isArray(template?.exercises) ? template.exercises : []);
  const est = estimateMinutes(list);
  if (!est) return DEFAULT_WORKOUT_DURATION;
  return clampDuration(Math.max(15, Math.ceil(est / 5) * 5));
};

// Length a new schedule for this template starts with.
export const scheduleDurationFor = (template, fallback = DEFAULT_WORKOUT_DURATION) =>
  templateDurationMinutes(template) || fallback;

// "1 hr 20 mins" when the user set a length, else the estimate line the
// sheet always showed ("about 24 min"), else nothing.
export const templateLengthLabel = (template, estMinutes) => {
  const set = templateDurationMinutes(template);
  if (set) return formatDuration(set);
  const est = Number(estMinutes);
  return Number.isFinite(est) && est > 0 ? `about ${Math.round(est)} min` : null;
};
