import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize notification permissions and token
  async initialize() {
    try {
      // Request permissions
      const { status } = await this.requestPermissions();
      if (status !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Get push token
      this.expoPushToken = await this.getPushToken();
      console.log('Expo Push Token:', this.expoPushToken);

      // Set up listeners
      this.setupNotificationListeners();

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  // Request notification permissions
  async requestPermissions() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return { status: finalStatus };
    } else {
      console.log('Must use physical device for Push Notifications');
      return { status: 'granted' }; // For simulator
    }
  }

  // Get push notification token
  async getPushToken() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return 'simulator-token'; // Return mock token for simulator
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || '9557acfc-7ad2-48e7-9121-b4fae3d5575b';
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      return token.data;
    } catch (error) {
      console.warn('Failed to get push token (development mode):', error.message);
      return 'development-token'; // Return mock token for development
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listener for when a user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification tap responses
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    switch (data?.type) {
      case 'prayer_reminder':
        // Navigate to prayer screen
        console.log('Navigate to prayer:', data.prayerSlot);
        break;
      case 'missed_prayer':
        // Navigate to prayer screen with missed prayer highlighted
        console.log('Navigate to missed prayer:', data.prayerSlot);
        break;
      case 'achievement':
        // Navigate to achievements screen
        console.log('Navigate to achievements');
        break;
      case 'streak_reminder':
        // Navigate to tasks or profile
        console.log('Navigate to streak maintenance');
        break;
      default:
        console.log('Unknown notification type');
    }
  }

  // Schedule daily prayer time notifications (30 minutes before each prayer)
  async schedulePrayerNotifications(prayerTimes, settings = null) {
    try {
      // Cancel existing prayer notifications
      await this.cancelNotificationsByType('prayer_reminder');

      // Get current settings if not provided
      if (!settings) {
        settings = await getStoredData('notificationSettings') || { sound: true, prayerReminders: true };
      }

      // Only schedule if prayer reminders are enabled
      if (!settings.prayerReminders) {
        console.log('Prayer reminders are disabled, skipping notification scheduling');
        return;
      }

      // Get custom prayer times if available
      const customTimes = await getStoredData('customPrayerTimes') || {};

      for (const [slot, time] of Object.entries(prayerTimes)) {
        // Use custom time if available, otherwise use default time
        const prayerTime = customTimes[slot] || time;
        
        if (!prayerTime) continue;

        // Parse time string (handle both HH:MM and HHMM formats)
        let hours, minutes;
        if (typeof prayerTime === 'string') {
          if (prayerTime.includes(':')) {
            [hours, minutes] = prayerTime.split(':').map(Number);
          } else if (prayerTime.match(/^\d{3,4}$/)) {
            // Handle HHMM format
            const paddedTime = prayerTime.padStart(4, '0');
            hours = parseInt(paddedTime.slice(0, 2));
            minutes = parseInt(paddedTime.slice(2, 4));
          } else {
            continue; // Skip invalid format
          }
        } else {
          continue; // Skip if not a string
        }

        // Calculate 30 minutes before prayer time
        let reminderMinutes = minutes - 30;
        let reminderHours = hours;
        
        if (reminderMinutes < 0) {
          reminderMinutes += 60;
          reminderHours -= 1;
        }
        
        if (reminderHours < 0) {
          reminderHours += 24; // Handle midnight rollover
        }
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🕊️ Prayer Reminder',
            body: `${this.getPrayerDisplayName(slot)} prayer in 30 minutes`,
            data: { type: 'prayer_reminder', prayerSlot: slot },
            sound: settings.sound ? 'default' : false,
          },
          trigger: {
            hour: reminderHours,
            minute: reminderMinutes,
            repeats: true,
          },
        });

        console.log(`Scheduled reminder for ${slot} at ${reminderHours.toString().padStart(2, '0')}:${reminderMinutes.toString().padStart(2, '0')} (30 min before ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})`);
      }

      console.log('Prayer reminder notifications scheduled 30 minutes before each prayer');
    } catch (error) {
      console.error('Failed to schedule prayer notifications:', error);
    }
  }

  // Schedule custom prayer reminder
  async scheduleCustomReminder(title, body, triggerDate) {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: title || '🙏 Prayer Reminder',
          body: body || 'Time for your custom prayer',
          data: { type: 'custom_prayer' },
          sound: true,
        },
        trigger: triggerDate,
      });

      console.log('Custom reminder scheduled with ID:', identifier);
      return identifier;
    } catch (error) {
      console.error('Failed to schedule custom reminder:', error);
      return null;
    }
  }

  // Schedule missed prayer alert (30 minutes after prayer time)
  async scheduleMissedPrayerAlert(prayerSlot, prayerTime) {
    try {
      const [hours, minutes] = prayerTime.split(':').map(Number);
      const alertTime = new Date();
      alertTime.setHours(hours, minutes + 30, 0, 0);

      // If the time has passed for today, schedule for tomorrow
      if (alertTime < new Date()) {
        alertTime.setDate(alertTime.getDate() + 1);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Missed Prayer',
          body: `You may have missed ${this.getPrayerDisplayName(prayerSlot)} prayer. There's still time!`,
          data: { type: 'missed_prayer', prayerSlot },
          sound: true,
        },
        trigger: alertTime,
      });

      console.log(`Missed prayer alert scheduled for ${prayerSlot}`);
    } catch (error) {
      console.error('Failed to schedule missed prayer alert:', error);
    }
  }

  // Send achievement unlocked notification
  async sendAchievementNotification(achievementTitle, points) {
    try {
      // Get current settings for sound
      const settings = await getStoredData('notificationSettings') || { sound: true };
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 Achievement Unlocked!',
          body: `${achievementTitle} (+${points} points)`,
          data: { type: 'achievement' },
          sound: settings.sound ? 'default' : false,
        },
        trigger: null, // Send immediately
      });

      console.log('Achievement notification sent');
    } catch (error) {
      console.error('Failed to send achievement notification:', error);
    }
  }

  // Send streak maintenance reminder
  async sendStreakReminder(streakCount, type = 'general') {
    try {
      let title, body;
      
      switch (type) {
        case 'prayer':
          title = '🔥 Prayer Streak';
          body = `Keep your ${streakCount}-day prayer streak alive! Don't forget today's prayers.`;
          break;
        case 'task':
          title = '✅ Task Streak';
          body = `You're on a ${streakCount}-day task completion streak! Complete today's tasks.`;
          break;
        default:
          title = '🔥 Streak Alert';
          body = `Maintain your ${streakCount}-day streak! Stay consistent.`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'streak_reminder', streakType: type },
          sound: true,
        },
        trigger: null, // Send immediately
      });

      console.log('Streak reminder sent');
    } catch (error) {
      console.error('Failed to send streak reminder:', error);
    }
  }

  // Schedule daily streak maintenance reminder
  async scheduleDailyStreakReminder(hour = 20, minute = 0) {
    try {
      await this.cancelNotificationsByType('daily_streak');

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Daily Check-In',
          body: 'How did your spiritual journey go today? Complete your daily goals!',
          data: { type: 'daily_streak' },
          sound: true,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });

      console.log('Daily streak reminder scheduled');
    } catch (error) {
      console.error('Failed to schedule daily streak reminder:', error);
    }
  }

  // Cancel notifications by type
  async cancelNotificationsByType(type) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const notificationsToCancel = scheduledNotifications.filter(
        notification => notification.content.data?.type === type
      );

      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      console.log(`Cancelled ${notificationsToCancel.length} notifications of type: ${type}`);
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Get prayer display name
  getPrayerDisplayName(slot) {
    const names = {
      morning: 'Morning',
      afternoon: 'Afternoon', 
      evening: 'Evening',
      night: 'Night',
      beforeSunrise: 'Before Sunrise',
      afterSunrise: 'After Sunrise',
      midday: 'Midday',
      beforeSunset: 'Before Sunset',
      afterSunset: 'After Sunset',
    };
    return names[slot] || slot.charAt(0).toUpperCase() + slot.slice(1);
  }

  // Check if user has completed daily prayers and send streak reminder if needed
  async checkDailyProgress() {
    try {
      const prayerHistory = await getStoredData('prayerHistory') || {};
      const userStats = await getStoredData('userStats') || {};
      const today = new Date().toDateString();
      
      const todayPrayers = prayerHistory[today] || {};
      const completedPrayers = Object.values(todayPrayers).filter(Boolean).length;
      
      // If user has completed prayers today, check streak
      if (completedPrayers > 0 && userStats.prayerStreak > 0) {
        // Send streak maintenance reminder in the evening
        const now = new Date();
        if (now.getHours() >= 19 && completedPrayers < 5) {
          await this.sendStreakReminder(userStats.prayerStreak, 'prayer');
        }
      }
    } catch (error) {
      console.error('Failed to check daily progress:', error);
    }
  }

  // Update notification settings and reschedule notifications
  async updateSettings(settings) {
    try {
      await saveData('notificationSettings', settings);
      
      // Update notification handler with current settings
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: settings.sound || false,
          shouldSetBadge: false,
        }),
      });
      
      // If push notifications are disabled, cancel all
      if (!settings.pushNotifications) {
        await this.cancelAllNotifications();
        return;
      }
      
      // Reschedule based on new settings
      if (settings.dailyPrayerTime) {
        const prayerTimes = await getStoredData('prayerTimes') || {
          beforeSunrise: '05:30',
          afterSunrise: '06:30',
          midday: '12:00',
          beforeSunset: '17:30',
          afterSunset: '18:30',
        };
        await this.schedulePrayerNotifications(prayerTimes, settings);
      }
      
      if (settings.streakReminders) {
        await this.scheduleDailyStreakReminder(20, 0, settings);
      }
      
      console.log('Notification settings updated');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }

  // Send test notification
  async testNotification() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🙏 Test Notification',
          body: 'This is a test from Biblely! Your notifications are working perfectly.',
          data: { type: 'test' },
          sound: true,
        },
        trigger: null, // Send immediately
      });
      
      console.log('Test notification sent');
      return true;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  // Clear all notifications (alias for cancelAllNotifications)
  async clearAllNotifications() {
    return await this.cancelAllNotifications();
  }

  // Open device notification settings
  async openSettings() {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, we can't directly open notification settings
        // This would typically link to the app's settings page
        console.log('Please go to Settings > Notifications > Biblely to manage notification settings');
      } else {
        // On Android, you can open the app's notification settings
        console.log('Opening Android notification settings...');
      }
    } catch (error) {
      console.error('Failed to open notification settings:', error);
    }
  }

  // Check permission status
  async checkPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
