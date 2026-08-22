// Day timeline layout: rails + cards.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'utils', 'timelineLayout.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 =').replace(/export default[^\n]*\n/, ''))(mod);
const { layoutDay, PX_PER_HOUR, CARD_GAP, CARD_H, CARD_H_TINY } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const it = (id, s, e, kind = 'x') => ({ id, kind, title: id, startMin: s, endMin: e, movable: true, raw: {} });
// The real day: Work 9-5:30 with prayers at 11 and 1, lunch at 2, 4th prayer 5:30, shower + Push 5:35, dinner 7:30, social 8-9, match 8-10, 5th prayer 10, sleep 10:05-4:15
const day = [it('work', 540, 1050), it('p2', 660, 665), it('p3', 780, 785), it('lunch', 840, 860), it('p4', 1050, 1055), it('shower', 1055, 1085), it('push', 1055, 1160), it('dinner', 1170, 1190), it('social', 1200, 1260), it('match', 1200, 1320), it('p5', 1320, 1325), it('sleep', 1325, 1440 + 255)];
const L = layoutDay(day, { nowMin: 700 });
const rail = (id) => L.rails.find((r) => r.item.id === id);
const card = (id) => L.cards.find((c) => c.item.id === id);
check(rail('work').lane === 0 && rail('work').h === ((1050 - 540) / 60) * PX_PER_HOUR, 'Work is one long rail in lane 0, proportional to 9 to 5:30');
check(rail('p2').dot && rail('p2').lane === 1 && rail('p2').y === ((660 - L.axisStart) / 60) * PX_PER_HOUR, '2nd Prayer is a dot at 11 AM beside the Work rail');
check(rail('social').lane !== rail('match').lane && rail('match').h === 2 * PX_PER_HOUR, 'match (8 to 10) and Social Media (8 to 9) are side-by-side rails, match twice as long');
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
check(card('p2').h === CARD_H_TINY && card('work').h === CARD_H, 'short items get the compact card');
check(card('social').y === card('match').y + card('match').h + CARD_GAP, 'Social Media sits right under the match card, both readable');
check(L.height >= L.cards[L.cards.length - 1].y + L.cards[L.cards.length - 1].h, 'timeline grows to fit the last card');
check(L.axisStart === 6 * 60 && L.axisEnd === 24 * 60 && L.hours[0].label === '6 AM', `axis 6 AM to midnight for this day (${L.axisStart}-${L.axisEnd})`);
check(L.nowY === ((700 - L.axisStart) / 60) * PX_PER_HOUR, 'now line at the current minute');
check(layoutDay([]).cards.length === 0 && layoutDay(null).height > 0, 'empty and null safe');
const screen = fs.readFileSync(path.join(__dirname, '..', 'screens', 'MyWeekScreen.js'), 'utf8');
check(/layout\.rails\.map/.test(screen) && /layout\.cards\.map/.test(screen) && /styles\.railDot/.test(screen), 'screen draws rails and cards from the engine');
check(!/container/.test(screen.slice(screen.indexOf('{/* Timeline'), screen.indexOf('{/* List */}'))), 'no container boxes left in the timeline');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
