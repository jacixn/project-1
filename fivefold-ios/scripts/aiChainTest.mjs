#!/usr/bin/env node
// Offline failover proof for src/services/aiProviderChain.js. Run: npm run test:ai
import { createChain } from '../src/services/aiProviderChain.js';

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

let t = 1_000_000;
const now = () => t;
const calls = [];
const script = { 'api.groq.com': 402, 'api.cerebras.ai': 500, 'api.sambanova.ai': 200, 'api.deepseek.com': 200 };
let staleOnce = true;
const fetchImpl = async (url, init) => {
  const host = new URL(url).host;
  const model = JSON.parse(init.body).model;
  calls.push(`${host}[${model}]`);
  let status = script[host] ?? 200;
  if (host === 'api.sambanova.ai' && staleOnce) { staleOnce = false; status = 404; } // retired model name
  const body = status === 200 ? { choices: [{ message: { role: 'assistant', content: `hello from ${host}` } }] } : { error: 'nope' };
  return { ok: status === 200, status, json: async () => body, text: async () => JSON.stringify(body) };
};
const keys = { GROQ_API_KEY: 'x', CEREBRAS_API_KEY: 'x', SAMBANOVA_API_KEY: 'x', DEEPSEEK_API_KEY: 'x' };
const chain = createChain({ keys, fetchImpl, now });
const body = { messages: [{ role: 'user', content: 'hi' }] };

const r1 = await chain.run(body);
const j1 = await r1.json();
check(j1._provider === 'sambanova', `402 + 500 skipped, answered by ${j1._provider}`);
check(calls.some((c) => c.startsWith('api.sambanova.ai[Meta-Llama-3.3')) && calls.some((c) => c.startsWith('api.sambanova.ai[Meta-Llama-3.1')), 'retired model name fell through to the next model');
check(r1.ok && r1.status === 200 && typeof r1.text === 'function', 'response keeps the app\'s ok/status/json/text contract');

calls.length = 0;
const r2 = await chain.run(body);
check((await r2.json())._provider === 'sambanova' && !calls.some((c) => c.startsWith('api.groq') || c.startsWith('api.cerebras')), 'cooling providers skipped on the next call');

t += 11 * 60 * 1000; // 11 min later: 500-cooldown (5m) expired, 402-cooldown (1h) still on
calls.length = 0;
await chain.run(body);
check(calls.some((c) => c.startsWith('api.cerebras')) && !calls.some((c) => c.startsWith('api.groq')), 'cooldowns expire on their own schedule (5m back, 1h still cooling)');

for (const h of Object.keys(script)) script[h] = 500;
const r3 = await chain.run(body);
check(r3 === null, 'every provider dead -> null (caller falls back to its last-resort path)');
const st = chain.status();
check(st.groq === 'cooling' && st.mistral === 'no key', 'status map: cooling / no key');

console.log(failures ? `\n=== ${failures} FAILED ===` : '\n=== all passed ===');
process.exit(failures ? 1 : 0);
