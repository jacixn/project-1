import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import userStorage from '../utils/userStorage';
import Constants from 'expo-constants';
import { Platform, DeviceEventEmitter } from 'react-native';
import { getStoredData, saveData } from '../utils/localStorage';
import WorkoutService from './workoutService';
import { ensureSoundsInstalled, resolveSoundName } from './notificationSounds';

const TAB_NOTIFICATION_MAP = {
  BiblePrayer: {
    settingsKeys: ['prayerReminders'],
    notificationTypes: ['prayer_reminder', 'custom_prayer', 'missed_prayer'],
  },
  Todos: {
    settingsKeys: ['taskReminders', 'habitReminders', 'visionExpiryReminders', 'reminderNotifications'],
    notificationTypes: ['task_reminder', 'habit_reminder', 'vision_expiry', 'user_reminder'],
  },
  Gym: {
    settingsKeys: ['workoutReminders', 'weeklyBodyCheckIn'],
    notificationTypes: ['workout_reminder', 'workout_overdue', 'weekly_body_checkin'],
  },
};

// Notification types belonging to features that were REMOVED from the app (the
// Hub / social system). Nothing schedules these any more, but iOS keeps already
// scheduled local notifications in its own queue — deleting the JS that created
// them does NOT cancel them. So we (a) never display them and (b) purge any that
// are still pending on every launch. Without this, a leftover "your token has
// arrived" notification keeps firing on the user's phone forever.
const REMOVED_NOTIFICATION_TYPES = [
  'token_arrived',
  'friend_request',
  'friend_accepted',
  'challenge',
  'challenge_received',
  'challenge_result',
  'message',
  'new_message',
  'prayer_shared',
  'prayer_comment',
  'praying_for_you',
  'encouragement',
  'streak_milestone',
];

// ─── Alert Style (global insistence level) ───
// One user setting governs how hard EVERY scheduled notification tries to reach
// the user. It flows through scheduleNotif() below, so no call site hard-codes
// urgency.
//   gentle      – today's behaviour: one soft alert, respects Focus/silent
//   strong      – Time-Sensitive (breaks through Focus/DND), one alert
//   relentless  – Time-Sensitive + escalation: re-pings until the user acts
export const INSISTENCE_LEVELS = ['gentle', 'strong', 'relentless'];
export const DEFAULT_INSISTENCE = 'gentle';

// Relentless escalation: after the first alert, re-ping every interval up to
// this many follow-ups, then stop (never buzzes forever). Tapping the alert,
// its Done action, or completing the item in-app cancels the whole group.
const ESCALATION_INTERVAL_SEC = 60;
const ESCALATION_MAX_FOLLOWUPS = 4;

// iOS silently keeps only the 64 soonest pending local notifications. Primary
// alerts must never be crowded out by escalation follow-ups. Follow-ups stop
// once the queue reaches this ceiling, and the ~19-slot headroom below 64
// exists because PRIMARIES keep scheduling unconditionally after the ceiling —
// a bulk re-arm of a heavy user must never push a far-future primary out of
// the queue in favour of near-term nag pings.
const SAFE_PENDING_CEILING = 45;

// iOS notification category carrying the Done / Snooze action buttons
export const REMINDER_CATEGORY_ID = 'biblely_reminder';
const SNOOZE_MINUTES = 10;

// Notification types that must NEVER escalate or gain urgency: transient,
// self-resolving, or informational. Rest timers end on their own; achievements
// and test pings aren't reminders you can "miss".
const NON_URGENT_TYPES = new Set(['rest_timer', 'achievement', 'test']);

