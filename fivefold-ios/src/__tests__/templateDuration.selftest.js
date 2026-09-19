// Workout template length: pure rules + wiring into the editor, the detail
// sheet, the Schedule sheet default and the My Week add picker.
// Run: node src/__tests__/templateDuration.selftest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const strip = (src) => src.replace(/^import .*$/gm, '').replace(/^export (const|function|default)/gm, '$1').replace(/^export \{[^}]*\};?$/gm, '');
// templateSummary also exports a formatDuration (seconds); rename it so the
// minutes one from duration.js is the one templateDuration sees.
const summarySrc = strip(read('utils/templateSummary.js')).replace(/const formatDuration = /, 'const formatDurationSec = ');
const bundle = [strip(read('utils/duration.js')), summarySrc, strip(read('utils/templateDuration.js'))].join('\n');
const m = new Function(`${bundle}\nreturn { templateDurationMinutes, suggestedDurationMinutes, scheduleDurationFor, templateLengthLabel, estimateMinutes };`)();

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };

// Pure rules.
check(m.templateDurationMinutes({ durationMinutes: 80 }) === 80, 'chosen length is read back');
check(m.templateDurationMinutes({ estimatedDuration: 45 }) === 45 && m.templateDurationMinutes({ duration: 50 }) === 50, 'older field names still count');
check(m.templateDurationMinutes({}) === null && m.templateDurationMinutes(null) === null && m.templateDurationMinutes({ durationMinutes: 0 }) === null && m.templateDurationMinutes({ durationMinutes: 'x' }) === null, 'unset, zero and junk read as no length');
check(m.templateLengthLabel({ durationMinutes: 80 }) === '1 hr 20 mins', 'label uses the chosen length in the schedule sheet wording');
check(m.templateLengthLabel({ durationMinutes: 60 }) === '1 hr' && m.templateLengthLabel({ durationMinutes: 45 }) === '45 mins', 'whole hours and minutes');
check(m.templateLengthLabel({}) === '1 hr' && m.templateLengthLabel(null) === '1 hr', 'no length reads as 1 hr, never the estimate');
check(m.scheduleDurationFor({ durationMinutes: 80 }) === 80 && m.scheduleDurationFor({}) === 60 && m.scheduleDurationFor(null, 45) === 45, 'schedule default = chosen length, else the fallback hour');
const pull = { exercises: [{ sets: 3 }, { sets: 2 }, { sets: 3 }, { sets: 2 }] };
check(m.estimateMinutes(pull.exercises) === 24, 'sanity: the Pull template estimates 24 min');
check(m.suggestedDurationMinutes(pull) === 60, 'editor opens at 1 hr when no length is set, whatever the exercises estimate');
check(m.suggestedDurationMinutes({ exercises: [] }) === 60 && m.suggestedDurationMinutes(null) === 60, 'empty or missing template still opens at 1 hr');
check(m.suggestedDurationMinutes({ durationMinutes: 80, exercises: pull.exercises }) === 80, 'a chosen length wins');

// Wiring.
const editor = read('components/TemplateSelectionModal.js');
check(/LENGTH<\/Text>/.test(editor) && /<DurationField[\s\S]{0,400}durationMinutes/.test(editor), 'editor has a Length control writing durationMinutes');
check(/value=\{suggestedDurationMinutes\(editorTemplate\)\}/.test(editor), 'Length control shows the chosen length or 1 hr');
check(/durationMinutes: suggestedDurationMinutes\(editorTemplate\)/.test(editor), 'save always stores a length');
check(!/estimateMinutes/.test(read('utils/templateDuration.js')), 'the estimate never feeds the length');
check((editor.match(/templateLengthLabel\(/g) || []).length >= 2, 'row and detail sheet show the chosen length');
check(!/about \$\{summary\.estMinutes\} min/.test(editor), 'the old estimate-only line is gone from the sheet');
const sched = read('components/ScheduleWorkoutModal.js');
check(/setDuration\(scheduleDurationFor\(tmpl\)\)/.test(sched) && /setDuration\(editingSchedule\.duration \?\? scheduleDurationFor\(tmpl\)\)/.test(sched), 'Schedule sheet opens at the chosen length; an existing schedule keeps its own');
const week = read('screens/MyWeekScreen.js');
check(/duration: scheduleDurationFor\(t\)/.test(week), 'My Week add picker uses the chosen length for the block');
check(!/[—]/.test(read('utils/templateDuration.js')) && !/[—]/.test(editor.slice(editor.indexOf('LENGTH'), editor.indexOf('LENGTH') + 1500)), 'no em dashes');

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
