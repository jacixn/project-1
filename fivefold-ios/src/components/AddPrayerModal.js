import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import DayTimeline from './DayTimeline';
import MultiDateCalendar from './MultiDateCalendar';
import DurationField from './DurationField';
import SheetHeader from './SheetHeader';
import { DEFAULT_PRAYER_DURATION, formatDuration } from '../utils/duration';
import { ALL_DAYS, DAY_SHORT } from '../utils/prayerDays';
import { addPrayer } from '../services/simplePrayersService';

// Reminder lead-time options. 0 = At start (fires when the prayer opens), else
// minutes before. At start is the default.
const NOTIFY_OPTIONS = [0, 15, 30, 60];
const notifyLabel = (m) => (m === 0 ? 'At start' : m === 60 ? '1 hour' : `${m} min`);

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt12 = (h, m) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${ap}`;
};

// New Prayer, native pull-to-dismiss modal SCREEN (presentation:'modal' on the
// root native-stack, parent scales back, a la Gibbon/reminders). Step 1 sets
// the details (name, type, duration, reminder); step 2 places it in the week:
// weekday chips for recurring prayers, tap-to-pick calendar for one-time, and
// a drag timeline for the exact time. Persists straight through
// simplePrayersService; SimplePrayerCard refreshes via its change event.
const AddPrayerModal = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [step, setStep] = useState('details'); // details | when
  const [prayerName, setPrayerName] = useState('');
  const [prayerType, setPrayerType] = useState('persistent');
  const [duration, setDuration] = useState(DEFAULT_PRAYER_DURATION);
  const [notifyBefore, setNotifyBefore] = useState(0);
  const [time, setTime] = useState({ hour: 9, minute: 0 });
  const [days, setDays] = useState(ALL_DAYS);
  const [oneTimeDate, setOneTimeDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const accent = theme.primary;
  const surfaceColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const close = () => {
    hapticFeedback.light();
    navigation.goBack();
  };

  const to24 = () => `${pad(time.hour)}:${pad(time.minute)}`;

  const toggleDay = (idx) => {
    hapticFeedback.light();
    setDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]));
  };

  const quickDays = (key) => {
    hapticFeedback.light();
    if (key === 'everyday') setDays(ALL_DAYS);
    else if (key === 'weekdays') setDays([1, 2, 3, 4, 5]);
    else if (key === 'weekends') setDays([0, 6]);
  };

  const goNext = () => {
    if (!prayerName.trim()) { hapticFeedback.error(); return; }
    hapticFeedback.light();
    setStep('when');
  };

  const isOneTime = prayerType === 'one-time';
  const daysValid = isOneTime || days.length > 0;

  const handleSave = async () => {
    if (!prayerName.trim() || !daysValid || saving) { hapticFeedback.error(); return; }
    setSaving(true);
    try {
      await addPrayer({
        name: prayerName.trim(),
        time: to24(),
        type: prayerType,
        duration,
        notifyBefore,
        date: isOneTime ? dateKey(oneTimeDate) : null,
        days: isOneTime ? undefined : days,
      });
      hapticFeedback.success();
      navigation.goBack();
    } catch (e) {
      console.error('Failed to create prayer:', e);
      setSaving(false);
    }
  };

  const daysSummary = days.length === 7
    ? 'Daily'
    : days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))
      ? 'Weekdays'
      : days.length === 2 && days.includes(0) && days.includes(6)
        ? 'Weekends'
        : days.slice().sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(' · ');

  const renderDetails = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSection}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>New Prayer</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Add to your routine</Text>
      </View>

      {/* Name */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>NAME</Text>
        <View style={[styles.inputBox, { backgroundColor: surfaceColor, borderColor: inputFocused ? accent : borderColor, borderWidth: 1.5 }]}>
          <TextInput
            style={[styles.textInput, { color: theme.text }]}
            placeholder="Morning Prayer"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
            value={prayerName}
            onChangeText={setPrayerName}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={goNext}
          />
        </View>
      </View>

      {/* Type */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TYPE</Text>
        <View style={[styles.segmentWrap, { backgroundColor: surfaceColor, borderColor }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, prayerType === 'persistent' && { backgroundColor: accent }]}
            onPress={() => { setPrayerType('persistent'); hapticFeedback.light(); }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="all-inclusive" size={16} color={prayerType === 'persistent' ? '#fff' : theme.textSecondary} />
            <Text style={[styles.segmentText, { color: prayerType === 'persistent' ? '#fff' : theme.textSecondary }]}>Recurring</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, prayerType === 'one-time' && { backgroundColor: accent }]}
            onPress={() => { setPrayerType('one-time'); hapticFeedback.light(); }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="check-circle-outline" size={16} color={prayerType === 'one-time' ? '#fff' : theme.textSecondary} />
            <Text style={[styles.segmentText, { color: prayerType === 'one-time' ? '#fff' : theme.textSecondary }]}>One-Time</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.typeHint, { color: theme.textTertiary || theme.textSecondary }]}>
          {prayerType === 'persistent' ? 'Repeats on the days you pick next.' : 'A single prayer on the date you choose.'}
        </Text>
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HOW LONG</Text>
        <DurationField value={duration} onChange={setDuration} accent={accent} />
      </View>

      {/* Reminder */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>REMINDER</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={styles.notifyRow}
          keyboardShouldPersistTaps="handled"
        >
          {NOTIFY_OPTIONS.map((m) => {
            const on = notifyBefore === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.notifyBtn, { backgroundColor: on ? accent : surfaceColor, borderColor: on ? accent : borderColor }]}
                onPress={() => { hapticFeedback.light(); setNotifyBefore(m); }}
                activeOpacity={0.85}
              >
                <Text style={[styles.notifyText, { color: on ? '#fff' : theme.text }]}>{notifyLabel(m)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <Text style={[styles.typeHint, { color: theme.textTertiary || theme.textSecondary }]}>
          {notifyBefore === 0
            ? 'Notified when the prayer opens.'
            : `Notified ${notifyBefore === 60 ? '1 hour' : `${notifyBefore} minutes`} before it opens.`}
        </Text>
      </View>

      {renderFooter()}
    </ScrollView>
  );

  // Outer ScrollView so calendar + timeline + summary + footer always fit;
  // DayTimeline's drag activates on long-press (160ms) so it doesn't fight
  // the outer scroll (same structure the previous prayer wizard shipped with)
  const renderWhen = () => (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSection}>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {prayerName.trim() || 'New Prayer'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {isOneTime ? 'Pick a day, then drag to set the time' : 'Pick the days, then drag to set the time'}
        </Text>
      </View>

      {isOneTime ? (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DATE</Text>
          <MultiDateCalendar
            selectedDates={[oneTimeDate]}
            singleSelect
            accent={accent}
            onToggle={(d) => { const nd = new Date(d); nd.setHours(0, 0, 0, 0); setOneTimeDate(nd); }}
          />
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>REPEAT ON</Text>
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
                  style={[styles.quickChip, { backgroundColor: active ? accent + '20' : surfaceColor, borderColor: active ? accent : borderColor }]}
                >
                  <Text style={[styles.quickChipText, { color: active ? accent : theme.textSecondary }]}>{p.label}</Text>
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
                  style={[styles.dayCircle, { backgroundColor: sel ? accent : surfaceColor, borderColor: sel ? accent : borderColor }]}
                >
                  <Text style={[styles.dayText, { color: sel ? '#fff' : theme.textSecondary }]}>{name.charAt(0)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!daysValid && (
            <Text style={[styles.typeHint, { color: theme.warning || '#FF9500' }]}>Pick at least one day.</Text>
          )}
        </View>
      )}

      <View style={styles.section}>
        <DayTimeline
          date={isOneTime ? oneTimeDate : new Date()}
          selected={time}
          durationMinutes={duration}
          label={prayerName.trim() || 'Prayer'}
          accentColor={accent}
          onPick={(hour, minute) => setTime({ hour, minute })}
        />
      </View>

      {/* Summary strip */}
      <View style={[styles.summaryCard, { backgroundColor: surfaceColor, borderColor }]}>
        <MaterialIcons name="favorite" size={16} color={accent} />
        <Text style={[styles.summaryText, { color: theme.text }]} numberOfLines={1}>
          {fmt12(time.hour, time.minute)} · {formatDuration(duration)}
          {isOneTime ? ` · ${oneTimeDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ` · ${daysSummary}`}
        </Text>
      </View>

      {renderFooter()}
    </ScrollView>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      {step === 'details' ? (
        <>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: surfaceColor, borderColor }]} onPress={close} activeOpacity={0.7}>
            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent, opacity: prayerName.trim() ? 1 : 0.4 }]}
            onPress={goNext}
            disabled={!prayerName.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: surfaceColor, borderColor }]} onPress={() => { hapticFeedback.light(); setStep('details'); }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={18} color={theme.textSecondary} />
            <Text style={[styles.cancelBtnText, { color: theme.textSecondary, marginLeft: 4 }]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent, opacity: daysValid && !saving ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={!daysValid || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>Create Prayer</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SheetHeader title="New Prayer" leftLabel="Cancel" onLeft={close} />

      {/* Step progress */}
      <View style={styles.progress}>
        {['details', 'when'].map((s, i) => {
          const activeIdx = step === 'details' ? 0 : 1;
          const on = i <= activeIdx;
          return <View key={s} style={[styles.progressDot, { width: on ? 26 : 8, backgroundColor: on ? accent : borderColor }]} />;
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {step === 'details' ? renderDetails() : renderWhen()}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8 },
  progressDot: { height: 7, borderRadius: 3.5 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  headerSection: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 18 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  headerSubtitle: { fontSize: 15, fontWeight: '500' },

  section: { paddingHorizontal: 24, marginBottom: 22 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 10 },

  inputBox: { borderRadius: 14 },
  textInput: { fontSize: 17, fontWeight: '500', paddingVertical: 16, paddingHorizontal: 16 },

  segmentWrap: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 9, gap: 6 },
  segmentText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  typeHint: { marginTop: 10, marginLeft: 2, fontSize: 13, fontWeight: '500' },

  notifyRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  notifyBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  notifyText: { fontSize: 14, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontWeight: '600' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayText: { fontSize: 15, fontWeight: '700' },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 2,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryText: { fontSize: 14, fontWeight: '700', flex: 1 },

  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  cancelBtn: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});

export default AddPrayerModal;
