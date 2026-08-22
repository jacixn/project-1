#!/usr/bin/env node
// Speech-to-text chain proof. Offline: mocked providers, checks failover,
// model fall-through, cooldowns, silence handling. Live (optional):
//   npm run test:stt -- --live path/to/16k-mono.wav
// sends a real WAV through the real chain with the keys from the gitignored
// config files (values are never printed).
import fs from 'fs';
import path from 'path';
import { createSpeechChain, cleanTranscript } from '../src/services/speechProviders.js';
import { decideRelease, levelFromMetering, voiceStatusText, placeholderFor, TAP_MAX_MS } from '../src/utils/voiceInput.js';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// ---- pure helpers -------------------------------------------------------
check(decideRelease({ downTs: 0, upTs: TAP_MAX_MS - 1, locked: false }) === 'lock', 'quick tap -> hands-free lock');
check(decideRelease({ downTs: 0, upTs: 900, locked: false }) === 'stop', 'held release -> stop and transcribe');
check(decideRelease({ downTs: 0, upTs: 50, locked: true }) === 'stop', 'tap while locked -> stop');
check(levelFromMetering(-160) === 0 && levelFromMetering(0) === 1 && levelFromMetering(undefined) === 0, 'metering dB -> 0..1');
check(levelFromMetering(-27.5) > 0.45 && levelFromMetering(-27.5) < 0.55, 'speech-level dB lands mid meter');
check(voiceStatusText({ success: true, text: 'hi' }) === null, 'success -> no status');
check(voiceStatusText({ success: false, tooShort: true }).tone === 'warn', 'too short -> inline warning');
check(voiceStatusText({ success: false, error: 'permission' }).alert === 'permission', 'permission -> alert');
check(voiceStatusText({ success: false, error: 'unavailable', status: 403 }).text.includes('403'), 'provider failure shows the status code');
check(placeholderFor({ phase: 'recording', locked: true }).includes('tap'), 'hands-free placeholder says tap to stop');
check(cleanTranscript('"Hello there."') === 'Hello there.' && cleanTranscript(' . ') === '', 'transcript cleaning');

// ---- offline chain ------------------------------------------------------
let t = 1_000_000;
const now = () => t;
const calls = [];
const script = { 'api.groq.com': 403, 'api.mistral.ai': 200, 'generativelanguage.googleapis.com': 200, 'speech.googleapis.com': 403 };
let geminiRetiredOnce = true;
const fetchImpl = async (url, init) => {
  const u = new URL(url);
  const host = u.host;
  let model = '';
  if (init.body instanceof FormData) model = init.body.get('model');
  else if (host.includes('generativelanguage')) model = u.pathname.split('/models/')[1].split(':')[0];
  calls.push(`${host}[${model}]`);
  let status = script[host] ?? 200;
  if (host.includes('generativelanguage') && geminiRetiredOnce) { geminiRetiredOnce = false; status = 404; }
  let body;
  if (status !== 200) body = { error: { code: status, message: 'nope' } };
  else if (host.includes('generativelanguage')) body = { candidates: [{ content: { parts: [{ text: '"Gemini heard you."' }] } }] };
  else if (host.includes('speech.googleapis')) body = { results: [{ alternatives: [{ transcript: 'google heard you' }] }] };
  else body = { text: ` ${host} heard you ` };
  return { ok: status === 200, status, json: async () => body, text: async () => JSON.stringify(body) };
};
const keys = { GROQ_API_KEY: 'x', MISTRAL_API_KEY: 'x', GEMINI_API_KEY: 'x', GOOGLE_SPEECH_API_KEY: 'x' };
const audio = { file: new Blob([new Uint8Array(4000)], { type: 'audio/wav' }), base64: 'AAAA', mime: 'audio/wav', durationMs: 1500 };
const chain = createSpeechChain({ keys, fetchImpl, now });

const r1 = await chain.transcribe(audio);
check(r1.provider === 'mistral' && r1.text === 'api.mistral.ai heard you', `groq 403 skipped, answered by ${r1.provider} (${JSON.stringify(r1.text)})`);
check(calls[0].startsWith('api.groq.com[whisper-large-v3-turbo]'), 'groq tried first with its primary model');

calls.length = 0;
const r2 = await chain.transcribe(audio);
check(r2.provider === 'mistral' && !calls.some((c) => c.startsWith('api.groq')), 'cooling groq skipped on the next call');

