// Pure helpers for the chat mic. No React, no native imports, so the
// behaviour is testable in plain node (scripts/sttChainTest.mjs).

// Release faster than this = the user tapped, not held: switch to hands-free
// (recording keeps going until the next tap) instead of throwing away a
// 200 ms clip and saying "too short".
export const TAP_MAX_MS = 300;
// Actual recorder time below this is discarded without a network call.
export const MIN_RECORD_MS = 300;
// Hands-free safety cap so a forgotten tap cannot record forever.
export const HANDS_FREE_MAX_MS = 90 * 1000;
// How far the mic glyph follows the finger while held (fraction of drag).
export const DRAG_FOLLOW = 0.25;
// Per-bar gain for the level meter next to the mic.
export const LEVEL_BAR_GAINS = [0.9, 1.4, 1.1, 1.6, 0.8];

// What a finger-up means. locked = a hands-free recording is running.
export const decideRelease = ({ downTs, upTs, locked }) => {
  if (locked) return 'stop';
  return upTs - downTs < TAP_MAX_MS ? 'lock' : 'stop';
};

// expo-av metering is dBFS (-160 .. 0). Speech sits around -35 .. -10.
export const levelFromMetering = (db) => {
  if (typeof db !== 'number' || !Number.isFinite(db)) return 0;
  return Math.max(0, Math.min(1, (db + 50) / 45));
};

export const placeholderFor = ({ phase, locked }) => {
  if (phase === 'starting') return 'Starting mic...';
  if (phase === 'recording') return locked ? 'Listening... tap the mic to stop' : 'Listening... release to send';
  if (phase === 'transcribing') return 'Transcribing...';
  return 'Ask me anything...';
};

// Maps a stopRecording()/startRecording() result to what the user sees.
// null = nothing to show. { alert } = needs a system alert. Otherwise an
// inline status line under the input.
export const voiceStatusText = (result) => {
  if (!result || result.success || result.cancelled) return null;
  if (result.rateLimited) return { alert: 'rateLimited' };
  if (result.error === 'permission') return { alert: 'permission' };
  if (result.tooShort) return { text: 'Hold the mic while you speak, then release', tone: 'warn' };
  if (result.nothingHeard) return { text: "Didn't catch that. Speak a little closer to the mic", tone: 'warn' };
  if (result.error === 'background') return { text: 'Voice input paused while the app was in the background', tone: 'warn' };
  if (result.error === 'noKeys') return { text: 'Voice input is not set up on this build', tone: 'error' };
  if (result.error === 'notStarted') return { text: 'The mic did not start. Hold a little longer and try again', tone: 'warn' };
  return {
    text: result.status ? `Voice service unavailable right now (${result.status}). Try again` : 'Voice service unavailable right now. Try again',
    tone: 'error',
  };
};
