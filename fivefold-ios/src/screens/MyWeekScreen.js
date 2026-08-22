import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { computeDayFlow } from '../utils/dayFlow';
import {
  loadDayItems, buildAgenda, countByKind, daySummary, weekOf,
  KINDS, KIND_ORDER, fmtClock, fmtDur, minToTime, moveScope,
} from '../utils/dayItems';
import { dateKeyOf } from '../utils/dayBusy';
import { layoutDay, PX_PER_HOUR, ZOOM_MIN, ZOOM_MAX, NEST_INSET, clampZoom, zoomLabelFor } from '../utils/timelineLayout';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, Easing } from 'react-native-reanimated';
import { moveItem } from '../services/rescheduleItem';

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
const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('timeline'); // timeline | list
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR);
  const [timelineW, setTimelineW] = useState(0);
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const timelineTopRef = useRef(0);
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
    } catch { if (fresh) setItemsByDay({}); }
    if (fresh) setLoading(false);
  }, [weekKey]);

  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => navigation.addListener('focus', loadWeek), [navigation, loadWeek]);

  const dayItems = itemsByDay[dateKeyOf(anchor)] || [];
  const counts = useMemo(() => countByKind(dayItems), [dayItems]);
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
    const thisMon = weekOf(t)[0];
    const diff = Math.round((week[0] - thisMon) / (7 * 86400000));
    const rel = diff === 0 ? 'This week' : diff === 1 ? 'Next week' : diff === -1 ? 'Last week' : diff > 0 ? `${diff} weeks ahead` : `${-diff} weeks ago`;
    return `${range}  ·  ${rel}`;
  })();

  const startMove = (item) => {
    hapticFeedback.medium();
    setMoving(item);
    setDraftMin(item.startMin);
    setDraftDate(dateKeyOf(anchor));
    setShowWheel(false);
    setStatus(null);
  };
  const cancelMove = () => { hapticFeedback.light(); setMoving(null); setShowWheel(false); };
  const nudge = (delta) => {
    hapticFeedback.selection();
    setDraftMin((m) => Math.max(0, Math.min(23 * 60 + 55, Math.round((m + delta) / 5) * 5)));
  };
  const saveMove = async () => {
    if (!moving || saving) return;
    setSaving(true);
    try {
      const ok = await moveItem(moving, { time: minToTime(draftMin), date: draftDate });
      if (!ok) throw new Error('not movable');
      hapticFeedback.success();
      const movedDay = draftDate && draftDate !== dateKeyOf(anchor);
      setStatus(`${moving.title} moved to ${fmtClock(draftMin)}${movedDay ? ` on ${draftDate}` : ''}.`);
      setMoving(null);
      setShowWheel(false);
      // Keep the user where they were: the refresh swaps data in place, and
      // the panel closing shrinks the bottom padding, so pin the offset.
      const keepY = scrollYRef.current;
      await loadWeek();
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: keepY, animated: false }));
    } catch (e) {
      hapticFeedback.error();
      Alert.alert('Could not move it', e?.message || 'Please try again.');
    }
    setSaving(false);
  };

  // Sports fixtures (kick-off is the league's call) and read-only calendars
  // (subscriptions, holidays, shared calendars you cannot edit) land here.
  const explainExternal = (item) => {
    hapticFeedback.light();
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
          onPress={() => { hapticFeedback.light(); const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); }}
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

      <ScrollView ref={scrollRef} onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16} contentContainerStyle={[styles.body, moving && { paddingBottom: showWheel ? 560 : 380 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.kicker, { color: theme.textSecondary }]}>{relDay(anchor)}</Text>
        <Text style={[styles.headline, { color: theme.text }]}>{anchor.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>{loading ? 'Checking every source...' : daySummary(dayItems)}</Text>

        {/* Kind filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsScroll, { marginTop: 14 }]} contentContainerStyle={styles.chipsRow}>
          {KIND_ORDER.map((k) => {
            const n = counts[k] || 0;
            const off = hidden.has(k);
            return (
              <TouchableOpacity key={k} onPress={() => toggleKind(k)} style={[styles.chip, { backgroundColor: tile, opacity: off ? 0.45 : 1 }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: !off }}>
                <View style={[styles.dotBig, { backgroundColor: KINDS[k].color }]} />
                <Text style={[styles.chipText, { color: theme.text }]}>{KINDS[k].label}{k === 'prayer' || k === 'reminder' || k === 'gym' ? 's' : ''} {n}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {status ? <Text style={[styles.status, { color: accent }]}>{status}</Text> : null}

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
        {view === 'timeline' && !loading && visible.length > 0 ? (
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
          <Text style={[styles.footnote, { color: theme.textSecondary }]}>Tap Move on a prayer, reminder or workout to change its time. EyeCandy and Calendar items are changed in their own apps.</Text>
        ) : null}
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={accent} /> : null}
      </ScrollView>

      {/* Move panel: dims the day behind it and sits on its own lighter surface */}
      {moving ? (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={cancelMove} accessibilityRole="button" accessibilityLabel="Cancel move" />
      ) : null}
      {moving ? (
        <View style={[styles.panel, { backgroundColor: theme.background, borderColor: accent + '55' }]}>
          <View style={[styles.panelSurface, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.035)' }]} pointerEvents="none" />
          <View style={styles.panelHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Move {moving.title}</Text>
              <Text style={[styles.panelSub, { color: theme.textSecondary }]}>{moveScope(moving)}</Text>
            </View>
            <TouchableOpacity onPress={cancelMove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Cancel move">
              <MaterialIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Start time ${fmtClock(draftMin)}, tap to set exactly`}>
            <Text style={[styles.panelTime, { color: theme.text }]}>
              {fmtClock(draftMin)}<Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>{`  to ${fmtClock(draftEnd)}`}</Text>
            </Text>
            <Text style={[styles.panelWas, { color: showWheel ? accent : theme.textSecondary }]}>
              {showWheel ? 'Done setting the exact time' : draftMin !== moving.startMin || (draftDate && draftDate !== dateKeyOf(anchor))
                ? `was ${fmtClock(moving.startMin)}${draftDate && draftDate !== dateKeyOf(anchor) ? `  ·  now on ${pickDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}`
                : 'Nudge it, pick a free time, or set an exact time.'}
            </Text>
          </TouchableOpacity>


          <View style={styles.nudgeRow}>
            {NUDGES.map((n) => (
              <TouchableOpacity key={n.label} onPress={() => nudge(n.delta)} style={[styles.nudge, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button">
                <Text style={[styles.nudgeText, { color: theme.text }]}>{n.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => { hapticFeedback.light(); setShowWheel((v) => !v); }} style={[styles.exactBtn, { borderColor: accent, backgroundColor: showWheel ? accent : 'transparent' }]} activeOpacity={0.7} accessibilityRole="button">
            <MaterialIcons name="schedule" size={18} color={showWheel ? '#fff' : accent} />
            <Text style={[styles.exactBtnText, { color: showWheel ? '#fff' : accent }]}>{showWheel ? 'Done' : 'Set an exact time'}</Text>
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
                  <TouchableOpacity key={r.pickMin} onPress={() => { hapticFeedback.selection(); setDraftMin(r.pickMin); }} style={[styles.freeChip, { backgroundColor: on ? accent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.freeChipTime, { color: on ? '#fff' : theme.text }]}>{fmtClock(r.pickMin)}</Text>
                    <Text style={[styles.freeChipSub, { color: on ? 'rgba(255,255,255,0.85)' : theme.textSecondary }]}>{fmtDur(r.endMin - r.startMin)} free</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {moving.raw?.type === 'one-time' ? (
            <>
              <Text style={[styles.panelKicker, { color: theme.textSecondary }]}>Another day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
                {nextDays.map((d) => {
                  const key = dateKeyOf(d);
                  const on = key === draftDate;
                  return (
                    <TouchableOpacity key={key} onPress={() => { hapticFeedback.light(); setDraftDate(key); }} style={[styles.chip, { backgroundColor: on ? accent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[styles.chipText, { color: on ? '#fff' : theme.text }]}>{relDay(d) === 'Today' || relDay(d) === 'Tomorrow' ? relDay(d) : d.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <TouchableOpacity onPress={saveMove} disabled={saving} style={[styles.saveBtn, { backgroundColor: accent, opacity: saving ? 0.6 : 1, marginBottom: Math.max(insets.bottom, 12) }]} activeOpacity={0.8} accessibilityRole="button">
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving' : `Save ${fmtClock(draftMin)}`}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: 16, marginTop: 18 },
  saveBtnText: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
});

export default MyWeekScreen;
