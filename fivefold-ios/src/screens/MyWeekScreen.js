import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator, Platform, DeviceEventEmitter } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { computeDayFlow } from '../utils/dayFlow';
import {
  loadDayItems, buildAgenda, countByKind, daySummary, weekOf,
  KINDS, KIND_ORDER, fmtClock, fmtDur, minToTime, moveScope, patternOf,
} from '../utils/dayItems';
import { dateKeyOf } from '../utils/dayBusy';
import { layoutDay, PX_PER_HOUR, ZOOM_MIN, ZOOM_MAX, NEST_INSET, clampZoom, zoomLabelFor } from '../utils/timelineLayout';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { moveItem, applyPlanRow, removeItem, setPinned } from '../services/rescheduleItem';
import { rowText } from '../services/fitOffer';
import { planDay } from '../services/schedulePlanner';
import { toModel, fixableOverlaps, pickAnchor, cascadePlan, planSize } from '../utils/fitPlan';
import { loadReminderPresets, addReminder } from '../services/reminderService';
import WorkoutService from '../services/workoutService';
import { scheduleWorkoutNotifications } from '../services/workoutSchedule';
import { addPrayer } from '../services/simplePrayersService';
import { getTemplates as getDayTemplates, getPlan as getDayPlan, useTemplateOn, clearWeekday, DAY_PLAN_CHANGED } from '../services/dayTemplates';
import { templateForDay, templateIdForDay, templateSummary, freeMinutes, blocksForDay } from '../utils/dayTemplates';
import { DeviceEventEmitter as Emitter } from 'react-native';

// Things you can put on the timeline from the Add button: your reminder
// library, your workout templates, and a few prayer shapes.
const PRAYER_PRESETS = [
  { id: 'prayer_5', title: 'Prayer', duration: 5, icon: 'favorite', color: '#34C759' },
  { id: 'prayer_morning', title: 'Morning prayer', duration: 10, icon: 'wb-sunny', color: '#34C759' },
  { id: 'prayer_evening', title: 'Evening prayer', duration: 10, icon: 'nights-stay', color: '#34C759' },
  { id: 'prayer_bible', title: 'Bible reading', duration: 15, icon: 'menu-book', color: '#34C759' },
];
const DAY_LETTERS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const round5 = (m) => Math.round(m / 5) * 5;

// Bottom sheet: springs up, pull the handle/header down to dismiss (past
// 120pt or a flick), shorter drags spring back. Same feel as EyeCandy's.
// Children stay rendered while it slides out.
const SHEET_IN = { damping: 22, stiffness: 220, mass: 0.9 };
const SHEET_OUT_MS = 220;
const SHEET_H = 900;
const PullSheet = ({ visible, onClose, accent, children }) => {
  const { theme, isDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const lastChildren = useRef(children);
  if (visible) lastChildren.current = children;
  const translateY = useSharedValue(SHEET_H);
  const backdrop = useSharedValue(0);
  const closingRef = useRef(false);
  const animateOut = useCallback(() => {
    backdrop.value = withTiming(0, { duration: SHEET_OUT_MS });
    translateY.value = withTiming(SHEET_H, { duration: SHEET_OUT_MS, easing: Easing.in(Easing.cubic) });
  }, []);
  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      translateY.value = SHEET_H;
      backdrop.value = withTiming(1, { duration: 260 });
      translateY.value = withSpring(0, SHEET_IN);
    } else if (mounted) {
      animateOut();
      const t = setTimeout(() => setMounted(false), SHEET_OUT_MS + 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible]);
  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    animateOut();
    setTimeout(() => { onClose && onClose(); }, SHEET_OUT_MS);
  }, [onClose, animateOut]);
  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetY([8, 8])
    .failOffsetX([-16, 16])
    .onUpdate((e) => { translateY.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) runOnJS(dismiss)();
      else translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    }), [dismiss]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.45 }));
  if (!mounted) return null;
  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close">
        <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]} />
      </TouchableOpacity>
      <Reanimated.View style={[styles.sheetWrap, sheetStyle]}>
        <View style={[styles.sheetBody, { backgroundColor: theme.background, borderColor: (accent || theme.primary) + '55' }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.035)' }]} />
          <GestureDetector gesture={pan}>
            <View style={styles.handleWrap} hitSlop={{ top: 8, bottom: 8 }}>
              <View style={[styles.handleBar, { backgroundColor: theme.textSecondary + '80' }]} />
            </View>
          </GestureDetector>
          {visible ? children : lastChildren.current}
        </View>
      </Reanimated.View>
    </GestureHandlerRootView>
  );
};

