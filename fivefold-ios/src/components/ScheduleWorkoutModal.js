import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import WorkoutService from '../services/workoutService';
import { hapticFeedback } from '../utils/haptics';
import * as Notifications from 'expo-notifications';
import notificationService from '../services/notificationService';
import { getStoredData } from '../utils/localStorage';
import StartTimePicker from './StartTimePicker';
import MultiDateCalendar from './MultiDateCalendar';
import DurationField from './DurationField';
import { formatDuration } from '../utils/duration';

const DAYS_OF_WEEK = [
  { id: 0, short: 'S', name: 'Sunday' },
  { id: 1, short: 'M', name: 'Monday' },
  { id: 2, short: 'T', name: 'Tuesday' },
  { id: 3, short: 'W', name: 'Wednesday' },
  { id: 4, short: 'T', name: 'Thursday' },
  { id: 5, short: 'F', name: 'Friday' },
  { id: 6, short: 'S', name: 'Saturday' },
];
const DAY_NAMES = DAYS_OF_WEEK.map((d) => d.name);
const DAY_SHORT = DAYS_OF_WEEK.map((d) => d.short);
const DEFAULT_WORKOUT_DURATION = 60;

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtHM = (h, m) => {
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)} ${ap}`;
};
const nextDateForWeekday = (dayIdx) => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((dayIdx - d.getDay() + 7) % 7));
  return d;
};

// Presented as a native pull-to-dismiss modal SCREEN (presentation:'modal') -
// parent scales back, drag down to dismiss (like Bible Timeline). template (new)
// or editingSchedule (edit) arrive via route.params.
const ScheduleWorkoutModal = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const template = route?.params?.template || null;
  const editingSchedule = route?.params?.editingSchedule || null;
  const onClose = () => navigation.goBack();
  const onScheduled = (saved) => { try { DeviceEventEmitter.emit('workoutScheduled', saved); } catch {} };

  // When editing, there may be no template object, fall back to the saved schedule.
  const tmpl = template || (editingSchedule
    ? { id: editingSchedule.templateId, name: editingSchedule.templateName }
    : null);

  const [step, setStep] = useState('setup');           // setup | time
  const [scheduleType, setScheduleType] = useState('recurring'); // 'recurring' or 'one-time'
  const [selectedDays, setSelectedDays] = useState([]);
  const [oneTimeDates, setOneTimeDates] = useState([new Date()]);
  const [duration, setDuration] = useState(DEFAULT_WORKOUT_DURATION);
  const [time, setTime] = useState({ hour: 18, minute: 0 });
  const [notifyBefore, setNotifyBefore] = useState(0); // 0 = At start (default), >0 = mins before

  // Runs once on mount, the screen is presented fresh each time.
  useEffect(() => {
    setStep('setup');
    if (editingSchedule) {
      setScheduleType(editingSchedule.type || 'recurring');
      setSelectedDays(editingSchedule.type === 'recurring' ? (editingSchedule.days || []) : []);
      if (editingSchedule.type === 'one-time' && editingSchedule.date) {
        const [y, mo, dd] = editingSchedule.date.split('-').map(Number);
        setOneTimeDates([new Date(y, mo - 1, dd)]);
      } else {
        setOneTimeDates([new Date()]);
      }
      const [h, m] = (editingSchedule.time || '18:00').split(':').map(Number);
      setTime({ hour: Number.isFinite(h) ? h : 18, minute: Number.isFinite(m) ? m : 0 });
      setDuration(editingSchedule.duration ?? DEFAULT_WORKOUT_DURATION);
      // Legacy None (-1) or missing -> At start (default now that None is gone).
      setNotifyBefore(editingSchedule.notifyBefore == null || editingSchedule.notifyBefore < 0 ? 0 : editingSchedule.notifyBefore);
    } else {
      setScheduleType('recurring');
      setSelectedDays([]);
      setOneTimeDates([new Date()]);
      setTime({ hour: 18, minute: 0 });
      setDuration(DEFAULT_WORKOUT_DURATION);
      setNotifyBefore(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDay = (dayId) => {
    hapticFeedback.light();
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const scheduleNotification = async (schedule) => {
    try {
      // Check if workout reminders are enabled in settings
      const notificationSettings = await getStoredData('notificationSettings') || {};
      if (notificationSettings.workoutReminders === false || notificationSettings.pushNotifications === false) {
        console.log('Workout reminders are disabled, skipping notification');
        return;
      }

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Cancel any existing notifications for this schedule
      for (let i = 0; i <= 6; i++) {
        await Notifications.cancelScheduledNotificationAsync(`${schedule.id}_${i}`).catch(() => {});
      }
      await Notifications.cancelScheduledNotificationAsync(schedule.id).catch(() => {});
      
      // Cancel only notifications belonging to THIS schedule (stale day slots)
      try {
        const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notif of allScheduled) {
          if (notif.content?.data?.type === 'workout_reminder' &&
              notif.content?.data?.scheduleId === schedule.id) {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier).catch(() => {});
          }
        }
      } catch (e) {
        console.log('Could not clear old workout notifications:', e);
      }

      // "None" reminder (notifyBefore < 0): old notifications cleared above, schedule
      // nothing. 0 = "At start" (notify at the workout time); >0 = minutes before.
      if (schedule.notifyBefore == null || schedule.notifyBefore < 0) {
        console.log('No workout reminder set, skipping notification scheduling');
        return;
      }

      const notifyMinutes = schedule.notifyBefore; // 0 = at start
      const atStart = notifyMinutes === 0;
      const [hours, minutes] = schedule.time.split(':').map(Number);

      // Calculate notification time (X minutes before workout)
      let notifyHours = hours;
      let notifyMins = minutes - notifyMinutes;
      
      if (notifyMins < 0) {
        notifyHours -= Math.ceil(Math.abs(notifyMins) / 60);
        notifyMins = 60 + (notifyMins % 60);
        if (notifyMins === 60) notifyMins = 0;
      }
      if (notifyHours < 0) {
        notifyHours += 24;
      }

      const reminderText = notifyMinutes >= 60 
        ? `${Math.floor(notifyMinutes / 60)} hour${notifyMinutes >= 120 ? 's' : ''}` 
        : `${notifyMinutes} minutes`;

      const soundSetting = notificationSettings.sound !== false ? 'default' : null;

      if (schedule.type === 'recurring') {
        // Schedule recurring notifications for each day
        // Using weekly trigger with proper format
        for (const day of schedule.days) {
          console.log(`📅 Scheduling notification for day ${day} at ${notifyHours}:${notifyMins}`);
          
          await notificationService.scheduleNotif({
            identifier: `${schedule.id}_${day}`,
            content: {
              title: atStart ? 'Workout Time' : 'Workout Reminder',
              body: atStart ? `Time for ${schedule.templateName}!` : `${schedule.templateName} starts in ${reminderText}!`,
              data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
              sound: soundSetting,
            },
            trigger: {
              type: 'weekly',
              weekday: day + 1, // Expo uses 1=Sunday, 2=Monday, etc.
              hour: notifyHours,
              minute: notifyMins,
              repeats: true,
            },
          });
        }
      } else {
        // One-time notification
        // Parse date parts manually to avoid UTC timezone issues
        const dateParts = schedule.date.split('-').map(Number);
        const workoutDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hours, minutes, 0, 0);
        
        const notifyTime = new Date(workoutDateTime.getTime() - notifyMinutes * 60 * 1000);
        
        if (notifyTime > new Date()) {
          console.log(`📅 Scheduling one-time notification for ${notifyTime.toLocaleString()}`);
          
          await notificationService.scheduleNotif({
            identifier: schedule.id,
            content: {
              title: atStart ? 'Workout Time' : 'Workout Reminder',
              body: atStart ? `Time for ${schedule.templateName}!` : `${schedule.templateName} starts in ${reminderText}!`,
              data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
              sound: soundSetting,
            },
            trigger: { type: 'date', date: notifyTime },
          });
        } else {
          console.log(`⏭️ Skipping notification - notify time ${notifyTime.toLocaleString()} is in the past`);
        }
      }

      console.log('✅ Notifications scheduled for:', schedule.templateName);
    } catch (error) {
      console.error('Error scheduling notification:', error);
      // Don't throw - notification failure shouldn't break scheduling
    }
  };

  const repeatValid = scheduleType === 'one-time' ? oneTimeDates.length > 0 : selectedDays.length > 0;

  const handleSave = async () => {
    if (!tmpl) return;
    if (!repeatValid) {
      Alert.alert(scheduleType === 'one-time' ? 'Pick a date' : 'Select days', 'Choose when this workout happens.');
      setStep('setup');
      return;
    }
    hapticFeedback.success();

    const timeString = `${pad2(time.hour)}:${pad2(time.minute)}`;
    const base = { templateId: tmpl.id, templateName: tmpl.name, time: timeString, duration, notifyBefore };

    try {
      if (scheduleType === 'recurring') {
        const schedule = { ...base, type: 'recurring', days: selectedDays };
        const saved = editingSchedule
          ? await WorkoutService.updateScheduledWorkout(editingSchedule.id, schedule)
          : await WorkoutService.addScheduledWorkout(schedule);
        await scheduleNotification(saved || { ...schedule, id: editingSchedule?.id });
        onScheduled?.(saved);
      } else {
        const dates = oneTimeDates.length ? oneTimeDates : [new Date()];
        if (editingSchedule) {
          const schedule = { ...base, type: 'one-time', date: fmtDateKey(dates[0]) };
          const saved = await WorkoutService.updateScheduledWorkout(editingSchedule.id, schedule);
          await scheduleNotification(saved || { ...schedule, id: editingSchedule.id });
          onScheduled?.(saved);
        } else {
          for (const d of dates) {
            const schedule = { ...base, type: 'one-time', date: fmtDateKey(d) };
            const saved = await WorkoutService.addScheduledWorkout(schedule);
            await scheduleNotification(saved);
          }
          onScheduled?.(null);
        }
      }

      onClose();

      const whenText = scheduleType === 'recurring'
        ? (selectedDays.length === 7 ? 'every day' : selectedDays.map((d) => DAY_NAMES[d]).join(', '))
        : (oneTimeDates.length > 1 ? `${oneTimeDates.length} dates` : formatDate(oneTimeDates[0]));

      Alert.alert(
        editingSchedule ? 'Workout Updated' : 'Workout Scheduled',
        `${tmpl.name} ${editingSchedule ? 'updated' : 'scheduled'} for ${whenText} at ${fmtHM(time.hour, time.minute)} · ${formatDuration(duration)}.` +
          (notifyBefore < 0 ? '\n\nNo reminder set.' : notifyBefore === 0 ? '\n\nReminder at start time.' : `\n\nReminder ${notifyBefore} min before.`),
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to schedule workout. Please try again.');
    }
  };

  const toggleOneTimeDate = (date) => {
    const key = fmtDateKey(date);
    if (editingSchedule) { setOneTimeDates([new Date(date)]); return; }
    setOneTimeDates((prev) =>
      prev.some((d) => fmtDateKey(d) === key)
        ? prev.filter((d) => fmtDateKey(d) !== key)
        : [...prev, new Date(date)].sort((a, b) => a - b)
    );
  };

  const timelineDate = scheduleType === 'one-time'
    ? (oneTimeDates[0] || new Date())
    : nextDateForWeekday((selectedDays.slice().sort((a, b) => a - b)[0]) ?? new Date().getDay());
  const timelineSubtitle = scheduleType === 'one-time'
    ? (oneTimeDates.length > 1
        ? `${oneTimeDates.length} dates · same time`
        : timelineDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }))
    : (selectedDays.length === 7 ? 'Every day' : selectedDays.slice().sort((a, b) => a - b).map((d) => DAY_SHORT[d]).join(', '));

  if (!tmpl) return null;

  const editingStartMin = (() => {
    const [h, m] = String(editingSchedule?.time || '').split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1;
  })();
  const onNext = () => { hapticFeedback.light(); setStep('time'); };
  const rightLabel = step === 'setup' ? 'Next' : 'Save';
  const rightOn = step === 'setup' ? repeatValid : true;
  const onRight = step === 'setup' ? onNext : handleSave;
  const onLeft = step === 'setup' ? onClose : () => setStep('setup');

  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const dim = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.28)';
  const daysSorted = selectedDays.slice().sort((a, b) => a - b);
  const daysSentence = daysSorted.length === 7 ? 'Repeats every day'
    : daysSorted.length === 5 && daysSorted.join() === '1,2,3,4,5' ? 'Repeats on weekdays'
    : daysSorted.length === 2 && daysSorted.join() === '0,6' ? 'Repeats at the weekend'
    : daysSorted.length === 0 ? 'Pick at least one day'
    : daysSorted.length === 1 ? `Repeats every ${DAY_NAMES[daysSorted[0]]}`
    : `Repeats ${daysSorted.slice(0, -1).map((d) => DAY_NAMES[d]).join(', ')} and ${DAY_NAMES[daysSorted[daysSorted.length - 1]]}`;
  const setDays = (days) => { hapticFeedback.light(); setSelectedDays(days); };
  const sameDays = (days) => daysSorted.join() === days.join();

  // Text options with an accent underline under the active one. Replaces the
  // tinted pill buttons for schedule type and reminder.
  const TextTabs = ({ options, value, onChange, scroll = false }) => {
    const items = options.map((o) => {
      const active = o.value === value;
      return (
        <TouchableOpacity
          key={String(o.value)}
          onPress={() => { hapticFeedback.light(); onChange(o.value); }}
          style={styles.tab}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
        >
          <Text style={[styles.tabText, { color: active ? theme.text : theme.textSecondary, fontWeight: active ? '800' : '600' }]}>{o.label}</Text>
          {o.sub ? <Text style={[styles.tabSub, { color: active ? theme.primary : theme.textTertiary || theme.textSecondary }]}>{o.sub}</Text> : null}
          <View style={[styles.tabBar, { backgroundColor: active ? theme.primary : 'transparent' }]} />
        </TouchableOpacity>
      );
    });
    if (scroll) {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} keyboardShouldPersistTaps="handled">
          {items}
        </ScrollView>
      );
    }
    return <View style={[styles.tabs, { borderBottomColor: hairline }]}>{items}</View>;
  };

  const reminderHint = notifyBefore === 0
    ? 'Notified when this workout starts.'
    : `Notified ${notifyBefore === 60 ? '1 hour' : notifyBefore === 120 ? '2 hours' : `${notifyBefore} minutes`} before, unless it is already done.`;

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity onPress={onLeft} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel={step === 'setup' ? 'Close' : 'Back'}>
          {step === 'setup'
            ? <MaterialIcons name="close" size={22} color={theme.text} />
            : <Text style={[styles.headerSide, { color: theme.textSecondary }]}>Back</Text>}
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.text }]}>{tmpl.name}</Text>
          <Text style={[styles.stepLabel, { color: theme.textSecondary }]}>{step === 'setup' ? 'Step 1 of 2  ·  When' : 'Step 2 of 2  ·  Start time'}</Text>
        </View>
        <TouchableOpacity onPress={onRight} disabled={!rightOn} style={styles.saveButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button">
          <Text style={[styles.saveText, { color: theme.primary, opacity: rightOn ? 1 : 0.35 }]}>{rightLabel}</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: hairline }]}>
        <View style={[styles.progressFill, { backgroundColor: theme.primary, width: step === 'setup' ? '50%' : '100%' }]} />
      </View>

      {step === 'time' ? (
        <View style={styles.timeBody}>
          <Text style={[styles.bigValue, { color: theme.text }]}>{fmtHM(time.hour, time.minute)}</Text>
          <Text style={[styles.timeSubtitle, { color: theme.textSecondary }]}>
            {`until ${fmtHM(Math.floor(((time.hour * 60 + time.minute + duration) % 1440) / 60), (time.hour * 60 + time.minute + duration) % 60)}  ·  ${timelineSubtitle}  ·  ${formatDuration(duration)}`}
          </Text>
          <StartTimePicker
            date={timelineDate}
            selected={time}
            durationMinutes={duration}
            label={tmpl.name}
            accentColor={theme.primary}
            onPick={(hour, minute) => setTime({ hour, minute })}
            excludeGymId={editingSchedule?.id ?? null}
            excludeEvent={editingSchedule ? { title: editingSchedule.templateName || tmpl.name, startMin: editingStartMin } : null}
          />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Schedule type */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Schedule</Text>
          <TextTabs
            value={scheduleType}
            onChange={setScheduleType}
            options={[
              { value: 'recurring', label: 'Repeats weekly', sub: 'Same days every week' },
              { value: 'one-time', label: 'One date', sub: 'Pick specific days' },
            ]}
          />

          {scheduleType === 'recurring' ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Repeat on</Text>
              <View style={styles.days}>
                {DAYS_OF_WEEK.map((day) => {
                  const on = selectedDays.includes(day.id);
                  return (
                    <TouchableOpacity
                      key={day.id}
                      style={styles.day}
                      onPress={() => toggleDay(day.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={day.name}
                    >
                      <Text style={[styles.dayText, { color: on ? theme.primary : dim, fontWeight: on ? '800' : '600' }]}>{day.short}</Text>
                      <View style={[styles.dayBar, { backgroundColor: on ? theme.primary : hairline }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.daysSentence, { color: selectedDays.length ? theme.text : theme.textSecondary }]}>{daysSentence}</Text>
              <View style={styles.quickRow}>
                {[
                  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
                  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
                  { label: 'Weekends', days: [0, 6] },
                ].map((q) => {
                  const active = sameDays(q.days);
                  return (
                    <TouchableOpacity key={q.label} onPress={() => setDays(active ? [] : q.days)} hitSlop={{ top: 8, bottom: 8 }} accessibilityRole="button">
                      <Text style={[styles.quickText, { color: active ? theme.primary : theme.textSecondary }]}>{q.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {oneTimeDates.length > 1 ? `${oneTimeDates.length} dates picked` : 'Pick one or more dates'}
              </Text>
              <MultiDateCalendar
                selectedDates={oneTimeDates}
                onToggle={toggleOneTimeDate}
                accent={theme.primary}
                singleSelect={!!editingSchedule}
              />
            </>
          )}

          {/* Duration */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>How long it takes</Text>
          <DurationField value={duration} onChange={setDuration} accent={theme.primary} />

          {/* Reminder */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Reminder</Text>
          <TextTabs
            value={notifyBefore}
            onChange={setNotifyBefore}
            options={[
              { value: 0, label: 'At start' },
              { value: 30, label: '30 min before' },
              { value: 60, label: '1 hour before' },
              { value: 120, label: '2 hours before' },
            ]}
            scroll
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{reminderHint}</Text>
        </ScrollView>
      )}
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: { minWidth: 56, paddingVertical: 4 },
  headerSide: { fontSize: 16, fontWeight: '500' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  stepLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  saveButton: { minWidth: 56, alignItems: 'flex-end', paddingVertical: 4 },
  saveText: { fontSize: 16, fontWeight: '700' },
  progressTrack: { height: 2, marginHorizontal: 20, marginTop: 12, borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: 2, borderRadius: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginTop: 26, marginBottom: 10 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabsScroll: { flexDirection: 'row', paddingRight: 8 },
  tab: { paddingTop: 6, paddingRight: 22 },
  tabText: { fontSize: 16, letterSpacing: -0.2 },
  tabSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  tabBar: { height: 2.5, borderRadius: 1.5, marginTop: 8 },
  days: { flexDirection: 'row', marginTop: 2 },
  day: { flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  dayText: { fontSize: 16, letterSpacing: -0.2 },
  dayBar: { height: 3, borderRadius: 1.5, alignSelf: 'stretch', marginTop: 8, marginHorizontal: 5 },
  daysSentence: { fontSize: 15, fontWeight: '600', marginTop: 12, lineHeight: 21 },
  quickRow: { flexDirection: 'row', gap: 18, marginTop: 8 },
  quickText: { fontSize: 13.5, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 10 },
  timeBody: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  bigValue: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  timeSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2, marginBottom: 16 },
});

export default ScheduleWorkoutModal;
