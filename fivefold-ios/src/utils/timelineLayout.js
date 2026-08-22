// Day timeline layout (pure). Turns the day's items into absolutely
// positioned blocks on a vertical time axis:
//   - long items that hold shorter ones inside them (a 9 to 5:30 "Work"
//     with prayers at 11 and 1) become CONTAINERS: full width, drawn behind,
//     so the short items read as sitting inside them at their real time;
//   - everything else is laid out in lanes so items that overlap each other
//     sit side by side instead of on top of each other;
//   - every block keeps a minimum readable height, and lanes are computed on
//     that visual height so a 5-min prayer never hides the thing after it.
// Unit-tested in src/__tests__/timelineLayout.selftest.js.

export const PX_PER_HOUR = 64;
export const MIN_BLOCK_PX = 30;
const CONTAINER_MIN = 120; // minutes
const fmtHour = (min) => {
  const h = Math.floor(min / 60) % 24;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12} ${ap}`;
};

export const layoutDay = (items, { pxPerHour = PX_PER_HOUR, minBlockPx = MIN_BLOCK_PX, nowMin = null } = {}) => {
  const list = (items || []).filter((i) => i && Number.isFinite(i.startMin) && Number.isFinite(i.endMin) && i.endMin > i.startMin)
    .slice().sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const minVisualMin = (minBlockPx / pxPerHour) * 60;
  const visualEnd = (i) => Math.max(i.endMin, i.startMin + minVisualMin);

  // Containers: long, and something shorter starts inside them.
  const isContainer = (i) => (i.endMin - i.startMin) >= CONTAINER_MIN
    && list.some((o) => o !== i && (o.endMin - o.startMin) < (i.endMin - i.startMin) && o.startMin >= i.startMin && o.startMin < i.endMin);
  const containers = list.filter(isContainer);
  const lanesItems = list.filter((i) => !isContainer(i));

  // Axis: from the hour before the first item (or 6 AM) to the hour after the last (or 10 PM)
  const first = list.length ? Math.min(...list.map((i) => i.startMin)) : 6 * 60;
  const last = list.length ? Math.max(...list.map((i) => visualEnd(i))) : 22 * 60;
  const axisStart = Math.max(0, Math.floor(Math.min(first, 6 * 60) / 60) * 60);
  const axisEnd = Math.min(24 * 60, Math.ceil(Math.max(last, 22 * 60) / 60) * 60);
  const y = (min) => ((min - axisStart) / 60) * pxPerHour;

  // Lanes: connected overlap groups on VISUAL extents, first-fit columns.
  const blocks = [];
  let group = [];
  let groupEnd = -1;
  const flush = () => {
    if (!group.length) return;
    const colEnd = [];
    const placed = group.map((i) => {
      let col = colEnd.findIndex((e) => e <= i.startMin);
      if (col === -1) { col = colEnd.length; colEnd.push(0); }
      colEnd[col] = visualEnd(i);
      return { item: i, col };
    });
    const cols = colEnd.length;
    for (const p of placed) {
      blocks.push({
        item: p.item,
        container: false,
        y: y(p.item.startMin),
        h: Math.max(minBlockPx, y(p.item.endMin) - y(p.item.startMin)),
        col: p.col,
        cols,
        left: p.col / cols,
        width: 1 / cols,
      });
    }
    group = [];
    groupEnd = -1;
  };
  for (const i of lanesItems) {
    if (group.length && i.startMin >= groupEnd) flush();
    group.push(i);
    groupEnd = Math.max(groupEnd, visualEnd(i));
  }
  flush();

  for (const c of containers) {
    blocks.push({ item: c, container: true, y: y(c.startMin), h: Math.max(minBlockPx, y(c.endMin) - y(c.startMin)), col: 0, cols: 1, left: 0, width: 1 });
  }

  const hours = [];
  for (let m = axisStart; m <= axisEnd; m += 60) hours.push({ min: m, y: y(m), label: fmtHour(m) });

  return {
    axisStart,
    axisEnd,
    height: y(axisEnd),
    hours,
    blocks: blocks.sort((a, b) => (a.container === b.container ? a.y - b.y : a.container ? -1 : 1)),
    nowY: nowMin != null && nowMin >= axisStart && nowMin <= axisEnd ? y(nowMin) : null,
  };
};

export default layoutDay;
