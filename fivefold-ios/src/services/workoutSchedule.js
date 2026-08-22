// Workout reminder notifications for one scheduled workout. Lived inside
// ScheduleWorkoutModal; moved here so My Week can reschedule alerts when a
// workout is moved without opening the wizard.
import * as Notifications from 'expo-notifications';
import notificationService from './notificationService';
import { getStoredData } from '../utils/localStorage';

export const scheduleWorkoutNotifications = async (schedule) => {
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

export default scheduleWorkoutNotifications;
