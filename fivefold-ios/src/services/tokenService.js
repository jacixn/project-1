/**
 * Token Service
 * 
 * Manages the daily posting token system:
 * - Users get 1 token per day at a random time between 6 AM and 6 PM
 * - Token expires at 11:59:59 PM if not used
 * - Random time changes each day for each user
 * - Notification when token arrives
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch token schedule from Firebase (for admin testing)
 * Returns the schedule if found, null otherwise
 */
export const fetchScheduleFromFirebase = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.tokenSchedule) {
        console.log('[Token] Fetched schedule from Firebase:', data.tokenSchedule);
        return data.tokenSchedule;
      }
    }
    return null;
  } catch (error) {
    console.warn('[Token] Could not fetch schedule from Firebase:', error.message);
    return null;
  }
};

/**
 * Force refresh token status from Firebase
 * Use this when admin has manually edited the schedule in Firebase
 */
export const forceRefreshTokenFromFirebase = async (userId, username = null) => {
  try {
    const today = getTodayString();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    console.log('========== FORCE REFRESH TOKEN ==========');
    console.log(`[Token] Current time: ${now.toLocaleTimeString()} (${currentMinutes} minutes)`);
    
    // Fetch schedule from Firebase
    const firebaseSchedule = await fetchScheduleFromFirebase(userId);
    console.log('[Token] Firebase schedule:', JSON.stringify(firebaseSchedule));
    
    if (firebaseSchedule && firebaseSchedule.date === today) {
      // Check if this is a NEW schedule (different arrival time than what we have locally)
      const localScheduleData = await AsyncStorage.getItem(TOKEN_SCHEDULE_KEY);
      const localSchedule = localScheduleData ? JSON.parse(localScheduleData) : null;
      
      // If arrival time changed, this is a NEW schedule - reset everything
      if (!localSchedule || localSchedule.arrivalMinutes !== firebaseSchedule.arrivalMinutes) {
        // Clear notification sent flag
        await AsyncStorage.removeItem(NOTIFICATION_SENT_KEY);
        // Clear the old token so button isn't green
        await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        console.log('[Token] New schedule detected - cleared old token and notification flag');
      }
      
      // Use Firebase schedule
      const schedule = {
        date: firebaseSchedule.date,
        userId: userId,
        arrivalMinutes: firebaseSchedule.arrivalMinutes,
        arrivalTime: firebaseSchedule.arrivalTime,
        notificationScheduled: true,
        tokenDelivered: firebaseSchedule.tokenDelivered || false,
        timezoneOffsetMinutes: firebaseSchedule.timezoneOffsetMinutes ?? new Date().getTimezoneOffset(),
        useServerNotifications: firebaseSchedule.useServerNotifications ?? true,
      };
      
      // Check if token should be delivered now based on Firebase time
      let token = null;
      console.log(`[Token] Time check - current: ${currentMinutes} min (${now.toLocaleTimeString()}), arrival: ${schedule.arrivalMinutes} min (${schedule.arrivalTime})`);
      
      if (isArrivalTimeReached(schedule.arrivalMinutes) && !schedule.tokenDelivered) {
        console.log('[Token] Time has passed! Delivering token now...');
        token = {
          date: today,
          available: true,
          deliveredAt: new Date().toISOString(),
        };
        schedule.tokenDelivered = true;
        
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
        
        // Update Firebase to show delivered
        await saveScheduleToFirebase(userId, schedule);
        
        console.log('[Token] Token delivered from Firebase sync at:', new Date().toLocaleTimeString());
      } else if (schedule.tokenDelivered) {
        // Token was already delivered (possibly by the server Cloud Function)
        const tokenData = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        token = tokenData ? JSON.parse(tokenData) : null;
        
        // FIX: If Firebase says token was delivered but it doesn't exist locally
        // (race condition: server marked tokenDelivered=true before client created it),
        // create the token now so the user can actually post.
        // But first check if the user already used their token today (don't re-create consumed tokens).
        if (!token || token.date !== today) {
          // Check if the token was already used today via Firestore
          let alreadyUsedToday = false;
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists() && userDoc.data().tokenUsedDate === today) {
              alreadyUsedToday = true;
              console.log('[Token] Token was already used today - not re-creating');
            }
          } catch (e) {
            console.warn('[Token] Could not check tokenUsedDate:', e.message);
          }
          
          if (!alreadyUsedToday) {
            console.log('[Token] Firebase says delivered but token missing locally - creating now');
            token = {
              date: today,
              available: true,
              deliveredAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
          } else {
            // Token was used - create a consumed token record so state is consistent
            token = {
              date: today,
              available: false,
              usedAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
          }
        }
      }
      
      // Save to local storage
      await AsyncStorage.setItem(TOKEN_SCHEDULE_KEY, JSON.stringify(schedule));
      
      // Cancel ALL existing token notifications first (important when syncing new time from Firebase)
      try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of scheduledNotifications) {
          if (notification.content.data?.type === 'token_arrived') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            console.log('[Token] Cancelled old token notification:', notification.identifier);
          }
        }
      } catch (e) {
        console.warn('[Token] Could not cancel old notifications:', e);
      }
      
      // Schedule notification if token hasn't arrived yet
      if (!schedule.tokenDelivered && currentMinutes < schedule.arrivalMinutes) {
        console.log('[Token] Time is in the future, scheduling notification...');
        if (!schedule.useServerNotifications) {
          await scheduleTokenNotification(schedule.arrivalMinutes, userId);
        } else {
          console.log('[Token] Server notifications enabled - skipping local schedule');
        }
      } else {
        console.log(`[Token] NOT scheduling - tokenDelivered: ${schedule.tokenDelivered}, currentMinutes: ${currentMinutes}, arrivalMinutes: ${schedule.arrivalMinutes}`);
      }
      
      console.log('[Token] Synced from Firebase - arrival:', schedule.arrivalTime, 'delivered:', schedule.tokenDelivered);
      
      return {
        hasToken: token?.available === true,
        tokenDelivered: schedule.tokenDelivered,
        arrivalTime: schedule.arrivalTime,
        arrivalMinutes: schedule.arrivalMinutes,
        willArriveToday: !schedule.tokenDelivered && currentMinutes < schedule.arrivalMinutes,
        schedule,
        syncedFromFirebase: true,
      };
    }
    
    // No Firebase schedule for today, fall back to normal
    return await getTokenStatus(userId, username);
  } catch (error) {
    console.error('[Token] Error force refreshing from Firebase:', error);
    return await getTokenStatus(userId, username);
  }
};

