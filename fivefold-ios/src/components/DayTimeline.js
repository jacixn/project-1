import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { formatDuration } from '../utils/duration';

// A one-day scheduling instrument. The reminder being placed is a lit gradient
// "hero" block the user drops on a time by TAP (jump) or LONG-PRESS + DRAG
// (scrub, 5-min snap). If the phone calendar is readable its events are laid
// out behind the block so conflicts are visible; calendar access is optional
// and never blocks placement.
//
// Honesty + ergonomics rules:
// - Events too short to draw to scale render as fixed-height PILLS pinned to
//   their start line, with a left tick showing their TRUE extent. A 5-minute
//   reminder never masquerades as a 20-minute block.
// - Every block shows its start AND end time (pills add the duration).
// - Placement lands on a 5-min grid, but a magnet pulls near an event's edge to
//   its TRUE minute so adjacent items butt up cleanly.
// - After placement a nudge row (-5 / exact time wheel / +5) allows precision
//   without pixel-perfect dragging.

const HOUR_H_BASE = 58;
const SNAP = 5;
// Magnet, in absolute MINUTES (scale-independent). Within MAGNET_LOCK_MIN of an
// event boundary the block hard-locks to that exact minute (+ a firm haptic).
// From there out to MAGNET_PULL_MIN the block is ATTRACTED toward the edge: it
// visibly drifts in, and near the edge it takes real travel to escape, so the
// snap feels strong while adjacent grid points stay reachable (just harder).
const MAGNET_LOCK_MIN = 4;
const MAGNET_PULL_MIN = 12;
// Events shorter than this are brief reminders/breaks you watch through; they
// do NOT block a snap (movies) or force a trim (episodic). Only real
// commitments (workouts, meetings) constrain where the block can land.
const MAGNET_IGNORE_MIN = 30;
const GUTTER = 54;
const RIGHT_PAD = 8;
const COL_GAP = 3;
const VIEW_H = 380;
const EDGE_SCROLL = 64; // px from the viewport edge where a drag starts auto-scrolling
const DAY_MIN = 24 * 60;
const TOP_PAD = 10;    // breathing room so the 12 AM (top) label isn't clipped
const BOTTOM_PAD = 44; // room so late-night times + the 12 AM end label aren't cut off
const PILL_H = 32;     // fixed height for events too short to draw to scale
const SCREEN_W = Dimensions.get('window').width;
const FALLBACK_W = SCREEN_W - 72;

const contentHFor = (hourH) => 24 * hourH + TOP_PAD + BOTTOM_PAD;
// Minute <-> pixel. The timeline starts TOP_PAD below the content top.
const yForMin = (min, hourH) => TOP_PAD + (min / 60) * hourH;
const minutesForPx = (px, hourH) => (px / hourH) * 60;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const asDate = (v) => (v instanceof Date ? v : new Date(v));
const snapFromMin = (mins) => clamp(Math.round(mins / SNAP) * SNAP, 0, DAY_MIN - SNAP);

