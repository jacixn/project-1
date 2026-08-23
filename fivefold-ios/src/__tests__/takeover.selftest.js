// A day template takes the day over: same-named things step aside.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const load = (rel) => {
  const pure = fs.readFileSync(path.join(root, rel), 'utf8').replace(/^import[^\n]*\n/gm, '').replace(/export const (\w+) =/g, 'const $1 = exports.$1 =');
  const mod = {}; new Function('exports', pure)(mod); return mod;
};
const T = load('utils/takeover.js');
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

check(T.normTitle('Eat breakfast') === 'breakfast' && T.normTitle('Social Media time') === 'social media' && T.normTitle('Work') === 'work' && T.normTitle('Go to gym') === 'gym', 'titles normalise (verbs and "time" dropped)');
check(T.sameThing('Breakfast', 'Eat breakfast') && T.sameThing('Work', 'Work') && T.sameThing('Work', 'Work from home') && !T.sameThing('Lunch', 'Dinner') && !T.sameThing('Work', 'Workout'), 'same-thing matching');
const day = [
  { kind: 'block', title: 'Work', raw: {} },
  { kind: 'block', title: 'Breakfast', raw: {} },
  { kind: 'calendar', title: 'Work', raw: { calendar: true } },
  { kind: 'reminder', title: 'Eat breakfast', raw: {} },
  { kind: 'reminder', title: 'Haircut', raw: {} },
  { kind: 'prayer', title: 'Work prayer', raw: {} },
  { kind: 'eyecandy', title: 'Work of Art', raw: {} },
];
const kept = T.applyTakeover(day).map((i) => `${i.kind}:${i.title}`);
check(kept.join() === 'block:Work,block:Breakfast,reminder:Haircut,prayer:Work prayer,eyecandy:Work of Art', `blocks replace the Work event and the breakfast reminder; prayers and EyeCandy untouched (${kept.join()})`);
check(T.applyTakeover(day.filter((i) => i.kind !== 'block')).length === 5, 'no blocks on the day: nothing changes');
const ec = [
  { kind: 'biblely', title: 'Work', raw: { biblelyKind: 'block' } },
  { kind: 'biblely', title: 'Eat breakfast', raw: { biblelyKind: 'reminder' } },
  { kind: 'biblely', title: '1st Prayer', raw: { biblelyKind: 'prayer' } },
  { kind: 'calendar', title: 'Work', raw: { calendar: true } },
  { kind: 'biblely', title: 'Breakfast', raw: { biblelyKind: 'block' } },
];
check(T.applyTakeover(ec).map((i) => i.title).join() === 'Work,1st Prayer,Breakfast', 'EyeCandy side: Biblely block events take over the Work calendar event and the reminder event');
check(T.takeoverTitles([{ title: 'Work', source: 'calendar' }, { title: 'Work', source: 'block' }, { title: 'Eat dinner', source: 'reminder' }, { title: 'Prayer', source: 'prayer' }], ['Work', 'Dinner']).map((e) => e.source).join() === 'block,prayer', 'busy lists follow the same rule');
check(fs.readFileSync(path.join(root, 'utils', 'takeover.js'), 'utf8') === fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'utils', 'takeover.js'), 'utf8'), 'takeover.js identical in EyeCandy');
const src = (p) => fs.readFileSync(path.join(root, p), 'utf8');
check(/return applyTakeover\(dedupeMirrors\(out\)\)/.test(src('utils/dayItems.js')) && /takeoverTitles\(out, blockTitles\)/.test(src('utils/dayBusy.js')), 'Biblely My Week and busy lists apply it');
check(/return applyTakeover\(dedupeMirrors\(out\)\)/.test(fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'utils', 'dayItems.js'), 'utf8')), 'EyeCandy My Week applies it');
check(/From your reminders/.test(src('screens/DayTemplatesScreen.js')) && /loadReminderPresets/.test(src('screens/DayTemplatesScreen.js')) && /sameThing\(x\.title, title\)/.test(src('screens/DayTemplatesScreen.js')), 'template editor offers the user\'s reminder bookmarks with their usual time and length');
check(/navigate\('DayTemplates', \{ editId: t\.id \}\)/.test(src('screens/MyWeekScreen.js')) && /openedRef/.test(src('screens/DayTemplatesScreen.js')), 'Edit on every template row opens that template once');
// Calendar-backed blocks and mirror duplicates
check(T.isBlockItem({ kind: 'calendar', title: 'Work', raw: { templateBlock: { blockId: 'w' } } }), 'a calendar event tagged as a template block counts as a block');
const tagged = [
  { kind: 'calendar', title: 'Work', startMin: 540, endMin: 1050, raw: { calendar: true, templateBlock: { blockId: 'w' } } },
  { kind: 'reminder', title: 'Work', startMin: 540, endMin: 600, raw: {} },
];
check(T.applyTakeover(tagged).map((i) => i.kind).join() === 'calendar', 'the tagged Work event takes over a same-named reminder');
const dupB = [
  { kind: 'reminder', title: 'Social Media time', startMin: 1200, endMin: 1260, raw: {} },
  { kind: 'calendar', title: 'Social Media time', startMin: 1200, endMin: 1260, raw: { calendar: true } },
  { kind: 'calendar', title: 'Dentist', startMin: 600, endMin: 660, raw: { calendar: true } },
];
check(T.dedupeMirrors(dupB).map((i) => `${i.kind}:${i.title}`).join() === 'reminder:Social Media time,calendar:Dentist', 'Biblely: its reminder wins over the same iPhone event at the same time');
const dupE = [
  { kind: 'biblely', title: 'Social Media time', startMin: 1200, endMin: 1260, raw: { biblelyKind: 'reminder' } },
  { kind: 'calendar', title: 'Social Media time', startMin: 1200, endMin: 1260, raw: { calendar: true } },
  { kind: 'biblely', title: '5th Prayer', startMin: 1320, endMin: 1325, raw: { biblelyKind: 'prayer' } },
];
check(T.dedupeMirrors(dupE).map((i) => `${i.kind}:${i.title}`).join() === 'calendar:Social Media time,biblely:5th Prayer', 'EyeCandy: the iPhone event wins over Biblely\'s mirror of the same reminder');
check(/applyTakeover\(dedupeMirrors\(out\)\)/.test(src('utils/dayItems.js')) && /applyTakeover\(dedupeMirrors\(out\)\)/.test(fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'utils', 'dayItems.js'), 'utf8')), 'both loaders dedupe then take over');
check(/if \(b\.source\) \{ fromCalendar\.push\(b\); continue; \}/.test(src('utils/dayItems.js')) && /templateBlock: \{ blockId: b\.blockId/.test(src('utils/dayItems.js')), 'Biblely loader: a calendar-backed block tags the matching event, else shows the block');
check(/if \(b\.source\) continue;/.test(src('services/calendarSync.js')), 'calendar mirror never writes a calendar-backed block (no duplicate event)');
check(/ev\.source = 'block'; else push\(out, b\.title/.test(src('utils/dayBusy.js')), 'busy lists: the event counts as the block');
check(/From your Calendar/.test(src('screens/DayTemplatesScreen.js')) && /recurrenceRule/.test(src('screens/DayTemplatesScreen.js')) && /source: \{ kind: 'calendar', title: e\.title/.test(src('screens/DayTemplatesScreen.js')), 'template editor offers repeating events from the user\'s other calendars as blocks');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
