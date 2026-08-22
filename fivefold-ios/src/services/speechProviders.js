// Rotating speech-to-text chain (same shape as aiProviderChain.js). The app
// used to depend on one Google Speech key, and that key is blocked for the
// Speech API (403 API_KEY_SERVICE_BLOCKED), so every transcription silently
// failed. Now the WAV goes to the first provider that has a key and is not
// cooling down: Groq Whisper, Mistral Voxtral, Gemini (audio understanding),
// then Google Speech last. A bad key / quota (401/402/403) cools a provider
// for an hour, 429 ten minutes, anything else five, and the chain moves on.
//
// Pure: fetch, now and keys are injectable (see scripts/sttChainTest.mjs).
// audio = { file: { uri, name, type } | Blob, base64, mime, durationMs }

const CALL_TIMEOUT_MS = 20000;
const cooldownFor = (status) => (status === 402 || status === 401 || status === 403 ? 3600 : status === 429 ? 600 : 300);

const withTimeout = async (fetchImpl, url, init) => {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS) : null;
  try {
    return await fetchImpl(url, { ...init, signal: ctrl ? ctrl.signal : undefined });
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// Models sometimes wrap the words in quotes or add a trailing period-only
// "no speech" marker; keep the words, drop the dressing.
export const cleanTranscript = (s) => {
  const t = String(s || '').replace(/^\s*["'“”]+|["'“”]+\s*$/g, '').trim();
  return /^[.\s]*$/.test(t) ? '' : t;
};

// OpenAI-shaped multipart /audio/transcriptions (Groq Whisper, Mistral Voxtral).
const whisperCompatible = (name, url, keyName, models) => ({
  name,
  keyName,
  call: async (keys, audio, fetchImpl) => {
    let last = null;
    for (const model of models) {
      const form = new FormData();
      // RN accepts { uri, name, type }; node/browsers want a Blob + filename.
      form.append('file', audio.file, audio.file?.name || 'voice.wav');
      form.append('model', model);
      form.append('response_format', 'json');
      const res = await withTimeout(fetchImpl, url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${keys[keyName]}` },
        body: form,
      });
      // 400/404 = most likely the model name; try the next one.
      if (res.status === 400 || res.status === 404) { last = res; continue; }
      return res;
    }
    return last;
  },
  parse: async (res) => {
    const j = await res.json();
    return typeof j?.text === 'string' ? j.text : null;
  },
});

const gemini = {
  name: 'gemini',
  keyName: 'GEMINI_API_KEY',
  models: ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-2.5-flash-lite'],
  call: async (keys, audio, fetchImpl) => {
    let last = null;
    for (const model of gemini.models) {
      const res = await withTimeout(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Transcribe this audio verbatim. Reply with only the spoken words, no quotes, no commentary, no translation. If there is no speech reply with an empty string.' },
              { inline_data: { mime_type: audio.mime || 'audio/wav', data: audio.base64 } },
            ],
          }],
          generationConfig: { temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      if (res.status === 400 || res.status === 404) { last = res; continue; }
      return res;
    }
    return last;
  },
  parse: async (res) => {
    const j = await res.json();
    const parts = j?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null;
    return parts.filter((p) => !p.thought).map((p) => p.text || '').join('');
  },
};

const google = {
  name: 'google',
  keyName: 'GOOGLE_SPEECH_API_KEY',
  call: async (keys, audio, fetchImpl) =>
    withTimeout(fetchImpl, `https://speech.googleapis.com/v1/speech:recognize?key=${keys.GOOGLE_SPEECH_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          model: (audio.durationMs || 0) <= 20000 ? 'latest_short' : 'latest_long',
          enableAutomaticPunctuation: true,
        },
        audio: { content: audio.base64 },
      }),
    }),
  parse: async (res) => {
    const j = await res.json();
    if (!j || typeof j !== 'object') return null;
    return (j.results || []).map((r) => r.alternatives?.[0]?.transcript || '').join(' ');
  },
};

// Ordered by speed and how generous the free tier is.
export const SPEECH_PROVIDERS = [
  whisperCompatible('groq', 'https://api.groq.com/openai/v1/audio/transcriptions', 'GROQ_API_KEY', ['whisper-large-v3-turbo', 'whisper-large-v3']),
  whisperCompatible('mistral', 'https://api.mistral.ai/v1/audio/transcriptions', 'MISTRAL_API_KEY', ['voxtral-mini-latest', 'voxtral-mini-2507']),
  gemini,
  google,
];

// createSpeechChain({ keys, fetchImpl, now }) -> { transcribe(audio), status() }
// transcribe resolves to { text, provider } | { text: '', silent, provider }
// | { text: '', error: 'unavailable', lastStatus, detail }. Never throws.
export const createSpeechChain = ({ keys = {}, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), now = () => Date.now() } = {}) => {
  const cooling = new Map();
  const enabled = () => SPEECH_PROVIDERS.filter((p) => !!keys[p.keyName]);
  const isCooling = (name) => {
    const until = cooling.get(name);
    if (!until) return false;
    if (until <= now()) { cooling.delete(name); return false; }
    return true;
  };
  const cool = (name, status) => cooling.set(name, now() + cooldownFor(status) * 1000);

  const transcribe = async (audio) => {
    let lastStatus = null;
    let detail = null;
    if (!enabled().length) return { text: '', error: 'noKeys' };
    for (const p of enabled()) {
      if (isCooling(p.name)) continue;
      try {
        const res = await p.call(keys, audio, fetchImpl);
        if (!res || !res.ok) {
          lastStatus = res ? res.status : 500;
          try { detail = res ? (await res.text()).slice(0, 200) : 'no response'; } catch {}
          console.log(`[STT] ${p.name} failed: ${lastStatus} ${detail || ''}`);
          cool(p.name, lastStatus);
          continue;
        }
        const raw = await p.parse(res);
        if (raw === null) { cool(p.name, 500); detail = 'unexpected response shape'; continue; }
        const text = cleanTranscript(raw);
        if (!text) return { text: '', silent: true, provider: p.name };
        return { text, provider: p.name };
      } catch (e) {
        detail = e?.message || String(e);
        console.log(`[STT] ${p.name} threw: ${detail}`);
        cool(p.name, 500);
      }
    }
    return { text: '', error: 'unavailable', lastStatus, detail };
  };

  const status = () => {
    const out = {};
    for (const p of SPEECH_PROVIDERS) out[p.name] = !keys[p.keyName] ? 'no key' : isCooling(p.name) ? 'cooling' : 'ready';
    return out;
  };

  return { transcribe, status };
};

export default createSpeechChain;
