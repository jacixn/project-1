// Make it fit: ask the app's AI chain for a plan, verify it with the pure
// rules in utils/fitPlan (it may only match or beat the rules' own plan),
// fall back to the rules' plan when the AI is unavailable or wrong. The
// caller shows the plan and applies it only after the user taps Apply.
import productionAiService from './productionAiService';
import {
  toModel, pickAnchor, fixableOverlaps, cascadePlan, validatePlan, buildMessages, parsePlanText, describePlan, staysFor,
} from '../utils/fitPlan';

const noteFor = (plan) => {
  const n = (plan.moves || []).length + (plan.trims || []).length + (plan.drops || []).length;
  if (!n) return plan.overflow && plan.overflow.length ? 'Nothing close enough to move; see what stays.' : 'Nothing needs to change.';
  return 'Smallest changes that clear the day.';
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

  let plan = null;
  try {
    const messages = buildMessages(model, anchor, dayLabel);
    const text = await (ask ? ask(messages) : productionAiService.rawChat(messages, { temperature: 0.2, max_tokens: 800 }));
    const parsed = parsePlanText(text, model);
    const any = parsed && (parsed.moves.length || parsed.trims.length || parsed.drops.length);
    if (any && validatePlan(model, parsed, anchor, base).ok) {
      plan = { moves: parsed.moves, trims: parsed.trims, drops: parsed.drops, overflow: base.overflow, note: parsed.note || noteFor(parsed), source: 'ai' };
    }
  } catch {}

  if (!plan) plan = { moves: base.moves, trims: base.trims, drops: base.drops, overflow: base.overflow, note: noteFor(base), source: 'rules' };
  return { ...plan, anchorId: anchor, lines: describePlan(model, plan), stays: staysFor(model, anchor) };
};

export default planDay;
