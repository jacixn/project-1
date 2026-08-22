// Right after something is added or moved, look at its day and, if it
// lands on other things, offer the plan on the spot (AI proposes, the rules
// in utils/fitPlan verify). One alert, plain words, nothing moves without a
// tap. My Week has its own richer panel; this is for every other editor.
import { Alert } from 'react-native';
import { loadDayItems, fmtClock, minToTime } from '../utils/dayItems';
import { dateKeyOf } from '../utils/dayBusy';
import { planDay } from './schedulePlanner';
import { moveItem } from './rescheduleItem';

const parseKey = (k) => {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

// Next date a repeating item fires on: today if its weekday matches and the
// time is still ahead, else the next matching weekday. `days` = getDay() ints.
export const nextDateFor = (days, time, from = new Date()) => {
  const list = Array.isArray(days) && days.length ? days : [0, 1, 2, 3, 4, 5, 6];
  const [h, m] = String(time || '08:00').split(':').map(Number);
  for (let i = 0; i < 8; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, h || 0, m || 0, 0, 0);
    if (!list.includes(d.getDay())) continue;
    if (i === 0 && d.getTime() <= from.getTime()) continue;
    return dateKeyOf(d);
  }
  return dateKeyOf(from);
};

// The alert body: each move on its own line, then what stays and why.
export const offerText = (plan, anchorId) => {
  const moves = plan.lines.map((l) => `${l.title}: ${fmtClock(l.from)} to ${fmtClock(l.to)}${l.todayOnly ? ' (this day only)' : ''}`);
  const stays = plan.stays.filter((s) => s.id !== anchorId).map((s) => `${s.title} stays, ${s.why}`);
  return [plan.note, '', ...moves, ...(stays.length ? ['', ...stays] : [])].join('\n');
};

// anchorId: dayItems id of the thing just saved ('reminder:<id>', 'task:<id>',
// 'gym:<id>'); date: 'YYYY-MM-DD' or Date. Resolves to how many things moved.
export const offerFit = async ({ anchorId, date, onDone }) => {
  try {
    const day = date instanceof Date ? date : parseKey(date);
    const items = await loadDayItems(day);
    const anchor = items.find((i) => i.id === anchorId);
    if (!anchor) return 0;
    const today = dateKeyOf(new Date()) === dateKeyOf(day);
    const plan = await planDay(items, { anchorId, dayLabel: today ? 'today' : day.toLocaleDateString('en', { weekday: 'long' }) });
    if (!plan || !plan.lines.length) return 0;
    const key = dateKeyOf(day);
    return await new Promise((resolve) => {
      Alert.alert(
        `${anchor.title} lands on other things`,
        offerText(plan, anchorId),
        [
          { text: 'Leave it', style: 'cancel', onPress: () => resolve(0) },
          {
            text: plan.lines.length === 1 ? 'Move it' : `Move ${plan.lines.length}`,
            onPress: async () => {
              let n = 0;
              for (const mv of plan.moves) {
                const it = items.find((i) => i.id === mv.id);
                const line = plan.lines.find((l) => l.id === mv.id);
                if (!it) continue;
                try {
                  if (await moveItem(it, { time: minToTime(mv.startMin), date: key, from: key, todayOnly: !!(line && line.todayOnly) })) n++;
                } catch {}
              }
              try { onDone && onDone(n); } catch {}
              resolve(n);
            },
          },
        ],
      );
    });
  } catch {
    return 0;
  }
};

export default offerFit;