/**
 * Save token schedule to Firebase so admin can see it
 */
const saveScheduleToFirebase = async (userId, schedule) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      tokenSchedule: {
        date: schedule.date,
        arrivalTime: schedule.arrivalTime,
        arrivalMinutes: schedule.arrivalMinutes,
        tokenDelivered: schedule.tokenDelivered || false,
        timezoneOffsetMinutes: schedule.timezoneOffsetMinutes ?? new Date().getTimezoneOffset(),
        useServerNotifications: schedule.useServerNotifications ?? true,
        updatedAt: new Date().toISOString(),
      },
    });
    console.log('[Token] Saved schedule to Firebase for user:', userId);
  } catch (error) {
    // Try setDoc with merge if updateDoc fails
    try {
      await setDoc(doc(db, 'users', userId), {
        tokenSchedule: {
          date: schedule.date,
          arrivalTime: schedule.arrivalTime,
          arrivalMinutes: schedule.arrivalMinutes,
          tokenDelivered: schedule.tokenDelivered || false,
          timezoneOffsetMinutes: schedule.timezoneOffsetMinutes ?? new Date().getTimezoneOffset(),
          useServerNotifications: schedule.useServerNotifications ?? true,
          updatedAt: new Date().toISOString(),
        },
      }, { merge: true });
    } catch (e) {
      console.warn('[Token] Could not save schedule to Firebase:', e.message);
    }
  }
};

const TOKEN_STORAGE_KEY = 'hub_posting_token';
const TOKEN_SCHEDULE_KEY = 'hub_token_schedule';

// TEST MODE: Users with unlimited tokens for testing (checks displayName AND username)
const TEST_USERS_WITH_UNLIMITED_TOKENS = ['lolo', 'lol'];

/**
 * Check if a name matches any test user (handles emojis and extra characters)
 */
const isTestUser = (name) => {
  if (!name) return false;
  const cleanName = name.toLowerCase().trim();
  return TEST_USERS_WITH_UNLIMITED_TOKENS.some(testUser => 
    cleanName === testUser || 
    cleanName.startsWith(testUser + ' ') || 
    cleanName.startsWith(testUser + '_')
  );
};

/**
 * Generate a random time between 6 AM and 6 PM (in minutes from midnight)
 * Returns minutes from midnight (360 = 6:00 AM, 1080 = 6:00 PM)
 */
const generateRandomTokenTime = () => {
  const minMinutes = 6 * 60; // 6:00 AM = 360 minutes
  const maxMinutes = 18 * 60; // 6:00 PM = 1080 minutes
  const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes)) + minMinutes;
  return randomMinutes;
};

