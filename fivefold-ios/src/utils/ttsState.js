// What the Listen button knows about playback. Pure: no React, no services.
//
// The bug this exists for: starting a clip first stops whatever was playing,
// and the stop makes the speech service call back with "stopped". That call
// back arrives after the new clip has already been registered, so it wiped
// the record of which block was playing, and the control fell back to
// "Listen" while audio was plainly coming out of the phone.
//
// The fix is the `starting` flag: while a new clip is being set up, a
// terminal event belongs to the clip being torn down, not the one coming up,
// and is ignored.

export const IDLE = { speaking: false, loading: false, target: null, paused: false };

/** The moment Listen is tapped: this target owns playback from here. */
export const startLoading = (target) => ({ speaking: false, loading: true, target, paused: false });

const TERMINAL = new Set(['finished', 'stopped', 'error']);

/**
 * Fold a speech-service state change into what the button shows.
 * `starting` is true between tapping Listen and the new clip being handed to
 * the service.
 */
export const applyTtsState = (prev, event, { starting = false } = {}) => {
  const state = prev || IDLE;
  if (event === 'playing') return { ...state, loading: false, speaking: true };
  if (event === 'loading') return { ...state, loading: true };
  if (TERMINAL.has(event)) return starting ? state : { ...IDLE };
  return state;
};

/** Did this particular control start what is playing or loading? */
export const isBusy = (state, target) => {
  const s = state || IDLE;
  return !!target && s.target === target && (s.speaking || s.loading);
};
export const isPlaying = (state, target) => (state || IDLE).speaking && isBusy(state, target);
export const isLoading = (state, target) => (state || IDLE).loading && !(state || IDLE).speaking && isBusy(state, target);
