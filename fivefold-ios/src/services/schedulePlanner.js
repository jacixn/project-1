// Make it fit: ask the app's AI chain for a plan, verify it with the pure
// rules in utils/fitPlan, fall back to the deterministic cascade when the
// AI is unavailable or proposes something the rules reject. The caller
// shows the plan and applies it through rescheduleItem.moveItem only after
// the user taps Apply.
import productionAiService from './productionAiService';
import {
  toModel, fixableOverlaps, cascadePlan, validatePlan, buildMessages, parsePlanText, describePlan, staysFor,
} from '../utils/fitPlan';

const RULES_NOTE = 'Later things slide down to the next free time.';

// items: My Week day items; anchorId: the item that was just added or moved
// (it stays put). Resolves to null when nothing fixable overlaps, else
// { moves, overflow, note, source: 'ai' | 'rules', lines, stays }.
export const planDay = async (items, { anchorId = null, dayLabel = 'today', ask = null } = {}) => {
  const model = toModel(items);
  if (!fixableOverlaps(model, anchorId).length) return null;

  let plan = null;
  try {
    const messages = buildMessages(model, anchorId, dayLabel);
    const text = await (ask ? ask(messages) : productionAiService.rawChat(messages, { temperature: 0.2, max_tokens: 700 }));
    const parsed = parsePlanText(text, model);
    if (parsed && parsed.moves.length && validatePlan(model, parsed, anchorId).ok) {
      plan = { moves: parsed.moves, overflow: [], note: parsed.note || RULES_NOTE, source: 'ai' };
    }
  } catch {}

  if (!plan) {
    const c = cascadePlan(model, anchorId);
    plan = { moves: c.moves, overflow: c.overflow, note: c.moves.length ? RULES_NOTE : 'Nothing movable fits before midnight.', source: 'rules' };
  }
  return { ...plan, lines: describePlan(model, plan), stays: staysFor(model, anchorId) };
};

export default planDay;
