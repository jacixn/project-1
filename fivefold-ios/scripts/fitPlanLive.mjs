#!/usr/bin/env node
// Live proof for Make it fit: sends the screenshot Sunday (plus an urgent
// 4 PM errand) through the real provider chain, then runs the answer
// through the same parse + validate the app uses. Keys come from the
// gitignored ai.config.js and are never printed. Run: npm run test:fit
import { createChain } from '../src/services/aiProviderChain.js';
import { toModel, fixableOverlaps, buildMessages, parsePlanText, validatePlan, cascadePlan, describePlan, hm } from '../src/utils/fitPlan.js';

let keys = {};
try { keys = (await import('../ai.config.js')).AI_CONFIG || {}; } catch { console.log('no ai.config.js, nothing to test live'); process.exit(0); }
const haveKeys = Object.values(keys).some((v) => typeof v === 'string' && v.trim());
if (!haveKeys) { console.log('ai.config.js has no keys, nothing to test live'); process.exit(0); }

const it = (id, kind, title, s, e, movable, type) => ({ id, kind, title, startMin: s, endMin: e, movable, color: '#000', raw: { type } });
const day = [
  it('cal:t', 'eyecandy', 'Trinity Seven', 540, 615, true, 'recurring'),
  it('reminder:e', 'reminder', 'Errand', 960, 1005, true, 'one-time'),
  it('gym:p', 'gym', 'Pull', 960, 1020, true, 'one-time'),
  it('cal:n', 'eyecandySports', 'Newcastle United vs Liverpool', 990, 1110, false, 'one-time'),
  it('prayer:4', 'prayer', '4th Prayer', 1050, 1055, true, 'recurring'),
  it('cal:s', 'eyecandy', 'Solo Leveling', 1065, 1165, true, 'one-time'),
  it('reminder:d', 'reminder', 'eat dinner', 1165, 1185, true, 'recurring'),
  it('reminder:sh', 'reminder', 'take shower', 1185, 1215, true, 'one-time'),
];
const ANCHOR = 'reminder:e';
const model = toModel(day);
console.log(`fixable overlaps: ${fixableOverlaps(model, ANCHOR).length}`);
const messages = buildMessages(model, ANCHOR, 'Sunday');

const chain = createChain({ keys });
const rounds = Number(process.argv[2] || 1);
let failures = 0;
for (let r = 1; r <= rounds; r++) {
  const t0 = Date.now();
  const res = await chain.run({ messages, temperature: 0.2, max_tokens: 700 });
  if (!res) { console.log(`round ${r}: chain exhausted`, chain.status()); failures++; continue; }
  const data = await res.json();
  const text = data.choices[0].message.content;
  const parsed = parsePlanText(text, model);
  const verdict = parsed ? validatePlan(model, parsed, ANCHOR) : { ok: false, reason: 'unparseable' };
  console.log(`round ${r}: ${data._provider} in ${Date.now() - t0} ms -> ${verdict.ok ? 'VALID' : `REJECTED (${verdict.reason})`}`);
  if (parsed) {
    for (const l of describePlan(model, parsed)) console.log(`   ${l.title}: ${hm(l.from)} -> ${hm(l.to)}`);
    console.log(`   note: ${parsed.note}`);
  } else {
    console.log('   raw:', String(text).slice(0, 300).replace(/\n/g, ' '));
  }
  if (!verdict.ok) {
    const c = cascadePlan(model, ANCHOR);
    console.log(`   fallback cascade: ${c.moves.map((m) => `${model.find((x) => x.id === m.id).title} -> ${hm(m.startMin)}`).join(', ')}`);
  }
}
console.log('providers:', Object.entries(chain.status()).map(([k, v]) => `${k}=${v}`).join(' '));
console.log(failures ? `\n${failures} round(s) had no answer` : '\nlive chain answered every round');
