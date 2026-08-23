// A day template takes the day over: when the day has template blocks, other
// things that mean the same (the "Work" event in the Work calendar, the "Eat
// breakfast" reminder next to the "Breakfast" block) step aside for that day,
// so nothing shows or counts twice. Pure; same file in Biblely and EyeCandy.
//
// Items: { kind, title, raw }. A block is kind 'block' (Biblely) or a Biblely
// calendar event whose raw.biblelyKind is 'block' (EyeCandy). Prayers,
// EyeCandy's own slots and sports are never taken over.

const STOP = /^(eat|have|do|go to|go|take|make|get|start|finish)\s+/;
export const normTitle = (t) => String(t || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(STOP, '')
  .replace(/\s+(time|break|block|session|hour)$/, '')
  .trim();

// A calendar event tagged as a template block (the user's own "Work" event
// standing in for the Work block) counts as a block too.
export const isBlockItem = (it) => !!it && (it.kind === 'block' || !!(it.raw && it.raw.templateBlock) || (it.kind === 'biblely' && it.raw && it.raw.biblelyKind === 'block'));

const protectedKind = (it) => it.kind === 'prayer' || it.kind === 'eyecandy' || it.kind === 'eyecandySports'
  || (it.kind === 'biblely' && it.raw && it.raw.biblelyKind === 'prayer');

// Same thing? Exact after normalising, or one is the other plus words
// ("breakfast" vs "eat breakfast", "work" vs "work from home").
export const sameThing = (a, b) => {
  const x = normTitle(a); const y = normTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const wx = x.split(' '); const wy = y.split(' ');
  const [short, long] = wx.length <= wy.length ? [wx, wy] : [wy, wx];
  return short.every((w) => long.includes(w));
};

// Drop everything a block stands in for. Returns a new list.
export const applyTakeover = (items) => {
  const list = items || [];
  const blocks = list.filter(isBlockItem);
  if (!blocks.length) return list;
  return list.filter((it) => isBlockItem(it) || protectedKind(it) || !blocks.some((b) => sameThing(b.title, it.title)));
};

// The same thing kept twice: a Biblely reminder ("Social Media time") and
// the user's own iPhone Calendar event with the same name at the same time.
// Biblely shows its reminder and hides the event; EyeCandy shows the event
// and hides Biblely's mirror of the reminder. One thing, once, in both.
const overlaps = (a, b) => a.startMin < b.endMin && b.startMin < a.endMin;
export const dedupeMirrors = (items) => {
  const list = items || [];
  return list.filter((it) => {
    if (it.kind === 'calendar' && !(it.raw && it.raw.templateBlock)) {
      return !list.some((o) => (o.kind === 'reminder' || o.kind === 'task' || o.kind === 'gym') && overlaps(o, it) && sameThing(o.title, it.title));
    }
    if (it.kind === 'biblely' && !isBlockItem(it)) {
      return !list.some((o) => o.kind === 'calendar' && overlaps(o, it) && sameThing(o.title, it.title));
    }
    return true;
  });
};

// For busy lists ({ title, source }): same rule by titles.
export const takeoverTitles = (entries, blockTitles) => {
  if (!blockTitles || !blockTitles.length) return entries || [];
  return (entries || []).filter((e) => e.source === 'block' || e.source === 'prayer' || !blockTitles.some((t) => sameThing(t, e.title)));
};
