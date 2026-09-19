// How long a workout template takes, as the user set it. Stored on the
// template as `durationMinutes` (older rows may carry `estimatedDuration` or
// `duration`; both are honoured). This is the block a scheduled workout
// fills on My Week, the Calendar mirror and the day-flow strip, and the
// default the Schedule sheet opens with. Pure: no React, no storage.
import { DEFAULT_WORKOUT_DURATION, formatDuration } from './duration';

// The length the user chose, or null when none is set.
export const templateDurationMinutes = (template) => {
  if (!template) return null;
  const raw = template.durationMinutes ?? template.estimatedDuration ?? template.duration;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

// What the Length control shows before the user touches it: the chosen
// length, else one hour. (The exercise estimate is deliberately not used as
// the default: a set length should be the user's number, and an hour is the
// block people plan gym time in.)
export const suggestedDurationMinutes = (template) =>
  templateDurationMinutes(template) || DEFAULT_WORKOUT_DURATION;

// Length a new schedule for this template starts with.
export const scheduleDurationFor = (template, fallback = DEFAULT_WORKOUT_DURATION) =>
  templateDurationMinutes(template) || fallback;

// "1 hr 20 mins" when the user set a length, else "1 hr": an unset template
// is an hour everywhere (rows, sheet, schedule default, My Week block).
export const templateLengthLabel = (template) => formatDuration(scheduleDurationFor(template));
