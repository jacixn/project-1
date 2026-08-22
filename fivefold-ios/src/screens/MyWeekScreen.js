import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import SheetHeader from '../components/SheetHeader';
import StartTimePicker from '../components/StartTimePicker';
import {
  loadDayItems, buildAgenda, countByKind, daySummary, weekOf,
  KINDS, KIND_ORDER, fmtClock, fmtDur, minToTime, moveScope,
} from '../utils/dayItems';
import { dateKeyOf } from '../utils/dayBusy';
import { layoutDay } from '../utils/timelineLayout';
import { moveItem } from '../services/rescheduleItem';

// My Week: everything scheduled, from every source, on one screen. Prayers,
// reminders and workouts can be moved from here (nudge, pick a free time,
// another day); EyeCandy and other calendar events show so the day is
// honest, but they are changed where they live.
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
  const [pickOpen, setPickOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [view, setView] = useState('timeline'); // timeline | list
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60000); return () => clearInterval(t); }, []);

  const weekKey = dateKeyOf(week[0]);
  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const lists = await Promise.all(week.map((d) => loadDayItems(d)));
      const map = {};
      week.forEach((d, i) => { map[dateKeyOf(d)] = lists[i]; });
      setItemsByDay(map);
    } catch { setItemsByDay({}); }
    setLoading(false);
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
  const layout = useMemo(() => layoutDay(visible, { nowMin }), [visible, nowMin]);

  const toggleKind = (k) => {
    hapticFeedback.light();
    setHidden((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  };

  const shiftWeek = (dir) => {
    hapticFeedback.light();
    const d = new Date(anchor); d.setDate(d.getDate() + dir * 7); setAnchor(d);
  };

  const startMove = (item) => {
    hapticFeedback.medium();
    setMoving(item);
    setDraftMin(item.startMin);
    setDraftDate(dateKeyOf(anchor));
    setPickOpen(false);
    setStatus(null);
  };
  const cancelMove = () => { hapticFeedback.light(); setMoving(null); setPickOpen(false); };
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
      setPickOpen(false);
      await loadWeek();
    } catch (e) {
      hapticFeedback.error();
      Alert.alert('Could not move it', e?.message || 'Please try again.');
    }
    setSaving(false);
  };

  const explainExternal = (item) => {
    hapticFeedback.light();
    const fromEyeCandy = item.kind === 'eyecandy';
    Alert.alert(
      item.title,
      fromEyeCandy
        ? 'This comes from EyeCandy. Move it in EyeCandy and it updates here.'
        : `This comes from your iPhone Calendar (${item.subtitle || 'Calendar'}). Change it in the Calendar app and it updates here.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: fromEyeCandy ? 'Open EyeCandy' : 'Open Calendar', onPress: () => Linking.openURL(fromEyeCandy ? 'eyecandy://' : 'calshow:').catch(() => {}) },
      ],
    );
  };

  const nextDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(anchor); d.setDate(anchor.getDate() + i); return d; }), [anchor]);
  const draftEnd = moving ? draftMin + (moving.endMin - moving.startMin) : 0;
  const excludeProps = moving ? {
    excludePrayerId: moving.kind === 'prayer' ? moving.raw?.id : null,
    excludeReminderId: moving.kind === 'reminder' ? moving.raw?.id : null,
    excludeGymId: moving.kind === 'gym' ? moving.raw?.id : null,
  } : {};
  const pickDate = useMemo(() => {
    if (!draftDate) return anchor;
    const [y, m, d] = draftDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [draftDate, anchor]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SheetHeader title="My Week" leftLabel="Done" onLeft={() => navigation.goBack()} rightLabel="Today" onRight={() => { hapticFeedback.light(); const d = new Date(); d.setHours(0, 0, 0, 0); setAnchor(d); }} />

      {/* Week strip */}
      <View style={styles.weekRow}>
        <TouchableOpacity onPress={() => shiftWeek(-1)} style={[styles.weekNav, { backgroundColor: tile }]} accessibilityRole="button" accessibilityLabel="Previous week">
          <MaterialIcons name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.weekStrip}>
          {week.map((d, i) => {
            const key = dateKeyOf(d);
            const sel = sameDay(d, anchor);
            const isToday = sameDay(d, today);
            const kinds = KIND_ORDER.filter((k) => (itemsByDay[key] || []).some((it) => it.kind === k));
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
        </View>
        <TouchableOpacity onPress={() => shiftWeek(1)} style={[styles.weekNav, { backgroundColor: tile }]} accessibilityRole="button" accessibilityLabel="Next week">
          <MaterialIcons name="chevron-right" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.body, moving && { paddingBottom: pickOpen ? 620 : 360 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.kicker, { color: theme.textSecondary }]}>{relDay(anchor)}</Text>
        <Text style={[styles.headline, { color: theme.text }]}>{anchor.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>{loading ? 'Checking every source...' : daySummary(dayItems)}</Text>

        {/* Kind filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
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
          {[{ k: 'timeline', label: 'Timeline' }, { k: 'list', label: 'List' }].map((o) => {
            const on = view === o.k;
            return (
              <TouchableOpacity key={o.k} onPress={() => { hapticFeedback.light(); setView(o.k); }} style={[styles.viewTab, { backgroundColor: on ? accent : tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.viewTabText, { color: on ? '#fff' : theme.text }]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline: long things stretch over their hours, short things sit inside at their time */}
        {view === 'timeline' && !loading && visible.length > 0 ? (
          <View style={[styles.timeline, { height: layout.height + 16 }]}>
            {layout.hours.map((h) => (
              <View key={h.min} style={[styles.hourRow, { top: h.y }]} pointerEvents="none">
                <Text style={[styles.hourLabel, { color: theme.textSecondary }]}>{h.label}</Text>
                <View style={[styles.hourLine, { backgroundColor: hairline }]} />
              </View>
            ))}
            <View style={styles.laneArea}>
              {layout.blocks.map((b) => {
                const it = b.item;
                const tiny = b.h < 44;
                const isMoving = moving && moving.id === it.id;
                return (
                  <TouchableOpacity
                    key={it.id}
                    onPress={() => (it.movable ? startMove(it) : explainExternal(it))}
                    activeOpacity={0.7}
                    style={[
                      styles.block,
                      b.container ? styles.blockContainer : null,
                      {
                        top: b.y,
                        height: b.h,
                        left: b.container ? 0 : `${b.left * 100}%`,
                        width: b.container ? '100%' : `${b.width * 100}%`,
                        backgroundColor: b.container ? it.color + '26' : it.color + (isDark ? '33' : '2A'),
                        borderColor: isMoving ? accent : it.color + (b.container ? '66' : 'AA'),
                        paddingLeft: b.container ? 10 : (b.col === 0 ? 10 : 8),
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${it.title}, ${fmtClock(it.startMin)} to ${fmtClock(it.endMin)}, ${KINDS[it.kind].label}`}
                    accessibilityHint={it.movable ? 'Opens move options' : 'Explains where to change it'}
                  >
                    <View style={[styles.blockBar, { backgroundColor: it.color }]} />
                    {tiny ? (
                      <Text style={[styles.blockTiny, { color: theme.text }]}>
                        <Text style={{ color: it.color }}>{fmtClock(it.startMin)}</Text>{`  ${it.title}`}
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.blockTitle, { color: theme.text }]}>{it.title}</Text>
                        <Text style={[styles.blockMeta, { color: theme.textSecondary }]}>
                          <Text style={{ color: it.color, fontWeight: '700' }}>{fmtClock(it.startMin)}</Text>{` to ${fmtClock(it.endMin)}  ·  ${KINDS[it.kind].label}`}
                        </Text>
                        {b.container && b.h > 120 ? <Text style={[styles.blockHint, { color: theme.textSecondary }]}>{fmtDur(it.endMin - it.startMin)}{it.movable ? '' : '  ·  managed elsewhere'}</Text> : null}
                      </>
                    )}
                    {!it.movable && !tiny ? <MaterialIcons name="lock-outline" size={14} color={theme.textSecondary} style={styles.blockLock} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            {layout.nowY != null ? (
              <View style={[styles.nowRow, { top: layout.nowY }]} pointerEvents="none">
                <View style={[styles.nowDot, { backgroundColor: theme.error || '#EF4444' }]} />
                <View style={[styles.nowLine, { backgroundColor: theme.error || '#EF4444' }]} />
              </View>
            ) : null}
          </View>
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
                accessibilityHint={it.movable ? 'Opens move options' : 'Explains where to change it'}
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

      {/* Move panel */}
      {moving ? (
        <View style={[styles.panel, { backgroundColor: theme.card || theme.background, borderColor: hairline }]}>
          <View style={styles.panelHead}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.panelTitle, { color: theme.text }]}>Move {moving.title}</Text>
              <Text style={[styles.panelSub, { color: theme.textSecondary }]}>{moveScope(moving)}</Text>
            </View>
            <TouchableOpacity onPress={cancelMove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Cancel move">
              <MaterialIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.panelTime, { color: theme.text }]}>
            {fmtClock(draftMin)}<Text style={{ color: theme.textSecondary, fontSize: 15, fontWeight: '600' }}>{`  to ${fmtClock(draftEnd)}`}</Text>
          </Text>
          {draftMin !== moving.startMin || (draftDate && draftDate !== dateKeyOf(anchor)) ? (
            <Text style={[styles.panelWas, { color: theme.textSecondary }]}>was {fmtClock(moving.startMin)}{draftDate && draftDate !== dateKeyOf(anchor) ? `  ·  now on ${pickDate.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}</Text>
          ) : (
            <Text style={[styles.panelWas, { color: theme.textSecondary }]}>Nudge it, pick a free time, or choose another day.</Text>
          )}

          <View style={styles.nudgeRow}>
            {NUDGES.map((n) => (
              <TouchableOpacity key={n.label} onPress={() => nudge(n.delta)} style={[styles.nudge, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button">
                <Text style={[styles.nudgeText, { color: theme.text }]}>{n.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.panelActions}>
            <TouchableOpacity onPress={() => { hapticFeedback.light(); setPickOpen((v) => !v); }} style={[styles.outlineBtn, { borderColor: accent, backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button">
              <MaterialIcons name="schedule" size={18} color={accent} />
              <Text style={[styles.outlineBtnText, { color: accent }]}>{pickOpen ? 'Hide free times' : 'Pick a free time'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={saveMove} disabled={saving} style={[styles.saveBtn, { backgroundColor: accent, opacity: saving ? 0.6 : 1 }]} activeOpacity={0.8} accessibilityRole="button">
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Saving' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {moving.raw?.type === 'one-time' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={[styles.chipsRow, { paddingTop: 10 }]}>
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
          ) : null}

          {pickOpen ? (
            <View style={styles.pickerBox}>
              <StartTimePicker
                date={pickDate}
                selected={{ hour: Math.floor(draftMin / 60), minute: draftMin % 60 }}
                durationMinutes={moving.endMin - moving.startMin}
                label={moving.title}
                accentColor={accent}
                onPick={(h, m) => setDraftMin(h * 60 + m)}
                {...excludeProps}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, gap: 6 },
  weekNav: { width: 34, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  weekStrip: { flex: 1, flexDirection: 'row', gap: 5 },
  dayTile: { flex: 1, height: 58, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dayLetter: { fontSize: 11, fontWeight: '700' },
  dayNum: { fontSize: 16, fontWeight: '800', marginTop: 1, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 3, marginTop: 4, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  dotBig: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 60 },
  kicker: { fontSize: 13, fontWeight: '600' },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  summary: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  chipsScroll: { marginHorizontal: -20, marginTop: 14 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 12, borderRadius: 12 },
  chipText: { fontSize: 14, fontWeight: '700' },
  status: { fontSize: 13.5, fontWeight: '700', marginTop: 12 },
  viewRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  viewTab: { height: 36, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  viewTabText: { fontSize: 14, fontWeight: '800' },
  timeline: { marginTop: 14, position: 'relative' },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  hourLabel: { width: 52, fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: -7 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  laneArea: { position: 'absolute', left: 56, right: 0, top: 0, bottom: 0 },
  block: { position: 'absolute', borderRadius: 12, borderWidth: 1.5, paddingTop: 6, paddingRight: 8, overflow: 'hidden', marginRight: 3 },
  blockContainer: { borderStyle: 'dashed' },
  blockBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  blockTiny: { fontSize: 12.5, fontWeight: '800', lineHeight: 16 },
  blockTitle: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, lineHeight: 18 },
  blockMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  blockHint: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  blockLock: { position: 'absolute', right: 8, top: 8 },
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
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: -6 } },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start' },
  panelTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  panelSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  panelTime: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7, marginTop: 10, fontVariant: ['tabular-nums'] },
  panelWas: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  nudgeRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  nudge: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nudgeText: { fontSize: 12.5, fontWeight: '800' },
  panelActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  outlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 14, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 15, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 48, paddingHorizontal: 22, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pickerBox: { height: 300, marginTop: 12 },
});

export default MyWeekScreen;
