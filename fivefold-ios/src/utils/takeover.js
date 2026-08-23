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

// A templated day holds what the template says, nothing else from the
// routine: repeating reminders and repeating events from other calendars
// that are not in the template step aside for that day. Everything else is
// a plan of its own and stays, unless the template says that group steps
// aside too (`hide`: prayers, workouts, oneOffs, eyecandy, sports).
// `keep` = the template's block titles.
export const DAY_GROUPS = ['prayers', 'workouts', 'oneOffs', 'eyecandy', 'sports'];
export const GROUP_LABELS = { prayers: 'Prayers', workouts: 'Workouts', oneOffs: 'One-off things (tasks, appointments)', eyecandy: 'EyeCandy: shows, films, anime, manga, books, comics, games', sports: 'Matches' };
const isRepeatingRoutine = (it) => {
  const raw = it.raw || {};
  if (raw.templateBlock || isBlockItem(it)) return false;
  if (it.kind === 'reminder') return raw.type !== 'one-time';
  if (it.kind === 'calendar') return !!raw.recurring;
  if (it.kind === 'biblely') return raw.biblelyKind === 'reminder' && !!raw.recurring;
  return false;
};
export const groupOf = (it) => {
  if (!it) return null;
  const raw = it.raw || {};
  if (raw.templateBlock || isBlockItem(it)) return null;
  if (it.kind === 'prayer' || (it.kind === 'biblely' && raw.biblelyKind === 'prayer')) return 'prayers';
  if (it.kind === 'gym' || (it.kind === 'biblely' && raw.biblelyKind === 'gym')) return 'workouts';
  if (it.kind === 'eyecandySports') return 'sports';
  if (it.kind === 'eyecandy') return 'eyecandy';
  if (it.kind === 'task' || (it.kind === 'biblely' && raw.biblelyKind === 'todo')) return 'oneOffs';
  if (it.kind === 'reminder' && raw.type === 'one-time') return 'oneOffs';
  if (it.kind === 'biblely' && raw.biblelyKind === 'reminder' && !raw.recurring) return 'oneOffs';
  if (it.kind === 'calendar' && !raw.recurring) return 'oneOffs';
  return null;
};
export const applyTemplateDay = (items, keep, hide = []) => {
  const list = items || [];
  if (!keep) return list;
  const off = new Set(hide || []);
  return list.filter((it) => {
    if (isRepeatingRoutine(it)) return keep.some((t) => sameThing(t, it.title));
    const g = groupOf(it);
    return !(g && off.has(g));
  });
};
// Same for busy lists ({ title, source, recurring }).
const busyGroup = (e) => {
  if (e.source === 'prayer') return 'prayers';
  if (e.source === 'gym') return 'workouts';
  if (e.source === 'task') return 'oneOffs';
  if ((e.source === 'reminder' || e.source === 'calendar') && !e.recurring) return 'oneOffs';
  return null;
};
export const templateDayTitles = (entries, keep, hide = []) => {
  if (!keep) return entries || [];
  const off = new Set(hide || []);
  return (entries || []).filter((e) => {
    if ((e.source === 'reminder' || e.source === 'calendar') && e.recurring) return keep.some((t) => sameThing(t, e.title));
    const g = busyGroup(e);
    return !(g && off.has(g));
  });
};
// The marker Biblely writes into its calendar (an all-day event named after
// the template) so EyeCandy knows the day is templated, what it keeps, and
// which groups step aside.
export const keepNotes = (titles, hide = []) => `Added by Biblely · template · keep:${(titles || []).map(normTitle).filter(Boolean).join('|')} · hide:${(hide || []).join(',')}`;
export const parseKeepNotes = (notes) => {
  const m = /· template · keep:([^·\n]*)(?:· hide:([^·\n]*))?/.exec(String(notes || ''));
  if (!m) return null;
  return {
    titles: m[1].split('|').map((t) => t.trim()).filter(Boolean),
    hide: (m[2] || '').split(',').map((t) => t.trim()).filter((t) => DAY_GROUPS.includes(t)),
  };
};

// For busy lists ({ title, source }): same rule by titles.
export const takeoverTitles = (entries, blockTitles) => {
  if (!blockTitles || !blockTitles.length) return entries || [];
  return (entries || []).filter((e) => e.source === 'block' || e.source === 'prayer' || !blockTitles.some((t) => sameThing(t, e.title)));
};
