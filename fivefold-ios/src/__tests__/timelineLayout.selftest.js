// Day timeline layout: iOS-Calendar rules (nesting, columns, strips) + zoom.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'utils', 'timelineLayout.js'), 'utf8');
const mod = {};
new Function('exports', src.replace(/export const (\w+) =/g, 'const $1 = exports.$1 =').replace(/export default[^\n]*\n/, ''))(mod);
const { layoutDay, PX_PER_HOUR, COMPACT_PX_PER_HOUR, CARD_GAP, CARD_H, CARD_H_TINY, STRIP_H, tickStepFor, zoomLabelFor, clampZoom, ZOOM_MIN, ZOOM_MAX } = mod;
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${msg}`); if (!ok) failures++; };
const it = (id, s, e, kind = 'x') => ({ id, kind, title: id, startMin: s, endMin: e, movable: true, raw: {} });
const card = (L, id) => L.cards.find((c) => c.item.id === id);

// The evening from the iOS Calendar screenshot, at the default zoom (160 px/hr)
const evening = [
  it('stade', 1185, 1305), it('torino', 1185, 1305), it('shower', 1185, 1215),
  it('social', 1200, 1260), it('candy', 1215, 1310), it('elche', 1230, 1350),
  it('p5', 1320, 1325),
];
const E = layoutDay(evening);
check(PX_PER_HOUR === 160 && E.step === 30, 'default zoom is the 30-minute ruler');
check(card(E, 'stade').col === 0 && card(E, 'torino').col === 1 && card(E, 'shower').col === 2 && card(E, 'stade').cols === card(E, 'torino').cols, 'three things starting at 7:45 get three columns');
check(card(E, 'candy').depth === 1 && card(E, 'candy').col === 0, 'Candy Jar (8:15) nests inside the earliest block with room (Stade Rennais column), inset, on top');
check(card(E, 'elche').depth === 1 && card(E, 'elche').col === 1, 'Elche (8:30) cannot go under Candy (too close) so it nests in the Torino column');
check(card(E, 'social').depth === 0 && card(E, 'social').col === 3 && E.groups[0].cols === 4, 'Social Media (8:00) starts too soon after the shower to nest, so it gets a fourth column (as iOS does)');
check(card(E, 'p5').strip && card(E, 'p5').width === 1 && card(E, 'p5').h === STRIP_H && card(E, 'p5').y === ((1320 - E.axisStart) / 60) * PX_PER_HOUR, '5th Prayer is a full-width strip at exactly 10 PM');
check(E.cards[E.cards.length - 1].strip === true, 'strips are drawn last (on top)');
const order = E.cards.map((c) => c.item.id);
check(order.indexOf('stade') < order.indexOf('candy') && order.indexOf('torino') < order.indexOf('elche'), 'nested blocks draw after their host');
check(card(E, 'stade').h === 2 * PX_PER_HOUR && card(E, 'shower').h === 0.5 * PX_PER_HOUR, 'blocks are as tall as their items');

// Work day: prayers inside Work are strips, lunch nests
const day = [it('work', 540, 1050), it('p2', 660, 665), it('p3', 780, 785), it('lunch', 840, 860), it('p4', 1050, 1055)];
const D = layoutDay(day);
check(card(D, 'work').cols === 1 && card(D, 'work').width === 1 && card(D, 'p2').strip && card(D, 'lunch').depth === 1 && card(D, 'lunch').col === 0, 'Work is one full-width block; prayers are strips on it; lunch nests inside it');
check(card(D, 'p2').y === ((660 - D.axisStart) / 60) * PX_PER_HOUR, 'the 11 AM prayer strip sits exactly at 11 AM');

// Same-minute start with a short first item: a column, not a nest
const close = layoutDay([it('a', 600, 660), it('b', 605, 700)]);
check(card(close, 'b').depth === 0 && card(close, 'b').col === 1, 'starting 5 minutes later is too close to nest (title would be hidden), so it gets a column');
const far = layoutDay([it('a', 600, 720), it('b', 640, 700)]);
check(card(far, 'b').depth === 1 && card(far, 'b').col === 0 && far.groups[0].cols === 1, 'starting 40 minutes later nests (one column)');

// Compact mode (zoomed out)
const C = layoutDay(evening, { pxPerHour: COMPACT_PX_PER_HOUR });
for (let i = 1; i < C.cards.length; i++) { const a = C.cards[i - 1], b = C.cards[i]; if (b.y < a.y + a.h + CARD_GAP - 1e-9) { failures++; console.log(`FAIL: compact cards overlap (${a.item.id}/${b.item.id})`); } }
console.log('PASS: compact cards never overlap');
check(C.cards.every((c) => !c.proportional && (c.h === CARD_H || c.h === CARD_H_TINY)), 'compact cards are fixed height');

// Zoom
check(tickStepFor(40) === 120 && tickStepFor(64) === 60 && tickStepFor(200) === 30 && tickStepFor(300) === 15 && tickStepFor(600) === 5, 'ruler: 2 hr, 1 hr, 30, 15, 5 min');
check(zoomLabelFor(64) === '1 hr' && zoomLabelFor(600) === '5 min' && clampZoom(1) === ZOOM_MIN && clampZoom(99999) === ZOOM_MAX, 'zoom label + clamp');
const Z = layoutDay(day, { pxPerHour: 600 });
check(Z.hours.some((h) => h.label === '11:05') && card(Z, 'work').h === 8.5 * 600, 'at 5-min zoom the ruler shows minutes and Work is 8.5 hours tall');
check(layoutDay([]).cards.length === 0 && layoutDay(null).height > 0 && !('rails' in layoutDay([])), 'empty / null safe, no rails output');
check(layoutDay(evening, { nowMin: 1100 }).nowY === ((1100 - E.axisStart) / 60) * PX_PER_HOUR, 'now line');

const screen = fs.readFileSync(path.join(__dirname, '..', 'screens', 'MyWeekScreen.js'), 'utf8');
check(/NEST_INSET/.test(screen) && /c\.strip/.test(screen) && /styles\.stripDot/.test(screen) && !/layout\.rails/.test(screen) && !/horizontal/.test(screen.slice(screen.indexOf('{/* Cards'), screen.indexOf('{layout.nowY'))) && /colW: cardAreaW \/ Math\.max\(1, g\.cols\)/.test(screen), 'screen draws nested blocks and strips; columns share the width, never scroll sideways');
check(/fmtRange\(it\.startMin, it\.endMin\)/.test(screen) && /\$\{ca\.slice\(0, -3\)\} – \$\{cb\}/.test(screen), 'compact iOS-style time range (8:15 – 9:50 PM)');
check(/backgroundColor: c\.proportional \? theme\.background : tile/.test(screen) && /styles\.cardFill/.test(screen), 'blocks are opaque so nested ones cover their host');
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
