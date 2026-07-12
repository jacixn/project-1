import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import userStorage from '../utils/userStorage';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../contexts/ThemeContext';
import { getStoredData, saveData } from '../utils/localStorage';
import { hapticFeedback } from '../utils/haptics';
import notificationService from '../services/notificationService';
import WorkoutService from '../services/workoutService';
import { Audio } from 'expo-av';
import { SOUND_OPTIONS, ensureSoundsInstalled } from '../services/notificationSounds';

const SETTING_TO_TAB = {
  prayerReminders: 'BiblePrayer',
  taskReminders: 'Todos',
  reminderNotifications: 'Todos',
  habitReminders: 'Todos',
  visionExpiryReminders: 'Todos',
  workoutReminders: 'Gym',
  weeklyBodyCheckIn: 'Gym',
};

const NotificationSettings = ({ visible, onClose, asScreen = false }) => {
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState({
    prayerReminders: true,
    taskReminders: true,
    reminderNotifications: true,
    habitReminders: true,
    visionExpiryReminders: true,
    workoutReminders: true,
    weeklyBodyCheckIn: true,
    achievementNotifications: true,
    streakReminders: true,
    pushNotifications: true,
    sound: true,
    vibration: true,
    insistenceLevel: 'gentle', // 'gentle' | 'strong' | 'relentless'
    soundName: 'default', // 'default' or a filename from SOUND_OPTIONS
  });
  const [hiddenTabs, setHiddenTabs] = useState(new Set());

  useEffect(() => {
    if (visible || asScreen) {
      loadNotificationSettings();
      loadHiddenTabs();
    }
  }, [visible, asScreen]);

  const loadHiddenTabs = async () => {
    try {
      const config = await userStorage.get('tabBarConfig');
      setHiddenTabs(new Set(config?.hidden || []));
    } catch (_) {}
  };

  const isSettingHidden = (key) => {
    const tab = SETTING_TO_TAB[key];
    return tab ? hiddenTabs.has(tab) : false;
  };

  const loadNotificationSettings = async () => {
    try {
      const storedSettings = await getStoredData('notificationSettings');
      
      if (storedSettings) {
        setSettings(prev => ({ ...prev, ...storedSettings }));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings) => {
    try {
      await saveData('notificationSettings', newSettings);
      setSettings(newSettings);
      
      // Update notification service with new settings
      await notificationService.updateSettings(newSettings);
      
      hapticFeedback.success();
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const setInsistence = async (level) => {
    if (settings.insistenceLevel === level) return;
    if (settings.vibration) hapticFeedback.light();
    // updateSettings re-arms every notification type, so the new urgency takes
    // effect on the next scheduled alert immediately
    await saveNotificationSettings({ ...settings, insistenceLevel: level });
  };

  // ─── Sound picker ───
  const previewSoundRef = useRef(null);

  // Release the preview player when the sheet closes
  useEffect(() => {
    if (visible || asScreen) ensureSoundsInstalled();
    // This cleanup releases the preview audio player on unmount (screen dismissed
    // or modal closed) — it is not a modal-closed data-reset, so it runs in both modes
    return () => {
      previewSoundRef.current?.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
    };
  }, [visible, asScreen]);

  const previewSound = async (option) => {
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync().catch(() => {});
        previewSoundRef.current = null;
      }
      if (!option.module) return; // 'Default' uses the system tone; nothing to preview
      // Play through the main speaker even if the phone is on silent, matching
      // how the actual notification will sound with the ringer on
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(option.module, { shouldPlay: true });
      previewSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (previewSoundRef.current === sound) previewSoundRef.current = null;
        }
      });
    } catch (error) {
      console.warn('Failed to preview sound:', error);
    }
  };

  const setSoundName = async (option) => {
    if (settings.vibration) hapticFeedback.light();
    previewSound(option);
    if (settings.soundName === option.id) return; // re-tap = just replay the preview
    // updateSettings re-arms everything, so queued alerts adopt the new tone
    await saveNotificationSettings({ ...settings, soundName: option.id });
  };

  const INSISTENCE_OPTIONS = [
    { key: 'gentle', label: 'Gentle', desc: 'One soft alert. Respects Focus and silent.' },
    { key: 'strong', label: 'Strong', desc: 'Urgent alert that breaks through Focus and Do Not Disturb.' },
    { key: 'relentless', label: 'Relentless', desc: 'Urgent, and keeps re-alerting until you act on it.' },
  ];

  const sendTestNotification = async () => {
    try {
      const ok = await notificationService.testNotification();
      if (ok) {
        Alert.alert('Notification Sent', 'A sample notification has been scheduled.');
      } else {
        Alert.alert('Unable to Send', 'The notification could not be scheduled. Please check your notification permissions.');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Unable to Send', 'Something went wrong. Please try again.');
    }
  };

  const debugScheduledNotifications = async () => {
    try {
      const scheduled = await notificationService.debugListScheduledNotifications('settings-ui');
      const types = scheduled
        .map(n => n?.content?.data?.type)
        .filter(Boolean);

      const summary =
        types.length > 0 ? types.join(', ') : '(none)';

      Alert.alert(
        'Scheduled Notifications',
        `Count: ${scheduled.length}\nTypes: ${summary}`
      );
    } catch (error) {
      console.error('Failed to debug scheduled notifications:', error);
      Alert.alert('Unable to Load', 'Could not read scheduled notifications.');
    }
  };

  // Reschedule notifications for all future tasks when taskReminders is toggled ON
  const rescheduleTaskNotifications = async (soundEnabled) => {
    try {
      // Load tasks from storage
      const storedTodos = await userStorage.getRaw('fivefold_todos');
      if (!storedTodos) {
        console.log('No tasks found to reschedule notifications for');
        return;
      }

      const tasks = JSON.parse(storedTodos);
      const now = new Date();
      let scheduledCount = 0;

      for (const task of tasks) {
        // Only schedule for incomplete tasks with a scheduled date/time in the future
        if (task.completed || !task.scheduledDate) continue;

        const taskDateTime = new Date(task.scheduledDate);
        if (taskDateTime <= now) continue;

        // Default reminder is 60 minutes before
        const reminderMinutes = task.reminderBefore || 60;
        const notifyTime = new Date(taskDateTime.getTime() - reminderMinutes * 60 * 1000);

        if (notifyTime <= now) continue;

        const reminderText = reminderMinutes >= 60 
          ? `${Math.floor(reminderMinutes / 60)} hour${reminderMinutes >= 120 ? 's' : ''}` 
          : `${reminderMinutes} minutes`;

        try {
          // Cancel any existing notification for this task first
          await Notifications.cancelScheduledNotificationAsync(task.id).catch(() => {});

          await notificationService.scheduleNotif({
            identifier: task.id,
            content: {
              title: 'Task Reminder',
              body: `"${task.text}" is scheduled in ${reminderText}!`,
              data: { type: 'task_reminder', taskId: task.id },
              sound: soundEnabled ? 'default' : null,
            },
            trigger: { type: 'date', date: notifyTime },
          });
          scheduledCount++;
        } catch (err) {
          console.error('Error scheduling task notification:', err);
        }
      }

      console.log(`✅ Rescheduled ${scheduledCount} task notifications`);
    } catch (error) {
      console.error('Failed to reschedule task notifications:', error);
    }
  };

  // Reschedule notifications for all workout schedules when workoutReminders is toggled ON
  const rescheduleWorkoutNotifications = async (soundEnabled) => {
    try {
      const schedules = await WorkoutService.getScheduledWorkouts();
      if (!schedules || schedules.length === 0) {
        console.log('No workout schedules found to reschedule notifications for');
        return;
      }

      let scheduledCount = 0;
      const soundSetting = soundEnabled ? 'default' : null;

      for (const schedule of schedules) {
        const notifyMinutes = schedule.notifyBefore || 60;
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

        try {
          if (schedule.type === 'recurring') {
            // Cancel existing and reschedule for each day
            for (let i = 0; i <= 6; i++) {
              await Notifications.cancelScheduledNotificationAsync(`${schedule.id}_${i}`).catch(() => {});
            }

            for (const day of schedule.days) {
              await notificationService.scheduleNotif({
                identifier: `${schedule.id}_${day}`,
                content: {
                  title: 'Workout Reminder',
                  body: `${schedule.templateName} starts in ${reminderText}!`,
                  data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
                  sound: soundSetting,
                },
                trigger: {
                  type: 'weekly',
                  weekday: day + 1,
                  hour: notifyHours,
                  minute: notifyMins,
                  repeats: true,
                },
              });
              scheduledCount++;
            }
          } else {
            // One-time notification
            await Notifications.cancelScheduledNotificationAsync(schedule.id).catch(() => {});

            const workoutDateTime = new Date(schedule.date);
            workoutDateTime.setHours(hours, minutes, 0, 0);
            
            const notifyTime = new Date(workoutDateTime.getTime() - notifyMinutes * 60 * 1000);
            
            if (notifyTime > new Date()) {
              await notificationService.scheduleNotif({
                identifier: schedule.id,
                content: {
                  title: 'Workout Reminder',
                  body: `${schedule.templateName} starts in ${reminderText}!`,
                  data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
                  sound: soundSetting,
                },
                trigger: {
                  type: 'date',
                  date: notifyTime,
                },
              });
              scheduledCount++;
            }
          }
        } catch (err) {
          console.error('Error scheduling workout notification:', err);
        }
      }

      console.log(`✅ Rescheduled ${scheduledCount} workout notifications`);
    } catch (error) {
      console.error('Failed to reschedule workout notifications:', error);
    }
  };

  const toggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    const isTogglingOn = !settings[key]; // Will be true if currently OFF and we're turning ON
    
    // Provide haptic feedback based on setting type and vibration preference
    if (settings.vibration) {
      if (key === 'pushNotifications') {
        hapticFeedback.medium();
      } else {
        hapticFeedback.light();
      }
    }
    
    // Special handling for main push notifications toggle
    if (key === 'pushNotifications' && !settings[key]) {
      // Request permission when enabling notifications
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission.status || hasPermission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive prayer reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Settings', 
              onPress: () => notificationService.openSettings() 
            }
          ]
        );
        return;
      }
    }
    
    // Save settings first
    await saveNotificationSettings(newSettings);

    // When toggling task reminders ON, reschedule notifications for existing tasks
    if (key === 'taskReminders' && isTogglingOn && newSettings.pushNotifications) {
      await rescheduleTaskNotifications(newSettings.sound);
    }

    // When toggling workout reminders ON, reschedule notifications for existing schedules
    if (key === 'workoutReminders' && isTogglingOn && newSettings.pushNotifications) {
      await rescheduleWorkoutNotifications(newSettings.sound);
    }

    // When toggling vision expiry ON, reschedule for all active visions
    if (key === 'visionExpiryReminders' && isTogglingOn && newSettings.pushNotifications) {
      await notificationService.rescheduleAllVisionExpiryNotifications();
    }

    // When toggling reminder notifications ON, reschedule all reminders
    if (key === 'reminderNotifications' && isTogglingOn && newSettings.pushNotifications) {
      await notificationService.rescheduleAllReminderNotifications();
    }

    // When toggling habit reminders ON, reschedule for all active habits
    if (key === 'habitReminders' && isTogglingOn && newSettings.pushNotifications) {
      try {
        const storedHabits = await userStorage.getRaw('fivefold_user_habits');
        if (storedHabits) {
          const parsed = JSON.parse(storedHabits);
          const habits = parsed.habits || [];
          await notificationService.rescheduleAllHabitReminders(habits.filter(h => h.notificationEnabled !== false));
        }
      } catch (err) {
        console.error('Failed to reschedule habit reminders:', err);
      }
    }

    // When toggling main push notifications ON, reschedule all enabled notification types
    if (key === 'pushNotifications' && isTogglingOn) {
      // Task notifications
      if (newSettings.taskReminders) {
        await rescheduleTaskNotifications(newSettings.sound);
      }
      // Workout notifications
      if (newSettings.workoutReminders) {
        await rescheduleWorkoutNotifications(newSettings.sound);
      }
      // Reminder notifications
      if (newSettings.reminderNotifications) {
        await notificationService.rescheduleAllReminderNotifications();
      }
      // Habit notifications
      if (newSettings.habitReminders) {
        try {
          const storedHabits = await userStorage.getRaw('fivefold_user_habits');
          if (storedHabits) {
            const parsed = JSON.parse(storedHabits);
            const habits = parsed.habits || [];
            await notificationService.rescheduleAllHabitReminders(habits.filter(h => h.notificationEnabled !== false));
          }
        } catch (err) {
          console.error('Failed to reschedule habit reminders:', err);
        }
      }
      // Prayer notifications are handled by notificationService.updateSettings
    }
  };


  const pushOff = !settings.pushNotifications;

  const NotificationToggle = ({ title, subtitle, icon, settingKey, iconColor }) => {
    const isMaster = settingKey === 'pushNotifications';
    const disabled = !isMaster && pushOff;
    const dimmed = disabled ? 0.35 : 1;

    return (
      <View style={[styles.settingItem, { borderBottomColor: theme.border, opacity: dimmed }]}>
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <MaterialIcons name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Switch
          value={disabled ? false : settings[settingKey]}
          onValueChange={() => toggleSetting(settingKey)}
          disabled={disabled}
          trackColor={{ false: theme.border, true: '#34C75940' }}
          thumbColor={(settings[settingKey] && !disabled) ? '#34C759' : theme.surface}
          ios_backgroundColor={theme.border}
        />
      </View>
    );
  };


  const content = (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity 
            onPress={() => {
              if (settings.vibration) hapticFeedback.light();
              onClose();
            }}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Notification Settings
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Toggle */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <NotificationToggle
              title="Push Notifications"
              subtitle="Enable all prayer reminders and updates"
              icon="notifications"
              settingKey="pushNotifications"
              iconColor={theme.primary}
            />
          </View>

          {/* Alert Style — global insistence level */}
          {settings.pushNotifications && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Alert Style</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                How hard every reminder tries to reach you when you're busy
              </Text>
              {INSISTENCE_OPTIONS.map((opt) => {
                const active = settings.insistenceLevel === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setInsistence(opt.key)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <MaterialIcons
                      name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={active ? theme.primary : theme.textSecondary}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{opt.label}</Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Notification Sound — tap to preview and select */}
          {settings.pushNotifications && settings.sound !== false && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Sound</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Tap a sound to hear it. Applies to every reminder.
              </Text>
              {SOUND_OPTIONS.map((opt) => {
                const active = (settings.soundName || 'default') === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setSoundName(opt)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <MaterialIcons
                      name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={active ? theme.primary : theme.textSecondary}
                    />
                    <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: theme.text }}>
                      {opt.label}
                    </Text>
                    {opt.module && (
                      <MaterialIcons name="volume-up" size={18} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Prayer Reminders — hidden when Bible tab is hidden */}
          {!isSettingHidden('prayerReminders') && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Prayer Reminders</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Remind me 30 minutes before every prayer
              </Text>
              
              <NotificationToggle
                title="Prayer Reminders"
                subtitle="Get notified 30 minutes before each prayer time"
                icon="notifications-active"
                settingKey="prayerReminders"
                iconColor="#2196F3"
              />
            </View>
          )}

          {/* Focus — Reminders, Tasks, Habits, Visions */}
          {(!isSettingHidden('reminderNotifications') || !isSettingHidden('taskReminders') || !isSettingHidden('habitReminders') || !isSettingHidden('visionExpiryReminders')) && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Focus</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Stay on top of your reminders, tasks, habits, and visions
              </Text>

              {!isSettingHidden('reminderNotifications') && (
                <NotificationToggle
                  title="Reminders"
                  subtitle="Get notified at your scheduled reminder times"
                  icon="alarm"
                  settingKey="reminderNotifications"
                  iconColor="#3B82F6"
                />
              )}
              
              {!isSettingHidden('taskReminders') && (
                <NotificationToggle
                  title="Tasks"
                  subtitle="Get notified about upcoming scheduled tasks"
                  icon="check-circle"
                  settingKey="taskReminders"
                  iconColor="#4CAF50"
                />
              )}

              {!isSettingHidden('habitReminders') && (
                <NotificationToggle
                  title="Habits"
                  subtitle="Daily check-in reminders for your habits"
                  icon="loop"
                  settingKey="habitReminders"
                  iconColor="#2196F3"
                />
              )}

              {!isSettingHidden('visionExpiryReminders') && (
                <NotificationToggle
                  title="Visions"
                  subtitle="Get notified when a vision reaches its target date"
                  icon="visibility"
                  settingKey="visionExpiryReminders"
                  iconColor="#F59E0B"
                />
              )}
            </View>
          )}

          {/* Fitness */}
          {(!isSettingHidden('workoutReminders') || !isSettingHidden('weeklyBodyCheckIn')) && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Fitness</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Get reminded about your workouts and check-ins
              </Text>
              
              {!isSettingHidden('workoutReminders') && (
                <NotificationToggle
                  title="Workout Reminders"
                  subtitle="Get notified before scheduled workouts"
                  icon="fitness-center"
                  settingKey="workoutReminders"
                  iconColor="#FF5722"
                />
              )}
              
              {!isSettingHidden('weeklyBodyCheckIn') && (
                <NotificationToggle
                  title="Weekly Check-In"
                  subtitle="Saturday reminder to update your weight"
                  icon="monitor-weight"
                  settingKey="weeklyBodyCheckIn"
                  iconColor="#9C27B0"
                />
              )}
            </View>
          )}

          {/* App Features */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>App Features</Text>
            
            <NotificationToggle
              title="Achievement Unlocked"
              subtitle="Celebrate your spiritual milestones"
              icon="emoji-events"
              settingKey="achievementNotifications"
              iconColor="#2196F3"
            />
            
            <NotificationToggle
              title="Streak Maintenance"
              subtitle="Keep your prayer streak alive"
              icon="local-fire-department"
              settingKey="streakReminders"
              iconColor="#2196F3"
            />
          </View>

        </ScrollView>
      </View>
  );

  // Native screen mode: render the content directly, no Modal wrapper (always open)
  if (asScreen) return content;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onClose}>
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  diagnosticButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NotificationSettings;