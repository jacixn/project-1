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
check(card(E, 'stade').labelRoom === card(E, 'candy').y - card(E, 'stade').y && card(E, 'torino').labelRoom === card(E, 'elche').y - card(E, 'torino').y, 'a host knows how much room its label has above the nested block');
check(card(E, 'social').labelRoom === null && card(E, 'candy').labelRoom === null, 'blocks with nothing on top have no label limit');
check(mod.NEST_INSET <= 12, 'nested blocks inset only slightly (iOS-like)');

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
check(E.axisEnd === 1440 && E.hours[E.hours.length - 1].label === '12 AM' && E.hours[E.hours.length - 1].y === ((1440 - E.axisStart) / 60) * PX_PER_HOUR, 'the day runs to midnight: the 11 PM hour has full room and the ruler ends at 12 AM');
check(layoutDay([it('late', 23 * 60 + 1, 23 * 60 + 59)]).cards[0].y === ((23 * 60 + 1 - 6 * 60) / 60) * PX_PER_HOUR, 'an item from 11:01 to 11:59 PM sits inside the last hour, not clamped to the bottom edge');
check(layoutDay(evening, { nowMin: 1100 }).nowY === ((1100 - E.axisStart) / 60) * PX_PER_HOUR, 'now line');

const screen = fs.readFileSync(path.join(__dirname, '..', 'screens', 'MyWeekScreen.js'), 'utf8');
check(/NEST_INSET/.test(screen) && /c\.strip/.test(screen) && /styles\.stripDot/.test(screen) && !/layout\.rails/.test(screen) && !/horizontal/.test(screen.slice(screen.indexOf('{/* Cards'), screen.indexOf('{layout.nowY'))) && /colW: cardAreaW \/ Math\.max\(1, g\.cols\)/.test(screen), 'screen draws nested blocks and strips; columns share the width, never scroll sideways');
check(/fmtRange\(it\.startMin, it\.endMin\)/.test(screen) && /\\u00A0– \$\{nb\(cb\)\}/.test(screen) && /numberOfLines=\{titleLines\}/.test(screen) && /Math\.min\(NEST_INSET, Math\.round\(colW \* 0\.1\)\)/.test(screen), 'compact time range that breaks only at the dash; host titles limited to the room above a nested block; small scaled inset');
check(/backgroundColor: c\.proportional \? theme\.background : tile/.test(screen) && /styles\.cardFill/.test(screen), 'blocks are opaque so nested ones cover their host');
// ── A block takes the empty columns beside it ──────────────────────────
// Every block in an overlap cluster used to get the same 1/cols slice for
// the whole cluster, even where nothing sat beside it. An evening of four
// fixtures made every card a quarter of the track, and "Marseille vs Paris
// Saint-Germain" came out broken mid-word, one word per line.
{
  const at = (startMin, endMin, id) => ({ id, title: id, startMin, endMin, kind: 'eyecandy' });
  const px = 200; // proportional
  const wide = layoutDay([
    at(19 * 60 + 45, 21 * 60 + 45, 'milan'),
    at(19 * 60 + 45, 21 * 60 + 45, 'marseille'),
    at(22 * 60 + 20, 23 * 60 + 55, 'film'),
  ], { pxPerHour: px });
  const by = (id) => wide.cards.find((c) => c.item.id === id);
  check(by('milan').cols === 2 && by('marseille').cols === 2, 'two fixtures at the same time take a column each');
  check(by('milan').span === 1 && by('marseille').span === 1, 'and neither widens, because the other is beside it');
  // The film does not overlap them at all, so it is its own cluster with
  // one column: already the full width, nothing to widen into.
  check(by('film').cols === 1 && by('film').span === 1 && by('film').width === 1,
    'the film after them is its own cluster and takes the whole track');

  // The exact case from the owner's screenshot: a short episode beside a
  // long fixture, where the columns to the right are free.
  const mixed = layoutDay([
    at(19 * 60 + 45, 21 * 60 + 45, 'fixtureA'),
    at(19 * 60 + 45, 21 * 60 + 45, 'fixtureB'),
    at(21 * 60 + 15, 22 * 60 + 5, 'nanny'),
  ], { pxPerHour: px });
  const nanny = mixed.cards.find((c) => c.item.id === 'nanny');
  // It runs 21:15 to 22:05 while the second fixture is still on until
  // 21:45, so half the track is the honest answer and widening would cover
  // the fixture. Widening must never be greedy.
  check(nanny.span === 1, 'an episode that really does overlap a fixture stays in its own column');

  // Where the space IS free, it is taken. "sideBySide" starts five minutes
  // after "long", too close for its title to nest, so it gets its own
  // column. "late" starts long after both, by which time column 1 has
  // cleared, so it takes the whole width instead of half of it.
  const freed = layoutDay([
    at(9 * 60, 12 * 60, 'long'),
    at(9 * 60 + 5, 10 * 60, 'sideBySide'),
    at(10 * 60 + 30, 11 * 60, 'late'),
  ], { pxPerHour: px });
  const late = freed.cards.find((c) => c.item.id === 'late');
  check(late.cols === 2 && late.span === 2 && late.width === 1,
    'a block whose neighbouring column has cleared takes the whole width');
  const long = freed.cards.find((c) => c.item.id === 'long');
  check(long.span === 1 && long.width === 0.5,
    'while a block that overlaps its neighbour keeps its own column, even after the neighbour ends');

  // Nesting already gives full width where it applies, so a cluster that
  // nests everything needs no widening at all.
  const nested = layoutDay([
    at(9 * 60, 12 * 60, 'host'),
    at(10 * 60, 10 * 60 + 30, 'inside'),
  ], { pxPerHour: px });
  check(nested.cards.every((c) => c.cols === 1 && c.width === 1),
    'a nested cluster is one column wide, which is already the whole track');

  // Nothing may be covered. For every pair sharing screen rows, their
  // spans must not overlap unless one is nested inside the other.
  const all = layoutDay([
    at(9 * 60, 12 * 60, 'a'), at(9 * 60 + 30, 10 * 60 + 30, 'b'),
    at(10 * 60, 11 * 60, 'c'), at(13 * 60, 14 * 60, 'd'),
    at(13 * 60, 15 * 60, 'e'), at(14 * 60 + 30, 15 * 60, 'f'),
  ], { pxPerHour: px }).cards.filter((c) => !c.strip);
  let clash = 0;
  for (const p of all) {
    for (const q of all) {
      if (p === q || p.depth !== q.depth) continue;
      const rows = p.y < q.y + q.h && q.y < p.y + p.h;
      const colsOverlap = p.col < q.col + (q.span || 1) && q.col < p.col + (p.span || 1);
      if (rows && colsOverlap) clash += 1;
    }
  }
  check(clash === 0, 'no two blocks at the same nesting depth ever share screen space');

  // Compact mode still hands back a span, so the renderer can multiply by
  // it unconditionally.
  const compact = layoutDay([at(9 * 60, 10 * 60, 'x')], { pxPerHour: 64 });
  check(compact.cards[0].span === 1, 'compact cards carry span 1');
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);