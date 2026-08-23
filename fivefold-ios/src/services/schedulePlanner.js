// Make it fit: ask the app's AI chain for a plan, verify it with the pure
// rules in utils/fitPlan (it may only match or beat the rules' own plan),
// fall back to the rules' plan when the AI is unavailable or wrong. The
// caller shows the plan and applies it only after the user taps Apply.
import productionAiService from './productionAiService';
import {
  toModel, pickAnchor, fixableOverlaps, cascadePlan, validatePlan, buildMessages, parsePlanText, describePlan, staysFor, planSize,
} from '../utils/fitPlan';

// The one-line summary is always ours, built from the rows: the model's
// free text once claimed the new thing itself had moved.
const noteFor = (plan, lines = []) => {
  const n = (plan.moves || []).length + (plan.trims || []).length + (plan.drops || []).length;
  if (!n) return plan.overflow && plan.overflow.length ? 'Nothing close enough to move; see what stays.' : 'Nothing needs to change.';
  const moved = lines.filter((l) => l.action === 'move').map((l) => l.title);
  const cut = lines.filter((l) => l.action === 'trim').map((l) => l.title);
  const gone = lines.filter((l) => l.action === 'drop').map((l) => l.title);
  const list = (arr) => (arr.length <= 2 ? arr.join(' and ') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);
  const parts = [];
  if (moved.length) parts.push(`${list(moved)} ${moved.length === 1 ? 'moves' : 'move'}`);
  if (cut.length) parts.push(`${list(cut)} ${cut.length === 1 ? 'ends early' : 'end early'}`);
  if (gone.length) parts.push(`${list(gone)} ${gone.length === 1 ? 'comes' : 'come'} off today`);
  return `${parts.join('; ')}. The new thing stays where you put it.`;
};

// items: My Week day items; anchorId: the thing just added or moved (stays
// put; when missing, the newest life item in a conflict). Resolves to null
// when nothing fixable overlaps, else { moves, trims, drops, overflow, note,
// source: 'ai' | 'rules', anchorId, lines, stays }.
export const planDay = async (items, { anchorId = null, dayLabel = 'today', ask = null } = {}) => {
  const model = toModel(items);
  const anchor = pickAnchor(model, anchorId);
  if (!fixableOverlaps(model, anchor).length) return null;
  const base = cascadePlan(model, anchor);
  // An overlap nothing can fix (the new thing against something fixed) is
  // not a plan; say nothing rather than offer zero changes.
  if (!planSize(base)) return null;

  let plan = null;
  try {
    const messages = buildMessages(model, anchor, dayLabel);
    const text = await (ask ? ask(messages) : productionAiService.rawChat(messages, { temperature: 0.2, max_tokens: 800 }));
    const parsed = parsePlanText(text, model);
    const any = parsed && (parsed.moves.length || parsed.trims.length || parsed.drops.length);
    if (any && validatePlan(model, parsed, anchor, base).ok) {
      plan = { moves: parsed.moves, trims: parsed.trims, drops: parsed.drops, overflow: base.overflow, source: 'ai' };
    }
  } catch {}

  if (!plan) plan = { moves: base.moves, trims: base.trims, drops: base.drops, overflow: base.overflow, source: 'rules' };
  const lines = describePlan(model, plan);
  return { ...plan, note: noteFor(plan, lines), anchorId: anchor, lines, stays: staysFor(model, anchor, plan) };
};

export default planDay;
