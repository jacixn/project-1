// Template detail sheet: summary maths + UI invariants.
// Run: node src/__tests__/templateSummary.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'utils', 'templateSummary.js'), 'utf8');
const sheet = fs.readFileSync(path.join(root, 'components', 'TemplateSelectionModal.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 ='))(mod);
const { summarizeTemplate, templateHistory, lastLiftFor, relativeDay, formatDuration, estimateMinutes } = mod;

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

const push = {
  id: 't1', name: 'Push',
  exercises: [
    { name: 'Incline Bench Press (Smith Machine)', sets: 2, reps: '8', weight: '15', bodyPart: 'Chest' },
    { name: 'Chest Press (Machine)', sets: 2, reps: '6', weight: '37.5', bodyPart: 'Chest' },
    { name: 'Shoulder Press (Machine)', sets: 2, reps: '4', weight: '30', bodyPart: 'Shoulders' },
    { name: 'Chest Fly (Dumbbell)', sets: '2', reps: '8', weight: '50', bodyPart: 'Chest' },
    { name: 'Tricep Extension (Cable)', sets: 2, reps: '9', weight: '', bodyPart: 'Arms' },
  ],
};
const s = summarizeTemplate(push);
check(s.exerciseCount === 5 && s.totalSets === 10, `5 exercises, 10 sets (got ${s.exerciseCount}/${s.totalSets})`);
check(s.estMinutes === 25, `estimate 25 min (got ${s.estMinutes})`);
check(s.muscleSplit[0].bodyPart === 'Chest' && Math.round(s.muscleSplit[0].share * 100) === 60, 'chest leads the split at 60%');
check(s.muscleSplit.map((m) => m.bodyPart).join(',') === 'Chest,Shoulders,Arms', 'split ordered by sets');
check(Math.abs(s.muscleSplit.reduce((a, m) => a + m.share, 0) - 1) < 1e-9, 'shares sum to 1');
check(summarizeTemplate({ exercises: [] }).muscleSplit.length === 0 && summarizeTemplate(null).totalSets === 0, 'empty / null template safe');
check(estimateMinutes([{ sets: 1 }]) === 5, 'floor of 5 min');

const day = 86400000;
const now = new Date('2026-08-22T15:00:00').getTime();
const history = [
  { name: 'Pull', templateId: 't2', completedAt: new Date(now - 1 * day).toISOString(), duration: 1500, exercises: [{ name: 'Lat Pulldown', sets: [{ weight: 40, reps: 10, completed: true }] }] },
  { name: 'Push', templateId: 't1', completedAt: new Date(now - 3 * day).toISOString(), duration: 2460, exercises: [
    { name: 'Chest Press (Machine)', sets: [{ weight: 35, reps: 8, completed: true }, { weight: 37.5, reps: 6, completed: true }, { weight: 40, reps: 2, completed: false }] },
    { name: 'Shoulder Press (Machine)', sets: [{ weight: 0, reps: 10, completed: true }] },
  ] },
  { name: 'Push', templateId: 't1', completedAt: new Date(now - 10 * day).toISOString(), duration: 2000, exercises: [
    { name: 'Chest Press (Machine)', sets: [{ weight: 30, reps: 8, completed: true }] },
    { name: 'Chest Fly (Dumbbell)', sets: [{ weight: 12, reps: 10, completed: true }] },
  ] },
];
const h = templateHistory(history, push, { now });
check(h.timesDone === 2 && h.lastDoneLabel === '3 days ago', `last done 3 days ago, done twice (got ${h.lastDoneLabel}, ${h.timesDone})`);
check(h.lastDurationSec === 2460 && formatDuration(h.lastDurationSec) === '41 min', 'last duration formatted');
const cp = lastLiftFor(h, 'chest press (machine)');
check(cp && cp.weight === 37.5 && cp.reps === 6, 'best completed set from the most recent session (uncompleted 40 kg ignored)');
check(lastLiftFor(h, 'Shoulder Press (Machine)') === null, 'bodyweight-only sets do not count as a lift');
check(lastLiftFor(h, 'Chest Fly (Dumbbell)').weight === 12, 'older session still supplies a last lift');
check(lastLiftFor(h, 'Incline Bench Press (Smith Machine)') === null, 'never-done exercise has no last lift');
check(templateHistory([], push).lastDoneLabel === null && templateHistory(null, push).timesDone === 0, 'no history safe');
check(templateHistory([{ name: 'Push', completedAt: new Date(now).toISOString(), exercises: [] }], { name: 'Push' }, { now }).lastDoneLabel === 'today', 'name match when templateId missing');
check(relativeDay(new Date(now - day).toISOString(), now) === 'yesterday' && relativeDay(new Date(now - 14 * day).toISOString(), now) === '2 weeks ago', 'relative day wording');
check(relativeDay('garbage') === null && formatDuration(45) === '45 sec' && formatDuration(3900) === '1 h 5 min', 'edge formatting');

// UI invariants
const block = sheet.slice(sheet.indexOf('{(() => {'), sheet.indexOf('Delete Template</Text>'));
check(!/help-outline|fitness-center/.test(block), 'no dumbbell icon column, no circled ? icon');
check(/openExerciseHowTo\(exercise\)/.test(block) && /navigation\.navigate\('ExerciseDetail'/.test(sheet), 'How to opens the exercise library entry');
check(!/numberOfLines/.test(block), 'exercise names wrap, never truncate');
check(/padStart\(2, '0'\)/.test(block) && /summary\.muscleSplit\.map/.test(block), 'numbered rows + muscle split bar');
check(/lastLiftFor\(detailInsights, exercise\.name\)/.test(block) && /Last done/.test(block), 'history cues rendered');
check(/paddingBottom: Math\.max\(insets\.bottom, 14\)/.test(sheet), 'safe-area bottom padding');
check(!/[—]/.test(block) && !/[—]/.test(src), 'no em dashes');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
