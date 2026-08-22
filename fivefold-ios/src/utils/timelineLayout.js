// Day timeline layout (pure): rails + cards.
//
// Boxes sized to duration fail as soon as two things overlap or one is five
// minutes long: labels collide, short things vanish, long things are mostly
// empty space. So the true time extent and the readable label are separated:
//   RAILS  thin coloured lines on the left, one per item, proportional to its
//          real duration, placed in lanes so overlapping items sit side by
//          side (Work 9 to 5:30 is one long rail; a 5-min prayer is a dot).
//   CARDS  compact, fixed-height labels on the right pinned to the item's
//          start on the axis and pushed down only as far as needed so they
//          never overlap. Two things starting together simply stack.
// Unit-tested in src/__tests__/timelineLayout.selftest.js.

export const PX_PER_HOUR = 64;
export const ZOOM_MIN = 36;   // px per hour, whole day in one screen
export const ZOOM_MAX = 720;  // px per hour, 5-minute marks, 1 min = 12 px
export const CARD_H = 52;
export const CARD_H_TINY = 40;
export const CARD_GAP = 6;
export const RAIL_W = 10; // lane pitch in px
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
// compact and the rails carry the duration.
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

  // Rails: first-fit lanes on real intervals (long rails keep lane 0 so the
  // day's backbone, e.g. Work, reads as one line).
  const laneEnd = [];
  const rails = list.map((i) => {
    let lane = laneEnd.findIndex((e) => e <= i.startMin);
    if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
    laneEnd[lane] = i.endMin;
    const top = y(i.startMin);
    const bottom = y(i.endMin);
    return { item: i, lane, y: top, h: Math.max(6, bottom - top), dot: (i.endMin - i.startMin) <= 15, clipped: i.endMin > axisEnd };
  });
  const lanes = Math.max(1, laneEnd.length);

  // Cards: chronological, pinned to start, pushed down just enough. Zoomed in
  // far enough, a card grows to its item's true length, so the day turns
  // into proportional blocks without ever losing a readable label.
  let prevBottom = -Infinity;
  const cards = list.map((i) => {
    const minH = (i.endMin - i.startMin) <= 15 ? CARD_H_TINY : CARD_H;
    const trueH = pxPerHour >= PROPORTIONAL_FROM ? y(i.endMin) - y(i.startMin) : 0;
    const h = Math.max(minH, trueH);
    const wanted = y(i.startMin);
    const top = Math.max(wanted, prevBottom + CARD_GAP);
    prevBottom = top + h;
    return { item: i, y: top, h, pushed: top - wanted > 1, proportional: trueH >= minH };
  });

  // Ruler marks, denser as you zoom in. Hours are "major".
  const step = tickStepFor(pxPerHour);
  const hours = [];
  for (let m = axisStart; m <= axisEnd; m += step) hours.push({ min: m, y: y(m), label: fmtTick(m), major: m % 60 === 0 });

  return {
    axisStart,
    axisEnd,
    lanes,
    railsWidth: lanes * RAIL_W + 6,
    height: Math.max(y(axisEnd), prevBottom === -Infinity ? 0 : prevBottom) + 8,
    hours,
    rails,
    cards,
    nowY: nowMin != null && nowMin >= axisStart && nowMin <= axisEnd ? y(nowMin) : null,
    pxPerHour,
    step,
  };
};

export default layoutDay;
