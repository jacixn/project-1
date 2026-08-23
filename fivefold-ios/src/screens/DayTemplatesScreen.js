// Day templates: make and edit the shapes a day can take ("Work Remote":
// Breakfast, Work 9 to 5:30, Lunch, Dinner). One native modal screen, two
// views: the list, and one template's editor. Big targets, one thing at a
// time, plain words. Saved through services/dayTemplates so My Week, the
// Biblely calendar (and so EyeCandy) follow at once.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import SheetHeader from '../components/SheetHeader';
import { getTemplates, upsertTemplate, deleteTemplate } from '../services/dayTemplates';
import { BLOCK_PRESETS, hmToMin, minToHm, fmtClock, newId, iconForTitle, templateSummary, freeMinutes, normalizeTemplate } from '../utils/dayTemplates';
import { KINDS, fmtDur } from '../utils/dayItems';
import { loadReminderPresets, loadReminders } from '../services/reminderService';
import { sameThing } from '../utils/takeover';

const ACCENT = KINDS.block.color;

const DayTemplatesScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tile = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // a working copy of one template
  const [openBlock, setOpenBlock] = useState(null); // block id whose time pickers are open
  const [which, setWhich] = useState('start'); // which wheel is showing
  const [dirty, setDirty] = useState(false);

  // The user's own reminder bookmarks (Eat breakfast, Eat dinner...) as
  // blocks: their icon and length, and the time they are usually set for.
  const [mine, setMine] = useState([]);
  const load = useCallback(async () => {
    try { setList(await getTemplates()); } catch {}
    try {
      const [presets, reminders] = await Promise.all([loadReminderPresets().catch(() => []), loadReminders().catch(() => [])]);
      const usual = (title) => {
        const r = (reminders || []).find((x) => x && x.enabled !== false && x.time && sameThing(x.title, title));
        if (r) return { start: String(r.time).slice(0, 5), dur: Number(r.duration) > 0 ? Number(r.duration) : null };
        const guess = BLOCK_PRESETS.find((p) => sameThing(p.title, title));
        return { start: guess ? guess.start : '12:00', dur: null };
      };
      setMine((presets || []).map((p) => {
        const { start, dur } = usual(p.title);
        const len = Number(p.duration) > 0 ? Number(p.duration) : (dur || 30);
        const sm = hmToMin(start) ?? 12 * 60;
        return { title: p.title, start: minToHm(sm), end: minToHm(Math.min(24 * 60, sm + len)), fixed: false, icon: p.icon || iconForTitle(p.title) };
      }));
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);
  // Opened from a template row's Edit: go straight into that template, once.
  const openedRef = React.useRef(null);
  useEffect(() => {
    const id = route?.params?.editId;
    if (!id || openedRef.current === id) return;
    const t = list.find((x) => x.id === id);
    if (t) { openedRef.current = id; startEdit(t); }
  }, [list, route?.params?.editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (t) => { hapticFeedback.light(); setEditing(JSON.parse(JSON.stringify(t))); setOpenBlock(null); setDirty(false); };
  const startNew = () => { hapticFeedback.light(); setEditing({ id: newId('t'), name: '', blocks: [] }); setOpenBlock(null); setDirty(true); };

  const patch = (fn) => { setEditing((e) => { const next = fn(JSON.parse(JSON.stringify(e))); return next; }); setDirty(true); };
  const setBlock = (id, changes) => patch((e) => { e.blocks = e.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b)); return e; });
  const removeBlock = (id) => { hapticFeedback.medium(); patch((e) => { e.blocks = e.blocks.filter((b) => b.id !== id); return e; }); if (openBlock === id) setOpenBlock(null); };
  const addBlock = (preset) => {
    hapticFeedback.selection();
    const id = newId('b');
    // Nudge a second meal or commute after the last one so it never lands on top
    patch((e) => {
      let start = hmToMin(preset.start); let end = hmToMin(preset.end);
      const clash = e.blocks.some((b) => hmToMin(b.start) < end && hmToMin(b.end) > start);
      if (clash) {
        const lastEnd = Math.max(0, ...e.blocks.map((b) => hmToMin(b.end)));
        const len = end - start; start = Math.min(23 * 60, lastEnd + 30); end = Math.min(24 * 60, start + len);
      }
      e.blocks.push({ id, title: preset.title, start: minToHm(start), end: minToHm(end), fixed: !!preset.fixed });
      e.blocks.sort((a, b) => hmToMin(a.start) - hmToMin(b.start));
      return e;
    });
    setOpenBlock(id); setWhich('start');
  };
  const addCustom = () => addBlock({ title: 'Something', start: '12:00', end: '13:00', fixed: false });

  const problems = useMemo(() => {
    if (!editing) return [];
    const out = [];
    if (!String(editing.name || '').trim()) out.push('Give it a name.');
    for (const b of editing.blocks || []) if (hmToMin(b.end) <= hmToMin(b.start)) out.push(`${b.title}: the end must be after the start.`);
    return out;
  }, [editing]);

  const save = async () => {
    if (!editing) return;
    if (problems.length) { hapticFeedback.warning?.(); Alert.alert('Almost', problems[0]); return; }
    try {
      await upsertTemplate(normalizeTemplate(editing));
      hapticFeedback.success?.();
      await load();
      setEditing(null);
    } catch (e) { Alert.alert('Could not save', e?.message || 'Please try again.'); }
  };
  const confirmDelete = (t) => {
    hapticFeedback.medium();
    Alert.alert(`Delete ${t.name}?`, 'Days using it go back to having no template. Your prayers, reminders and workouts are untouched.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteTemplate(t.id); await load(); setEditing(null); } catch {} } },
    ]);
  };
  const leaveEditor = () => {
    if (!dirty) { setEditing(null); return; }
    Alert.alert('Keep your changes?', '', [
      { text: 'Throw away', style: 'destructive', onPress: () => setEditing(null) },
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Save', onPress: save },
    ]);
  };

  const wheelValue = (hm) => { const m = hmToMin(hm) ?? 9 * 60; return new Date(2000, 0, 1, Math.floor(m / 60), m % 60, 0); };

  if (!editing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SheetHeader title="Day templates" leftLabel="Done" onLeft={() => navigation.goBack()} rightLabel="New" onRight={startNew} rightColor={ACCENT} />
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.lead, { color: theme.textSecondary }]}>A template is the shape of a day: when you work, when you eat. Put one on any day from My Week and the free time takes care of itself.</Text>
          {list.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => startEdit(t)} style={[styles.row, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${t.name}, ${templateSummary(t)}`}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>{t.name}</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{templateSummary(t)}</Text>
                <Text style={[styles.rowFree, { color: ACCENT }]}>{`${fmtDur(freeMinutes((t.blocks || []).map((b) => ({ startMin: hmToMin(b.start), endMin: hmToMin(b.end) }))))} free between 7 AM and 11 PM`}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={startNew} style={[styles.primary, { backgroundColor: ACCENT }]} activeOpacity={0.8} accessibilityRole="button">
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.primaryText}>New template</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  const blocks = editing.blocks || [];
  const free = freeMinutes(blocks.map((b) => ({ startMin: hmToMin(b.start), endMin: hmToMin(b.end) })));
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SheetHeader title={editing.name ? editing.name : 'New template'} leftLabel="Back" onLeft={leaveEditor} rightLabel="Save" onRight={save} rightColor={ACCENT} rightDisabled={!dirty && list.some((t) => t.id === editing.id)} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.kicker, { color: theme.textSecondary }]}>Name</Text>
        <TextInput
          value={editing.name}
          onChangeText={(v) => patch((e) => { e.name = v; return e; })}
          placeholder="Work Remote, Office day, Sunday..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: tile }]}
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel="Template name"
        />

        <Text style={[styles.kicker, { color: theme.textSecondary, marginTop: 22 }]}>{blocks.length ? `What the day holds  ·  ${fmtDur(free)} free` : 'What the day holds'}</Text>
        {blocks.length === 0 ? <Text style={[styles.empty, { color: theme.textSecondary }]}>Nothing yet. Add work, meals, or anything that happens on this kind of day.</Text> : null}
        {blocks.map((b) => {
          const open = openBlock === b.id;
          const bad = hmToMin(b.end) <= hmToMin(b.start);
          return (
            <View key={b.id} style={[styles.block, { backgroundColor: tile, borderColor: open ? ACCENT : 'transparent' }]}>
              <TouchableOpacity onPress={() => { hapticFeedback.light(); setOpenBlock(open ? null : b.id); setWhich('start'); }} style={styles.blockHead} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${b.title}, ${fmtClock(hmToMin(b.start))} to ${fmtClock(hmToMin(b.end))}${b.fixed ? ', fixed' : ''}`}>
                <MaterialIcons name={iconForTitle(b.title)} size={22} color={ACCENT} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.blockTitle, { color: theme.text }]}>{b.title}</Text>
                  <Text style={[styles.blockTime, { color: bad ? '#FF453A' : theme.textSecondary }]}>{`${fmtClock(hmToMin(b.start))} to ${fmtClock(hmToMin(b.end))}${b.fixed ? '  ·  fixed' : ''}`}</Text>
                </View>
                <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={theme.textSecondary} />
              </TouchableOpacity>
              {open ? (
                <View style={styles.blockBody}>
                  <TextInput
                    value={b.title}
                    onChangeText={(v) => setBlock(b.id, { title: v })}
                    placeholder="What is it?"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' }]}
                    returnKeyType="done"
                    accessibilityLabel="Block name"
                  />
                  <View style={styles.whichRow}>
                    {[{ k: 'start', label: `Starts ${fmtClock(hmToMin(b.start))}` }, { k: 'end', label: `Ends ${fmtClock(hmToMin(b.end))}` }].map((o) => {
                      const on = which === o.k;
                      return (
                        <TouchableOpacity key={o.k} onPress={() => { hapticFeedback.selection(); setWhich(o.k); }} style={[styles.whichTab, { backgroundColor: on ? ACCENT : 'transparent', borderColor: on ? ACCENT : hairline }]} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: on }}>
                          <Text style={[styles.whichText, { color: on ? '#fff' : theme.text }]}>{o.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={wheelValue(which === 'start' ? b.start : b.end)}
                      mode="time"
                      display="spinner"
                      minuteInterval={5}
                      textColor={theme.text}
                      style={{ alignSelf: 'stretch', height: 160 }}
                      onChange={(_, d) => {
                        if (!d) return;
                        const m = d.getHours() * 60 + d.getMinutes();
                        if (which === 'start') {
                          const len = Math.max(5, hmToMin(b.end) - hmToMin(b.start));
                          setBlock(b.id, { start: minToHm(m), end: minToHm(Math.min(24 * 60, m + len)) }); // keep the length, move the whole block
                        } else setBlock(b.id, { end: minToHm(m) });
                      }}
                    />
                  ) : null}
                  <TouchableOpacity onPress={() => { hapticFeedback.selection(); setBlock(b.id, { fixed: !b.fixed }); }} style={[styles.fixedRow, { borderColor: hairline }]} activeOpacity={0.7} accessibilityRole="switch" accessibilityState={{ checked: !!b.fixed }}>
                    <MaterialIcons name="push-pin" size={18} color={b.fixed ? ACCENT : theme.textSecondary} />
                    <Text style={[styles.fixedText, { color: theme.text }]}>{b.fixed ? 'Fixed: plans never move this' : 'Can give way for a day (like lunch)'}</Text>
                    <Text style={[styles.fixedState, { color: b.fixed ? ACCENT : theme.textSecondary }]}>{b.fixed ? 'Fixed' : 'Flexible'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeBlock(b.id)} style={styles.removeBtn} activeOpacity={0.7} accessibilityRole="button">
                    <Text style={styles.removeText}>Remove {b.title}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}

        {mine.length ? (<>
          <Text style={[styles.kicker, { color: theme.textSecondary, marginTop: 18 }]}>From your reminders</Text>
          <View style={styles.presets}>
            {mine.map((p) => (
              <TouchableOpacity key={`mine-${p.title}`} onPress={() => addBlock(p)} style={[styles.preset, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Add ${p.title}, ${fmtClock(hmToMin(p.start))} to ${fmtClock(hmToMin(p.end))}`}>
                <MaterialIcons name={p.icon} size={18} color={ACCENT} />
                <Text style={[styles.presetText, { color: theme.text }]}>{p.title}</Text>
                <Text style={[styles.presetSub, { color: theme.textSecondary }]}>{fmtDur(hmToMin(p.end) - hmToMin(p.start))}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>) : null}
        <Text style={[styles.kicker, { color: theme.textSecondary, marginTop: 18 }]}>{mine.length ? 'More' : 'Add to the day'}</Text>
        <View style={styles.presets}>
          {BLOCK_PRESETS.map((p) => (
            <TouchableOpacity key={p.title} onPress={() => addBlock(p)} style={[styles.preset, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Add ${p.title}`}>
              <MaterialIcons name={p.icon} size={18} color={ACCENT} />
              <Text style={[styles.presetText, { color: theme.text }]}>{p.title}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={addCustom} style={[styles.preset, { backgroundColor: tile }]} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Add something else">
            <MaterialIcons name="add" size={18} color={ACCENT} />
            <Text style={[styles.presetText, { color: theme.text }]}>Something else</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={save} style={[styles.primary, { backgroundColor: ACCENT, opacity: problems.length ? 0.6 : 1 }]} activeOpacity={0.8} accessibilityRole="button">
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.primaryText}>{list.some((t) => t.id === editing.id) ? 'Save changes' : 'Save template'}</Text>
        </TouchableOpacity>
        {list.some((t) => t.id === editing.id) ? (
          <TouchableOpacity onPress={() => confirmDelete(editing)} style={styles.removeBtn} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.removeText}>Delete this template</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  lead: { fontSize: 15, fontWeight: '600', lineHeight: 21, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 10 },
  rowTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  rowSub: { fontSize: 14, fontWeight: '600', marginTop: 3, lineHeight: 19 },
  rowFree: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 54, borderRadius: 16, marginTop: 16 },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  kicker: { fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.2 },
  input: { height: 50, borderRadius: 14, paddingHorizontal: 14, fontSize: 17, fontWeight: '600' },
  empty: { fontSize: 15, fontWeight: '600', lineHeight: 21, paddingVertical: 6 },
  block: { borderRadius: 16, marginBottom: 10, borderWidth: 1.5, overflow: 'hidden' },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  blockTitle: { fontSize: 17, fontWeight: '800' },
  blockTime: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  blockBody: { paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  whichRow: { flexDirection: 'row', gap: 8 },
  whichTab: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  whichText: { fontSize: 15, fontWeight: '800' },
  fixedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  fixedText: { flex: 1, fontSize: 14, fontWeight: '700' },
  fixedState: { fontSize: 13, fontWeight: '800' },
  removeBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  removeText: { color: '#FF453A', fontSize: 15, fontWeight: '700' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12 },
  presetText: { fontSize: 14, fontWeight: '700' },
  presetSub: { fontSize: 12, fontWeight: '600' },
});

export default DayTemplatesScreen;