// expo-notifications on iOS serializes notification.date in epoch SECONDS
// (EXNotificationSerializer.m: timeIntervalSince1970, no *1000), while Android
// and the scheduler APIs use milliseconds. Normalize before any arithmetic —
// treating seconds as ms made every "age" check astronomically stale and every
// derived Date land in January 1970.
const toEpochMs = (d) => {
  const n = Number(d);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
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

    // ── Removed features (Hub/social): never show. These can only be leftovers
    //    queued in iOS before the Hub was deleted. purgeRemovedFeatureNotifications()
    //    (run on launch) cancels the pending ones so they stop recurring.
    if (data.type && REMOVED_NOTIFICATION_TYPES.includes(data.type)) {
      console.log(`[Notif] Dropped notification for removed feature: ${data.type}`);
      return suppress;
    }

    if (data.type === 'daily_streak' && earlyMorning) {
      console.log(`[Notif] Suppressed stale daily_streak at ${currentHour}:xx`);
      return suppress;
    }

    // ── Relentless escalation follow-ups: the user is IN the app, so the
    //    primary's in-app banner already showed. Re-bannering every 60s while
    //    they're actively using the app is spam, not persistence. The
    //    follow-ups still fire normally when the app is backgrounded/locked,
    //    which is the situation they exist for. ──
    if (data.escalation === true) {
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

// Day templates can turn whole groups off for a day (prayers, workouts,
// one-off things): those days get no notification for that group.
const dateKeyOfLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hiddenDays = async (group, days = 15) => { try { return await require('./dayTemplates').hiddenDatesForGroup(group, days); } catch { return new Set(); } };

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

      // Register the Done / Snooze action buttons so alerts are actionable
      // straight from the lock screen.
      await this.registerNotificationCategories();

      // Copy the bundled chimes into Library/Sounds so notifications can play
      // them (fire-and-forget; falls back to the default tone until done)
      ensureSoundsInstalled();

      // Now check for a cold-start notification response.
      // When the app is launched from a killed state by tapping a notification,
      // addNotificationResponseReceivedListener may NOT fire because the event was
      // already consumed. getLastNotificationResponseAsync() catches this case.
      await this._handleColdStartNotification();

      // Kill any notifications still queued in iOS from features we deleted (the
      // Hub posting token, friend requests, challenges, messages). Must run before
      // the permission early-return below, otherwise users who later revoke
      // permission keep a poisoned queue.
      await this.purgeRemovedFeatureNotifications();

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
        // notification.date arrives in SECONDS on iOS — normalize first, or
        // this guard rejects everything (which it silently did for a while).
        const notifDate = toEpochMs(lastResponse.notification?.date);
        const responseAge = notifDate ? (Date.now() - notifDate) : Infinity;
        
        console.log('📱 [Cold Start] Found last notification response:', responseId, 'age:', Math.round(responseAge / 1000), 's');

        const alreadyHandled = this._handledResponseIds.has(responseId);

        // Done/Snooze use opensAppToForeground:false, so when the app was
        // killed no JS ran at tap time — the action replays here on the next
        // launch. Unlike navigation, these actions outlive the 30s guard: a
        // "Done" pressed on the lock screen 20 minutes ago must still complete
        // the item and stop its escalation pings.
        //
        // But getLastNotificationResponseAsync keeps returning the SAME
        // response on every subsequent launch (that is why the 30s guard
        // exists), and _handledResponseIds is in-memory. Without a persistent
        // stamp, a days-old Done would re-complete the item every launch. The
        // stamp includes the delivery date because deterministic identifiers
        // (reminder_x_next) are reused across re-arms.
        if (!alreadyHandled && (lastResponse.actionIdentifier === 'COMPLETE' || lastResponse.actionIdentifier === 'SNOOZE')) {
          const actionStamp = `${responseId}:${notifDate || 0}`;
          const lastStamp = await getStoredData('lastHandledNotifActionStamp');
          const withinWindow = responseAge < 12 * 60 * 60 * 1000; // actions older than 12h are abandoned
          if (lastStamp !== actionStamp && withinWindow) {
            console.log('📱 [Cold Start] Replaying notification action:', lastResponse.actionIdentifier);
            this._handledResponseIds.add(responseId);
            await saveData('lastHandledNotifActionStamp', actionStamp);
            this.handleEscalationResponse(lastResponse);
          } else {
            console.log('📱 [Cold Start] Action already replayed or too old, skipping');
          }
          return; // an action tap shouldn't also navigate
        }

        if (responseAge >= 30000) {
          console.log('📱 [Cold Start] Stale response, ignoring');
          return;
        }

        // Only process if we haven't already handled this response via the listener
        if (!alreadyHandled) {
          console.log('📱 [Cold Start] Processing cold-start notification tap');
          this.handleEscalationResponse(lastResponse); // stop the nag on plain tap too
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

  // ─── Alert Style plumbing ───

  // Read the global insistence level (defaults to gentle for existing users)
  async getInsistenceLevel() {
    try {
      const settings = await getStoredData('notificationSettings');
      const level = settings?.insistenceLevel;
      return INSISTENCE_LEVELS.includes(level) ? level : DEFAULT_INSISTENCE;
    } catch {
      return DEFAULT_INSISTENCE;
    }
  }

  // Register the Done / Snooze action buttons once. Cheap to call repeatedly.
  async registerNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
        {
          identifier: 'COMPLETE',
          buttonTitle: 'Done',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'SNOOZE',
          buttonTitle: `Snooze ${SNOOZE_MINUTES} min`,
          options: { opensAppToForeground: false },
        },
      ]);
    } catch (error) {
      console.warn('Failed to register notification categories:', error);
    }
  }

  // A stable key shared by an alert and its escalation follow-ups, so any one
  // of them (or an in-app completion) can cancel the whole group.
  //
  // Derived from type + item id — NOT the scheduler identifier — so that
  // cancelItemEscalation(data) at an in-app completion site rebuilds the exact
  // same key even though it never sees the identifier the scheduler used.
  // Falls back to the identifier only for singleton alerts with no item id.
  _groupKeyFor(identifier, data = {}) {
    const itemId = data.reminderId || data.taskId || data.habitId || data.visionId
      || data.scheduleId || data.prayerSlot || data.prayerName;
    if (data.type && itemId) return `${data.type}__${itemId}`;
    if (identifier) return String(identifier);
    return `${data.type || 'notif'}__x`;
  }

  // Apply the current urgency to a content object: interruption level, the
  // action-button category, and a group key on the data. Sound is left as the
  // call site set it (respecting the user's sound toggle).
  _applyUrgency(content, level, groupKey, soundName) {
    const urgent = level === 'strong' || level === 'relentless';
    // The call site decided WHETHER this alert makes sound (user's sound
    // toggle); the picked tone decides WHICH sound. false/null stay silent.
    const sound = content.sound ? resolveSoundName(soundName) : content.sound;
    return {
      ...content,
      sound,
      // 'timeSensitive' breaks through Focus/DND once the entitlement is in the
      // build; without it iOS simply treats it as a normal alert (no crash).
      interruptionLevel: urgent ? 'timeSensitive' : 'active',
      categoryIdentifier: REMINDER_CATEGORY_ID,
      data: { ...(content.data || {}), groupKey },
    };
  }

  // Compute a follow-up trigger `offsetSec` after the original, matching the
  // original trigger's kind. Returns null for triggers we can't safely offset
  // (repeating weekly/calendar, or already-immediate), so those never escalate.
  _escalationTrigger(trigger, offsetSec) {
    if (!trigger) return null;
    if (trigger.repeats) return null;
    if (trigger.type === 'date' && trigger.date) {
      return { type: 'date', date: new Date(new Date(trigger.date).getTime() + offsetSec * 1000) };
    }
    if (trigger.type === Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL && trigger.seconds) {
      return { type: trigger.type, seconds: trigger.seconds + offsetSec };
    }
    return null;
  }

  // THE seam every schedule call routes through. Same shape as
  // Notifications.scheduleNotificationAsync ({ content, trigger, identifier }),
  // but stamps urgency and, at the relentless level, schedules escalation
  // follow-ups. Returns the primary notification id.
  async scheduleNotif({ content, trigger = null, identifier } = {}) {
    const data = content?.data || {};
    const type = data.type;
    const settings = (await getStoredData('notificationSettings')) || {};
    const level = INSISTENCE_LEVELS.includes(settings.insistenceLevel)
      ? settings.insistenceLevel
      : DEFAULT_INSISTENCE;

    // Transient/informational notifications opt out of urgency entirely
    if (NON_URGENT_TYPES.has(type)) {
      return Notifications.scheduleNotificationAsync(
        identifier ? { identifier, content, trigger } : { content, trigger }
      );
    }

    const groupKey = this._groupKeyFor(identifier, data);
    const urgentContent = this._applyUrgency(content, level, groupKey, settings.soundName);

    // Re-arming this item (edited time, daily roll-over): clear any escalation
    // follow-ups left from the PREVIOUS schedule first, or their auto-ids
    // orphan and fire at the old time. Snoozed follow-ups are spared — a
    // routine re-arm must not break a snooze promise. Cheap no-op when none
    // exist.
    await this.cancelEscalationGroup(groupKey, { includeSnoozed: false });

    const primaryId = await Notifications.scheduleNotificationAsync(
      identifier ? { identifier, content: urgentContent, trigger } : { content: urgentContent, trigger }
    );

    if (level === 'relentless' && this._escalationTrigger(trigger, ESCALATION_INTERVAL_SEC)) {
      // Budget check: never let follow-ups push the queue past iOS's 64-item
      // cap, or primary alerts for other items get silently dropped.
      let pending = 0;
      try { pending = (await Notifications.getAllScheduledNotificationsAsync()).length; } catch {}
      for (let i = 1; i <= ESCALATION_MAX_FOLLOWUPS; i++) {
        if (pending >= SAFE_PENDING_CEILING) break;
        const followupTrigger = this._escalationTrigger(trigger, ESCALATION_INTERVAL_SEC * i);
        if (!followupTrigger) break;
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              ...urgentContent,
              data: { ...urgentContent.data, escalation: true, escalationIndex: i },
            },
            trigger: followupTrigger,
          });
          pending++;
        } catch (error) {
          console.warn('Failed to schedule escalation follow-up:', error);
          break;
        }
      }
    }

    return primaryId;
  }

  // Cancel every escalation FOLLOW-UP sharing a group key. Called when the
  // user taps/acts on the alert, completes the item in the app, or the item
  // re-arms.
  //
  // Deliberately never touches primaries: siblings can share a group key (a
  // weekly workout schedules 7 day-notifications under one scheduleId, custom
  // reminders without an item id share the type fallback), so cancelling
  // primaries here would nuke Wednesday's workout because you tapped
  // Tuesday's. A tapped primary is already delivered (gone from the pending
  // queue), an identifier-based primary is replaced by iOS on re-arm, and the
  // type-level bulk cancels cover everything else.
  async cancelEscalationGroup(groupKey, { includeSnoozed = true } = {}) {
    if (!groupKey) return;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const doomed = scheduled.filter(
        (n) => n.content?.data?.groupKey === groupKey
          && n.content?.data?.escalation === true
          // A re-arm pre-clean must not eat a live snooze's follow-ups: weekly
          // day-siblings share the group key, so re-arming Wednesday would
          // otherwise strip the nag off an alert snoozed from Tuesday
          && (includeSnoozed || n.content?.data?.snoozed !== true)
      );
      await Promise.all(
        doomed.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
      );
    } catch (error) {
      console.warn('Failed to cancel escalation group:', error);
    }
  }

  // Cancel escalation for a domain item by rebuilding the same key the scheduler
  // used. `data` mirrors what the schedule site put on content.data.
  async cancelItemEscalation(data) {
    await this.cancelEscalationGroup(this._groupKeyFor(null, data));
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Remove previous subscriptions to prevent duplicates
    if (this.notificationListener) { this.notificationListener.remove(); this.notificationListener = null; }
    if (this.responseListener) { this.responseListener.remove(); this.responseListener = null; }

    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification received:', notification);
      
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

      this.handleEscalationResponse(response);
      // Done/Snooze are handled entirely above and keep the app closed
      // (opensAppToForeground:false) — routing them into navigation would
      // queue a stale tab-switch for whenever the app next opens
      const action = response.actionIdentifier;
      if (action !== 'COMPLETE' && action !== 'SNOOZE') {
        this.handleNotificationResponse(response);
      }
    });
  }

  // Any engagement with an alert (tapping it, or its Done/Snooze buttons) stops
  // its escalation follow-ups. Done marks the item complete; Snooze re-arms it.
  async handleEscalationResponse(response) {
    try {
      const data = response.notification.request.content?.data || {};
      const action = response.actionIdentifier;

      // Kill the whole escalation group first — you've engaged, stop nagging
      if (data.groupKey) await this.cancelEscalationGroup(data.groupKey);

      if (action === 'SNOOZE') {
        const fireAt = new Date(Date.now() + SNOOZE_MINUTES * 60 * 1000);
        // Respect the user's sound setting; the delivered content serializes a
        // silent alert's sound as nil, and `?? 'default'` would un-mute it
        const settings = await getStoredData('notificationSettings');
        await this.scheduleNotif({
          content: {
            title: response.notification.request.content.title,
            body: response.notification.request.content.body,
            // `snoozed` shields it from the type-level bulk sweeps that run on
            // every app open, or the promised 10-minute re-alert dies whenever
            // the user opens the app in between
            data: { ...data, escalation: false, escalationIndex: 0, snoozed: true },
            sound: settings?.sound === false ? false : 'default',
          },
          trigger: { type: 'date', date: fireAt },
        });
        return;
      }

      if (action === 'COMPLETE') {
        // Let the relevant tab mark the item done without opening the app.
        // fireDate rides along so a replayed action completes the day the
        // alert actually fired, not whatever day the app happens to open.
        // (normalized: iOS reports the date in epoch seconds)
        DeviceEventEmitter.emit('notificationComplete', {
          type: data.type,
          data,
          fireDate: toEpochMs(response.notification?.date) || Date.now(),
        });
      }
    } catch (error) {
      console.warn('Failed to handle escalation response:', error);
    }
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

      const hiddenPrayers = await hiddenDays('prayers', 15);
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

        // Per-prayer reminder lead time. The `time` value is an object carrying
        // metadata for the newer prayers system; legacy string entries have no
        // metadata and fall back to the classic "30 minutes before".
        const meta = (time && typeof time === 'object' && !(time instanceof Date)) ? time : {};
        // Missing (legacy prayers) defaults to At start (0), the new default.
        const notifyBefore = meta.notifyBefore == null ? 0 : Number(meta.notifyBefore);

        // Any negative (legacy "None") schedules nothing — the prayer still opens
        // at its time in-app, there's just no push.
        if (Number.isNaN(notifyBefore) || notifyBefore < 0) {
          console.log(`Prayer ${slot} reminder disabled, skipping notification`);
          continue;
        }

        const lead = Math.max(0, notifyBefore);           // 0 = at start
        const atStart = notifyBefore === 0;
        const leadText = lead >= 60
          ? `${Math.floor(lead / 60)} hour${lead >= 120 ? 's' : ''}`
          : `${lead} minutes`;
        const body = atStart ? `Time to pray: ${displayName}` : `${displayName} in ${leadText}`;

        // One-time prayers fire ONCE on their chosen date; daily prayers use the
        // next occurrence of the reminder clock time.
        let triggerDate;
        if (meta.type === 'one-time' && meta.date) {
          const [y, mo, d] = String(meta.date).split('-').map(Number);
          if (!y || !mo || !d) {
            console.log(`Skipping prayer ${slot}: invalid one-time date`, meta.date);
            continue;
          }
          const base = new Date(y, mo - 1, d, hours, minutes, 0, 0);
          if (hiddenPrayers.has(dateKeyOfLocal(base))) continue; // a day template turned prayers off that day
          triggerDate = new Date(base.getTime() - lead * 60000);
          if (triggerDate.getTime() <= Date.now()) {
            console.log(`Skipping prayer ${slot}: one-time reminder ${triggerDate.toLocaleString()} already passed`);
            continue;
          }
        } else {
          const dayList = Array.isArray(meta.days) && meta.days.length > 0 && meta.days.length < 7
            ? meta.days
            : null;
          if (dayList) {
            // Weekday-limited prayer: find the soonest future reminder whose
            // PRAYER occurrence falls on a selected weekday. The weekday check
            // uses the occurrence itself, not the trigger, because the lead
            // subtraction can cross midnight into the previous day.
            const now = new Date();
            triggerDate = null;
            for (let offset = 0; offset <= 15 && !triggerDate; offset++) {
              const occurrence = new Date(now);
              occurrence.setDate(occurrence.getDate() + offset);
              occurrence.setHours(hours, minutes, 0, 0);
              if (!dayList.includes(occurrence.getDay())) continue;
              if (hiddenPrayers.has(dateKeyOfLocal(occurrence))) continue;
              const candidate = new Date(occurrence.getTime() - lead * 60000);
              if (candidate.getTime() > now.getTime()) triggerDate = candidate;
            }
            if (!triggerDate) {
              console.log(`Skipping prayer ${slot}: no upcoming weekday occurrence`);
              continue;
            }
          } else {
            // Subtract the lead from the prayer clock time, wrapping across midnight.
            const totalMin = (((hours * 60 + minutes - lead) % 1440) + 1440) % 1440;
            triggerDate = this.getNextOccurrenceDate(Math.floor(totalMin / 60), totalMin % 60);
            // Daily prayer on a day whose template turned prayers off: the
            // next day that keeps them.
            for (let guard = 0; guard < 15; guard++) {
              const occ = new Date(triggerDate.getTime() + lead * 60000);
              if (!hiddenPrayers.has(dateKeyOfLocal(occ))) break;
              triggerDate = new Date(triggerDate.getTime() + 86400000);
            }
          }
        }

        await this.scheduleNotif({
          content: {
            title: 'Prayer Reminder',
            body,
            data: { type: 'prayer_reminder', prayerSlot: slot, prayerName: displayName },
            sound: settings.sound ? 'default' : false,
          },
          trigger: { type: 'date', date: triggerDate },
        });

        console.log(
          `Scheduled prayer reminder for ${slot} → fires ${triggerDate.toLocaleString()} (${atStart ? 'at start' : `${lead} min before`} ${hours
            .toString()
            .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}, source: ${originalTime})`
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

      const identifier = await this.scheduleNotif({
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

      await this.scheduleNotif({
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
      
      await this.scheduleNotif({
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

      await this.scheduleNotif({
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

      await this.scheduleNotif({
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
  // Cancel every pending notification belonging to a removed feature (Hub/social).
  // iOS owns the scheduled-notification queue, so notifications created before the
  // Hub was deleted survive the code deletion (a repeating one would fire daily,
  // forever). Runs on every launch; idempotent and cheap (one queue read).
  async purgeRemovedFeatureNotifications() {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const stale = scheduled.filter((n) =>
        REMOVED_NOTIFICATION_TYPES.includes(n?.content?.data?.type)
      );

      for (const n of stale) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }

      if (stale.length > 0) {
        console.log(`[Notif] Purged ${stale.length} leftover notification(s) from removed features:`,
          stale.map((n) => n.content.data.type).join(', '));
      }
      return stale.length;
    } catch (error) {
      console.error('Failed to purge removed-feature notifications:', error);
      return 0;
    }
  }

  async cancelNotificationsByType(type) {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const notificationsToCancel = scheduledNotifications.filter(
        // Snoozed alerts keep their domain type but live outside the re-arm
        // cycle: the user was PROMISED a re-alert in 10 minutes, and the bulk
        // sweeps that run on every app open must not eat it. They self-expire.
        notification => notification.content.data?.type === type
          && notification.content.data?.snoozed !== true
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

  // Update notification settings and reschedule notifications.
  // Serialized: a second call queues behind the first, because two overlapping
  // cancel+reschedule sweeps (rapid Alert Style taps) interleave and
  // double-schedule.
  updateSettings(settings) {
    this._updateSettingsChain = (this._updateSettingsChain || Promise.resolve())
      .then(() => this._updateSettingsImpl(settings))
      .catch((e) => console.error('updateSettings failed:', e));
    return this._updateSettingsChain;
  }

  async _updateSettingsImpl(settings) {
    try {
      await saveData('notificationSettings', settings);

      // NOTE: Do NOT call Notifications.setNotificationHandler here —
      // the top-level handler in this file already suppresses native alerts
      // and emits in-app notifications via DeviceEventEmitter.

      // If push notifications are disabled, cancel all. Explicit `=== false`
      // like every other guard below: a partial settings object with the key
      // missing must not nuke the user's notifications.
      if (settings.pushNotifications === false) {
        await this.cancelAllNotifications();
        return;
      }

      // Reschedule based on new settings
      if (settings.prayerReminders === false) {
        await this.cancelNotificationsByType('prayer_reminder');
      } else {
        await this.scheduleStoredPrayerReminders();
      }

      if (settings.streakReminders === false) {
        await this.cancelNotificationsByType('daily_streak');
      } else {
        await this.scheduleDailyStreakReminder(20, 0);
      }

      // Task notifications
      if (settings.taskReminders === false) {
        await this.cancelNotificationsByType('task_reminder');
        console.log('Task reminders disabled - cancelled all task notifications');
      } else {
        await this._rescheduleTaskNotifications();
      }

      // Workout notifications
      if (settings.workoutReminders === false) {
        await this.cancelNotificationsByType('workout_reminder');
        await this.cancelNotificationsByType('workout_overdue');
        console.log('Workout reminders disabled - cancelled all workout notifications');
      } else {
        await this._rescheduleWorkoutNotifications();
      }

      // Habit reminders
      if (settings.habitReminders === false) {
        await this.cancelNotificationsByType('habit_reminder');
        console.log('Habit reminders disabled - cancelled all habit notifications');
      } else {
        try {
          // Habits persist as {habits:[...]} (habitsService), not a bare
          // array. Parsing it as an array made .filter throw into this
          // swallowed catch, so habits were never re-armed from here.
          const raw = await userStorage.getRaw('fivefold_user_habits');
          const parsed = raw ? JSON.parse(raw) : null;
          const habitList = Array.isArray(parsed) ? parsed : (parsed?.habits || []);
          await this.rescheduleAllHabitReminders(habitList.filter(h => h.notificationEnabled !== false));
        } catch (error) {
          console.warn('Failed to re-arm habit reminders:', error);
        }
      }

      // Cancel/reschedule user reminder notifications
      if (settings.reminderNotifications === false) {
        await this.cancelNotificationsByType('user_reminder');
        console.log('Reminder notifications disabled - cancelled all');
      } else if (settings.reminderNotifications !== false) {
        await this.rescheduleAllReminderNotifications();
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

      // Vision check-in is a repeating trigger that bakes its urgency in at
      // schedule time, so an Alert Style change must re-arm it — but only when
      // one is already queued (scheduleVisionCheckIn has no vision-existence
      // guard, and this must not enable it for users who never set one up)
      try {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        if (pending.some((n) => n.content?.data?.type === 'vision_checkin')) {
          await this.scheduleVisionCheckIn();
        }
      } catch (_) {}

      console.log('Notification settings updated');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }

  // Refresh all recurring notifications (call on app foreground to ensure nothing is lost)
  async refreshAllScheduledNotifications() {
    try {
      const settings = await getStoredData('notificationSettings');
      if (!settings || settings.pushNotifications === false) return;

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledTypes = new Set(scheduled.map(n => n.content?.data?.type).filter(Boolean));

      // Re-schedule types that should exist but are missing
      if (settings.prayerReminders !== false && !scheduledTypes.has('prayer_reminder')) {
        await this.scheduleStoredPrayerReminders();
      }

      if (settings.streakReminders !== false && !scheduledTypes.has('daily_streak')) {
        await this.scheduleDailyStreakReminder(20, 0);
      }

      if (settings.reminderNotifications !== false && !scheduledTypes.has('user_reminder')) {
        await this.rescheduleAllReminderNotifications();
      }

      if (settings.taskReminders !== false && !scheduledTypes.has('task_reminder')) {
        await this._rescheduleTaskNotifications();
      }

      if (settings.workoutReminders !== false && !scheduledTypes.has('workout_reminder')) {
        await this._rescheduleWorkoutNotifications();
      }

      if (settings.habitReminders !== false && !scheduledTypes.has('habit_reminder')) {
        try {
          // Same {habits:[...]} shape gotcha as the updateSettings path above
          const raw = await userStorage.getRaw('fivefold_user_habits');
          const parsed = raw ? JSON.parse(raw) : null;
          const habitList = Array.isArray(parsed) ? parsed : (parsed?.habits || []);
          await this.rescheduleAllHabitReminders(habitList.filter(h => h.notificationEnabled !== false));
        } catch (error) {
          console.warn('Failed to refresh habit reminders:', error);
        }
      }

      if (settings.visionExpiryReminders !== false && !scheduledTypes.has('vision_expiry')) {
        await this.rescheduleAllVisionExpiryNotifications();
      }

      if (settings.weeklyBodyCheckIn !== false && !scheduledTypes.has('weekly_body_checkin')) {
        await this.scheduleWeeklyBodyCheckIn();
      }

      console.log('[Notifications] Foreground refresh complete');
    } catch (error) {
      console.warn('[Notifications] Foreground refresh failed:', error.message);
    }
  }

  // Send test notification
  async testNotification() {
    try {
      await this.scheduleNotif({
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
      // The wizard's prayers (`simplePrayers`) are the current source of truth,
      // so they take priority over the legacy customPrayerTimes maps. A stale
      // customPrayerTimes left over from an old app version must NOT shadow newly
      // added prayers (which live only under simplePrayers).
      const simplePrayers = await getStoredData('simplePrayers');
      if (Array.isArray(simplePrayers)) {
        // The wizard has written this key (even if the list is now empty), so
        // it is authoritative: never fall through to the legacy maps below,
        // or deleting the last prayer would resurrect long-dead legacy times.
        const mappedTimes = {};
        simplePrayers.forEach((prayer, index) => {
          if (prayer?.time) {
            const key = prayer.id || `prayer_${index}`;
            mappedTimes[key] = {
              time: prayer.time,
              name: prayer.name || 'Prayer',
              // Per-prayer reminder lead time: -1 None, 0 at start, else minutes
              // before. Undefined (legacy prayers) falls back to at-start downstream.
              notifyBefore: prayer.notifyBefore,
              type: prayer.type || 'persistent',
              date: prayer.date || null,
              days: Array.isArray(prayer.days) ? prayer.days : null,
            };
          }
        });
        return mappedTimes;
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
        // Still cancel: the user may have just deleted their last prayer, and
        // its already-scheduled reminder must not fire tonight
        await this.cancelNotificationsByType('prayer_reminder');
        console.log('No stored prayer times found to schedule (cancelled existing)');
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

      await this.scheduleNotif({
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

      await this.scheduleNotif({
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

      await this.scheduleNotif({
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

      await this.scheduleNotif({
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
      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true, habitReminders: true };
      if (settings.pushNotifications === false) return;
      if (settings.habitReminders === false) return;

      const notifId = `habit_reminder_${habit.id}`;
      await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});

      const [hourStr, minuteStr] = (habit.reminderTime || '22:00').split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const triggerDate = this.getNextOccurrenceDate(hour, minute);

      await this.scheduleNotif({
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

  // Cancel a task's pending alert AND its escalation follow-ups (used when the
  // task is completed or deleted — a done/gone task must never remind)
  async cancelTaskNotification(taskId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(String(taskId)).catch(() => {});
      await this.cancelItemEscalation({ type: 'task_reminder', taskId });
    } catch (error) {
      console.error('Failed to cancel task notification:', error);
    }
  }

  // Cancel every alert for a workout schedule: the one-time id, the 7 weekly
  // day ids, and any escalation follow-ups (used on schedule delete)
  async cancelWorkoutScheduleNotifications(scheduleId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(String(scheduleId)).catch(() => {});
      for (let d = 0; d < 7; d++) {
        await Notifications.cancelScheduledNotificationAsync(`${scheduleId}_${d}`).catch(() => {});
      }
      await this.cancelItemEscalation({ type: 'workout_reminder', scheduleId });
    } catch (error) {
      console.error('Failed to cancel workout schedule notifications:', error);
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

  async scheduleReminderNotification(reminder) {
    try {
      const settings = await getStoredData('notificationSettings') || { sound: true, pushNotifications: true, reminderNotifications: true };
      console.log(`[Notif] scheduleReminder "${reminder.title}" — push=${settings.pushNotifications}, reminderNotif=${settings.reminderNotifications}, enabled=${reminder.enabled}, type=${reminder.type}, days=${JSON.stringify(reminder.days)}`);
      if (settings.pushNotifications === false) return;
      if (settings.reminderNotifications === false) return;
      if (!reminder.enabled) return;

      const [hourStr, minuteStr] = (reminder.time || '08:00').split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const soundSetting = settings.sound ? 'default' : false;

      const notifContent = {
        title: reminder.title || 'Reminder',
        body: `Time for: ${reminder.title}`,
        data: { type: 'user_reminder', reminderId: reminder.id },
        sound: soundSetting,
      };

      if (reminder.type === 'one-time') {
        const notifId = `reminder_${reminder.id}_once`;
        await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});

        let triggerDate;
        if (reminder.date) {
          const [year, month, dayNum] = reminder.date.split('-').map(Number);
          triggerDate = new Date(year, month - 1, dayNum, hour, minute, 0, 0);
        } else {
          triggerDate = this.getNextOccurrenceDate(hour, minute);
        }
        // A day template that turned one-off things off that day keeps it quiet.
        let hiddenOnce = new Set();
        try { hiddenOnce = await require('./dayTemplates').hiddenDatesForReminder(reminder, 15); } catch {}
        if (hiddenOnce.has(dateKeyOfLocal(triggerDate))) return;

        if (triggerDate > new Date()) {
          await this.scheduleNotif({
            identifier: notifId,
            content: notifContent,
            trigger: { type: 'date', date: triggerDate },
          });
          console.log(`[Notif] Scheduled one-time reminder "${reminder.title}" for ${triggerDate.toISOString()}`);
        }
      } else {
        const notifId = `reminder_${reminder.id}_next`;
        await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});

        const now = new Date();
        const reminderDays = reminder.days || [];

        if (reminderDays.length === 0) return;

        let nextFireDate = null;

        // Up to two weeks out: a weekly reminder moved "just today" skips a
        // whole week (skipDates) and must land on the occurrence after it.
        const skipDates = Array.isArray(reminder.skipDates) ? reminder.skipDates : [];
        // A day template that does not include this reminder silences it that day.
        let hidden = new Set();
        try { hidden = await require('./dayTemplates').hiddenDatesForReminder(reminder, 15); } catch {}
        for (let offset = 0; offset <= 14; offset++) {
          const candidate = new Date(now);
          candidate.setDate(candidate.getDate() + offset);
          candidate.setHours(hour, minute, 0, 0);

          const candidateDayIndex = candidate.getDay();
          const candidateKey = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
          if (skipDates.includes(candidateKey)) continue;
          if (hidden.has(candidateKey)) continue;

          if (reminderDays.includes(candidateDayIndex) && candidate > now) {
            nextFireDate = candidate;
            break;
          }
        }

        if (nextFireDate) {
          await this.scheduleNotif({
            identifier: notifId,
            content: notifContent,
            trigger: { type: 'date', date: nextFireDate },
          });
          console.log(`[Notif] Scheduled reminder "${reminder.title}" for ${nextFireDate.toISOString()} (date trigger)`);
        } else {
          console.log(`[Notif] No upcoming date found for reminder "${reminder.title}"`);
        }
      }
    } catch (error) {
      console.error('Failed to schedule reminder notification:', error);
    }
  }

  async cancelReminderNotification(reminderId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`reminder_${reminderId}_once`).catch(() => {});
      await Notifications.cancelScheduledNotificationAsync(`reminder_${reminderId}_next`).catch(() => {});
      for (let d = 0; d < 7; d++) {
        await Notifications.cancelScheduledNotificationAsync(`reminder_${reminderId}_${d}`).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to cancel reminder notification:', error);
    }
  }

  async rescheduleAllReminderNotifications() {
    try {
      await this.cancelNotificationsByType('user_reminder');
      await this.cancelNotificationsByType('custom_reminder');

      const settings = await getStoredData('notificationSettings') || { pushNotifications: true, reminderNotifications: true };
      console.log(`[Notif] rescheduleAllReminders — push=${settings.pushNotifications}, reminderNotif=${settings.reminderNotifications}`);
      if (settings.pushNotifications === false || settings.reminderNotifications === false) return;

      const data = await getStoredData('user_reminders');
      console.log(`[Notif] rescheduleAllReminders — found ${data?.reminders?.length ?? 0} reminders in storage`);
      if (!data || !data.reminders) return;

      let scheduled = 0;
      for (const reminder of data.reminders) {
        if (reminder.enabled) {
          await this.scheduleReminderNotification(reminder);
          scheduled++;
        }
      }
      console.log(`[Notif] Rescheduled ${scheduled} reminder notifications`);
    } catch (error) {
      console.error('Failed to reschedule all reminder notifications:', error);
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
        if (tabName === 'Todos' && newSettings.habitReminders) {
          try {
            const storedHabits = await userStorage.getRaw('fivefold_user_habits');
            if (storedHabits) {
              const parsed = JSON.parse(storedHabits);
              const habits = parsed.habits || [];
              await this.rescheduleAllHabitReminders(habits.filter(h => h.notificationEnabled !== false));
            }
          } catch (err) {
            console.error('Failed to reschedule habit reminders on tab restore:', err);
          }
        }
        if (tabName === 'Todos' && newSettings.reminderNotifications) {
          await this.rescheduleAllReminderNotifications();
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
      if (soundEnabled === undefined) {
        const s = await getStoredData('notificationSettings');
        soundEnabled = s?.sound !== false;
      }
      // Type-level sweep FIRST (like prayers/reminders): tasks deleted or
      // completed since the last arm aren't in storage any more, so without
      // this their primaries and escalation follow-ups orphan forever.
      await this.cancelNotificationsByType('task_reminder');

      const storedTodos = await userStorage.getRaw('fivefold_todos');
      if (!storedTodos) return;

      const tasks = JSON.parse(storedTodos);
      const now = new Date();
      let count = 0;
      const hiddenTasks = await hiddenDays('oneOffs', 21);

      for (const task of tasks) {
        if (task.completed || !task.scheduledDate) continue;
        const taskDate = new Date(task.scheduledDate);
        if (taskDate <= now) continue;
        if (hiddenTasks.has(dateKeyOfLocal(taskDate))) continue; // a day template turned one-off things off

        const reminderMin = task.reminderBefore || 60;
        const notifyTime = new Date(taskDate.getTime() - reminderMin * 60 * 1000);
        if (notifyTime <= now) continue;

        const reminderText = reminderMin >= 60
          ? `${Math.floor(reminderMin / 60)} hour${reminderMin >= 120 ? 's' : ''}`
          : `${reminderMin} minutes`;

        await Notifications.cancelScheduledNotificationAsync(task.id).catch(() => {});
        await this.scheduleNotif({
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
      console.log(`[Notif] Rescheduled ${count} task notifications`);
    } catch (error) {
      console.error('Failed to reschedule task notifications:', error);
    }
  }

  async _rescheduleWorkoutNotifications(soundEnabled) {
    try {
      if (soundEnabled === undefined) {
        const s = await getStoredData('notificationSettings');
        soundEnabled = s?.sound !== false;
      }
      // Sweep BEFORE the empty early-return: a deleted schedule's weekly
      // primaries would otherwise fire forever with nothing left to clean them
      await this.cancelNotificationsByType('workout_reminder');

      const schedules = await WorkoutService.getScheduledWorkouts();
      if (!schedules || schedules.length === 0) return;

      // One source of truth for workout alerts (lead time semantics, skipped
      // days, day templates that turn workouts off): services/workoutSchedule.
      let count = 0;
      const { scheduleWorkoutNotifications } = require('./workoutSchedule');
      for (const schedule of schedules) {
        try { await scheduleWorkoutNotifications(schedule); count++; } catch {}
      }
      console.log(`[Notif] Rescheduled ${count} workout schedules`);
    } catch (error) {
      console.error('Failed to reschedule workout notifications:', error);
    }
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;
