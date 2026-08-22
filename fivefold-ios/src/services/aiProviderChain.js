// Rotating LLM provider chain for Biblely (port of EyeCandy's worker chain,
// adapted to this app's direct-from-device architecture). Every provider
// speaks the OpenAI chat dialect, so callers keep the existing contract:
// an object with .ok / .status / .json() / .text() whose JSON is
// { choices: [{ message: { content } }] }.
//
// Keys come from the gitignored ai.config.js (see ai.config.example.js);
// a provider is in the chain only when its key exists, so keys can be added
// one at a time. Failures (402 out of credit, 401/403 bad key, 429 rate
// limit, 5xx, timeout) put that provider on an in-memory cooldown and the
// chain moves on. Each provider carries an ordered model list: a 400/404
// (renamed or retired model) falls through to the next name instead of
// killing the provider.
//
// Pure: fetch, now and keys are injectable (see scripts/aiChainTest.mjs).

const CALL_TIMEOUT_MS = 18000;
const cooldownFor = (status) => (status === 402 || status === 401 || status === 403 ? 3600 : status === 429 ? 600 : 300);

const openaiCompatible = (name, url, keyName, models, extraHeaders = {}) => ({
  name,
  keyName,
  call: async (keys, body, fetchImpl) => {
    let last = null;
    for (const model of models) {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS) : null;
      try {
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys[keyName]}`, ...extraHeaders },
          body: JSON.stringify({ ...body, model, stream: false }),
          signal: ctrl ? ctrl.signal : undefined,
        });
        // 400/404 = most likely the model name; try the next one. Anything
        // else is the provider's state, not the model's — stop here.
        if (res.status === 400 || res.status === 404) { last = res; continue; }
        return res;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    return last;
  },
});

// Ordered by answer quality, then by how generous the free tier is.
export const PROVIDERS = [
  openaiCompatible('groq', 'https://api.groq.com/openai/v1/chat/completions', 'GROQ_API_KEY', ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b']),
  openaiCompatible('cerebras', 'https://api.cerebras.ai/v1/chat/completions', 'CEREBRAS_API_KEY', ['llama-3.3-70b', 'llama3.1-8b', 'gpt-oss-120b']),
  openaiCompatible('sambanova', 'https://api.sambanova.ai/v1/chat/completions', 'SAMBANOVA_API_KEY', ['Meta-Llama-3.3-70B-Instruct', 'Meta-Llama-3.1-8B-Instruct', 'Llama-4-Maverick-17B-128E-Instruct']),
  openaiCompatible('deepseek', 'https://api.deepseek.com/chat/completions', 'DEEPSEEK_API_KEY', ['deepseek-chat', 'deepseek-v3']),
  openaiCompatible('openrouter', 'https://openrouter.ai/api/v1/chat/completions', 'OPENROUTER_API_KEY', ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free', 'mistralai/mistral-small-3.1-24b-instruct:free'], {
    'HTTP-Referer': 'https://biblely.app',
    'X-Title': 'Biblely',
  }),
  openaiCompatible('mistral', 'https://api.mistral.ai/v1/chat/completions', 'MISTRAL_API_KEY', ['mistral-small-latest', 'open-mistral-nemo', 'mistral-medium-latest']),
  openaiCompatible('github', 'https://models.inference.ai.azure.com/chat/completions', 'GITHUB_MODELS_TOKEN', ['gpt-4o-mini', 'Meta-Llama-3.1-8B-Instruct', 'Phi-4']),
  openaiCompatible('huggingface', 'https://router.huggingface.co/v1/chat/completions', 'HF_API_KEY', ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'mistralai/Mistral-7B-Instruct-v0.3']),
  openaiCompatible('cohere', 'https://api.cohere.com/compatibility/v1/chat/completions', 'COHERE_API_KEY', ['command-r', 'command-r7b-12-2024', 'command-a-03-2025']),
];

// Wrap OpenAI-shaped JSON into the response contract the app's callers use.
const shaped = (data, provider) => {
  const json = { ...data, _provider: provider };
  return { ok: true, status: 200, json: async () => json, text: async () => JSON.stringify(json) };
};

// createChain({ keys, fetchImpl, now }) -> { run(body), status() }
//   keys:      { GROQ_API_KEY, ... } (missing/empty = provider disabled)
//   body:      OpenAI chat body ({ messages, temperature, max_tokens, ... })
export const createChain = ({ keys = {}, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null), now = () => Date.now() } = {}) => {
  const cooling = new Map(); // name -> untilMs

  const enabled = () => PROVIDERS.filter((p) => !!keys[p.keyName]);
  const isCooling = (name) => {
    const until = cooling.get(name);
    if (!until) return false;
    if (until <= now()) { cooling.delete(name); return false; }
    return true;
  };
  const cool = (name, status) => cooling.set(name, now() + cooldownFor(status) * 1000);

  const run = async (body) => {
    for (const p of enabled()) {
      if (isCooling(p.name)) continue;
      try {
        const res = await p.call(keys, body, fetchImpl);
        if (!res || !res.ok) { cool(p.name, res ? res.status : 500); continue; }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || !content.trim()) { cool(p.name, 500); continue; }
        return shaped(data, p.name);
      } catch (e) {
        cool(p.name, 500);
      }
    }
    return null;
  };

  const status = () => {
    const out = {};
    for (const p of PROVIDERS) out[p.name] = !keys[p.keyName] ? 'no key' : isCooling(p.name) ? 'cooling' : 'ready';
    return out;
  };

  return { run, status };
};

export default createChain;