// Lighten (amt > 0) or darken (amt < 0) a #rrggbb hex by a 0..1 fraction.
const shade = (hex, amt) => {
  const h = String(hex || '#667eea').replace('#', '');
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const r = Math.round((((num >> 16) & 0xff)) * (1 - p) + t * p);
  const g = Math.round((((num >> 8) & 0xff)) * (1 - p) + t * p);
  const b = Math.round(((num & 0xff)) * (1 - p) + t * p);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const fmtHM = (mins) => {
  const h = Math.floor(mins / 60) % 24;   // 1440 (midnight end) -> 0 -> "12:00 AM"
  const m = mins % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};
const fmtShort = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')}`;
};
const fmtHourLabel = (h) => {
  const hh = h % 24;            // 24 -> 0 so the end-of-day label reads 12 AM
  const ap = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12} ${ap}`;
};
// Compact duration for tight pill/bubble rows: 5m, 45m, 1h, 1h 50m.
const fmtDur = (mins) => {
  const n = Math.max(0, Math.round(mins));
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
// Start-end shown on blocks: end always carries AM/PM; start drops it when it
// matches the end's so short widths still fit ("5:00 - 5:05 PM").
const fmtRange = (s, e) => {
  const sameAp = Math.floor((s / 60) % 24 >= 12 ? 1 : 0) === Math.floor((e / 60) % 24 >= 12 ? 1 : 0);
  return `${sameAp ? fmtShort(s) : fmtHM(s)} - ${fmtHM(e)}`;
};

// Calendar-style overlap layout: overlapping items get side-by-side columns.
// Items carry a layoutEndMin >= endMin so fixed-height pills reserve the
// vertical space they VISUALLY occupy, not just their true minutes.
const layoutColumns = (items) => {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.layoutEndMin - b.layoutEndMin);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  let laneEnds = [];
  const flush = () => {
    const cols = cluster.reduce((mx, e) => Math.max(mx, e._lane + 1), 1);
    for (const e of cluster) out.push({ ...e, _cols: cols });
    cluster = [];
    clusterEnd = -1;
    laneEnds = [];
  };
  for (const e of sorted) {
    if (cluster.length && e.startMin >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= e.startMin);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = e.layoutEndMin;
    cluster.push({ ...e, _lane: lane });
    clusterEnd = Math.max(clusterEnd, e.layoutEndMin);
  }
  if (cluster.length) flush();
  return out;
};

const DayTimeline = ({ date, selected, durationMinutes = 60, episodeMinutes = 0, label, accentColor, onPick }) => {
  // episodeMinutes > 0 marks EPISODIC content (multi-episode TV/anime): the
  // block then live-trims whole episodes to fit the gap before the next event
  // as you drag, and onPick reports the trimmed duration as a 3rd arg. 0 (the
  // default, and every non-episodic caller) keeps a fixed durationMinutes.
  const { theme, isDark } = useTheme();
  const [state, setState] = useState('loading'); // loading | ready
  const [events, setEvents] = useState([]);
  const [allDay, setAllDay] = useState([]);
  const [liveMin, setLiveMin] = useState(null);   // committed (snapped) minute while scrubbing
  const [liveRenderMin, setLiveRenderMin] = useState(null); // continuous drift position of the block
  const [contentW, setContentW] = useState(FALLBACK_W);
  const [nowMin, setNowMin] = useState(null);      // today's current minute, else null
  const [justPlaced, setJustPlaced] = useState(false);
  const hourH = HOUR_H_BASE; // fixed scale (drag no longer zooms)
  const [showWheel, setShowWheel] = useState(false);

  const scrollRef = useRef(null);
  const didScrollRef = useRef(false);
  const lastSnapRef = useRef(null);
  const scrubAnchorRef = useRef(0);
  const selMinRef = useRef(null);
  const placeTimerRef = useRef(null);
  const scrollYRef = useRef(0);            // live scroll offset
  const durationRef = useRef(durationMinutes);
  const episodeMinutesRef = useRef(episodeMinutes);
  const hourHRef = useRef(HOUR_H_BASE);
  const eventsRef = useRef([]);            // events for gesture-time magnet math

  const scrubP = useSharedValue(0); // 0 idle, 1 scrubbing -> dims the ambient rail
  const dragP = useSharedValue(0);  // 0 idle, 1 dragging -> lifts the hero block

  const dayKey = date ? date.toDateString() : '';

  const accent = accentColor || theme.primary || '#667eea';
  const heroColors = [shade(accent, 0.18), accent, shade(accent, -0.28)];

  // Theme-adaptive instrument palette. Dark = deep neutral panel; light = paper.
  const pal = isDark
    ? {
        wash: ['#0D0F14', '#12151C', '#161A23', '#12151C', '#0D0F14'],
        rail: 'rgba(6,8,12,0.55)',
        divider: 'rgba(255,255,255,0.10)',
        field: 'rgba(255,255,255,0.02)',
        hourLine: 'rgba(240,240,245,0.08)',
        halfTick: 'rgba(240,240,245,0.05)',
        evtBg: 'rgba(255,255,255,0.07)',
        evtBorder: 'rgba(255,255,255,0.13)',
        evtAccent: 'rgba(255,255,255,0.45)',
        vignette: '10,12,16',
        summaryBg: 'rgba(255,255,255,0.05)',
      }
    : {
        wash: ['#FFFFFF', '#F6F7FB', '#F1F3F9', '#F6F7FB', '#FFFFFF'],
        rail: 'rgba(0,0,0,0.03)',
        divider: 'rgba(0,0,0,0.10)',
        field: 'rgba(0,0,0,0.012)',
        hourLine: 'rgba(0,0,0,0.07)',
        halfTick: 'rgba(0,0,0,0.04)',
        evtBg: '#FFFFFF',
        evtBorder: 'rgba(0,0,0,0.10)',
        evtAccent: 'rgba(0,0,0,0.22)',
        vignette: '255,255,255',
        summaryBg: 'rgba(0,0,0,0.02)',
      };
  const WASH_LOCS = [0, 0.28, 0.5, 0.72, 1];

  useEffect(() => {
    let cancelled = false;
    didScrollRef.current = false;
    (async () => {
      setState('loading');
      // Calendar overlay is a bonus, never a gate. If we can't read it, the
      // timeline is still fully usable; we just show no ambient events.
      try {
        let perm = await Calendar.getCalendarPermissionsAsync();
        if (!perm.granted && perm.status === 'undetermined') {
          perm = await Calendar.requestCalendarPermissionsAsync();
        }
        if (!perm.granted) {
          if (!cancelled) { setEvents([]); setAllDay([]); setState('ready'); }
          return;
        }
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const ids = (cals || []).map((c) => c.id);
        const raw = ids.length ? await Calendar.getEventsAsync(ids, dayStart, dayEnd) : [];
        if (cancelled) return;

        const timed = [];
        const whole = [];
        for (const e of raw || []) {
          if (e.allDay) { whole.push(e.title || 'All-day'); continue; }
          const s = asDate(e.startDate);
          const en = asDate(e.endDate);
          const startMin = clamp(s < dayStart ? 0 : s.getHours() * 60 + s.getMinutes(), 0, DAY_MIN);
          // True end, no padding: pills handle sub-15-min readability now, so
          // a 5-min reminder keeps its honest 5-min extent.
          const endMin = clamp(en > dayEnd ? DAY_MIN : en.getHours() * 60 + en.getMinutes(), startMin + 1, DAY_MIN);
          timed.push({ id: e.id, title: e.title || 'Busy', startMin, endMin });
        }
        timed.sort((a, b) => a.startMin - b.startMin);
        setEvents(timed);
        setAllDay(whole);
        setState('ready');
      } catch {
        if (!cancelled) { setEvents([]); setAllDay([]); setState('ready'); }
      }
    })();
    return () => { cancelled = true; };
  }, [dayKey]);

  // Today's now-line, refreshed every 30s.
  useEffect(() => {
    const isToday = dayKey === new Date().toDateString();
    if (!isToday) { setNowMin(null); return undefined; }
    const tick = () => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [dayKey]);

  useEffect(() => () => { if (placeTimerRef.current) clearTimeout(placeTimerRef.current); }, []);

  const selMin = selected ? clamp(selected.hour * 60 + selected.minute, 0, DAY_MIN) : null;
  selMinRef.current = selMin;
  durationRef.current = durationMinutes;
  episodeMinutesRef.current = episodeMinutes;
  hourHRef.current = hourH;
  eventsRef.current = events;

  // Live-trim: episodic content shrinks to whole episodes that fit the gap
  // before the next event below `startM`. Non-episodic returns its fixed
  // duration unchanged. gapBelow = minutes from startM down to the nearest
  // event that STARTS after it (Infinity if nothing is below).
  const gapBelow = useCallback((startM) => {
    let g = Infinity;
    for (const ev of eventsRef.current) {
      if ((ev.endMin - ev.startMin) < MAGNET_IGNORE_MIN) continue; // watch through brief reminders
      if (ev.startMin > startM && ev.startMin - startM < g) g = ev.startMin - startM;
    }
    return g;
  }, []);
  const effDurFor = useCallback((startM) => {
    const full = durationRef.current;
    const em = episodeMinutesRef.current;
    if (!em || em <= 0) return full;             // not episodic -> fixed length
    const gap = gapBelow(startM);
    if (gap >= full) return full;                // the whole thing already fits
    const eps = Math.max(1, Math.floor(gap / em)); // >=1 episode, whole episodes only
    return Math.min(full, eps * em);
  }, [gapBelow]);

  // Magnetic edge snapping, done as a gravity well in MINUTE space so it is
  // strong and scale-independent. Returns { commit, render, edge }:
  //   - render: continuous minute the BLOCK is drawn at (drifts toward an edge
  //     inside the pull zone, so the magnet visibly reaches out and grabs).
  //   - commit: the value shown as text / handed to onPick (an exact edge when
  //     locked, else a 5-min grid minute).
  //   - edge: true when it has locked onto a boundary (drives the one haptic).
  // Attractors per event: its start (align starts), its true end, and the
  // start-minus-duration point (the hero's BOTTOM meeting the next event's
  // start). A PILL (short event drawn taller than its true minutes) is special:
  // BOTH its edges are magnetic across the drawn body, so the fake space inside
  // a pill (e.g. a 5-min 11:00-11:05 prayer drawn 33 min tall) is never a dead
  // zone. The upper part snaps to the pill's START (align to it), the lower part
  // and its shadow to the pill's END (start right after), split at the midpoint
  // of the start line and the true-end line.
  //
  // OVERLAP AVOIDANCE: a snap is suppressed only when the resulting block would
  // FULLY COVER an event other than the one being snapped to. Partial tail
  // overlap is fine (a long block snapped to a clean edge, whose end merely
  // clips a later event, is what the user wants); only swallowing a whole event
  // is wrong (how a 95-min block used to snap to 2:55 and sit on top of a
  // 3:00-4:30 workout). The anchor is exempt, so start-align is still allowed.
  const magnetize = useCallback((rawMin) => {
    const hh = hourHRef.current;
    const dur = durationRef.current;
    const rawPx = yForMin(rawMin, hh);
    const lockPx = (MAGNET_LOCK_MIN / 60) * hh;
    const evs = eventsRef.current;
    const episodic = episodeMinutesRef.current > 0;
    // Non-episodic: would a full block [top, top+dur] fully contain any event
    // except `anchor`? (partial tail overlap is allowed.)
    const wouldSwallow = (top, anchor) => {
      const end = top + dur;
      for (const e of evs) {
        if (e === anchor) continue;
        if ((e.endMin - e.startMin) < MAGNET_IGNORE_MIN) continue; // brief reminder: watch through it
        if (top <= e.startMin && end >= e.endMin) return true;
      }
      return false;
    };
    // Episodic: the TRIMMED block at `top` must not overlap ANY event. Trimming
    // guarantees no overlap with the next event below, but not with an event AT
    // the start, one already in progress, or a sub-1-episode gap, so this is a
    // real check (using the fitted length), not an assumption.
    const fits = (top) => {
      const end = top + effDurFor(top);
      for (const e of evs) {
        if ((e.endMin - e.startMin) < MAGNET_IGNORE_MIN) continue; // brief reminder: watch through it
        if (top < e.endMin && end > e.startMin) return false;
      }
      return true;
    };
    const blocked = (min, anchor) => (episodic ? !fits(min) : wouldSwallow(min, anchor));
    let best = null; // { min, a } nearest valid attractor by minute distance
    let pill = null; // { min, d } nearest valid pill edge whose zone we're inside
    const consider = (min, anchor) => {
      if (min < 0 || min > DAY_MIN - 1) return;
      if (blocked(min, anchor)) return;
      const a = Math.abs(rawMin - min);
      if (!best || a < best.a) best = { min, a };
    };
    for (const ev of evs) {
      consider(ev.startMin, ev);
      consider(ev.endMin, ev);
      if (!episodic) consider(ev.startMin - dur, ev); // "end docks to next start" is automatic when trimming
      const trueH = ((ev.endMin - ev.startMin) / 60) * hh - 2;
      if (trueH < PILL_H) {
        const topPx = yForMin(ev.startMin, hh);
        const endPx = yForMin(ev.endMin, hh);
        const bottomPx = topPx + PILL_H + 2;   // the pill's drawn extent
        const splitPx = (topPx + endPx) / 2;
        let cand = null;
        if (rawPx >= topPx - 2 * lockPx && rawPx < splitPx) {
          cand = { min: ev.startMin, d: Math.abs(rawPx - topPx) };     // upper -> START
        } else if (rawPx >= splitPx && rawPx <= bottomPx + lockPx) {
          cand = { min: ev.endMin, d: Math.abs(rawPx - endPx) };       // lower/shadow -> END
        }
        if (cand && !blocked(cand.min, ev) && (!pill || cand.d < pill.d)) pill = cand;
      }
    }
    if (pill) return { commit: pill.min, render: pill.min, edge: true };
    if (best) {
      if (best.a <= MAGNET_LOCK_MIN) {
        return { commit: best.min, render: best.min, edge: true };
      }
      if (best.a <= MAGNET_PULL_MIN) {
        // Ease-in pull: near the edge the block is sucked almost to it; the
        // grip relaxes toward the outer radius. Commit the DRIFTED position so
        // the block and its time agree, and flag edge when the pull lands
        // exactly on the boundary minute.
        const sign = rawMin >= best.min ? 1 : -1;
        const s = (best.a - MAGNET_LOCK_MIN) / (MAGNET_PULL_MIN - MAGNET_LOCK_MIN);
        const pulled = MAGNET_LOCK_MIN + (MAGNET_PULL_MIN - MAGNET_LOCK_MIN) * s * s;
        const render = clamp(best.min + sign * pulled, 0, DAY_MIN);
        const commit = snapFromMin(render);
        return { commit, render, edge: commit === best.min };
      }
    }
    const g = snapFromMin(rawMin);
    return { commit: g, render: g, edge: false };
  }, [effDurFor]);

  const handleContentLayout = useCallback((e) => {
    const w = e?.nativeEvent?.layout?.width;
    if (w && Math.abs(w - contentW) > 1) setContentW(w);
    if (didScrollRef.current || state !== 'ready') return;
    didScrollRef.current = true;
    const focus = selMin != null ? selMin : 8 * 60;
    const y = clamp(yForMin(focus, hourHRef.current) - VIEW_H / 3, 0, contentHFor(hourHRef.current) - VIEW_H);
    scrollYRef.current = y;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
  }, [state, selMin, contentW]);

  const flashPlaced = useCallback(() => {
    setJustPlaced(true);
    if (placeTimerRef.current) clearTimeout(placeTimerRef.current);
    placeTimerRef.current = setTimeout(() => setJustPlaced(false), 220);
  }, []);

  // Drag = translationY DELTA from the anchor (no absolute coordinate).
  // No pickup haptic: the block lifting is the "engaged" cue. The ONLY haptic
  // in a drag is the magnet lock (below), so it reads unmistakably.
  const scrubStart = useCallback(() => {
    const a = selMinRef.current != null ? selMinRef.current : 8 * 60;
    scrubAnchorRef.current = a;
    lastSnapRef.current = a;
    scrubP.value = withTiming(1, { duration: 160 });
    dragP.value = withTiming(1, { duration: 160 });
    setLiveMin(a);
    setLiveRenderMin(a);
  }, []);
  const scrubMove = useCallback((dy) => {
    const rawMin = clamp(scrubAnchorRef.current + (dy / hourHRef.current) * 60, 0, DAY_MIN);
    const res = magnetize(rawMin);
    const m = res.commit;
    if (m !== lastSnapRef.current) {
      lastSnapRef.current = m;
      // The magnet snapping onto an edge is the ONLY drag haptic (a firm knock).
      // Plain 5-min steps are silent now.
      if (res.edge) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    setLiveMin(m);
    setLiveRenderMin(res.render);
    // Follow the block (drifted position): if it nears a viewport edge, scroll
    // the day to keep it in view.
    const hh = hourHRef.current;
    const top = yForMin(res.render, hh);
    const h = Math.max(PILL_H, (effDurFor(res.commit) / 60) * hh);
    const sy = scrollYRef.current;
    let target = sy;
    if (top < sy + EDGE_SCROLL) target = Math.max(0, top - EDGE_SCROLL);
    else if (top + h > sy + VIEW_H - EDGE_SCROLL) target = Math.min(contentHFor(hh) - VIEW_H, top + h - VIEW_H + EDGE_SCROLL);
    if (Math.abs(target - sy) > 0.5) {
      scrollYRef.current = target;
      scrollRef.current?.scrollTo({ y: target, animated: false });
    }
  }, [magnetize, effDurFor]);
  const scrubCommit = useCallback((dy) => {
    const rawMin = clamp(scrubAnchorRef.current + (dy / hourHRef.current) * 60, 0, DAY_MIN);
    const m = magnetize(rawMin).commit;
    lastSnapRef.current = null;
    scrubP.value = withTiming(0, { duration: 160 });
    dragP.value = withTiming(0, { duration: 160 });
    setLiveMin(null);
    setLiveRenderMin(null);
    flashPlaced();
    onPick?.(Math.floor(m / 60), m % 60, episodeMinutesRef.current > 0 ? effDurFor(m) : undefined);
  }, [onPick, flashPlaced, magnetize, effDurFor]);
  const scrubCancel = useCallback(() => {
    lastSnapRef.current = null;
    scrubP.value = withTiming(0, { duration: 160 });
    dragP.value = withTiming(0, { duration: 160 });
    setLiveMin(null);
    setLiveRenderMin(null);
  }, []);
  const tapAt = useCallback((y) => {
    const rawY = clamp(((y - TOP_PAD) / hourHRef.current) * 60, 0, DAY_MIN);
    const res = magnetize(rawY);
    const m = res.commit;
    // A tap is a discrete placement, so it keeps a light confirmation tick; if
    // it lands on an edge, the firmer magnet knock instead.
    if (res.edge) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else Haptics.selectionAsync();
    flashPlaced();
    onPick?.(Math.floor(m / 60), m % 60, episodeMinutesRef.current > 0 ? effDurFor(m) : undefined);
  }, [onPick, flashPlaced, magnetize, effDurFor]);

  // Post-placement fine-tune: +-5 min without re-dragging.
  const nudge = useCallback((deltaMin) => {
    const cur = selMinRef.current;
    if (cur == null) return;
    const m = clamp(snapFromMin(cur + deltaMin), 0, DAY_MIN - SNAP);
    if (m === cur) return;
    Haptics.selectionAsync();
    flashPlaced();
    onPick?.(Math.floor(m / 60), m % 60, episodeMinutesRef.current > 0 ? effDurFor(m) : undefined);
  }, [onPick, flashPlaced, effDurFor]);

  const onWheelChange = useCallback((event, picked) => {
    if (!picked) return;
    const m = clamp(picked.getHours() * 60 + picked.getMinutes(), 0, DAY_MIN - 1);
    if (m !== selMinRef.current) onPick?.(Math.floor(m / 60), m % 60, episodeMinutesRef.current > 0 ? effDurFor(m) : undefined);
  }, [onPick, effDurFor]);

  const scrub = Gesture.Pan()
    .activateAfterLongPress(160)
    .onStart(() => { runOnJS(scrubStart)(); })
    .onUpdate((e) => { runOnJS(scrubMove)(e.translationY); })
    // Only commit a real release; a cancelled/interrupted active gesture fires
    // onEnd with success=false and must NOT set the time (onFinalize resets it).
    .onEnd((e, success) => { if (success) runOnJS(scrubCommit)(e.translationY); })
    .onFinalize((e, success) => { if (!success) runOnJS(scrubCancel)(); });

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => { runOnJS(tapAt)(e.y); });

  const gesture = Gesture.Exclusive(scrub, tap);

  const ambientStyle = useAnimatedStyle(() => ({ opacity: 1 - scrubP.value * 0.4 }));
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + dragP.value * 0.02 }],
  }));

  const effMin = liveMin != null ? liveMin : selMin;          // committed value -> all TEXT
  const scrubbing = liveMin != null;
  // POSITION of the block/guideline/caret. While scrubbing it follows the
  // continuous drift so the magnet visibly pulls the block toward an edge; the
  // time text stays on the committed value.
  const renderMin = (scrubbing && liveRenderMin != null) ? liveRenderMin : effMin;
  // Effective length at the committed start: episodic content is trimmed to the
  // whole episodes that fit the gap below; everything else keeps its full length.
  const effDur = effMin != null ? effDurFor(effMin) : durationMinutes;
  const episodic = episodeMinutes > 0;
  const epCount = episodic ? Math.max(1, Math.round(effDur / episodeMinutes)) : 0;
  const durLabel = episodic ? `${epCount} ep` : fmtDur(effDur);
  const endMin = effMin != null ? clamp(effMin + effDur, effMin + 5, DAY_MIN) : null;
  const contentH = contentHFor(hourH);
  const pillSpanMin = minutesForPx(PILL_H + 2, hourH); // minutes a pill visually covers

  const withLayoutSpan = (it) => ({
    ...it,
    layoutEndMin: Math.max(it.endMin, it.startMin + pillSpanMin),
  });
  const selItem = effMin != null
    ? withLayoutSpan({ id: '__sel__', isSel: true, startMin: effMin, endMin: clamp(effMin + effDur, effMin + 1, DAY_MIN) })
    : null;
  const laidOut = layoutColumns(selItem ? [...events.map(withLayoutSpan), selItem] : events.map(withLayoutSpan));
  const availW = Math.max(80, contentW - GUTTER - RIGHT_PAD);

  const selPx = effMin != null ? yForMin(renderMin, hourH) : 0;
  const nowPx = nowMin != null ? yForMin(nowMin, hourH) : 0;
  const wheelDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor((selMin ?? 480) / 60), (selMin ?? 480) % 60);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.overline, { color: theme.textTertiary }]}>DRAG TO SET TIME</Text>
        <View style={[styles.snapTag, { borderColor: accent + '55', backgroundColor: accent + '1E' }]}>
          <Text style={[styles.snapTagText, { color: accent }]}>SNAP 5 MIN</Text>
        </View>
      </View>

      {state === 'ready' && allDay.length > 0 && (
        <View style={[styles.allDay, { borderColor: accent + '30', backgroundColor: pal.summaryBg }]}>
          <Text style={[styles.allDayText, { color: theme.textSecondary }]} numberOfLines={1}>
            All-day: {allDay.join(', ')}
          </Text>
        </View>
      )}

      {state === 'loading' ? (
        <View style={[styles.loading, { height: VIEW_H }]}>
          <ActivityIndicator color={accent} />
          <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Preparing the day…</Text>
        </View>
      ) : (
        <>
          <View style={styles.timelineWrap}>
            <ScrollView
              ref={scrollRef}
              style={{ height: VIEW_H }}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
            >
              <GestureDetector gesture={gesture}>
                <View style={{ height: contentH }} onLayout={handleContentLayout}>
                  {/* Wash, scrolls with the hours. */}
                  <View style={styles.washWrap} pointerEvents="none">
                    <LinearGradient colors={pal.wash} locations={WASH_LOCS} style={StyleSheet.absoluteFill} />
                  </View>

                  {/* Left rail channel + divider. */}
                  <View style={[styles.railChannel, { backgroundColor: pal.rail }]} pointerEvents="none" />
                  <View style={[styles.railDivider, { backgroundColor: pal.divider }]} pointerEvents="none" />

                  {/* Flat base over the field so EMPTY time reads as empty. */}
                  <View style={[styles.fieldBase, { backgroundColor: pal.field }]} pointerEvents="none" />

                  {/* Ambient layer (dims while scrubbing so the hero owns the foreground). */}
                  <Animated.View style={[StyleSheet.absoluteFill, ambientStyle]} pointerEvents="none">
                    {Array.from({ length: 25 }).map((_, h) => (
                      <View key={h} style={[styles.hourRow, { top: TOP_PAD + h * hourH }]}>
                        <Text style={[styles.hourLabel, { color: h === 12 ? theme.textSecondary : theme.textTertiary }]}>
                          {fmtHourLabel(h)}
                        </Text>
                        <View style={[styles.hourLine, { backgroundColor: pal.hourLine }]} />
                      </View>
                    ))}
                    {Array.from({ length: 24 }).map((_, h) => (
                      <View key={`t${h}`} style={[styles.halfTick, { top: TOP_PAD + h * hourH + hourH / 2, backgroundColor: pal.halfTick }]} />
                    ))}

                    {laidOut.filter((it) => !it.isSel).map((it) => {
                      const colW = availW / it._cols;
                      const left = GUTTER + it._lane * colW;
                      const width = Math.max(24, colW - COL_GAP);
                      const top = yForMin(it.startMin, hourH) + 1;
                      const trueH = ((it.endMin - it.startMin) / 60) * hourH - 2;
                      const isPill = trueH < PILL_H;
                      const height = isPill ? PILL_H : trueH;
                      const range = fmtRange(it.startMin, it.endMin);
                      const twoLines = height >= 44 || isPill;
                      return (
                        <View key={it.id} style={[styles.evt, { top, left, width, height, backgroundColor: pal.evtBg, borderColor: pal.evtBorder }]}>
                          {/* Left tick = TRUE extent. On pills it is shorter than
                              the card, telling the eye "this is brief". */}
                          <View style={[styles.evtAccent, { backgroundColor: pal.evtAccent, height: isPill ? Math.max(4, trueH) : '100%' }]} />
                          {twoLines ? (
                            <>
                              <Text style={[styles.evtTitle, { color: theme.text }]} numberOfLines={1}>{it.title}</Text>
                              <Text style={[styles.evtTime, { color: theme.textTertiary }]} numberOfLines={1}>
                                {isPill ? `${range} · ${fmtDur(it.endMin - it.startMin)}` : range}
                              </Text>
                            </>
                          ) : (
                            <View style={styles.evtInlineRow}>
                              <Text style={[styles.evtTitle, { color: theme.text, flexShrink: 1 }]} numberOfLines={1}>{it.title}</Text>
                              <Text style={[styles.evtTime, { color: theme.textTertiary, marginTop: 0 }]} numberOfLines={1}>{range}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </Animated.View>

                  {/* Today now-line (full strength, above the ambient dim). */}
                  {nowMin != null && (
                    <>
                      <View style={[styles.nowLine, { top: nowPx, backgroundColor: theme.error || '#EF4444' }]} pointerEvents="none" />
                      <View style={[styles.nowNub, { top: nowPx - 4, backgroundColor: theme.error || '#EF4444' }]} pointerEvents="none" />
                    </>
                  )}

                  {/* Hero: the reminder being placed. */}
                  {effMin != null && laidOut.filter((it) => it.isSel).map((it) => {
                    const colW = availW / it._cols;
                    const left = GUTTER + it._lane * colW;
                    const width = Math.max(24, colW - COL_GAP);
                    const top = selPx + 1;
                    const height = Math.max(PILL_H, Math.min((effDur / 60) * hourH - 2, contentH - top - 1));
                    const tall = height > 46;
                    return (
                      <Animated.View
                        key="__sel__"
                        pointerEvents="none"
                        style={[styles.selShadow, { top, left, width, height }, heroStyle]}
                      >
                        <View style={styles.selClip}>
                          <LinearGradient colors={heroColors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
                          <LinearGradient
                            colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
                            style={styles.selSheen}
                            pointerEvents="none"
                          />
                          <View style={styles.selContent}>
                            {tall && label ? (
                              <View style={styles.selTitleRow}>
                                <View style={styles.playMark} />
                                <Text style={styles.selTitle} numberOfLines={1}>{label}</Text>
                              </View>
                            ) : null}
                            <Text style={styles.selTime} numberOfLines={1}>
                              {tall ? `${fmtRange(effMin, endMin)} · ${durLabel}` : fmtRange(effMin, endMin)}
                            </Text>
                          </View>
                          <View style={styles.selGripWrap}>
                            <View style={styles.gripBar} />
                            <View style={styles.gripBar} />
                          </View>
                        </View>
                      </Animated.View>
                    );
                  })}

                  {/* Guideline + rail caret (full strength). */}
                  {effMin != null && (
                    <>
                      <View style={[styles.guideline, { top: selPx, backgroundColor: accent + '80' }]} pointerEvents="none" />
                      <View
                        style={[styles.caret, { top: selPx - 9, backgroundColor: accent }]}
                        pointerEvents="none"
                      >
                        <Text style={styles.caretText}>{fmtShort(effMin)}</Text>
                      </View>
                      <View style={[styles.caretTri, { top: selPx - 4, borderLeftColor: accent }]} pointerEvents="none" />
                    </>
                  )}
                </View>
              </GestureDetector>
            </ScrollView>

            <LinearGradient colors={[`rgba(${pal.vignette},0.55)`, `rgba(${pal.vignette},0)`]} style={styles.vignetteTop} pointerEvents="none" />
            <LinearGradient colors={[`rgba(${pal.vignette},0)`, `rgba(${pal.vignette},0.55)`]} style={styles.vignetteBottom} pointerEvents="none" />
          </View>

          {/* Persistent status strip + fine-tune nudges. */}
          <View style={[styles.summary, { borderColor: justPlaced ? accent : theme.border, backgroundColor: pal.summaryBg }]}>
            <View style={[styles.summaryBar, { backgroundColor: accent }]} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.summaryTime, { color: effMin == null ? theme.textTertiary : (scrubbing ? accent : theme.text) }]}
                numberOfLines={1}
              >
                {effMin != null ? fmtHM(effMin) : '--:--'}
              </Text>
              {effMin != null && (
                <Text style={[styles.summaryRange, { color: theme.textSecondary }]} numberOfLines={1}>
                  {`${fmtHM(effMin)} to ${fmtHM(endMin)} · ${formatDuration(effDur)}${episodic ? ' · ' + epCount + ' ep' : ''}`}
                </Text>
              )}
            </View>
            {selMin != null && !scrubbing ? (
              <View style={styles.nudgeRow}>
                <TouchableOpacity
                  onPress={() => nudge(-SNAP)}
                  disabled={selMin <= 0}
                  style={[styles.nudgeBtn, { borderColor: theme.border, opacity: selMin <= 0 ? 0.35 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="5 minutes earlier"
                >
                  <Text style={[styles.nudgeBtnText, { color: theme.text }]}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setShowWheel((v) => !v); }}
                  style={[styles.nudgeClock, { borderColor: showWheel ? accent : theme.border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Set exact time"
                >
                  <Text style={[styles.nudgeClockText, { color: showWheel ? accent : theme.text }]}>Exact</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => nudge(SNAP)}
                  disabled={selMin >= DAY_MIN - SNAP}
                  style={[styles.nudgeBtn, { borderColor: theme.border, opacity: selMin >= DAY_MIN - SNAP ? 0.35 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="5 minutes later"
                >
                  <Text style={[styles.nudgeBtnText, { color: theme.text }]}>+5</Text>
                </TouchableOpacity>
              </View>
            ) : label ? (
              <Text style={[styles.summaryLabel, { color: theme.textTertiary }]} numberOfLines={1}>{label}</Text>
            ) : null}
          </View>

          {showWheel && selMin != null && (
            <View style={styles.wheelWrap}>
              <DateTimePicker
                value={wheelDate}
                mode="time"
                display="spinner"
                minuteInterval={5}
                onChange={onWheelChange}
                themeVariant={isDark ? 'dark' : 'light'}
                style={styles.wheel}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  headerRow: {
    height: 26,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  snapTag: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  snapTagText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 },
  allDay: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  allDayText: { fontSize: 12, fontWeight: '600' },
  loading: { justifyContent: 'center', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, fontWeight: '500' },
  timelineWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  washWrap: { ...StyleSheet.absoluteFillObject },
  railChannel: { position: 'absolute', left: 0, top: 0, bottom: 0, width: GUTTER },
  railDivider: { position: 'absolute', left: GUTTER - 1, top: 0, bottom: 0, width: 1 },
  fieldBase: { position: 'absolute', left: GUTTER, right: 0, top: 0, bottom: 0 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_H_BASE,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    width: GUTTER - 8,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: -6,
    marginRight: 8,
    fontVariant: ['tabular-nums'],
  },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth, marginTop: -1 },
  halfTick: { position: 'absolute', left: GUTTER - 8, width: 8, height: StyleSheet.hairlineWidth },
  evt: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  evtAccent: { position: 'absolute', left: 0, top: 0, width: 3 },
  evtTitle: { fontSize: 11.5, fontWeight: '700', letterSpacing: -0.1 },
  evtTime: { fontSize: 10, fontWeight: '600', marginTop: 1, fontVariant: ['tabular-nums'] },
  evtInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nowLine: { position: 'absolute', left: GUTTER - 6, right: RIGHT_PAD, height: 2 },
  nowNub: { position: 'absolute', left: GUTTER - 6, width: 4, height: 8, borderRadius: 1.5 },
  selShadow: {
    position: 'absolute',
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 15,
    shadowOpacity: 0.5,
    elevation: 10,
  },
  selClip: { ...StyleSheet.absoluteFillObject, borderRadius: 10, overflow: 'hidden' },
  selSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: '42%' },
  selContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 3 },
  selTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playMark: { width: 3, height: 9, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.85)' },
  selTitle: { color: '#fff', fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2, flexShrink: 1 },
  selTime: { color: 'rgba(255,255,255,0.96)', fontSize: 11, fontWeight: '700', marginTop: 1, fontVariant: ['tabular-nums'] },
  selGripWrap: { position: 'absolute', bottom: 3, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 3 },
  gripBar: { width: 12, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  guideline: { position: 'absolute', left: GUTTER, right: RIGHT_PAD, height: 1 },
  caret: {
    position: 'absolute',
    left: 2,
    width: GUTTER - 6,
    height: 18,
    borderRadius: 5,
    justifyContent: 'center',
    paddingLeft: 6,
  },
  caretText: { color: '#fff', fontSize: 10.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  caretTri: {
    position: 'absolute',
    left: GUTTER - 4,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  vignetteTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 28 },
  vignetteBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28 },
  summary: {
    minHeight: 52,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  summaryBar: { width: 3, height: 34, borderRadius: 1.5, marginRight: 10 },
  summaryTime: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  summaryRange: { fontSize: 11.5, fontWeight: '600', marginTop: 1, fontVariant: ['tabular-nums'] },
  summaryLabel: { fontSize: 11, fontWeight: '700', marginLeft: 10, maxWidth: '38%', textAlign: 'right' },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 10 },
  nudgeBtn: {
    minWidth: 38,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  nudgeBtnText: { fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  nudgeClock: {
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  nudgeClockText: { fontSize: 12, fontWeight: '800' },
  wheelWrap: { marginTop: 6, borderRadius: 12, overflow: 'hidden' },
  wheel: { alignSelf: 'stretch' },
});

export default DayTimeline;