// My Week: everything scheduled, from every source, on one screen. Prayers,
// reminders, workouts, EyeCandy events and your own calendar events can all
// be moved from here (nudge, pick a free time, another day). Calendar-sourced
// items are changed in the iPhone Calendar; EyeCandy adopts its own on its
// next launch. Sports fixtures (kick-off is fixed) and read-only (subscribed)
// calendars stay locked.
const NUDGES = [
  { label: '-1 hr', delta: -60 }, { label: '-30 min', delta: -30 }, { label: '-15 min', delta: -15 },
  { label: '+15 min', delta: 15 }, { label: '+30 min', delta: 30 }, { label: '+1 hr', delta: 60 },
];
const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sunday first, index = getDay()
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const relDay = (d, now = new Date()) => {
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const days = Math.round((x - t) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return d.toLocaleDateString('en', { weekday: 'long' });
};

const MyWeekScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const accent = theme.primary;
  const tile = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const week = useMemo(() => weekOf(anchor), [anchor]);
  const [itemsByDay, setItemsByDay] = useState({});
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(() => new Set());
  const [moving, setMoving] = useState(null);
  const [draftMin, setDraftMin] = useState(0);
  const [draftDate, setDraftDate] = useState(null);
  const [showWheel, setShowWheel] = useState(false);
  const [moveAll, setMoveAll] = useState(false); // repeating reminder: just today (default) or every day
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  // Make it fit: plan (AI proposes, rules verify) shown before anything moves
  const [fitting, setFitting] = useState(false);
  const [fitPlan, setFitPlan] = useState(null);
  const [fitSkipped, setFitSkipped] = useState(() => new Set()); // moves the user unticked
  const [fitRemove, setFitRemove] = useState(() => new Set()); // life moves the user turned into "remove today"
  // Add: pick something from your library, say how often, then tap the timeline where it goes.
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState('reminder'); // reminder | gym | prayer
  const [library, setLibrary] = useState({ reminder: [], gym: [], prayer: PRAYER_PRESETS });
  const [addPick, setAddPick] = useState(null);     // { kind, title, icon, color, duration, templateId }
  const [addRepeat, setAddRepeat] = useState('once'); // once | weekly
  const [addDays, setAddDays] = useState([]);
  const [placing, setPlacing] = useState(null);     // { pick, repeat, days, min } while tapping the timeline
  const lastMovedRef = useRef(null); // the thing just added/moved stays put when planning
  const autoOfferedRef = useRef(new Set()); // anchors already offered a plan this visit
  const RECENT_MS = 30 * 60 * 1000; // something added in the last half hour counts as "just added"
  const [view, setView] = useState('timeline'); // timeline | list
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR);
  const [timelineW, setTimelineW] = useState(0);
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const timelineTopRef = useRef(0);
  const scrollHRef = useRef(0);          // viewport height, for placing "now" a third of the way down
  const pendingNowRef = useRef(true);    // scroll to the current time once today's timeline is laid out
  const pinchStartRef = useRef({ px: PX_PER_HOUR, focalContentY: 0, focalScreenY: 0 });
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60000); return () => clearInterval(t); }, []);

  const weekKey = dateKeyOf(week[0]);
  // Weeks already shown once refresh in place: the timeline stays mounted
  // and the scroll position stays put (a move, or coming back to the screen,
  // must not throw the user to the top). Only a week's first look shows the
  // loading state.
  const loadedWeeksRef = useRef(new Set());
  const loadWeek = useCallback(async () => {
    const fresh = !loadedWeeksRef.current.has(weekKey);
    if (fresh) setLoading(true);
    try {
      const lists = await Promise.all(week.map((d) => loadDayItems(d)));
      const map = {};
      week.forEach((d, i) => { map[dateKeyOf(d)] = lists[i]; });
      setItemsByDay((prev) => ({ ...prev, ...map }));
      loadedWeeksRef.current.add(weekKey);
      if (fresh) setLoading(false);
      return map;
    } catch { if (fresh) setItemsByDay({}); }
    if (fresh) setLoading(false);
    return null;
  }, [weekKey]);

  // Opened after adding something that lands on other things? Plan it now,
  // once, without waiting for a tap.
  const offerRecent = useCallback((map) => {
    try {
      const items = map && map[dateKeyOf(anchor)];
      if (!items || !items.length) return;
      const model = toModel(items);
      const a = pickAnchor(model, lastMovedRef.current);
      if (!a || autoOfferedRef.current.has(a)) return;
      const m = model.find((x) => x.id === a);
      const recent = lastMovedRef.current === a || (m && m.createdAt != null && Date.now() - m.createdAt <= RECENT_MS);
      if (!recent || !planSize(cascadePlan(model, a))) return;
      autoOfferedRef.current.add(a);
      autoPlan(items, a);
    } catch {}
  }, [anchor]);
  useEffect(() => { loadWeek().then(offerRecent); }, [loadWeek]);
  useEffect(() => navigation.addListener('focus', () => loadWeek().then(offerRecent)), [navigation, loadWeek, offerRecent]);
  // Changes adopted from the Calendar (EyeCandy's My Week, the Calendar app) while this screen is up.
  useEffect(() => { const sub = DeviceEventEmitter.addListener('calendarAdopted', () => { loadWeek(); }); return () => sub.remove(); }, [loadWeek]);

  const dayItems = itemsByDay[dateKeyOf(anchor)] || [];
  const counts = useMemo(() => countByKind(dayItems), [dayItems]);
  // Changes the rules would make around the newest thing (0 = no button:
  // an overlap nothing can fix is not worth offering)
  const fixableCount = useMemo(() => {
    const model = toModel(dayItems);
    const a = pickAnchor(model, lastMovedRef.current);
    return a ? planSize(cascadePlan(model, a)) : 0;
  }, [dayItems]);
  const visible = useMemo(() => dayItems.filter((i) => !hidden.has(i.kind)), [dayItems, hidden]);
  const rows = useMemo(() => buildAgenda(visible), [visible]);
  const today = new Date();
  const isTodaySelected = sameDay(anchor, today);
  const nowMin = isTodaySelected ? new Date(nowTick).getHours() * 60 + new Date(nowTick).getMinutes() : null;
  const layout = useMemo(() => layoutDay(visible, { nowMin, pxPerHour }), [visible, nowMin, pxPerHour]);
  // Card area: like the iPhone Calendar, columns simply share the width,
  // however many there are. Nothing ever scrolls sideways.
  const cardAreaLeft = 56;
  const cardAreaW = Math.max(0, timelineW - cardAreaLeft);
  const groupWidths = useMemo(() => {
    const out = {};
    for (const g of layout.groups || []) out[g.index] = { colW: cardAreaW / Math.max(1, g.cols), contentW: cardAreaW };
    return out;
  }, [layout.groups, cardAreaW]);
  // 8:15 – 9:50 PM (one suffix when both sides share it)
  // Breaks only at the dash, never inside a time or before AM/PM.
  const fmtRange = (a, b) => {
    const nb = (t) => t.replace(' ', '\u00A0');
    const ca = fmtClock(a), cb = fmtClock(b);
    const sa = ca.slice(-2), sb = cb.slice(-2);
    return sa === sb ? `${ca.slice(0, -3)}\u00A0– ${nb(cb)}` : `${nb(ca)}\u00A0– ${nb(cb)}`;
  };
  const renderCard = (c, originY) => {
    const it = c.item;
    const isMoving = moving && moving.id === it.id;
    const gw = c.group != null ? groupWidths[c.group] : null;
    const colW = gw ? gw.colW : cardAreaW;
    const inset = (c.depth || 0) * Math.min(NEST_INSET, Math.round(colW * 0.1));
    // Host with something nested on top: keep the title to the room above it
    const room = c.labelRoom != null ? c.labelRoom - 8 : null;
    const titleLines = room != null ? Math.max(1, Math.floor((room - 12) / 13)) : undefined;
    const showMeta = room == null || room >= 13 + 12;
    const width = c.strip ? (gw ? gw.contentW : cardAreaW) : Math.max(40, Math.round(colW) - (c.cols > 1 ? 4 : 0) - inset);
    const tinyCard = c.h <= 44;
    const narrowCard = width < 200;
    const roomForGlyph = width >= 110;
    if (c.strip) {
      return (
        <TouchableOpacity
          key={it.id}
          onPress={() => (it.movable ? startMove(it) : explainExternal(it))}
          activeOpacity={0.7}
          style={[styles.strip, { top: c.y - originY, height: c.h, left: 0, width, backgroundColor: theme.background, borderColor: isMoving ? accent : it.color + '88' }]}
          accessibilityRole="button"
          accessibilityLabel={`${it.title}, ${fmtClock(it.startMin)}, ${KINDS[it.kind].label}`}
        >
          <View style={[styles.stripFill, { backgroundColor: it.color + (isDark ? '30' : '24') }]} />
          <View style={[styles.stripDot, { backgroundColor: it.color }]} />
          <Text style={[styles.stripText, { color: theme.text }]}>{it.title}<Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{`  ${fmtClock(it.startMin)}`}</Text></Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        key={it.id}
        onPress={() => (it.movable ? startMove(it) : explainExternal(it))}
        activeOpacity={0.7}
        style={[styles.card, {
          top: c.y - originY,
          height: c.h,
          left: Math.round(c.col * colW) + inset,
          width,
          backgroundColor: c.proportional ? theme.background : tile,
          borderColor: isMoving ? accent : (c.proportional ? it.color + '55' : 'transparent'),
          alignItems: c.proportional ? 'flex-start' : 'center',
          paddingTop: c.proportional ? 8 : 0,
          paddingLeft: narrowCard ? 8 : 12,
          paddingRight: narrowCard ? 6 : 12,
        }]}
        accessibilityRole="button"
        accessibilityLabel={`${it.title}, ${fmtClock(it.startMin)} to ${fmtClock(it.endMin)}, ${KINDS[it.kind].label}`}
        accessibilityHint={it.movable ? 'Opens move options' : 'Cannot be moved'}
      >
        {c.proportional ? <View style={[styles.cardFill, { backgroundColor: it.color + (isDark ? '3A' : '2A') }]} /> : null}
        <View style={[styles.cardBar, { backgroundColor: it.color }]} />
        <View style={{ flex: 1 }}>
          {tinyCard ? (
            <Text style={[styles.cardTitle, { color: c.proportional ? it.color : theme.text }]}>
              {narrowCard ? it.title : <><Text style={{ color: it.color }}>{fmtClock(it.startMin)}</Text>{`  ${it.title}`}</>}
            </Text>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: c.proportional ? it.color : theme.text }]} numberOfLines={titleLines}>{it.title}</Text>
              {showMeta ? (
                <Text style={[styles.cardMeta, { color: c.proportional ? it.color : theme.textSecondary, opacity: c.proportional ? 0.85 : 1 }]}>
                  {fmtRange(it.startMin, it.endMin)}{narrowCard ? '' : `  ·  ${fmtDur(it.endMin - it.startMin)}  ·  ${KINDS[it.kind].label}`}
                </Text>
              ) : null}
            </>
          )}
        </View>
        {it.movable ? (
          narrowCard ? null : <Text style={[styles.cardMove, { color: accent }]}>Move</Text>
        ) : (
          roomForGlyph ? <MaterialIcons name="lock-outline" size={12} color={theme.textSecondary} style={{ opacity: 0.8 }} /> : null
        )}
      </TouchableOpacity>
    );
  };

  // Today = this day AND this minute: the timeline scrolls so the now line
  // sits a third of the way down the screen. Also runs on first open.
  const goToNow = () => {
    hapticFeedback.light();
    const d = new Date(); d.setHours(0, 0, 0, 0);
    pendingNowRef.current = true;
    if (view !== 'timeline') setView('timeline');
    setAnchor(d);
  };
  useEffect(() => {
    if (!pendingNowRef.current || loading || !isTodaySelected || view !== 'timeline') return;
    if (layout.nowY == null) { pendingNowRef.current = false; return; }
    pendingNowRef.current = false;
    const t = setTimeout(() => {
      const y = Math.max(0, timelineTopRef.current + layout.nowY - Math.max(120, scrollHRef.current * 0.35));
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [anchor, layout.nowY, view, isTodaySelected, loading]);

  // Zoom keeps the time under your fingers where it is: remember where the
  // pinch started inside the timeline, then scroll so that point stays put.
  const applyZoom = (nextPx, focalScreenY = null) => {
    const next = clampZoom(nextPx);
    const start = pinchStartRef.current;
    setPxPerHour(next);
    if (focalScreenY != null && start.px > 0) {
      const newContentY = timelineTopRef.current + (start.focalContentY - timelineTopRef.current) * (next / start.px);
      const target = Math.max(0, newContentY - start.focalScreenY);
      scrollRef.current?.scrollTo({ y: target, animated: false });
    }
  };
  const beginZoom = (focalScreenY) => {
    pinchStartRef.current = { px: pxPerHour, focalContentY: scrollYRef.current + focalScreenY, focalScreenY };
  };
  const zoomStep = (dir) => {
    hapticFeedback.selection();
    const mid = 260; // keep the middle of the visible timeline in place
    beginZoom(mid);
    applyZoom(pxPerHour * (dir > 0 ? 1.6 : 1 / 1.6), mid);
  };
  const pinch = useMemo(() => Gesture.Pinch()
    .runOnJS(true)
    .onBegin((e) => beginZoom(e.focalY + timelineTopRef.current - scrollYRef.current))
    .onUpdate((e) => applyZoom(pinchStartRef.current.px * e.scale, pinchStartRef.current.focalScreenY))
    .onEnd(() => hapticFeedback.selection()), [pxPerHour]);
  const doubleTap = useMemo(() => Gesture.Tap().numberOfTaps(2).runOnJS(true).onEnd(() => { hapticFeedback.light(); setPxPerHour(PX_PER_HOUR); }), []);
  const zoomGesture = useMemo(() => Gesture.Simultaneous(pinch, doubleTap), [pinch, doubleTap]);

  const toggleKind = (k) => {
    hapticFeedback.light();
    setHidden((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  };

  const shiftWeek = (dir) => {
    hapticFeedback.light();
    const d = new Date(anchor); d.setDate(d.getDate() + dir * 7); setAnchor(d);
  };

  // Swipe the week strip: it follows the finger, then the old week slides out
  // and the new one springs in from the other side.
  const stripX = useSharedValue(0);
  const stripO = useSharedValue(1);
  const [stripW, setStripW] = useState(360);
  const goWeek = (dir) => {
    const w = stripW || 360;
    stripX.value = withTiming(-dir * w * 0.6, { duration: 140, easing: Easing.in(Easing.cubic) }, (done) => {
      if (!done) return;
      runOnJS(shiftWeek)(dir);
      stripX.value = dir * w * 0.5;
      stripO.value = 0.2;
      stripX.value = withSpring(0, { damping: 18, stiffness: 180 });
      stripO.value = withTiming(1, { duration: 220 });
    });
    stripO.value = withTiming(0.3, { duration: 140 });
  };
  const weekSwipe = useMemo(() => Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .runOnJS(true)
    .onUpdate((e) => { stripX.value = e.translationX * 0.55; })
    .onEnd((e) => {
      if (e.translationX < -50 || e.velocityX < -500) goWeek(1);
      else if (e.translationX > 50 || e.velocityX > 500) goWeek(-1);
      else stripX.value = withSpring(0, { damping: 18, stiffness: 200 });
    }), [stripW, anchor]);
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: stripX.value }], opacity: stripO.value }));
  const weekLabel = (() => {
    const a = week[0], b = week[6];
    const same = a.getMonth() === b.getMonth();
    const range = same
      ? `${a.getDate()} – ${b.getDate()} ${b.toLocaleDateString('en', { month: 'short' })}`
      : `${a.getDate()} ${a.toLocaleDateString('en', { month: 'short' })} – ${b.getDate()} ${b.toLocaleDateString('en', { month: 'short' })}`;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const thisStart = weekOf(t)[0];
    const diff = Math.round((week[0] - thisStart) / (7 * 86400000));
    const rel = diff === 0 ? 'This week' : diff === 1 ? 'Next week' : diff === -1 ? 'Last week' : diff > 0 ? `${diff} weeks ahead` : `${-diff} weeks ago`;
    return `${range}  ·  ${rel}`;
  })();

  const startMove = (item) => {
    hapticFeedback.medium();
    setMoving(item);
    setDraftMin(item.startMin);
    setDraftDate(dateKeyOf(anchor));
    setShowWheel(false);
    setMoveAll(false);
    setStatus(null);
  };
  // A repeating reminder moves for this day alone unless the user says every day.
  const isSeriesReminder = (it) => !!it && it.kind === 'reminder' && it.raw?.type !== 'one-time';
  const cancelMove = () => { hapticFeedback.light(); setMoving(null); setShowWheel(false); };
  const nudge = (delta) => {
    hapticFeedback.selection();
    setDraftMin((m) => Math.max(0, Math.min(23 * 60 + 55, Math.round((m + delta) / 5) * 5)));
  };
  const saveMove = async () => {
    if (!moving || saving) return;
    setSaving(true);
    try {
      const todayOnly = isSeriesReminder(moving) && !moveAll;
      const ok = await moveItem(moving, { time: minToTime(draftMin), date: draftDate, from: dateKeyOf(anchor), todayOnly });
      if (!ok) throw new Error('not movable');
      hapticFeedback.success();
      const movedDay = draftDate && draftDate !== dateKeyOf(anchor);
      setStatus(`${moving.title} moved to ${fmtClock(draftMin)}${movedDay ? ` on ${draftDate}` : ''}${todayOnly ? ', just today' : ''}.`);
      const movedId = ok && ok.newId ? ok.newId : moving.id;
      const landedKey = draftDate || dateKeyOf(anchor);
      lastMovedRef.current = movedId;
      setMoving(null);
      setShowWheel(false);
      // Keep the user where they were: the refresh swaps data in place, and
      // the panel closing shrinks the bottom padding, so pin the offset.
      const keepY = scrollYRef.current;
      const fresh = await loadWeek();
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: keepY, animated: false }));
      // Landed on something? Plan it right away, no button hunting.
      if (fresh && fresh[landedKey]) autoPlan(fresh[landedKey], movedId);
    } catch (e) {
      hapticFeedback.error();
      Alert.alert('Could not move it', e?.message || 'Please try again.');
    }
    setSaving(false);
  };

  // ---- Add from your library ----------------------------------------------
  const openAdd = async () => {
    hapticFeedback.light();
    setAddPick(null); setAddRepeat('once'); setAddDays([anchor.getDay()]);
    setAddOpen(true);
    try {
      const [presets, templates] = await Promise.all([loadReminderPresets().catch(() => []), WorkoutService.getTemplates().catch(() => [])]);
      setLibrary({
        reminder: (presets || []).map((p) => ({ kind: 'reminder', id: p.id, title: p.title, icon: p.icon || 'notifications', color: p.color || KINDS.reminder.color, duration: Number(p.duration) > 0 ? p.duration : 30 })),
        gym: (templates || []).map((t) => ({ kind: 'gym', id: t.id, templateId: t.id, title: t.name || 'Workout', icon: 'fitness-center', color: KINDS.gym.color, duration: Number(t.estimatedDuration || t.duration) > 0 ? Number(t.estimatedDuration || t.duration) : 60 })),
        prayer: PRAYER_PRESETS.map((p) => ({ kind: 'prayer', ...p })),
      });
    } catch {}
  };
  const closeAdd = () => { setAddOpen(false); setAddPick(null); };

  // Day templates: the day's shape (Work Remote: work 9 to 5:30, meals).
  const [templates, setTemplates] = useState([]);
  const [dayPlan, setDayPlan] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const loadPlan = useCallback(async () => {
    try { const [t, p] = await Promise.all([getDayTemplates(), getDayPlan()]); setTemplates(t); setDayPlan(p); } catch {}
  }, []);
  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => navigation.addListener('focus', loadPlan), [navigation, loadPlan]);
  useEffect(() => { const sub = DeviceEventEmitter.addListener(DAY_PLAN_CHANGED, () => { loadPlan(); loadWeek(); }); return () => sub.remove(); }, [loadPlan, loadWeek]);
  const anchorKey = dateKeyOf(anchor);
  const dayTemplate = useMemo(() => templateForDay(templates, dayPlan, anchorKey, anchor.getDay()), [templates, dayPlan, anchorKey, anchor]);
  const weekdayTemplateId = dayPlan?.weekdays?.[String(anchor.getDay())] || null;
  const weekdayName = anchor.toLocaleDateString('en', { weekday: 'long' });
  const openPlan = () => { hapticFeedback.light(); loadPlan(); setPlanOpen(true); };
  const pickTemplate = async (id) => {
    hapticFeedback.selection();
    try {
      await useTemplateOn(anchorKey, id);
      setPlanOpen(false);
      const t = templates.find((x) => x.id === id);
      setStatus(t ? `${t.name} is on for ${relDay(anchor) === 'Today' ? 'today' : relDay(anchor)}. Its blocks are on your day now.` : `No template ${relDay(anchor) === 'Today' ? 'today' : relDay(anchor)}.`);
      setTimeout(() => setStatus(null), 4000);
    } catch (e) { Alert.alert('Could not set that', e?.message || 'Please try again.'); }
  };
  const toggleWeekday = async () => {
    hapticFeedback.selection();
    try {
      if (weekdayTemplateId) await clearWeekday(anchor.getDay());
      else if (dayTemplate) await useTemplateOn(anchorKey, dayTemplate.id, { everyWeek: true, dow: anchor.getDay() });
    } catch {}
  };
  const pickFromLibrary = (item) => { hapticFeedback.selection(); setAddPick(item); setAddRepeat('once'); setAddDays([anchor.getDay()]); };
  const toggleAddDay = (d) => { hapticFeedback.selection(); setAddDays((prev) => (prev.includes(d) ? (prev.length > 1 ? prev.filter((x) => x !== d) : prev) : [...prev, d].sort())); };
  const startPlacing = () => {
    if (!addPick) return;
    hapticFeedback.medium();
    setPlacing({ pick: addPick, repeat: addRepeat, days: addRepeat === 'weekly' ? addDays : [anchor.getDay()], min: null });
    setAddOpen(false);
    if (view !== 'timeline') setView('timeline');
    setStatus(null);
  };
  const cancelPlacing = () => { hapticFeedback.light(); setPlacing(null); };
  // A tap on the timeline: the y inside it -> a time on the 5-minute grid.
  const minuteAtY = (y) => Math.max(0, Math.min(23 * 60 + 55, round5(layout.axisStart + (y / pxPerHour) * 60)));
  const placeMinRef = useRef(null);
  const onPlaceTap = (y) => {
    if (!placing) return;
    const min = minuteAtY(y);
    hapticFeedback.selection();
    placeMinRef.current = min;
    setPlacing((p) => (p ? { ...p, min } : p));
  };
  // Hold a moment and drag (from the block or anywhere) to slide the time
  // along the grid, a tick per 5 minutes; a plain swipe still scrolls.
  const placeDrag = useMemo(() => Gesture.Pan()
    .activateAfterLongPress(140)
    .runOnJS(true)
    .onStart((e) => { const min = minuteAtY(e.y); hapticFeedback.medium(); placeMinRef.current = min; setPlacing((p) => (p ? { ...p, min } : p)); })
    .onUpdate((e) => {
      const min = minuteAtY(e.y);
      if (min === placeMinRef.current) return;
      placeMinRef.current = min;
      hapticFeedback.selection();
      setPlacing((p) => (p ? { ...p, min } : p));
    }), [layout.axisStart, pxPerHour]);
  const placeTap = useMemo(() => Gesture.Tap().runOnJS(true).onEnd((e, ok) => { if (ok) onPlaceTap(e.y); }), [layout.axisStart, pxPerHour, placing]);
  const placeGesture = useMemo(() => Gesture.Race(placeDrag, placeTap), [placeDrag, placeTap]);
  const savePlacing = async () => {
    if (!placing || placing.min == null || saving) return;
    setSaving(true);
    const { pick, repeat, days, min } = placing;
    const time = minToTime(min);
    const key = dateKeyOf(anchor);
    const once = repeat === 'once';
    let anchorId = null;
    try {
      if (pick.kind === 'reminder') {
        const saved = await addReminder({ title: pick.title, time, type: once ? 'one-time' : 'recurring', days: once ? [anchor.getDay()] : days, date: once ? key : undefined, icon: pick.icon, color: pick.color, duration: pick.duration });
        anchorId = saved ? `reminder:${saved.id}` : null;
      } else if (pick.kind === 'gym') {
        const schedule = { templateId: pick.templateId, templateName: pick.title, time, duration: pick.duration, notifyBefore: 0, ...(once ? { type: 'one-time', date: key } : { type: 'recurring', days }) };
        const saved = await WorkoutService.addScheduledWorkout(schedule);
        try { if (saved) await scheduleWorkoutNotifications(saved); } catch {}
        try { Emitter.emit('workoutScheduled', saved); } catch {}
        anchorId = saved ? `gym:${saved.id}` : null;
      } else if (pick.kind === 'prayer') {
        const saved = await addPrayer({ name: pick.title, time, type: once ? 'one-time' : 'recurring', date: once ? key : null, days, duration: pick.duration, notifyBefore: 0 });
        anchorId = saved && saved.id ? `prayer:${saved.id}` : null;
      }
      hapticFeedback.success();
      setPlacing(null);
      setStatus(`${pick.title} added at ${fmtClock(min)}${once ? '' : ', every week'}.`);
      if (anchorId) lastMovedRef.current = anchorId;
      const keepY = scrollYRef.current;
      const fresh = await loadWeek();
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: keepY, animated: false }));
      if (anchorId && fresh && fresh[key]) autoPlan(fresh[key], anchorId);
    } catch (e) {
      hapticFeedback.error();
      Alert.alert('Could not add it', e?.message || 'Please try again.');
    }
    setSaving(false);
  };

  // Make it fit: the AI plans, the rules check, the user approves.
  const autoPlan = async (items, anchorId) => {
    try {
      const dayLabel = isTodaySelected ? 'today' : anchor.toLocaleDateString('en', { weekday: 'long' });
      const plan = await planDay(items, { anchorId, dayLabel });
      if (plan && plan.lines.length) { hapticFeedback.selection(); setFitSkipped(new Set()); setFitRemove(new Set()); setFitPlan(plan); }
    } catch {}
  };
  const makeItFit = async () => {
    if (fitting) return;
    hapticFeedback.light();
    setFitting(true);
    try {
      const dayLabel = isTodaySelected ? 'today' : anchor.toLocaleDateString('en', { weekday: 'long' });
      const plan = await planDay(dayItems, { anchorId: lastMovedRef.current, dayLabel });
      if (!plan) setStatus('Nothing overlaps today.');
      else { hapticFeedback.selection(); setFitSkipped(new Set()); setFitRemove(new Set()); setFitPlan(plan); }
    } catch (e) {
      hapticFeedback.error();
      Alert.alert('Could not plan the day', e?.message || 'Please try again.');
    }
    setFitting(false);
  };
  const cancelFit = () => { hapticFeedback.light(); setFitPlan(null); };
  const toggleFitRow = (id) => {
    hapticFeedback.selection();
    setFitSkipped((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  // A bumped workout or reminder: the rules found a move, the user may
  // prefer it off the day instead.
  const toggleFitRemove = (id) => {
    hapticFeedback.selection();
    setFitRemove((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const effectiveRow = (l) => (fitRemove.has(l.id) ? { ...l, action: 'drop' } : l);
  const fitCount = fitPlan ? fitPlan.lines.filter((l) => !fitSkipped.has(l.id)).length : 0;
  const applyFit = async () => {
    if (!fitPlan || saving || !fitCount) return;
    setSaving(true);
    let n = 0;
    const chosen = fitPlan.lines.filter((l) => !fitSkipped.has(l.id)).map(effectiveRow);
    const key = dateKeyOf(anchor);
    for (const line of chosen) {
      const it = dayItems.find((i) => i.id === line.id);
      if (!it) continue;
      try { if (await applyPlanRow(it, line, key)) n++; } catch {}
    }
    hapticFeedback.success();
    setStatus(n === chosen.length
      ? `${n === 1 ? '1 thing' : `${n} things`} changed.`
      : `${n} of ${chosen.length} changed. Check the rest.`);
    setFitPlan(null);
    const keepY = scrollYRef.current;
    await loadWeek();
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: keepY, animated: false }));
    setSaving(false);
  };

  // Remove from the Move panel: this day only for things that repeat, or the
  // whole thing. Each kind says what it can do.
  const finishRemove = async (item, scope) => {
    setSaving(true);
    try {
      const ok = await removeItem(item, { scope, from: dateKeyOf(anchor) });
      if (!ok) throw new Error('Could not remove it');
      hapticFeedback.success();
      setStatus(scope === 'today' ? `${item.title} skipped today.` : `${item.title} removed.`);
      setMoving(null);
      setShowWheel(false);
      const keepY = scrollYRef.current;
      await loadWeek();
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: keepY, animated: false }));
    } catch (e) {
      hapticFeedback.error();
      Alert.alert('Could not remove it', e?.message || 'Please try again.');
    }
    setSaving(false);
  };
  const confirmRemove = (item) => {
    if (!item) return;
    hapticFeedback.medium();
    const raw = item.raw || {};
    const oneTime = raw.type === 'one-time';
    if (item.kind === 'reminder' && !oneTime) {
      Alert.alert(item.title, `Repeats ${patternOf(raw) === 'one-time' ? '' : patternOf(raw)}. Skip just today, or delete it for good?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip today', onPress: () => finishRemove(item, 'today') },
        { text: 'Delete every day', style: 'destructive', onPress: () => finishRemove(item, 'all') },
      ]);
      return;
    }
    if (item.kind === 'gym' && !oneTime) {
      Alert.alert(item.title, `Repeats ${patternOf(raw)}. Deleting removes every week; to change one day, move it instead.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => finishRemove(item, 'all') },
      ]);
      return;
    }
    if (item.kind === 'prayer' && !oneTime) {
      Alert.alert(item.title, 'Daily prayers are managed in Faith.', [{ text: 'OK' }]);
      return;
    }
    if (item.kind === 'block') {
      Alert.alert(item.title, `Part of your ${raw.templateName || 'day plan'}. Skip it just today, or take it out of the template for every day it is used?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip today', onPress: () => finishRemove(item, 'today') },
        { text: 'Remove from template', style: 'destructive', onPress: () => finishRemove(item, 'all') },
      ]);
      return;
    }
    if (item.kind === 'eyecandy' && raw.recurring) {
      Alert.alert(item.title, 'Weekly shows are managed in EyeCandy.', [
        { text: 'OK', style: 'cancel' },
        { text: 'Open EyeCandy', onPress: () => Linking.openURL('eyecandy://').catch(() => {}) },
      ]);
      return;
    }
    const what = item.kind === 'eyecandy' ? 'Skip it today? EyeCandy takes it off your schedule when you next open it.'
      : item.kind === 'calendar' ? (raw.recurring ? 'Remove this one from your Calendar? The other repeats stay.' : 'Remove it from your Calendar?')
      : 'Remove it?';
    Alert.alert(item.title, what, [
      { text: 'Cancel', style: 'cancel' },
      { text: item.kind === 'eyecandy' ? 'Skip today' : 'Remove', style: 'destructive', onPress: () => finishRemove(item, raw.recurring ? 'today' : 'all') },
    ]);
  };

  // Sports fixtures (kick-off is the league's call) and read-only calendars
  // (subscriptions, holidays, shared calendars you cannot edit) land here.
  const explainExternal = (item) => {
    hapticFeedback.light();
    if (item.raw?.official) {
      Alert.alert(
        item.title,
        `This is the official release time (${fmtClock(item.startMin)}), so it stays put. To watch it at another time, add it from Schedule in EyeCandy.`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open EyeCandy', onPress: () => Linking.openURL('eyecandy://').catch(() => {}) },
        ],
      );
      return;
    }
    if (item.kind === 'eyecandySports') {
      Alert.alert(
        item.title,
        `Kick-off is ${fmtClock(item.startMin)}. Match times come from the fixture list, so they cannot be moved. Take it off your watch list in EyeCandy if you will not watch it then.`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Open EyeCandy', onPress: () => Linking.openURL('eyecandy://').catch(() => {}) },
        ],
      );
      return;
    }
    Alert.alert(
      item.title,
      `The ${item.subtitle || 'Calendar'} calendar is read-only on this iPhone, so it cannot be moved from here.`,
      [
        { text: 'OK', style: 'cancel' },
        { text: 'Open Calendar', onPress: () => Linking.openURL('calshow:').catch(() => {}) },
      ],
    );
  };

  // The panel wears the item's own colour (EyeCandy purple, Biblely green),
  // so what you tapped is what you are editing.
  const panelAccent = (moving && moving.color) || accent;
  const nextDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(anchor); d.setDate(anchor.getDate() + i); return d; }), [anchor]);
  const draftEnd = moving ? draftMin + (moving.endMin - moving.startMin) : 0;
  // The next few free gaps on the draft day that fit the item (the item
  // itself excluded), straight in the panel as chips.
  const freeSlots = useMemo(() => {
    if (!moving) return [];
    const key = draftDate || dateKeyOf(anchor);
    const dayList = (itemsByDay[key] || []).filter((i) => i.id !== moving.id).map((i) => ({ title: i.title, startMin: i.startMin, endMin: i.endMin }));
    const todayKey = dateKeyOf(new Date());
    const n = new Date();
    const rows = computeDayFlow({ events: dayList, durationMinutes: moving.endMin - moving.startMin, isToday: key === todayKey, nowMin: n.getHours() * 60 + n.getMinutes() });
    return rows.filter((r) => r.type === 'free' && r.fits).slice(0, 6);
  }, [moving, draftDate, anchor, itemsByDay]);
  const pickDate = useMemo(() => {
    if (!draftDate) return anchor;
    const [y, m, d] = draftDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [draftDate, anchor]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header: same tile back button as Habits / Fuel, title centred, Today on the right */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: tile }]}
          onPress={() => { hapticFeedback.light(); navigation.goBack(); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialIcons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Week</Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: tile, width: 'auto', paddingHorizontal: 14 }]}
          onPress={goToNow}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
        >
          <Text style={[styles.headerBtnText, { color: accent }]}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Week strip: swipe left / right for the next / previous week */}
      <Text style={[styles.weekLabel, { color: theme.textSecondary }]}>{weekLabel}</Text>
      <GestureHandlerRootView style={styles.weekWrap}>
        <GestureDetector gesture={weekSwipe}>
          <Reanimated.View style={[styles.weekStrip, stripStyle]} onLayout={(e) => setStripW(e.nativeEvent.layout.width)}>
            {week.map((d, i) => {
              const key = dateKeyOf(d);
              const sel = sameDay(d, anchor);
              const isToday = sameDay(d, today);
              const kinds = KIND_ORDER.filter((k) => (itemsByDay[key] || []).some((it) => it.kind === k)).slice(0, 4);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => { hapticFeedback.light(); setAnchor(d); }}
                  style={[styles.dayTile, { backgroundColor: sel ? accent : tile, borderColor: isToday && !sel ? accent : 'transparent' }]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`${d.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}, ${(itemsByDay[key] || []).length} scheduled`}
                >
                  <Text style={[styles.dayLetter, { color: sel ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>{WEEK_LETTERS[i]}</Text>
                  <Text style={[styles.dayNum, { color: sel ? '#fff' : theme.text }]}>{d.getDate()}</Text>
                  <View style={styles.dots}>
                    {kinds.length ? kinds.map((k) => (
                      <View key={k} style={[styles.dot, { backgroundColor: sel ? '#fff' : KINDS[k].color }]} />
                    )) : <View style={[styles.dot, { backgroundColor: 'transparent' }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Reanimated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      <ScrollView ref={scrollRef} onLayout={(e) => { scrollHRef.current = e.nativeEvent.layout.height; }} onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={[styles.body, moving && { paddingBottom: showWheel ? 560 : 380 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.kicker, { color: theme.textSecondary }]}>{relDay(anchor)}</Text>
        <Text style={[styles.headline, { color: theme.text }]}>{anchor.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>{loading ? 'Checking every source...' : daySummary(dayItems)}</Text>

        {/* Day template: the shape of the day. Tap to pick or change it. */}
        <TouchableOpacity onPress={openPlan} style={styles.planRow} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={dayTemplate ? `${dayTemplate.name} day, change the day template` : 'Plan this day with a template'}>
          <MaterialIcons name="schedule" size={18} color={KINDS.block.color} />
          <Text style={[styles.planText, { color: theme.text }]}>{dayTemplate ? `${dayTemplate.name} day` : 'Plan this day'}</Text>
          <Text style={[styles.planLink, { color: accent }]}>{dayTemplate ? 'Change' : 'Use a template'}</Text>
        </TouchableOpacity>

        {/* Kind filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsScroll, { marginTop: 14 }]} contentContainerStyle={styles.chipsRow}>
          {KIND_ORDER.map((k) => {
            const n = counts[k] || 0;
            const off = hidden.has(k);
            return (
              <TouchableOpacity key={k} onPress={() => toggleKind(k)} style={[styles.chip, { backgroundColor: tile, opacity: off ? 0.45 : 1 }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: !off }}>
                <View style={[styles.dotBig, { backgroundColor: KINDS[k].color }]} />
                <Text style={[styles.chipText, { color: theme.text }]}>{KINDS[k].label}{k === 'prayer' || k === 'reminder' || k === 'task' || k === 'gym' ? 's' : ''} {n}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {status ? <Text style={[styles.status, { color: accent }]}>{status}</Text> : null}

        {!loading && fixableCount > 0 ? (
          <TouchableOpacity onPress={makeItFit} disabled={fitting} style={[styles.fitBtn, { backgroundColor: accent, opacity: fitting ? 0.75 : 1 }]} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Make it fit" accessibilityHint="Plans moves so nothing overlaps. You approve before anything changes">
            {fitting ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.fitBtnText}>{fitting ? 'Working it out' : 'Make it fit'}</Text>
            <Text style={styles.fitBtnSub}>{fixableCount === 1 ? '1 change' : `${fixableCount} changes`}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.viewRow}>
          {view === 'timeline' ? (
            <View style={[styles.zoomCtl, { backgroundColor: tile }]}>
              <TouchableOpacity onPress={() => zoomStep(-1)} disabled={pxPerHour <= ZOOM_MIN} style={styles.zoomBtn} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityLabel="Zoom out">
                <MaterialIcons name="remove" size={18} color={pxPerHour <= ZOOM_MIN ? theme.textSecondary : theme.text} />
              </TouchableOpacity>
              <Text style={[styles.zoomLabel, { color: theme.text }]}>{zoomLabelFor(pxPerHour)}</Text>
              <TouchableOpacity onPress={() => zoomStep(1)} disabled={pxPerHour >= ZOOM_MAX} style={styles.zoomBtn} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityLabel="Zoom in">
                <MaterialIcons name="add" size={18} color={pxPerHour >= ZOOM_MAX ? theme.textSecondary : theme.text} />
              </TouchableOpacity>
            </View>
          ) : null}
          {[{ k: 'timeline', label: 'Timeline' }, { k: 'list', label: 'List' }].map((o) => {
            const on = view === o.k;
            return (
              <TouchableOpacity key={o.k} onPress={() => { hapticFeedback.light(); setView(o.k); }} style={[styles.viewTab, { backgroundColor: on ? accent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.viewTabText, { color: on ? '#fff' : theme.text }]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline: rails on the left show true spans and overlaps, cards on the right stay readable */}
        {view === 'timeline' && !loading && (visible.length > 0 || placing) ? (
          <GestureHandlerRootView onLayout={(e) => { timelineTopRef.current = e.nativeEvent.layout.y; }}>
          <GestureDetector gesture={zoomGesture}>
          <View style={[styles.timeline, { height: layout.height }]} onLayout={(e) => setTimelineW(e.nativeEvent.layout.width)} accessibilityHint="Pinch to zoom the hours, double tap to reset">
            {layout.hours.map((h) => (
              <View key={h.min} style={[styles.hourRow, { top: h.y }]} pointerEvents="none">
                <Text style={[styles.hourLabel, { color: h.major ? theme.textSecondary : theme.textTertiary || theme.textSecondary, fontWeight: h.major ? '700' : '500', fontSize: h.major ? 11.5 : 10.5 }]}>{h.label}</Text>
                <View style={[styles.hourLine, { backgroundColor: hairline, opacity: h.major ? 1 : 0.5 }]} />
              </View>
            ))}
            {/* Cards: columns share the width, nested blocks on top, strips last */}
            <View style={[styles.cardArea, { left: cardAreaLeft }]}>
              {layout.cards.map((c) => renderCard(c, 0))}
            </View>
            {layout.nowY != null ? (
              <View style={[styles.nowRow, { top: layout.nowY }]} pointerEvents="none">
                <View style={[styles.nowDot, { backgroundColor: theme.error || '#EF4444' }]} />
                <View style={[styles.nowLine, { backgroundColor: theme.error || '#EF4444' }]} />
              </View>
            ) : null}
            {placing && placing.min != null ? (
              <View pointerEvents="none" style={[styles.ghost, { top: layout.axisStart != null ? ((placing.min - layout.axisStart) / 60) * pxPerHour : 0, height: Math.max(22, (placing.pick.duration / 60) * pxPerHour), left: cardAreaLeft, right: 0, borderColor: placing.pick.color || accent, backgroundColor: (placing.pick.color || accent) + '22' }]}>
                <Text style={[styles.ghostText, { color: placing.pick.color || accent }]}>{placing.pick.title}  ·  {fmtClock(placing.min)}</Text>
              </View>
            ) : null}
            {placing ? (
              <GestureDetector gesture={placeGesture}>
                <View style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Tap a time on the timeline, or hold and drag" />
              </GestureDetector>
            ) : null}
          </View>
          </GestureDetector>
          </GestureHandlerRootView>
        ) : null}
        {view === 'timeline' && !loading && visible.length > 0 ? (
          <Text style={[styles.zoomHint, { color: theme.textSecondary }]}>Pinch to zoom in to the minutes, or use the − and + buttons. Double tap to reset.</Text>
        ) : null}

        {/* List */}
        <View style={[styles.list, view === 'timeline' && visible.length > 0 && { display: 'none' }]}>
          {!loading && rows.length === 0 ? (
            <View style={[styles.emptyTile, { backgroundColor: tile }]}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing on {relDay(anchor).toLowerCase() === 'today' ? 'today' : 'this day'}</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Prayers, reminders and workouts you schedule will show here, next to anything from EyeCandy or your iPhone Calendar.</Text>
            </View>
          ) : rows.map((row, i) => {
            if (row.type === 'free') {
              return (
                <View key={`f${i}`} style={styles.freeRow}>
                  <View style={[styles.freeLine, { backgroundColor: hairline }]} />
                  <Text style={[styles.freeText, { color: theme.textSecondary }]}>{row.label}</Text>
                  <View style={[styles.freeLine, { backgroundColor: hairline }]} />
                </View>
              );
            }
            const it = row.item;
            const isMoving = moving && moving.id === it.id;
            return (
              <TouchableOpacity
                key={it.id}
                onPress={() => (it.movable ? startMove(it) : explainExternal(it))}
                style={[styles.item, { backgroundColor: tile, borderColor: isMoving ? accent : 'transparent' }]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${it.title}, ${fmtClock(it.startMin)} to ${fmtClock(it.endMin)}, ${KINDS[it.kind].label}`}
                accessibilityHint={it.movable ? 'Opens move options' : 'Cannot be moved'}
              >
                <View style={[styles.bar, { backgroundColor: it.color }]} />
                <View style={styles.timeCol}>
                  <Text style={[styles.time, { color: theme.text }]}>{fmtClock(it.startMin)}</Text>
                  <Text style={[styles.dur, { color: theme.textSecondary }]}>{fmtDur(it.endMin - it.startMin)}</Text>
                </View>
                <View style={styles.mainCol}>
                  <Text style={[styles.title, { color: theme.text }]}>{it.title}</Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    <Text style={{ color: it.color, fontWeight: '700' }}>{KINDS[it.kind].label}</Text>
                    {it.subtitle ? `  ·  ${it.subtitle}` : ''}
                  </Text>
                </View>
                {it.movable ? (
                  <View style={[styles.movePill, { borderColor: accent }]}>
                    <Text style={[styles.movePillText, { color: accent }]}>Move</Text>
                  </View>
                ) : (
                  <MaterialIcons name="lock-outline" size={18} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {!loading && dayItems.length > 0 ? (
          <Text style={[styles.footnote, { color: theme.textSecondary }]}>Tap Move on anything to change its time. Fixtures keep their kick-off. When things overlap, Make it fit plans the moves and you approve them first.</Text>
        ) : null}
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={accent} /> : null}
      </ScrollView>

      {/* Make it fit: the plan in words, before anything moves. Pull the handle down to dismiss. */}
      <PullSheet visible={!!fitPlan} onClose={cancelFit} accent={accent}>
        {fitPlan ? (<>
          <View style={styles.panelHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Make it fit</Text>
              <Text style={[styles.panelSub, { color: theme.textSecondary }]}>{fitPlan.note}</Text>
            </View>
            <TouchableOpacity onPress={cancelFit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close plan">
              <MaterialIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {fitPlan.lines.length ? <Text style={[styles.panelKicker, { color: theme.textSecondary }]}>Moves, tap one to leave it where it is</Text> : null}
          {fitPlan.lines.map((raw) => {
            const l = effectiveRow(raw);
            const off = fitSkipped.has(l.id);
            const canRemove = raw.action === 'move' && (raw.kind === 'gym' || raw.kind === 'reminder');
            return (
              <View key={l.id}>
                <TouchableOpacity onPress={() => toggleFitRow(l.id)} style={[styles.fitRow, { opacity: off ? 0.45 : 1 }]} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: !off }} accessibilityLabel={`${l.title}, ${rowText(l)}`}>
                  <View style={[styles.fitBar, { backgroundColor: l.color }]} />
                  <Text style={[styles.fitRowTitle, { color: theme.text }]}>{l.title}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.fitRowTime, { color: l.action === 'drop' ? theme.textSecondary : l.color }]}>{l.action === 'move' ? `${fmtClock(l.from)} to ${fmtClock(l.to)}` : rowText(l)}</Text>
                    {l.todayOnly && l.action !== 'drop' ? <Text style={[styles.fitRowNote, { color: theme.textSecondary }]}>this day only</Text> : l.action === 'trim' ? <Text style={[styles.fitRowNote, { color: theme.textSecondary }]}>was {fmtClock(l.from)} to {fmtClock(l.endFrom)}</Text> : null}
                  </View>
                  <MaterialIcons name={off ? 'check-box-outline-blank' : 'check-box'} size={22} color={off ? theme.textSecondary : accent} />
                </TouchableOpacity>
                {canRemove && !off ? (
                  <TouchableOpacity onPress={() => toggleFitRemove(l.id)} style={styles.fitAltBtn} activeOpacity={0.7} accessibilityRole="button">
                    <Text style={[styles.fitAltText, { color: fitRemove.has(l.id) ? accent : theme.textSecondary }]}>{fitRemove.has(l.id) ? `Move it to ${fmtClock(raw.to)} instead` : `${raw.todayOnly ? 'Skip' : 'Remove'} it today instead`}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
          {fitPlan.stays.length ? (
            <>
              <Text style={[styles.panelKicker, { color: theme.textSecondary }]}>Stays put</Text>
              {fitPlan.stays.map((st) => (
                <Text key={st.id} style={[styles.fitStay, { color: theme.textSecondary }]}>{st.title}, {st.why}</Text>
              ))}
            </>
          ) : null}
          {fitPlan.overflow.length ? (
            <Text style={[styles.fitStay, { color: theme.warning || '#F59E0B' }]}>Left as is, nothing close enough: {fitPlan.overflow.join(', ')}</Text>
          ) : null}

          <TouchableOpacity onPress={applyFit} disabled={saving || !fitCount} style={[styles.saveBtn, { backgroundColor: accent, opacity: saving || !fitCount ? 0.6 : 1, marginBottom: Math.max(insets.bottom, 12) }]} activeOpacity={0.8} accessibilityRole="button">
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Working' : fitCount === 1 ? 'Apply 1 change' : `Apply ${fitCount} changes`}</Text>
          </TouchableOpacity>
        </>) : null}
      </PullSheet>

      {/* Add: a big button, then pick from your library, say how often, tap the time. */}
      {!moving && !fitPlan && !placing && !addOpen ? (
        <TouchableOpacity onPress={openAdd} style={[styles.addFab, { backgroundColor: accent, bottom: Math.max(insets.bottom, 12) + 8 }]} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Add something to this day">
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addFabText}>Add</Text>
        </TouchableOpacity>
      ) : null}

      {placing ? (
        <View style={[styles.placeBar, { backgroundColor: theme.background, borderColor: accent + '55', paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.035)' }]} />
          <Text style={[styles.placeTitle, { color: theme.text }]}>{placing.min == null ? `Tap the timeline where ${placing.pick.title} goes` : `${placing.pick.title} at ${fmtClock(placing.min)}`}</Text>
          <Text style={[styles.placeSub, { color: theme.textSecondary }]}>{placing.min == null ? 'Scroll to the hour, then tap the time. Hold and drag to fine-tune.' : `${fmtDur(placing.pick.duration)}${placing.repeat === 'weekly' ? `  ·  every ${placing.days.length === 7 ? 'day' : placing.days.map((d) => DAY_LETTERS_SUN[d]).join(' ')}` : '  ·  just once'}. Tap elsewhere, or hold and drag to adjust.`}</Text>
          <View style={styles.placeBtns}>
            <TouchableOpacity onPress={cancelPlacing} style={[styles.placeCancel, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button"><Text style={[styles.placeCancelText, { color: theme.text }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={savePlacing} disabled={placing.min == null || saving} style={[styles.placeSave, { backgroundColor: accent, opacity: placing.min == null || saving ? 0.5 : 1 }]} activeOpacity={0.8} accessibilityRole="button">
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Saving' : placing.min == null ? 'Pick a time' : `Save ${fmtClock(placing.min)}`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <PullSheet visible={planOpen} onClose={() => setPlanOpen(false)} accent={KINDS.block.color}>
        {planOpen ? (<>
          <View style={styles.panelHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>{`What kind of day is ${relDay(anchor) === 'Today' ? 'today' : relDay(anchor) === 'Tomorrow' ? 'tomorrow' : anchor.toLocaleDateString('en', { weekday: 'long' })}?`}</Text>
              <Text style={[styles.panelSub, { color: theme.textSecondary }]}>Tap one. Its blocks land on the day, so the free time is real for you and for EyeCandy.</Text>
            </View>
            <TouchableOpacity onPress={() => setPlanOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close">
              <MaterialIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.addList} showsVerticalScrollIndicator={false}>
            {templates.map((t) => {
              const on = dayTemplate && dayTemplate.id === t.id;
              const free = freeMinutes(blocksForDay([t], { dates: { x: t.id }, weekdays: {}, overrides: {} }, 'x', 0));
              return (
                <TouchableOpacity key={t.id} onPress={() => pickTemplate(t.id)} style={[styles.addRow, { backgroundColor: on ? KINDS.block.color + '33' : tile, borderWidth: on ? 1.5 : 0, borderColor: KINDS.block.color }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: !!on }} accessibilityLabel={`${t.name}, ${templateSummary(t)}`}>
                  <View style={[styles.addIcon, { backgroundColor: KINDS.block.color + '22' }]}><MaterialIcons name={on ? 'check' : 'schedule'} size={22} color={KINDS.block.color} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addRowTitle, { color: theme.text }]}>{t.name}</Text>
                    <Text style={[styles.planSummary, { color: theme.textSecondary }]}>{templateSummary(t)}</Text>
                  </View>
                  <Text style={[styles.addRowDur, { color: theme.textSecondary }]}>{`${fmtDur(free)} free`}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => pickTemplate(null)} style={[styles.addRow, { backgroundColor: !dayTemplate ? KINDS.block.color + '33' : tile, borderWidth: !dayTemplate ? 1.5 : 0, borderColor: KINDS.block.color }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: !dayTemplate }}>
              <View style={[styles.addIcon, { backgroundColor: tile }]}><MaterialIcons name={!dayTemplate ? 'check' : 'block'} size={22} color={theme.textSecondary} /></View>
              <Text style={[styles.addRowTitle, { color: theme.text }]}>No template</Text>
            </TouchableOpacity>
          </ScrollView>
          {dayTemplate ? (
            <TouchableOpacity onPress={toggleWeekday} style={[styles.pinRow, { backgroundColor: tile, marginTop: 0 }]} activeOpacity={0.7} accessibilityRole="switch" accessibilityState={{ checked: !!weekdayTemplateId }}>
              <MaterialIcons name="repeat" size={18} color={weekdayTemplateId ? KINDS.block.color : theme.textSecondary} />
              <Text style={[styles.pinText, { color: theme.text }]}>{weekdayTemplateId ? `Every ${weekdayName} is a ${templates.find((t) => t.id === weekdayTemplateId)?.name || dayTemplate.name} day` : `Use ${dayTemplate.name} every ${weekdayName}`}</Text>
              <Text style={[styles.pinState, { color: weekdayTemplateId ? KINDS.block.color : theme.textSecondary }]}>{weekdayTemplateId ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => { hapticFeedback.light(); setPlanOpen(false); navigation.navigate('DayTemplates'); }} style={[styles.saveBtn, { backgroundColor: KINDS.block.color, marginTop: 12, marginBottom: Math.max(insets.bottom, 12) }]} activeOpacity={0.8} accessibilityRole="button">
            <MaterialIcons name="edit" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>Make or edit templates</Text>
          </TouchableOpacity>
        </>) : null}
      </PullSheet>

      <PullSheet visible={addOpen} onClose={closeAdd} accent={addPick ? (addPick.color || accent) : accent}>
        {addOpen ? (<>
          <View style={styles.panelHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>{addPick ? addPick.title : `Add to ${relDay(anchor)}`}</Text>
              <Text style={[styles.panelSub, { color: theme.textSecondary }]}>{addPick ? 'How often?' : 'Pick one, then tap the time on your day.'}</Text>
            </View>
            <TouchableOpacity onPress={addPick ? () => setAddPick(null) : closeAdd} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={addPick ? 'Back to the list' : 'Close'}>
              <MaterialIcons name={addPick ? 'arrow-back' : 'close'} size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {!addPick ? (<>
            <View style={styles.addTabs}>
              {[{ k: 'reminder', label: 'Reminders' }, { k: 'gym', label: 'Workouts' }, { k: 'prayer', label: 'Prayers' }].map((t) => {
                const on = addTab === t.k;
                return (
                  <TouchableOpacity key={t.k} onPress={() => { hapticFeedback.selection(); setAddTab(t.k); }} style={[styles.addTab, { backgroundColor: on ? accent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.addTabText, { color: on ? '#fff' : theme.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <ScrollView style={styles.addList} showsVerticalScrollIndicator={false}>
              {(library[addTab] || []).length === 0 ? (
                <Text style={[styles.addEmpty, { color: theme.textSecondary }]}>{addTab === 'gym' ? 'No workout templates yet. Make one in Fitness first.' : 'Nothing here yet.'}</Text>
              ) : (library[addTab] || []).map((it) => (
                <TouchableOpacity key={it.id} onPress={() => pickFromLibrary(it)} style={[styles.addRow, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${it.title}, ${fmtDur(it.duration)}`}>
                  <View style={[styles.addIcon, { backgroundColor: (it.color || accent) + '22' }]}><MaterialIcons name={it.icon || 'event'} size={22} color={it.color || accent} /></View>
                  <Text style={[styles.addRowTitle, { color: theme.text }]}>{it.title}</Text>
                  <Text style={[styles.addRowDur, { color: theme.textSecondary }]}>{fmtDur(it.duration)}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>) : (<>
            <View style={styles.scopeRow}>
              {[{ k: 'once', label: `Just once (${relDay(anchor) === 'Today' || relDay(anchor) === 'Tomorrow' ? relDay(anchor) : anchor.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })})` }, { k: 'weekly', label: 'Every week' }].map((o) => {
                const on = addRepeat === o.k;
                return (
                  <TouchableOpacity key={o.k} onPress={() => { hapticFeedback.selection(); setAddRepeat(o.k); }} style={[styles.scopeTab, { height: 48, backgroundColor: on ? (addPick.color || accent) : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.scopeText, { color: on ? '#fff' : theme.text }]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {addRepeat === 'weekly' ? (<>
              <Text style={[styles.panelKicker, { color: theme.textSecondary }]}>Which days?</Text>
              <View style={styles.addDays}>
                {DAY_LETTERS_SUN.map((l, d) => {
                  const on = addDays.includes(d);
                  return (
                    <TouchableOpacity key={d} onPress={() => toggleAddDay(d)} style={[styles.addDay, { backgroundColor: on ? (addPick.color || accent) : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}>
                      <Text style={[styles.addDayText, { color: on ? '#fff' : theme.text }]}>{l}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity onPress={() => { hapticFeedback.selection(); setAddDays([0, 1, 2, 3, 4, 5, 6]); }} style={{ alignSelf: 'flex-start', paddingVertical: 6 }} accessibilityRole="button"><Text style={[styles.fitAltText, { color: addPick.color || accent }]}>Every day</Text></TouchableOpacity>
            </>) : null}
            <TouchableOpacity onPress={startPlacing} style={[styles.saveBtn, { backgroundColor: addPick.color || accent, marginBottom: Math.max(insets.bottom, 12) }]} activeOpacity={0.8} accessibilityRole="button">
              <MaterialIcons name="touch-app" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Next: tap the time</Text>
            </TouchableOpacity>
          </>)}
        </>) : null}
      </PullSheet>

      {/* Move panel. Pull the handle down to dismiss. */}
      <PullSheet visible={!!moving} onClose={cancelMove} accent={panelAccent}>
        {moving ? (<>
          <View style={styles.panelHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Move {moving.title}</Text>
              <Text style={[styles.panelSub, { color: theme.textSecondary }]}>{isSeriesReminder(moving) && !moveAll ? `Just this day. Other days keep ${fmtClock(moving.startMin)}.` : moveScope(moving)}</Text>
            </View>
            <TouchableOpacity onPress={cancelMove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Cancel move">
              <MaterialIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Start time ${fmtClock(draftMin)}, tap to set exactly`}>
            <Text style={[styles.panelTime, { color: theme.text }]}>
              {fmtClock(draftMin)}<Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>{`  to ${fmtClock(draftEnd)}`}</Text>
            </Text>
            <Text style={[styles.panelWas, { color: showWheel ? panelAccent : theme.textSecondary }]}>
              {showWheel ? 'Done setting the exact time' : draftMin !== moving.startMin || (draftDate && draftDate !== dateKeyOf(anchor))
                ? `was ${fmtClock(moving.startMin)}${draftDate && draftDate !== dateKeyOf(anchor) ? `  ·  now on ${pickDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}`
                : 'Nudge it, pick a free time, or set an exact time.'}
            </Text>
          </TouchableOpacity>


          {isSeriesReminder(moving) ? (
            <View style={styles.scopeRow}>
              {[{ all: false, label: 'Just today' }, { all: true, label: (() => { const pt = patternOf(moving.raw); return pt === 'every day' ? 'Every day' : pt === 'weekdays' ? 'Weekdays' : pt === 'weekends' ? 'Weekends' : `Every ${pt}`; })() }].map((o) => {
                const on = moveAll === o.all;
                return (
                  <TouchableOpacity key={String(o.all)} onPress={() => { hapticFeedback.selection(); setMoveAll(o.all); }} style={[styles.scopeTab, { backgroundColor: on ? panelAccent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.scopeText, { color: on ? '#fff' : theme.text }]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <View style={styles.nudgeRow}>
            {NUDGES.map((n) => (
              <TouchableOpacity key={n.label} onPress={() => nudge(n.delta)} style={[styles.nudge, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button">
                <Text style={[styles.nudgeText, { color: theme.text }]}>{n.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} style={[styles.exactBtn, { borderColor: panelAccent, backgroundColor: showWheel ? panelAccent : 'transparent' }]} activeOpacity={0.7} accessibilityRole="button">
            <MaterialIcons name="schedule" size={18} color={showWheel ? '#fff' : panelAccent} />
            <Text style={[styles.exactBtnText, { color: showWheel ? '#fff' : panelAccent }]}>{showWheel ? 'Done' : 'Set an exact time'}</Text>
          </TouchableOpacity>
          {showWheel && Platform.OS === 'ios' ? (
            <View style={[styles.wheel, { borderColor: hairline }]}>
              <DateTimePicker
                value={new Date(2000, 0, 1, Math.floor(draftMin / 60), draftMin % 60, 0)}
                mode="time"
                display="spinner"
                minuteInterval={5}
                textColor={theme.text}
                style={{ alignSelf: 'stretch' }}
                onChange={(_, d) => { if (d) setDraftMin(d.getHours() * 60 + d.getMinutes()); }}
              />
            </View>
          ) : null}

          <Text style={[styles.panelKicker, { color: theme.textSecondary }]}>
            {freeSlots.length ? `Free times ${draftDate && draftDate !== dateKeyOf(anchor) ? 'that day' : relDay(anchor) === 'Today' ? 'today' : relDay(anchor)}` : `No free time ${relDay(anchor) === 'Today' ? 'left today' : 'on ' + relDay(anchor)} that fits ${fmtDur(moving.endMin - moving.startMin)}`}
          </Text>
          {freeSlots.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
              {freeSlots.map((r) => {
                const on = draftMin === r.pickMin;
                return (
                  <TouchableOpacity key={r.pickMin} onPress={() => { hapticFeedback.selection(); setDraftMin(r.pickMin); }} style={[styles.freeChip, { backgroundColor: on ? panelAccent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.freeChipTime, { color: on ? '#fff' : theme.text }]}>{fmtClock(r.pickMin)}</Text>
                    <Text style={[styles.freeChipSub, { color: on ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>{fmtDur(r.endMin - r.startMin)} free</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {moving.raw?.type === 'one-time' || (isSeriesReminder(moving) && !moveAll) ? (
            <>
              <Text style={[styles.panelKicker, { color: theme.textSecondary }]}>Another day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
                {nextDays.map((d) => {
                  const key = dateKeyOf(d);
                  const on = key === draftDate;
                  return (
                    <TouchableOpacity key={key} onPress={() => { hapticFeedback.light(); setDraftDate(key); }} style={[styles.chip, { backgroundColor: on ? panelAccent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[styles.chipText, { color: on ? '#fff' : theme.text }]}>{relDay(d) === 'Today' || relDay(d) === 'Tomorrow' ? relDay(d) : d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <TouchableOpacity onPress={saveMove} disabled={saving} style={[styles.saveBtn, { backgroundColor: panelAccent, opacity: saving ? 0.6 : 1 }]} activeOpacity={0.8} accessibilityRole="button">
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving' : `Save ${fmtClock(draftMin)}`}</Text>
          </TouchableOpacity>
          {moving.kind === 'reminder' || moving.kind === 'task' || moving.kind === 'gym' || moving.kind === 'prayer' || moving.kind === 'block' || moving.kind === 'calendar' || moving.kind === 'eyecandy' ? (
            <TouchableOpacity onPress={async () => { hapticFeedback.selection(); try { await setPinned(moving, !moving.raw?.pinned); const fresh = await loadWeek(); const again = fresh && fresh[dateKeyOf(anchor)] && fresh[dateKeyOf(anchor)].find((x) => x.id === moving.id); if (again) setMoving(again); } catch {} }} style={[styles.pinRow, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="switch" accessibilityState={{ checked: !!moving.raw?.pinned }}>
              <MaterialIcons name={moving.raw?.pinned ? 'push-pin' : 'push-pin'} size={18} color={moving.raw?.pinned ? panelAccent : theme.textSecondary} />
              <Text style={[styles.pinText, { color: theme.text }]}>{moving.kind === 'block' ? (moving.raw?.pinned ? 'Fixed: plans never move this block' : 'Fix it: plans never move this block') : moving.raw?.pinned ? 'Pinned: plans ignore this' : 'Pin: plans ignore this (never moved, never in the way)'}</Text>
              <Text style={[styles.pinState, { color: moving.raw?.pinned ? panelAccent : theme.textSecondary }]}>{moving.raw?.pinned ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => confirmRemove(moving)} disabled={saving} style={[styles.removeBtn, { marginBottom: Math.max(insets.bottom, 12) }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Remove ${moving.title}`}>
            <Text style={styles.removeText}>{isSeriesReminder(moving) || moving.kind === 'block' ? 'Skip today or remove' : moving.kind === 'eyecandy' ? 'Skip today' : 'Remove'}</Text>
          </TouchableOpacity>
        </>) : null}
      </PullSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 4 },
  headerBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 15, fontWeight: '800' },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  weekLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 },
  weekWrap: { flexGrow: 0, flexShrink: 0, height: 70, marginBottom: 4 },
  weekStrip: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, height: 62 },
  dayTile: { flex: 1, height: 62, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dayLetter: { fontSize: 11, fontWeight: '700' },
  dayNum: { fontSize: 17, fontWeight: '800', marginTop: 1, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 3, marginTop: 5, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotBig: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 60 },
  kicker: { fontSize: 13, fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  summary: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  chipsScroll: { marginHorizontal: -20, marginTop: 8 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 12 },
  chipText: { fontSize: 14, fontWeight: '700' },
  status: { fontSize: 13.5, fontWeight: '700', marginTop: 12 },
  viewRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  zoomCtl: { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 12, paddingHorizontal: 4, marginRight: 'auto' },
  zoomBtn: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  zoomLabel: { fontSize: 12.5, fontWeight: '800', minWidth: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  zoomHint: { fontSize: 12.5, lineHeight: 17, marginTop: 10 },
  viewTab: { height: 36, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  viewTabText: { fontSize: 14, fontWeight: '800' },
  timeline: { marginTop: 14, position: 'relative' },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  hourLabel: { width: 52, fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: -7 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  cardFill: { ...StyleSheet.absoluteFillObject },
  strip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, overflow: 'hidden' },
  stripFill: { ...StyleSheet.absoluteFillObject },
  stripDot: { width: 6, height: 12, borderRadius: 3, marginRight: 8 },
  stripText: { fontSize: 10, fontWeight: '800' },
  cardArea: { position: 'absolute', right: 0, top: 0, bottom: 0 },
  card: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  cardBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: -0.1, lineHeight: 13 },
  cardMeta: { fontSize: 10, fontWeight: '600', marginTop: 1, lineHeight: 12 },
  cardMove: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  nowRow: { position: 'absolute', left: 50, right: 0, flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowLine: { flex: 1, height: 1.5 },
  list: { marginTop: 14, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingVertical: 12, paddingRight: 14, overflow: 'hidden' },
  bar: { width: 4, alignSelf: 'stretch', marginRight: 12 },
  timeCol: { width: 80 },
  time: { fontSize: 15.5, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.2 },
  dur: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  mainCol: { flex: 1, paddingRight: 10 },
  title: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2, lineHeight: 21 },
  meta: { fontSize: 13, fontWeight: '500', marginTop: 3 },
  movePill: { height: 32, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center' },
  movePillText: { fontSize: 14, fontWeight: '800' },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  freeLine: { flex: 1, height: StyleSheet.hairlineWidth },
  freeText: { fontSize: 12.5, fontWeight: '600' },
  emptyTile: { borderRadius: 16, padding: 18 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySub: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  footnote: { fontSize: 13, lineHeight: 18, marginTop: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  addFab: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  addFabText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  addTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  addTab: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addTabText: { fontSize: 15, fontWeight: '800' },
  addList: { maxHeight: 360, marginTop: 12, marginBottom: 16 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 4 },
  planText: { flex: 1, fontSize: 15, fontWeight: '700' },
  planLink: { fontSize: 14, fontWeight: '800' },
  planSummary: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, marginBottom: 8 },
  addIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addRowTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  addRowDur: { fontSize: 14, fontWeight: '600' },
  addEmpty: { fontSize: 15, fontWeight: '600', paddingVertical: 20, textAlign: 'center' },
  addDays: { flexDirection: 'row', gap: 6, marginTop: 6 },
  addDay: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addDayText: { fontSize: 16, fontWeight: '800' },
  placeBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1.5, overflow: 'hidden' },
  placeTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  placeSub: { fontSize: 13.5, fontWeight: '600', marginTop: 4, lineHeight: 19 },
  placeBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  placeCancel: { height: 52, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  placeCancelText: { fontSize: 16, fontWeight: '800' },
  placeSave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: 16 },
  ghost: { position: 'absolute', borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', paddingHorizontal: 10, justifyContent: 'center' },
  ghostText: { fontSize: 13, fontWeight: '800' },
  sheetBody: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1.5, overflow: 'hidden', paddingHorizontal: 20, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: -8 } },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: -8 } },
  panelSurface: { ...StyleSheet.absoluteFillObject },
  exactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, borderWidth: 1.5, marginTop: 12 },
  exactBtnText: { fontSize: 15, fontWeight: '800' },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start' },
  panelTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  panelSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  panelTime: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7, marginTop: 10, fontVariant: ['tabular-nums'] },
  panelWas: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  nudgeRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  nudge: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nudgeText: { fontSize: 12.5, fontWeight: '800' },
  wheel: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingVertical: 4 },
  panelKicker: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 2 },
  freeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, minWidth: 96 },
  freeChipTime: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  freeChipSub: { fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  fitBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 14, paddingHorizontal: 16, marginTop: 12 },
  fitBtnText: { color: '#fff', fontSize: 15.5, fontWeight: '800', flex: 1 },
  fitBtnSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  fitBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  fitRowTitle: { flex: 1, flexShrink: 1, fontSize: 15, fontWeight: '700' },
  fitRowTime: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  fitStay: { fontSize: 13.5, fontWeight: '600', lineHeight: 19, marginTop: 4 },
  fitRowNote: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  scopeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  scopeTab: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scopeText: { fontSize: 14, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: 16, marginTop: 18 },
  saveBtnText: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  removeBtn: { alignItems: 'center', justifyContent: 'center', height: 40, marginTop: -6, marginBottom: 2 },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderRadius: 12, paddingHorizontal: 12, marginTop: 10 },
  pinText: { flex: 1, fontSize: 14, fontWeight: '700' },
  pinState: { fontSize: 13, fontWeight: '800' },
  fitAltBtn: { alignSelf: 'flex-start', paddingLeft: 14, paddingBottom: 6, marginTop: -4 },
  fitAltText: { fontSize: 13, fontWeight: '700' },
  removeText: { color: '#FF453A', fontSize: 14.5, fontWeight: '800' },
});

export default MyWeekScreen;
