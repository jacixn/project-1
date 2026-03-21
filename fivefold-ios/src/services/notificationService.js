import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import userStorage from '../utils/userStorage';
import Constants from 'expo-constants';
import { Platform, DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';
import WorkoutService from './workoutService';

const TAB_NOTIFICATION_MAP = {
  BiblePrayer: {
    settingsKeys: ['prayerReminders'],
    notificationTypes: ['prayer_reminder', 'custom_prayer', 'missed_prayer'],
  },
  Todos: {
    settingsKeys: ['taskReminders', 'visionExpiryReminders'],
    notificationTypes: ['task_reminder', 'vision_expiry'],
  },
  Gym: {
    settingsKeys: ['workoutReminders', 'weeklyBodyCheckIn'],
    notificationTypes: ['workout_reminder', 'workout_overdue', 'weekly_body_checkin'],
  },
  Hub: {
    settingsKeys: ['tokenArrival'],
    notificationTypes: ['token_arrived'],
  },
};

// ─── Active chat tracking ───
// When the user is inside a specific chat, we store the other user's ID
// so we can completely suppress notifications from that person.
let _activeChatUserId = null;
// Track the currently logged-in user so we can ignore stale push notifications
// that arrive for a previously logged-in user on this device.
let _currentLoggedInUserId = null;

/** Call from ChatScreen when it mounts / focuses */
export const setActiveChatUser = (userId) => { _activeChatUserId = userId; };
/** Call from ChatScreen when it unmounts / blurs */
export const clearActiveChatUser = () => { _activeChatUserId = null; };

/** Call from AuthContext or App.js when the logged-in user changes */
export const setCurrentNotificationUser = (userId) => { _currentLoggedInUserId = userId; };
/** Call on sign-out */
export const clearCurrentNotificationUser = () => { _currentLoggedInUserId = null; };

/**
 * Show an in-app notification banner directly (no push round-trip needed).
 * Respects active-chat suppression so the user doesn't get a banner
 * for the chat they're already viewing.
 */
export const showLocalInAppNotification = ({ title, body, data = {} }) => {
  // Suppress if user is viewing this exact chat
  if (data.type === 'message' && data.senderId && data.senderId === _activeChatUserId) {
    return;
  }
  DeviceEventEmitter.emit('inAppNotification', { title, body, data });
};

// Configure how notifications are handled when the app is in the foreground.
// We suppress the native alert and instead fire an in-app banner via DeviceEventEmitter.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data || {};

    const suppress = {
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };

    // ── If the push is targeted at a specific user who is NOT the current user, drop it ──
    // This prevents stale pushes (for a previously logged-in user) from showing.
    if (data.recipientId && _currentLoggedInUserId && data.recipientId !== _currentLoggedInUserId) {
      console.log('[Notif] Dropped push for wrong user:', data.recipientId, '(current:', _currentLoggedInUserId, ')');
      return suppress;
    }

    // ── If user is viewing the exact chat this message is from, fully suppress ──
    if (data.type === 'message' && data.senderId && data.senderId === _activeChatUserId) {
      return suppress;
    }

    // ── Suppress notifications that fire at the wrong time ──
    // Some iOS builds fire calendar/repeating triggers immediately when
    // scheduled, causing phantom banners (e.g. "Keep Your Streak" at 1 AM).
    // Block known types that should never appear outside their valid window.
    const currentHour = new Date().getHours();
    const earlyMorning = currentHour < 6; // midnight – 5:59 AM

    if (data.type === 'token_arrived' && earlyMorning) {
      console.log(`[Notif] Suppressed stale token_arrived at ${currentHour}:xx`);
      return suppress;
    }

    if (data.type === 'daily_streak' && earlyMorning) {
      console.log(`[Notif] Suppressed stale daily_streak at ${currentHour}:xx`);
      return suppress;
    }

    // ── For every other foreground notification, suppress native UI and
    //    show our own in-app banner instead ──
    DeviceEventEmitter.emit('inAppNotification', {
      title: notification.request.content.title || '',
      body: notification.request.content.body || '',
      data,
    });

    return suppress;
  },
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

  // Initialize notification listeners and check existing permissions.
  // Does NOT request permissions — that happens during onboarding
  // (SimpleOnboarding notification step) so the iOS prompt appears
  // at the right moment, not on the first screen.
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

      // Only CHECK existing permissions — don't request (that's for onboarding)
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Notifications] Permission not yet granted — will be requested during onboarding');
        return false;
      }

      // Already have permission — get push token
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
          await userStorage.setRaw('hub_token_notification_sent', JSON.stringify({
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

      case 'token_arrived':
        targetTab = 'Hub';
        console.log('📱 Navigating to Hub tab for token arrival');
        break;

      case 'vision_checkin':
        targetTab = 'Vision';
        console.log('📱 Navigating to Vision screen for check-in');
        break;

      case 'vision_expiry':
        targetTab = 'Vision';
        additionalData = { visionId: data.visionId, showCompletion: true };
        console.log('📱 Navigating to Vision screen for expiry:', data.visionId);
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

  // Schedule daily prayer time notifications (30 minutes before each prayer).
  //
  // Uses next-occurrence Date triggers (NOT repeating calendar triggers) because
  // some iOS builds fire repeating triggers immediately when scheduled, causing
  // phantom notifications at the wrong time (e.g. 1 AM).  The app reschedules
  // on every open (App.js) and whenever prayers are saved (SimplePrayerCard),
  // so the next day's reminders are always set up.
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

        // Calculate reminder time: 30 minutes before the prayer
        const { reminderHours, reminderMinutes } = this.subtractThirtyMinutes(hours, minutes);

        // Schedule for the NEXT occurrence of this reminder time.
        // If the reminder time has already passed today → schedule for tomorrow.
        const triggerDate = this.getNextOccurrenceDate(reminderHours, reminderMinutes);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Prayer Reminder',
            body: `${displayName} in 30 minutes`,
            data: { type: 'prayer_reminder', prayerSlot: slot, prayerName: displayName },
            sound: settings.sound ? 'default' : false,
          },
          trigger: { type: 'date', date: triggerDate },
        });

        console.log(
          `Scheduled reminder for ${slot} at ${reminderHours.toString().padStart(2, '0')}:${reminderMinutes
            .toString()
            .padStart(2, '0')} → fires ${triggerDate.toLocaleString()} (30 min before ${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}, source: ${originalTime})`
        );
      }

      console.log('Prayer reminder notifications scheduled 30 minutes before each prayer');
    } catch (error) {
      console.error('Failed to schedule prayer notifications:', error);
    }
  }

  // Schedule custom prayer reminder (respects settings)
  async scheduleCustomReminder(title, body, triggerDate) {
    try {
      const settings = await getStoredData('notificationSettings') || {
        sound: true,
        prayerReminders: true,
        pushNotifications: true,
      };

      if (settings.pushNotifications === false || settings.prayerReminders === false) {
        console.log('[Notif] Prayer/push notifications disabled, skipping custom reminder');
        return null;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'Prayer Reminder',
          body: body || 'Time for your custom prayer',
          data: { type: 'custom_prayer' },
          sound: settings.sound ? 'default' : false,
        },
        trigger: { type: 'date', date: triggerDate },
      });

      console.log('Custom reminder scheduled with ID:', identifier);
      return identifier;
    } catch (error) {
      console.error('Failed to schedule custom reminder:', error);
      return null;
    }
  }

  // Schedule missed prayer alert (30 minutes after prayer time) — respects settings
  async scheduleMissedPrayerAlert(prayerSlot, prayerTime) {
    try {
      const settings = await getStoredData('notificationSettings') || {
        sound: true,
        prayerReminders: true,
        pushNotifications: true,
      };

      if (settings.pushNotifications === false || settings.prayerReminders === false) {
        console.log('[Notif] Prayer/push notifications disabled, skipping missed prayer alert');
        return;
      }

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
          sound: settings.sound ? 'default' : false,
        },
        trigger: { type: 'date', date: alertTime },
      });

      console.log(`Missed prayer alert scheduled for ${prayerSlot}`);
    } catch (error) {
      console.error('Failed to schedule missed prayer alert:', error);
    }
  }

  // Send achievement unlocked notification (respects settings toggle)
  async sendAchievementNotification(achievementTitle, points) {
    try {
      const settings = await getStoredData('notificationSettings') || {
        sound: true,
        achievementNotifications: true,
        pushNotifications: true,
      };

      // Respect the user's toggle
      if (settings.pushNotifications === false || settings.achievementNotifications === false) {
        console.log('[Notif] Achievement notifications disabled, skipping');
        return;
      }
      
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

  // Send streak maintenance reminder (respects settings toggle)
  async sendStreakReminder(streakCount, type = 'general') {
    try {
      const settings = await getStoredData('notificationSettings') || {
        sound: true,
        streakReminders: true,
        pushNotifications: true,
      };

      // Respect the user's toggle
      if (settings.pushNotifications === false || settings.streakReminders === false) {
        console.log('[Notif] Streak reminders disabled, skipping');
        return;
      }

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
          sound: settings.sound ? 'default' : false,
        },
        trigger: null, // Send immediately
      });

      console.log('Streak reminder sent');
    } catch (error) {
      console.error('Failed to send streak reminder:', error);
    }
  }

  // Schedule daily streak maintenance reminder.
  //
  // Uses a next-occurrence Date trigger (NOT a repeating calendar trigger) because
  // some iOS builds fire repeating triggers immediately when scheduled, causing
  // a phantom "Keep Your Streak" banner at midnight/1 AM.  The app reschedules
  // on every open (App.js), so tomorrow's reminder is always set up.
  async scheduleDailyStreakReminder(hour = 8, minute = 0) {
    try {
      await this.cancelNotificationsByType('daily_streak');

      const nextTriggerDate = this.getNextOccurrenceDate(hour, minute);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Keep Your Streak',
          body: 'Open Biblely to stay consistent today.',
          data: { type: 'daily_streak' },
          sound: true,
        },
        trigger: { type: 'date', date: nextTriggerDate },
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
      
      // NOTE: Do NOT call Notifications.setNotificationHandler here —
      // the top-level handler in this file already suppresses native alerts
      // and emits in-app notifications via DeviceEventEmitter.
      
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

      // Cancel token arrival notifications if disabled
      if (settings.tokenArrival === false) {
        await this.cancelNotificationsByType('token_arrived');
        console.log('Token arrival notifications disabled - cancelled');
      }

      // Handle vision expiry toggle
      if (settings.visionExpiryReminders === false) {
        await this.cancelNotificationsByType('vision_expiry');
        console.log('Vision expiry reminders disabled - cancelled');
      } else if (settings.visionExpiryReminders !== false) {
        await this.rescheduleAllVisionExpiryNotifications();
      }

      // Handle weekly body check-in toggle
      if (settings.weeklyBodyCheckIn === false) {
        await this.cancelNotificationsByType('weekly_body_checkin');
        console.log('Weekly body check-in disabled - cancelled notification');
      } else if (settings.weeklyBodyCheckIn !== false) {
        // Reschedule if toggled on
        await this.scheduleWeeklyBodyCheckIn();
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
          title: 'Biblely',
          body: 'Your notifications are working perfectly.',
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
      const legacyCustomTimesRaw = await userStorage.getRaw('customPrayerTimes');
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
      const userPrayersRaw = await userStorage.getRaw('userPrayers');
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
      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true, workoutReminders: true };

      if (settings.pushNotifications === false || settings.workoutReminders === false) {
        console.log('Push/workout notifications are disabled, skipping workout overdue reminder');
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
      const trigger = targetTime <= now ? null : { type: 'date', date: targetTime };

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
   *
   * Uses a WEEKLY repeating trigger (same pattern as workout reminders).
   * Weekly triggers are safe from the iOS instant-fire bug because they
   * target a specific weekday — iOS can always calculate the correct
   * next occurrence.  The daily-trigger instant-fire issue does NOT
   * affect weekly triggers.
   */
  async scheduleWeeklyBodyCheckIn() {
    try {
      // Cancel any existing body check-in notifications first
      await this.cancelNotificationsByType('weekly_body_checkin');

      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true, weeklyBodyCheckIn: true };

      if (settings.pushNotifications === false || settings.weeklyBodyCheckIn === false) {
        console.log('Push/weekly check-in notifications disabled, skipping');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Weekly Check-In',
          body: 'Time for your weekly weigh-in. Update your weight and body fat to keep your plan accurate.',
          data: { type: 'weekly_body_checkin' },
          sound: settings.sound ? 'default' : false,
        },
        trigger: {
          type: 'weekly',
          weekday: 7, // Saturday (1=Sunday, 7=Saturday)
          hour: 10,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Weekly body check-in scheduled — every Saturday at 10:00 AM');
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

  /**
   * Schedule a monthly vision check-in notification.
   * Fires on the 1st of each month at 9:00 AM, prompting users
   * to reflect on their life goals.
   *
   * Uses a weekly-style calendar trigger (monthly repeat) which is
   * safe from the iOS instant-fire bug.
   */
  async scheduleVisionCheckIn() {
    try {
      await this.cancelNotificationsByType('vision_checkin');

      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true };
      if (settings.pushNotifications === false) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vision Check-In',
          body: 'Take a moment to reflect on your goals and how far you have come.',
          data: { type: 'vision_checkin' },
          sound: settings.sound ? 'default' : false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          day: 1,
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });

      console.log('Vision check-in scheduled — 1st of each month at 9:00 AM');
    } catch (error) {
      console.error('Failed to schedule vision check-in:', error);
    }
  }

  async cancelVisionCheckIn() {
    try {
      await this.cancelNotificationsByType('vision_checkin');
    } catch (error) {
      console.error('Failed to cancel vision check-in:', error);
    }
  }

  /**
   * Schedule a notification for when a vision's target date is reached.
   * Uses the vision's targetDate as the trigger.
   */
  async scheduleVisionExpiryNotification(vision) {
    try {
      const settings = await getStoredData('notificationSettings') || {
        sound: true,
        pushNotifications: true,
        visionExpiryReminders: true,
      };

      if (settings.pushNotifications === false || settings.visionExpiryReminders === false) {
        console.log('[Notif] Vision expiry notifications disabled, skipping');
        return;
      }

      const targetDate = new Date(vision.targetDate);
      if (targetDate <= new Date()) {
        console.log('[Notif] Vision target date already passed, skipping notification');
        return;
      }

      const notifId = `vision_expiry_${vision.id}`;
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});

      await Notifications.scheduleNotificationAsync({
        identifier: notifId,
        content: {
          title: 'Vision Target Reached',
          body: `Your vision "${vision.title}" has reached its target date. Did you achieve it?`,
          data: { type: 'vision_expiry', visionId: vision.id },
          sound: settings.sound ? 'default' : false,
        },
        trigger: { type: 'date', date: targetDate },
      });

      console.log(`[Notif] Vision expiry scheduled for "${vision.title}" at ${targetDate.toISOString()}`);
    } catch (error) {
      console.error('Failed to schedule vision expiry notification:', error);
    }
  }

  async cancelVisionExpiryNotification(visionId) {
    try {
      const notifId = `vision_expiry_${visionId}`;
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    } catch (error) {
      console.error('Failed to cancel vision expiry notification:', error);
    }
  }

  /**
   * Reschedule expiry notifications for all active visions.
   * Called when the setting is toggled on or on app launch.
   */
  async rescheduleAllVisionExpiryNotifications() {
    try {
      await this.cancelNotificationsByType('vision_expiry');

      const settings = await getStoredData('notificationSettings') || {
        sound: true,
        pushNotifications: true,
        visionExpiryReminders: true,
      };

      if (settings.pushNotifications === false || settings.visionExpiryReminders === false) {
        return;
      }

      const visionsStr = await userStorage.getRaw('visions');
      if (!visionsStr) return;

      const visions = JSON.parse(visionsStr);
      const now = new Date();
      let count = 0;

      for (const v of visions) {
        if (v.status !== 'active') continue;
        const targetDate = new Date(v.targetDate);
        if (targetDate <= now) continue;

        await this.scheduleVisionExpiryNotification(v);
        count++;
      }

      console.log(`[Notif] Rescheduled ${count} vision expiry notifications`);
    } catch (error) {
      console.error('Failed to reschedule vision expiry notifications:', error);
    }
  }

  async scheduleHabitReminder(habit) {
    try {
      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true };
      if (settings.pushNotifications === false) return;

      const notifId = `habit_reminder_${habit.id}`;
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});

      const [hourStr, minuteStr] = (habit.reminderTime || '22:00').split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const triggerDate = this.getNextOccurrenceDate(hour, minute);

      await Notifications.scheduleNotificationAsync({
        identifier: notifId,
        content: {
          title: 'Habit Check-in',
          body: `Have you stayed on track with ${habit.name} today? You're on Day ${habit.currentStreak || 0}!`,
          data: { type: 'habit_reminder', habitId: habit.id },
          sound: settings.sound ? 'default' : false,
        },
        trigger: { type: 'date', date: triggerDate },
      });

      console.log(`[Notif] Scheduled habit reminder for "${habit.name}" at ${hour}:${String(minute).padStart(2, '0')}`);
    } catch (error) {
      console.error('Failed to schedule habit reminder:', error);
    }
  }

  async cancelHabitReminder(habitId) {
    try {
      const notifId = `habit_reminder_${habitId}`;
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    } catch (error) {
      console.error('Failed to cancel habit reminder:', error);
    }
  }

  async rescheduleAllHabitReminders(habits) {
    try {
      for (const habit of habits) {
        if (habit.notificationEnabled !== false) {
          await this.scheduleHabitReminder(habit);
        }
      }
    } catch (error) {
      console.error('Failed to reschedule habit reminders:', error);
    }
  }

  async pauseNotificationsForTab(tabName) {
    const mapping = TAB_NOTIFICATION_MAP[tabName];
    if (!mapping) return;

    try {
      const settings = await getStoredData('notificationSettings') || {};
      const backup = await getStoredData('hiddenTabNotificationBackup') || {};

      const tabBackup = {};
      for (const key of mapping.settingsKeys) {
        tabBackup[key] = settings[key] !== false;
      }
      backup[tabName] = tabBackup;
      await saveData('hiddenTabNotificationBackup', backup);

      const newSettings = { ...settings };
      for (const key of mapping.settingsKeys) {
        newSettings[key] = false;
      }
      await saveData('notificationSettings', newSettings);

      for (const type of mapping.notificationTypes) {
        await this.cancelNotificationsByType(type);
      }

      console.log(`[Notif] Paused notifications for hidden tab: ${tabName}`, tabBackup);
    } catch (error) {
      console.error(`Failed to pause notifications for tab ${tabName}:`, error);
    }
  }

  async restoreNotificationsForTab(tabName) {
    const mapping = TAB_NOTIFICATION_MAP[tabName];
    if (!mapping) return;

    try {
      const settings = await getStoredData('notificationSettings') || {};
      const backup = await getStoredData('hiddenTabNotificationBackup') || {};
      const tabBackup = backup[tabName];

      if (!tabBackup) {
        console.log(`[Notif] No backup found for tab ${tabName}, skipping restore`);
        return;
      }

      const newSettings = { ...settings };
      for (const key of mapping.settingsKeys) {
        if (tabBackup[key] !== undefined) {
          newSettings[key] = tabBackup[key];
        }
      }

      delete backup[tabName];
      await saveData('hiddenTabNotificationBackup', backup);

      await this.updateSettings(newSettings);

      if (newSettings.pushNotifications !== false) {
        if (tabName === 'Todos' && newSettings.taskReminders) {
          await this._rescheduleTaskNotifications(newSettings.sound);
        }
        if (tabName === 'Gym' && newSettings.workoutReminders) {
          await this._rescheduleWorkoutNotifications(newSettings.sound);
        }
      }

      console.log(`[Notif] Restored notifications for unhidden tab: ${tabName}`, tabBackup);
    } catch (error) {
      console.error(`Failed to restore notifications for tab ${tabName}:`, error);
    }
  }

  async _rescheduleTaskNotifications(soundEnabled) {
    try {
      const storedTodos = await userStorage.getRaw('fivefold_todos');
      if (!storedTodos) return;

      const tasks = JSON.parse(storedTodos);
      const now = new Date();
      let count = 0;

      for (const task of tasks) {
        if (task.completed || !task.scheduledDate) continue;
        const taskDate = new Date(task.scheduledDate);
        if (taskDate <= now) continue;

        const reminderMin = task.reminderBefore || 60;
        const notifyTime = new Date(taskDate.getTime() - reminderMin * 60 * 1000);
        if (notifyTime <= now) continue;

        const reminderText = reminderMin >= 60
          ? `${Math.floor(reminderMin / 60)} hour${reminderMin >= 120 ? 's' : ''}`
          : `${reminderMin} minutes`;

        await Notifications.cancelScheduledNotificationAsync(task.id).catch(() => {});
        await Notifications.scheduleNotificationAsync({
          identifier: task.id,
          content: {
            title: 'Task Reminder',
            body: `"${task.text}" is scheduled in ${reminderText}!`,
            data: { type: 'task_reminder', taskId: task.id },
            sound: soundEnabled ? 'default' : null,
          },
          trigger: { type: 'date', date: notifyTime },
        });
        count++;
      }
      console.log(`[Notif] Rescheduled ${count} task notifications (tab restore)`);
    } catch (error) {
      console.error('Failed to reschedule task notifications:', error);
    }
  }

  async _rescheduleWorkoutNotifications(soundEnabled) {
    try {
      const schedules = await WorkoutService.getScheduledWorkouts();
      if (!schedules || schedules.length === 0) return;

      let count = 0;
      const sound = soundEnabled ? 'default' : null;

      for (const schedule of schedules) {
        const notifyMin = schedule.notifyBefore || 60;
        const [hours, minutes] = schedule.time.split(':').map(Number);

        let notifyHours = hours;
        let notifyMins = minutes - notifyMin;
        if (notifyMins < 0) {
          notifyHours -= Math.ceil(Math.abs(notifyMins) / 60);
          notifyMins = 60 + (notifyMins % 60);
          if (notifyMins === 60) notifyMins = 0;
        }
        if (notifyHours < 0) notifyHours += 24;

        const reminderText = notifyMin >= 60
          ? `${Math.floor(notifyMin / 60)} hour${notifyMin >= 120 ? 's' : ''}`
          : `${notifyMin} minutes`;

        try {
          if (schedule.type === 'recurring') {
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
                  sound,
                },
                trigger: { type: 'weekly', weekday: day + 1, hour: notifyHours, minute: notifyMins, repeats: true },
              });
              count++;
            }
          } else {
            await Notifications.cancelScheduledNotificationAsync(schedule.id).catch(() => {});
            const workoutDate = new Date(schedule.date);
            workoutDate.setHours(hours, minutes, 0, 0);
            const notifyTime = new Date(workoutDate.getTime() - notifyMin * 60 * 1000);
            if (notifyTime > new Date()) {
              await Notifications.scheduleNotificationAsync({
                identifier: schedule.id,
                content: {
                  title: 'Workout Reminder',
                  body: `${schedule.templateName} starts in ${reminderText}!`,
                  data: { type: 'workout_reminder', scheduleId: schedule.id, templateId: schedule.templateId },
                  sound,
                },
                trigger: { type: 'date', date: notifyTime },
              });
              count++;
            }
          }
        } catch (err) {
          console.error('Error scheduling workout notification:', err);
        }
      }
      console.log(`[Notif] Rescheduled ${count} workout notifications (tab restore)`);
    } catch (error) {
      console.error('Failed to reschedule workout notifications:', error);
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
