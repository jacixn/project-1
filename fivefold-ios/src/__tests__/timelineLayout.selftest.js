// Day timeline layout: rails + cards.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'utils', 'timelineLayout.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 =').replace(/export default[^\n]*\n/, ''))(mod);
const { layoutDay, PX_PER_HOUR, COMPACT_PX_PER_HOUR, CARD_GAP, CARD_H, CARD_H_TINY, tickStepFor, zoomLabelFor, clampZoom, ZOOM_MIN, ZOOM_MAX } = mod;
const CP = COMPACT_PX_PER_HOUR;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const it = (id, s, e, kind = 'x') => ({ id, kind, title: id, startMin: s, endMin: e, movable: true, raw: {} });
// The real day: Work 9-5:30 with prayers at 11 and 1, lunch at 2, 4th prayer 5:30, shower + Push 5:35, dinner 7:30, social 8-9, match 8-10, 5th prayer 10, sleep 10:05-4:15
const day = [it('work', 540, 1050), it('p2', 660, 665), it('p3', 780, 785), it('lunch', 840, 860), it('p4', 1050, 1055), it('shower', 1055, 1085), it('push', 1055, 1160), it('dinner', 1170, 1190), it('social', 1200, 1260), it('match', 1200, 1320), it('p5', 1320, 1325), it('sleep', 1325, 1440 + 255)];
const L = layoutDay(day, { nowMin: 700, pxPerHour: CP });
const rail = (id) => L.rails.find((r) => r.item.id === id);
const card = (id) => L.cards.find((c) => c.item.id === id);
check(rail('work').lane === 0 && rail('work').h === ((1050 - 540) / 60) * CP, 'Work is one long rail in lane 0, proportional to 9 to 5:30');
check(rail('p2').dot && rail('p2').lane === 1 && rail('p2').y === ((660 - L.axisStart) / 60) * CP, '2nd Prayer is a dot at 11 AM beside the Work rail');
check(rail('social').lane !== rail('match').lane && rail('match').h === 2 * CP, 'match (8 to 10) and Social Media (8 to 9) are side-by-side rails, match twice as long');
check(rail('sleep').clipped && rail('sleep').y + rail('sleep').h === L.hours[L.hours.length - 1].y, 'sleep rail runs to the bottom of the axis and is marked clipped');
check(L.lanes <= 4, `lanes stay few (${L.lanes})`);
// cards never overlap, stay chronological, and sit on their start when there is room
for (let i = 1; i < L.cards.length; i++) {
  const a = L.cards[i - 1], b = L.cards[i];
  if (b.y < a.y + a.h + CARD_GAP - 1e-9) { failures++; console.log(`FAIL: cards overlap (${a.item.id} / ${b.item.id})`); }
}
console.log('PASS: no two cards overlap');
check(card('work').y === rail('work').y && !card('work').pushed, 'a card with room sits exactly on its start');
check(card('push').pushed && card('push').y === card('p4').y + card('p4').h + CARD_GAP && card('shower').y === card('push').y + card('push').h + CARD_GAP, 'things that start together stack instead of colliding (longer one first)');
check(card('p2').h === CARD_H_TINY && card('work').h === CARD_H && !card('work').proportional, 'zoomed out to the compact level every card is compact (rails carry the duration)');
const D = layoutDay(day);
check(PX_PER_HOUR === 160 && D.step === 30 && D.cards.find((c) => c.item.id === 'work').proportional && D.cards.find((c) => c.item.id === 'work').h === 8.5 * 160, 'DEFAULT zoom is the 30-minute ruler with true-length blocks');
check(card('social').y === card('match').y + card('match').h + CARD_GAP, 'Social Media sits right under the match card, both readable');
check(L.height >= L.cards[L.cards.length - 1].y + L.cards[L.cards.length - 1].h, 'timeline grows to fit the last card');
check(L.axisStart === 6 * 60 && L.axisEnd === 24 * 60 && L.hours[0].label === '6 AM', `axis 6 AM to midnight for this day (${L.axisStart}-${L.axisEnd})`);
check(L.nowY === ((700 - L.axisStart) / 60) * CP, 'now line at the current minute');
check(layoutDay([]).cards.length === 0 && layoutDay(null).height > 0, 'empty and null safe');
// zoom
check(tickStepFor(40) === 120 && tickStepFor(64) === 60 && tickStepFor(200) === 30 && tickStepFor(300) === 15 && tickStepFor(600) === 5, 'ruler gets finer as you zoom: 2 hr, 1 hr, 30, 15, 5 min');
check(zoomLabelFor(64) === '1 hr' && zoomLabelFor(600) === '5 min', 'zoom label in words');
check(clampZoom(1) === ZOOM_MIN && clampZoom(99999) === ZOOM_MAX, 'zoom clamped');
const zoomed = layoutDay(day, { pxPerHour: 600 });
check(zoomed.hours.some((h) => h.label === '11:05') && zoomed.hours.filter((h) => h.major).length === zoomed.hours.filter((h) => h.min % 60 === 0).length, 'at 5-min zoom the ruler shows minutes, hours stay major');
const zWork = zoomed.cards.find((c) => c.item.id === 'work');
check(zWork.proportional && zWork.h === ((1050 - 540) / 60) * 600, 'zoomed in, Work becomes a block as long as 9 to 5:30');
const zP2 = zoomed.cards.find((c) => c.item.id === 'p2');
check(zP2.proportional && zP2.h === 50 && zP2.y === ((660 - zoomed.axisStart) / 60) * 600, 'zoomed in, the 11 AM prayer is a real 50 px block AT 11 AM');
check(zWork.cols === 2 && zWork.left === 0 && zP2.col === 1 && zP2.left === 0.5, 'Work takes the left column, the prayer sits beside it in the right column');
check(zoomed.cards.find((c) => c.item.id === 'p3').col === 1 && zoomed.cards.find((c) => c.item.id === 'lunch').col === 1, 'later prayers and lunch reuse the right column');
const zPush = zoomed.cards.find((c) => c.item.id === 'push'), zShower = zoomed.cards.find((c) => c.item.id === 'shower');
check(zPush.cols === 2 && zShower.cols === 2 && zPush.left !== zShower.left && zPush.y === zShower.y, 'shower and Push (both 5:35) split the width side by side at the same height');
check(zoomed.cards.find((c) => c.item.id === 'dinner').cols === 1, 'dinner alone keeps the full width');
const busyEvening = layoutDay([it('a', 1170, 1320), it('b', 1170, 1320), it('c', 1180, 1260), it('d', 1185, 1300), it('e', 1200, 1260)], { pxPerHour: 160 });
check(busyEvening.maxCols === 5, 'five things at once report five columns');
const screen3 = fs.readFileSync(path.join(__dirname, '..', 'screens', 'MyWeekScreen.js'), 'utf8');
check(/layout\.maxCols \* COL_MIN_W/.test(screen3) && /horizontal[\s\S]{0,200}scrollEnabled=\{sideScroll\}/.test(screen3) && /left: Math\.round\(c\.left \* contentW\)/.test(screen3), 'columns keep a minimum width and the card area scrolls sideways when needed');
const zMatch = zoomed.cards.find((c) => c.item.id === 'match'), zSocial = zoomed.cards.find((c) => c.item.id === 'social');
check(zMatch.y === zSocial.y && zMatch.h === 2 * zSocial.h && zMatch.left !== zSocial.left, 'the match (2 hr) and Social Media (1 hr) start together, side by side, match twice as tall');
const out = layoutDay(day, { pxPerHour: 40 });
check(out.hours.every((h) => h.min % 120 === 0) && out.cards.every((c) => c.h === CARD_H || c.h === CARD_H_TINY), 'zoomed out, 2-hour marks and compact cards');
const screen2 = fs.readFileSync(path.join(__dirname, '..', 'screens', 'MyWeekScreen.js'), 'utf8');
check(/Gesture\.Pinch\(\)/.test(screen2) && /numberOfTaps\(2\)/.test(screen2) && /zoomStep\(-1\)/.test(screen2) && /zoomStep\(1\)/.test(screen2), 'pinch, double tap and - / + buttons all zoom');
check(/scrollRef\.current\?\.scrollTo\(\{ y: target, animated: false \}\)/.test(screen2), 'zoom keeps the focal time in place');
const screen = fs.readFileSync(path.join(__dirname, '..', 'screens', 'MyWeekScreen.js'), 'utf8');
check(/layout\.rails\.map/.test(screen) && /layout\.cards\.map/.test(screen) && /styles\.railDot/.test(screen), 'screen draws rails and cards from the engine');
check(!/container/.test(screen.slice(screen.indexOf('{/* Timeline'), screen.indexOf('{/* List */}'))), 'no container boxes left in the timeline');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
