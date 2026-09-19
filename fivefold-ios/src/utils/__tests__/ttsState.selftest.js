// Run: node src/utils/__tests__/ttsState.selftest.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'ttsState.js'), 'utf8').replace(/^export /gm, '');
const m = new Function(`${src}\nreturn { IDLE, startLoading, applyTtsState, isBusy, isPlaying, isLoading };`)();

let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const T = 'reflection';

// The reported bug, in order: tap Listen, the old clip's stop lands late,
// then the new clip starts playing.
{
  let s = m.startLoading(T);
  ok(m.isLoading(s, T), 'tapping Listen shows the control as busy straight away');
  s = m.applyTtsState(s, 'stopped', { starting: true });
  ok(s.target === T, 'a stop that belongs to the clip being replaced does not wipe the new one');
  s = m.applyTtsState(s, 'playing');
  ok(m.isPlaying(s, T) && !m.isLoading(s, T), 'and once it plays the control says so, which is the bug that was reported');
}

// Without the guard the same sequence is exactly what went wrong.
{
  let s = m.startLoading(T);
  s = m.applyTtsState(s, 'stopped');
  s = m.applyTtsState(s, 'playing');
  ok(!m.isPlaying(s, T), 'an unguarded stop is what left the button reading Listen while audio played');
}

// Ordinary life
{
  let s = m.applyTtsState(m.startLoading(T), 'playing');
  ok(m.isPlaying(s, T), 'playing');
  s = m.applyTtsState(s, 'finished');
  ok(!m.isBusy(s, T) && s.target === null, 'reaching the end releases the control');
}
{
  let s = m.applyTtsState(m.startLoading(T), 'playing');
  s = m.applyTtsState(s, 'stopped');
  ok(!m.isBusy(s, T), 'stopping on purpose releases it too');
}

// Only the control that started it shows as busy.
{
  const s = m.applyTtsState(m.startLoading('verse-3'), 'playing');
  ok(m.isPlaying(s, 'verse-3') && !m.isPlaying(s, T), 'one verse playing does not light up every other Listen button');
  ok(!m.isBusy(s, null) && !m.isBusy(s, undefined), 'and a control with no target is never busy');
}

// Tolerance
{
  ok(m.applyTtsState(undefined, 'playing').speaking === true, 'no prior state is not a crash');
  ok(m.applyTtsState(m.startLoading(T), 'something-else').target === T, 'an unknown event changes nothing');
  ok(m.isBusy(null, T) === false, 'no state means not busy');
}

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll ttsState selftests passed');
