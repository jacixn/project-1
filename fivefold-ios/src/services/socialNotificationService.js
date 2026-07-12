/**
 * Social Notification Service
 * 
 * Handles push notifications for social features:
 * - Prayer requests
 * - Encouragements
 * - Messages
 * - Challenges
 * - Streak celebrations
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Notifications from 'expo-notifications';
import { getAuth } from 'firebase/auth';

// Expo Push Notification API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Save user's push token to Firebase
 * @param {string} userId - User's Firebase UID
 * @param {string} pushToken - Expo push token
 * @returns {Promise<boolean>} - Success status
 */
export const savePushToken = async (userId, pushToken) => {
  if (!userId || !pushToken) return false;

  try {
    await updateDoc(doc(db, 'users', userId), {
      pushToken,
      pushTokenUpdatedAt: new Date(),
    });
    
    console.log('[SocialNotif] Saved push token for user:', userId);
    return true;
  } catch (error) {
    // Document might not exist, try setDoc with merge
    try {
      await setDoc(doc(db, 'users', userId), {
        pushToken,
        pushTokenUpdatedAt: new Date(),
      }, { merge: true });
      
      console.log('[SocialNotif] Saved push token for user (created):', userId);
      return true;
    } catch (retryError) {
      console.error('Error saving push token:', retryError);
      return false;
    }
  }
};

/**
 * Clear push token from a user's Firestore doc (call on sign-out).
 * Prevents the device from receiving notifications for this user after logout.
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<boolean>} - Success status
 */
export const clearPushToken = async (userId) => {
  if (!userId) return false;

  try {
    await updateDoc(doc(db, 'users', userId), {
      pushToken: '',
      pushTokenUpdatedAt: new Date(),
    });
    console.log('[SocialNotif] Cleared push token for user:', userId);
    return true;
  } catch (error) {
    console.error('Error clearing push token:', error);
    return false;
  }
};

/**
 * Get user's push token from Firebase
 * @param {string} userId - User's Firebase UID
 * @returns {Promise<string|null>} - Push token or null
 */
export const getPushToken = async (userId) => {
  if (!userId) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().pushToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Send push notification to a specific user
 * @param {string} userId - Target user's Firebase UID
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Additional data
 * @returns {Promise<boolean>} - Success status
 */
export const sendPushToUser = async (userId, { title, body, data = {} }) => {
  if (!userId) return false;

  try {
    const enrichedData = { ...data, timestamp: Date.now(), recipientId: userId };

    // ── If the recipient is the CURRENT user on this device, fire a local
    //    notification so the foreground handler can show an in-app banner.
    //    This is the only reliable path on the iOS Simulator (where remote
    //    push tokens are fake) and also serves as an instant fallback on
    //    real devices. ──
    const currentUid = getAuth().currentUser?.uid;
    if (currentUid && currentUid === userId) {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: enrichedData, sound: 'default' },
        trigger: null, // fire immediately
      });
      console.log('[SocialNotif] Local notification fired for current user');
      return true;
    }

    const pushToken = await getPushToken(userId);
    if (!pushToken || pushToken === 'simulator-token') {
      console.log('[SocialNotif] No valid push token for user:', userId);
      return false;
    }

    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: enrichedData,
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data?.[0]?.status === 'ok') {
      console.log('[SocialNotif] Push sent to user:', userId);
      return true;
    } else {
      console.warn('[SocialNotif] Push failed:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending push to user:', error);
    return false;
  }
};

/**
 * Notification Templates
 */
export const NotificationTemplates = {
  // Prayer notifications
  prayerComment: (senderName) => ({
    title: 'New Comment',
    body: `${senderName} commented on your prayer`,
    data: { type: 'prayer_comment' },
  }),

  // Message notifications
  sharedVerse: (senderName) => ({
    title: 'Verse Shared',
    body: `${senderName} shared a Bible verse with you`,
    data: { type: 'shared_verse' },
  }),

  // Challenge notifications
  challengeReceived: (senderName, category) => ({
    title: 'Quiz Challenge',
    body: `${senderName} challenged you to a ${category} quiz!`,
    data: { type: 'challenge' },
  }),

  challengeCompleted: (opponentName, won) => ({
    title: won ? 'You Won!' : 'Challenge Complete',
    body: won 
      ? `You beat ${opponentName} in the quiz challenge!`
      : `${opponentName} won the quiz challenge`,
    data: { type: 'challenge_result', won },
  }),

  // Friend notifications
  friendRequest: (senderName) => ({
    title: 'Friend Request',
    body: `${senderName} wants to be your friend`,
    data: { type: 'friend_request' },
  }),

  friendAccepted: (senderName) => ({
    title: 'Request Accepted',
    body: `${senderName} accepted your friend request`,
    data: { type: 'friend_accepted' },
  }),
};

export default {
  savePushToken,
  clearPushToken,
  getPushToken,
  sendPushToUser,
  NotificationTemplates,
};
