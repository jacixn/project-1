import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import {
  BUILTIN_REMINDER_PRESETS,
  loadReminderPresets,
  saveReminderPreset,
  deleteReminderPreset,
  loadHiddenBuiltins,
} from '../services/reminderService';
import { DEFAULT_DURATION, formatDuration } from '../utils/duration';
import ReminderDetailsEditor from './ReminderDetailsEditor';
import SheetHeader from './SheetHeader';

const blankDraft = () => ({ title: '', duration: DEFAULT_DURATION, icon: 'notifications', color: '#3B82F6' });

// The reminder library, presented as a native pull-to-dismiss modal SCREEN. Build
// reusable reminder templates here (breakfast · 20 min), then schedule them from
// the Reminders screen. Persists straight to storage; callers refresh on focus.
const LibrarySheet = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const close = () => navigation.goBack();
  const [userItems, setUserItems] = useState([]);
  const [hiddenBuiltins, setHiddenBuiltins] = useState([]);
  const [mode, setMode] = useState('grid'); // grid | edit
  const [draft, setDraft] = useState(blankDraft());
  const [editingId, setEditingId] = useState(null); // user-entry id being edited, else null
  const [editingEntryId, setEditingEntryId] = useState(null); // id of the opened tile (built-in OR user), for delete

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const refresh = useCallback(async () => {
    try {
      const [items, hidden] = await Promise.all([loadReminderPresets(), loadHiddenBuiltins()]);
      setUserItems(items);
      setHiddenBuiltins(hidden);
    } catch { setUserItems([]); }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openNew = () => {
    hapticFeedback.light();
    setDraft(blankDraft());
    setEditingId(null);
    setEditingEntryId(null);
    setMode('edit');
  };

  const openEntry = (entry) => {
    // Tapping a built-in starts a fresh user copy; tapping a user entry edits it.
    hapticFeedback.light();
    setDraft({
      title: entry.title || '',
      duration: entry.duration ?? DEFAULT_DURATION,
      icon: entry.icon || 'notifications',
      color: entry.color || '#3B82F6',
    });
    setEditingId(entry.builtin ? null : entry.id);
    setEditingEntryId(entry.id);
    setMode('edit');
  };

  const save = async () => {
    if (!draft.title.trim()) return;
    hapticFeedback.success();
    await saveReminderPreset({ id: editingId || undefined, ...draft, title: draft.title.trim() });
    await refresh();
    setMode('grid');
  };

  const confirmDelete = (entry) => {
    hapticFeedback.medium();
    Alert.alert('Delete reminder', `Remove "${entry.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteReminderPreset(entry.id);
          await refresh();
        },
      },
    ]);
  };

  const deleteFromEditor = async () => {
    if (!editingEntryId) return;
    hapticFeedback.medium();
    Alert.alert('Delete reminder', `Remove "${draft.title}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteReminderPreset(editingEntryId);
          await refresh();
          setMode('grid');
        },
      },
    ]);
  };

  // A user entry with the same title as a built-in is a customized copy of it —
  // show only the user version so editing a built-in replaces its tile rather
  // than leaving two identically-named tiles.
  const userTitles = new Set(userItems.map((u) => (u.title || '').trim().toLowerCase()));
  const entries = [
    ...BUILTIN_REMINDER_PRESETS.filter(
      (b) => !userTitles.has((b.title || '').trim().toLowerCase()) && !hiddenBuiltins.includes(b.id)
    ),
    ...userItems,
  ];

  const renderTile = (entry) => {
    const c = entry.color || '#3B82F6';
    return (
      <TouchableOpacity
        key={entry.id}
        activeOpacity={0.8}
        onPress={() => openEntry(entry)}
        onLongPress={() => confirmDelete(entry)}
        delayLongPress={400}
        style={[styles.tile, { backgroundColor: cardBg, borderColor: cardBorder }]}
      >
        <View style={[styles.tileIcon, { backgroundColor: c + '20' }]}>
          <MaterialIcons name={entry.icon || 'notifications'} size={22} color={c} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={1}>{entry.title}</Text>
          <Text style={[styles.tileMeta, { color: theme.textSecondary }]} numberOfLines={1}>
            {formatDuration(entry.duration ?? DEFAULT_DURATION)}{entry.builtin ? ' · Built-in' : ''}
          </Text>
        </View>
        {!entry.builtin && <MaterialIcons name="edit" size={18} color={theme.textTertiary} />}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {mode === 'grid' ? (
        <>
          <SheetHeader
            title="Reminder Library"
            leftLabel="Done"
            onLeft={close}
            rightLabel="New"
            onRight={openNew}
          />
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.intro, { color: theme.textSecondary }]}>
              Build reminders here, then drag them onto a day to set the time.
            </Text>
            {entries.map(renderTile)}

            <TouchableOpacity
              onPress={openNew}
              style={[styles.newTile, { borderColor: theme.primary + '66' }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color={theme.primary} />
              <Text style={[styles.newTileText, { color: theme.primary }]}>New reminder</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      ) : (
        <>
          <SheetHeader
            title={editingEntryId ? 'Edit reminder' : 'New reminder'}
            leftLabel="Back"
            onLeft={() => setMode('grid')}
            rightLabel="Save"
            onRight={save}
            rightDisabled={!draft.title.trim()}
          />
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <ReminderDetailsEditor value={draft} onChange={setDraft} autoFocus={!editingId} />
            {editingEntryId ? (
              <TouchableOpacity onPress={deleteFromEditor} style={styles.deleteBtn}>
                <MaterialIcons name="delete-outline" size={18} color={theme.error || '#EF4444'} />
                <Text style={[styles.deleteText, { color: theme.error || '#EF4444' }]}>Delete from library</Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ height: 60 }} />
          </ScrollView>
        </>
      )}
    </KeyboardAvoidingView>
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
  headerBtn: { minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  body: { padding: 20 },
  intro: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontSize: 16, fontWeight: '600' },
  tileMeta: { fontSize: 13, marginTop: 2 },
  newTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  newTileText: { fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 24,
  },
  deleteText: { fontSize: 15, fontWeight: '600' },
});

export default LibrarySheet;
