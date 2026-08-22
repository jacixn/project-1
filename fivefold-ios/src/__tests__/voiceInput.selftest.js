// Locks the chat mic fix. Run: node <this file>
// 1. The mic touch is a native RNGH pan that activates on touch-down (the JS
//    PanResponder got cancelled by the native-stack modal's pull-down pan).
// 2. Failures reach the user (inline status / alert), not only console.log.
// 3. Transcription goes through the provider chain, Google last.
const fs = require('fs');
const path = require('path');
const find = (dir) => (fs.existsSync(path.join(dir, 'src', 'components', 'AiBibleChat.js')) ? dir : find(path.dirname(dir)));
const root = path.join(find(__dirname), 'src');
const chat = fs.readFileSync(path.join(root, 'components', 'AiBibleChat.js'), 'utf8');
const stt = fs.readFileSync(path.join(root, 'services', 'speechToTextService.js'), 'utf8');
const providers = fs.readFileSync(path.join(root, 'services', 'speechProviders.js'), 'utf8');
const code = chat.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

check(!/PanResponder\.create/.test(code) && !/panHandlers/.test(code), 'no JS PanResponder on the mic');
check(/Gesture\.Pan\(\)[\s\S]{0,200}\.activateAfterLongPress\(1\)/.test(code), 'mic is a native RNGH pan activating on touch-down');
check(/\.runOnJS\(true\)/.test(code) && /\.onBegin\(\(\) => onMicDown\(\)\)/.test(code) && /\.onFinalize\(\(\) => onMicUp\(\)\)/.test(code), 'down/up wired to onBegin/onFinalize');
check(/<GestureDetector gesture=\{micGesture\}>/.test(code) && /<GestureHandlerRootView style=\{styles\.micContainer\}>/.test(code), 'GestureDetector mounted inside its own root view');
check(!/setTimeout\(\(\) => \{\s*if \(!isRecordingRef/.test(code) && /speechToTextService\s*\.startRecording\(\{ onLevel/.test(code), 'recorder starts immediately on touch (no 250 ms delay) with a level callback');
check(/decideRelease\(\{ downTs: voiceDownTsRef\.current/.test(code) && /action === 'lock'/.test(code), 'quick tap = hands-free lock, release = stop');
check(/HANDS_FREE_MAX_MS/.test(code), 'hands-free has a safety cap');
check(/voiceStatusText\(result\)/.test(code) && /\{voiceStatus\.text\}/.test(code), 'failures render as an inline status line');
check(/Linking\.openSettings\(\)/.test(code), 'permission denial offers Open Settings');
check(/placeholderFor\(\{ phase: voicePhase, locked: voiceLocked \}\)/.test(code), 'placeholder reflects starting/listening/transcribing');
check(/<LevelBar key=\{i\} level=\{micLevel\}/.test(code), 'level meter bars while listening');
check(!/micPulseRing|micGlowBackdrop/.test(code), 'no halo rings behind the mic icon');
check(/resetVoice\(\);/.test(code) && /useEffect\(\(\) => \(\) => \{[\s\S]{0,200}speechToTextService\.cancelRecording\(\)/.test(code), 'close + unmount drop the recorder');

check(/createSpeechChain\(\{ keys: loadKeys\(\) \}\)/.test(stt), 'service transcribes through the chain');
check(/isMeteringEnabled: true/.test(stt) && /levelFromMetering\(status\.metering\)/.test(stt), 'metering feeds the level meter');
check(/heldMs < MIN_RECORD_MS[\s\S]{0,80}tooShort: true/.test(stt), 'sub-300 ms clips are discarded without a network call');
check(/nothingHeard: true/.test(stt) && /rateLimited: true/.test(stt) && /error: 'permission'/.test(stt), 'distinct failure reasons');
check(!/staysActiveInBackground: true/.test(stt), 'audio mode restored to playback (not background-active)');
const arr = providers.slice(providers.indexOf('SPEECH_PROVIDERS = ['), providers.indexOf('];', providers.indexOf('SPEECH_PROVIDERS = [')));
const order = ["'groq'", "'mistral'", '\n  gemini,', '\n  google,'].map((n) => arr.indexOf(n));
check(order.every((i, k) => i !== -1 && (k === 0 || i > order[k - 1])), 'provider order groq > mistral > gemini > google');
check(/thinkingBudget: 0/.test(providers), 'gemini transcription runs with thinking off');
check(/CALL_TIMEOUT_MS/.test(providers) && /AbortController/.test(providers), 'every provider call has a timeout');
const newBlock = chat.slice(chat.indexOf('Voice input. Hold'), chat.indexOf('const sendMessage = async'));
check(!/[—]/.test(newBlock) && !/[—]/.test(stt) && !/[—]/.test(providers), 'no em dashes in the new code');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