script['api.mistral.ai'] = 500;
calls.length = 0;
const r3 = await chain.transcribe(audio);
check(r3.provider === 'gemini' && r3.text === 'Gemini heard you.', 'mistral 500 -> gemini answers, quotes stripped');
check(calls.filter((c) => c.includes('generativelanguage')).length === 2, 'retired gemini model name fell through to the next model');

script['generativelanguage.googleapis.com'] = 500;
calls.length = 0;
const r4 = await chain.transcribe(audio);
check(r4.error === 'unavailable' && r4.lastStatus === 403 && !calls.some((c) => c.startsWith('api.mistral')), 'everything dead -> unavailable with the last status, cooling providers skipped');

t += 6 * 60 * 1000; // 6 min: 500-cooldowns (5m) expire, 403 (1h) still on
calls.length = 0;
script['api.mistral.ai'] = 200;
const r5 = await chain.transcribe(audio);
check(r5.provider === 'mistral' && !calls.some((c) => c.startsWith('api.groq')), 'cooldowns expire on their own schedule');

const silentFetch = async () => ({ ok: true, status: 200, json: async () => ({ text: '' }), text: async () => '{}' });
const r6 = await createSpeechChain({ keys: { GROQ_API_KEY: 'x' }, fetchImpl: silentFetch, now }).transcribe(audio);
check(r6.silent === true && r6.provider === 'groq', 'empty transcript -> silent (no pointless fallthrough)');
const r7 = await createSpeechChain({ keys: {}, fetchImpl, now }).transcribe(audio);
check(r7.error === 'noKeys', 'no keys -> noKeys');
const throwing = async () => { throw new Error('boom'); };
const r8 = await createSpeechChain({ keys: { GROQ_API_KEY: 'x' }, fetchImpl: throwing, now }).transcribe(audio);
check(r8.error === 'unavailable' && r8.detail === 'boom', 'thrown fetch -> unavailable, never rejects');
const st = chain.status();
check(st.groq === 'cooling' && st.mistral === 'ready', 'status map: cooling / ready');

// ---- live ---------------------------------------------------------------
const liveIdx = process.argv.indexOf('--live');
if (liveIdx !== -1) {
  const wavPath = process.argv[liveIdx + 1];
  const read = (f) => { try { return fs.readFileSync(path.resolve(f), 'utf8'); } catch { return ''; } };
  const pick = (src, name) => { const m = src.match(new RegExp(name + String.raw`\s*:\s*['"]([^'"]+)['"]`)); return m && m[1] ? m[1] : null; };
  const ai = read('ai.config.js');
  const liveKeys = {
    GROQ_API_KEY: pick(ai, 'GROQ_API_KEY'),
    MISTRAL_API_KEY: pick(ai, 'MISTRAL_API_KEY'),
    GEMINI_API_KEY: pick(read('gemini.config.js'), 'apiKey'),
    GOOGLE_SPEECH_API_KEY: pick(read('googleTts.config.js'), 'apiKey'),
  };
  const wav = fs.readFileSync(wavPath);
  const liveAudio = { file: new Blob([wav], { type: 'audio/wav' }), base64: wav.toString('base64'), mime: 'audio/wav', durationMs: 4000 };
  for (const only of ['groq', 'mistral', 'gemini', 'google']) {
    const k = {}; for (const [name, v] of Object.entries(liveKeys)) if (name.toLowerCase().startsWith(only === 'google' ? 'google_speech' : only)) k[name] = v;
    if (!Object.values(k).some(Boolean)) { console.log(`LIVE ${only}: no key`); continue; }
    const t0 = Date.now();
    const r = await createSpeechChain({ keys: k }).transcribe(liveAudio);
    console.log(`LIVE ${only}: ${Date.now() - t0}ms ->`, r.text ? JSON.stringify(r.text) : JSON.stringify({ error: r.error, status: r.lastStatus, silent: r.silent }));
    if (only !== 'google') check(!!r.text, `live ${only} transcribed the WAV`);
  }
  const t0 = Date.now();
  const full = await createSpeechChain({ keys: liveKeys }).transcribe(liveAudio);
  check(!!full.text, `live full chain answered via ${full.provider} in ${Date.now() - t0}ms: ${JSON.stringify(full.text)}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
