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
import DayTimeline from './DayTimeline';
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

// Presented as a native pull-to-dismiss modal SCREEN (presentation:'modal') —
// parent scales back, drag down to dismiss (like Bible Timeline). template (new)
// or editingSchedule (edit) arrive via route.params.
const ScheduleWorkoutModal = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const template = route?.params?.template || null;
  const editingSchedule = route?.params?.editingSchedule || null;
  const onClose = () => navigation.goBack();
  const onScheduled = (saved) => { try { DeviceEventEmitter.emit('workoutScheduled', saved); } catch {} };

  // When editing, there may be no template object — fall back to the saved schedule.
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

  // Runs once on mount — the screen is presented fresh each time.
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

  const onNext = () => { hapticFeedback.light(); setStep('time'); };
  const rightLabel = step === 'setup' ? 'Next' : 'Save';
  const rightOn = step === 'setup' ? repeatValid : true;
  const onRight = step === 'setup' ? onNext : handleSave;
  const onLeft = step === 'setup' ? onClose : () => setStep('setup');

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
      <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onLeft} style={styles.closeButton}>
              {step === 'setup'
                ? <MaterialIcons name="close" size={24} color={theme.text} />
                : <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Back</Text>}
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{tmpl.name}</Text>
            <TouchableOpacity onPress={onRight} disabled={!rightOn} style={styles.saveButton}>
              <Text style={[styles.saveText, { color: theme.primary, opacity: rightOn ? 1 : 0.4 }]}>{rightLabel}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progress}>
            {['setup', 'time'].map((s, i) => (
              <View
                key={s}
                style={[styles.progressDot, {
                  width: step === s ? 22 : 7,
                  backgroundColor: (step === 'time' && i === 0) || step === s ? theme.primary : theme.border,
                }]}
              />
            ))}
          </View>

          {step === 'time' ? (
            <View style={styles.timeBody}>
              <View style={styles.timeSubtitleRow}>
                <MaterialIcons name={scheduleType === 'recurring' ? 'repeat' : 'event'} size={16} color={theme.textSecondary} />
                <Text style={[styles.timeSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>{timelineSubtitle}</Text>
              </View>
              <DayTimeline
                date={timelineDate}
                selected={time}
                durationMinutes={duration}
                label={tmpl.name}
                accentColor={theme.primary}
                onPick={(hour, minute) => setTime({ hour, minute })}
              />
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              {/* Schedule Type (workout name is in the header) */}
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 8 }]}>Schedule Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[styles.typeButton, { backgroundColor: scheduleType === 'recurring' ? theme.primary : theme.card, borderColor: scheduleType === 'recurring' ? theme.primary : theme.border }]}
                  onPress={() => { hapticFeedback.light(); setScheduleType('recurring'); }}
                >
                  <MaterialIcons name="repeat" size={20} color={scheduleType === 'recurring' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.typeButtonText, { color: scheduleType === 'recurring' ? '#FFF' : theme.text }]}>Recurring</Text>
                  <Text style={[styles.typeButtonSubtext, { color: scheduleType === 'recurring' ? 'rgba(255,255,255,0.8)' : theme.textTertiary }]}>Every week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, { backgroundColor: scheduleType === 'one-time' ? theme.primary : theme.card, borderColor: scheduleType === 'one-time' ? theme.primary : theme.border }]}
                  onPress={() => { hapticFeedback.light(); setScheduleType('one-time'); }}
                >
                  <MaterialIcons name="event" size={20} color={scheduleType === 'one-time' ? '#FFF' : theme.textSecondary} />
                  <Text style={[styles.typeButtonText, { color: scheduleType === 'one-time' ? '#FFF' : theme.text }]}>One-Time</Text>
                  <Text style={[styles.typeButtonSubtext, { color: scheduleType === 'one-time' ? 'rgba(255,255,255,0.8)' : theme.textTertiary }]}>Specific date</Text>
                </TouchableOpacity>
              </View>

              {scheduleType === 'recurring' ? (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Repeat On</Text>
                  <View style={styles.daysContainer}>
                    {DAYS_OF_WEEK.map((day) => (
                      <TouchableOpacity
                        key={day.id}
                        style={[styles.dayButton, { backgroundColor: selectedDays.includes(day.id) ? theme.primary : theme.card, borderColor: selectedDays.includes(day.id) ? theme.primary : theme.border }]}
                        onPress={() => toggleDay(day.id)}
                      >
                        <Text style={[styles.dayButtonText, { color: selectedDays.includes(day.id) ? '#FFF' : theme.text }]}>{day.short}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selectedDays.length > 0 && (
                    <Text style={[styles.selectedDaysText, { color: theme.textSecondary }]}>
                      {selectedDays.map((d) => DAY_NAMES[d]).join(', ')}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {oneTimeDates.length > 1 ? `Dates · ${oneTimeDates.length} selected` : 'Pick one or more dates'}
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>How long it takes</Text>
              <DurationField value={duration} onChange={setDuration} accent={theme.primary} />

              {/* Reminder */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Reminder</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reminderOptions}
                keyboardShouldPersistTaps="handled"
              >
                {[0, 30, 60, 120].map((mins) => {
                  const active = notifyBefore === mins;
                  const label = mins === 0 ? 'At start' : mins === 60 ? '1 hour' : mins === 120 ? '2 hours' : `${mins} min`;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.reminderButton, { backgroundColor: active ? theme.primary : theme.card, borderColor: active ? theme.primary : theme.border }]}
                      onPress={() => { hapticFeedback.light(); setNotifyBefore(mins); }}
                    >
                      <Text style={[styles.reminderButtonText, { color: active ? '#FFF' : theme.text }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.reminderHint, { color: theme.textSecondary }]}>
                {notifyBefore === 0
                  ? "You'll be notified when this workout starts"
                  : `You'll be notified ${notifyBefore === 60 ? '1 hour' : notifyBefore === 120 ? '2 hours' : `${notifyBefore} minutes`} before your workout (only if not completed)`}
              </Text>
            </ScrollView>
          )}
      </>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
  progressDot: { height: 7, borderRadius: 3.5 },
  timeBody: { flex: 1, paddingHorizontal: 20, paddingTop: 4 },
  timeSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 2 },
  timeSubtitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: {
    marginLeft: 14,
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
  },
  templateDetails: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 26,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  typeButtonSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedDaysText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
    marginBottom: 8,
  },
  reminderButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  reminderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderHint: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
});

export default ScheduleWorkoutModal;
