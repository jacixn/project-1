// The Listen control must say it is playing while it is playing.
// Run: node src/components/__tests__/listenButton.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const ok = (c, msg) => { if (c) console.log(`  PASS ${msg}`); else { console.log(`  FAIL ${msg}`); fails++; } };

const modal = read('components/PrayerDetailModal.js');
const sheet = modal;

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

// Guide and Coach have their own Listen button, which had the same bug.
const chat = read('components/AiBibleChat.js');
ok(/import \{ IDLE as AUDIO_IDLE, startLoading, applyTtsState, isBusy \} from '\.\.\/utils\/ttsState'/.test(chat),
  'the chat Listen button uses the same tested state machine');
ok(/const startingRef = useRef\(false\)/.test(chat) && /applyTtsState\(prev, state, \{ starting: startingRef\.current \}\)/.test(chat),
  'including the guard for the handover, which is what left it looking idle');
ok(!/setIsSpeaking\(|setSpeakingMessageId\(|setIsLoadingAudio\(|setLoadingAudioMessageId\(/.test(chat),
  'and none of the old setters survive');
ok(/isBusy\(audio, messageId\)/.test(chat), 'tapping it again stops that message');

// One callback slot shared by three owners meant the last to mount silenced
// the rest, which is why fixing one screen did not fix the others.
for (const [name, src] of [['the prayer card', sheet], ['the chat', chat]]) {
  ok(/chatterboxService\.subscribe\(/.test(src) && /googleTtsService\.subscribe\(/.test(src),
    `${name} subscribes to playback state rather than seizing the single slot`);
  ok(!/chatterboxService\.onStateChange = /.test(src),
    `${name} no longer overwrites it`);
}
for (const svc of ['services/chatterboxService.js', 'services/googleTtsService.js']) {
  const src = read(svc);
  ok(/subscribe\(fn\) \{/.test(src) && /this\._listeners\.add\(fn\)/.test(src), `${svc} hands out subscriptions`);
  ok(/for \(const fn of \[\.\.\.this\._listeners\]\)/.test(src),
    `${svc} tells every listener, over a copy so one can unsubscribe mid-walk`);
  ok(/if \(this\.onStateChange\)/.test(src), `${svc} still serves the one internal user of the old slot`);
}

if (fails) { console.log(`\n${fails} FAILED`); process.exit(1); }
console.log('\nAll Listen button checks passed');