/**
 * Convert minutes from midnight to a readable time string
 */
const minutesToTimeString = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

/**
 * Get today's date as a string (YYYY-MM-DD)
 */
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Check if it's past 11:59:59 PM (token expiry time)
 */
const isTokenExpired = (tokenDate) => {
  const today = getTodayString();
  return tokenDate !== today;
};

/**
 * Get the current token status for a user
 */
export const getTokenStatus = async (userId, username = null) => {
  try {
    // TEST MODE: Give unlimited tokens to test users
    if (isTestUser(username)) {
      console.log('[Token] TEST MODE: Unlimited tokens for user:', username);
      return {
        hasToken: true,
        tokenDelivered: true,
        arrivalTime: 'Unlimited',
        arrivalMinutes: 0,
        willArriveToday: false,
        isTestUser: true,
        tokensRemaining: 1000000,
      };
    }
    
    const tokenData = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    const scheduleData = await AsyncStorage.getItem(TOKEN_SCHEDULE_KEY);
    
    const today = getTodayString();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let token = tokenData ? JSON.parse(tokenData) : null;
    let schedule = scheduleData ? JSON.parse(scheduleData) : null;
    
    // Check if schedule belongs to a different user (from before sign-out)
    // If so, don't use it - wait for cloud data to sync
    if (schedule && schedule.userId && schedule.userId !== userId) {
      console.log('[Token] Schedule belongs to different user, ignoring local data');
      schedule = null;
      token = null;
    }
    
    // Check if we need to generate a new schedule for today
    if (!schedule || schedule.date !== today) {
      // Generate new random time for today
      const arrivalMinutes = generateRandomTokenTime();
      schedule = {
        date: today,
        userId: userId, // Store userId so we know whose schedule this is
        arrivalMinutes,
        arrivalTime: minutesToTimeString(arrivalMinutes),
        notificationScheduled: false,
        tokenDelivered: false,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        useServerNotifications: true,
      };
      await AsyncStorage.setItem(TOKEN_SCHEDULE_KEY, JSON.stringify(schedule));
      console.log('[Token] Created new schedule for user:', userId, 'arrival:', schedule.arrivalTime);
      
      // Save to Firebase so admin can see the schedule
      await saveScheduleToFirebase(userId, schedule);
      
      // Schedule notification for token arrival (skip if server notifications are enabled)
      if (!schedule.useServerNotifications) {
        await scheduleTokenNotification(arrivalMinutes, userId);
      } else {
        console.log('[Token] Server notifications enabled - skipping local schedule');
      }
    }
    
    // Check if token should be delivered now
    if (isArrivalTimeReached(schedule.arrivalMinutes) && !schedule.tokenDelivered) {
      // Deliver the token!
      token = {
        date: today,
        available: true,
        deliveredAt: new Date().toISOString(),
      };
      schedule.tokenDelivered = true;
      
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
      await AsyncStorage.setItem(TOKEN_SCHEDULE_KEY, JSON.stringify(schedule));
      
      // Update Firebase to show token was delivered
      await saveScheduleToFirebase(userId, schedule);
    }
    
    // Check if token is expired (from a previous day)
    if (token && isTokenExpired(token.date)) {
      token = null;
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    
    return {
      hasToken: token?.available === true,
      tokenDelivered: schedule?.tokenDelivered || false,
      arrivalTime: schedule?.arrivalTime || null,
      arrivalMinutes: schedule?.arrivalMinutes || null,
      willArriveToday: !schedule?.tokenDelivered && currentMinutes < schedule?.arrivalMinutes,
      schedule,
    };
  } catch (error) {
    console.error('Error getting token status:', error);
    return { hasToken: false, tokenDelivered: false };
  }
};

/**
 * Use (consume) the token to make a post
 */
export const useToken = async (userId, username = null) => {
  try {
    const status = await getTokenStatus(userId, username);
    
    if (!status.hasToken) {
      return { success: false, error: 'No token available' };
    }
    
    // TEST MODE: Don't consume tokens for test users
    if (status.isTestUser) {
      console.log('[Token] TEST MODE: Token not consumed for test user');
      return { success: true, isTestUser: true };
    }
    
    // Consume the token
    const token = {
      date: getTodayString(),
      available: false,
      usedAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    
    // Also update in Firestore for cross-device sync
    if (userId) {
      await setDoc(doc(db, 'users', userId), {
        lastTokenUsed: serverTimestamp(),
        tokenUsedDate: getTodayString(),
      }, { merge: true });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error using token:', error);
    return { success: false, error: error.message };
  }
};

// Key to track if we've already sent today's notification
const NOTIFICATION_SENT_KEY = 'hub_token_notification_sent';

/**
 * Build today's arrival Date from arrivalMinutes
 */
const getArrivalDateForToday = (arrivalMinutes) => {
  const now = new Date();
  const hours = Math.floor(arrivalMinutes / 60);
  const minutes = arrivalMinutes % 60;
  const arrivalDate = new Date(now);
  arrivalDate.setHours(hours, minutes, 0, 0);
  return arrivalDate;
};

/**
 * Check if arrival time has been reached (seconds-accurate)
 */
const isArrivalTimeReached = (arrivalMinutes) => {
  const now = new Date();
  const arrivalDate = getArrivalDateForToday(arrivalMinutes);
  return now.getTime() >= arrivalDate.getTime();
};

/**
 * Check if we've already sent the token notification today
 */
const hasNotificationBeenSentToday = async () => {
  try {
    const sent = await AsyncStorage.getItem(NOTIFICATION_SENT_KEY);
    if (sent) {
      const data = JSON.parse(sent);
      return data.date === getTodayString();
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Mark that we've sent today's notification
 */
const markNotificationSent = async () => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SENT_KEY, JSON.stringify({
      date: getTodayString(),
      sentAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('[Token] Could not mark notification sent:', e);
  }
};

/**
 * Schedule a notification for when the token arrives
 */
const scheduleTokenNotification = async (arrivalMinutes, userId) => {
  try {
    const now = new Date();
    const arrivalDate = getArrivalDateForToday(arrivalMinutes);
    const delayMs = arrivalDate.getTime() - now.getTime();
    const delaySeconds = Math.ceil(delayMs / 1000);
    
    console.log(`[Token] Scheduling check - now: ${now.toLocaleTimeString()}, arrival: ${arrivalDate.toLocaleTimeString()}, delay: ${delaySeconds}s`);
    
    // Only schedule if arrival is in the future
    if (delaySeconds <= 0) {
      console.log('[Token] Arrival time passed, skipping schedule');
      return;
    }
    
    // Cancel any existing token notifications first to avoid duplicates
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'token_arrived') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log('[Token] Cancelled existing notification');
      }
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your Token Has Arrived',
        body: 'Time to share something with the world! Head to the Hub and post something meaningful.',
        data: { type: 'token_arrived' },
        sound: true,
      },
      trigger: {
        seconds: delaySeconds,
      },
    });
    
    console.log(`[Token] Scheduled notification for ${minutesToTimeString(arrivalMinutes)} (in ${delaySeconds} seconds)`);
  } catch (error) {
    console.error('Error scheduling token notification:', error);
  }
};

/**
 * Send immediate notification that token has arrived (only if not already sent today)
 */
const sendTokenArrivedNotification = async () => {
  try {
    const alreadySent = await hasNotificationBeenSentToday();
    if (alreadySent) {
      console.log('[Token] Notification already sent today, skipping immediate send');
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your Token Has Arrived',
        body: 'Time to share something with the world! Head to the Hub and post something meaningful.',
        data: { type: 'token_arrived' },
        sound: true,
      },
      trigger: null, // Immediate
    });
    
    await markNotificationSent();
    console.log('[Token] Sent immediate token notification');
  } catch (error) {
    console.error('Error sending immediate notification:', error);
  }
};

/**
 * Check and deliver token if it's time (called on app open)
 */
export const checkAndDeliverToken = async (userId, username = null) => {
  return await getTokenStatus(userId, username);
};

/**
 * Get time until token arrives (for display)
 */
export const getTimeUntilToken = async () => {
  try {
    const scheduleData = await AsyncStorage.getItem(TOKEN_SCHEDULE_KEY);
    if (!scheduleData) return null;
    
    const schedule = JSON.parse(scheduleData);
    const today = getTodayString();
    
    if (schedule.date !== today || schedule.tokenDelivered) {
      return null;
    }
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minutesUntil = schedule.arrivalMinutes - currentMinutes;
    
    if (minutesUntil <= 0) return null;
    
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    
    return {
      hours,
      minutes: mins,
      formatted: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
      arrivalTime: schedule.arrivalTime,
    };
  } catch (error) {
    console.error('Error getting time until token:', error);
    return null;
  }
};

export default {
  getTokenStatus,
  useToken,
  checkAndDeliverToken,
  getTimeUntilToken,
};
