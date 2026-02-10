import React, { useState, useEffect } from 'react';
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

const NotificationSettings = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const [settings, setSettings] = useState({
    prayerReminders: true, // Single toggle for 30 min before prayer reminders
    taskReminders: true, // Toggle for task/todo notifications
    workoutReminders: true, // Toggle for workout/gym notifications
    achievementNotifications: true,
    streakReminders: true,
    pushNotifications: true,
    sound: true,
    vibration: true,
  });


  useEffect(() => {
    loadNotificationSettings();
  }, []);

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

  const sendTestNotification = async () => {
    try {
      const ok = await notificationService.testNotification();
      if (ok) {
        Alert.alert('Test Sent', 'A test notification was scheduled to send immediately.');
      } else {
        Alert.alert('Test Failed', 'The app could not schedule a test notification.');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Test Failed', 'Unexpected error while sending a test notification.');
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
      Alert.alert('Debug Failed', 'Could not read scheduled notifications.');
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

          await Notifications.scheduleNotificationAsync({
            identifier: task.id,
            content: {
              title: 'Task Reminder',
              body: `"${task.text}" is scheduled in ${reminderText}!`,
              data: { type: 'task_reminder', taskId: task.id },
              sound: soundEnabled ? 'default' : null,
            },
            trigger: { date: notifyTime },
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
              await Notifications.scheduleNotificationAsync({
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
              await Notifications.scheduleNotificationAsync({
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
      // Prayer notifications are handled by notificationService.updateSettings
    }
  };


  const NotificationToggle = ({ title, subtitle, icon, settingKey, iconColor }) => (
    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
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
        value={settings[settingKey]}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: theme.border, true: iconColor + '40' }}
        thumbColor={settings[settingKey] ? iconColor : theme.surface}
        ios_backgroundColor={theme.border}
      />
    </View>
  );


  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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

          {/* Single Prayer Reminder Toggle */}
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

          {/* Task & Workout Reminders */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Task & Fitness</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Get reminded about your scheduled tasks and workouts
            </Text>
            
            <NotificationToggle
              title="Task Reminders"
              subtitle="Get notified about upcoming scheduled tasks"
              icon="check-circle"
              settingKey="taskReminders"
              iconColor="#4CAF50"
            />
            
            <NotificationToggle
              title="Workout Reminders"
              subtitle="Get notified before scheduled workouts"
              icon="fitness-center"
              settingKey="workoutReminders"
              iconColor="#FF5722"
            />
          </View>

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

          {/* Notification Style */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notification Style</Text>
            
            <NotificationToggle
              title="Sound"
              subtitle="Play sound for notifications"
              icon="volume-up"
              settingKey="sound"
              iconColor="#2196F3"
            />
            
            <NotificationToggle
              title="Vibration"
              subtitle="Vibrate when receiving notifications"
              icon="vibration"
              settingKey="vibration"
              iconColor="#2196F3"
            />
          </View>

          {/* Debug tools */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Diagnostics</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Use these to verify iOS is scheduling notifications.
            </Text>

            <TouchableOpacity
              onPress={sendTestNotification}
              style={[styles.diagnosticButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <MaterialIcons name="notifications-active" size={20} color={theme.primary} />
              <Text style={[styles.diagnosticButtonText, { color: theme.text }]}>
                Send Test Notification Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={debugScheduledNotifications}
              style={[styles.diagnosticButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <MaterialIcons name="list" size={20} color={theme.primary} />
              <Text style={[styles.diagnosticButtonText, { color: theme.text }]}>
                Show Scheduled Notifications
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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