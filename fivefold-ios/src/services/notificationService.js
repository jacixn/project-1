import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform, DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Keep compatibility across expo-notifications versions:
    // - `shouldShowAlert` is the legacy key (still used by many builds)
    // - `shouldShowBanner/shouldShowList` are newer iOS presentation options
    shouldShowAlert: true,
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
    // Track handled notification response IDs to prevent double-processing
    this._handledResponseIds = new Set();
  }

  getNextOccurrenceDate(hour, minute) {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);

    // If the time is now/past for today, schedule for tomorrow instead.
    if (next <= now) {
      next.setDate(next.getDate() + 1);
      next.setHours(hour, minute, 0, 0);
    }

    return next;
  }

  // Initialize notification permissions and token
  async initialize() {
    try {
      // CRITICAL: Set up notification response listeners FIRST, before any async
      // operations. This ensures we don't miss notification taps that launched the
      // app from a killed state. The response event can fire at any time after the
      // listener is registered, so we must register before awaiting anything.
      this.setupNotificationListeners();

      // Now check for a cold-start notification response.
      // When the app is launched from a killed state by tapping a notification,
      // addNotificationResponseReceivedListener may NOT fire because the event was
      // already consumed. getLastNotificationResponseAsync() catches this case.
      await this._handleColdStartNotification();

      // Request permissions
      const { status } = await this.requestPermissions();
      if (status !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Get push token
      this.expoPushToken = await this.getPushToken();
      console.log('Expo Push Token:', this.expoPushToken);

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  // Handle notification that launched the app from a killed state
  async _handleColdStartNotification() {
    try {
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        const responseId = lastResponse.notification.request.identifier;
        
        // Guard against stale responses from previous app sessions.
        // Only process if the notification is fresh (< 30 seconds old).
        const notifDate = lastResponse.notification?.date;
        const responseAge = notifDate ? (Date.now() - notifDate) : Infinity;
        
        console.log('📱 [Cold Start] Found last notification response:', responseId, 'age:', Math.round(responseAge / 1000), 's');

        if (responseAge >= 30000) {
          console.log('📱 [Cold Start] Stale response, ignoring');
          return;
        }

        // Only process if we haven't already handled this response via the listener
        if (!this._handledResponseIds.has(responseId)) {
          console.log('📱 [Cold Start] Processing cold-start notification tap');
          this.handleNotificationResponse(lastResponse);
        } else {
          console.log('📱 [Cold Start] Already handled by listener, skipping');
        }
      } else {
        console.log('📱 [Cold Start] No pending notification response (normal launch)');
      }
    } catch (error) {
      console.warn('Failed to check cold-start notification:', error.message);
    }
  }

  // Request notification permissions
  async requestPermissions() {
    // IMPORTANT:
    // - Local notifications work on the iOS simulator, but `Device.isDevice` is false.
    // - We must still query/request OS permissions on simulator, otherwise we may think
    //   permissions are granted while iOS is actually blocking delivery.
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return { status: finalStatus };
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
    this.notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification received:', notification);
      
      // Mark token notification as sent to prevent duplicates
      if (notification.request.content.data?.type === 'token_arrived') {
        try {
          const today = new Date().toISOString().split('T')[0];
          await AsyncStorage.setItem('hub_token_notification_sent', JSON.stringify({
            date: today,
            sentAt: new Date().toISOString(),
          }));
          console.log('[Token] Marked notification as sent from listener');
        } catch (e) {
          console.warn('[Token] Could not mark notification sent:', e);
        }
      }
    });

    // Listener for when a user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const responseId = response.notification.request.identifier;
      console.log('📱 [Response Listener] Notification tapped:', responseId);

      // Track this response ID so we don't double-process with cold-start handler
      if (this._handledResponseIds.has(responseId)) {
        console.log('📱 [Response Listener] Already handled, skipping duplicate');
        return;
      }
      this._handledResponseIds.add(responseId);

      // Clean up old IDs to prevent memory growth (keep last 20)
      if (this._handledResponseIds.size > 20) {
        const idsArray = [...this._handledResponseIds];
        this._handledResponseIds = new Set(idsArray.slice(-10));
      }

      this.handleNotificationResponse(response);
    });
  }

  // Handle notification tap responses
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    const responseId = response.notification.request.identifier;

    // Mark as handled (for deduplication with cold-start handler)
    this._handledResponseIds.add(responseId);
    
    console.log('📱 Notification tapped with data:', data, '| id:', responseId);
    
    // Determine which tab to navigate to based on notification type
    let targetTab = null;
    let additionalData = null;
    
    switch (data?.type) {
      case 'prayer_reminder':
      case 'missed_prayer':
      case 'custom_prayer':
        // Navigate to Bible/Prayer tab
        targetTab = 'BiblePrayer';
        additionalData = { prayerSlot: data.prayerSlot, prayerName: data.prayerName };
        console.log('📱 Navigating to Bible/Prayer tab for:', data.prayerSlot);
        break;
        
      case 'workout_reminder':
      case 'workout_overdue':
        // Navigate to Gym tab
        targetTab = 'Gym';
        additionalData = { templateId: data.templateId, scheduleId: data.scheduleId };
        console.log('📱 Navigating to Gym tab for workout');
        break;
        
      case 'task_reminder':
        // Navigate to Tasks/Todos tab
        targetTab = 'Todos';
        additionalData = { taskId: data.taskId };
        console.log('📱 Navigating to Todos tab for task:', data.taskId);
        break;
        
      case 'daily_streak':
      case 'streak_reminder':
        // Navigate to Profile tab (where streaks are shown)
        targetTab = 'Profile';
        additionalData = { streakType: data.streakType };
        console.log('📱 Navigating to Profile tab for streak');
        break;
        
      case 'achievement':
        // Navigate to Profile tab (where achievements are shown)
        targetTab = 'Profile';
        console.log('📱 Navigating to Profile tab for achievement');
        break;

      case 'message':
        // Navigate directly to the chat with the sender
        if (data?.senderId) {
          targetTab = 'Chat';
          additionalData = {
            otherUserId: data.senderId,
            otherUser: { uid: data.senderId, displayName: data.senderName || 'Friend' },
          };
          console.log('📱 Navigating directly to Chat with:', data.senderName);
        } else {
          targetTab = 'Hub';
          console.log('📱 No senderId in notification, navigating to Hub');
        }
        break;

      case 'friend_request':
      case 'friend_accepted':
        targetTab = 'Hub';
        console.log('📱 Navigating to Hub tab for friend event');
        break;

      case 'challenge':
      case 'challenge_received':
      case 'challenge_result':
        targetTab = 'Hub';
        console.log('📱 Navigating to Hub tab for challenge');
        break;
        
      default:
        console.log('📱 Unknown notification type, no navigation');
        return;
    }
    
    // Emit navigation event that App.js will listen to
    if (targetTab) {
      DeviceEventEmitter.emit('notificationNavigation', {
        tab: targetTab,
        data: additionalData,
        notificationType: data?.type,
      });
    }
  }

  // Schedule daily prayer time notifications (30 minutes before each prayer)
  async schedulePrayerNotifications(prayerTimes, settings = null) {
    try {
      // Cancel existing prayer notifications
      await this.cancelNotificationsByType('prayer_reminder');

      // Get current settings if not provided
      if (!settings) {
        settings = await getStoredData('notificationSettings') || { sound: true, prayerReminders: true, pushNotifications: true };
      }

      // Only schedule if prayer reminders are enabled
      if (!settings.prayerReminders) {
        console.log('Prayer reminders are disabled, skipping notification scheduling');
        return;
      }

      if (settings.pushNotifications === false) {
        console.log('Push notifications are disabled, skipping prayer scheduling');
        return;
      }

      for (const [slot, time] of Object.entries(prayerTimes)) {
        const displayName =
          (time && typeof time === 'object' && !(time instanceof Date) ? time.name : null) ||
          this.getPrayerDisplayName(slot);

        const normalizedTime = this.normalizePrayerTime(time);
        if (!normalizedTime) {
          console.log(`Skipping invalid prayer time for ${slot}:`, time);
          continue;
        }

        const { hours, minutes, originalTime } = normalizedTime;

        // Validate time ranges (protect against user input like "25:99")
        if (
          hours < 0 ||
          hours > 23 ||
          minutes < 0 ||
          minutes > 59 ||
          Number.isNaN(hours) ||
          Number.isNaN(minutes)
        ) {
          console.log(`Skipping out-of-range prayer time for ${slot}:`, { hours, minutes, originalTime });
          continue;
        }

        const now = new Date();

        // Build the next occurrence of this prayer time.
        // CRITICAL: If the prayer time is earlier than "now", it's for tomorrow (cross-midnight support).
        const nextPrayerDate = new Date(now);
        nextPrayerDate.setHours(hours, minutes, 0, 0);
        if (nextPrayerDate <= now) {
          nextPrayerDate.setDate(nextPrayerDate.getDate() + 1);
          nextPrayerDate.setHours(hours, minutes, 0, 0);
        }

        // Reminder is always 30 minutes before the next prayer occurrence (Date math handles midnight).
        let reminderDate = new Date(nextPrayerDate.getTime() - 30 * 60 * 1000);

        const reminderHours = reminderDate.getHours();
        const reminderMinutes = reminderDate.getMinutes();

        // If the reminder time has already passed for today, push it to the next day
        while (reminderDate <= now) {
          reminderDate = new Date(reminderDate.getTime() + 24 * 60 * 60 * 1000);
        }

        // Schedule a single notification for the next occurrence (one per prayer)
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Prayer Reminder',
            body: `${displayName} in 30 minutes`,
            data: { type: 'prayer_reminder', prayerSlot: slot, prayerName: displayName },
            sound: settings.sound ? 'default' : false,
          },
          trigger: reminderDate,
        });

        console.log(
          `Scheduled reminder for ${slot} at ${reminderDate.getHours().toString().padStart(2, '0')}:${reminderDate
            .getMinutes()
            .toString()
            .padStart(2, '0')} (30 min before ${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}, source: ${originalTime})`
        );
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
          title: title || 'Prayer Reminder',
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
          title: 'Missed Prayer',
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
          title: 'Achievement Unlocked!',
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
          title = 'Prayer Streak';
          body = `Keep your ${streakCount}-day prayer streak alive! Don't forget today's prayers.`;
          break;
        case 'task':
          title = 'Task Streak';
          body = `You're on a ${streakCount}-day task completion streak! Complete today's tasks.`;
          break;
        default:
          title = 'Streak Alert';
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
  async scheduleDailyStreakReminder(hour = 8, minute = 0) {
    try {
      await this.cancelNotificationsByType('daily_streak');

      // Important: Some iOS builds can fire repeating calendar triggers immediately
      // when scheduled after the target time for "today". To avoid "instant" Daily Check-In
      // when users re-enable notifications at night, schedule only the *next occurrence*
      // as a Date trigger. We reschedule on app start / settings changes.
      const nextTriggerDate = this.getNextOccurrenceDate(hour, minute);

      const userStats = await getStoredData('userStats') || {};
      const streakCount = userStats.streak || userStats.prayerStreak || 0;
      const streakText = streakCount > 0 ? `${streakCount}-day streak` : 'your streak';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Keep Your Streak',
          body: `You're on ${streakText}. Open Biblely to stay consistent today.`,
          data: { type: 'daily_streak', streakCount },
          sound: true,
        },
        trigger: nextTriggerDate,
      });

      console.log('Daily streak reminder scheduled for:', nextTriggerDate.toISOString());
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

  // Debug helper: list all scheduled notifications (safe no-op in production)
  async debugListScheduledNotifications(label = 'debug') {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔔 [${label}] scheduled notifications count:`, scheduled.length);
      scheduled.forEach(n => {
        const type = n?.content?.data?.type;
        const title = n?.content?.title;
        console.log('🔔 scheduled:', {
          id: n?.identifier,
          type,
          title,
          trigger: n?.trigger,
        });
      });
      return scheduled;
    } catch (error) {
      console.error('🔔 Failed to list scheduled notifications:', error);
      return [];
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
      pre_dawn: 'Before Sunrise',
      post_sunrise: 'After Sunrise',
      pre_sunset: 'Before Sunset',
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
          shouldShowAlert: true,
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
      if (settings.prayerReminders) {
        await this.scheduleStoredPrayerReminders();
      } else {
        await this.cancelNotificationsByType('prayer_reminder');
      }

      if (settings.streakReminders) {
        await this.scheduleDailyStreakReminder(8, 0);
      } else {
        await this.cancelNotificationsByType('daily_streak');
      }

      // Cancel task notifications if disabled
      if (settings.taskReminders === false) {
        await this.cancelNotificationsByType('task_reminder');
        console.log('Task reminders disabled - cancelled all task notifications');
      }

      // Cancel workout notifications if disabled
      if (settings.workoutReminders === false) {
        await this.cancelNotificationsByType('workout_reminder');
        await this.cancelNotificationsByType('workout_overdue');
        console.log('Workout reminders disabled - cancelled all workout notifications');
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
          title: 'Test Notification',
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

  normalizePrayerTime(prayerTime) {
    try {
      if (!prayerTime) return null;

      // Support objects like { time: '05:00', name: 'Morning Prayer' }
      if (typeof prayerTime === 'object' && !(prayerTime instanceof Date)) {
        if (prayerTime && 'time' in prayerTime) {
          return this.normalizePrayerTime(prayerTime.time);
        }
      }

      if (prayerTime instanceof Date) {
        return {
          hours: prayerTime.getHours(),
          minutes: prayerTime.getMinutes(),
          originalTime: prayerTime.toISOString(),
        };
      }

      if (typeof prayerTime === 'string') {
        const trimmed = prayerTime.trim();
        let hours, minutes;

        if (trimmed.includes(':')) {
          [hours, minutes] = trimmed.split(':').map(Number);
        } else if (trimmed.match(/^\d{3,4}$/)) {
          const paddedTime = trimmed.padStart(4, '0');
          hours = parseInt(paddedTime.slice(0, 2), 10);
          minutes = parseInt(paddedTime.slice(2, 4), 10);
        } else {
          return null;
        }

        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

        return {
          hours,
          minutes,
          originalTime: trimmed,
        };
      }

      // Support numeric minutes since midnight
      if (typeof prayerTime === 'number' && prayerTime >= 0 && prayerTime <= 1440) {
        const hours = Math.floor(prayerTime / 60);
        const minutes = prayerTime % 60;
        return {
          hours,
          minutes,
          originalTime: `${hours}:${minutes.toString().padStart(2, '0')}`,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to normalize prayer time:', error);
      return null;
    }
  }

  subtractThirtyMinutes(hours, minutes) {
    let reminderMinutes = minutes - 30;
    let reminderHours = hours;

    if (reminderMinutes < 0) {
      reminderMinutes += 60;
      reminderHours -= 1;
    }

    if (reminderHours < 0) {
      reminderHours += 24; // Handle midnight rollover
    }

    return { reminderHours, reminderMinutes };
  }

  async getStoredPrayerTimes() {
    try {
      // Legacy storage without prefix
      const legacyCustomTimesRaw = await AsyncStorage.getItem('customPrayerTimes');
      if (legacyCustomTimesRaw) {
        const legacyTimes = JSON.parse(legacyCustomTimesRaw);
        if (legacyTimes && Object.keys(legacyTimes).length > 0) {
          return legacyTimes;
        }
      }

      // Prefixed storage via getStoredData
      const prefixedTimes = await getStoredData('customPrayerTimes');
      if (prefixedTimes && Object.keys(prefixedTimes).length > 0) {
        return prefixedTimes;
      }

      // Newer prayers system stores prayers under `fivefold_simplePrayers`
      const simplePrayers = await getStoredData('simplePrayers');
      if (Array.isArray(simplePrayers) && simplePrayers.length > 0) {
        const mappedTimes = {};
        simplePrayers.forEach((prayer, index) => {
          if (prayer?.time) {
            const key = prayer.id || `prayer_${index}`;
            mappedTimes[key] = { time: prayer.time, name: prayer.name || 'Prayer' };
          }
        });

        if (Object.keys(mappedTimes).length > 0) {
          return mappedTimes;
        }
      }

      // Fallback to user-defined prayers list
      const userPrayersRaw = await AsyncStorage.getItem('userPrayers');
      if (userPrayersRaw) {
        const userPrayers = JSON.parse(userPrayersRaw);
        const mappedTimes = {};
        userPrayers.forEach((prayer, index) => {
          if (prayer?.time) {
            const key = prayer.slot || `prayer_${index}`;
            mappedTimes[key] = { time: prayer.time, name: prayer.name || 'Prayer' };
          }
        });

        if (Object.keys(mappedTimes).length > 0) {
          return mappedTimes;
        }
      }

      return {};
    } catch (error) {
      console.error('Failed to load stored prayer times:', error);
      return {};
    }
  }

  async scheduleStoredPrayerReminders() {
    try {
      const settings = await getStoredData('notificationSettings') || { sound: true, prayerReminders: true, pushNotifications: true };

      if (!settings.prayerReminders || settings.pushNotifications === false) {
        console.log('Prayer reminders disabled in settings, skipping stored scheduling');
        return;
      }

      const storedTimes = await this.getStoredPrayerTimes();
      if (!storedTimes || Object.keys(storedTimes).length === 0) {
        console.log('No stored prayer times found to schedule');
        return;
      }

      await this.schedulePrayerNotifications(storedTimes, settings);
    } catch (error) {
      console.error('Failed to schedule stored prayer reminders:', error);
    }
  }

  async scheduleWorkoutOverdueNotification(startTime = new Date()) {
    try {
      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true };

      if (settings.pushNotifications === false) {
        console.log('Push notifications are disabled, skipping workout reminder');
        return;
      }

      const start = startTime instanceof Date ? startTime : new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        console.warn('Invalid workout start time, skipping reminder schedule');
        return;
      }

      // Clear any existing workout overdue notifications
      await this.cancelNotificationsByType('workout_overdue');

      const targetTime = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      const now = new Date();
      const trigger = targetTime <= now ? null : targetTime;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Workout Check-In',
          body: 'You started a workout over an hour ago. Need more time or want to wrap it up?',
          data: { type: 'workout_overdue' },
          sound: settings.sound ? 'default' : false,
        },
        trigger,
      });

      console.log(
        `Workout overdue notification ${trigger ? 'scheduled' : 'sent immediately'} for ${targetTime.toISOString()}`
      );
    } catch (error) {
      console.error('Failed to schedule workout overdue notification:', error);
    }
  }

  async cancelWorkoutOverdueNotification() {
    try {
      await this.cancelNotificationsByType('workout_overdue');
    } catch (error) {
      console.error('Failed to cancel workout overdue notification:', error);
    }
  }

  /**
   * Schedule a weekly Saturday body check-in notification.
   * Fires every Saturday at 10:00 AM local time, reminding
   * the user to update their weight and body fat %.
   */
  async scheduleWeeklyBodyCheckIn() {
    try {
      // Cancel any existing body check-in notifications first
      await this.cancelNotificationsByType('weekly_body_checkin');

      const settings = await getStoredData('notificationSettings') || { sound: true };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Weekly Check-In',
          body: 'Time for your weekly weigh-in. Update your weight and body fat to keep your plan accurate.',
          data: { type: 'weekly_body_checkin' },
          sound: settings.sound ? 'default' : false,
        },
        trigger: {
          weekday: 7, // Saturday (1=Sunday, 7=Saturday)
          hour: 10,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Weekly body check-in notification scheduled for every Saturday at 10:00 AM');
    } catch (error) {
      console.error('Failed to schedule weekly body check-in:', error);
    }
  }

  async cancelWeeklyBodyCheckIn() {
    try {
      await this.cancelNotificationsByType('weekly_body_checkin');
    } catch (error) {
      console.error('Failed to cancel weekly body check-in:', error);
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
