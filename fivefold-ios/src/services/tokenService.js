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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

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
      };
      await AsyncStorage.setItem(TOKEN_SCHEDULE_KEY, JSON.stringify(schedule));
      console.log('[Token] Created new schedule for user:', userId, 'arrival:', schedule.arrivalTime);
      
      // Schedule notification for token arrival
      await scheduleTokenNotification(arrivalMinutes, userId);
    }
    
    // Check if token should be delivered now
    if (currentMinutes >= schedule.arrivalMinutes && !schedule.tokenDelivered) {
      // Deliver the token!
      token = {
        date: today,
        available: true,
        deliveredAt: new Date().toISOString(),
      };
      schedule.tokenDelivered = true;
      
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
      await AsyncStorage.setItem(TOKEN_SCHEDULE_KEY, JSON.stringify(schedule));
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

/**
 * Schedule a notification for when the token arrives
 */
const scheduleTokenNotification = async (arrivalMinutes, userId) => {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Only schedule if arrival is in the future
    if (arrivalMinutes > currentMinutes) {
      const delayMinutes = arrivalMinutes - currentMinutes;
      const delaySeconds = delayMinutes * 60;
      
      // Cancel any existing token notifications first to avoid duplicates
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'token_arrived') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
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
      
      console.log(`[Token] Scheduled notification for ${minutesToTimeString(arrivalMinutes)} (in ${delayMinutes} minutes)`);
    }
  } catch (error) {
    console.error('Error scheduling token notification:', error);
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
