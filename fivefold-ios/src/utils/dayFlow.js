// The "day flow": the user's day as an ordered list of busy stretches and the
// free gaps between them. Free gaps are the tap targets and each one says
// whether the thing being scheduled fits. Ported from EyeCandy's dayFlow
// (minus episodic media). Pure: unit-tested in src/__tests__/dayFlow.selftest.js.

export const DAY_START = 5 * 60;
export const DAY_END = 23 * 60;
const MIN_GAP = 15;
const FORCIBLE_BLOCKER_MAX = 15;

const roundUp5 = (min) => Math.ceil(min / 5) * 5;

export const fmtFlowTime = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

export const fmtDur = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
};

// Names as a sentence: "A", "A and B", "A, B and 2 more".
export const listNames = (names) => {
  const u = [...new Set((names || []).filter(Boolean))];
  if (!u.length) return 'Busy';
  if (u.length === 1) return u[0];
  if (u.length === 2) return `${u[0]} and ${u[1]}`;
  return `${u[0]}, ${u[1]} and ${u.length - 2} more`;
};

// Merge overlapping / touching intervals into busy clusters; the label names
// everything inside ("Eat breakfast and 1st Prayer").
export const mergeClusters = (intervals) => {
  const sorted = (intervals || [])
    .filter((e) => e && Number.isFinite(e.endMin) && e.endMin > 0 && e.endMin > (e.startMin ?? 0))
    .map((e) => ({ startMin: e.startMin ?? Math.max(0, e.endMin - 1), endMin: e.endMin, title: e.title || null }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const out = [];
  for (const e of sorted) {
    const last = out[out.length - 1];
    if (last && e.startMin <= last.endMin) {
      if (e.endMin > last.endMin) last.endMin = e.endMin;
      last.titles.push(e.title);
    } else {
      out.push({ startMin: e.startMin, endMin: e.endMin, titles: [e.title] });
    }
  }
  return out.map((c) => ({ startMin: c.startMin, endMin: c.endMin, count: c.titles.length, label: listNames(c.titles) }));
};

// Rows for one day:
//   { type: 'free', startMin, endMin, pickMin, fits, fitLabel, rangeLabel, forcible?, blockerLabel?, forceSpan? }
//   { type: 'busy', startMin, endMin, label, rangeLabel }
// Gaps under 15 min fold into the neighbouring busy bar. On today the past
// is cut away. A too-short gap whose blocker is tiny (a 5-min prayer) is
// "forcible": a long-press may place the item over it, trimmed so it stops
// at the first big blocker.
export function computeDayFlow({ events = [], durationMinutes = 60, isToday = false, nowMin = 0 } = {}) {
  const need = Math.max(5, Number(durationMinutes) || 60);
  const windowStart = isToday ? Math.max(DAY_START, roundUp5(nowMin + 5)) : DAY_START;
  if (windowStart >= DAY_END) return [];

  const clusters = mergeClusters(events)
    .filter((c) => c.endMin > windowStart)
    .map((c) => ({ ...c, startMin: Math.max(c.startMin, windowStart) }));

  const rows = [];
  const pushFree = (start, end) => {
    const s = roundUp5(start);
    if (end - s < MIN_GAP) return;
    const len = end - s;
    rows.push({
      type: 'free',
      startMin: s,
      endMin: end,
      pickMin: s,
      fits: len >= need,
      fitLabel: len >= need ? `Free, fits your ${fmtDur(need)}` : `Too short, only ${fmtDur(len)} free`,
      rangeLabel: `${fmtFlowTime(s)} to ${fmtFlowTime(end)}`,
    });
  };

  let cursor = windowStart;
  for (const c of clusters) {
    if (c.startMin > cursor) pushFree(cursor, Math.min(c.startMin, DAY_END));
    rows.push({
      type: 'busy',
      startMin: c.startMin,
      endMin: c.endMin,
      label: c.label,
      rangeLabel: `${fmtFlowTime(c.startMin)} to ${fmtFlowTime(Math.min(c.endMin, DAY_END))}`,
    });
    cursor = Math.max(cursor, c.endMin);
    if (cursor >= DAY_END) break;
  }
  if (cursor < DAY_END) pushFree(cursor, DAY_END);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.type !== 'free' || r.fits) continue;
    const nextBusy = rows[i + 1] && rows[i + 1].type === 'busy' ? rows[i + 1] : null;
    const blockerLen = nextBusy ? nextBusy.endMin - nextBusy.startMin : null;
    if (blockerLen != null && blockerLen <= FORCIBLE_BLOCKER_MAX) {
      let spanEnd = DAY_END;
      for (let j = i + 1; j < rows.length; j++) {
        const n = rows[j];
        if (n.type === 'busy' && n.endMin - n.startMin > FORCIBLE_BLOCKER_MAX) { spanEnd = n.startMin; break; }
      }
      const span = Math.max(0, spanEnd - r.pickMin);
      if (span >= need) {
        r.forcible = true;
        r.blockerLabel = nextBusy.label;
        r.forceSpan = span;
        r.fitLabel = `Only ${nextBusy.label} (${fmtDur(blockerLen)}) is in the way. Hold to use anyway`;
      }
    }
  }
  return rows;
}

// What the chosen start would overlap, as a sentence, or null when clear.
export const clashFor = (startMin, durationMinutes, events = []) => {
  if (startMin == null) return null;
  const endMin = startMin + Math.max(5, Number(durationMinutes) || 60);
  const hits = (events || [])
    .filter((e) => e && Number.isFinite(e.startMin) && Number.isFinite(e.endMin) && e.startMin < endMin && e.endMin > startMin)
    .sort((a, b) => a.startMin - b.startMin);
  if (!hits.length) return null;
  return `Overlaps ${listNames(hits.map((e) => e.title || 'something'))}`;
};
