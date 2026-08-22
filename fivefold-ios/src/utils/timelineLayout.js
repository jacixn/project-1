// Day timeline layout (pure), modelled on the iOS Calendar day view.
//   Zoomed out (compact): fixed-height cards pinned to their start, pushed
//     down only as far as needed so none overlap.
//   Zoomed in (proportional): blocks as tall as their item; a block that
//     starts late enough for an earlier overlapping block's title to stay
//     visible is nested inside it (inset, drawn on top); blocks that start too
//     close together get columns; tiny items are full-width strips over
//     everything at their exact minute.
// Unit-tested in src/__tests__/timelineLayout.selftest.js.

export const PX_PER_HOUR = 160;
export const COMPACT_PX_PER_HOUR = 64;
export const ZOOM_MIN = 36;   // px per hour, whole day in one screen
export const ZOOM_MAX = 720;  // px per hour, 5-minute marks, 1 min = 12 px
export const CARD_H = 52;
export const CARD_H_TINY = 40;
export const CARD_GAP = 6;
export const COL_MIN_W = 90; // narrowest readable column; three columns fit a phone, four or more scroll sideways in that band
export const NEST_INSET = 28;  // px a later overlapping block is inset when drawn on top of an earlier one
export const STRIP_H = 20;     // px height of a tiny item drawn as a full-width strip
export const STRIP_MAX_MIN = 15; // items this short (minutes) become strips
export const LABEL_PX = 44;    // room an earlier block needs above a later one for its title to stay visible
const fmtHour = (min) => {
  const h = Math.floor(min / 60) % 24;
  return `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtTick = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return m === 0 ? fmtHour(min) : `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
};

// How fine the ruler gets at a zoom level (minutes between marks).
export const tickStepFor = (pxPerHour) => {
  if (pxPerHour < 48) return 120;
  if (pxPerHour < 130) return 60;
  if (pxPerHour < 260) return 30;
  if (pxPerHour < 480) return 15;
  return 5;
};
export const zoomLabelFor = (pxPerHour) => {
  const step = tickStepFor(pxPerHour);
  return step >= 60 ? `${step / 60} hr` : `${step} min`;
};
export const clampZoom = (px) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, px));
// Cards grow to their true length only from this zoom on; below it they stay
// compact.
export const PROPORTIONAL_FROM = 130;

