// Reminder duration = how long the activity takes, and the length of the block
// the user drags on the schedule timeline (block height maps to this) plus the
// calendar event it mirrors. A plain minute value, nudged in 5-min steps.

export const DURATION_MIN = 5;
export const DURATION_MAX = 1440;   // 24h ceiling, guards runaway + taps
export const DURATION_STEP = 5;
export const DEFAULT_DURATION = 30;
export const DEFAULT_PRAYER_DURATION = 5;   // prayers default to a short 5-min block
export const DEFAULT_WORKOUT_DURATION = 60;

// Quick-pick chips shown in the details editor — spans minutes to a full night.
export const DURATION_PRESETS = [5, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480];

export const clampDuration = (m, min = DURATION_MIN) =>
  Math.max(min, Math.min(DURATION_MAX, Math.round(Number(m) || 0)));

// Step size grows with the value so long durations (e.g. 8 h sleep) aren't 96
// taps: 5 min under an hour, 15 min to 3 h, 30 min to 6 h, then 1 h.
export const adaptiveStep = (m) => {
  const n = Number(m) || 0;
  if (n < 60) return 5;
  if (n < 180) return 15;
  if (n < 360) return 30;
  return 60;
};

// Nudge to the next/prev step boundary using the adaptive step.
export const stepDuration = (m, dir, min = DURATION_MIN) => {
  const cur = clampDuration(m, min);
  const step = adaptiveStep(dir < 0 ? cur - 1 : cur);
  return clampDuration(Math.round((cur + dir * step) / step) * step, min);
};

// "1 hr 35 mins" / "45 mins" / "2 hrs". Never returns null (durations are > 0).
export function formatDuration(mins) {
  const n = Math.max(0, Math.floor(Number(mins) || 0));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h <= 0) return `${m} ${m === 1 ? 'min' : 'mins'}`;
  if (m <= 0) return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  return `${h} ${h === 1 ? 'hr' : 'hrs'} ${m} ${m === 1 ? 'min' : 'mins'}`;
}

// Compact form for tight card chips: "20m" / "1h" / "1h30".
export function formatDurationShort(mins) {
  const n = Math.max(0, Math.floor(Number(mins) || 0));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h <= 0) return `${m}m`;
  if (m <= 0) return `${h}h`;
  return `${h}h${m}`;
}
