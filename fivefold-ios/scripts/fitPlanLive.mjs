#!/usr/bin/env node
// Live proof for Make it fit: sends the screenshot Sunday (plus an urgent
// 4 PM errand) through the real provider chain, then runs the answer
// through the same parse + validate the app uses. Keys come from the
// gitignored ai.config.js and are never printed. Run: npm run test:fit
import { createChain } from '../src/services/aiProviderChain.js';
import { toModel, pickAnchor, fixableOverlaps, buildMessages, parsePlanText, validatePlan, cascadePlan, describePlan, hm } from '../src/utils/fitPlan.js';

let keys = {};
try { keys = (await import('../ai.config.js')).AI_CONFIG || {}; } catch { console.log('no ai.config.js, nothing to test live'); process.exit(0); }
const haveKeys = Object.values(keys).some((v) => typeof v === 'string' && v.trim());
if (!haveKeys) { console.log('ai.config.js has no keys, nothing to test live'); process.exit(0); }

const it = (id, kind, title, s, e, movable, type, extra = {}) => ({ id, kind, title, startMin: s, endMin: e, movable, color: '#000', raw: { type, ...extra } });
const T = (h, m = 0) => h * 60 + m;
// The real Sunday from the screenshots, haircut just added at 2 PM.
const day = [
  it('reminder:bf', 'reminder', 'Eat breakfast', T(8, 10), T(8, 30), true, 'recurring', { createdAt: '2026-06-01T00:00:00Z' }),
  it('prayer:1', 'prayer', '1st Prayer', T(8, 25), T(8, 30), true, 'recurring'),
  it('cal:tr', 'eyecandy', 'Trinity Seven', T(9), T(10, 15), true, 'recurring'),
  it('cal:lnd', 'eyecandy', 'Love Next Door', T(11, 5), T(12, 5), true, 'one-time'),
  it('cal:fc', 'eyecandy', 'EA SPORTS FC 26', T(12, 5), T(14, 5), true, 'one-time'),
  it('prayer:3', 'prayer', '3rd Prayer', T(13), T(13, 5), true, 'recurring'),
  it('reminder:hc', 'reminder', 'Haircut', T(14), T(15), true, 'one-time', { createdAt: '2026-08-23T11:50:00Z' }),
  it('reminder:l', 'reminder', 'eat lunch', T(14), T(14, 20), true, 'recurring', { createdAt: '2026-06-01T00:00:00Z' }),
  it('cal:mc', 'eyecandySports', 'Manchester City vs AFC Bournemouth', T(14), T(16), false, 'one-time'),
  it('cal:fp', 'eyecandy', 'FragPunk', T(14, 20), T(15, 50), true, 'one-time'),
  it('gym:p', 'gym', 'Pull', T(16), T(17), true, 'one-time', { createdAt: '2026-08-20T00:00:00Z' }),
  it('cal:nl', 'eyecandySports', 'Newcastle United vs Liverpool', T(16, 30), T(18, 30), false, 'one-time'),
  it('cal:sl', 'eyecandy', 'Solo Leveling', T(17, 45), T(19, 25), true, 'one-time'),
  it('reminder:d', 'reminder', 'eat dinner', T(19, 25), T(19, 45), true, 'recurring', { createdAt: '2026-06-01T00:00:00Z' }),
  it('cal:st', 'eyecandySports', 'Stade Rennais vs Paris Saint-Germain', T(19, 45), T(21, 45), false, 'one-time'),
  it('cal:to', 'eyecandySports', 'Torino vs AC Milan', T(19, 45), T(21, 45), false, 'one-time'),
  it('reminder:sh', 'reminder', 'take shower', T(19, 45), T(20, 15), true, 'one-time', { createdAt: '2026-08-21T00:00:00Z' }),
  it('reminder:sm', 'reminder', 'Social Media time', T(20), T(21), true, 'one-time', { createdAt: '2026-08-21T00:00:00Z' }),
  it('cal:cj', 'eyecandy', 'Candy Jar', T(20, 15), T(21, 50), true, 'one-time'),
  it('cal:el', 'eyecandySports', 'Elche vs Barcelona', T(20, 30), T(22, 30), false, 'one-time'),
];
const model = toModel(day);
const ANCHOR = pickAnchor(model);
console.log(`anchor: ${model.find((m) => m.id === ANCHOR)?.title}; fixable overlaps: ${fixableOverlaps(model, ANCHOR).length}`);
const base = cascadePlan(model, ANCHOR);
const show = (plan) => describePlan(model, plan).map((r) => `${r.title}: ${r.action === 'drop' ? 'skip' : r.action === 'trim' ? `${hm(r.to)}-${hm(r.endTo)}` : hm(r.to)}`).join(' | ');
console.log('rules plan:', show(base), '| left:', base.overflow.join(', ') || 'none');
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
  const verdict = parsed ? validatePlan(model, parsed, ANCHOR, base) : { ok: false, reason: 'unparseable' };
  console.log(`round ${r}: ${data._provider} in ${Date.now() - t0} ms -> ${verdict.ok ? 'VALID' : `REJECTED (${verdict.reason}), rules plan used`}`);
  if (parsed) {
    console.log('   ai plan:', show(parsed));
    console.log(`   note: ${parsed.note}`);
  } else {
    console.log('   raw:', String(text).slice(0, 300).replace(/\n/g, ' '));
  }
}
console.log('providers:', Object.entries(chain.status()).map(([k, v]) => `${k}=${v}`).join(' '));
console.log(failures ? `\n${failures} round(s) had no answer` : '\nlive chain answered every round');