export const layoutDay = (items, { pxPerHour = PX_PER_HOUR, nowMin = null } = {}) => {
  const list = (items || [])
    .filter((i) => i && Number.isFinite(i.startMin) && Number.isFinite(i.endMin) && i.endMin > i.startMin)
    .slice()
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const first = list.length ? Math.min(...list.map((i) => i.startMin)) : 6 * 60;
  const last = list.length ? Math.max(...list.map((i) => i.endMin)) : 22 * 60;
  const axisStart = Math.max(0, Math.floor(Math.min(first, 6 * 60) / 60) * 60);
  const axisEnd = Math.min(24 * 60, Math.ceil(Math.max(last, 22 * 60) / 60) * 60);
  const y = (min) => ((Math.min(Math.max(min, axisStart), axisEnd) - axisStart) / 60) * pxPerHour;

  // Cards. Two modes:
  //  compact (zoomed out): fixed-height labels pinned to their start and
  //    pushed down only as far as needed so none overlap.
  //  proportional (zoomed in past PROPORTIONAL_FROM): every card is as tall as
  //    its item and sits at its true time; items that overlap split the width
  //    into columns, calendar-style, so a prayer at 11 AM sits beside the Work
  //    block at 11 AM instead of under it.
  const proportional = pxPerHour >= PROPORTIONAL_FROM;
  let cards = [];
  const groups = []; // overlap groups: { index, y, h, cols } (proportional mode only)
  let prevBottom = -Infinity;
  if (!proportional) {
    cards = list.map((i) => {
      const h = (i.endMin - i.startMin) <= 15 ? CARD_H_TINY : CARD_H;
      const wanted = y(i.startMin);
      const top = Math.max(wanted, prevBottom + CARD_GAP);
      prevBottom = top + h;
      return { item: i, y: top, h, pushed: top - wanted > 1, proportional: false, left: 0, width: 1, col: 0, cols: 1, group: null };
    });
  } else {
    // iOS-Calendar rules, per overlap cluster:
    //   * tiny items (a 5-minute prayer) are full-width strips drawn over
    //     everything at their exact minute;
    //   * a block that starts late enough for the earlier block's title to
    //     stay visible is NESTED: same column, inset to the right, drawn on
    //     top (Elche inside Stade Rennais, Candy Jar inside Torino);
    //   * only blocks that start too close together get separate columns.
    const isStrip = (i) => (i.endMin - i.startMin) <= STRIP_MAX_MIN;
    const topOf = (i) => y(i.startMin);
    const heightOf = (i) => (isStrip(i) ? STRIP_H : Math.max(CARD_H_TINY, y(i.endMin) - y(i.startMin)));
    const bottomOf = (i) => topOf(i) + heightOf(i);
    let group = [];
    let groupBottom = -Infinity;
    const flush = () => {
      if (!group.length) return;
      const index = groups.length;
      const blocks = group.filter((i) => !isStrip(i));
      const strips = group.filter(isStrip);
      const placed = []; // { i, col, depth }
      const colLastBottom = []; // last real bottom per column (for first-fit)
      for (const i of blocks) {
        const top = topOf(i);
        // Overlapping, already-placed blocks whose title has room above this one
        const hosts = placed.filter((p) => bottomOf(p.i) > top && topOf(p.i) + LABEL_PX <= top);
        if (hosts.length) {
          // Nest into the most recently started host (ties: the one placed last)
          const host = hosts.reduce((best, p) => (!best || topOf(p.i) >= topOf(best.i) ? p : best), null);
          placed.push({ i, col: host.col, depth: host.depth + 1 });
          colLastBottom[host.col] = Math.max(colLastBottom[host.col], bottomOf(i));
          continue;
        }
        let col = colLastBottom.findIndex((bt) => bt <= top);
        if (col === -1) { col = colLastBottom.length; colLastBottom.push(0); }
        colLastBottom[col] = bottomOf(i);
        placed.push({ i, col, depth: 0 });
      }
      const cols = Math.max(1, colLastBottom.length);
      const gTop = Math.min(...group.map(topOf));
      const gBottom = Math.max(...group.map(bottomOf));
      groups.push({ index, y: gTop, h: gBottom - gTop, cols });
      for (const { i, col, depth } of placed) {
        cards.push({ item: i, y: topOf(i), h: heightOf(i), pushed: false, proportional: true, col, cols, depth, left: col / cols, width: 1 / cols, group: index, strip: false });
      }
      for (const i of strips) {
        cards.push({ item: i, y: topOf(i), h: STRIP_H, pushed: false, proportional: true, col: 0, cols: 1, depth: 0, left: 0, width: 1, group: index, strip: true });
      }
      prevBottom = Math.max(prevBottom, gBottom);
      group = [];
      groupBottom = -Infinity;
    };
    for (const i of list) {
      if (group.length && topOf(i) >= groupBottom) flush();
      group.push(i);
      groupBottom = Math.max(groupBottom, bottomOf(i));
    }
    flush();
    // Draw order: columns left to right, nested on top of their host, strips last
    cards.sort((a, b) => (a.strip - b.strip) || (a.col - b.col) || (a.depth - b.depth) || (a.y - b.y));
  }

  // Ruler marks, denser as you zoom in. Hours are "major".
  const step = tickStepFor(pxPerHour);
  const hours = [];
  for (let m = axisStart; m <= axisEnd; m += step) hours.push({ min: m, y: y(m), label: fmtTick(m), major: m % 60 === 0 });

  return {
    axisStart,
    axisEnd,
    height: Math.max(y(axisEnd), prevBottom === -Infinity ? 0 : prevBottom) + 8,
    hours,
    cards,
    nowY: nowMin != null && nowMin >= axisStart && nowMin <= axisEnd ? y(nowMin) : null,
    pxPerHour,
    step,
    maxCols: cards.reduce((m, c) => Math.max(m, c.cols || 1), 1),
    groups,
  };
};

export default layoutDay;
