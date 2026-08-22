import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  BUILTIN_REMINDER_PRESETS,
  loadReminderPresets,
  loadHiddenBuiltins,
  saveReminderPreset,
  addReminder,
  updateReminder,
  DAY_SHORT,
} from '../services/reminderService';
import { DEFAULT_DURATION, formatDuration } from '../utils/duration';
import ReminderDetailsEditor from './ReminderDetailsEditor';
import StartTimePicker from './StartTimePicker';
import SheetHeader from './SheetHeader';
import { offerFit, nextDateFor } from '../services/fitOffer';

const pad = (n) => String(n).padStart(2, '0');
const fmtDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const fmtClock = (h, m) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ap}`;
};
// Next date (today or later) that lands on weekday dayIdx (0=Sun), midnight local.
const nextDateForWeekday = (dayIdx) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((dayIdx - d.getDay() + 7) % 7));
  return d;
};

const blankItem = () => ({ title: '', duration: DEFAULT_DURATION, icon: 'notifications', color: '#3B82F6' });

// The scheduling wizard, presented as a native pull-to-dismiss modal SCREEN
// (presentation:'modal' on the root native-stack, parent scales back, drag down
// to dismiss, à la Gibbon). Pick a reminder from the library (or build one),
// choose how it repeats, then DRAG it onto the timeline to set the time. Persists
// straight to reminderService; RemindersScreen refreshes on focus. Editing target
// arrives via route.params.editingReminder.
const ScheduleReminderModal = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const editingReminder = route?.params?.editingReminder || null;
  const close = () => navigation.goBack();

  const [step, setStep] = useState('pick');           // pick | details | repeat | time
  const [item, setItem] = useState(blankItem());       // the reminder's "what"
  const [brandNew, setBrandNew] = useState(false);     // came in via "New reminder"
  const [saveToLib, setSaveToLib] = useState(true);    // save a brand-new one to the library
  const [type, setType] = useState('recurring');
  const [days, setDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [oneTimeDates, setOneTimeDates] = useState([new Date()]);
  const [draftDate, setDraftDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [time, setTime] = useState({ hour: 8, minute: 0 });
  const [userItems, setUserItems] = useState([]);
  const [hiddenBuiltins, setHiddenBuiltins] = useState([]);

  const inputBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Runs once on mount, the screen is presented fresh each time.
  useEffect(() => {
    loadReminderPresets().then(setUserItems).catch(() => setUserItems([]));
    loadHiddenBuiltins().then(setHiddenBuiltins).catch(() => setHiddenBuiltins([]));

    if (editingReminder) {
      const r = editingReminder;
      setItem({
        title: r.title || '',
        duration: r.duration ?? DEFAULT_DURATION,
        icon: r.icon || 'notifications',
        color: r.color || '#3B82F6',
      });
      setType(r.type || 'recurring');
      setDays(Array.isArray(r.days) && r.days.length ? r.days : [0, 1, 2, 3, 4, 5, 6]);
      if (r.type === 'one-time' && r.date) {
        const [y, mo, dd] = r.date.split('-').map(Number);
        setOneTimeDates([new Date(y, mo - 1, dd)]);
        setCalMonth(new Date(y, mo - 1, 1));
      } else {
        setOneTimeDates([new Date()]);
      }
      const [h, m] = (r.time || '08:00').split(':').map(Number);
      setTime({ hour: Number.isFinite(h) ? h : 8, minute: Number.isFinite(m) ? m : 0 });
      setBrandNew(false);
      setSaveToLib(false);
      setStep('repeat');
    } else {
      setItem(blankItem());
      setType('recurring');
      setDays([0, 1, 2, 3, 4, 5, 6]);
      setOneTimeDates([new Date()]);
      setTime({ hour: 8, minute: 0 });
      setBrandNew(false);
      setSaveToLib(true);
      setStep('pick');
    }
    setShowDatePicker(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pick ─────────────────────────────────────────────────────────────────
  const pickEntry = (entry) => {
    hapticFeedback.medium();
    setItem({
      title: entry.title || '',
      duration: entry.duration ?? DEFAULT_DURATION,
      icon: entry.icon || 'notifications',
      color: entry.color || '#3B82F6',
    });
    setBrandNew(false);
    setStep('repeat');
  };

  const startNew = () => {
    hapticFeedback.light();
    setItem(blankItem());
    setBrandNew(true);
    setSaveToLib(true);
    setStep('details');
  };

  // ── details ──────────────────────────────────────────────────────────────
  const commitDetails = async () => {
    if (!item.title.trim()) return;
    hapticFeedback.success();
    const clean = { ...item, title: item.title.trim() };
    setItem(clean);
    if (brandNew && saveToLib) {
      try { await saveReminderPreset(clean); setUserItems(await loadReminderPresets()); } catch {}
    }
    setStep('repeat');
  };

  // ── repeat ───────────────────────────────────────────────────────────────
  const toggleDay = (idx) => {
    hapticFeedback.light();
    setDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()));
  };
  const quickDays = (key) => {
    hapticFeedback.light();
    if (key === 'everyday') setDays([0, 1, 2, 3, 4, 5, 6]);
    else if (key === 'weekdays') setDays([1, 2, 3, 4, 5]);
    else if (key === 'weekends') setDays([0, 6]);
  };
  const addDraftDate = (dateArg) => {
    const chosen = dateArg instanceof Date ? dateArg : draftDate;
    hapticFeedback.light();
    if (editingReminder) {
      // Editing persists a single reminder (onSave -> list[0]), so a picked date
      // REPLACES the current one rather than accumulating extra dates.
      setOneTimeDates([new Date(chosen)]);
    } else {
      setOneTimeDates((prev) => {
        const key = fmtDateKey(chosen);
        if (prev.some((d) => fmtDateKey(d) === key)) return prev;
        return [...prev, new Date(chosen)].sort((a, b) => a - b);
      });
    }
    setShowDatePicker(false);
  };
  const removeDate = (key) => {
    hapticFeedback.light();
    setOneTimeDates((prev) => (prev.length <= 1 ? prev : prev.filter((d) => fmtDateKey(d) !== key)));
  };

  // ── multi-select calendar (one-time) ───────────────────────────────────────
  // Tap dates to toggle them on/off. Editing a single reminder picks just one.
  const toggleDate = (date) => {
    hapticFeedback.light();
    const key = fmtDateKey(date);
    if (editingReminder) { setOneTimeDates([new Date(date)]); return; }
    setOneTimeDates((prev) =>
      prev.some((d) => fmtDateKey(d) === key)
        ? prev.filter((d) => fmtDateKey(d) !== key)
        : [...prev, new Date(date)].sort((a, b) => a - b)
    );
  };
  const changeMonth = (delta) => {
    hapticFeedback.selection();
    setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  };

  const renderCalendar = () => {
    const y = calMonth.getFullYear();
    const mo = calMonth.getMonth();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const startWeekday = new Date(y, mo, 1).getDay();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayKey = fmtDateKey(today);
    const selectedKeys = new Set(oneTimeDates.map(fmtDateKey));
    const accent = item.color || theme.primary;
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const canPrev = calMonth > thisMonthStart;
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, mo, d));
    const hs = { top: 8, bottom: 8, left: 8, right: 8 };
    return (
      <View style={[styles.calCard, { backgroundColor: inputBg, borderColor: theme.border }]}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={() => canPrev && changeMonth(-1)} disabled={!canPrev} hitSlop={hs} style={styles.calNavBtn}>
            <MaterialIcons name="chevron-left" size={26} color={canPrev ? theme.text : theme.textTertiary} />
          </TouchableOpacity>
          <Text style={[styles.calMonthLabel, { color: theme.text }]}>
            {calMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} hitSlop={hs} style={styles.calNavBtn}>
            <MaterialIcons name="chevron-right" size={26} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.calWeekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
            <Text key={i} style={[styles.calWeekLabel, { color: theme.textTertiary }]}>{w}</Text>
          ))}
        </View>
        <View style={styles.calGrid}>
          {cells.map((date, i) => {
            if (!date) return <View key={`e${i}`} style={styles.calCell} />;
            const key = fmtDateKey(date);
            const isPast = date < today;
            const isSel = selectedKeys.has(key);
            const isToday = key === todayKey;
            return (
              <TouchableOpacity key={key} style={styles.calCell} disabled={isPast} activeOpacity={0.7} onPress={() => toggleDate(date)}>
                <View style={[
                  styles.calDay,
                  isSel && { backgroundColor: accent },
                  !isSel && isToday && { borderWidth: 1.5, borderColor: accent },
                ]}>
                  <Text style={[styles.calDayText, { color: isSel ? '#fff' : theme.text, opacity: isPast ? 0.3 : 1 }]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const repeatValid = type === 'one-time' ? oneTimeDates.length > 0 : days.length > 0;

  // ── time ─────────────────────────────────────────────────────────────────
  const timelineDate = type === 'one-time'
    ? (oneTimeDates[0] || new Date())
    : nextDateForWeekday((days.slice().sort((a, b) => a - b)[0]) ?? new Date().getDay());

  const tileColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const editingStartMin = (() => {
    const [h, mm] = String(editingReminder?.time || '').split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(mm) ? h * 60 + mm : -1;
  })();
  const timelineSubtitle = type === 'one-time'
    ? (oneTimeDates.length > 1
        ? `${oneTimeDates.length} dates · same time`
        : timelineDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }))
    : (days.length === 7 ? 'Every day' : days.slice().sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(', '));

  const save = async () => {
    hapticFeedback.success();
    const timeStr = `${pad(time.hour)}:${pad(time.minute)}`;
    const base = {
      title: item.title.trim(),
      time: timeStr,
      duration: item.duration,
      icon: item.icon,
      color: item.color,
    };
    // Persist straight to storage; the Reminders/All-reminders screens refresh on
    // focus when this modal is dismissed.
    let offer = null; // the saved reminder + the day it lands on, for the fit offer
    try {
      if (type === 'one-time') {
        const dates = oneTimeDates.length ? oneTimeDates : [new Date()];
        const list = dates.map((d) => ({ ...base, type: 'one-time', days: [d.getDay()], date: fmtDateKey(d) }));
        if (editingReminder) {
          const saved = await updateReminder(editingReminder.id, list[0]);
          if (saved) offer = { anchorId: `reminder:${saved.id}`, date: list[0].date };
        } else {
          for (const d of list) {
            const saved = await addReminder(d);
            if (!offer && saved) offer = { anchorId: `reminder:${saved.id}`, date: d.date };
          }
        }
      } else {
        const payload = { ...base, type: 'recurring', days };
        const saved = editingReminder ? await updateReminder(editingReminder.id, payload) : await addReminder(payload);
        if (saved) offer = { anchorId: `reminder:${saved.id}`, date: nextDateFor(days, timeStr) };
      }
    } catch (e) {
      console.warn('[ScheduleReminder] save failed:', e?.message);
    }
    close();
    // Landed on something that day? Offer to make room, right now.
    if (offer) offerFit(offer).catch(() => {});
  };

  // ── header per step ────────────────────────────────────────────────────────
  const STEP_ORDER = ['pick', 'details', 'repeat', 'time'];
  const headerFor = () => {
    switch (step) {
      case 'pick': return { title: 'Choose reminder', left: 'Cancel', onLeft: close, right: null };
      case 'details': return {
        title: brandNew ? 'New reminder' : 'Edit details',
        left: 'Back',
        onLeft: () => setStep(brandNew ? 'pick' : 'repeat'),
        right: 'Next', onRight: commitDetails, rightOn: !!item.title.trim(),
      };
      case 'repeat': return {
        title: 'When',
        left: editingReminder ? 'Cancel' : 'Back',
        onLeft: editingReminder ? close : () => setStep(brandNew ? 'details' : 'pick'),
        right: 'Next', onRight: () => { hapticFeedback.light(); setStep('time'); }, rightOn: repeatValid,
      };
      case 'time': return {
        title: 'Set the time',
        left: 'Back', onLeft: () => setStep('repeat'),
        right: editingReminder ? 'Save' : 'Done', onRight: save, rightOn: true,
      };
      default: return { title: '', left: 'Cancel', onLeft: close };
    }
  };
  const H = headerFor();

  // Hide a built-in when the user saved a same-titled customized copy of it.
  const userTitleSet = new Set(userItems.map((u) => (u.title || '').trim().toLowerCase()));
  const pickEntries = [
    ...BUILTIN_REMINDER_PRESETS.filter(
      (b) => !userTitleSet.has((b.title || '').trim().toLowerCase()) && !hiddenBuiltins.includes(b.id)
    ),
    ...userItems,
  ];

  const renderProgress = () => {
    const visibleSteps = brandNew ? ['details', 'repeat', 'time'] : ['repeat', 'time'];
    if (step === 'pick') return null;
    // When a non-brandNew reminder dips into 'details' (Edit details from repeat),
    // keep the 'repeat' dot lit rather than showing no active step.
    const effectiveStep = (!brandNew && step === 'details') ? 'repeat' : step;
    const activeIdx = visibleSteps.indexOf(effectiveStep);
    return (
      <View style={styles.progress}>
        {visibleSteps.map((s, i) => (
          <View
            key={s}
            style={[styles.progressDot, {
              width: i === activeIdx ? 22 : 7,
              backgroundColor: i <= activeIdx ? (item.color || theme.primary) : theme.border,
            }]}
          />
        ))}
      </View>
    );
  };

  const ItemChip = ({ onEdit }) => (
    <View style={[styles.itemChip, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={[styles.itemChipIcon, { backgroundColor: (item.color || '#3B82F6') + '20' }]}>
        <MaterialIcons name={item.icon || 'notifications'} size={20} color={item.color || '#3B82F6'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemChipTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <Text style={[styles.itemChipMeta, { color: theme.textSecondary }]}>{formatDuration(item.duration)}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.itemChipEdit}>
          <MaterialIcons name="tune" size={18} color={theme.primary} />
          <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600' }}>Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      <>
        <SheetHeader
          title={H.title}
          leftLabel={H.left}
          onLeft={H.onLeft}
          rightLabel={H.right || undefined}
          onRight={H.onRight}
          rightDisabled={H.right ? !H.rightOn : false}
        />

          {renderProgress()}

          {/* ── PICK ─────────────────────────────────────────── */}
          {step === 'pick' && (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Tap Pick on a reminder to put it on your day, or build a new one.
              </Text>
              {pickEntries.map((entry) => {
                const c = entry.color || '#3B82F6';
                return (
                  <TouchableOpacity
                    key={entry.id}
                    activeOpacity={0.7}
                    onPress={() => pickEntry(entry)}
                    style={[styles.tile, { backgroundColor: tileColor }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.title}, ${formatDuration(entry.duration ?? DEFAULT_DURATION)}`}
                  >
                    <View style={[styles.tileIcon, { backgroundColor: c + '22' }]}>
                      <MaterialIcons name={entry.icon || 'notifications'} size={22} color={c} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tileTitle, { color: theme.text }]}>{entry.title}</Text>
                      <Text style={[styles.tileMeta, { color: theme.textSecondary }]}>{formatDuration(entry.duration ?? DEFAULT_DURATION)}</Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: theme.primary }]}>
                      <Text style={styles.pillText}>Pick</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={startNew} style={[styles.newTile, { borderColor: theme.primary, backgroundColor: tileColor }]} activeOpacity={0.7} accessibilityRole="button">
                <MaterialIcons name="add" size={20} color={theme.primary} />
                <Text style={[styles.newTileText, { color: theme.primary }]}>Build a new reminder</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* ── DETAILS ──────────────────────────────────────── */}
          {step === 'details' && (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <ReminderDetailsEditor value={item} onChange={setItem} autoFocus={brandNew} />
              {brandNew && (
                <View style={[styles.saveRow, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.saveRowTitle, { color: theme.text }]}>Save to library</Text>
                    <Text style={[styles.saveRowSub, { color: theme.textTertiary }]}>Reuse this reminder later</Text>
                  </View>
                  <Switch value={saveToLib} onValueChange={(v) => { hapticFeedback.selection(); setSaveToLib(v); }} />
                </View>
              )}
              <View style={{ height: 60 }} />
            </ScrollView>
          )}

          {/* ── REPEAT ───────────────────────────────────────── */}
          {step === 'repeat' && (
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              <ItemChip onEdit={() => setStep('details')} />

              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 22 }]}>Repeat</Text>
              <View style={styles.typeRow}>
                {['recurring', 'one-time'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => { hapticFeedback.light(); setType(t); }}
                    style={[styles.typeBtn, { backgroundColor: type === t ? (item.color || theme.primary) : tileColor }]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: type === t }}
                  >
                    <MaterialIcons name={t === 'recurring' ? 'repeat' : 'event'} size={18} color={type === t ? '#fff' : theme.textSecondary} />
                    <Text style={[styles.typeBtnText, { color: type === t ? '#fff' : theme.text }]}>
                      {t === 'recurring' ? 'Weekly' : 'One-time'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {type === 'recurring' ? (
                <>
                  <View style={styles.quickRow}>
                    {[
                      { key: 'everyday', label: 'Every day' },
                      { key: 'weekdays', label: 'Weekdays' },
                      { key: 'weekends', label: 'Weekends' },
                    ].map((p) => {
                      const active =
                        (p.key === 'everyday' && days.length === 7) ||
                        (p.key === 'weekdays' && days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) ||
                        (p.key === 'weekends' && days.length === 2 && [0, 6].every((d) => days.includes(d)));
                      return (
                        <TouchableOpacity
                          key={p.key}
                          onPress={() => quickDays(p.key)}
                          style={[styles.quickChip, { backgroundColor: tileColor, borderColor: active ? (item.color || theme.primary) : 'transparent' }]}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.quickChipText, { color: active ? (item.color || theme.primary) : theme.text }]}>{p.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.daysRow}>
                    {DAY_SHORT.map((name, idx) => {
                      const sel = days.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleDay(idx)}
                          style={[styles.dayTile, { backgroundColor: sel ? (item.color || theme.primary) : tileColor }]}
                          activeOpacity={0.7}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: sel }}
                          accessibilityLabel={name}
                        >
                          <Text style={[styles.dayText, { color: sel ? '#fff' : theme.textSecondary }]}>{name.charAt(0)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: theme.textSecondary, marginTop: 22 }]}>
                    {editingReminder
                      ? 'Date'
                      : oneTimeDates.length > 0
                        ? `Pick dates · ${oneTimeDates.length} selected`
                        : 'Pick one or more dates'}
                  </Text>
                  {renderCalendar()}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* ── TIME ─────────────────────────────────────────── */}
          {/* Plain View (not a ScrollView) so the timeline's own vertical scroll
              and long-press drag never fight an outer same-axis scroll. */}
          {step === 'time' && (
            <View style={styles.bodyTime}>
              <Text style={[styles.bigValue, { color: theme.text }]}>{fmtClock(time.hour, time.minute)}</Text>
              <Text style={[styles.timeSubtitle, { color: theme.textSecondary }]}>
                {`until ${fmtClock(Math.floor(((time.hour * 60 + time.minute + (item.duration || 0)) % 1440) / 60), (time.hour * 60 + time.minute + (item.duration || 0)) % 60)}  ·  ${timelineSubtitle}  ·  ${formatDuration(item.duration ?? DEFAULT_DURATION)}`}
              </Text>
              <StartTimePicker
                date={timelineDate}
                selected={time}
                durationMinutes={item.duration}
                label={item.title}
                accentColor={item.color || theme.primary}
                onPick={(hour, minute) => setTime({ hour, minute })}
                excludeReminderId={editingReminder?.id ?? null}
                excludeEvent={editingReminder ? { title: editingReminder.title, startMin: editingStartMin } : null}
              />
            </View>
          )}
      </>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 64 },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  progress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 12 },
  progressDot: { height: 7, borderRadius: 3.5 },
  body: { padding: 20 },
  bodyTime: { paddingHorizontal: 20, paddingTop: 14, flex: 1 },
  hint: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22 },
  tileMeta: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  pill: { height: 36, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  newTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 4,
  },
  newTileText: { fontSize: 16, fontWeight: '800' },
  bigValue: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  itemChipIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemChipTitle: { fontSize: 16, fontWeight: '700' },
  itemChipMeta: { fontSize: 13, marginTop: 1 },
  itemChipEdit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 18,
    marginTop: 26,
  },
  saveRowTitle: { fontSize: 15, fontWeight: '600' },
  saveRowSub: { fontSize: 12, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 14,
  },
  typeBtnText: { fontSize: 16, fontWeight: '800' },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 12 },
  quickChip: { height: 36, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  quickChipText: { fontSize: 14, fontWeight: '700' },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayTile: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 16, fontWeight: '800' },
  dateChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 8,
  },
  dateChipText: { flex: 1, fontSize: 15, fontWeight: '500' },
  addDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 2,
  },
  addDateText: { fontSize: 15, fontWeight: '600' },
  datePickerCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
  datePickerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, gap: 12 },
  datePickerAdd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timeSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 16 },
  // Multi-select calendar
  calCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  calNavBtn: { padding: 4 },
  calMonthLabel: { fontSize: 16, fontWeight: '700' },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  calDayText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
});

export default ScheduleReminderModal;
