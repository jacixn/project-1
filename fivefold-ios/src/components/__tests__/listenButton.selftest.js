// The Listen control must say it is playing while it is playing.
// Run: node src/components/__tests__/listenButton.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const modal = read('components/PrayerDetailModal.js');

ok(/import \{ IDLE as AUDIO_IDLE, startLoading, applyTtsState, isBusy \} from '\.\.\/utils\/ttsState'/.test(modal),
  'playback state comes from the tested state machine, not five flags that can disagree');
ok(/const startingRef = useRef\(false\)/.test(modal) && /startingRef\.current = true;/.test(modal) && /startingRef\.current = false;/.test(modal),
  'a terminal event during the handover is known to belong to the outgoing clip');
ok(/applyTtsState\(prev, state, \{ starting: startingRef\.current \}\)/.test(modal),
  'and the listener passes that through, which is the whole fix');
ok(!/setIsSpeaking\(|setSpeakingVerseIndex\(|setIsLoadingAudio\(|setLoadingAudioVerseIndex\(|setIsPaused\(/.test(modal),
  'none of the old setters survive to reintroduce the disagreement');
ok(/const isSpeaking = audio\.speaking;/.test(modal) && /const speakingVerseIndex = audio\.speaking \? audio\.target : null;/.test(modal),
  'the existing markup still reads the same names, so the change is contained');
ok(/isBusy\(audio, verseIndex\)/.test(modal), 'tapping the control while it is busy stops it, as before');

// The states the control has to be able to show.
ok(/name=\{isPaused \? 'play-arrow' : 'pause'\}/.test(modal) && /\{isPaused \? 'Resume' : 'Pause'\}/.test(modal),
  'while playing it offers Pause, and Resume once paused');
ok(/name="stop"/.test(modal), 'and a way to stop');
ok(/<ActivityIndicator size=\{14\}/.test(modal) && /Loading\.\.\./.test(modal), 'while it is fetching the audio it says so');

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll Listen button checks passed');
