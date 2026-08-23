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
check(/applyTakeover\(dedupeMirrors\(out\)\)/.test(src('utils/dayItems.js')) && /takeoverTitles\(out, blockTitles\)/.test(src('utils/dayBusy.js')), 'Biblely My Week and busy lists apply it');
check(/applyTakeover\(dedupeMirrors\(out\)\)/.test(fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'utils', 'dayItems.js'), 'utf8')), 'EyeCandy My Week applies it');
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

// A templated day holds what the template says
const wed = [
  { kind: 'calendar', title: 'Work', startMin: 540, endMin: 1050, raw: { calendar: true, recurring: true, templateBlock: { blockId: 'w' } } },
  { kind: 'reminder', title: 'Eat breakfast', startMin: 480, endMin: 500, raw: { type: 'recurring' } },
  { kind: 'reminder', title: 'Social Media time', startMin: 1200, endMin: 1260, raw: { type: 'recurring' } },
  { kind: 'reminder', title: 'Haircut', startMin: 960, endMin: 1020, raw: { type: 'one-time' } },
  { kind: 'prayer', title: '1st Prayer', startMin: 505, endMin: 510, raw: {} },
  { kind: 'gym', title: 'Push day', startMin: 1080, endMin: 1140, raw: { type: 'recurring' } },
  { kind: 'calendar', title: 'Team standup', startMin: 600, endMin: 615, raw: { calendar: true, recurring: true } },
  { kind: 'calendar', title: 'Dentist', startMin: 900, endMin: 960, raw: { calendar: true, recurring: false } },
  { kind: 'eyecandySports', title: 'Real Madrid vs Real Sociedad', startMin: 1200, endMin: 1320, raw: { sports: true } },
];
const held = T.applyTemplateDay(wed, ['Work', 'Social Media time']).map((i) => i.title);
check(held.join() === 'Work,Social Media time,Haircut,1st Prayer,Push day,Dentist,Real Madrid vs Real Sociedad', `only the template's routine stays: breakfast reminder and standup step aside; one-offs, prayers, workouts, matches stay (${held.join()})`);
check(T.applyTemplateDay(wed, null).length === wed.length, 'no template: nothing hidden');
const ecWed = [
  { kind: 'biblely', title: 'Eat breakfast', startMin: 480, endMin: 500, raw: { biblelyKind: 'reminder', recurring: true } },
  { kind: 'biblely', title: '1st Prayer', startMin: 505, endMin: 510, raw: { biblelyKind: 'prayer', recurring: true } },
  { kind: 'calendar', title: 'Work', startMin: 540, endMin: 1050, raw: { calendar: true, recurring: true } },
  { kind: 'calendar', title: 'Social Media time', startMin: 1200, endMin: 1260, raw: { calendar: true, recurring: true } },
  { kind: 'eyecandy', title: 'Show', startMin: 1300, endMin: 1360, raw: {} },
];
check(T.applyTemplateDay(ecWed, T.parseKeepNotes(T.keepNotes(['Work', 'Social Media time']))).map((i) => i.title).join() === '1st Prayer,Work,Social Media time,Show', 'EyeCandy: the day marker\'s keep list hides the breakfast mirror, keeps Work and Social Media');
check(T.keepNotes(['Work', 'Social Media time']) === 'Added by Biblely · template · keep:work|social media' && T.parseKeepNotes('Added by Biblely · reminder') === null, 'day marker notes round-trip');
check(T.templateDayTitles([{ title: 'Eat breakfast', source: 'reminder', recurring: true }, { title: 'Work', source: 'calendar', recurring: true }, { title: 'Haircut', source: 'reminder', recurring: false }], ['Work']).map((e) => e.title).join() === 'Work,Haircut', 'busy lists follow the same rule');
check(/applyTemplateDay\(applyTakeover\(dedupeMirrors\(out\)\), keep\)/.test(src('utils/dayItems.js')) && /if \(await getTemplateIdForDay\(date\)\) keep = blocks\.map/.test(src('utils/dayItems.js')), 'Biblely loader applies it from the day\'s template');
check(/templateDayTitles\(takeoverTitles\(out, blockTitles\), keep\)/.test(src('utils/dayBusy.js')) && /'reminder', r\.type !== 'one-time'\)/.test(src('utils/dayBusy.js')), 'busy lists too');
check(/stableKey: `block__\$\{key\}~day`/.test(src('services/calendarSync.js')) && /allDay: true, notes: keepNotes\(blocks\.map/.test(src('services/calendarSync.js')) && /\.\.\.\(d\.allDay \? \{ allDay: true \} : \{\}\)/.test(src('services/calendarSync.js')) && /if \(blockId === 'day'\) return false;/.test(src('services/calendarSync.js')), 'Biblely writes an all-day "<Template> day" marker with the keep list; adoption ignores it');
const ecdi = fs.readFileSync(path.join(root, '..', '..', '..', 'eyecandy', 'src', 'utils', 'dayItems.js'), 'utf8');
check(/parseKeepNotes\(e\.notes\)/.test(ecdi) && /applyTemplateDay\(applyTakeover\(dedupeMirrors\(out\)\), keep\)/.test(ecdi), 'EyeCandy reads the marker and applies it');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
